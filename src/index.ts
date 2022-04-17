import * as core from '@actions/core'
import * as github from '@actions/github'

const token = core.getInput('token')
const baseBranch = core.getInput('base_branch')
const prNumber = core.getInput('pr_number')
const client = github.getOctokit(token)

async function main() {

    if (prNumber) {
        core.info(`PR number is set - ${prNumber}`)
        const pr = await client.rest.pulls.get({
            ...github.context.repo,
            pull_number: parseInt(prNumber),
        })
        await execute([pr])
    } else {
        core.info('PR number is not set, running on all PRs')
        const prsList = await client.rest.pulls.list({
            ...github.context.repo,
            base: baseBranch,
            state: 'open',
        })
        await execute(prsList.data)
    }
}

async function execute(prs: any[]) {
    await Promise.all(
        prs.map((pr) => {
            const auto_merge = pr.auto_merge
            const pr_number = pr.number
            if (auto_merge) {
                core.info(`PR number - ${pr_number} auto_merge flag is set. Merging with ${baseBranch}`);
                client.rest.pulls.updateBranch({
                    ...github.context.repo,
                    pull_number: pr.number,
                })
            } else {
                core.info(`PR number - ${pr_number} auto_merge flag isn't set. Skipping branch update`);
            }
        }),
    )
}

main()
