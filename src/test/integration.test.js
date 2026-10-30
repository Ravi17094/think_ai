import { describe, it, expect, beforeEach } from 'vitest';
import { BookmarkService, resetBookmarks } from '../services/bookmarkService.js';
import { NotificationService, resetNotifications } from '../services/notificationService.js';

beforeEach(() => {
  resetBookmarks();
  resetNotifications();
});

describe('Bookmark + Notification Integration', () => {
  describe('BookmarkService', () => {
    it('starts with no bookmarks', async () => {
      const bookmarks = await BookmarkService.getBookmarks();
      expect(bookmarks).toEqual([]);
    });

    it('adds a bookmark', async () => {
      const result = await BookmarkService.toggleBookmark('p1');
      expect(result.bookmarked).toBe(true);
      expect(result.postId).toBe('p1');
    });

    it('removes a bookmark on second toggle', async () => {
      await BookmarkService.toggleBookmark('p1');
      const result = await BookmarkService.toggleBookmark('p1');
      expect(result.bookmarked).toBe(false);
    });

    it('isBookmarked returns correct state', async () => {
      expect(await BookmarkService.isBookmarked('p1')).toBe(false);
      await BookmarkService.toggleBookmark('p1');
      expect(await BookmarkService.isBookmarked('p1')).toBe(true);
    });

    it('addBookmark is idempotent', async () => {
      await BookmarkService.addBookmark('p1');
      await BookmarkService.addBookmark('p1');
      const bookmarks = await BookmarkService.getBookmarks();
      expect(bookmarks.filter((id) => id === 'p1').length).toBe(1);
    });

    it('removeBookmark works correctly', async () => {
      await BookmarkService.addBookmark('p1');
      await BookmarkService.removeBookmark('p1');
      expect(await BookmarkService.isBookmarked('p1')).toBe(false);
    });

    it('getBookmarkCount returns correct count', async () => {
      expect(await BookmarkService.getBookmarkCount()).toBe(0);
      await BookmarkService.addBookmark('p1');
      await BookmarkService.addBookmark('p2');
      expect(await BookmarkService.getBookmarkCount()).toBe(2);
    });

    it('persists across service calls', async () => {
      await BookmarkService.toggleBookmark('p1');
      await BookmarkService.toggleBookmark('p2');
      const bookmarks = await BookmarkService.getBookmarks();
      expect(bookmarks).toContain('p1');
      expect(bookmarks).toContain('p2');
    });
  });

  describe('NotificationService', () => {
    it('starts with no notifications', async () => {
      const notifs = await NotificationService.getNotifications();
      expect(notifs).toEqual([]);
    });

    it('pushNotification creates a notification', () => {
      const notif = NotificationService.pushNotification({
        type: 'bookmark',
        title: 'Test',
        message: 'Test message',
        postId: 'p1',
      });
      expect(notif).toHaveProperty('id');
      expect(notif.type).toBe('bookmark');
      expect(notif.title).toBe('Test');
      expect(notif.read).toBe(false);
    });

    it('getUnreadCount returns correct count', async () => {
      NotificationService.pushNotification({
        type: 'bookmark',
        title: 'Test 1',
        message: 'msg',
      });
      NotificationService.pushNotification({
        type: 'assessment',
        title: 'Test 2',
        message: 'msg',
      });
      expect(await NotificationService.getUnreadCount()).toBe(2);
    });

    it('markAsRead updates notification', async () => {
      const notif = NotificationService.pushNotification({
        type: 'bookmark',
        title: 'Test',
        message: 'msg',
      });
      await NotificationService.markAsRead(notif.id);
      const notifs = await NotificationService.getNotifications();
      expect(notifs.find((n) => n.id === notif.id).read).toBe(true);
    });

    it('markAllAsRead marks all as read', async () => {
      NotificationService.pushNotification({
        type: 'bookmark',
        title: 'T1',
        message: 'msg',
      });
      NotificationService.pushNotification({
        type: 'assessment',
        title: 'T2',
        message: 'msg',
      });
      await NotificationService.markAllAsRead();
      expect(await NotificationService.getUnreadCount()).toBe(0);
    });

    it('clearAll removes all notifications', async () => {
      NotificationService.pushNotification({
        type: 'bookmark',
        title: 'T',
        message: 'msg',
      });
      await NotificationService.clearAll();
      const notifs = await NotificationService.getNotifications();
      expect(notifs).toEqual([]);
    });

    it('subscribe receives notifications', async () => {
      let receivedNotifications = null;
      const unsub = NotificationService.subscribe((notifs) => {
        if (notifs) receivedNotifications = notifs;
      });
      NotificationService.pushNotification({
        type: 'bookmark',
        title: 'Test',
        message: 'msg',
      });
      expect(receivedNotifications).not.toBeNull();
      expect(receivedNotifications.length).toBe(1);
      unsub();
    });

    it('subscribe receives WebSocket events', async () => {
      let receivedEvent = null;
      const unsub = NotificationService.subscribe((notifs, event) => {
        if (event && !receivedEvent) receivedEvent = event;
      });
      NotificationService.connect();
      await new Promise((r) => setTimeout(r, 400));
      expect(receivedEvent).not.toBeNull();
      expect(['statechange', 'open']).toContain(receivedEvent.type);
      unsub();
      NotificationService.disconnect();
    });
  });

  describe('Bookmark -> Notification flow', () => {
    it('bookmark toggle triggers notification', async () => {
      const before = await NotificationService.getNotifications();
      expect(before.length).toBe(0);

      const result = await BookmarkService.toggleBookmark('p1');
      if (result.bookmarked) {
        NotificationService.pushNotification({
          type: 'bookmark',
          title: 'Post bookmarked',
          message: 'Post was added to bookmarks.',
          postId: 'p1',
        });
      }

      const after = await NotificationService.getNotifications();
      expect(after.length).toBe(1);
      expect(after[0].type).toBe('bookmark');
      expect(after[0].postId).toBe('p1');
    });

    it('unbookmark triggers removal notification', async () => {
      await BookmarkService.toggleBookmark('p1');
      NotificationService.pushNotification({
        type: 'bookmark',
        title: 'Bookmarked',
        message: 'Added.',
        postId: 'p1',
      });

      await BookmarkService.toggleBookmark('p1');
      NotificationService.pushNotification({
        type: 'bookmark',
        title: 'Bookmark removed',
        message: 'Removed.',
        postId: 'p1',
      });

      const notifs = await NotificationService.getNotifications();
      expect(notifs.length).toBe(2);
      expect(notifs[0].title).toBe('Bookmark removed');
      expect(notifs[1].title).toBe('Bookmarked');
    });
  });

  describe('Integration: full bookmark workflow', () => {
    it('complete bookmark -> notify -> unbookmark -> notify flow', async () => {
      // Step 1: Initially no bookmarks
      expect(await BookmarkService.getBookmarkCount()).toBe(0);
      expect(await NotificationService.getUnreadCount()).toBe(0);

      // Step 2: Bookmark a post
      const addResult = await BookmarkService.toggleBookmark('p1');
      expect(addResult.bookmarked).toBe(true);
      expect(await BookmarkService.isBookmarked('p1')).toBe(true);

      // Step 3: Push bookmark notification
      NotificationService.pushNotification({
        type: 'bookmark',
        title: 'Post bookmarked',
        message: '"Post title" was added to your bookmarks.',
        postId: 'p1',
      });
      expect(await NotificationService.getUnreadCount()).toBe(1);

      // Step 4: Unbookmark
      const removeResult = await BookmarkService.toggleBookmark('p1');
      expect(removeResult.bookmarked).toBe(false);
      expect(await BookmarkService.isBookmarked('p1')).toBe(false);

      // Step 5: Push removal notification
      NotificationService.pushNotification({
        type: 'bookmark',
        title: 'Bookmark removed',
        message: '"Post title" was removed from your bookmarks.',
        postId: 'p1',
      });
      expect(await NotificationService.getUnreadCount()).toBe(2);

      // Step 6: Mark all read
      await NotificationService.markAllAsRead();
      expect(await NotificationService.getUnreadCount()).toBe(0);
    });
  });
});
