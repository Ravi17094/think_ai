/*
 * ============================================================
 * Judge0 Code Execution Service
 * ============================================================
 */

const assessmentService = require("./assessmentService");


// ============================================================
// LANGUAGE MAP
// ============================================================

const LANGUAGE_MAP = Object.freeze({
    python: 71,
    python3: 71,
    javascript: 63,
    js: 63,
    java: 62,
    c: 50,
    cpp: 54,
    "c++": 54,
    go: 60
});


// ============================================================
// DEFAULTS
// ============================================================

const DEFAULTS = Object.freeze({
    REQUEST_TIMEOUT_MS: 10000,
    POLL_INTERVAL_MS: 500,
    MAX_POLL_TIME_MS: 30000,

    CPU_TIME_LIMIT: 5,
    WALL_TIME_LIMIT: 10,

    MAX_SOURCE_CODE_BYTES: 100 * 1024,
    MAX_STDIN_BYTES: 50 * 1024,
    MAX_STDOUT_BYTES: 100 * 1024,
    MAX_STDERR_BYTES: 100 * 1024,
    MAX_COMPILE_OUTPUT_BYTES: 100 * 1024
});


// ============================================================
// ENVIRONMENT
// ============================================================

const getNumberEnv = (
    name,
    defaultValue
) => {

    const value = Number(
        process.env[name]
    );

    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {
        return defaultValue;
    }

    return value;
};


// ============================================================
// LANGUAGE
// ============================================================

const normalizeLanguage = (
    language
) => {

    if (
        typeof language !== "string" ||
        !language.trim()
    ) {
        throw new Error(
            "Programming language is required"
        );
    }

    return language
        .trim()
        .toLowerCase();
};


const getLanguageId = (
    language
) => {

    const normalizedLanguage =
        normalizeLanguage(language);

    const languageId =
        LANGUAGE_MAP[normalizedLanguage];

    if (languageId === undefined) {
        throw new Error(
            `Unsupported language: ${language}`
        );
    }

    return languageId;
};


// ============================================================
// VALIDATION
// ============================================================

const validateSourceCode = (
    code
) => {

    if (
        typeof code !== "string" ||
        !code.trim()
    ) {
        throw new Error(
            "Source code is required"
        );
    }

    const maxBytes =
        getNumberEnv(
            "JUDGE0_MAX_SOURCE_CODE_BYTES",
            DEFAULTS.MAX_SOURCE_CODE_BYTES
        );

    const codeSize =
        Buffer.byteLength(
            code,
            "utf8"
        );

    if (codeSize > maxBytes) {
        throw new Error(
            `Source code exceeds maximum allowed size of ${maxBytes} bytes`
        );
    }
};


const validateStdin = (
    stdin
) => {

    if (
        stdin !== undefined &&
        stdin !== null &&
        typeof stdin !== "string"
    ) {
        throw new Error(
            "stdin must be a string"
        );
    }

    const input =
        stdin || "";

    const maxBytes =
        getNumberEnv(
            "JUDGE0_MAX_STDIN_BYTES",
            DEFAULTS.MAX_STDIN_BYTES
        );

    const inputSize =
        Buffer.byteLength(
            input,
            "utf8"
        );

    if (inputSize > maxBytes) {
        throw new Error(
            `stdin exceeds maximum allowed size of ${maxBytes} bytes`
        );
    }
};


const validateCallbackUrl = (
    callbackUrl
) => {

    if (
        callbackUrl === undefined ||
        callbackUrl === null
    ) {
        return;
    }

    if (
        typeof callbackUrl !== "string" ||
        !callbackUrl.trim()
    ) {
        throw new Error(
            "callbackUrl must be a valid URL"
        );
    }

    try {

        const url =
            new URL(callbackUrl);

        if (
            url.protocol !== "http:" &&
            url.protocol !== "https:"
        ) {
            throw new Error();
        }

    } catch {

        throw new Error(
            "callbackUrl must be a valid HTTP or HTTPS URL"
        );
    }
};


// ============================================================
// JUDGE0 URL
// ============================================================

const getJudge0Url = () => {

    const judge0Url =
        process.env.JUDGE0_URL;

    if (
        typeof judge0Url !== "string" ||
        !judge0Url.trim()
    ) {
        throw new Error(
            "JUDGE0_URL is not configured"
        );
    }

    return judge0Url
        .trim()
        .replace(
            /\/+$/,
            ""
        );
};


