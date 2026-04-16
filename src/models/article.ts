/** 单条新闻文章 */
export interface Article {
  title: string;
  link: string;
  pubDate: Date;
  source: string;
  description: string;
  chineseTitle?: string;
  interpretation?: string;
  isHighlight?: boolean;
}

export interface FetchResult {
  source: Article['source'];
  xml?: string;
  error?: string;
  skipped?: boolean;
}

export interface DigestStats {
  totalArticles: number;
  failedSources: string[];
  sourceBreakdown: Record<string, number>;
}
