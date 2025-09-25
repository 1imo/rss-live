import type { APIRoute } from 'astro';
import { newsService } from '../../services/NewsService';

export const GET: APIRoute = async () => {
  try {
    const articles = await newsService.getArticles();
    
    // Find articles with problematic images
    const problematicArticles = articles.filter(article => {
      if (!article.image) return false;
      
      // Check for various problematic patterns
      const image = article.image;
      return (
        typeof image !== 'string' ||
        image.trim() === '' ||
        image === 'undefined' ||
        image === 'null' ||
        image.includes('undefined') ||
        !image.startsWith('http') ||
        !image.includes('.')
      );
    });
    
    // Also find articles with images that fail URL parsing
    const invalidUrlArticles = articles.filter(article => {
      if (!article.image || typeof article.image !== 'string') return false;
      try {
        new URL(article.image);
        return false;
      } catch {
        return true;
      }
    });
    
    const debugInfo = {
      totalArticles: articles.length,
      articlesWithImages: articles.filter(a => a.image).length,
      problematicImages: problematicArticles.length,
      invalidUrls: invalidUrlArticles.length,
      problematicArticles: problematicArticles.slice(0, 10).map(article => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        image: article.image,
        source: article.source
      })),
      invalidUrlArticles: invalidUrlArticles.slice(0, 10).map(article => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        image: article.image,
        source: article.source
      })),
      sampleValidImages: articles
        .filter(a => a.image && typeof a.image === 'string' && a.image.startsWith('http'))
        .slice(0, 5)
        .map(a => ({
          title: a.title,
          image: a.image,
          source: a.source
        }))
    };
    
    return new Response(JSON.stringify(debugInfo, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Failed to debug sitemap', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, null, 2), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};