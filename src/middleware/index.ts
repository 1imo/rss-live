import type { MiddlewareHandler } from 'astro';

let isInitialized = false;

export const onRequest: MiddlewareHandler = async (context, next) => {
  // Initialize background jobs only once on server startup
  if (!isInitialized && import.meta.env.SSR) {
    console.log('🚀 Server startup: Initializing background RSS jobs...');
    
    try {
      // Dynamic import to avoid bundling in client
      const { backgroundJobs } = await import('../services/BackgroundJobs.js');
      isInitialized = true;
      console.log('✅ Background RSS jobs initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize background jobs:', error);
    }
  }
  
  return next();
};