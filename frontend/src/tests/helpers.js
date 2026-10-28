/** Shared factories + mock service helpers for forum tests. */
export const discussionFixture = (overrides = {}) => ({
  id: "d1",
  title: "Welcome to the Thinkz AI Community — start here!",
  body: "Introduce yourself and tell us what you are learning today.",
  tags: ["community", "welcome"],
  categoryId: "c-announcements",
  createdAt: "2026-08-01T12:00:00.000Z",
  updatedAt: "2026-08-01T12:00:00.000Z",
  solved: true,
  hidden: false,
  flagged: false,
  views: 4021,
  upvotes: 132,
  downvotes: 2,
  score: 130,
  replyCount: 2,
  userVote: "none",
  author: { id: "u8", name: "Admin One", username: "admin" },
  ...overrides,
});

export const commentFixture = (overrides = {}) => ({
  id: "cm1",
  discussionId: "d1",
  parentId: null,
  body: "Hi everyone! @priya here — excited to learn.",
  authorId: "u1",
  createdAt: "2026-08-02T09:30:00.000Z",
  hidden: false,
  author: { id: "u1", name: "Aarav Sharma", username: "aarav" },
  ...overrides,
});

export const categoryFixture = (overrides = {}) => ({
  id: "c-general",
  name: "General",
  color: "#6366f1",
  description: "Community-wide discussions",
  ...overrides,
});

export const sessionFixture = () => ({
  id: "s1",
  title: "React Hooks Deep Dive — Live Class",
  hostId: "u3",
  status: "live",
  startedAt: "2026-08-24T11:00:00.000Z",
  attendees: [
    { userId: "u3", name: "Rahul Verma", online: true, muted: false, cameraOn: true, raisedHand: false },
    { userId: "u1", name: "Aarav Sharma", online: true, muted: true, cameraOn: false, raisedHand: true },
    { userId: "u4", name: "Sneha Iyer", online: false, muted: true, cameraOn: false, raisedHand: false },
  ],
  polls: [
    {
      id: "poll1",
      question: "Which hook should we refactor first?",
      options: [
        { id: "opt1", text: "useState", votes: 7, percent: 33 },
        { id: "opt2", text: "useEffect", votes: 14, percent: 67 },
      ],
      totalVotes: 21,
      status: "open",
    },
  ],
  messages: [
    {
      id: "msg1",
      userId: "u3",
      userName: "Rahul Verma",
      text: "Welcome everyone!",
      timestamp: "2026-08-24T11:00:00.000Z",
    },
  ],
});

export const flaggedItemFixture = (overrides = {}) => ({
  id: "d5",
  type: "discussion",
  title: "Spam: BUY CHEAP COURSE ACCESS NOW!!!",
  excerpt: "Limited offer, click this very suspicious link!!!",
  reason: "Spam / advertising",
  flaggedAt: "2026-08-24T04:00:00.000Z",
  hidden: false,
  authorName: "Dev Patel",
  authorId: "u7",
  ...overrides,
});

export const moderationUserFixture = (overrides = {}) => ({
  id: "u7",
  name: "Dev Patel",
  username: "devpatel",
  role: "Learner",
  banned: false,
  avatarColor: "#ef4444",
  ...overrides,
});

export const notificationFixture = (overrides = {}) => ({
  id: "n1",
  userId: "u1",
  type: "mention",
  message: "@priya mentioned you",
  link: "/forum/d1",
  read: false,
  createdAt: "2026-08-24T10:00:00.000Z",
  ...overrides,
});
