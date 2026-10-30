const codeExecutionService =
    require("../services/codeExecutionService");

const assessmentService =
    require("../services/assessmentService");


/*
 * Execute source code using Judge0
 *
 * Flow:
 *
 * Client
 *   ↓
 * LMS
 *   ↓
 * Judge0
 *   ↓
 * Judge0 token
 *   ↓
 * Save token in DB
 *   ↓
 * Judge0 executes asynchronously
 *   ↓
 * Judge0 callback
 */
const executeCode = async (req, res) => {

    try {

        const {
            language,
            code,
            stdin,
            submissionId
        } = req.body;


        /*
         * Validate submission ID
         */
        const parsedSubmissionId =
            Number(submissionId);

        if (
            !Number.isInteger(
                parsedSubmissionId
            ) ||
            parsedSubmissionId <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Submission ID must be a positive integer"
            });
        }


        /*
         * Validate language
         */
        if (
            typeof language !== "string" ||
            !language.trim()
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Programming language is required"
            });
        }


        /*
         * Validate source code
         */
        if (
            typeof code !== "string" ||
            !code.trim()
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Source code is required"
            });
        }


        /*
         * Judge0 callback URL
         *
         * This must be reachable from the
         * Judge0 Docker container.
         */
        const callbackUrl =
            process.env.JUDGE0_CALLBACK_URL ||
            null;


        /*
         * Send code to Judge0
         */
        const result =
            await codeExecutionService.executeCode({

                language,

                code,

                stdin:
                    stdin || "",

                callbackUrl
            });


        /*
         * Get Judge0 token
         */
        const judge0Token =
            result.data?.token;


        if (!judge0Token) {

            return res.status(502).json({
                success: false,
                message:
                    "Judge0 did not return a submission token"
            });
        }


        /*
         * Save Judge0 token in
         * AssessmentSubmission.
         */
        const submission =
            await assessmentService
                .saveJudge0Token(
                    parsedSubmissionId,
                    judge0Token
                );


        /*
         * Judge0 is processing asynchronously.
         *
         * The final result will come through
         * /api/code/callback.
         */
        return res.status(202).json({

            success: true,

            message:
                "Code submitted successfully. Judge0 is processing the submission.",

            data: {

                submissionId:
                    submission.id,

                judge0Token,

                status:
                    result.data.status,

                stdout:
                    result.data.stdout,

                stderr:
                    result.data.stderr,

                compileOutput:
                    result.data.compileOutput,

                time:
                    result.data.time,

                memory:
                    result.data.memory
            }
        });

    } catch (error) {

        console.error(
            "Code execution error:",
            error
        );


        const message =
            error?.message ||
            "Code execution failed";


        /*
         * Judge0 not configured
         */
        if (
            message.includes(
                "JUDGE0_URL is not configured"
            )
        ) {

            return res.status(503).json({
                success: false,
                message
            });
        }


        /*
         * Judge0 callback configuration
         */
        if (
            message.includes(
                "callbackUrl must be a valid"
            )
        ) {

            return res.status(400).json({
                success: false,
                message
            });
        }


        /*
         * Programming language
         */
        if (
            message.includes(
                "Programming language is required"
            ) ||
            message.includes(
                "Unsupported language"
            )
        ) {

            return res.status(400).json({
                success: false,
                message
            });
        }


        /*
         * Source code
         */
        if (
            message.includes(
                "Source code is required"
            )
        ) {

            return res.status(400).json({
                success: false,
                message
            });
        }


        /*
         * stdin
         */
        if (
            message.includes(
                "stdin must be a string"
            )
        ) {

            return res.status(400).json({
                success: false,
                message
            });
        }


        /*
         * Submission does not exist
         */
        if (
            message.includes(
                "Record to update not found"
            ) ||
            message.includes(
                "Submission not found"
            )
        ) {

            return res.status(404).json({
                success: false,
                message:
                    "Assessment submission not found"
            });
        }


        /*
         * Judge0 connection problem
         */
        if (
            message.includes(
                "Unable to connect to Judge0"
            ) ||
            message.includes(
                "Judge0 submission failed"
            ) ||
            message.includes(
                "Judge0 request timed out"
            )
        ) {

            return res.status(502).json({
                success: false,
                message
            });
        }


        /*
         * Unknown error
         */
        return res.status(500).json({
            success: false,
            message:
                "Code execution service failed"
        });
    }
};


