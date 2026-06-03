import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';

const HomePage = lazy(async () => {
  const module = await import('./pages/HomePage');
  return { default: module.HomePage };
});

const PostsPage = lazy(async () => {
  const module = await import('./pages/PostsPage');
  return { default: module.PostsPage };
});

const PostDetailPage = lazy(async () => {
  const module = await import('./pages/PostDetailPage');
  return { default: module.PostDetailPage };
});

const AboutPage = lazy(async () => {
  const module = await import('./pages/AboutPage');
  return { default: module.AboutPage };
});

function App() {
  return (
    <Layout>
      <Suspense fallback={<div className="route-loading">Loading...</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/posts" element={<PostsPage />} />
          <Route path="/posts/:slug" element={<PostDetailPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;
