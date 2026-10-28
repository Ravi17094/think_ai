const prisma = require("../config/database");

/*
 * ============================================================
 * CREATE ASSESSMENT
 * ============================================================
 *
 * Supports:
 * - MCQ questions
 * - CODING questions
 * - Coding test cases
 * - GFG-style coding question details
 */
const createAssessment = async (data) => {
    if (!data || typeof data !== "object") {
        throw new Error("Assessment data is required");
    }

    if (!Array.isArray(data.questions)) {
        throw new Error("Assessment questions must be an array");
    }

    if (data.questions.length === 0) {
        throw new Error("Assessment must contain at least one question");
    }

    const questions = data.questions.map((question, index) => {
        if (!question || typeof question !== "object") {
            throw new Error(`Invalid question at position ${index + 1}`);
        }

        if (
            typeof question.questionText !== "string" ||
            !question.questionText.trim()
        ) {
            throw new Error(`Question ${index + 1} text is required`);
        }

        const questionType = question.questionType || "MCQ";

        if (!["MCQ", "CODING"].includes(questionType)) {
            throw new Error(`Invalid question type for question ${index + 1}`);
        }

        const marks = Number(question.marks);

        if (!Number.isFinite(marks) || marks <= 0) {
            throw new Error(`Question ${index + 1} marks must be greater than 0`);
        }

        const questionData = {
            questionText: question.questionText.trim(),
            questionType,
            marks,
            order:
                question.order !== undefined
                    ? Number(question.order)
                    : index
        };

        if (questionType === "CODING") {
            if (!Array.isArray(question.testCases)) {
                throw new Error(`Coding question ${index + 1} must contain testCases`);
            }

            if (question.testCases.length === 0) {
                throw new Error(`Coding question ${index + 1} must contain at least one test case`);
            }

            questionData.title = question.title || null;
            questionData.difficulty = question.difficulty || null;
            questionData.problemStatement = question.problemStatement || null;
            questionData.inputFormat = question.inputFormat || null;
            questionData.outputFormat = question.outputFormat || null;
            questionData.constraints = question.constraints || null;
            questionData.explanation = question.explanation || null;
            questionData.examples =
                question.examples !== undefined ? question.examples : null;
            questionData.supportedLanguages =
                question.supportedLanguages !== undefined
                    ? question.supportedLanguages
                    : null;
            questionData.starterCode =
                question.starterCode !== undefined
                    ? question.starterCode
                    : null;

            const testCases = question.testCases.map((testCase, testCaseIndex) => {
                if (!testCase || typeof testCase !== "object") {
                    throw new Error(
                        `Invalid test case ${testCaseIndex + 1} for question ${index + 1}`
                    );
                }

                if (
                    testCase.expectedOutput === undefined ||
                    testCase.expectedOutput === null
                ) {
                    throw new Error(
                        `Expected output is required for test case ${testCaseIndex + 1}`
                    );
                }

                const testCaseMarks =
                    testCase.marks !== undefined ? Number(testCase.marks) : 1;

                if (!Number.isFinite(testCaseMarks) || testCaseMarks <= 0) {
                    throw new Error(
                        `Marks for test case ${testCaseIndex + 1} must be greater than 0`
                    );
                }

                return {
                    input:
                        testCase.input !== undefined && testCase.input !== null
                            ? String(testCase.input)
                            : null,
                    expectedOutput: String(testCase.expectedOutput).trim(),
                    marks: testCaseMarks,
                    isHidden: testCase.isHidden === true
                };
            });

            questionData.codingTestCases = {
                create: testCases
            };
        }

        if (questionType === "MCQ") {
            if (
                question.options !== undefined &&
                !Array.isArray(question.options)
            ) {
                throw new Error(`Options for question ${index + 1} must be an array`);
            }

            if (Array.isArray(question.options)) {
                questionData.options = {
                    create: question.options.map((option) => ({
                        optionText: option.optionText,
                        isCorrect: option.isCorrect === true
                    }))
                };
            }
        }

        return questionData;
    });


    /*
     * ============================================================
     * CREATE ASSESSMENT
     * ============================================================
     */

    return await prisma.assessment.create({

        data: {
            title: data.title,
            description: data.description || null,
            type: data.type || "MCQ",
            totalMarks: Number(data.totalMarks),
            duration:
                data.duration !== undefined && data.duration !== null
                    ? Number(data.duration)
                    : null,
            status: data.status || "ACTIVE",
            moduleId: Number(data.moduleId),
            questions: {
                create: questions
            }
        },
        include: {

            questions: {

                include: {
                    options: true,
                    codingTestCases: {
                        orderBy: {
                            id: "asc"
                        }
                    }
                },

                orderBy: {
                    order: "asc"
                }
            }
        }
    });
};

const getAllAssessments = async (moduleId) => {
    const where = {};
    if (moduleId) {
        where.moduleId = Number(moduleId);
    }

    return await prisma.assessment.findMany({
        where,
        include: {
            questions: {
                include: {
                    options: true,
                    codingTestCases: true // Ensures it matches your Prisma schema
                },
                orderBy: {
                    order: "asc"
                }
            }
        },
        orderBy: {
            id: "asc"
        }
    });
};

