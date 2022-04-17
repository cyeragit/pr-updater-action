# PR Updater

This action automatically updates your branch as follows:
1. Every time code is pushed to the specified branches (under on.push.branches):
   1. Update all PRs with the same base branch which have their "auto merge" flag set to true
2. When enabling auto merge in a specific PR:
   1. Update the branch with changes from base branch
   
## Usage

1. create file `.github/workflows/pr-updater.yml` with the following content:

    ```yml
    name: PR update

   on:
     pull_request:
       types:
         - auto_merge_enabled
     push:
       branches:
         - develop

    jobs:
        pr_update:
            runs-on: ubuntu-latest
            steps:
            - uses: actions/checkout@v1
        # Checks the event type of this workflow
        # if github.even.action == auto_merge_enabled then it is a PR context
        # Otherwise, push to develop context
            - id: set-pr-number
              run: |
                 if [ "$IS_PR" == "auto_merge_enabled" ]; then
                     echo '::set-output name=pr_number::${{ github.event.number }}'
                 else
                     echo '::set-output name=pr_number::'
                 fi
              env:
                IS_PR: "${{ github.event.action }}"   
            - name: update all prs
                uses: maxkomarychev/pr-updater-action@v1.0.0
                with:
                    token: ${{ secrets.USER_TOKEN }}
                    base_branch: develop
                    current_pr_number: ${{ steps.set-pr-number.outputs.pr_number }}
    ```

## Inputs

|               Input               |         type         | required |        default        |                                      description                                      |
|:---------------------------------:|:--------------------:|:--------:|:---------------------:|:-------------------------------------------------------------------------------------:|
|               token               |       `string`       | `false`  | `${{ github.token }}` |                                                                                       |
|             base_branch             |       `string`       |  `true`  |                       |                            The base branch to compare with                            |
|               current_pr_number               |       `string`       | `false`  |                       | The PR number to check. When empty, checks all open PRs with the relevant base branch |

## Current limitations

1. Due to [rate limiting](https://developer.github.com/v3/#rate-limiting) user
token can only perform 5000 requests per hour
2. The action currently does not implement paging, so it can only update up to
100 pull requests in one run
