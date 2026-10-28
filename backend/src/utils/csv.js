/**
 * Minimal CSV parsing helpers (no external dependencies).
 *
 * Supports quoted fields, embedded commas/newlines in quotes, CRLF + LF.
 * Used by the forum moderators CSV and the client discount codes CSV.
 */

const fs = require("fs");

function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i += 1;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === ",") {
            row.push(field.trim());
            field = "";
        } else if (char === "\n" || char === "\r") {
            if (char === "\r" && text[i + 1] === "\n") i += 1;
            row.push(field.trim());
            field = "";
            if (row.some((cell) => cell !== "")) rows.push(row);
            row = [];
        } else {
            field += char;
        }
    }
    if (field !== "" || row.length > 0) {
        row.push(field.trim());
        rows.push(row);
    }
    return rows;
}

/** Parses a CSV file into an array of objects keyed by the header row. */
function readCsv(filePath) {
    const rows = parseCsv(fs.readFileSync(filePath, "utf8"));
    if (rows.length === 0) return [];
    const headers = rows[0];
    return rows.slice(1).map((cells) => {
        const record = {};
        headers.forEach((header, index) => {
            record[header.trim()] = (cells[index] || "").trim();
        });
        return record;
    });
}

module.exports = { parseCsv, readCsv };