const updateAssessment = async (id, data) => {
    return await prisma.$transaction(async (tx) => {
        await tx.assessment.update({
            where: { id: Number(id) },
            data: {
                title: data.title,
                description: data.description,
                totalMarks:
                    data.totalMarks !== undefined
                        ? Number(data.totalMarks)
                        : undefined,
                duration:
                    data.duration !== undefined
                        ? data.duration
                            ? Number(data.duration)
                            : null
                        : undefined,
                status: data.status || undefined
            }
        });

        if (Array.isArray(data.questions)) {
            await tx.question.deleteMany({
                where: { assessmentId: Number(id) }
            });

            for (const [index, question] of data.questions.entries()) {
                const questionType = question.questionType || "MCQ";
                const questionData = {
                    assessmentId: Number(id),
                    questionText: question.questionText,
                    questionType,
                    marks: Number(question.marks),
                    order: question.order !== undefined ? Number(question.order) : index
                };

                if (questionType === "MCQ" && Array.isArray(question.options)) {
                    questionData.options = {
                        create: question.options.map((option) => ({
                            optionText: option.optionText,
                            isCorrect: option.isCorrect === true
                        }))
                    };
                }

                if (questionType === "CODING" && Array.isArray(question.testCases)) {
                    questionData.title = question.title || null;
                    questionData.difficulty = question.difficulty || null;
                    questionData.problemStatement = question.problemStatement || null;
                    questionData.inputFormat = question.inputFormat || null;
                    questionData.outputFormat = question.outputFormat || null;
                    questionData.constraints = question.constraints || null;
                    questionData.explanation = question.explanation || null;
                    questionData.examples = question.examples !== undefined ? question.examples : null;
                    questionData.supportedLanguages = question.supportedLanguages !== undefined ? question.supportedLanguages : null;
                    questionData.starterCode = question.starterCode !== undefined ? question.starterCode : null;

                    questionData.codingTestCases = {
                        create: question.testCases.map((tc) => ({
                            input: tc.input !== undefined && tc.input !== null ? String(tc.input) : null,
                            expectedOutput: String(tc.expectedOutput).trim(),
                            marks: tc.marks !== undefined ? Number(tc.marks) : 1,
                            isHidden: tc.isHidden === true
                        }))
                    };
                }

                await tx.question.create({ data: questionData });
            }
        }

        return await tx.assessment.findUnique({
            where: { id: Number(id) },
            include: {
                questions: {
                    include: {
                        options: true,
                        codingTestCases: {
                            orderBy: { id: "asc" }
                        }
                    },
                    orderBy: { order: "asc" }
                }
            }
        });
    });
};

const deleteAssessment = async (id) => {
    return await prisma.assessment.delete({
        where: { id: Number(id) }
    });
};

/*
 * ============================================================
 * GET ASSESSMENT BY ID
 * ============================================================
 */

const getAssessmentById = async (id) => {
    return await prisma.assessment.findUnique({

        where: {
            id: Number(id)
        },
        include: {

            questions: {

                include: {
                    options: true,
                    codingTestCases: {
                        orderBy: {
                            id: "asc"
                        }
                    }
                },
                orderBy: {
                    order: "asc"
                }
            }
        }
    });
};

/*
 * ============================================================
 * SUBMIT ASSESSMENT
 * ============================================================
 */
const submitAssessment = async (assessmentId, data) => {
    const id = Number(assessmentId);
    const enrollmentId = Number(data.enrollmentId);

    const assessment = await prisma.assessment.findUnique({
        where: {
            id
        },
        select: {
            id: true,
            title: true,
            totalMarks: true,
            status: true,
            module: {
                select: {
                    courseId: true
                }
            },
            questions: {
                select: {
                    id: true,
                    marks: true,
                    questionType: true,
                    options: {
                        select: {
                            id: true,
                            isCorrect: true
                        }
                    }
                },
                orderBy: {
                    order: "asc"
                }
            }
        }
    });

    if (!assessment) {
        throw new Error("Assessment not found");
    }

    if (assessment.status !== "ACTIVE") {
        throw new Error("Assessment is not active");
    }

    const enrollment = await prisma.enrollment.findUnique({
        where: {
            id: enrollmentId
        },
        select: {
            id: true,
            enrollmentStatus: true,
            batch: {
                select: {
                    courseId: true,
                    status: true,
                    course: {
                        select: {
                            status: true
                        }
                    }
                }
            }
        }
    });

    if (!enrollment) {
        throw new Error("Enrollment not found");
    }

    if (!["ACTIVE", "ENROLLED"].includes(enrollment.enrollmentStatus)) {
        throw new Error("Enrollment is not active");
    }

    if (enrollment.batch?.status !== "ACTIVE") {
        throw new Error("Batch is not active");
    }

    if (enrollment.batch?.course?.status !== "ACTIVE") {
        throw new Error("Course is not active");
    }

    if (
        !assessment.module ||
        assessment.module.courseId !== enrollment.batch.courseId
    ) {
        throw new Error("This assessment does not belong to the enrolled course");
    }

    if (!Array.isArray(data.answers)) {
        throw new Error("Answers must be an array");
    }

    if (data.answers.length === 0) {
        throw new Error("At least one answer is required");
    }

    const questionIds = data.answers.map((answer) => Number(answer.questionId));
    const uniqueQuestionIds = new Set(questionIds);

    if (uniqueQuestionIds.size !== questionIds.length) {
        throw new Error("Duplicate question answers are not allowed");
    }

    let score = 0;

    const answers = data.answers.map((answer) => {
        const question = assessment.questions.find(
            (item) => item.id === Number(answer.questionId)
        );

        if (!question) {
            throw new Error(`Question ${answer.questionId} not found in this assessment`);
        }

        if (question.questionType === "CODING") {
            if (typeof answer.code !== "string" || !answer.code.trim()) {
                throw new Error(`Code is required for question ${question.id}`);
            }

            return {
                questionId: question.id,
                selectedOptionId: null,
                answerText: null,
                code: answer.code,
                isCorrect: null,
                marksObtained: 0
            };
        }

        const selectedOption = question.options.find(
            (option) => option.id === Number(answer.selectedOptionId)
        );

        if (!selectedOption) {
            throw new Error(`Invalid option for question ${question.id}`);
        }

        const isCorrect = selectedOption.isCorrect === true;
        const marksObtained = isCorrect ? Number(question.marks) : 0;

        score += marksObtained;

        return {
            questionId: question.id,
            selectedOptionId: selectedOption.id,
            answerText: null,
            code: null,
            isCorrect,
            marksObtained
        };
    });

    const percentage = Number(
        (assessment.totalMarks > 0
            ? (score / assessment.totalMarks) * 100
            : 0
        ).toFixed(2)
    );

    const submission = await prisma.$transaction(async (tx) => {
        return await tx.assessmentSubmission.create({
            data: {
                assessmentId: id,
                enrollmentId,
                score,
                totalMarks: assessment.totalMarks,
                percentage,
                status: "SUBMITTED",
                answers: {
                    create: answers
                }
            },
            include: {
                answers: true
            }
        });
    });

    return submission;
};

