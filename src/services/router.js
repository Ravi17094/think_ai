export function parseHashRoute(hash) {
  const path = (hash || '').replace(/^#/, '') || '/';
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { name: 'forum', params: {} };
  }

  const [root, ...rest] = segments;

  if (root === 'post' && rest[0]) {
    return { name: 'post', params: { id: rest[0] } };
  }
  if (root === 'tag' && rest[0]) {
    return { name: 'tag', params: { tag: decodeURIComponent(rest[0]) } };
  }
  if (root === 'user' && rest[0]) {
    return { name: 'user', params: { username: rest[0] } };
  }
  if (root === 'new') {
    return { name: 'new', params: {} };
  }
  if (root === 'assessment') {
    return { name: 'assessment', params: {} };
  }
  if (root === 'bookmarks') {
    return { name: 'bookmarks', params: {} };
  }
  return { name: 'forum', params: {} };
}

export function navigate(path) {
  window.location.hash = path;
}
