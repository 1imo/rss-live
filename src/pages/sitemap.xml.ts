import type { APIRoute } from 'astro';
import { newsService } from '../services/NewsService';
import { newsCategories } from '../config/newsCategories';

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site?.toString() || process.env.SITE_URL || 'http://localhost:4321';
  
  try {
    // Get all articles
    const articles = await newsService.getArticles();
    
    // Generate XML sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- Static Pages -->
  <url>
    <loc>${siteUrl}</loc>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>
  
  <url>
    <loc>${siteUrl}categories</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>
  
  <url>
    <loc>${siteUrl}search</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>
  
  <!-- Category Pages -->
  ${newsCategories.map(category => `
  <url>
    <loc>${siteUrl}category/${category.id}</loc>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>`).join('')}
  
  <!-- News Articles -->
  ${articles.map(article => {
    const articleDate = new Date(article.pubDate);
    const isRecent = Date.now() - articleDate.getTime() < 48 * 60 * 60 * 1000; // 48 hours
    
    // Proper XML escaping function
    const escapeXml = (str: string) => {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove invalid XML characters
    };
    
    const safeTitle = escapeXml(article.title);
    const safeKeywords = escapeXml(article.newsKeywords?.join(', ') || article.tags.join(', '));
    const safeImageUrl = article.image ? escapeXml(article.image) : '';
    
    return `
  <url>
    <loc>${siteUrl}news/${article.slug}</loc>
    <changefreq>${isRecent ? 'hourly' : 'daily'}</changefreq>
    <priority>${isRecent ? '0.9' : '0.7'}</priority>
    <lastmod>${articleDate.toISOString()}</lastmod>
    ${article.image && safeImageUrl ? `
    <image:image>
      <image:loc>${safeImageUrl}</image:loc>
      <image:caption>${safeTitle}</image:caption>
    </image:image>` : ''}
    <news:news>
      <news:publication>
        <news:name>NewsHub</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${articleDate.toISOString()}</news:publication_date>
      <news:title>${safeTitle}</news:title>
      <news:keywords>${safeKeywords}</news:keywords>
    </news:news>
  </url>`;
  }).join('')}
</urlset>`;

    return new Response(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      }
    });
    
  } catch (error) {
    console.error('Error generating sitemap:', error);
    
    // Fallback minimal sitemap
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}categories</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
    
    return new Response(fallbackSitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml'
      }
    });
  }
};