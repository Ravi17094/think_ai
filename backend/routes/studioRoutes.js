const express = require("express");
const router = express.Router();
const { 
    getSession, 
    joinSession, 
    createPoll, 
    votePoll 
} = require("../controllers/studioController");
const authenticateToken = require("../middleware/authenticateToken");
const requireRole = require("../middleware/requireRole");

// All authenticated users can view or join a session
router.get("/sessions/:id", authenticateToken, getSession);
router.post("/sessions/:id/join", authenticateToken, joinSession);

// Only Admins or Instructors can create polls
router.post("/sessions/:id/polls", authenticateToken, requireRole(["Admin", "Instructor"]), createPoll);

// All participants can vote on active polls
router.post("/polls/:pollId/vote", authenticateToken, votePoll);

module.exports = router;