#!/usr/bin/env node

import { newsService } from './src/services/NewsService.js';

async function main() {
  try {
    console.log('🔄 Starting news refresh...');
    
    // Check current cache status
    const cacheInfo = await newsService.getCacheInfo();
    console.log('📊 Current cache info:', {
      articles: cacheInfo.articlesCount,
      lastUpdated: cacheInfo.lastUpdated ? new Date(cacheInfo.lastUpdated).toLocaleString() : 'Never',
      isExpired: cacheInfo.isExpired,
      size: Math.round(cacheInfo.cacheSize / 1024) + ' KB'
    });

    // Force refresh if requested
    const forceRefresh = process.argv.includes('--force') || process.argv.includes('-f');
    
    if (forceRefresh) {
      console.log('🔥 Force refresh requested');
    }

    // Refresh articles
    const articles = await newsService.refreshArticles(forceRefresh);
    
    console.log('✅ News refresh completed successfully!');
    console.log(`📰 Total articles in cache: ${articles.length}`);
    
    // Show breakdown by category
    const categoryBreakdown = {};
    articles.forEach(article => {
      categoryBreakdown[article.category] = (categoryBreakdown[article.category] || 0) + 1;
    });
    
    console.log('📊 Articles by category:');
    Object.entries(categoryBreakdown)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`  ${category}: ${count} articles`);
      });

    // Show latest articles
    console.log('\n📈 Latest articles:');
    articles
      .slice(0, 5)
      .forEach((article, index) => {
        console.log(`  ${index + 1}. ${article.title} (${article.source})`);
      });

  } catch (error) {
    console.error('❌ Error refreshing news:', error);
    process.exit(1);
  }
}

main();