import * as core from '@actions/core'
import * as github from '@actions/github'

const token = core.getInput('token')
const baseBranch = core.getInput('base_branch')
const currentPRNumber = core.getInput('current_pr_number')
const client = github.getOctokit(token)

async function getSpecificPr() {
    return await client.rest.pulls.get({
        ...github.context.repo,
        pull_number: parseInt(currentPRNumber),
    });
}

async function listPRs(baseBranch: string) {

    return await client.paginate("GET /repos/{owner}/{repo}/pulls", {
        ...github.context.repo,
        base: baseBranch,
        state: 'open',
        per_page: 100,
    }, (response) => response.data.map((pr) => pr));
}

async function main() {
    if (currentPRNumber) {
        core.info(`PR number is set - ${currentPRNumber}`);
        const pr_response = await getSpecificPr();
        await updateBranch(pr_response.data);
    } else {
        core.info('PR number is not set, running on all PRs');
        const prsList = await listPRs(baseBranch);
        core.info(`PRs amount - ${prsList.length}`);
        await Promise.all(prsList.map((pr) => updateBranch(pr)));
    }
}

async function updateBranch(pr) {
    const auto_merge = pr.auto_merge;
    const pr_number = pr.number;
    if (auto_merge) {
        core.info(`PR number - ${pr_number} auto_merge flag is set. Merging with ${baseBranch}`);
        client.rest.pulls.updateBranch({
            ...github.context.repo,
            pull_number: pr.number,
        });
    } else {
        core.info(`PR number - ${pr_number} auto_merge flag isn't set. Skipping branch update`);
    }
}

main()
