const express = require("express");

const router = express.Router();

const liveController = require("../live/liveController");
const liveValidation = require("../live/liveValidation");
const requireStudioJwt = require("../middleware/requireStudioJwt");

// Sessions
router.get("/sessions/:id", liveValidation.validateSessionId, liveController.getSession);
router.post("/sessions/:id/join", liveValidation.validateSessionId, liveController.joinSession);
router.patch("/sessions/:id/status", liveValidation.validateSessionId, liveController.updateSessionStatus);
router.post("/sessions/:id/jitsi-token", requireStudioJwt, liveValidation.validateSessionId, liveController.createJitsiToken);

// Messages
router.get("/sessions/:id/messages", liveValidation.validateSessionId, liveController.getMessages);
router.post(
    "/sessions/:id/messages",
    liveValidation.validateSessionId,
    liveValidation.validateSendMessage,
    liveController.sendMessage
);
router.delete(
    "/sessions/:id/messages/:messageId",
    liveValidation.validateSessionId,
    liveValidation.validateMessageId,
    liveController.deleteMessage
);

// Polls
router.post(
    "/sessions/:id/polls",
    liveValidation.validateSessionId,
    liveValidation.validateCreatePoll,
    liveController.createPoll
);
router.post(
    "/polls/:pollId/vote",
    liveValidation.validateVote,
    liveController.votePoll
);

// Breakout rooms
router.get("/sessions/:id/breakouts", liveValidation.validateSessionId, liveController.getBreakoutRooms);
router.post(
    "/sessions/:id/breakouts",
    liveValidation.validateSessionId,
    liveValidation.validateCreateBreakout,
    liveController.createBreakoutRoom
);
router.post(
    "/breakouts/:roomId/join",
    liveValidation.validateBreakoutRoomId,
    liveController.joinBreakoutRoom
);
router.post(
    "/breakouts/:roomId/leave",
    liveValidation.validateBreakoutRoomId,
    liveController.leaveBreakoutRoom
);
router.delete(
    "/breakouts/:roomId/leave",
    liveValidation.validateBreakoutRoomId,
    liveController.leaveBreakoutRoom
);

module.exports = router;
