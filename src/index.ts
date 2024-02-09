import { getInput, setOutput, setFailed } from "@actions/core";
import { getOctokit } from "@actions/github";
import { sleep } from "./utils/sleep.js";

type GitHub = ReturnType<typeof getOctokit>;

interface GetLatestCheckRunArgs {
    owner: string;
    repo: string;
    ref: string;
    checkName: string;
}

async function getLatestCheckRun(
    github: GitHub,
    { owner, repo, ref, checkName }: GetLatestCheckRunArgs,
) {
    const response = await github.rest.checks.listForRef({
        owner,
        repo,
        ref,
        check_name: checkName,
        filter: "latest",
    });

    return response.data.check_runs[0];
}

async function main() {
    const checkName = getInput("check-name", { required: true });
    const ref = getInput("ref", { required: true });
    const owner = getInput("owner", { required: true });
    const repo = getInput("repo", { required: true });

    const currentJob = process.env.GITHUB_JOB;
    const currentSha = process.env.GITHUB_SHA;
    const currentRepository = process.env.GITHUB_REPOSITORY;
    const currentRepoOwner = currentRepository?.split("/")[0];
    const currentRepoName = currentRepository?.split("/")[1];

    if (
        checkName === currentJob &&
        ref === currentSha &&
        repo === currentRepoOwner &&
        owner === currentRepoName
    ) {
        throw new Error("can't wait on self");
    }

    const rawInterval = getInput("interval", { required: true });
    const interval = Number.parseFloat(rawInterval);
    if (Number.isNaN(interval) || !Number.isFinite(interval)) {
        throw new Error(`invalid interval: ${rawInterval}`);
    }

    const expectedConclusions = getInput("expected-conclusions", {
        required: true,
    }).split(",");

    const conclusionValues = [
        "success",
        "skipped",
        "failure",
        "neutral",
        "cancelled",
        "timed_out",
        "action_required",
        "any",
    ];
    for (const conclusion of expectedConclusions) {
        if (!conclusionValues.includes(conclusion)) {
            throw new Error(`invalid conclusion: ${conclusion}`);
        }
    }

    const githubToken = getInput("github-token", { required: true });

    const github = getOctokit(githubToken);

    while (true) {
        // get latest check run
        const run = await getLatestCheckRun(github, {
            owner,
            repo,
            ref,
            checkName,
        });

        if (run === undefined) {
            throw new Error(`could not find run: ${checkName}`);
        }

        const message =
            run.status === "completed" ? "run completed" : "waiting on run";

        console.info(
            `${message}:`,
            JSON.stringify({
                name: run.name,
                status: run.status,
                conclusion: run.conclusion,
                started_at: run.started_at,
                completed_at: run.completed_at,
            }),
        );

        // break once run completed
        if (run.status === "completed" && run.conclusion !== null) {
            // NOTE: set the output first, regardless of the status
            setOutput("conclusion", run.conclusion);
            setOutput("run", run);

            if (
                !expectedConclusions.includes(run.conclusion) &&
                !expectedConclusions.includes("any")
            ) {
                throw new Error(`unexpected run conclusion: ${run.conclusion}`);
            }

            return;
        }

        await sleep(interval * 1000);
    }
}

try {
    await main();
} catch (error) {
    setFailed(error instanceof Error ? error : new Error(String(error)));
}
