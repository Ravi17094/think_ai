const Tag = require("../models/Tag");

function list(_req, res) {
    res.status(200).json({ success: true, data: Tag.list() });
}

module.exports = { list };