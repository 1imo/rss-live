import Parser from "rss-parser";
import type { Article, NewsSource, RSSFeedItem } from "../types";
import { slugify } from "./slugify.js";

// HTML entity map for common entities
const htmlEntities: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&#8217;": "'",
  "&#8216;": "'",
  "&#8220;": '"',
  "&#8221;": '"',
  "&#8211;": "–",
  "&#8212;": "—",
  "&#8230;": "…",
  "&#8482;": "™",
  "&#169;": "©",
  "&#174;": "®",
  "&#8364;": "€",
  "&#163;": "£",
  "&#165;": "¥",
  "&#8594;": "→",
  "&#8592;": "←",
  "&#8593;": "↑",
  "&#8595;": "↓",
  "&#8226;": "•",
  "&#176;": "°",
  "&#8804;": "≤",
  "&#8805;": "≥",
  "&#8800;": "≠",
  "&#8776;": "≈",
  "&#8734;": "∞",
  "&#8710;": "∆",
  "&#8721;": "∑",
  "&#960;": "π",
  "&#945;": "α",
  "&#946;": "β",
  "&#947;": "γ",
  "&#8747;": "∫",
  "&#8730;": "√",
  "&#8242;": "′",
  "&#8243;": "″",
  "&#8249;": "‹",
  "&#8250;": "›",
  "&#171;": "«",
  "&#187;": "»",
  "&#8218;": "‚",
  "&#8222;": "„",
  "&#8240;": "‰",
  "&#8224;": "†",
  "&#8225;": "‡",
  "&#8254;": "‾",
  "&#8260;": "⁄",
  "&#8377;": "₹",
  "&#36;": "$",
  "&#162;": "¢",
  "&#164;": "¤",
};

/**
 * Decode HTML entities in text
 */
export function decodeHtmlEntities(text: string): string {
  if (!text || typeof text !== "string") return "";

  let decoded = text;

  // Replace named entities
  for (const [entity, replacement] of Object.entries(htmlEntities)) {
    decoded = decoded.replace(new RegExp(entity, "g"), replacement);
  }

  // Replace numeric entities (decimal)
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    try {
      const num = parseInt(dec, 10);
      if (num >= 32 && num <= 126) {
        return String.fromCharCode(num);
      }
      // For special characters, use Unicode escape
      return String.fromCharCode(num);
    } catch (e) {
      return match; // Return original if parsing fails
    }
  });

  // Replace hexadecimal entities
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
    try {
      const num = parseInt(hex, 16);
      return String.fromCharCode(num);
    } catch (e) {
      return match; // Return original if parsing fails
    }
  });

  return decoded;
}

/**
 * Strip HTML tags from text
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== "string") return "";

  return html
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Extract image URL from content and RSS media fields
 */
export function extractImageUrl(
  content: string,
  enclosure?: { url: string; type: string },
  mediaContent?: any,
  mediaThumbnail?: any,
): string | undefined {
  // First check enclosure for image
  if (enclosure && enclosure.type?.startsWith("image/")) {
    return enclosure.url;
  }

  // Check media:content field
  if (mediaContent) {
    if (typeof mediaContent === 'string' && mediaContent.includes('http')) {
      const urlMatch = mediaContent.match(/url=["']?([^"'\s>]+)/i);
      if (urlMatch && urlMatch[1]) return urlMatch[1];
    } else if (mediaContent.$ && mediaContent.$.url) {
      return mediaContent.$.url;
    }
  }

  // Check media:thumbnail field  
  if (mediaThumbnail) {
    if (typeof mediaThumbnail === 'string' && mediaThumbnail.includes('http')) {
      const urlMatch = mediaThumbnail.match(/url=["']?([^"'\s>]+)/i);
      if (urlMatch && urlMatch[1]) return urlMatch[1];
    } else if (mediaThumbnail.$ && mediaThumbnail.$.url) {
      return mediaThumbnail.$.url;
    }
  }

  if (!content) return undefined;

  // Look for img tags in content
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }

  // Look for media URLs in content
  const mediaMatch = content.match(
    /url=["']([^"']+\.(?:jpg|jpeg|png|gif|webp|svg))["']/i,
  );
  if (mediaMatch && mediaMatch[1]) {
    return mediaMatch[1];
  }

  // Look for direct image URLs in content
  const directImgMatch = content.match(
    /https?:\/\/[^\s<>"]+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^\s<>"]*)?/i,
  );
  if (directImgMatch && directImgMatch[0]) {
    return directImgMatch[0];
  }

  return undefined;
}

/**
 * Calculate reading time based on word count
 */
export function calculateReadingTime(content: string): number {
  if (!content) return 1;

  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / wordsPerMinute);

  return Math.max(1, readingTime);
}

/**
 * Enhance content with news-specific information for better ranking
 */
export function enhanceContentForNews(content: string, title: string, description: string, source: NewsSource): string {
  if (!content && !description) return title;
  
  let enhancedContent = content || description || '';
  
  // Add news context
  if (enhancedContent.length < 200) {
    enhancedContent += `\n\nThis is a breaking news story from ${source.name}. `;
    enhancedContent += `Stay informed with the latest ${source.category} news and updates. `;
    enhancedContent += `For more comprehensive coverage of this developing story, visit the original source.`;
  }
  
  return enhancedContent;
}

/**
 * Extract news-specific keywords
 */
export function extractNewsKeywords(title: string, description: string, content: string): string[] {
  const text = `${title} ${description} ${content}`.toLowerCase();
  const newsKeywords = [
    'breaking', 'urgent', 'latest', 'developing', 'exclusive', 'report', 'update',
    'announces', 'confirms', 'reveals', 'investigation', 'crisis', 'emergency',
    'warning', 'alert', 'statement', 'press release', 'official', 'government',
    'president', 'minister', 'ceo', 'chairman', 'spokesperson', 'analyst'
  ];
  
  return newsKeywords.filter(keyword => text.includes(keyword));
}

/**
 * Extract location information from content
 */
export function extractLocation(content: string): string | undefined {
  const locationPatterns = [
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\b/, // City, State
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+)\b/, // City, Country
    /\bWASHINGTON\b|\bLONDON\b|\bPARIS\b|\bTOKYO\b|\bBERLIN\b|\bMOSCOW\b/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = content.match(pattern);
    if (match) return match[0];
  }
  
  return undefined;
}