// ============================================================
// OUTPUT SANITIZATION
// ============================================================

const sanitizeOutput = (
    value
) => {

    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

    return String(value).replace(
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
        ""
    );
};


const limitOutput = (
    value,
    maxBytes,
    fieldName
) => {

    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

    let output =
        sanitizeOutput(value);

    if (!output) {
        return "";
    }

    if (
        Buffer.byteLength(
            output,
            "utf8"
        ) <= maxBytes
    ) {
        return output;
    }

    while (
        Buffer.byteLength(
            output,
            "utf8"
        ) > maxBytes
    ) {

        output =
            output.slice(
                0,
                Math.floor(
                    output.length * 0.9
                )
            );
    }

    return (
        output +
        `\n[${fieldName} truncated]`
    );
};


const sanitizeJudge0Result = (
    result
) => {

    if (!result) {
        return result;
    }

    return {

        ...result,

        stdout:
            limitOutput(
                result.stdout,
                getNumberEnv(
                    "JUDGE0_MAX_STDOUT_BYTES",
                    DEFAULTS.MAX_STDOUT_BYTES
                ),
                "stdout"
            ),

        stderr:
            limitOutput(
                result.stderr,
                getNumberEnv(
                    "JUDGE0_MAX_STDERR_BYTES",
                    DEFAULTS.MAX_STDERR_BYTES
                ),
                "stderr"
            ),

        compile_output:
            limitOutput(
                result.compile_output,
                getNumberEnv(
                    "JUDGE0_MAX_COMPILE_OUTPUT_BYTES",
                    DEFAULTS.MAX_COMPILE_OUTPUT_BYTES
                ),
                "compile output"
            ),

        message:
            limitOutput(
                result.message,
                getNumberEnv(
                    "JUDGE0_MAX_STDERR_BYTES",
                    DEFAULTS.MAX_STDERR_BYTES
                ),
                "message"
            )
    };
};


// ============================================================
// OUTPUT COMPARISON
// ============================================================

const normalizeOutput = (
    value
) => {

    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value)
        .replace(
            /\r\n/g,
            "\n"
        )
        .trim();
};


const outputsMatch = (
    actual,
    expected
) => {

    return (
        normalizeOutput(actual) ===
        normalizeOutput(expected)
    );
};


// ============================================================
// JUDGE0 STATUS HELPERS
// ============================================================

const getJudge0StatusDescription = (
    result
) => {

    return (
        result?.status?.description ||
        "Unknown"
    );
};


const getFailureType = (
    result
) => {

    const statusId =
        Number(
            result?.status?.id
        );

    const description =
        getJudge0StatusDescription(
            result
        );

    switch (statusId) {

        case 4:
            return "WRONG_ANSWER";

        case 5:
            return "TIME_LIMIT_EXCEEDED";

        case 6:
            return "COMPILATION_ERROR";

        case 7:
        case 8:
        case 9:
        case 10:
        case 11:
        case 12:
        case 13:
        case 14:
        case 15:
        case 16:
            return "RUNTIME_ERROR";

        case 3:
            return null;

        default:
            return (
                description ||
                "EXECUTION_ERROR"
            );
    }
};


// ============================================================
// JUDGE0 HTTP REQUEST
// ============================================================

const judge0Request = async ({
    url,
    method = "GET",
    body = null
}) => {

    const controller =
        new AbortController();

    const timeout =
        setTimeout(
            () => controller.abort(),
            getNumberEnv(
                "JUDGE0_TIMEOUT_MS",
                DEFAULTS.REQUEST_TIMEOUT_MS
            )
        );

    try {

        const options = {

            method,

            headers: {

                Accept:
                    "application/json",

                "Content-Type":
                    "application/json"
            },

            signal:
                controller.signal
        };

        if (body !== null) {

            options.body =
                JSON.stringify(body);
        }

        const response =
            await fetch(
                url,
                options
            );

        if (!response.ok) {

            let errorMessage =
                "Unknown Judge0 error";

            try {

                const errorData =
                    await response.json();

                errorMessage =
                    errorData.message ||
                    errorData.error ||
                    JSON.stringify(errorData);

            } catch {

                try {

                    errorMessage =
                        await response.text();

                } catch {
                    // Keep default message
                }
            }

            throw new Error(
                `Judge0 request failed: ${errorMessage}`
            );
        }

        return await response.json();

    } catch (error) {

        if (
            error?.name ===
            "AbortError"
        ) {

            throw new Error(
                "Judge0 request timed out"
            );
        }

        if (
            error?.message?.startsWith(
                "Judge0 request failed:"
            )
        ) {
            throw error;
        }

        throw new Error(
            "Unable to connect to Judge0"
        );

    } finally {

        clearTimeout(timeout);
    }
};


