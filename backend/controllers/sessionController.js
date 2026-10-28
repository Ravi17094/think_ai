const NodeCache = require("node-cache");
const sessionCache = new NodeCache({ stdTTL: 300});

// Local mock data store (No database)
let sessions = [];
let attendance = [];

/**
 * 1. Create a New Live Session (With Jitsi Integration & WebSockets)
 * POST /api/v1/sessions
 */
const createSession = async (req, res) => {
    try {
        const { title, startTime, endTime, platform } = req.body;

        // Validate required fields
        if (!title || !startTime || !platform) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // PM Requirement: Mock Jitsi Room Creation
        const cleanTitle = title.replace(/\s+/g, '-').toLowerCase();
        const generatedMeetingLink = `https://jit.si{cleanTitle}-${Date.now()}`;

        const newSession = {
            id: Date.now().toString(), // Generate a unique ID string
            title,
        
            startTime: new Date(startTime), // FIXED: added space to 'new Date'
            endTime: endTime ? new Date(endTime) : null,
            status: "SCHEDULED", 
            meetingLink: generatedMeetingLink, // Added dynamic Jitsi room link
            recordingUrl: null,
            createdAt: new Date()
        };

        sessions.push(newSession);

        // PM Requirement: Broadcast to all connected clients via WebSockets
        const io = req.app.get('io');
        if (io) {
            io.emit('session_created', newSession);
        }

        return res.status(201).json(newSession);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

/**
 * 2. Handle Recording Save Callback (Webhook)
 * POST /api/v1/sessions/callback/recording
 */
const handleRecordingCallback = async (req, res) => {
    try {
        const { sessionId, recordingUrl } = req.body;

        if (!sessionId || !recordingUrl) {
            return res.status(400).json({ error: "Missing sessionId or recordingUrl" });
        }

        // Find session in mock array and update it
        const sessionIndex = sessions.findIndex(s => s.id === sessionId);
        if (sessionIndex === -1) {
            return res.status(404).json({ error: "Session not found" });
        }

        sessions[sessionIndex].recordingUrl = recordingUrl;
        sessions[sessionIndex].status = "COMPLETED";

        // PM Requirement: Broadcast recording ready event
        const io = req.app.get('io');
        if (io) {
            io.emit('recording_ready', sessions[sessionIndex]);
        }

        return res.status(200).json({ message: "Recording callback processed successfully", session: sessions[sessionIndex] });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};


/**
 * 3. Update Session Status or Details
 * PUT /api/v1/sessions/:id
 */
const updateSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, startTime, endTime, status, meetingLink, recordingUrl } = req.body;

        const sessionIndex = sessions.findIndex(s => s.id === id);
        if (sessionIndex === -1) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Update individual values dynamically
        if (title) sessions[sessionIndex].title = title;
        if (startTime) sessions[sessionIndex].startTime = new Date(startTime);
        if (endTime) sessions[sessionIndex].endTime = new Date(endTime);
        if (status) sessions[sessionIndex].status = status;
        if (meetingLink) sessions[sessionIndex].meetingLink = meetingLink;
        if (recordingUrl) sessions[sessionIndex].recordingUrl = recordingUrl;

         res.status(200).json(sessions[sessionIndex]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update session' });
    }
};

/**
 * 4. Cancel / Delete a Session
 * DELETE /api/v1/sessions/:id
 */
const deleteSession = async (req, res) => {
    try {
        const { id } = req.params;
        const sessionIndex = sessions.findIndex(s => s.id === id);

        if (sessionIndex === -1) {
            return res.status(404).json({ error: "Session not found" });
        }

        sessions[sessionIndex].recordingUrl = recordingUrl;
        return res.status(200).json({
            success: true,
            message: "Recording save callback processed successfully",
            data: sessions[sessionIndex]
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
// 3. Get Session By ID Handler
const getSessionById = async (req, res) => {
    try {
        const { id } = req.params;
        const session = sessions.find(s => s.id === id);
        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }
        return res.status(200).json(session);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
// 5. Save Recording Callback Webhook
const saveRecordingCallback = async (req, res) => {
    try {
        const { sessionId, recordingUrl } = req.body;
        if (!sessionId || !recordingUrl) {
            return res.status(400).json({ error: "Missing sessionId or recordingUrl" });
        }
        const sessionIndex = sessions.findIndex(s => s.id === sessionId);
        if (sessionIndex === -1) {
            return res.status(404).json({ error: "Session not found" });
        }
        sessions[sessionIndex].recordingUrl = recordingUrl;
        return res.status(200).json({
            success: true,
            message: "Recording save callback processed successfully",
            data: sessions[sessionIndex]
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
// ==========================================
// FETCH ALL SESSIONS (With Cache Layer)
// ==========================================
const getSessions = async (req, res) => {
    try {
        const cacheKey = "live_sessions_list";

        // 1. Check if data is already inside the memory cache store
        const cachedData = sessionCache.get(cacheKey);
        if (cachedData) {
            // Immediate cache hit: Returns instantly in < 5ms!
            return res.status(200).json({
                success: true,
                fromCache: true,
                data: cachedData
            });
        }

        // 2. If cache is empty, pull data from your storage array
        const currentSessions = sessions;

        // 3. Save the results into memory for future request cycles
        sessionCache.set(cacheKey, currentSessions);

        return res.status(200).json({
            success: true,
            fromCache: false,
            data: currentSessions
        });
    } catch (error) {
        console.error("Fetch sessions optimization error:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server optimization failure occurred."
        });
    }
};
// ==========================================
// START LIVE SESSION (Generates Unique Jitsi Room)
// ==========================================
const startSession = async (req, res) => {
    const { id } = req.params;
    
    try {
        const uniqueRoomName = `thinkz-room-${id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const sessionIndex = sessions.findIndex(s => s.id === parseInt(id) || s.id === id);
        
        if (sessionIndex !== -1) {
            sessions[sessionIndex].roomName = uniqueRoomName;
            sessions[sessionIndex].status = "ACTIVE";
        } else {
            sessions.push({ id: id, roomName: uniqueRoomName, status: "ACTIVE" });
        }

        if (typeof sessionCache !== 'undefined') {
            sessionCache.del("live_sessions_list");
        }

        return res.status(200).json({
            success: true,
            message: "Live classroom session initialized successfully.",
            roomName: uniqueRoomName,
            status: "ACTIVE"
        });

    } catch (error) {
        console.error("Critical error inside session initialization block:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to allocate target live classroom system assets."
        });
    }
};
// ==========================================
// GET LIVE SESSION AUTHORIZATION JOIN TOKEN
// ==========================================
const getJoinToken = async (req, res) => {
    const { id } = req.params;
    
    try {
        // Find the active session room inside your mock database storage array
        const session = sessions.find(s => s.id === parseInt(id) || s.id === id);
        
        if (!session || session.status !== "ACTIVE") {
            return res.status(404).json({
                success: false,
                error: "No active live session found matching this identification signature."
            });
        }

        // Generate a time-limited token payload block for room verification (1 hour expiry)
        // Uses a fallback token generation pattern matching your auth token controller setup
        const jitsiToken = jwt.sign(
            {
                context: {
                    user: {
                        name: req.user?.name || "Janadeep Validator",
                        email: req.user?.email || "janadeep@thinkzai.com",
                        id: req.user?.id || 101,
                        role: req.user?.role || "Learner"
                    }
                },
                aud: "jitsi",
                iss: "think_ai",
                room: session.roomName
            },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '1h' }
        );

        return res.status(200).json({
            success: true,
            token: jitsiToken,
            roomName: session.roomName
        });

    } catch (error) {
        console.error("Critical error generating authorization access signature:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to compile room authentication security token."
        });
    }
};
// Export all the middleware handlers globally
module.exports = {
    createSession,
    startSession,
    getJoinToken,
    getSessions, 
    getSessionById,
    updateSession,
    deleteSession,
    saveRecordingCallback
};