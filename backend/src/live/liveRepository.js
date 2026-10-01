const prisma = require("../../config/database");

/**
 * Prisma-backed repository for the Live Class Studio (self-contained Forum
 * module). Persists to PostgreSQL while preserving the API contract that the
 * existing Live Class UI consumes.
 */

function findSessionWithRelations(sessionId) {
    return prisma.liveSession.findUnique({
        where: { id: sessionId },
        include: {
            attendees: { orderBy: { id: "asc" } },
            messages: { orderBy: { id: "asc" } },
            polls: {
                orderBy: { id: "asc" },
                include: {
                    options: { orderBy: { id: "asc" } },
                    votes: true
                }
            },
            breakouts: {
                orderBy: { id: "asc" },
                include: { members: { orderBy: { id: "asc" } } }
            }
        }
    });
}

function getSession(sessionId) {
    return findSessionWithRelations(sessionId);
}

function upsertSession(data) {
    return prisma.liveSession.upsert({
        where: { id: data.id },
        update: {},
        create: {
            id: data.id,
            title: data.title,
            hostId: data.hostId,
            status: data.status || "live"
        }
    });
}

/** Update the lifecycle state while keeping the full session API response. */
async function updateSessionStatus(sessionId, status, scheduledAt) {
    await prisma.liveSession.update({
        where: { id: sessionId },
        data: {
            status,
            ...(status === "live" ? { startedAt: new Date() } : {}),
            ...(scheduledAt !== undefined ? { scheduledAt } : {})
        }
    });
    return findSessionWithRelations(sessionId);
}

function getAttendee(sessionId, userId) {
    return prisma.liveAttendee.findUnique({
        where: { sessionId_userId: { sessionId, userId } }
    });
}

function upsertAttendee(sessionId, attendee) {
    return prisma.liveAttendee.upsert({
        where: { sessionId_userId: { sessionId, userId: attendee.userId } },
        update: {
            userName: attendee.userName,
            online: attendee.online ?? true,
            muted: attendee.muted ?? true,
            cameraOn: attendee.cameraOn ?? false,
            raisedHand: attendee.raisedHand ?? false
        },
        create: {
            sessionId,
            userId: attendee.userId,
            userName: attendee.userName,
            online: attendee.online ?? true,
            muted: attendee.muted ?? true,
            cameraOn: attendee.cameraOn ?? false,
            raisedHand: attendee.raisedHand ?? false
        }
    });
}

function updateAttendeePresence(sessionId, userId, patch) {
    return prisma.liveAttendee.update({
        where: { sessionId_userId: { sessionId, userId } },
        data: {
            online: patch.online,
            muted: patch.muted,
            cameraOn: patch.cameraOn,
            raisedHand: patch.raisedHand
        }
    });
}

function markAttendeeOffline(sessionId, userId) {
    return prisma.liveAttendee.updateMany({
        where: { sessionId, userId },
        data: { online: false }
    });
}

function createMessage(sessionId, message) {
    return prisma.liveMessage.create({
        data: {
            sessionId,
            userId: message.userId,
            userName: message.userName,
            text: message.text
        }
    });
}

function listMessages(sessionId) {
    return prisma.liveMessage.findMany({
        where: { sessionId, deleted: false },
        orderBy: { id: "asc" }
    });
}

function softDeleteMessage(sessionId, messageId) {
    return prisma.liveMessage.updateMany({
        where: { sessionId, id: messageId },
        data: { deleted: true }
    });
}

function createPoll(sessionId, pollData) {
    return prisma.livePoll.create({
        data: {
            sessionId,
            question: pollData.question,
            status: "open",
            options: {
                create: pollData.options.map((text) => ({ text, votes: 0 }))
            }
        },
        include: {
            options: true,
            votes: true
        }
    });
}

function getPoll(pollId) {
    return prisma.livePoll.findUnique({
        where: { id: pollId },
        include: { options: true, votes: true }
    });
}

/**
 * Cast a vote for a user on a poll. The DB unique constraint
 * (pollId, userId) guarantees one vote per user per poll. Switching the
 * chosen option moves the vote to the new option.
 */
async function castVote(pollId, userId, optionId) {
    return prisma.$transaction(async (tx) => {
        const poll = await tx.livePoll.findUnique({
            where: { id: pollId },
            include: { options: true, votes: true }
        });
        if (!poll || poll.status !== "open") return null;
        if (!poll.options.some((option) => option.id === optionId)) {
            const error = new Error("Poll option not found");
            error.code = "OPTION_NOT_FOUND";
            throw error;
        }

        const existing = await tx.livePollVote.findUnique({
            where: { pollId_userId: { pollId, userId } }
        });

        if (!existing) {
            await tx.livePollOption.update({
                where: { id: optionId },
                data: { votes: { increment: 1 } }
            });
            await tx.livePollVote.create({
                data: { pollId, userId, optionId }
            });
        } else if (existing.optionId !== optionId) {
            await tx.livePollOption.update({
                where: { id: existing.optionId },
                data: { votes: { decrement: 1 } }
            });
            await tx.livePollOption.update({
                where: { id: optionId },
                data: { votes: { increment: 1 } }
            });
            await tx.livePollVote.update({
                where: { id: existing.id },
                data: { optionId }
            });
        }

        return tx.livePoll.findUnique({
            where: { id: pollId },
            include: { options: true, votes: true }
        });
    });
}

function createBreakoutRoom(sessionId, name) {
    return prisma.breakoutRoom.create({
        data: { sessionId, name, status: "active" },
        include: { members: true }
    });
}

function listBreakoutRooms(sessionId) {
    return prisma.breakoutRoom.findMany({
        where: { sessionId },
        orderBy: { id: "asc" },
        include: { members: { orderBy: { id: "asc" } } }
    });
}

function getBreakoutRoom(roomId) {
    return prisma.breakoutRoom.findUnique({
        where: { id: roomId },
        include: { members: true }
    });
}

function joinBreakoutRoom(roomId, member) {
    return prisma.breakoutRoomMember.upsert({
        where: { roomId_userId: { roomId, userId: member.userId } },
        update: { userName: member.userName },
        create: {
            roomId,
            userId: member.userId,
            userName: member.userName
        }
    });
}

function leaveBreakoutRoom(roomId, userId) {
    return prisma.breakoutRoomMember.deleteMany({
        where: { roomId, userId }
    });
}

module.exports = {
    getSession,
    upsertSession,
    updateSessionStatus,
    getAttendee,
    upsertAttendee,
    updateAttendeePresence,
    markAttendeeOffline,
    createMessage,
    listMessages,
    softDeleteMessage,
    createPoll,
    getPoll,
    castVote,
    createBreakoutRoom,
    listBreakoutRooms,
    getBreakoutRoom,
    joinBreakoutRoom,
    leaveBreakoutRoom
};