/*
 * ============================================================
 * START ASSESSMENT
 * ============================================================
 */
const startAssessment = async (assessmentId, enrollmentId) => {
    const id = Number(assessmentId);
    const enrollment = Number(enrollmentId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Assessment ID must be a positive integer");
    }

    if (!Number.isInteger(enrollment) || enrollment <= 0) {
        throw new Error("Enrollment ID must be a positive integer");
    }

    const assessment = await prisma.assessment.findUnique({
        where: {
            id
        },
        select: {
            id: true,
            title: true,
            totalMarks: true,
            status: true,
            module: {
                select: {
                    courseId: true
                }
            }
        }
    });

    if (!assessment) {
        throw new Error("Assessment not found");
    }

    if (assessment.status !== "ACTIVE") {
        throw new Error("Assessment is not active");
    }

    const enrollmentRecord = await prisma.enrollment.findUnique({
        where: {
            id: enrollment
        },
        select: {
            id: true,
            enrollmentStatus: true,
            batch: {
                select: {
                    courseId: true,
                    status: true,
                    course: {
                        select: {
                            status: true
                        }
                    }
                }
            }
        }
    });

    if (!enrollmentRecord) {
        throw new Error("Enrollment not found");
    }

    if (!["ACTIVE", "ENROLLED"].includes(enrollmentRecord.enrollmentStatus)) {
        throw new Error("Enrollment is not active");
    }

    if (enrollmentRecord.batch?.status !== "ACTIVE") {
        throw new Error("Batch is not active");
    }

    if (enrollmentRecord.batch?.course?.status !== "ACTIVE") {
        throw new Error("Course is not active");
    }

    if (
        !assessment.module ||
        assessment.module.courseId !== enrollmentRecord.batch.courseId
    ) {
        throw new Error("This assessment does not belong to the enrolled course");
    }

    const existingSubmission = await prisma.assessmentSubmission.findFirst({
        where: {
            assessmentId: id,
            enrollmentId: enrollment
        },
        orderBy: {
            createdAt: "desc"
        },
        include: {
            answers: true
        }
    });

    if (existingSubmission) {
        return existingSubmission;
    }

    const submission = await prisma.assessmentSubmission.create({
        data: {
            assessmentId: id,
            enrollmentId: enrollment,
            score: 0,
            totalMarks: assessment.totalMarks,
            percentage: 0,
            status: "IN_PROGRESS"
        },
        include: {
            answers: true
        }
    });

    return submission;
};

/*
 * ============================================================
 * ASSESSMENT ANALYTICS
 * ============================================================
 */
const getAssessmentAnalytics = async (assessmentId) => {
    const id = Number(assessmentId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Assessment ID must be a positive integer");
    }

    const assessment = await prisma.assessment.findUnique({
        where: {
            id
        },
        select: {
            id: true,
            title: true
        }
    });

    if (!assessment) {
        throw new Error("Assessment not found");
    }

    const result = await prisma.assessmentSubmission.aggregate({
        where: {
            assessmentId: id,
            status: {
                in: ["COMPLETED", "FAILED"]
            }
        },
        _count: {
            id: true
        },
        _avg: {
            score: true,
            percentage: true
        },
        _max: {
            score: true
        },
        _min: {
            score: true
        }
    });

    const passed = await prisma.assessmentSubmission.count({
        where: {
            assessmentId: id,
            status: {
                in: ["COMPLETED", "FAILED"]
            },
            percentage: {
                gte: 40
            }
        }
    });

    const totalSubmissions = result._count.id;
    const failed = totalSubmissions - passed;

    return {
        assessmentId: assessment.id,
        title: assessment.title,
        totalSubmissions,
        averageScore: Number((result._avg.score || 0).toFixed(2)),
        averagePercentage: Number((result._avg.percentage || 0).toFixed(2)),
        highestScore: Number(result._max.score || 0),
        lowestScore: Number(result._min.score || 0),
        passed,
        failed
    };
};

