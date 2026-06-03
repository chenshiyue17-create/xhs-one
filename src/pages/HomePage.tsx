import { Link } from 'react-router-dom';
import { PostCard } from '../components/blog/PostCard';
import { HomeHero } from '../components/home/HomeHero';
import { SectionHeading } from '../components/ui/SectionHeading';
import { siteConfig } from '../config/site';
import { getFeaturedPosts } from '../lib/posts';

const featuredPosts = getFeaturedPosts();

export function HomePage() {
  return (
    <div className="page page-home">
      <HomeHero />

      <section className="page-section featured-section">
        <SectionHeading
          eyebrow="Featured"
          title={siteConfig.homepage.featuredSectionTitle}
          description="最近想保留下来的几篇文章，关于技术、产品、AI 以及做事过程中的一些体感。"
        />
        <div className="post-grid featured-grid">
          {featuredPosts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </section>

      <section className="page-section categories-section">
        <SectionHeading
          eyebrow="Categories"
          title="长期写作的三个方向"
          description="内容会围绕技术、产品与 AI 展开，但我更在意它们如何回到真实工作与真实生活。"
        />
        <div className="category-columns">
          <Link to="/posts?category=tech">
            <strong>{siteConfig.categories.tech}</strong>
            <span>系统、体验、结构、工程判断。</span>
          </Link>
          <Link to="/posts?category=product">
            <strong>{siteConfig.categories.product}</strong>
            <span>做产品、搭框架、打磨表达和推进落地。</span>
          </Link>
          <Link to="/posts?category=ai">
            <strong>{siteConfig.categories.ai}</strong>
            <span>AI 如何成为工作材料，而不只是一个热词。</span>
          </Link>
        </div>
      </section>

      <section className="page-section about-preview-section">
        <div className="about-preview-copy">
          <SectionHeading
            eyebrow="About"
            title="想把专业判断和个人气味，放在同一个空间里"
            description={siteConfig.homepage.aboutSnippet}
          />
          <Link className="hero-text-link" to="/about">
            查看关于页
          </Link>
        </div>
      </section>
    </div>
  );
}
