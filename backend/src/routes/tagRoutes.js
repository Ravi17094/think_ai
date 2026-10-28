const express = require("express");

const router = express.Router();

const tagController = require("../controllers/tagController");

router.get("/", tagController.list);

module.exports = router;