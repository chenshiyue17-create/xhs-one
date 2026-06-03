import rawConfig from '../../site.config.json';

export type CategoryKey = 'tech' | 'product' | 'ai';

export interface SocialLink {
  label: string;
  href: string;
}

export interface SiteConfig {
  site: {
    title: string;
    domain: string;
    description: string;
    author: string;
  };
  profile: {
    name: string;
    headline: string;
    intro: string;
    location: string;
    email: string;
    wechat: string;
    socialLinks: SocialLink[];
    heroImage: string;
  };
  navigation: {
    home: string;
    posts: string;
    about: string;
    contact: string;
  };
  categories: Record<CategoryKey, string>;
  homepage: {
    featuredSectionTitle: string;
    aboutSnippet: string;
    newsletterEnabled: boolean;
  };
  seo: {
    defaultOgImage: string;
    keywords: string[];
  };
}

export const siteConfig: SiteConfig = rawConfig as SiteConfig;

export function getContactLinks() {
  return {
    email: `mailto:${siteConfig.profile.email}`,
    domain: siteConfig.site.domain,
  };
}

export function getCategoryLabel(category: CategoryKey) {
  return siteConfig.categories[category];
}
