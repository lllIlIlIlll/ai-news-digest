/** 单条新闻文章 */
export interface Article {
  title: string;
  link: string;
  pubDate: Date;
  source: 'TechCrunch' | 'The Verge' | 'Hacker News';
  /** 摘要：description前100字 */
  description: string;
}

/** 单一来源的抓取结果 */
export interface FetchResult {
  source: Article['source'];
  articles: Article[];
  error?: string;
}

/** CLI 命令行参数 */
export interface CLIArgs {
  quiet: boolean;
}

/** 新闻聚合统计信息 */
export interface DigestStats {
  totalArticles: number;
  failedSources: Article['source'][];
  sourceBreakdown: Record<string, number>;
}
