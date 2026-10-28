const express = require("express");
const router = express.Router();

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
router.post("/sessions", validateSessionInput, sessionController.createSession);

router.get("/sessions", sessionController.getSessions);
router.post("/sessions/:id/start", sessionController.startSession); 
router.get("/sessions/:id/join-token", sessionController.getJoinToken);
/**
 * @swagger
 * /api/v1/sessions/callback/recording:
 *   post:
 *     summary: Jitsi/Zoom Recording Save Webhook Callback
 *     tags: [Sessions]
 */
// Connects to your controller endpoint handling recording completion events
router.post("/sessions/:id/start", sessionController.startSession);
router.post("/sessions/callback/recording", sessionController.saveRecordingCallback);

module.exports = router;