/*
 * List all submissions for a given assessment,
 * joined with Enrollment for student name/email,
 * newest first.
 */
const getSubmissionsByAssessmentId = async (assessmentId) => {
    return await prisma.assessmentSubmission.findMany({
        where: {
            assessmentId: Number(assessmentId)
        },
        include: {
            enrollment: {
                select: {
                    id: true,
                    studentName: true,
                    studentEmail: true
                }
            }
        },
        orderBy: {
            submittedAt: "desc"
        }
    });
};

/*
 * ============================================================
 * SAVE JUDGE0 TOKEN
 * ============================================================
 */
const saveJudge0Token = async (submissionId, judge0Token) => {
    if (!judge0Token) {
        throw new Error("Judge0 token is required");
    }

    return await prisma.assessmentSubmission.update({
        where: {
            id: Number(submissionId)
        },
        data: {
            judge0Token
        }
    });
};

/*
 * ============================================================
 * GET SUBMISSION BY JUDGE0 TOKEN
 * ============================================================
 */
const getSubmissionByJudge0Token = async (judge0Token) => {
    if (!judge0Token) {
        throw new Error("Judge0 token is required");
    }

    return await prisma.assessmentSubmission.findUnique({
        where: {
            judge0Token
        },
        include: {
            assessment: true,
            answers: true
        }
    });
};

/*
 * ============================================================
 * UPDATE ASSESSMENT SUBMISSION
 * ============================================================
 */
const updateAssessmentSubmissionStatus = async (submissionId, data) => {
    if (!data) {
        throw new Error("Judge0 result data is required");
    }

    const submission = await prisma.assessmentSubmission.findUnique({
        where: {
            id: Number(submissionId)
        },
        include: {
            assessment: {
                include: {
                    questions: true
                }
            },
            answers: true
        }
    });

    if (!submission) {
        throw new Error("Assessment submission not found");
    }

    const judge0Status = data.judge0Status || null;
    let status = "FAILED";

    if (judge0Status === "Accepted") {
        status = "COMPLETED";
    }

    const codingAnswer = submission.answers.find((answer) => answer.code);

    if (codingAnswer) {
        const question = await prisma.question.findUnique({
            where: {
                id: codingAnswer.questionId
            }
        });

        if (question) {
            const isCorrect = judge0Status === "Accepted";

            await prisma.submissionAnswer.update({
                where: {
                    id: codingAnswer.id
                },
                data: {
                    isCorrect,
                    marksObtained: isCorrect ? question.marks : 0
                }
            });
        }
    }

    const updatedAnswers = await prisma.submissionAnswer.findMany({
        where: {
            submissionId: Number(submissionId)
        }
    });

    const score = updatedAnswers.reduce(
        (total, answer) => total + Number(answer.marksObtained || 0),
        0
    );

    const totalMarks = submission.totalMarks;
    const percentage =
        totalMarks > 0 ? Number(((score / totalMarks) * 100).toFixed(2)) : 0;

    return await prisma.assessmentSubmission.update({
        where: {
            id: Number(submissionId)
        },
        data: {
            judge0Status,
            stdout: data.stdout || null,
            stderr: data.stderr || null,
            compileOutput: data.compileOutput || null,
            executionTime:
                data.executionTime !== undefined && data.executionTime !== null
                    ? String(data.executionTime)
                    : null,
            memory:
                data.memory !== undefined && data.memory !== null
                    ? Number(data.memory)
                    : null,
            score,
            percentage,
            status
        },
        include: {
            assessment: {
                select: {
                    id: true,
                    title: true,
                    totalMarks: true
                }
            },
            answers: true
        }
    });
};

/*
 * ============================================================
 * ENROLLMENT ASSESSMENT STATUS
 * ============================================================
 */
