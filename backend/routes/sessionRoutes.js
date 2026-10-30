const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../middleware/lmsLegacyAccess");
const { internalCallbackAuth } = require("../middleware/internalCallbackAuth");
const adminOnly = [authenticateToken, authorizeRoles("Admin")];

// Import the session controller you worked on earlier
const sessionController = require("../controllers/sessionController");

// Import your newly created validation middleware
const { validateSessionInput } = require("../validations/sessionValidation");

/**
 * @swagger
 * /api/v1/sessions:
 *   post:
 *     summary: Create a New Live Session
 *     tags: [Sessions]
 *     responses:
 *       201:
 *         description: Session created successfully
 */
// Added validateSessionInput here to protect session creation requests
router.post("/sessions", ...adminOnly, validateSessionInput, sessionController.createSession);

router.get("/sessions", sessionController.getSessions);
router.post("/sessions/:id/start", ...adminOnly, sessionController.startSession); 
router.get("/sessions/:id/join-token", sessionController.getJoinToken);
/**
 * @swagger
 * /api/v1/sessions/callback/recording:
 *   post:
 *     summary: Jitsi/Zoom Recording Save Webhook Callback
 *     tags: [Sessions]
 */
// Connects to your controller endpoint handling recording completion events
router.post("/sessions/callback/recording", internalCallbackAuth("recording"), sessionController.saveRecordingCallback);

// Connects to your controller endpoint handling live session broadcasting events
router.post("/sessions/broadcast", sessionController.broadcastSessionEvent);

module.exports = router;