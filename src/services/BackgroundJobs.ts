import { newsService } from '../services/NewsService.js';

class BackgroundJobManager {
  private static instance: BackgroundJobManager;
  private refreshInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  public static getInstance(): BackgroundJobManager {
    if (!BackgroundJobManager.instance) {
      BackgroundJobManager.instance = new BackgroundJobManager();
    }
    return BackgroundJobManager.instance;
  }

  /**
   * Start the background RSS refresh job
   */
  public startRSSRefreshJob(): void {
    if (this.isRunning) {
      console.log('🔄 RSS refresh job is already running');
      return;
    }

    const intervalMs = parseInt(process.env.RSS_REFRESH_INTERVAL_MS || '1200000'); // Default 20 minutes
    console.log(`🚀 Starting RSS refresh job with ${intervalMs / 1000 / 60} minute intervals`);

    // Run immediately on start
    this.executeRSSRefresh();

    // Then run on schedule
    this.refreshInterval = setInterval(() => {
      this.executeRSSRefresh();
    }, intervalMs);

    this.isRunning = true;
  }

  /**
   * Stop the background RSS refresh job
   */
  public stopRSSRefreshJob(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️ RSS refresh job stopped');
  }

  /**
   * Execute RSS refresh
   */
  private async executeRSSRefresh(): Promise<void> {
    try {
      console.log('🔄 Starting scheduled RSS refresh...');
      const startTime = Date.now();
      
      const articles = await newsService.refreshArticles();
      
      const duration = Date.now() - startTime;
      console.log(`✅ RSS refresh completed in ${duration}ms. Articles: ${articles.length}`);
      
      // Log some stats
      const cacheInfo = await newsService.getCacheInfo();
      console.log(`📊 Cache stats: ${cacheInfo.articlesCount} articles, ${Math.round(cacheInfo.cacheSize / 1024)}KB`);
      
    } catch (error) {
      console.error('❌ Error during scheduled RSS refresh:', error);
    }
  }
}

export const backgroundJobs = BackgroundJobManager.getInstance();

// Auto-start always (both dev and production)
console.log('🚀 Auto-starting RSS background jobs...');
backgroundJobs.startRSSRefreshJob();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📡 Received SIGTERM, stopping background jobs...');
  backgroundJobs.stopRSSRefreshJob();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📡 Received SIGINT, stopping background jobs...');
  backgroundJobs.stopRSSRefreshJob();
  process.exit(0);
});