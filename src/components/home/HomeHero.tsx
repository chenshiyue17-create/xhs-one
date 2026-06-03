import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { siteConfig } from '../../config/site';

export function HomeHero() {
  return (
    <section className="home-hero">
      <div className="home-hero-copy">
        <p className="hero-eyebrow">Personal Blog / Notes & Practice</p>
        <h1>{siteConfig.profile.name}</h1>
        <h2>{siteConfig.profile.headline}</h2>
        <p>{siteConfig.profile.intro}</p>
        <div className="hero-links">
          <Link className="hero-primary-link" to="/posts">
            阅读文章
            <ArrowRight size={18} />
          </Link>
          <Link className="hero-text-link" to="/about">
            了解更多
          </Link>
        </div>
      </div>
      <div className="home-hero-media">
        <img src={siteConfig.profile.heroImage} alt={siteConfig.profile.name} />
      </div>
    </section>
  );
}