/**
 * Determine news urgency based on content
 */
export function determineNewsUrgency(title: string, content: string): 'breaking' | 'urgent' | 'normal' | 'low' {
  const text = `${title} ${content}`.toLowerCase();
  
  if (text.includes('breaking') || text.includes('urgent') || text.includes('emergency')) {
    return 'breaking';
  }
  if (text.includes('developing') || text.includes('just in') || text.includes('alert')) {
    return 'urgent';
  }
  if (text.includes('update') || text.includes('latest')) {
    return 'normal';
  }
  
  return 'low';
}

/**
 * Categorize news type based on source and content
 */
export function categorizeNewsType(category: string, title: string, content: string): 'breaking' | 'politics' | 'business' | 'sports' | 'technology' | 'science' | 'entertainment' | 'general' {
  const text = `${title} ${content}`.toLowerCase();
  
  if (text.includes('breaking') || text.includes('urgent')) return 'breaking';
  
  switch (category) {
    case 'government': return 'politics';
    case 'business': return 'business';
    case 'sports': return 'sports';
    case 'technology': return 'technology';
    case 'science': return 'science';
    case 'entertainment': return 'entertainment';
    default: return 'general';
  }
}

/**
 * Generate article slug from title and date
 */
export function generateArticleSlug(title: string, pubDate: string): string {
  let date: Date;
  try {
    // Handle timezone formats for better parsing
    let normalizedDate = pubDate;
    if (typeof pubDate === 'string') {
      normalizedDate = pubDate.replace(' BST', ' +0100').replace(' GMT', ' +0000');
    }
    
    date = new Date(normalizedDate);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
  } catch (error) {
    // Use current date if pubDate is invalid
    console.warn(`Invalid pubDate "${pubDate}", using current date for slug generation`);
    date = new Date();
  }
  
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
  const titleSlug = slugify(title);

  return `${dateStr}-${titleSlug}`;
}

/**
 * Create RSS parser with custom options
 */
export function createRSSParser(): Parser {
  return new Parser({
    customFields: {
      feed: ["language", "copyright", "managingEditor", "webMaster"],
      item: [
        ["media:content", "mediaContent"],
        ["media:thumbnail", "mediaThumbnail"],
        ["content:encoded", "contentEncoded"],
        ["dc:creator", "creator"],
        ["dc:date", "dcDate"],
        "author",
        "category",
        "comments",
        "enclosure",
        "guid",
        "source",
      ],
    },
    timeout: 10000,
    maxRedirects: 3,
  });
}

/**
 * Parse RSS feed item into Article format
 */
