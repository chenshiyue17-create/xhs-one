import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { MarkdownArticle } from '../components/blog/MarkdownArticle';
import { CategoryPill } from '../components/ui/CategoryPill';
import { getAdjacentPosts, getPostBySlug, formatPostDate } from '../lib/posts';

export function PostDetailPage() {
  const { slug = '' } = useParams();
  const post = getPostBySlug(slug);

  if (!post) {
    return (
      <div className="page page-missing">
        <section className="page-section narrow-section missing-section">
          <p>404</p>
          <h1>文章未找到</h1>
          <span>这个链接可能已经失效，或者文章暂时还没有公开。</span>
          <Link className="hero-text-link" to="/posts">
            返回文章列表
          </Link>
        </section>
      </div>
    );
  }

  const adjacent = getAdjacentPosts(slug);

  return (
    <div className="page page-post-detail">
      <section className="page-section post-detail-hero narrow-section">
        <Link className="back-link" to="/posts">
          <ArrowLeft size={16} />
          返回文章列表
        </Link>
        <div className="post-detail-meta">
          <CategoryPill category={post.category} />
          <span>{formatPostDate(post.date)}</span>
          <span>{post.readingTime} min read</span>
        </div>
        <h1>{post.title}</h1>
        <p>{post.excerpt}</p>
        <img className="post-detail-cover" src={post.cover} alt={post.title} />
      </section>

      <section className="page-section narrow-section article-section">
        <MarkdownArticle content={post.content} />
      </section>

      <section className="page-section narrow-section adjacent-section">
        {adjacent.previous ? (
          <Link className="adjacent-link" to={`/posts/${adjacent.previous.slug}`}>
            <small>上一篇</small>
            <strong>{adjacent.previous.title}</strong>
          </Link>
        ) : <div />}
        {adjacent.next ? (
          <Link className="adjacent-link align-right" to={`/posts/${adjacent.next.slug}`}>
            <small>下一篇</small>
            <strong>{adjacent.next.title}</strong>
            <ArrowRight size={16} />
          </Link>
        ) : <div />}
      </section>
    </div>
  );
}
