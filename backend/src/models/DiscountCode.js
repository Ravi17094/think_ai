/**
 * Discount code model.
 *
 * Client discount codes are loaded from the production table
 * `backend/data/client-discount-codes-prod.csv`:
 *
 *   code,type,value,expiry,maxUses,eligibleDepartments
 *
 *   type               = "percent" | "fixed"
 *   eligibleDepartments = pipe-delimited department names ("HR|Procurement")
 *
 * In-memory table keyed by normalized (uppercase) code; usage counts are
 * tracked at runtime so `maxUses` limits are enforced across checkouts.
 */

const path = require("path");
const { readCsv } = require("../utils/csv");

const DISCOUNT_CODES_CSV_PATH = path.join(__dirname, "..", "..", "data", "client-discount-codes-prod.csv");

function normalizeCode(code) {
    return String(code || "").trim().toUpperCase();
}

function normalizeDepartments(raw) {
    return String(raw || "")
        .split("|")
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);
}

/** Normalizes the CSV type column to the public contract: "percent" | "fixed". */
function normalizeType(raw) {
    const value = String(raw || "percent").trim().toLowerCase();
    if (value.startsWith("percent")) return "percent";
    if (value === "fixed") return "fixed";
    return "percent";
}

/** Builds the in-memory discount table from the client CSV (at load time). */
function buildTable() {
    const rows = readCsv(DISCOUNT_CODES_CSV_PATH);
    const table = new Map();
    rows.forEach((row) => {
        const code = normalizeCode(row.code);
        if (!code) return;
        table.set(code, {
            code,
            type: normalizeType(row.type),
            value: Number(row.value) || 0,
            expiry: row.expiry || null,
            maxUses: row.maxUses !== "" && row.maxUses != null ? Number(row.maxUses) || 0 : 0,
            eligibleDepartments: normalizeDepartments(row.eligibleDepartments),
            usage: 0
        });
    });
    return table;
}

const discountTable = buildTable();

function findByCode(code) {
    const normalized = normalizeCode(code);
    const record = discountTable.get(normalized);
    if (!record) return null;
    return {
        code: record.code,
        type: record.type,
        value: record.value,
        expiry: record.expiry,
        maxUses: record.maxUses,
        eligibleDepartments: [...record.eligibleDepartments],
        usage: record.usage
    };
}

function incrementUsage(code) {
    const record = discountTable.get(normalizeCode(code));
    if (!record) return null;
    record.usage += 1;
    return record.usage;
}

function listAll() {
    return Array.from(discountTable.values()).map((record) => ({
        code: record.code,
        type: record.type,
        value: record.value,
        expiry: record.expiry,
        maxUses: record.maxUses,
        eligibleDepartments: [...record.eligibleDepartments],
        usage: record.usage
    }));
}

function resetForTests() {
    discountTable.forEach((record) => {
        record.usage = 0;
    });
}

module.exports = { findByCode, incrementUsage, listAll, resetForTests, normalizeCode, DISCOUNT_CODES_CSV_PATH };