export function parseRSSItem(
  item: any,
  source: NewsSource,
  feedUrl?: string,
): Article {
  const title = decodeHtmlEntities(stripHtml(item.title || ""));
  const description = decodeHtmlEntities(
    stripHtml(item.summary || item.description || ""),
  );
  const content = decodeHtmlEntities(
    stripHtml(
      item.contentEncoded ||
        item.content ||
        item.summary ||
        item.description ||
        "",
    ),
  );

  // Handle pubDate with validation
  let pubDate: string;
  const rawDate = item.pubDate || item.dcDate || item.isoDate;
  if (rawDate) {
    try {
      // Handle BST and other timezone formats by replacing with standard formats
      let normalizedDate = rawDate;
      if (typeof rawDate === 'string') {
        // Replace BST with +0100 for better parsing
        normalizedDate = rawDate.replace(' BST', ' +0100').replace(' GMT', ' +0000');
      }
      
      const parsedDate = new Date(normalizedDate);
      if (!isNaN(parsedDate.getTime())) {
        pubDate = parsedDate.toISOString();
      } else {
        throw new Error('Invalid date format');
      }
    } catch (error) {
      console.warn(`Invalid date format "${rawDate}" for article "${title}", using current date`);
      pubDate = new Date().toISOString();
    }
  } else {
    pubDate = new Date().toISOString();
  }
  
  const originalAuthor = item.creator || item.author || item["dc:creator"] || "";

  // Extract image
  const imageUrl = extractImageUrl(
    item.contentEncoded || item.content || item.summary || "",
    item.enclosure,
    item.mediaContent,
    item.mediaThumbnail,
  );

  // Generate unique ID
  const id =
    item.guid || item.link || `${source.name}-${Date.now()}-${Math.random()}`;

  // Generate slug
  const slug = generateArticleSlug(title, pubDate);

  // Extract tags/categories
  const tags: string[] = [];
  if (item.categories) {
    if (Array.isArray(item.categories)) {
      tags.push(
        ...item.categories.map((cat: any) =>
          typeof cat === "string" ? cat : cat._ || cat.name || "",
        ),
      );
    } else if (typeof item.categories === "string") {
      tags.push(item.categories);
    }
  }

  // Enhanced content for news ranking
  const enhancedContent = enhanceContentForNews(content, title, description, source);
  
  const article: Article = {
    id: String(id),
    title,
    description,
    content: enhancedContent,
    link: item.link || "",
    pubDate,
    author: originalAuthor ? decodeHtmlEntities(stripHtml(originalAuthor)) : source.name, // Keep original author for UI display
    source: source.name,
    sourceColor: source.color,
    category: source.category,
    slug,
    image: imageUrl,
    tags: tags.filter((tag) => tag && tag.length > 0),
    readingTime: calculateReadingTime(enhancedContent),
    // News-specific metadata
    newsKeywords: extractNewsKeywords(title, description, content),
    location: extractLocation(content),
    urgency: determineNewsUrgency(title, content),
    originalSource: source.name,
    creditLine: `Originally published by ${source.name}`,
    newsType: categorizeNewsType(source.category, title, content),
  };

  return article;
}

/**
 * Fetch and parse RSS feed
 */
export async function fetchAndParseRSS(source: NewsSource): Promise<Article[]> {
  try {
    const parser = createRSSParser();
    const feed = await parser.parseURL(source.url);

    if (!feed.items || feed.items.length === 0) {
      console.warn(`No items found in feed: ${source.name}`);
      return [];
    }

    const articles = feed.items
      .slice(0, 20) // Limit to 20 most recent items per feed
      .map((item) => parseRSSItem(item, source, source.url))
      .filter((article) => article.title && article.link); // Filter out invalid articles

    console.log(`Parsed ${articles.length} articles from ${source.name}`);
    return articles;
  } catch (error) {
    console.error(
      `Error parsing RSS feed ${source.name} (${source.url}):`,
      error,
    );
    return [];
  }
}

/**
 * Fetch articles from multiple RSS feeds
 */
export async function fetchArticlesFromSources(
  sources: NewsSource[],
): Promise<Article[]> {
  console.log(`Fetching articles from ${sources.length} sources...`);

  const promises = sources.map((source) => fetchAndParseRSS(source));
  const results = await Promise.allSettled(promises);

  const allArticles: Article[] = [];
  let successCount = 0;
  let errorCount = 0;

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      allArticles.push(...result.value);
      successCount++;
    } else {
      console.error(
        `Failed to fetch from ${sources[index].name}:`,
        result.reason,
      );
      errorCount++;
    }
  });

  console.log(
    `Successfully fetched from ${successCount} sources, ${errorCount} failed`,
  );
  console.log(`Total articles fetched: ${allArticles.length}`);

  // Sort by publication date (newest first) and remove duplicates
  const uniqueArticles = removeDuplicates(allArticles);
  const sortedArticles = uniqueArticles.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
  );

  return sortedArticles;
}

/**
 * Remove duplicate articles based on title similarity and URL
 */
function removeDuplicates(articles: Article[]): Article[] {
  const seen = new Set<string>();
  const uniqueArticles: Article[] = [];

  for (const article of articles) {
    // Create a key based on normalized title and link
    const normalizedTitle = article.title
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .trim();
    const key = `${normalizedTitle}-${article.link}`;

    if (!seen.has(key)) {
      seen.add(key);
      uniqueArticles.push(article);
    }
  }

  console.log(
    `Removed ${articles.length - uniqueArticles.length} duplicate articles`,
  );
  return uniqueArticles;
}
