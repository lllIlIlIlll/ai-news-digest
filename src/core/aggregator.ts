import type { Article, DigestStats, FetchResult } from '../models/article.js';
import { fetchAllSources } from '../services/rss/fetcher.js';
import { parseArticles } from '../services/rss/parser.js';
import { filterLast1Hour, deduplicateByUrl, markHighlights } from './filter.js';
import { summarizeArticles } from '../services/ai/summarizer.js';
import { formatDigest } from './formatter.js';
import { writeDigest } from '../services/output/writer.js';

export interface AggregatorOptions {
  quiet: boolean;
}

export interface AggregatorResult {
  articles: Article[];
  stats: DigestStats;
  publishedAt: Date;
}

export async function runAggregation(options: AggregatorOptions): Promise<AggregatorResult> {
  const { quiet } = options;
  const publishedAt = new Date();

  if (!quiet) {
    console.log('🤖 AI新闻聚合CLI — 开始抓取\n');
  }

  const fetchResults = await fetchAllSources(quiet);
  const articles = deduplicateByUrl(parseArticles(fetchResults));
  const recentArticles = filterLast1Hour(markHighlights(articles));

  if (recentArticles.length > 0) {
    if (!quiet) console.log('\n🤖 开始生成AI摘要...\n');
    await summarizeArticles(recentArticles, quiet);
  }

  if (!quiet) {
    console.log(`\n抓取完成，共解析 ${articles.length} 篇文章`);
    console.log(`过滤后（1小时内）: ${recentArticles.length} 篇`);
  }

  const failedSources = fetchResults
    .filter((r: FetchResult) => r.error)
    .map((r: FetchResult) => r.source);

  const sourceBreakdown: Record<string, number> = {};
  for (const a of recentArticles) {
    sourceBreakdown[a.source] = (sourceBreakdown[a.source] ?? 0) + 1;
  }

  const stats: DigestStats = {
    totalArticles: recentArticles.length,
    failedSources,
    sourceBreakdown,
  };

  const markdown = formatDigest(recentArticles, stats, publishedAt);
  await writeDigest(markdown, publishedAt);

  if (!quiet) {
    console.log(`\n✅ 日报已生成: output/latest.md`);
    if (failedSources.length > 0) {
      console.warn(`⚠️ 失败源: ${failedSources.join(', ')}`);
    }
  }

  return { articles: recentArticles, stats, publishedAt };
}
