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
        await updateBranch(pr_response.data).then(() => addLabel(pr_response.data));
    } else {
        core.info('PR number is not set, running on all PRs');
        const prsList = await listPRs(baseBranch);
        core.info(`PRs amount - ${prsList.length}`);
        let faulty_prs = await Promise.all(prsList.map((pr) => updateBranch(pr).then(() => addLabel(pr)).catch(pr => pr)));
        let filtered_faulty_prs = faulty_prs.filter(pr => pr !== undefined);
        if (filtered_faulty_prs.length > 0) {
            core.info(`There are ${filtered_faulty_prs.length} faulty PRs - ${JSON.stringify(filtered_faulty_prs)}`);
            core.setOutput('error', 'merge_conflict');
            core.setOutput('faulty_prs', JSON.stringify(filtered_faulty_prs));
        } else {
            // core.info(`There are no faulty PRs`);
            // FOR TESTING PURPOSES - DELETE AFTER
            core.setOutput('error', 'merge_conflict');
            core.setOutput('faulty_prs', JSON.stringify([{ "pr_number": 10949, "pr_author": "daniela-cyera" }, { "pr_number": 10949, "pr_author": "daniela-cyera" }]));
        }
    }

}

async function addLabel(pr) {
    try {
        const auto_merge = pr.auto_merge;
        if (auto_merge) {
            core.info(`Adding auto-merge label to PR number - ${pr.number}`)
            await client.rest.issues.addLabels({
                ...github.context.repo,
                issue_number: pr.number,
                labels: ['auto-merge']
            });
        }
    } catch (ex) {
        core.info(ex);
        core.setOutput('add_label_error', ex);
    }
}

async function updateBranch(pr) {
    const auto_merge = pr.auto_merge;
    const pr_number = pr.number;
    if (auto_merge) {
        core.info(`PR number - ${pr_number} auto_merge flag is set. Merging with ${baseBranch}`);
        try {
            await client.rest.pulls.updateBranch({
                ...github.context.repo,
                pull_number: pr.number,
            });
        } catch (ex) {
            core.info(ex);
            if (ex.toString().includes('merge conflict')) {
                throw {
                    "pr_number": pr_number,
                    "pr_author": pr.user.login,
                };
            }
        }
    } else {
        core.info(`PR number - ${pr_number} auto_merge flag isn't set. Skipping branch update`);
    }
}

main()
