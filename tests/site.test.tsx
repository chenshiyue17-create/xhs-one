import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { siteConfig } from '../src/config/site';
import { getAllPosts, getFeaturedPosts, getPostBySlug } from '../src/lib/posts';

describe('site configuration', () => {
  it('loads blog configuration fields', () => {
    expect(siteConfig.site.title).toBe('Tengda Wang');
    expect(siteConfig.profile.heroImage).toContain('/assets/hero-portrait.svg');
    expect(siteConfig.categories.tech).toBe('技术');
  });
});

describe('markdown content system', () => {
  it('loads and sorts posts', () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThanOrEqual(5);
    expect(posts[0].slug).toBe('when-tools-become-environments');
  });

  it('returns featured posts and slug lookup', () => {
    const featured = getFeaturedPosts();
    expect(featured).toHaveLength(3);
    expect(featured[0].featured).toBe(true);
    expect(getPostBySlug('ai-is-a-material')?.title).toContain('AI');
  });
});

describe('app routes', () => {
  it('renders homepage hero and featured section', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /Tengda Wang/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /精选文章/i })).toBeInTheDocument();
  });

  it('renders posts archive page', async () => {
    render(
      <MemoryRouter initialEntries={['/posts']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /文章归档/i })).toBeInTheDocument();
    expect(await screen.findByText('全部')).toBeInTheDocument();
  });

  it('renders post detail by slug', async () => {
    render(
      <MemoryRouter initialEntries={['/posts/clean-systems-feel-human']}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: /干净的系统，往往更有人味/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/技术系统有一种常见误区/)).toBeInTheDocument();
  });

  it('shows missing state for unknown slug', async () => {
    render(
      <MemoryRouter initialEntries={['/posts/not-exists']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /文章未找到/i })).toBeInTheDocument();
  });
});

describe('project docs', () => {
  it('keeps env example and site config readable', () => {
    const envExample = readFileSync(resolve(process.cwd(), '.env.example'), 'utf-8');
    const siteJson = readFileSync(resolve(process.cwd(), 'site.config.json'), 'utf-8');
    expect(envExample).toContain('VITE_SITE_URL');
    expect(siteJson).toContain('newsletterEnabled');
  });
});
