const core = require('@actions/core')
const github = require('@actions/github')
var output

var patchVersion = 0
var minorVersion = 0
var majorVersion = 0


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



const main = async (workspace) => {
  const myToken = core.getInput('git-token');
  const octokit = github.getOctokit(myToken);
  const versionName = core.getInput('current-version');

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

  const changeFiles = await findFile(octokit, owner, repo, '/changes');

  await processAllFiles(changeFiles, octokit, owner, repo, '/changes');

  createOutputFromChanges();
  console.log(`${output}`)
  core.setOutput("changelog", output);
  core.setOutput("version", `${majorVersion}.${minorVersion}.${patchVersion}`);
}

const createOutputFromChanges = () => {
  output = `## v ${majorVersion}.${minorVersion}.${patchVersion}`
  output += "\n"

  output = addSection(output, features, '### 🚀 Features');
  output = addSection(output, fixes, '### 🐛 Bugs');
  output = addSection(output, others, '### 📝 Others');
  return output;

}

const addSection = (output, changes, title) => {
  if (!changes.length) {
    return output;
  }
  output += title;
  output += '\n';
  for (const log of changes) {
    output += log;
    output += '\n';
  }
  return output;
}

const processAllFiles = async (files, octokit, organization, repo, fileName) => {
  if (Array.isArray(files)) {
    for (const element of files) {
      await lookForPRFile(octokit, organization, repo, element.path)
    }  
  } else {
    console.log('Not a valid directory (folder)')
  }
}
 

const lookForPRFile = async(octokit, organization, repo, fileName) => {
    const file = await findFile(octokit, organization, repo, fileName)
    const buff = Buffer.from(file.content, 'base64');
    const content = buff.toString('ascii');
    const pr = JSON.parse(content);

    
    processTypeOfChange(pr);
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
  sameLevelChanges.push(line);
}

const findFile = async(octokit, organization, repo, fileName, branch) => {
  gitFile = await octokit.rest.repos.getContent({
    owner: organization,
    repo: repo,
    path: fileName,
  })
  return gitFile.data;
}

main()
