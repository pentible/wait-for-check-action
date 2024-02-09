import { getInput, debug, setOutput, setFailed } from "@actions/core";

function main() {
    try {
        const ms = getInput("milliseconds");

        // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
        debug(`Waiting ${ms} milliseconds ...`);

        // Log the current timestamp, wait, then log the new timestamp
        debug(new Date().toTimeString());

        // Set outputs for other workflow steps to use
        setOutput("time", new Date().toTimeString());
    } catch (error) {
        // Fail the workflow run if an error occurs
        if (error instanceof Error) {
            setFailed(error.message);
        }
    }
}

main();
