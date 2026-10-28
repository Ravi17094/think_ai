/**
 * Receipt rendering service.
 *
 * Renders the client checkout receipt from the Handlebars template at
 * src/templates/email/receipt.hbs using a tiny, dependency-free template
 * engine ({ {variable} }, { {#if} }, { {#unless} }, { {#each} } — no
 * external Handlebars dependency needed in this module).
 */

const path = require("path");
const fs = require("fs");
const { communityConfig } = require("../../../config/forum.config");

const RECEIPT_TEMPLATE_PATH = path.join(__dirname, "..", "..", "templates", "email", "receipt.hbs");

function readTemplate() {
    return fs.readFileSync(RECEIPT_TEMPLATE_PATH, "utf8");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function resolveKey(context, key) {
    return key in context ? context[key] : "";
}

/** Evaluates a tiny Handlebars-like subset: if/unless/each + variable substitution. */
function renderTemplate(template, context) {
    const output = template.replace(/{{#each ([a-zA-Z0-9_.]+)}}([\s\S]*?){{\/each}}/g, (match, listKey, block) => {
        const items = context[listKey];
        if (!Array.isArray(items) || items.length === 0) return "";
        return items
            .map((item) => renderTemplate(block, { ...context, item }))
            .join("");
    });

    return output
        .replace(/{{#if ([a-zA-Z0-9_.]+)}}([\s\S]*?){{else}}([\s\S]*?){{\/if}}/g, (match, key, whenTrue, whenFalse) => {
            return context[key] ? whenTrue : whenFalse;
        })
        .replace(/{{#if ([a-zA-Z0-9_.]+)}}([\s\S]*?){{\/if}}/g, (match, key, block) => {
            return context[key] ? block : "";
        })
        .replace(/{{#unless ([a-zA-Z0-9_.]+)}}([\s\S]*?){{\/unless}}/g, (match, key, block) => {
            return context[key] ? "" : block;
        })
        .replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, key) => escapeHtml(resolveKey(context, key)));
}

/**
 * Builds the render context for a receipt and renders the HTML email body.
 */
function buildReceiptContext(receipt) {
    return {
        orderId: receipt.orderId || "",
        enrollmentId: receipt.enrollmentId || "",
        courseTitle: receipt.courseTitle || "Course enrollment",
        costCenter: receipt.costCenter || "",
        discountCode: receipt.discountCode || "",
        discountValue: receipt.discountValue ? Number(receipt.discountValue).toFixed(2) : "",
        amount: Number(receipt.amount || 0).toFixed(2),
        currency: receipt.currency || "₹",
        paidAt: new Date(receipt.paidAt || Date.now()).toLocaleString(),
        supportEmail: communityConfig.supportEmail,
        refundPolicy: "All course purchases are eligible for a full refund within 14 days of purchase if the course has not been completed. Completed courses and requests made after 14 days are not eligible."
    };
}

function renderReceipt(receipt) {
    const context = buildReceiptContext(receipt);
    const html = renderTemplate(readTemplate(), context);
    return {
        html,
        templatePath: RECEIPT_TEMPLATE_PATH,
        supportEmail: communityConfig.supportEmail,
        context
    };
}

const receiptService = { renderReceipt, buildReceiptContext, renderTemplate };

module.exports = receiptService;