// ============================================================
// WAIT FOR JUDGE0
// ============================================================

const waitForJudge0Result = async (
    token
) => {

    const judge0Url =
        getJudge0Url();

    const maxPollTime =
        getNumberEnv(
            "JUDGE0_MAX_POLL_TIME_MS",
            DEFAULTS.MAX_POLL_TIME_MS
        );

    const pollInterval =
        getNumberEnv(
            "JUDGE0_POLL_INTERVAL_MS",
            DEFAULTS.POLL_INTERVAL_MS
        );

    const startedAt =
        Date.now();

    while (
        Date.now() - startedAt <
        maxPollTime
    ) {

        const result =
            await judge0Request({

                url:
                    `${judge0Url}/submissions/` +
                    `${encodeURIComponent(token)}` +
                    `?base64_encoded=false`,

                method:
                    "GET"
            });

        const safeResult =
            sanitizeJudge0Result(result);

        const statusId =
            Number(
                safeResult?.status?.id
            );

        /*
         * Judge0:
         * 1 = In Queue
         * 2 = Processing
         */

        if (
            statusId !== 1 &&
            statusId !== 2
        ) {

            return safeResult;
        }

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    pollInterval
                )
        );
    }

    /*
     * Convert local polling timeout into
     * Judge0 Time Limit Exceeded result.
     */

    return {

        status: {

            id: 5,

            description:
                "Time Limit Exceeded"
        },

        stdout: "",

        stderr:
            "Execution exceeded the maximum allowed time.",

        compile_output: null,

        message:
            "Execution timed out while waiting for Judge0.",

        time: null,

        memory: null,

        __localTimeout: true
    };
};


// ============================================================
// CREATE JUDGE0 SUBMISSION
// ============================================================

const createJudge0Submission = async ({
    language,
    code,
    stdin = "",
    callbackUrl
}) => {

    validateSourceCode(code);

    validateStdin(stdin);

    validateCallbackUrl(callbackUrl);

    const languageId =
        getLanguageId(language);

    const judge0Url =
        getJudge0Url();

    const body = {

        language_id:
            languageId,

        source_code:
            code,

        stdin:
            stdin || "",

        cpu_time_limit:
            getNumberEnv(
                "JUDGE0_CPU_TIME_LIMIT",
                DEFAULTS.CPU_TIME_LIMIT
            ),

        wall_time_limit:
            getNumberEnv(
                "JUDGE0_WALL_TIME_LIMIT",
                DEFAULTS.WALL_TIME_LIMIT
            )
    };

    if (callbackUrl) {

        body.callback_url =
            callbackUrl.trim();
    }

    const result =
        await judge0Request({

            url:
                `${judge0Url}/submissions` +
                `?base64_encoded=false` +
                `&wait=false`,

            method:
                "POST",

            body
        });

    if (
        !result ||
        !result.token
    ) {

        throw new Error(
            "Judge0 did not return a submission token"
        );
    }

    return sanitizeJudge0Result(
        result
    );
};


// ============================================================
// EXECUTE ONE TEST CASE
// ============================================================

const executeCode = async ({
    language,
    code,
    stdin = "",
    callbackUrl
}) => {

    const result =
        await createJudge0Submission({

            language,

            code,

            stdin,

            callbackUrl
        });

    const finalResult =
        await waitForJudge0Result(
            result.token
        );

    const safeFinalResult =
        sanitizeJudge0Result(
            finalResult
        );

    return {

        success: true,

        data: {

            token:
                result.token,

            status:
                safeFinalResult.status,

            stdout:
                safeFinalResult.stdout,

            stderr:
                safeFinalResult.stderr,

            compileOutput:
                safeFinalResult.compile_output,

            message:
                safeFinalResult.message,

            time:
                safeFinalResult.time ??
                null,

            memory:
                safeFinalResult.memory ??
                null,

            localTimeout:
                Boolean(
                    safeFinalResult.__localTimeout
                )
        }
    };
};


