const express = require("express");

const router = express.Router();

const commentController = require("../controllers/commentController");

router.get("/:discussionId", commentController.listByDiscussion);
router.post("/:id/flag", commentController.flag);
router.post("/", commentController.create);
router.post("/:discussionId", commentController.create);

module.exports = router;
