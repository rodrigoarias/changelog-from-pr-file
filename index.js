const core = require('@actions/core')
const github = require('@actions/github')
var output

var patchVersion = 0
var minorVersion = 0
var majorVersion = 0
var simplePatchVersion = ''


const fixPrefix = "fix:"
const featPrefix = "feat:"
const chorePrefix = "chore:"
const docsPrefix = "docs:"
const refactorPrefix = "refactor:"
const stylePrefix = "style:"
const testPrefix = "test:"

const features = []
const fixes = []
const others = []

var teams;
const defaultTeam = 'Others'


const main = async () => {
  const myToken = core.getInput('git-token');
  const octokit = github.getOctokit(myToken);
  const versionName = core.getInput('current-version');
  const labelTeams = core.getInput('label-teams');
  const incrementPatch = core.getInput('increment-patch') === 'true';

  try {
    teams = JSON.parse(labelTeams);
  } catch (e) {
    console.log(`Unable to parse input. error: ${e}`);
    teams = [];
  }

  try {
    const subversions = versionName.split('.');
    majorVersion = Number(subversions[0]);
    minorVersion = Number(subversions[1]);
    patchVersion = Number(subversions[2]);
    simplePatchVersion = `${majorVersion}.${minorVersion + 1}.${0}`
  } catch (error) {
    console.log(`error ${error}`);
  }

  const owner = github.context.payload.repository.owner.login
  const repo = github.context.payload.repository.name

  // Get the latest release tag
  const latestRelease = await getLatestRelease(octokit, owner, repo);

  if (!latestRelease) {
    console.log('No releases found. Cannot generate changelog.');
    core.setOutput("changelog", "");
    core.setOutput("version", versionName);
    return;
  }

  // Get commits between latest release and current HEAD
  const headRef = github.context.sha || 'HEAD';
  const commits = await getCommitsBetweenRefs(octokit, owner, repo, latestRelease, headRef);

  if (commits.length === 0) {
    console.log('No new commits since last release.');
    core.setOutput("changelog", "");
    core.setOutput("version", versionName);
    return;
  }

  // Get PRs from commits (includes labels)
  const prs = await getPRsFromCommits(octokit, owner, repo, commits);

  // Process each PR
  for (const pr of prs) {
    processTypeOfChange(pr);
  }

  let versionOutput;
  if (incrementPatch) {
    versionOutput = simplePatchVersion;
  } else {
    versionOutput = `${majorVersion}.${minorVersion}.${patchVersion}`;
  }

  createOutputFromChanges(versionOutput);
  console.log(`${output}`)
  core.setOutput("changelog", output);
  core.setOutput("version", versionOutput);
}

const createOutputFromChanges = (versionOutput) => {
  output = `## v ${versionOutput}`
  output += "\n"
  output = addSection(output, features, '### 🚀 Features');
  output = addSection(output, fixes, '### 🐛 Bugs');
  output = addSection(output, others, '### 📝 Others');
  return output;
}

const addSection = (output, changes, title) => {
  if (Object.entries(changes).length === 0) {
    return output;
  }

  output += title;
  output += '\n';

  for (const [teamName,items] of Object.entries(changes)) {
    output = addSubsection(output, teamName, items);
  }

  return output;
}

const addSubsection = (output, teamName, items) => {
  if (teams.length > 0) {
    output += '##### ' + teamName + '\n';  
  }
  
  for (const log of items) {
    output += '- ' + log.trim();
    output += '\n';
  }
  return output; 
}

const teamLabelIncluded = (pr) => {
  if (pr.labels.length > 0) {
    return pr.labels.map(label => label.name).find(labelName => teams.includes(labelName))
  }
  return false;
}

const processTypeOfChange = (pr) => {
  const changeMessage = pr.title;
  const prefix = ''

  switch (true) {
  case changeMessage.startsWith(chorePrefix):
    processChange(pr, others, chorePrefix);
    break;
  case changeMessage.startsWith(docsPrefix):
    processChange(pr, others, docsPrefix);
    break;
  case changeMessage.startsWith(stylePrefix):
    processChange(pr, others, stylePrefix);
    break;
  case changeMessage.startsWith(testPrefix):
    processChange(pr, others, testPrefix);
    break;

  case changeMessage.startsWith(featPrefix):
    processChange(pr, features, featPrefix);
    patchVersion = 0;
    minorVersion++;
    break;
    
  case changeMessage.startsWith(refactorPrefix):
    processChange(pr, fixes, refactorPrefix);
    patchVersion++;
    break;

  case changeMessage.startsWith(fixPrefix):
    processChange(pr, fixes, fixPrefix);
    patchVersion++;
    break;

  default:
    processChange(pr, fixes, '');
    patchVersion++;
    break;
  }
}

const processChange = (pr, sameLevelChanges, prefix) => {
  var line = pr.title.replace(prefix, '')
  line += " " + "[PR-" + pr.number + "](" + pr.url + ")";
  var team = teamLabelIncluded(pr);
  team = team ? team : defaultTeam;

  if (!sameLevelChanges[team]) {
    sameLevelChanges[team] = []
  }

  sameLevelChanges[team].push(line);
}

const getLatestRelease = async (octokit, owner, repo) => {
  try {
    const releases = await octokit.rest.repos.listReleases({
      owner,
      repo,
      per_page: 10
    });

    // Find the latest non-draft release
    const publishedRelease = releases.data.find(release => !release.draft);

    if (publishedRelease) {
      console.log(`Found latest release: ${publishedRelease.tag_name}`);
      return publishedRelease.tag_name;
    }

    console.log('No published releases found');
    return null;
  } catch (error) {
    console.log(`Error fetching releases: ${error.message}`);
    return null;
  }
}

const getCommitsBetweenRefs = async (octokit, owner, repo, baseRef, headRef) => {
  try {
    const comparison = await octokit.rest.repos.compareCommits({
      owner,
      repo,
      base: baseRef,
      head: headRef
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
        owner,
        repo,
        commit_sha: commit.sha
      });

      for (const pr of response.data) {
        // Only include merged PRs and avoid duplicates
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

main()