/*
 * ====================================================
 * JUDGE0 CALLBACK
 * ====================================================
 *
 * Judge0 calls this endpoint automatically
 * after execution finishes.
 */
const gradingCallback = async (
    req,
    res
) => {

    try {

        const result =
            req.body;


        /*
         * Validate callback body
         */
        if (
            !result ||
            typeof result !== "object"
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid Judge0 callback data"
            });
        }


        /*
         * Get Judge0 token
         */
        const token =
            result.token;


        if (
            typeof token !== "string" ||
            !token.trim()
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Judge0 token is required"
            });
        }


        /*
         * Find assessment submission
         * using Judge0 token.
         */
        const submission =
            await assessmentService
                .getSubmissionByJudge0Token(
                    token
                );


        if (!submission) {

            console.warn(
                `Assessment submission not found for Judge0 token: ${token}`
            );

            return res.status(404).json({
                success: false,
                message:
                    "Assessment submission not found"
            });
        }


        /*
         * Get Judge0 status
         */
        const judge0Status =
            result.status?.description ||
            "UNKNOWN";


        /*
         * Judge0 status IDs:
         *
         * 1  In Queue
         * 2  Processing
         * 3  Accepted
         * 4  Wrong Answer
         * 5  Time Limit Exceeded
         * 6  Compilation Error
         * 7  Runtime Error
         * etc.
         *
         * Only final statuses should update
         * the submission as completed/failed.
         */
        const statusId =
            Number(
                result.status?.id
            );


        /*
         * Still processing
         */
        if (
            statusId === 1 ||
            statusId === 2
        ) {

            return res.status(202).json({

                success: true,

                message:
                    "Judge0 submission is still being processed",

                data: {
                    judge0Token: token,
                    judge0Status
                }
            });
        }


        /*
         * Determine LMS submission status.
         */
        let submissionStatus;


        if (
            statusId === 3 ||
            judge0Status === "Accepted"
        ) {

            submissionStatus =
                "COMPLETED";

        } else {

            /*
             * Any final Judge0 failure:
             *
             * Wrong Answer
             * Compilation Error
             * Runtime Error
             * Time Limit Exceeded
             * Memory Limit Exceeded
             * etc.
             */
            submissionStatus =
                "FAILED";
        }


        /*
         * IMPORTANT:
         *
         * Pass the complete Judge0 result
         * to the assessment service.
         */
        const updatedSubmission =
            await assessmentService
                .updateAssessmentSubmissionStatus(

                    submission.id,

                    {

                        status:
                            submissionStatus,

                        judge0Status,

                        stdout:
                            result.stdout ??
                            null,

                        stderr:
                            result.stderr ??
                            null,

                        compileOutput:
                            result.compile_output ??
                            null,

                        time:
                            result.time ??
                            null,

                        memory:
                            result.memory ??
                            null
                    }
                );


        console.log(
            "===================================="
        );

        console.log(
            "Judge0 grading completed"
        );

        console.log(
            "Submission ID:",
            submission.id
        );

        console.log(
            "Judge0 token:",
            token
        );

        console.log(
            "Judge0 status:",
            judge0Status
        );

        console.log(
            "LMS status:",
            submissionStatus
        );

        console.log(
            "===================================="
        );


        /*
         * Return callback response
         */
        return res.status(200).json({

            success: true,

            message:
                "Grading result processed successfully",

            data: {

                submissionId:
                    updatedSubmission.id,

                judge0Token:
                    token,

                status:
                    submissionStatus,

                judge0Status,

                stdout:
                    result.stdout ??
                    null,

                stderr:
                    result.stderr ??
                    null,

                compileOutput:
                    result.compile_output ??
                    null,

                time:
                    result.time ??
                    null,

                memory:
                    result.memory ??
                    null
            }
        });

    } catch (error) {

        console.error(
            "Judge0 grading callback error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to process grading result"
        });
    }
};


module.exports = {
    executeCode,
    gradingCallback
};