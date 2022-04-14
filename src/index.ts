import * as core from '@actions/core'
import * as github from '@actions/github'

const token = core.getInput('token')
const client = github.getOctokit(token)

async function main() {
    const baseBranch = github.context.payload.ref
    core.info('Base branch - ${baseBranch}')
    const listPRsResponse = await client.rest.pulls.list({
        ...github.context.repo,
        base: baseBranch,
        state: 'open',
    })
    const prs = listPRsResponse.data
    await Promise.all(
        prs.map((pr) => {
            if (pr.auto_merge) {
                core.info('PR number - ${pr.number} allow_auto_merge flag is set to true')
                core.info('Updating with base branch ${baseBranch}')
                client.rest.pulls.updateBranch({
                    ...github.context.repo,
                    pull_number: pr.number,
                })
            }
        }),
    )
}

main()
