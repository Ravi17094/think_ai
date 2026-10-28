exports.createSession = async (req, res, next) => {
  try {
    const { title, startTime, endTime, instructorId } = req.body;

    // Auto-generate a secure Jitsi meet video room link
    const roomSlug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
    const meetingUrl = `https://jit.si{roomSlug}`;

    // Return the response object structure cleanly
    res.status(201).json({
      success: true,
      message: "Live Session created successfully",
      data: {
        id: `sess_${Math.random().toString(36).slice(2, 13)}`,
        title,
        startTime,
        endTime,
        meetingUrl,
        instructorId,
        status: "SCHEDULED"
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.logAttendance = async (req, res, next) => {
  try {
    const { sessionId, userId } = req.body;

    res.status(201).json({
      success: true,
      message: "Attendance recorded",
      data: {
        id: `att_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        userId,
        joinedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};