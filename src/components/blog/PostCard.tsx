import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { type PostMeta, formatPostDate } from '../../lib/posts';
import { CategoryPill } from '../ui/CategoryPill';

interface PostCardProps {
  post: PostMeta;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <article className="post-card">
      <Link className="post-card-image" to={`/posts/${post.slug}`} aria-label={post.title}>
        <img src={post.cover} alt={post.title} />
      </Link>
      <div className="post-card-body">
        <div className="post-meta-row">
          <CategoryPill category={post.category} />
          <span>{formatPostDate(post.date)}</span>
          <span>{post.readingTime} min read</span>
        </div>
        <h3>
          <Link to={`/posts/${post.slug}`}>{post.title}</Link>
        </h3>
        <p>{post.excerpt}</p>
        <div className="post-card-footer">
          <ul>
            {post.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
          <Link className="post-inline-link" to={`/posts/${post.slug}`}>
            阅读
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
