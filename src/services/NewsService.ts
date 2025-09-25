import type { Article, NewsSource, FeedData } from "../types";
import { newsSources } from "../config/newsCategories";
import { fetchArticlesFromSources } from "../utils/rssParser";
import {
  getCachedArticles,
  addArticles,
  getCachedFeedData,
  cacheFeedData,
  getCachedArticlesByCategory,
  getCachedArticleBySlug,
  searchCachedArticles,
  getCacheStats,
} from "../cache/fileCache";

export class NewsService {
  private static instance: NewsService;
  private isRefreshing = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): NewsService {
    if (!NewsService.instance) {
      NewsService.instance = new NewsService();
    }
    return NewsService.instance;
  }

  /**
   * Get all cached articles
   */
  public async getArticles(): Promise<Article[]> {
    try {
      const articles = await getCachedArticles();

      // If no cached articles, try to fetch fresh ones
      if (articles.length === 0) {
        console.log("No cached articles found, fetching fresh articles...");
        return await this.refreshArticles();
      }

      return articles;
    } catch (error) {
      console.error("Error getting articles:", error);
      return [];
    }
  }

  /**
   * Get articles by category
   */
  public async getArticlesByCategory(category: string): Promise<Article[]> {
    try {
      return await getCachedArticlesByCategory(category);
    } catch (error) {
      console.error(`Error getting articles for category ${category}:`, error);
      return [];
    }
  }

  /**
   * Get article by slug
   */
  public async getArticleBySlug(slug: string): Promise<Article | null> {
    try {
      return await getCachedArticleBySlug(slug);
    } catch (error) {
      console.error(`Error getting article by slug ${slug}:`, error);
      return null;
    }
  }

  /**
   * Search articles
   */
  public async searchArticles(query: string): Promise<Article[]> {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }

      return await searchCachedArticles(query.trim());
    } catch (error) {
      console.error(`Error searching articles with query "${query}":`, error);
      return [];
    }
  }

  /**
   * Get latest articles (most recent first)
   */
  public async getLatestArticles(limit: number = 50): Promise<Article[]> {
    try {
      const articles = await this.getArticles();
      return articles
        .sort(
          (a, b) =>
            new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
        )
        .slice(0, limit);
    } catch (error) {
      console.error("Error getting latest articles:", error);
      return [];
    }
  }

  /**
   * Get featured articles (for homepage)
   */
  public async getFeaturedArticles(): Promise<Article[]> {
    try {
      const articles = await this.getLatestArticles(20);

      // Filter articles with images for better visual impact
      const articlesWithImages = articles.filter((article) => article.image);
      const articlesWithoutImages = articles.filter(
        (article) => !article.image,
      );

      // Ensure the first article (main headline) always has an image
      if (articlesWithImages.length === 0) {
        // Fallback: if no articles have images, return what we have
        console.warn("No articles with images found for featured articles");
        return articlesWithoutImages.slice(0, 15);
      }

      // Start with articles that have images to guarantee first article has image
      const featuredWithImages = articlesWithImages.slice(0, 12);
      const remainingSlots = 15 - featuredWithImages.length;
      const additionalArticles = articlesWithoutImages.slice(
        0,
        Math.max(0, remainingSlots),
      );

      return [...featuredWithImages, ...additionalArticles];
    } catch (error) {
      console.error("Error getting featured articles:", error);
      return [];
    }
  }

  /**
   * Get trending articles by category
   */
  public async getTrendingByCategory(): Promise<Record<string, Article[]>> {
    try {
      const articles = await this.getLatestArticles(100);
      const trending: Record<string, Article[]> = {};

      // Group by category and take top 4 from each
      const categories = [
        ...new Set(articles.map((article) => article.category)),
      ];

      for (const category of categories) {
        const categoryArticles = articles
          .filter((article) => article.category === category);
        
        // Prioritize articles with images for better visual impact
        const articlesWithImages = categoryArticles.filter(article => article.image);
        const articlesWithoutImages = categoryArticles.filter(article => !article.image);
        
        // Take up to 4 articles, prioritizing those with images
        const selectedArticles = [
          ...articlesWithImages.slice(0, 4),
          ...articlesWithoutImages.slice(0, Math.max(0, 4 - articlesWithImages.length))
        ].slice(0, 4);

        if (selectedArticles.length > 0) {
          trending[category] = selectedArticles;
        }
      }

      return trending;
    } catch (error) {
      console.error("Error getting trending articles by category:", error);
      return {};
    }
  }

  /**
   * Refresh articles from all sources
   */
  public async refreshArticles(force: boolean = false): Promise<Article[]> {
    // Prevent concurrent refreshes
    if (this.isRefreshing && !force) {
      console.log(
        "Article refresh already in progress, returning cached articles",
      );
      return await getCachedArticles();
    }

    try {
      this.isRefreshing = true;
      console.log("Starting article refresh...");

      // Get cache stats to determine if refresh is needed
      if (!force) {
        const stats = await getCacheStats();
        if (!stats.isExpired && stats.articlesCount > 0) {
          console.log("Cache is still valid, returning cached articles");
          return await getCachedArticles();
        }
      }

      // Fetch articles from all sources
      const freshArticles = await fetchArticlesFromSources(newsSources);

      if (freshArticles.length === 0) {
        console.warn("No articles fetched from any source");
        return await getCachedArticles(); // Return cached articles as fallback
      }

      // Add to cache (this will merge with existing and remove duplicates)
      const allArticles = await addArticles(freshArticles);

      // Cache feed data for API endpoints
      const feedData: FeedData = {
        feeds: newsSources,
        articles: allArticles,
        lastUpdated: Date.now(),
      };
      await cacheFeedData(feedData);

      console.log(
        `Article refresh completed. Total articles: ${allArticles.length}`,
      );
      return allArticles;
    } catch (error) {
      console.error("Error refreshing articles:", error);

      // Return cached articles as fallback
      const cachedArticles = await getCachedArticles();
      console.log(
        `Returning ${cachedArticles.length} cached articles as fallback`,
      );
      return cachedArticles;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Get related articles based on category and tags
   */
  public async getRelatedArticles(
    article: Article,
    limit: number = 5,
  ): Promise<Article[]> {
    try {
      const allArticles = await this.getArticles();

      // Filter out the current article and get articles from the same category
      const candidateArticles = allArticles.filter(
        (a) => a.id !== article.id && a.category === article.category,
      );

      // Score articles based on relevance
      const scoredArticles = candidateArticles.map((candidate) => {
        let score = 0;

        // Same category gets base score
        score += 1;

        // Bonus for shared tags
        const sharedTags = candidate.tags.filter((tag) =>
          article.tags.some(
            (articleTag) => articleTag.toLowerCase() === tag.toLowerCase(),
          ),
        );
        score += sharedTags.length * 2;

        // Bonus for same source
        if (candidate.source === article.source) {
          score += 1;
        }

        // Bonus for recent articles (within last 24 hours)
        const candidateDate = new Date(candidate.pubDate);
        const articleDate = new Date(article.pubDate);
        const timeDiff = Math.abs(
          candidateDate.getTime() - articleDate.getTime(),
        );
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff <= 24) {
          score += 2;
        } else if (hoursDiff <= 72) {
          score += 1;
        }

        return { article: candidate, score };
      });

      // Sort by score (descending) and return top articles
      return scoredArticles
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((item) => item.article);
    } catch (error) {
      console.error("Error getting related articles:", error);
      return [];
    }
  }

  /**
   * Get articles by source
   */
  public async getArticlesBySource(sourceName: string): Promise<Article[]> {
    try {
      const articles = await this.getArticles();
      return articles.filter(
        (article) => article.source.toLowerCase() === sourceName.toLowerCase(),
      );
    } catch (error) {
      console.error(`Error getting articles by source ${sourceName}:`, error);
      return [];
    }
  }

  /**
   * Get cache statistics
   */
  public async getCacheInfo(): Promise<{
    articlesCount: number;
    lastUpdated: number | null;
    cacheSize: number;
    isExpired: boolean;
    isRefreshing: boolean;
  }> {
    try {
      const stats = await getCacheStats();
      return {
        ...stats,
        isRefreshing: this.isRefreshing,
      };
    } catch (error) {
      console.error("Error getting cache info:", error);
      return {
        articlesCount: 0,
        lastUpdated: null,
        cacheSize: 0,
        isExpired: true,
        isRefreshing: this.isRefreshing,
      };
    }
  }

  /**
   * Get articles for pagination
   */
  public async getArticlesPaginated(
    page: number = 1,
    limit: number = 12,
    category?: string,
  ): Promise<{
    articles: Article[];
    currentPage: number;
    totalPages: number;
    totalArticles: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }> {
    try {
      let articles: Article[];

      if (category && category !== "all") {
        articles = await this.getArticlesByCategory(category);
      } else {
        articles = await this.getArticles();
      }

      // Sort by date (newest first)
      articles = articles.sort(
        (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
      );

      // For the first page, prioritize articles with images for the featured article
      if (page === 1 && articles.length > 0) {
        const articlesWithImages = articles.filter(article => article.image);
        const articlesWithoutImages = articles.filter(article => !article.image);
        
        if (articlesWithImages.length > 0) {
          // Ensure first article has an image, then mix the rest
          articles = [
            articlesWithImages[0], // First article with image
            ...articlesWithoutImages.slice(0, 1), // One without image
            ...articlesWithImages.slice(1), // Rest with images
            ...articlesWithoutImages.slice(1) // Rest without images
          ];
        }
      }

      const totalArticles = articles.length;
      const totalPages = Math.ceil(totalArticles / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      const paginatedArticles = articles.slice(startIndex, endIndex);

      return {
        articles: paginatedArticles,
        currentPage: page,
        totalPages,
        totalArticles,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    } catch (error) {
      console.error("Error getting paginated articles:", error);
      return {
        articles: [],
        currentPage: 1,
        totalPages: 0,
        totalArticles: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      };
    }
  }
}

// Export singleton instance
export const newsService = NewsService.getInstance();
