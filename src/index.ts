import 'dotenv/config';
import cron from 'node-cron';
import { fetchAllSources } from './fetcher.js';
import { parseArticles } from './parser.js';
import { summarizeArticles } from './summarizer.js';
import { filterLast24Hours, deduplicateByUrl, markHighlights } from './filter.js';
import { formatDigest } from './formatter.js';
import { writeDigest } from './output.js';
import { DigestStats } from './types.js';

function parseArgs(): { quiet: boolean; cron: boolean } {
  const quiet = process.argv.includes('--quiet') || process.argv.includes('-q');
  const isCron = process.argv.includes('-cron') || process.argv.includes('--cron');
  return { quiet, cron: isCron };
}

async function runDigest(quiet: boolean) {
  const publishedAt = new Date();

  if (!quiet) {
    console.log('🤖 AI新闻聚合CLI — 开始抓取\n');
  }

  const fetchResults = await fetchAllSources(quiet);
  const articles = deduplicateByUrl(parseArticles(fetchResults));

  if (articles.length > 0) {
    if (!quiet) console.log('\n🤖 开始生成AI摘要...\n');
    await summarizeArticles(articles, quiet);
  }

  const recentArticles = filterLast24Hours(markHighlights(articles));

  if (!quiet) {
    console.log(`\n抓取完成，共解析 ${articles.length} 篇文章`);
    console.log(`过滤后（24小时内）: ${recentArticles.length} 篇`);
  }

  const failedSources = fetchResults
    .filter(r => r.error)
    .map(r => r.source);

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
}

async function main() {
  const { quiet, cron: isCronMode } = parseArgs();

  if (isCronMode) {
    console.log('⏰ 定时模式已启动，每天早上 8:00 自动生成日报');
    cron.schedule('0 8 * * *', () => {
      console.log('\n🤖 [定时任务] 开始抓取...\n');
      runDigest(false).catch(err => {
        console.error('❌ 错误:', err);
      });
    });
    return;
  }

  await runDigest(quiet);
}

main().catch(err => {
  console.error('❌ 错误:', err);
  process.exit(1);
});
