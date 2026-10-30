import mockData from '../data/forumData.json';

const STORAGE_KEY = 'thinkz_forum_state';
const VOTES_KEY = 'thinkz_forum_votes';

const delay = (ms = 350) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const clone = (value) => JSON.parse(JSON.stringify(value));

let db = null;

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePersistedState(data) {
  try {
    const snapshot = {
      posts: data.posts.map((p) => ({
        id: p.id,
        upvotes: p.upvotes,
        downvotes: p.downvotes,
        isSolved: p.isSolved,
        views: p.views,
        replies: p.replies,
      })),
      nextPostId: data.posts.length,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // localStorage unavailable or full — silently skip
  }
}

function loadUserVotes() {
  try {
    const raw = localStorage.getItem(VOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveUserVotes(votes) {
  try {
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
  } catch {
    // ignore
  }
}

export function getUserVote(postId) {
  const votes = loadUserVotes();
  return votes[postId] || null;
}

export function getAllUserVotes() {
  return loadUserVotes();
}

function loadDb() {
  if (!db) {
    db = clone(mockData);
    const saved = loadPersistedState();
    if (saved && Array.isArray(saved.posts)) {
      saved.posts.forEach((patch) => {
        const post = db.posts.find((p) => p.id === patch.id);
        if (post) {
          if (typeof patch.upvotes === 'number') post.upvotes = patch.upvotes;
          if (typeof patch.downvotes === 'number') post.downvotes = patch.downvotes;
          if (typeof patch.isSolved === 'boolean') post.isSolved = patch.isSolved;
          if (typeof patch.views === 'number') post.views = patch.views;
          if (typeof patch.replies === 'number') post.replies = patch.replies;
        }
      });
    }
  }
  return db;
}

function findPost(postId) {
  const { posts } = loadDb();
  const post = posts.find((p) => p.id === postId);
  if (!post) {
    throw new Error(`Post ${postId} not found`);
  }
  return post;
}

export const ForumApi = {
  async getPosts() {
    await delay();
    const { posts } = loadDb();
    return clone(posts).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  },

  async getPostById(postId) {
    await delay(200);
    return clone(findPost(postId));
  },

  async getPostsByAuthor(authorId) {
    await delay(180);
    const { posts } = loadDb();
    return clone(posts.filter((p) => p.authorId === authorId)).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  },

  async getUsers() {
    await delay(200);
    const { users } = loadDb();
    return clone(users);
  },

  async getUserById(userId) {
    await delay(150);
    const { users } = loadDb();
    return clone(users.find((u) => u.id === userId) ?? null);
  },

  async getUserByUsername(username) {
    await delay(150);
    const { users } = loadDb();
    return clone(users.find((u) => u.username === username) ?? null);
  },

  async getTags() {
    await delay(120);
    const { tags } = loadDb();
    return clone(tags);
  },

  async getComments(postId) {
    await delay(150);
    const { comments } = loadDb();
    return clone(comments.filter((c) => c.postId === postId)).sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
  },

  async addComment(postId, { authorId, content }) {
    await delay(150);
    if (!content || !content.trim()) {
      throw new Error('Comment cannot be empty');
    }
    const post = findPost(postId);
    const comment = {
      id: `c${Date.now()}`,
      postId,
      authorId,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      upvotes: 0,
    };
    loadDb().comments.push(comment);
    post.replies += 1;
    savePersistedState(loadDb());
    return clone(comment);
  },

  async votePost(postId, direction) {
    await delay(150);
    const post = findPost(postId);
    const votes = loadUserVotes();
    const prev = votes[postId] || null;

    if (prev === direction) {
      // Same vote — undo
      if (direction === 'up') post.upvotes -= 1;
      else post.downvotes -= 1;
      delete votes[postId];
    } else {
      // Remove previous vote if switching
      if (prev === 'up') post.upvotes -= 1;
      else if (prev === 'down') post.downvotes -= 1;

      // Apply new vote
      if (direction === 'up') post.upvotes += 1;
      else if (direction === 'down') post.downvotes += 1;
      else throw new Error('direction must be "up" or "down"');

      votes[postId] = direction;
    }

    saveUserVotes(votes);
    savePersistedState(loadDb());
    return clone(post);
  },

  async toggleSolved(postId) {
    await delay(120);
    const post = findPost(postId);
    post.isSolved = !post.isSolved;
    savePersistedState(loadDb());
    return clone(post);
  },

  async addPost({ title, content, tags, authorId }) {
    await delay(250);
    if (!title || !title.trim()) {
      throw new Error('Title is required');
    }
    if (!content || !content.trim()) {
      throw new Error('Content is required');
    }
    const normalizedTags = Array.isArray(tags) ? tags.filter(Boolean) : [];
    if (normalizedTags.length === 0) {
      throw new Error('Select at least one tag');
    }
    const post = {
      id: `p${Date.now()}`,
      authorId,
      title: title.trim(),
      content: content.trim(),
      tags: normalizedTags,
      upvotes: 0,
      downvotes: 0,
      views: 0,
      replies: 0,
      isSolved: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
    };
    loadDb().posts.push(post);
    savePersistedState(loadDb());
    return clone(post);
  },

  async searchPosts({ keyword = '', tag = '', author = '' } = {}) {
    await delay(200);
    const { posts, users } = loadDb();
    const kw = keyword.trim().toLowerCase();
    const tg = tag.trim().toLowerCase();
    const au = author.trim().toLowerCase();

    return clone(posts)
      .filter((post) => {
        const matchesKeyword =
          !kw ||
          post.title.toLowerCase().includes(kw) ||
          post.content.toLowerCase().includes(kw) ||
          post.tags.some((t) => t.toLowerCase().includes(kw));

        const matchesTag =
          !tg || post.tags.some((t) => t.toLowerCase() === tg);

        let matchesAuthor = true;
        if (au) {
          const user = users.find((u) => u.id === post.authorId);
          matchesAuthor =
            !!user &&
            (user.username.toLowerCase().includes(au) ||
              user.displayName.toLowerCase().includes(au));
        }

        return matchesKeyword && matchesTag && matchesAuthor;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
};

export const getForumPosts = (options = {}) =>
  ForumApi.getPosts(options);

export function resetForumState() {
  db = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
