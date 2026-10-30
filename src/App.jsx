import { useEffect, useState } from 'react';
import Navbar from './components/Navbar.jsx';
import CommunityForum from './pages/CommunityForum.jsx';
import DiscussionDetails from './pages/DiscussionDetails.jsx';
import CreateDiscussion from './pages/CreateDiscussion.jsx';
import UserProfile from './pages/UserProfile.jsx';
import AssessmentPage from './pages/AssessmentPage.jsx';
import BookmarksPage from './pages/BookmarksPage.jsx';
import { parseHashRoute } from './services/router.js';

export default function App() {
  const [route, setRoute] = useState(() => parseHashRoute(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setRoute(parseHashRoute(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  let page;
  if (route.name === 'new') {
    page = <CreateDiscussion />;
  } else if (route.name === 'post') {
    page = <DiscussionDetails key={route.params.id} postId={route.params.id} />;
  } else if (route.name === 'tag') {
    page = <CommunityForum key={`tag:${route.params.tag}`} initialTag={route.params.tag} />;
  } else if (route.name === 'user') {
    page = <UserProfile key={route.params.username} username={route.params.username} />;
  } else if (route.name === 'assessment') {
    page = <AssessmentPage />;
  } else if (route.name === 'bookmarks') {
    page = <BookmarksPage />;
  } else {
    page = <CommunityForum key="all" />;
  }

  return (
    <div className="app">
      <Navbar />
      <main className="app-main">{page}</main>
      <footer className="app-footer">
        <p>© {new Date().getFullYear()} Thinkz Community — built with React.</p>
      </footer>
    </div>
  );
}
