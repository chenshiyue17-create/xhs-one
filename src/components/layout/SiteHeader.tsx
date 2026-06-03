import { Menu } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { siteConfig } from '../../config/site';

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="site-brand" to="/">
          <span>{siteConfig.profile.name}</span>
          <small>{siteConfig.site.title}</small>
        </Link>
        <nav>
          <NavLink to="/">{siteConfig.navigation.home}</NavLink>
          <NavLink to="/posts">{siteConfig.navigation.posts}</NavLink>
          <NavLink to="/about">{siteConfig.navigation.about}</NavLink>
          <a href="#site-contact">{siteConfig.navigation.contact}</a>
          <button type="button" aria-label="menu" className="nav-icon-button">
            <Menu size={18} />
          </button>
        </nav>
      </div>
    </header>
  );
}