// ============================================================
// SAVE EXECUTION RESULT
// ============================================================

const saveExecutionResult = async ({
    submissionId,
    questionId,
    testCase,
    judge0Token,
    result
}) => {

    const judge0Status =
        result?.data?.status ||
        {};

    const judge0StatusId =
        Number(
            judge0Status.id
        );

    const actualOutput =
        sanitizeOutput(
            result?.data?.stdout
        ) || "";

    const stderr =
        sanitizeOutput(
            result?.data?.stderr
        );

    const compileOutput =
        sanitizeOutput(
            result?.data?.compileOutput
        );

    const passed =
        judge0StatusId === 3 &&
        outputsMatch(
            actualOutput,
            testCase.expectedOutput
        );

    const marks =
        Number(
            testCase.marks || 0
        );

    const marksObtained =
        passed
            ? marks
            : 0;


    // --------------------------------------------------------
    // CREATE EXECUTION
    // --------------------------------------------------------

    const execution =
        await assessmentService
            .createCodingTestCaseExecution({

                submissionId,

                questionId,

                testCaseId:
                    testCase.id,

                judge0Token
            });


    // --------------------------------------------------------
    // UPDATE EXECUTION
    // --------------------------------------------------------

    /*
     * IMPORTANT:
     *
     * Prisma CodingTestCaseExecution.judge0Status
     * is a STRING field.
     *
     * Therefore:
     *
     * WRONG:
     * judge0Status: 3
     *
     * CORRECT:
     * judge0Status: "Accepted"
     */

    const updatedExecution =
        await assessmentService
            .updateCodingTestCaseExecution(

                execution.id,

                {

                    judge0Status:
                        judge0Status?.description ||
                        "Unknown",

                    actualOutput,

                    expectedOutput:
                        testCase.expectedOutput,

                    executionTime:
                        result?.data?.time ??
                        null,

                    memory:
                        result?.data?.memory ??
                        null,

                    passed,

                    marksObtained
                }
            );


    return {

        execution,

        updatedExecution,

        judge0Status,

        judge0StatusId,

        actualOutput,

        stderr,

        compileOutput,

        passed,

        marks,

        marksObtained
    };
};


// ============================================================
// SUBMIT CODE
// ============================================================

