const fs = require("fs");

const file = "./repositories/assessmentRepository.js";

let content = fs.readFileSync(file, "utf8");

/*
 * ============================================================
 * FIX 1
 * Remove the corrupted duplicate section inside createAssessment.
 *
 * The valid first implementation ends with:
 *
 *     return questionData;
 * };
 *
 * The corrupted duplicate starts with the old separator and
 * continues until the CREATE ASSESSMENT database call.
 * ============================================================
 */

const duplicateStart =
    /\n\s*\*\s*==================================================\s*\n\s*\*?\s*\*?\/\s*\n\s*const questionData\s*=\s*\{/;

const duplicateMatch = content.match(duplicateStart);

if (duplicateMatch) {
    const startIndex = duplicateMatch.index;

    const createAssessmentDbCall = content.indexOf(
        "    return await prisma.assessment.create({",
        startIndex
    );

    if (createAssessmentDbCall === -1) {
        throw new Error(
            "Could not find prisma.assessment.create() after corrupted section."
        );
    }

    /*
     * Keep the database create call, but remove the corrupted
     * duplicate question-building code before it.
     */
    content =
        content.slice(0, startIndex) +
        "\n\n" +
        content.slice(createAssessmentDbCall);
}

/*
 * ============================================================
 * FIX 2
 * Remove invalid:
 *
 *     data: updateData,
 *
 * from findMany() inside recalculateCodingQuestionScore().
 *
 * findMany() accepts where/include/orderBy, not data.
 * ============================================================
 */

content = content.replace(
    /const executionRecords = await prisma\.codingTestCaseExecution\.findMany\(\{\s*where:\s*\{\s*submissionId:\s*parsedSubmissionId,\s*questionId:\s*parsedQuestionId\s*\},\s*data:\s*updateData,\s*include:/,
    `const executionRecords = await prisma.codingTestCaseExecution.findMany({
        where: {
            submissionId: parsedSubmissionId,
            questionId: parsedQuestionId
        },
        include:`
);

/*
 * ============================================================
 * FIX 3
 * Remove any remaining duplicate/corrupted questionData block
 * if the previous pattern did not catch it because formatting
 * differs.
 * ============================================================
 */

const getAllIndex = content.indexOf("const getAllAssessments");

if (getAllIndex === -1) {
    throw new Error("Could not find const getAllAssessments.");
}

const createIndex = content.indexOf("const createAssessment");

if (createIndex === -1) {
    throw new Error("Could not find const createAssessment.");
}

const beforeCreate = content.slice(0, createIndex);
const createSection = content.slice(createIndex, getAllIndex);

/*
 * Make sure there is only one question map.
 */
const questionMapMatches = createSection.match(
    /const questions\s*=\s*data\.questions\.map/g
);

if (!questionMapMatches || questionMapMatches.length !== 1) {
    throw new Error(
        `createAssessment still contains ${questionMapMatches ? questionMapMatches.length : 0} question-map blocks. Manual inspection required.`
    );
}

/*
 * Make sure GFG fields still exist.
 */
const requiredGfgFields = [
    "questionData.title",
    "questionData.difficulty",
    "questionData.problemStatement",
    "questionData.inputFormat",
    "questionData.outputFormat",
    "questionData.constraints",
    "questionData.explanation",
    "questionData.examples",
    "questionData.supportedLanguages",
    "questionData.starterCode",
    "questionData.codingTestCases"
];

for (const field of requiredGfgFields) {
    if (!createSection.includes(field)) {
        throw new Error(
            `GFG functionality missing: ${field}`
        );
    }
}

/*
 * ============================================================
 * Write repaired file
 * ============================================================
 */

fs.writeFileSync(file, content, "utf8");

console.log("");
console.log("==============================================");
console.log(" assessmentRepository.js FIXED");
console.log("==============================================");
console.log("");
console.log("Preserved:");
console.log("  ✓ MCQ");
console.log("  ✓ MCQ options");
console.log("  ✓ Coding questions");
console.log("  ✓ GFG coding fields");
console.log("  ✓ Coding test cases");
console.log("  ✓ Hidden test cases");
console.log("  ✓ Judge0 execution");
console.log("  ✓ Coding grading");
console.log("  ✓ Partial marks");
console.log("  ✓ Assessment submission");
console.log("  ✓ Assessment analytics");
console.log("  ✓ Enrollment assessment status");
console.log("  ✓ Submission results");
console.log("  ✓ Admin coding question CRUD");
console.log("  ✓ Admin coding test-case CRUD");
console.log("");
console.log("Removed:");
console.log("  ✓ Corrupted duplicate createAssessment block");
console.log("  ✓ Invalid data:updateData inside findMany()");
console.log("");
console.log("Now run:");
console.log("node --check .\\repositories\\assessmentRepository.js");
console.log("npm run dev");
console.log("");