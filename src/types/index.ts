export interface Article {
  id: string;
  title: string;
  description: string;
  content: string;
  link: string;
  pubDate: string;
  author?: string;
  source: string;
  sourceColor: string;
  category: string;
  slug: string;
  image?: string;
  tags: string[];
  readingTime: number;
  // News-specific fields for SEO and ranking
  newsKeywords?: string[];
  location?: string;
  urgency?: 'breaking' | 'urgent' | 'normal' | 'low';
  originalSource?: string;
  creditLine?: string;
  newsType?: 'breaking' | 'politics' | 'business' | 'sports' | 'technology' | 'science' | 'entertainment' | 'general';
}

export interface NewsSource {
  name: string;
  url: string;
  category: string;
  color: string;
}

export interface NewsCategory {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface CacheData {
  articles: Article[];
  lastUpdated: number;
  version: string;
}

export interface FeedData {
  feeds: NewsSource[];
  articles: Article[];
  lastUpdated: number;
}

export interface NewsletterSubscriber {
  email: string;
  subscribedAt: string;
  active: boolean;
}

export interface RSSFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author?: string;
  content?: string;
  categories?: string[];
  enclosure?: {
    url: string;
    type: string;
  };
}
