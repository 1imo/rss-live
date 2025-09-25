import { promises as fs } from 'fs';
import path from 'path';
import type { CacheData, Article, FeedData } from '../types';

const CACHE_DIR = '.cache/news';
const CACHE_VERSION = '1.0.0';
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create cache directory:', error);
    throw error;
  }
}

/**
 * Get cache file path
 */
function getCacheFilePath(filename: string): string {
  return path.join(CACHE_DIR, filename);
}

/**
 * Check if cache file exists and is not expired
 */
async function isCacheValid(filepath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filepath);
    const now = Date.now();
    const fileAge = now - stats.mtime.getTime();

    return fileAge < CACHE_EXPIRY_MS;
  } catch (error) {
    return false; // File doesn't exist or other error
  }
}

/**
 * Read and parse JSON cache file
 */
async function readCacheFile<T>(filename: string): Promise<T | null> {
  try {
    const filepath = getCacheFilePath(filename);

    if (!(await isCacheValid(filepath))) {
      console.log(`Cache file ${filename} is expired or doesn't exist`);
      return null;
    }

    const content = await fs.readFile(filepath, 'utf-8');
    const data = JSON.parse(content);

    // Validate cache version
    if (data.version !== CACHE_VERSION) {
      console.log(`Cache version mismatch for ${filename}, invalidating`);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error reading cache file ${filename}:`, error);
    return null;
  }
}

/**
 * Write data to cache file
 */
async function writeCacheFile<T>(filename: string, data: T): Promise<void> {
  try {
    await ensureCacheDir();
    const filepath = getCacheFilePath(filename);

    const cacheData = {
      ...data,
      version: CACHE_VERSION,
      lastUpdated: Date.now()
    };

    await fs.writeFile(filepath, JSON.stringify(cacheData, null, 2));
    console.log(`Cache file ${filename} updated successfully`);
  } catch (error) {
    console.error(`Error writing cache file ${filename}:`, error);
    throw error;
  }
}

/**
 * Get cached articles
 */
export async function getCachedArticles(): Promise<Article[]> {
  try {
    const cacheData = await readCacheFile<CacheData>('articles.json');
    return cacheData?.articles || [];
  } catch (error) {
    console.error('Error getting cached articles:', error);
    return [];
  }
}

/**
 * Cache articles
 */
export async function cacheArticles(articles: Article[]): Promise<void> {
  try {
    const cacheData: CacheData = {
      articles,
      lastUpdated: Date.now(),
      version: CACHE_VERSION
    };

    await writeCacheFile('articles.json', cacheData);
  } catch (error) {
    console.error('Error caching articles:', error);
    throw error;
  }
}

/**
 * Add new articles to cache without duplicates
 */
export async function addArticles(newArticles: Article[]): Promise<Article[]> {
  try {
    const existingArticles = await getCachedArticles();
    const existingIds = new Set(existingArticles.map(article => article.id));

    // Filter out duplicates
    const uniqueNewArticles = newArticles.filter(article => !existingIds.has(article.id));

    if (uniqueNewArticles.length === 0) {
      console.log('No new articles to add to cache');
      return existingArticles;
    }

    // Combine and sort by date (newest first)
    const allArticles = [...uniqueNewArticles, ...existingArticles]
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    // Keep only the most recent 1000 articles to prevent cache from growing too large
    const trimmedArticles = allArticles.slice(0, 1000);

    await cacheArticles(trimmedArticles);
    console.log(`Added ${uniqueNewArticles.length} new articles to cache`);

    return trimmedArticles;
  } catch (error) {
    console.error('Error adding articles to cache:', error);
    throw error;
  }
}

/**
 * Get cached feed data
 */
export async function getCachedFeedData(): Promise<FeedData | null> {
  try {
    return await readCacheFile<FeedData>('feeds.json');
  } catch (error) {
    console.error('Error getting cached feed data:', error);
    return null;
  }
}

/**
 * Cache feed data
 */
export async function cacheFeedData(feedData: FeedData): Promise<void> {
  try {
    await writeCacheFile('feeds.json', feedData);
  } catch (error) {
    console.error('Error caching feed data:', error);
    throw error;
  }
}

/**
 * Clear all cache files
 */
export async function clearCache(): Promise<void> {
  try {
    const files = ['articles.json', 'feeds.json'];

    for (const file of files) {
      try {
        await fs.unlink(getCacheFilePath(file));
        console.log(`Deleted cache file: ${file}`);
      } catch (error) {
        // File might not exist, that's okay
        console.log(`Cache file ${file} not found, skipping`);
      }
    }

    console.log('Cache cleared successfully');
  } catch (error) {
    console.error('Error clearing cache:', error);
    throw error;
  }
}

/**
 * Get cache stats
 */
export async function getCacheStats(): Promise<{
  articlesCount: number;
  lastUpdated: number | null;
  cacheSize: number;
  isExpired: boolean;
}> {
  try {
    const cacheData = await readCacheFile<CacheData>('articles.json');
    const filepath = getCacheFilePath('articles.json');
    const isExpired = !(await isCacheValid(filepath));

    let cacheSize = 0;
    try {
      const stats = await fs.stat(filepath);
      cacheSize = stats.size;
    } catch (error) {
      // File doesn't exist
    }

    return {
      articlesCount: cacheData?.articles.length || 0,
      lastUpdated: cacheData?.lastUpdated || null,
      cacheSize,
      isExpired
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      articlesCount: 0,
      lastUpdated: null,
      cacheSize: 0,
      isExpired: true
    };
  }
}

/**
 * Get articles by category from cache
 */
export async function getCachedArticlesByCategory(category: string): Promise<Article[]> {
  try {
    const allArticles = await getCachedArticles();
    return allArticles.filter(article => article.category === category);
  } catch (error) {
    console.error('Error getting cached articles by category:', error);
    return [];
  }
}

/**
 * Get article by slug from cache
 */
export async function getCachedArticleBySlug(slug: string): Promise<Article | null> {
  try {
    const allArticles = await getCachedArticles();
    return allArticles.find(article => article.slug === slug) || null;
  } catch (error) {
    console.error('Error getting cached article by slug:', error);
    return null;
  }
}

/**
 * Search articles in cache
 */
export async function searchCachedArticles(query: string): Promise<Article[]> {
  try {
    const allArticles = await getCachedArticles();
    const lowercaseQuery = query.toLowerCase();

    return allArticles.filter(article =>
      article.title.toLowerCase().includes(lowercaseQuery) ||
      article.description.toLowerCase().includes(lowercaseQuery) ||
      article.content.toLowerCase().includes(lowercaseQuery) ||
      article.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  } catch (error) {
    console.error('Error searching cached articles:', error);
    return [];
  }
}
