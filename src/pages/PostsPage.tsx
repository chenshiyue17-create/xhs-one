import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PostCard } from '../components/blog/PostCard';
import { CategoryPill } from '../components/ui/CategoryPill';
import { SectionHeading } from '../components/ui/SectionHeading';
import { siteConfig, type CategoryKey } from '../config/site';
import { getAllPosts, getPostsByCategory } from '../lib/posts';

const categoryKeys = Object.keys(siteConfig.categories) as CategoryKey[];

export function PostsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') as CategoryKey | null;

  const posts = useMemo(() => {
    if (activeCategory && categoryKeys.includes(activeCategory)) {
      return getPostsByCategory(activeCategory);
    }

    return getAllPosts();
  }, [activeCategory]);

  return (
    <div className="page page-posts">
      <section className="page-section intro-section narrow-section">
        <SectionHeading
          eyebrow="Archive"
          title="文章归档"
          description="这里收纳所有公开写下来的内容，默认按时间排序，也可以按栏目筛选。"
        />
        <div className="filter-row">
          <button
            className={`filter-button${activeCategory ? '' : ' active'}`}
            type="button"
            onClick={() => setSearchParams({})}
          >
            全部
          </button>
          {categoryKeys.map((category) => (
            <button
              key={category}
              className={`filter-button${activeCategory === category ? ' active' : ''}`}
              type="button"
              onClick={() => setSearchParams({ category })}
            >
              <CategoryPill category={category} active={activeCategory === category} />
            </button>
          ))}
        </div>
      </section>

      <section className="page-section post-list-section">
        <div className="post-grid">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </section>
    </div>
  );
}
