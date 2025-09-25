import type { NewsCategory, NewsSource } from "../types";

export const newsCategories: NewsCategory[] = [
  {
    id: "general",
    name: "World",
    color: "bg-gray-600",
    description: "Global news and current events",
  },
  {
    id: "government",
    name: "Politics",
    color: "bg-gray-700",
    description: "Political news and government updates",
  },
  {
    id: "business",
    name: "Business",
    color: "bg-green-600",
    description: "Business, finance, and economic news",
  },
  {
    id: "science",
    name: "Science",
    color: "bg-purple-600",
    description: "Scientific discoveries and research",
  },
  {
    id: "technology",
    name: "Technology",
    color: "bg-green-500",
    description: "Tech news and innovation",
  },
  {
    id: "entertainment",
    name: "Arts",
    color: "bg-yellow-600",
    description: "Entertainment, arts, and culture",
  },
  {
    id: "sports",
    name: "Sports",
    color: "bg-red-600",
    description: "Sports news and updates",
  },
  {
    id: "environment",
    name: "Climate",
    color: "bg-green-700",
    description: "Environmental and climate news",
  },
];

export const newsSources: NewsSource[] = [
  // World News
  {
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/rss.xml",
    category: "general",
    color: "bg-red-600",
  },
  {
    name: "Reuters",
    url: "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best",
    category: "general",
    color: "bg-orange-500",
  },
  {
    name: "NPR",
    url: "https://feeds.npr.org/1001/rss.xml",
    category: "general",
    color: "bg-purple-600",
  },

  // Politics
  {
    name: "GOV.UK",
    url: "https://www.gov.uk/search/news-and-communications.atom",
    category: "government",
    color: "bg-gray-700",
  },
  {
    name: "BBC Politics",
    url: "https://feeds.bbci.co.uk/news/politics/rss.xml",
    category: "government",
    color: "bg-red-600",
  },

  // Business
  {
    name: "Financial Times",
    url: "https://www.ft.com/rss/home/uk",
    category: "business",
    color: "bg-pink-600",
  },
  {
    name: "MarketWatch",
    url: "https://feeds.marketwatch.com/marketwatch/topstories/",
    category: "business",
    color: "bg-emerald-600",
  },
  {
    name: "PR Newswire",
    url: "https://www.prnewswire.com/rss/all-news-releases-list.rss",
    category: "business",
    color: "bg-green-600",
  },

  // Technology
  {
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    category: "technology",
    color: "bg-green-500",
  },
  {
    name: "Ars Technica",
    url: "http://feeds.arstechnica.com/arstechnica/index",
    category: "technology",
    color: "bg-orange-600",
  },

  // Science
  {
    name: "NASA",
    url: "https://www.nasa.gov/feed/",
    category: "science",
    color: "bg-slate-700",
  },
  {
    name: "Science Daily",
    url: "https://www.sciencedaily.com/rss/all.xml",
    category: "science",
    color: "bg-violet-600",
  },

  // Sports
  {
    name: "ESPN",
    url: "https://www.espn.com/espn/rss/news",
    category: "sports",
    color: "bg-red-700",
  },
  {
    name: "BBC Sport",
    url: "https://feeds.bbci.co.uk/sport/rss.xml",
    category: "sports",
    color: "bg-red-600",
  },
  {
    name: "Sky Sports",
    url: "https://www.skysports.com/rss/12040",
    category: "sports",
    color: "bg-times-600",
  },

  // Entertainment
  {
    name: "Variety",
    url: "https://variety.com/feed/",
    category: "entertainment",
    color: "bg-yellow-600",
  },
  {
    name: "Rolling Stone",
    url: "https://www.rollingstone.com/feed/",
    category: "entertainment",
    color: "bg-red-500",
  },
  {
    name: "IGN",
    url: "https://feeds.ign.com/ign/all",
    category: "entertainment",
    color: "bg-orange-500",
  },

  // Environment
  {
    name: "Climate.gov",
    url: "https://www.climate.gov/news-features/feed",
    category: "environment",
    color: "bg-times-500",
  },
];

export const getCategoryById = (id: string): NewsCategory | undefined => {
  return newsCategories.find((category) => category.id === id);
};

export const getSourcesByCategory = (categoryId: string): NewsSource[] => {
  return newsSources.filter((source) => source.category === categoryId);
};

export const getAllCategories = (): NewsCategory[] => {
  return newsCategories;
};

export const getAllSources = (): NewsSource[] => {
  return newsSources;
};

export const getCategoryColor = (categoryId: string): string => {
  const category = getCategoryById(categoryId);
  return category?.color || "bg-gray-500";
};
