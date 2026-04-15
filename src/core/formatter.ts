import type { Article, DigestStats } from '../models/article.js';

export function formatDigest(
  articles: Article[],
  stats: DigestStats,
  publishedAt: Date
): string {
  const sourcesCount = Object.keys(stats.sourceBreakdown).filter(k => stats.sourceBreakdown[k] > 0).length;
  const dateStr = publishedAt.toISOString().split('T')[0];
  const timeStr = publishedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  const sourceList = Object.keys(stats.sourceBreakdown)
    .filter(k => stats.sourceBreakdown[k] > 0)
    .join(' / ');

  const lines: string[] = [
    `# AI新闻日报 — ${dateStr}`,
    '',
    `> 自动聚合自 ${sourceList}，发布于 ${timeStr}`,
    '',
    '## 统计',
    `共收录 ${stats.totalArticles} 篇，来自 ${sourcesCount} 个源${stats.failedSources.length > 0 ? `\n> 抓取失败: ${stats.failedSources.join(', ')}` : ''}`,
    '',
    '---',
    '',
  ];

  for (const article of articles) {
    const timeLabel = article.pubDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const highlightTag = article.isHighlight ? ' ⭐精读' : '';
    const titleLine = article.chineseTitle
      ? `${article.chineseTitle}\n\n*${article.title}*`
      : article.title;
    const interpretationLine = article.interpretation ? `\n\n**解读：**${article.interpretation}` : '';

    lines.push(
      `### [${article.source}] ${titleLine}${highlightTag}`,
      '',
      `> **摘要：**${article.description}${interpretationLine}`,
      '',
      `**链接：**${article.link}`,
      '',
      `**时间：**${timeLabel}`,
      '',
      '---',
      ''
    );
  }

  lines.push(`*由 AI新闻聚合CLI 自动生成*`);

  return lines.join('\n');
}
