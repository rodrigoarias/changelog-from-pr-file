const core = require('@actions/core')
const github = require('@actions/github')

const PREFIXES = {
  added: "added:",
  changed: "changed:",
  deprecated: "deprecated:",
  removed: "removed:",
  fixed: "fixed:",
  security: "security:"
}

const SECTIONS = {
  added: '### ✨ Added',
  changed: '### 🔄 Changed',
  deprecated: '### ⚠️ Deprecated',
  removed: '### 🗑️ Removed',
  fixed: '### 🐛 Fixed',
  security: '### 🔒 Security'
}

const generateChangelog = (prs, version) => {
  const categories = {
    added: [],
    changed: [],
    deprecated: [],
    removed: [],
    fixed: [],
    security: []
  }

  for (const pr of prs) {
    const lowerTitle = pr.title.toLowerCase();
    let category = 'changed';
    let prefixLength = 0;

    for (const [key, prefix] of Object.entries(PREFIXES)) {
      if (lowerTitle.startsWith(prefix)) {
        category = key;
        prefixLength = prefix.length;
        break;
      }
    }

    const line = pr.title.substring(prefixLength).trim() +
      ` [PR-${pr.number}](${pr.url})`;
    categories[category].push(line);
  }

  let output = `## v ${version}\n`;

  for (const [key, title] of Object.entries(SECTIONS)) {
    if (categories[key].length > 0) {
      output += title + '\n';
      for (const line of categories[key]) {
        output += '- ' + line.trim() + '\n';
      }
    }
  }

  return output;
}

const main = async () => {
  const myToken = core.getInput('git-token');
  const octokit = github.getOctokit(myToken);
  const versionName = core.getInput('current-version');
  const incrementPatch = core.getInput('increment-patch') === 'true';

  let majorVersion = 0, minorVersion = 0, patchVersion = 0;

  try {
    const subversions = versionName.split('.');
    majorVersion = Number(subversions[0]);
    minorVersion = Number(subversions[1]);
    patchVersion = Number(subversions[2]);
  } catch (error) {
    console.log(`error ${error}`);
  }

  const owner = github.context.payload.repository.owner.login
  const repo = github.context.payload.repository.name

  console.log(`Repository: ${owner}/${repo}`);

  const latestRelease = await getLatestRelease(octokit, owner, repo);

  if (!latestRelease) {
    console.log('No releases found. Cannot generate changelog.');
    core.setOutput("changelog", "");
    core.setOutput("version", versionName);
    return;
  }

  const headRef = github.context.sha || 'HEAD';
  const commits = await getCommitsBetweenRefs(octokit, owner, repo, latestRelease, headRef);

  if (commits.length === 0) {
    console.log('No new commits since last release.');
    core.setOutput("changelog", "");
    core.setOutput("version", versionName);
    return;
  }

  const prs = await getPRsFromCommits(octokit, owner, repo, commits);

  const versionOutput = incrementPatch
    ? `${majorVersion}.${minorVersion + 1}.0`
    : `${majorVersion}.${minorVersion}.${patchVersion}`;

  const changelog = generateChangelog(prs, versionOutput);
  console.log(changelog);
  core.setOutput("changelog", changelog);
  core.setOutput("version", versionOutput);
}

const getLatestRelease = async (octokit, owner, repo) => {
  try {
    console.log(`Fetching latest release for ${owner}/${repo}...`);
    const response = await octokit.rest.repos.getLatestRelease({ owner, repo });
    console.log(`Found latest release: ${response.data.tag_name}`);
    return response.data.tag_name;
  } catch (error) {
    if (error.status === 404) {
      console.log('No published releases found in this repository');
    } else {
      console.log(`Error fetching latest release: ${error.message}`);
    }
    return null;
  }
}

const getCommitsBetweenRefs = async (octokit, owner, repo, baseRef, headRef) => {
  try {
    const comparison = await octokit.rest.repos.compareCommits({
      owner, repo, base: baseRef, head: headRef
    });
    console.log(`Found ${comparison.data.commits.length} commits between ${baseRef} and ${headRef}`);
    return comparison.data.commits;
  } catch (error) {
    console.log(`Error comparing commits: ${error.message}`);
    return [];
  }
}

const getPRsFromCommits = async (octokit, owner, repo, commits) => {
  const prNumbers = new Set();
  const prs = [];

  for (const commit of commits) {
    try {
      const response = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
        owner, repo, commit_sha: commit.sha
      });

      for (const pr of response.data) {
        if (pr.merged_at && !prNumbers.has(pr.number)) {
          prNumbers.add(pr.number);
          prs.push({
            title: pr.title,
            number: pr.number,
            url: pr.html_url,
            labels: pr.labels || []
          });
          console.log(`Found PR #${pr.number}: ${pr.title}`);
        }
      }
    } catch (error) {
      console.log(`Error fetching PRs for commit ${commit.sha}: ${error.message}`);
    }
  }

  console.log(`Total unique PRs found: ${prs.length}`);
  return prs;
}

// Only run main when executed directly (not when imported)
if (require.main === module) {
  main();
}

module.exports = { generateChangelog, PREFIXES, SECTIONS };