const submitCode = async ({
    submissionId,
    questionId,
    language,
    code,
    callbackUrl
}) => {

    const parsedSubmissionId =
        Number(submissionId);

    const parsedQuestionId =
        Number(questionId);


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (
        !Number.isInteger(
            parsedSubmissionId
        ) ||
        parsedSubmissionId <= 0
    ) {

        throw new Error(
            "Submission ID must be a positive integer"
        );
    }

    if (
        !Number.isInteger(
            parsedQuestionId
        ) ||
        parsedQuestionId <= 0
    ) {

        throw new Error(
            "Question ID must be a positive integer"
        );
    }

    validateSourceCode(code);

    getLanguageId(language);

    validateCallbackUrl(callbackUrl);


    // --------------------------------------------------------
    // GET TEST CASES
    // --------------------------------------------------------

    const testCases =
        await assessmentService
            .getCodingTestCasesByQuestion(
                parsedQuestionId
            );

    if (
        !Array.isArray(testCases) ||
        testCases.length === 0
    ) {

        throw new Error(
            "No coding test cases found for this question"
        );
    }


    const executions = [];


    // --------------------------------------------------------
    // EXECUTE ALL TEST CASES
    // --------------------------------------------------------

    for (
        const testCase of testCases
    ) {

        let result;


        try {

            result =
                await executeCode({

                    language,

                    code,

                    stdin:
                        testCase.input || "",

                    callbackUrl
                });

        } catch (error) {

            console.error(
                "Judge0 execution error:",
                error.message
            );

            /*
             * If Judge0 connection/polling fails,
             * convert it into a failed execution
             * instead of returning HTTP 500.
             */

            result = {

                success: true,

                data: {

                    token: null,

                    status: {

                        id: 5,

                        description:
                            "Time Limit Exceeded"
                    },

                    stdout: "",

                    stderr:
                        sanitizeOutput(
                            error.message
                        ) ||
                        "Code execution failed.",

                    compileOutput: null,

                    message:
                        sanitizeOutput(
                            error.message
                        ),

                    time: null,

                    memory: null,

                    localTimeout: true
                }
            };
        }


        // ----------------------------------------------------
        // SAVE RESULT
        // ----------------------------------------------------

        let savedResult;

        try {

            savedResult =
                await saveExecutionResult({

                    submissionId:
                        parsedSubmissionId,

                    questionId:
                        parsedQuestionId,

                    testCase,

                    judge0Token:
                        result?.data?.token ||
                        `local-${Date.now()}-${testCase.id}`,

                    result
                });

        } catch (error) {

            console.error(
                "Failed to save coding execution:",
                error
            );

            throw error;
        }


        const {
            execution,
            judge0Status,
            actualOutput,
            stderr,
            compileOutput,
            passed,
            marks,
            marksObtained
        } = savedResult;


        const isHidden =
            Boolean(
                testCase.isHidden
            );


        // ----------------------------------------------------
        // RESULT FOR RESPONSE
        // ----------------------------------------------------

        executions.push({

            executionId:
                execution.id,

            testCaseId:
                testCase.id,

            isHidden,

            status:
                passed
                    ? "PASSED"
                    : judge0Status?.description ||
                      "FAILED",

            passed,

            marksObtained,

            marks,

            judge0Status:
                judge0Status?.description ||
                "Unknown",

            executionTime:
                result?.data?.time ??
                null,

            memory:
                result?.data?.memory ??
                null,

            stdout:
                isHidden
                    ? null
                    : actualOutput,

            stderr:
                isHidden
                    ? null
                    : stderr,

            compileOutput:
                isHidden
                    ? null
                    : compileOutput
        });
    }


    // --------------------------------------------------------
    // RECALCULATE FINAL SCORE
    // --------------------------------------------------------

    const updatedSubmission =
        await assessmentService
            .recalculateCodingQuestionScore(

                parsedSubmissionId,

                parsedQuestionId
            );


    const percentage =
        Number(
            updatedSubmission.percentage || 0
        );


    // --------------------------------------------------------
    // COUNTS
    // --------------------------------------------------------

    const passedCount =
        executions.filter(
            execution =>
                execution.passed === true
        ).length;


    const failedCount =
        executions.filter(
            execution =>
                execution.passed === false
        ).length;


    // --------------------------------------------------------
    // VERDICT
    // --------------------------------------------------------

    let verdict =
        "WRONG_ANSWER";


    const hasTimeLimitExceeded =
        executions.some(
            execution =>
                execution.judge0Status ===
                "Time Limit Exceeded"
        );


    const hasCompilationError =
        executions.some(
            execution =>
                execution.judge0Status ===
                "Compilation Error"
        );


    const hasRuntimeError =
        executions.some(
            execution =>
                execution.judge0Status ===
                "Runtime Error"
        );


    if (
        passedCount ===
        executions.length
    ) {

        verdict =
            "ACCEPTED";

    } else if (
        hasTimeLimitExceeded
    ) {

        verdict =
            "TIME_LIMIT_EXCEEDED";

    } else if (
        hasCompilationError
    ) {

        verdict =
            "COMPILATION_ERROR";

    } else if (
        hasRuntimeError
    ) {

        verdict =
            "RUNTIME_ERROR";

    } else if (
        passedCount > 0
    ) {

        verdict =
            "PARTIALLY_ACCEPTED";

    } else {

        verdict =
            "WRONG_ANSWER";
    }


    // --------------------------------------------------------
    // FINAL RESPONSE
    // --------------------------------------------------------

    return {

        success: true,

        data: {

            submissionId:
                parsedSubmissionId,

            questionId:
                parsedQuestionId,

            verdict,

            score:
                Number(
                    updatedSubmission.score || 0
                ),

            totalMarks:
                Number(
                    updatedSubmission.totalMarks || 0
                ),

            percentage,

            status: updatedSubmission.status,

            autoGraded:
                updatedSubmission.status === "GRADED",

            testCases: {

                total:
                    executions.length,

                passed:
                    passedCount,

                failed:
                    failedCount
            },

            results:
                executions
        }
    };
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    executeCode,

    submitCode,

    waitForJudge0Result
};