const getEnrollmentAssessmentStatus = async (enrollmentId) => {
    const id = Number(enrollmentId);

    const enrollment = await prisma.enrollment.findUnique({
        where: {
            id
        },
        include: {
            batch: {
                include: {
                    course: {
                        include: {
                            modules: {
                                include: {
                                    assessments: {
                                        select: {
                                            id: true,
                                            title: true,
                                            submissions: {
                                                where: {
                                                    enrollmentId: id
                                                },
                                                select: {
                                                    id: true,
                                                    percentage: true,
                                                    status: true,
                                                    submittedAt: true
                                                },
                                                orderBy: {
                                                    submittedAt: "desc"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!enrollment) {
        throw new Error("Enrollment not found");
    }

    const assessments = enrollment.batch.course.modules.flatMap(
        (module) => module.assessments
    );

    const totalAssessments = assessments.length;
    let passedAssessments = 0;
    let failedAssessments = 0;

    const assessmentResults = assessments.map((assessment) => {
        if (!assessment.submissions || assessment.submissions.length === 0) {
            failedAssessments++;
            return {
                assessmentId: assessment.id,
                title: assessment.title,
                attempted: false,
                passed: false,
                percentage: null
            };
        }

        const passedSubmission = assessment.submissions.find(
            (submission) => Number(submission.percentage || 0) >= 40
        );

        if (passedSubmission) {
            passedAssessments++;
            return {
                assessmentId: assessment.id,
                title: assessment.title,
                attempted: true,
                passed: true,
                percentage: Number(passedSubmission.percentage)
            };
        }

        failedAssessments++;
        const latestSubmission = assessment.submissions[0];

        return {
            assessmentId: assessment.id,
            title: assessment.title,
            attempted: true,
            passed: false,
            percentage: Number(latestSubmission.percentage || 0)
        };
    });

    const allPassed =
        totalAssessments === 0 || passedAssessments === totalAssessments;

    return {
        enrollmentId: id,
        totalAssessments,
        passedAssessments,
        failedAssessments,
        allPassed,
        assessments: assessmentResults
    };
};

/*
 * ============================================================
 * CODING TEST CASE EXECUTION
 * ============================================================
 */
const createCodingTestCaseExecution = async ({
    submissionId,
    questionId,
    testCaseId,
    judge0Token
}) => {
    if (!judge0Token || typeof judge0Token !== "string") {
        throw new Error("Judge0 token is required");
    }

    const submission = await prisma.assessmentSubmission.findUnique({
        where: {
            id: Number(submissionId)
        },
        select: {
            id: true
        }
    });

    if (!submission) {
        throw new Error("Assessment submission not found");
    }

    const question = await prisma.question.findUnique({
        where: {
            id: Number(questionId)
        },
        select: {
            id: true,
            questionType: true
        }
    });

    if (!question) {
        throw new Error("Question not found");
    }

    if (question.questionType !== "CODING") {
        throw new Error("Question is not a coding question");
    }

    const testCase = await prisma.codingTestCase.findUnique({
        where: {
            id: Number(testCaseId)
        },
        select: {
            id: true,
            questionId: true,
            expectedOutput: true,
            marks: true
        }
    });

    if (!testCase) {
        throw new Error("Coding test case not found");
    }

    if (testCase.questionId !== Number(questionId)) {
        throw new Error("Coding test case does not belong to the question");
    }

    return await prisma.codingTestCaseExecution.create({
        data: {
            submissionId: Number(submissionId),
            questionId: Number(questionId),
            testCaseId: Number(testCaseId),
            judge0Token: judge0Token.trim(),
            expectedOutput: testCase.expectedOutput,
            passed: false,
            marksObtained: 0
        },
        include: {
            testCase: true,
            question: true
        }
    });
};

const getCodingTestCaseExecutionByToken = async (judge0Token) => {
    if (!judge0Token || typeof judge0Token !== "string") {
        throw new Error("Judge0 token is required");
    }

    return await prisma.codingTestCaseExecution.findUnique({
        where: {
            judge0Token: judge0Token.trim()
        },
        include: {
            submission: true,
            question: true,
            testCase: true
        }
    });
};

const updateCodingTestCaseExecution = async (executionId, data) => {
    const execution = await prisma.codingTestCaseExecution.findUnique({
        where: {
            id: Number(executionId)
        },
        include: {
            testCase: true
        }
    });

    if (!execution) {
        throw new Error("Coding test case execution not found");
    }

    const actualOutput =
        data.actualOutput !== undefined && data.actualOutput !== null
            ? String(data.actualOutput)
            : "";

    const expectedOutput =
        execution.expectedOutput !== undefined &&
        execution.expectedOutput !== null
            ? String(execution.expectedOutput)
            : String(execution.testCase.expectedOutput);

    const normalizeOutput = (value) => {
        return String(value)
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .split("\n")
            .map((line) => line.trimEnd())
            .join("\n")
            .trim();
    };

    const normalizedActual = normalizeOutput(actualOutput);
    const normalizedExpected = normalizeOutput(expectedOutput);

    const passed =
        data.judge0Status === "Accepted" &&
        normalizedActual === normalizedExpected;

    const marksObtained = passed ? Number(execution.testCase.marks) : 0;

    return await prisma.codingTestCaseExecution.update({
        where: {
            id: Number(executionId)
        },
        data: {
            judge0Status: data.judge0Status || null,
            actualOutput,
            expectedOutput,
            executionTime:
                data.executionTime !== undefined && data.executionTime !== null
                    ? String(data.executionTime)
                    : null,
            memory:
                data.memory !== undefined && data.memory !== null
                    ? Number(data.memory)
                    : null,
            passed,
            marksObtained
        }
    });
};

const getCodingTestCasesByQuestion = async (questionId) => {
    return await prisma.codingTestCase.findMany({
        where: {
            questionId: Number(questionId)
        },
        orderBy: {
            id: "asc"
        }
    });
};

const recalculateCodingQuestionScore = async (submissionId, questionId) => {
    const parsedSubmissionId = Number(submissionId);
    const parsedQuestionId = Number(questionId);

    const executionRecords = await prisma.codingTestCaseExecution.findMany({
        where: {
            submissionId: parsedSubmissionId,
            questionId: parsedQuestionId
        },

        data: updateData,

        include: {
            testCase: true
        },
        orderBy: {
            id: "desc"
        }
    });

    if (executionRecords.length === 0) {
        throw new Error("No coding test case executions found");
    }

    const latestExecutionMap = new Map();

    for (const execution of executionRecords) {
        if (!latestExecutionMap.has(execution.testCaseId)) {
            latestExecutionMap.set(execution.testCaseId, execution);
        }
    }

    const latestExecutions = Array.from(latestExecutionMap.values());

    const marksObtained = latestExecutions.reduce(
        (total, execution) => total + Number(execution.marksObtained || 0),
        0
    );

    const allCompleted =
        latestExecutions.length > 0 &&
        latestExecutions.every((execution) => execution.judge0Status !== null);

    const allPassed =
        latestExecutions.length > 0 &&
        latestExecutions.every((execution) => execution.passed === true);

    await prisma.submissionAnswer.updateMany({
        where: {
            submissionId: parsedSubmissionId,
            questionId: parsedQuestionId
        },
        data: {
            isCorrect: allCompleted ? allPassed : null,
            marksObtained
        }
    });

    const submission = await prisma.assessmentSubmission.findUnique({
        where: {
            id: parsedSubmissionId
        },
        select: {
            id: true,
            totalMarks: true
        }
    });

    if (!submission) {
        throw new Error("Assessment submission not found");
    }

    const answers = await prisma.submissionAnswer.findMany({
        where: {
            submissionId: parsedSubmissionId
        },
        select: {
            questionId: true,
            marksObtained: true
        }
    });

    const score = answers.reduce((total, answer) => {
        if (Number(answer.questionId) === parsedQuestionId) {
            return total;
        }
        return total + Number(answer.marksObtained || 0);
    }, marksObtained);

    const percentage =
        submission.totalMarks > 0
            ? Number(((score / submission.totalMarks) * 100).toFixed(2))
            : 0;

    const status = allCompleted ? "COMPLETED" : "IN_PROGRESS";

    const updatedSubmission = await prisma.assessmentSubmission.update({
        where: {
            id: parsedSubmissionId
        },
        data: {
            score,
            percentage,
            status
        }
    });

    return {
        submissionId: updatedSubmission.id,
        questionId: parsedQuestionId,
        marksObtained,
        score: updatedSubmission.score,
        totalMarks: updatedSubmission.totalMarks,
        percentage: updatedSubmission.percentage,
        status: updatedSubmission.status,
        allCompleted,
        allPassed
    };
};

const getAssessmentSubmissionResult = async (submissionId) => {
    const parsedSubmissionId = Number(submissionId);

    if (!Number.isInteger(parsedSubmissionId) || parsedSubmissionId <= 0) {
        throw new Error("Submission ID must be a positive integer");
    }

    const submission = await prisma.assessmentSubmission.findUnique({
        where: {
            id: parsedSubmissionId
        },
        select: {
            id: true,
            assessmentId: true,
            enrollmentId: true,
            score: true,
            totalMarks: true,
            percentage: true,
            status: true,
            submittedAt: true,
            createdAt: true,
            updatedAt: true,
            answers: {
                select: {
                    id: true,
                    questionId: true,
                    code: true,
                    isCorrect: true,
                    marksObtained: true
                }
            },
            codingTestCaseExecutions: {
                select: {
                    id: true,
                    questionId: true,
                    testCaseId: true,
                    judge0Status: true,
                    actualOutput: true,
                    passed: true,
                    marksObtained: true,
                    executionTime: true,
                    memory: true,
                    testCase: {
                        select: {
                            id: true,
                            isHidden: true,
                            marks: true
                        }
                    }
                },
                orderBy: {
                    id: "asc"
                }
            }
        }
    });

    if (!submission) {
        throw new Error("Assessment submission not found");
    }

    const allExecutions = submission.codingTestCaseExecutions || [];
    const latestExecutionMap = new Map();

    for (const execution of allExecutions) {
        const key = `${execution.questionId}-${execution.testCaseId}`;
        const existing = latestExecutionMap.get(key);

        if (!existing || Number(execution.id) > Number(existing.id)) {
            latestExecutionMap.set(key, execution);
        }
    }

    const executions = Array.from(latestExecutionMap.values()).sort(
        (a, b) => Number(a.id) - Number(b.id)
    );

    const totalTestCases = executions.length;
    const passedTestCases = executions.filter(
        (execution) => execution.passed === true
    ).length;
    const failedTestCases = executions.filter(
        (execution) =>
            execution.passed === false && execution.judge0Status !== null
    ).length;
    const pendingTestCases = executions.filter(
        (execution) => execution.judge0Status === null
    ).length;

    const hasCodingAnswer = submission.answers.some(
        (answer) =>
            typeof answer.code === "string" && answer.code.trim().length > 0
    );

    let verdict = "PENDING";

    if (totalTestCases > 0) {
        const allCompleted = executions.every(
            (execution) => execution.judge0Status !== null
        );

        if (allCompleted) {
            if (passedTestCases === totalTestCases) {
                verdict = "ACCEPTED";
            } else if (passedTestCases > 0) {
                verdict = "PARTIALLY_ACCEPTED";
            } else {
                verdict = "WRONG_ANSWER";
            }
        }
    }

    let responseStatus = submission.status;

    if (hasCodingAnswer) {
        if (totalTestCases === 0) {
            responseStatus =
                submission.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS";
        } else if (pendingTestCases > 0) {
            responseStatus = "IN_PROGRESS";
        } else {
            responseStatus = "COMPLETED";
        }
    }

    const testCaseResults = executions.map((execution, index) => {
        let executionStatus = "PENDING";

        if (execution.judge0Status !== null) {
            executionStatus =
                execution.passed === true ? "PASSED" : "FAILED";
        }

        return {
            testCaseNumber: index + 1,
            testCaseId: execution.testCaseId,
            questionId: execution.questionId,
            isHidden: execution.testCase?.isHidden === true,
            status: executionStatus,
            passed: execution.passed === true,
            marksObtained: Number(execution.marksObtained || 0),
            marks: Number(execution.testCase?.marks || 0),
            judge0Status: execution.judge0Status,
            executionTime: execution.executionTime,
            memory: execution.memory,
            stdout:
                execution.testCase?.isHidden === true
                    ? null
                    : execution.actualOutput
        };
    });

    return {
        submissionId: submission.id,
        assessmentId: submission.assessmentId,
        enrollmentId: submission.enrollmentId,
        status: responseStatus,
        verdict,
        score: Number(submission.score || 0),
        totalMarks: Number(submission.totalMarks || 0),
        percentage: Number(submission.percentage || 0),
        testCases: {
            total: totalTestCases,
            passed: passedTestCases,
            failed: failedTestCases,
            pending: pendingTestCases
        },
        results: testCaseResults,
        submittedAt: submission.submittedAt,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt
    };
};

/*
 * ============================================================
 * ADMIN CODING QUESTION & TEST CASE MANAGEMENT
 * ============================================================
 */
const createCodingQuestion = async (data) => {
    if (!data || typeof data !== "object") {
        throw new Error("Coding question data is required");
    }

    const assessmentId = Number(data.assessmentId);

    if (!Number.isInteger(assessmentId) || assessmentId <= 0) {
        throw new Error("Assessment ID must be a positive integer");
    }

    if (typeof data.questionText !== "string" || !data.questionText.trim()) {
        throw new Error("Question text is required");
    }

    const assessment = await prisma.assessment.findUnique({
        where: {
            id: assessmentId
        }
    });

    if (!assessment) {
        throw new Error("Assessment not found");
    }

    if (!Array.isArray(data.testCases) || data.testCases.length === 0) {
        throw new Error("At least one coding test case is required");
    }

    const testCases = data.testCases.map((testCase, index) => {
        if (!testCase || typeof testCase !== "object") {
            throw new Error(`Invalid test case at position ${index + 1}`);
        }

        if (
            testCase.expectedOutput === undefined ||
            testCase.expectedOutput === null
        ) {
            throw new Error(`Expected output is required for test case ${index + 1}`);
        }

        const marks =
            testCase.marks !== undefined ? Number(testCase.marks) : 1;

        if (!Number.isFinite(marks) || marks <= 0) {
            throw new Error(`Marks for test case ${index + 1} must be greater than 0`);
        }

        return {
            input:
                testCase.input !== undefined && testCase.input !== null
                    ? String(testCase.input)
                    : null,
            expectedOutput: String(testCase.expectedOutput).trim(),
            marks,
            isHidden: testCase.isHidden === true
        };
    });

    return await prisma.question.create({
        data: {
            title: data.title || null,
            questionText: data.questionText.trim(),
            questionType: "CODING",
            difficulty: data.difficulty || null,
            marks: data.marks !== undefined ? Number(data.marks) : 1,
            order: data.order !== undefined ? Number(data.order) : 0,
            problemStatement: data.problemStatement || null,
            inputFormat: data.inputFormat || null,
            outputFormat: data.outputFormat || null,
            constraints: data.constraints || null,
            explanation: data.explanation || null,
            examples: data.examples !== undefined ? data.examples : null,
            supportedLanguages:
                data.supportedLanguages !== undefined
                    ? data.supportedLanguages
                    : null,
            starterCode: data.starterCode !== undefined ? data.starterCode : null,
            assessmentId,
            codingTestCases: {
                create: testCases
            }
        },
        include: {
            codingTestCases: {
                orderBy: {
                    id: "asc"
                }
            }
        }
    });
};

const getCodingQuestions = async (assessmentId) => {
    const id = Number(assessmentId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Assessment ID must be a positive integer");
    }

    return await prisma.question.findMany({
        where: {
            assessmentId: id,
            questionType: "CODING"
        },
        include: {
            codingTestCases: {
                orderBy: {
                    id: "asc"
                }
            }
        },
        orderBy: {
            order: "asc"
        }
    });
};

const getCodingQuestionById = async (questionId) => {
    const id = Number(questionId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Question ID must be a positive integer");
    }

    const question = await prisma.question.findFirst({
        where: {
            id,
            questionType: "CODING"
        },
        include: {
            codingTestCases: {
                orderBy: {
                    id: "asc"
                }
            },
            assessment: {
                select: {
                    id: true,
                    title: true,
                    moduleId: true
                }
            }
        }
    });

    if (!question) {
        throw new Error("Coding question not found");
    }

    return question;
};

const updateCodingQuestion = async (questionId, data) => {
    const id = Number(questionId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Question ID must be a positive integer");
    }

    const existing = await prisma.question.findFirst({
        where: {
            id,
            questionType: "CODING"
        }
    });

    if (!existing) {
        throw new Error("Coding question not found");
    }

    const updateData = {};

    if (data.title !== undefined) {
        updateData.title = data.title || null;
    }

    if (data.questionText !== undefined) {
        if (
            typeof data.questionText !== "string" ||
            !data.questionText.trim()
        ) {
            throw new Error("Question text is required");
        }
        updateData.questionText = data.questionText.trim();
    }

    if (data.difficulty !== undefined) {
        updateData.difficulty = data.difficulty || null;
    }

    if (data.marks !== undefined) {
        const marks = Number(data.marks);
        if (!Number.isFinite(marks) || marks <= 0) {
            throw new Error("Question marks must be greater than 0");
        }
        updateData.marks = marks;
    }

    if (data.order !== undefined) {
        updateData.order = Number(data.order);
    }

    if (data.problemStatement !== undefined) {
        updateData.problemStatement = data.problemStatement || null;
    }

    if (data.inputFormat !== undefined) {
        updateData.inputFormat = data.inputFormat || null;
    }

    if (data.outputFormat !== undefined) {
        updateData.outputFormat = data.outputFormat || null;
    }

    if (data.constraints !== undefined) {
        updateData.constraints = data.constraints || null;
    }

    if (data.explanation !== undefined) {
        updateData.explanation = data.explanation || null;
    }

    if (data.examples !== undefined) {
        updateData.examples = data.examples;
    }

    if (data.supportedLanguages !== undefined) {
        updateData.supportedLanguages = data.supportedLanguages;
    }

    if (data.starterCode !== undefined) {
        updateData.starterCode = data.starterCode;
    }

    return await prisma.question.update({
        where: {
            id
        },
        data: updateData,
        include: {
            codingTestCases: {
                orderBy: {
                    id: "asc"
                }
            }
        }
    });
};

const deleteCodingQuestion = async (questionId) => {
    const id = Number(questionId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Question ID must be a positive integer");
    }

    const existing = await prisma.question.findFirst({
        where: {
            id,
            questionType: "CODING"
        }
    });

    if (!existing) {
        throw new Error("Coding question not found");
    }

    return await prisma.question.delete({
        where: {
            id
        }
    });
};

const createCodingTestCase = async (questionId, data) => {
    const id = Number(questionId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Question ID must be a positive integer");
    }

    const question = await prisma.question.findFirst({
        where: {
            id,
            questionType: "CODING"
        }
    });

    if (!question) {
        throw new Error("Coding question not found");
    }

    if (
        data.expectedOutput === undefined ||
        data.expectedOutput === null
    ) {
        throw new Error("Expected output is required");
    }

    const marks = data.marks !== undefined ? Number(data.marks) : 1;

    if (!Number.isFinite(marks) || marks <= 0) {
        throw new Error("Test case marks must be greater than 0");
    }

    return await prisma.codingTestCase.create({
        data: {
            questionId: id,
            input:
                data.input !== undefined && data.input !== null
                    ? String(data.input)
                    : null,
            expectedOutput: String(data.expectedOutput).trim(),
            marks,
            isHidden: data.isHidden === true
        }
    });
};

const getCodingTestCases = async (questionId) => {
    const id = Number(questionId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Question ID must be a positive integer");
    }

    const question = await prisma.question.findFirst({
        where: {
            id,
            questionType: "CODING"
        }
    });

    if (!question) {
        throw new Error("Coding question not found");
    }

    return await prisma.codingTestCase.findMany({
        where: {
            questionId: id
        },
        orderBy: {
            id: "asc"
        }
    });
};

const updateCodingTestCase = async (testCaseId, data) => {
    const id = Number(testCaseId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Test case ID must be a positive integer");
    }

    const existing = await prisma.codingTestCase.findUnique({
        where: {
            id
        },
        include: {
            question: {
                select: {
                    questionType: true
                }
            }
        }
    });

    if (!existing || existing.question.questionType !== "CODING") {
        throw new Error("Coding test case not found");
    }

    const updateData = {};

    if (data.input !== undefined) {
        updateData.input = data.input !== null ? String(data.input) : null;
    }

    if (data.expectedOutput !== undefined) {
        if (
            data.expectedOutput === null ||
            String(data.expectedOutput).trim() === ""
        ) {
            throw new Error("Expected output is required");
        }
        updateData.expectedOutput = String(data.expectedOutput).trim();
    }

    if (data.marks !== undefined) {
        const marks = Number(data.marks);
        if (!Number.isFinite(marks) || marks <= 0) {
            throw new Error("Test case marks must be greater than 0");
        }
        updateData.marks = marks;
    }

    if (data.isHidden !== undefined) {
        updateData.isHidden = data.isHidden === true;
    }

    return await prisma.codingTestCase.update({
        where: {
            id
        },
        data: updateData
    });
};

const deleteCodingTestCase = async (testCaseId) => {
    const id = Number(testCaseId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Test case ID must be a positive integer");
    }

    const existing = await prisma.codingTestCase.findUnique({
        where: {
            id
        },
        include: {
            question: {
                select: {
                    questionType: true
                }
            }
        }
    });

    if (!existing || existing.question.questionType !== "CODING") {
        throw new Error("Coding test case not found");
    }

    return await prisma.codingTestCase.delete({
        where: {
            id
        }
    });
};

/*
 * ============================================================
 * EXPORTS
 * ============================================================
 */
module.exports = {
    createAssessment,
    getAllAssessments,
    getAssessmentById,
    updateAssessment,
    deleteAssessment,
    startAssessment,
    submitAssessment,
    getAssessmentAnalytics,
    getSubmissionsByAssessmentId,
    saveJudge0Token,
    getSubmissionByJudge0Token,
    updateAssessmentSubmissionStatus,
    getEnrollmentAssessmentStatus,

    // Coding execution & grading
    createCodingTestCaseExecution,
    getCodingTestCaseExecutionByToken,
    updateCodingTestCaseExecution,
    getCodingTestCasesByQuestion,
    recalculateCodingQuestionScore,
    getAssessmentSubmissionResult,

    // Admin coding question management
    createCodingQuestion,
    getCodingQuestions,
    getCodingQuestionById,
    updateCodingQuestion,
    deleteCodingQuestion,

    // Admin coding test-case management
    createCodingTestCase,
    getCodingTestCases,
    updateCodingTestCase,
    deleteCodingTestCase
};
