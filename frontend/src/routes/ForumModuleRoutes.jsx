import { Routes, Route, Navigate } from "react-router-dom";

import DiscussionListPage from "../pages/forum/DiscussionListPage";
import DiscussionDetailsPage from "../pages/forum/DiscussionDetailsPage";
import CreateDiscussionPage from "../pages/forum/CreateDiscussionPage";
import CategoriesPage from "../pages/forum/CategoriesPage";
import BookmarksPage from "../pages/forum/BookmarksPage";
import PreferencesPage from "../pages/forum/PreferencesPage";
import NotificationCenterPage from "../pages/forum/NotificationCenterPage";
import LiveStudioPage from "../pages/liveStudio/LiveStudioPage";
import ModerationDashboardPage from "../pages/moderation/ModerationDashboardPage";

/**
 * Self-contained Forum module routes.
 *
 * Mounted from the main app with a single line:
 *   <Route path="/forum/*" element={<ForumModuleRoutes />} />
 *
 * The forum intentionally does not depend on the auth module — it uses the
 * backend's mock identity (x-user-id) so it works standalone in any role.
 */
export default function ForumModuleRoutes() {
  return (
    <main className="forum-module-layout">
      <Routes>
        <Route path="/" element={<DiscussionListPage />} />
        <Route path="new" element={<CreateDiscussionPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="bookmarks" element={<BookmarksPage />} />
        <Route path="notifications" element={<NotificationCenterPage />} />
        <Route path="preferences" element={<PreferencesPage />} />
        <Route path="studio" element={<LiveStudioPage />} />
        <Route path="moderation" element={<ModerationDashboardPage />} />
        <Route path=":id" element={<DiscussionDetailsPage />} />
        <Route path="*" element={<Navigate to="/forum" replace />} />
      </Routes>
    </main>
  );
}
