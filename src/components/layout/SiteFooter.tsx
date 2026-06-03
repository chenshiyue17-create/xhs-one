import { getContactLinks, siteConfig } from '../../config/site';

const contactLinks = getContactLinks();

export function SiteFooter() {
  return (
    <footer className="site-footer" id="site-contact">
      <div className="site-footer-copy">
        <p>Contact</p>
        <h2>如果你也在做需要长期表达和持续迭代的东西，欢迎来信。</h2>
      </div>
      <div className="site-footer-meta">
        <a href={contactLinks.email}>{siteConfig.profile.email}</a>
        <span>微信：{siteConfig.profile.wechat}</span>
        <a href={siteConfig.site.domain} target="_blank" rel="noreferrer">
          {siteConfig.site.domain.replace(/^https?:\/\//, '')}
        </a>
      </div>
      <div className="site-footer-socials">
        {siteConfig.profile.socialLinks.map((link) => (
          <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        ))}
      </div>
    </footer>
  );
}
