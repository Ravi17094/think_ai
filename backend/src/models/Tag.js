/**
 * Tag model backed by the client tag taxonomy (data/client-tag-taxonomy-prod.json).
 * Tags are canonical: each has a name + description used by the tag filter UI.
 */

const db = require("../data/mockData");

function list() {
    return db.tags.map((tag) => ({ name: tag.name, description: tag.description }));
}

function findByName(name) {
    const needle = String(name || "").trim().toLowerCase();
    const tag = db.tags.find((t) => t.name === needle);
    return tag ? { ...tag } : null;
}

module.exports = { list, findByName };