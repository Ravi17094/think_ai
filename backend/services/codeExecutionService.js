/*
 * Judge0 Code Execution Service
 */

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


/*
 * Normalize language name
 */
const normalizeLanguage = (language) => {

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


/*
 * Get Judge0 language ID
 */
const getLanguageId = (language) => {

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


/*
 * Validate source code
 */
const validateSourceCode = (code) => {

    if (
        typeof code !== "string" ||
        !code.trim()
    ) {
        throw new Error(
            "Source code is required"
        );
    }
};


/*
 * Get Judge0 URL
 */
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
        .replace(/\/+$/, "");
};


/*
 * Get numeric environment variable
 */
const getNumberEnv = (
    name,
    defaultValue
) => {

    const value =
        Number(process.env[name]);

    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {
        return defaultValue;
    }

    return value;
};


/*
 * Execute code using Judge0
 *
 * Flow:
 *
 * Student submits code
 *        ↓
 * LMS sends code to Judge0
 *        ↓
 * Judge0 returns token
 *        ↓
 * Judge0 executes asynchronously
 *        ↓
 * Judge0 calls JUDGE0_CALLBACK_URL
 *        ↓
 * LMS updates assessment submission
 */
const executeCode = async ({
    language,
    code,
    stdin = "",
    callbackUrl
}) => {

    /*
     * Validate source code
     */
    validateSourceCode(code);


    /*
     * Get Judge0 language ID
     */
    const languageId =
        getLanguageId(language);


    /*
     * Get Judge0 URL
     */
    const judge0Url =
        getJudge0Url();


    /*
     * Validate stdin
     */
    if (
        stdin !== undefined &&
        stdin !== null &&
        typeof stdin !== "string"
    ) {
        throw new Error(
            "stdin must be a string"
        );
    }


    /*
     * Callback URL
     */
    if (
        callbackUrl !== undefined &&
        callbackUrl !== null
    ) {

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
    }


    /*
     * Prepare Judge0 request
     */
    const body = {

        language_id:
            languageId,

        source_code:
            code,

        stdin:
            stdin || ""
    };


    /*
     * Add callback URL.
     *
     * This is what makes Judge0
     * automatically call our server
     * after execution.
     */
    if (callbackUrl) {

        body.callback_url =
            callbackUrl.trim();
    }


    /*
     * Add execution limits when configured.
     */
    const cpuTimeLimit =
        getNumberEnv(
            "JUDGE0_CPU_TIME_LIMIT",
            5
        );

    const wallTimeLimit =
        getNumberEnv(
            "JUDGE0_WALL_TIME_LIMIT",
            10
        );


    body.cpu_time_limit =
        cpuTimeLimit;

    body.wall_time_limit =
        wallTimeLimit;


    /*
     * AbortController prevents the
     * request from hanging forever.
     */
    const timeoutMs =
        getNumberEnv(
            "JUDGE0_TIMEOUT_MS",
            10000
        );

    const controller =
        new AbortController();

    const timeout =
        setTimeout(
            () => controller.abort(),
            timeoutMs
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

        const authToken = process.env.JUDGE0_AUTH_TOKEN;
        if (authToken && authToken.trim()) {
            options.headers["X-Auth-Token"] = authToken.trim();
        }

        if (body !== null) {

            options.body =
                JSON.stringify(body);
        }

        const response =
            await fetch(
                url,
                options
            );

    let response;

    try {

        response = await fetch(

            `${judge0Url}/submissions` +
            `?base64_encoded=false` +
            `&wait=false`,

            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    Accept:
                        "application/json"
                },

                body:
                    JSON.stringify(body),

                signal:
                    controller.signal
            }
        );

    } catch (error) {

        console.error(
            "Judge0 connection error:",
            error
        );
        const data = await response.json();

        // Decode only responses requested in Base64 format.
        if (new URL(url).searchParams.get("base64_encoded") === "true") {
            const textFields = [
                "source_code", "stdin", "expected_output",
                "stdout", "stderr", "compile_output", "message"
            ];

            for (const field of textFields) {
                if (typeof data[field] === "string") {
                    data[field] = Buffer.from(
                        data[field], "base64"
                    ).toString("utf8");
                }
            }
        }

        return data;


        if (
            error.name ===
            "AbortError"
        ) {

            throw new Error(
                "Judge0 request timed out"
            );
        }


        throw new Error(
            "Unable to connect to Judge0"
        );

    } finally {

        clearTimeout(timeout);
    }


    /*
     * Handle HTTP errors
     */
    if (!response.ok) {

        let errorMessage =
            "Unknown Judge0 error";


        try {

            const errorData =
                await response.json();

            errorMessage =
                errorData.message ||
                errorData.error ||
                JSON.stringify(
                    errorData
                );

        } catch {

            try {
                url:
                    `${judge0Url}/submissions/` +
                    `${encodeURIComponent(token)}` +
                    `?base64_encoded=true`,

                method:
                    "GET"
            });

                errorMessage =
                    await response.text();

            } catch {
                // Keep default message
            }
        }


        console.error(
            "Judge0 submission failed:",
            errorMessage
        );


        throw new Error(
            `Judge0 submission failed: ${errorMessage}`
        );
    }


    /*
     * Parse response
     */
    let result;

    try {

        result =
            await response.json();

    } catch (error) {
        source_code:
            Buffer.from(code, "utf8").toString("base64"),

        stdin:
            Buffer.from(stdin || "", "utf8").toString("base64"),

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

        console.error(
            "Invalid Judge0 response:",
            error
        );

        throw new Error(
            "Invalid response received from Judge0"
        );
    }

    const result =
        await judge0Request({

            url:
                `${judge0Url}/submissions` +
                `?base64_encoded=true` +
                `&wait=false`,

            method:
                "POST",

            body
        });

    /*
     * Judge0 must return a token.
     */
    if (
        !result ||
        !result.token
    ) {

        console.error(
            "Judge0 response:",
            result
        );

        throw new Error(
            "Judge0 did not return a submission token"
        );
    }


    /*
     * Return normalized result.
     */
    return {

        success: true,

        data: {

            token:
                result.token,

            status:
                result.status || {
                    id: 1,
                    description:
                        "In Queue"
                },

            stdout:
                result.stdout ?? null,

            stderr:
                result.stderr ?? null,

            compileOutput:
                result.compile_output ??
                null,

            message:
                result.message ?? null,

            time:
                result.time ?? null,

            memory:
                result.memory ?? null
        }
    };
};


module.exports = {
    executeCode
};