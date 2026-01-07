const assert = require('assert');
const { generateChangelog } = require('./index');

const samplePRs = [
  { title: 'Added: New login feature', number: 1, url: 'https://github.com/repo/pull/1' },
  { title: 'added: user registration', number: 2, url: 'https://github.com/repo/pull/2' },
  { title: 'ADDED: Dashboard component', number: 3, url: 'https://github.com/repo/pull/3' },
  { title: 'Changed: Update API endpoint', number: 4, url: 'https://github.com/repo/pull/4' },
  { title: 'changed: refactor auth module', number: 5, url: 'https://github.com/repo/pull/5' },
  { title: 'Deprecated: Old payment API', number: 6, url: 'https://github.com/repo/pull/6' },
  { title: 'Removed: Legacy code', number: 7, url: 'https://github.com/repo/pull/7' },
  { title: 'Fixed: Login bug', number: 8, url: 'https://github.com/repo/pull/8' },
  { title: 'fixed: null pointer exception', number: 9, url: 'https://github.com/repo/pull/9' },
  { title: 'Security: Patch XSS vulnerability', number: 10, url: 'https://github.com/repo/pull/10' },
  { title: 'No prefix PR goes to changed', number: 11, url: 'https://github.com/repo/pull/11' },
];

const expectedOutput = `## v 1.0.0
### ✨ Added
- New login feature [PR-1](https://github.com/repo/pull/1)
- user registration [PR-2](https://github.com/repo/pull/2)
- Dashboard component [PR-3](https://github.com/repo/pull/3)
### 🔄 Changed
- Update API endpoint [PR-4](https://github.com/repo/pull/4)
- refactor auth module [PR-5](https://github.com/repo/pull/5)
- No prefix PR goes to changed [PR-11](https://github.com/repo/pull/11)
### ⚠️ Deprecated
- Old payment API [PR-6](https://github.com/repo/pull/6)
### 🗑️ Removed
- Legacy code [PR-7](https://github.com/repo/pull/7)
### 🐛 Fixed
- Login bug [PR-8](https://github.com/repo/pull/8)
- null pointer exception [PR-9](https://github.com/repo/pull/9)
### 🔒 Security
- Patch XSS vulnerability [PR-10](https://github.com/repo/pull/10)
`;

console.log('Running tests...\n');

const result = generateChangelog(samplePRs, '1.0.0');

try {
  assert.strictEqual(result, expectedOutput);
  console.log('Test passed: generateChangelog produces correct output');
  console.log('\nGenerated changelog:');
  console.log(result);
} catch (error) {
  console.error('Test failed!');
  console.error('\nExpected:');
  console.error(expectedOutput);
  console.error('\nReceived:');
  console.error(result);
  process.exit(1);
}

console.log('\nAll tests passed!');
