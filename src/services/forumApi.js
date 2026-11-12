/**
 * Community API adapter. The browser no longer maintains its own forum
 * database: all content and mutations go through the backend API.
 */
const API_BASE = (import.meta.env.VITE_COMMUNITY_API_URL || '/api').replace(/\/$/, '');
const votes = new Map();

function authHeaders() {
  const token = typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem('thinkz_access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Accept: 'application/json', ...authHeaders(), ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.message || `Community request failed (${response.status})`);
  return payload.data;
}

function normalizeUser(user) {
  if (!user) return null;
  const name = user.displayName || user.name || user.username || 'Unknown user';
  return { ...user, displayName: name, avatar: user.avatar || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`, reputation: Number(user.reputation || 0), postCount: Number(user.postCount || 0), joinedAt: user.joinedAt || new Date().toISOString() };
}

function normalizePost(post) {
  const userVote = post.userVote && post.userVote !== 'none' ? post.userVote : null;
  if (userVote) votes.set(post.id, userVote); else votes.delete(post.id);
  return { ...post, content: post.content || post.body || '', replies: Number(post.replies ?? post.replyCount ?? 0), isSolved: Boolean(post.isSolved ?? post.solved), isPinned: Boolean(post.isPinned), userVote };
}

function normalizeComment(comment) {
  return { ...comment, postId: comment.postId || comment.discussionId, content: comment.content || comment.body || '' };
}

async function getUsers() {
  return (await request('/users/search')).map(normalizeUser);
}

export function getUserVote(postId) { return votes.get(postId) || null; }
export function getAllUserVotes() { return Object.fromEntries(votes); }

export const ForumApi = {
  async getPosts() {
    const page = await request('/discussions?limit=100');
    return (page.items || []).map(normalizePost);
  },
  async getPostById(postId) { return normalizePost(await request(`/discussions/${encodeURIComponent(postId)}`)); },
  async getPostsByAuthor(authorId) {
    const page = await request(`/discussions?limit=100&author=${encodeURIComponent(authorId)}`);
    return (page.items || []).map(normalizePost);
  },
  getUsers,
  async getUserById(userId) { return (await getUsers()).find((user) => user.id === userId) || null; },
  async getUserByUsername(username) {
    const needle = String(username).toLowerCase();
    return (await getUsers()).find((user) => user.username.toLowerCase() === needle) || null;
  },
  async getTags() {
    return (await request('/tags')).map((tag) => typeof tag === 'string' ? tag : tag.name).filter(Boolean);
  },
  async getComments(postId) { return (await request(`/comments/${encodeURIComponent(postId)}`)).map(normalizeComment); },
  async addComment(postId, { content }) {
    return normalizeComment(await request(`/comments/${encodeURIComponent(postId)}`, { method: 'POST', body: JSON.stringify({ body: content }) }));
  },
  async votePost(postId, direction) {
    const data = await request(`/discussions/${encodeURIComponent(postId)}/vote`, { method: 'POST', body: JSON.stringify({ direction }) });
    const existing = await this.getPostById(postId);
    const userVote = data.userVote && data.userVote !== 'none' ? data.userVote : null;
    if (userVote) votes.set(postId, userVote); else votes.delete(postId);
    return { ...existing, ...data, userVote };
  },
  async toggleSolved(postId) {
    const current = await this.getPostById(postId);
    return normalizePost(await request(`/discussions/${encodeURIComponent(postId)}/solved`, { method: 'PATCH', body: JSON.stringify({ solved: !current.isSolved }) }));
  },
  async addPost({ title, content, tags }) {
    return normalizePost(await request('/discussions', { method: 'POST', body: JSON.stringify({ title, body: content, tags }) }));
  },
  async searchPosts({ keyword = '', tag = '', author = '' } = {}) {
    const params = new URLSearchParams({ limit: '100' });
    if (keyword.trim()) params.set('search', keyword.trim());
    if (tag.trim()) params.set('tag', tag.trim());
    if (author.trim()) params.set('author', author.trim());
    const page = await request(`/discussions?${params.toString()}`);
    return (page.items || []).map(normalizePost);
  },
};

export const getForumPosts = (options = {}) => ForumApi.getPosts(options);
export function resetForumState() { votes.clear(); }
