# changelog-from-pr-file
Generates a changelog from the repository PR local files.
A very (very) specific actions intended to be used with [pr-to-file-action](https://github.com/rodrigoarias/pr-to-file-action).
That action creates a file for every PR. This action use those files and:
- Generates a changelog text.
- Updates the version name (according to the number and type of PRs).

This was created for a specific project so it assumes a lot of things:
- There is a root folder named `changes` with a file for every PR named `PR-number.json`
- That file has a json with the fields name, number and url.
- Those names could start with `fix:`, `feat:` and other [Conventional Commits prefixes](https://www.conventionalcommits.org/en/v1.0.0/)
- The input version name is in the format `major.minor.patch`


## Inputs

## `git-token`

**Required** A GITHUB_SECRET with enough permissions to read files.

## `current-version`

The name of the version to be updated, in format `major.minor.patch`. Default: `"0.0.0"`

## `label-teams`

A list of "teams" accepted as label names that can be used as subsections (of features, bugs and others sections).


## Outputs

## `changelog`

The generated changelog.

## `version`

The input version updated by the number and type of changes.

## Example usage
```
    # Generate changelog
    - name: Generate changelog
      id: changelog
      uses: rodrigoarias/changelog-from-pr-file@v1.0.0
      with:
        git-token: ${{ secrets.RELEASE_GITHUB_KEY }}
        current-version: "1.0.0"
        label-teams: |
        ["teamA",
        "teamB",
        "teamC"]
      
```
