import matter from 'gray-matter';
import type { CategoryKey } from '../config/site';

export interface PostMeta {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: CategoryKey;
  tags: string[];
  cover: string;
  featured: boolean;
  readingTime: number;
}

export interface Post extends PostMeta {
  content: string;
}

interface Frontmatter {
  title: string;
  excerpt: string;
  date: string;
  category: CategoryKey;
  tags: string[];
  cover: string;
  featured?: boolean;
  readingTime?: number;
}

const rawPosts = import.meta.glob('../../content/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function estimateReadingTime(content: string) {
  const plain = content.replace(/[#*_>`-]/g, ' ').trim();
  const wordCount = plain.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 180));
}

function normalizePost(path: string, source: string): Post {
  const { data, content } = matter(source);
  const meta = data as Frontmatter;
  const slug = path.split('/').pop()?.replace(/\.md$/, '');

  if (!slug) {
    throw new Error(`Unable to derive slug from path: ${path}`);
  }

  return {
    slug,
    title: meta.title,
    excerpt: meta.excerpt,
    date: meta.date,
    category: meta.category,
    tags: meta.tags,
    cover: meta.cover,
    featured: Boolean(meta.featured),
    readingTime: meta.readingTime ?? estimateReadingTime(content),
    content,
  };
}

const posts = Object.entries(rawPosts)
  .map(([path, source]) => normalizePost(path, source))
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export function getAllPosts() {
  return posts;
}

export function getFeaturedPosts(limit = 3) {
  return posts.filter((post) => post.featured).slice(0, limit);
}

export function getPostBySlug(slug: string) {
  return posts.find((post) => post.slug === slug);
}

export function getPostsByCategory(category?: CategoryKey) {
  if (!category) {
    return posts;
  }

  return posts.filter((post) => post.category === category);
}

export function getAdjacentPosts(slug: string) {
  const index = posts.findIndex((post) => post.slug === slug);

  if (index === -1) {
    return { previous: undefined, next: undefined };
  }

  return {
    previous: posts[index + 1],
    next: posts[index - 1],
  };
}

export function formatPostDate(date: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}
