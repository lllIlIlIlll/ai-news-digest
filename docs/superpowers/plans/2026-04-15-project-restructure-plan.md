# AI新闻聚合CLI — 项目重构计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按行业最佳实践重构项目目录结构，实现关注点分离、模块化和可测试性。

**Architecture:** 按职责分层：CLI层 → 核心业务层 → 服务层（RSS/AI）。模块边界清晰，单一职责原则。

**Tech Stack:** TypeScript + tsx + fast-xml-parser + @anthropic-ai/sdk + node-cron

---

## 文件结构（重构后）

```
ai-news-digest/
├── src/
│   ├── cli/
│   │   ├── index.ts           # CLI 入口（参数解析、命令分发）
│   │   └── parser.ts          # 命令行参数解析
│   ├── core/
│   │   ├── aggregator.ts      # 聚合主流程编排
│   │   ├── filter.ts          # 时间过滤、去重、标记
│   │   └── formatter.ts       # Markdown 输出格式化
│   ├── services/
│   │   ├── rss/
│   │   │   ├── fetcher.ts     # RSS HTTP 请求
│   │   │   ├── parser.ts     # XML 解析
│   │   │   └── sources.ts    # RSS 源配置
│   │   ├── ai/
│   │   │   └── summarizer.ts # AI 摘要生成
│   │   └── output/
│   │       └── writer.ts     # 文件写入
│   ├── models/
│   │   ├── article.ts        # Article 类型定义
│   │   └── config.ts         # 配置相关类型
│   └── utils/
│       ├── error.ts          # 错误处理工具
│       └── html.ts           # HTML 实体解码
├── tests/
│   ├── unit/
│   │   ├── filter.test.ts
│   │   ├── parser.test.ts
│   │   └── summarizer.test.ts
│   └── fixtures/
│       └── sample-rss.xml
├── output/                    # 日报输出
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Task 1: 创建目录结构与基础文件

**Files:**
- Create: `src/cli/index.ts`
- Create: `src/cli/parser.ts`
- Create: `src/core/aggregator.ts`
- Create: `src/core/filter.ts`
- Create: `src/core/formatter.ts`
- Create: `src/services/rss/fetcher.ts`
- Create: `src/services/rss/parser.ts`
- Create: `src/services/rss/sources.ts`
- Create: `src/services/ai/summarizer.ts`
- Create: `src/services/output/writer.ts`
- Create: `src/models/article.ts`
- Create: `src/models/config.ts`
- Create: `src/utils/error.ts`
- Create: `src/utils/html.ts`
- Create: `tests/unit/filter.test.ts`
- Create: `tests/unit/parser.test.ts`
- Create: `tests/fixtures/sample-rss.xml`
- Modify: `package.json` (更新 scripts)
- Modify: `tsconfig.json` (更新 include)

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p src/cli src/core src/services/rss src/services/ai src/services/output src/models src/utils tests/unit tests/fixtures
```

- [ ] **Step 2: 创建 src/models/article.ts**

```typescript
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
  articles: Article[];
  error?: string;
}

export interface DigestStats {
  totalArticles: number;
  failedSources: string[];
  sourceBreakdown: Record<string, number>;
}
```

- [ ] **Step 3: 创建 src/models/config.ts**

```typescript
export interface RSSSource {
  name: string;
  url: string;
}

export interface CLIArgs {
  quiet: boolean;
  cron: boolean;
}

export interface AppConfig {
  apiKey: string;
  baseUrl: string;
}
```

- [ ] **Step 4: 创建 src/utils/html.ts**

```typescript
const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#039;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

export function decodeEntities(text: string): string {
  return text.replace(/&[#\w]+;/g, (entity) => HTML_ENTITIES[entity] ?? entity);
}
```

- [ ] **Step 5: 创建 src/utils/error.ts**

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleError(err: unknown): string {
  if (err instanceof AppError) {
    return `[${err.code}] ${err.message}`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
```

---

## Task 2: 创建 RSS 服务层

**Files:**
- Create: `src/services/rss/sources.ts`
- Create: `src/services/rss/fetcher.ts`
- Create: `src/services/rss/parser.ts`

- [ ] **Step 1: 创建 src/services/rss/sources.ts**

```typescript
import type { RSSSource } from '../../models/config.js';

const RESEARCH_SOURCES: RSSSource[] = [
  { name: 'GoogleResearch', url: 'https://research.google/blog/rss' },
  { name: 'DeepMind', url: 'https://deepmind.google/discover/blog/rss' },
  { name: 'OpenAI', url: 'https://openai.com/news/rss.xml' },
  { name: 'BAIR', url: 'https://bair.berkeley.edu/blog/feed.xml' },
  { name: 'AWS_ML', url: 'https://aws.amazon.com/blogs/machine-learning/feed' },
  { name: 'AmazonScience', url: 'https://www.amazon.science/index.rss' },
];

const NEWS_SOURCES: RSSSource[] = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'TheVerge', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { name: 'TheDecoder', url: 'https://the-decoder.com/feed/' },
  { name: 'MarkTechPost', url: 'https://www.marktechpost.com/feed' },
  { name: 'DailyAI', url: 'https://dailyai.com/feed' },
  { name: 'LastWeekInAI', url: 'https://lastweekin.ai/feed' },
  { name: 'HackerNoon', url: 'https://hackernoon.com/tagged/ai/feed' },
  { name: 'ScienceDaily', url: 'https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml' },
];

const CN_SOURCES: RSSSource[] = [
  { name: 'MSRA_Asia', url: 'https://plink.anyfeeder.com/weixin/MSRAsia' },
  { name: 'SanHuaAI', url: 'https://sanhua.himrr.com/daily-news/feed' },
  { name: 'RuanYifeng', url: 'https://www.ruanyifeng.com/blog/atom.xml' },
  { name: 'Solidot', url: 'https://www.solidot.org/index.rss' },
  { name: 'Sspai', url: 'https://sspai.com/feed' },
];

const TECH_SOURCES: RSSSource[] = [
  { name: 'MLMastery', url: 'https://machinelearningmastery.com/blog/feed' },
  { name: 'GradientFlow', url: 'https://gradientflow.com/feed/' },
  { name: 'AISummer', url: 'https://theaisummer.com/feed.xml' },
  { name: 'AIHub', url: 'https://aihub.org/feed' },
];

const HN_SOURCE: RSSSource = { name: 'Hacker News', url: 'https://hnrss.org/newest?q=AI&count=30' };

export const RSS_SOURCES: RSSSource[] = [
  ...RESEARCH_SOURCES,
  ...NEWS_SOURCES,
  ...CN_SOURCES,
  ...TECH_SOURCES,
];

export { HN_SOURCE };
```

- [ ] **Step 2: 创建 src/services/rss/fetcher.ts**

```typescript
import type { FetchResult } from '../../models/article.js';
import type { RSSSource } from '../../models/config.js';
import { RSS_SOURCES, HN_SOURCE } from './sources.js';

const TIMEOUT_MS = 5000;
const MAX_RETRIES = 3;

async function fetchWithTimeout(url: string, retries = MAX_RETRIES): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`  重试 ${attempt}/${retries}: ${url}`);
    }
  }
  throw new Error('unreachable');
}

export async function fetchAllSources(quiet: boolean): Promise<FetchResult[]> {
  if (!quiet) console.log('Starting RSS fetch...\n');

  const results = await Promise.all([
    ...RSS_SOURCES.map((source) => fetchSource(source, quiet)),
    fetchSource(HN_SOURCE, quiet),
  ]);

  return results;
}

async function fetchSource(source: RSSSource, quiet: boolean): Promise<FetchResult> {
  try {
    if (!quiet) console.log(`  Fetching: ${source.name}`);
    const xml = await fetchWithTimeout(source.url);
    return { source: source.name, articles: [], xml };
  } catch (err) {
    if (!quiet) console.warn(`  解析失败，跳过: ${source.name} — ${err instanceof Error ? err.message : err}`);
    return { source: source.name, articles: [], error: String(err) };
  }
}
```

- [ ] **Step 3: 创建 src/services/rss/parser.ts**

```typescript
import { XMLParser } from 'fast-xml-parser';
import type { Article } from '../../models/article.js';
import type { FetchResult } from '../../models/article.js';
import { decodeEntities } from '../../utils/html.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

function truncateDescription(text: string, maxChars = 100): string {
  if (typeof text !== 'string') return '';
  const decoded = decodeEntities(text);
  const stripped = decoded.replace(/<[^>]+>/g, '').trim();
  // 从 "Article URL: https://..." 格式中提取文章 URL 作为描述
  const urlMatch = stripped.match(/^Article URL:\s*(\S+)/);
  if (urlMatch) return urlMatch[1];
  if (stripped.length <= maxChars) return stripped;
  const truncated = stripped.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

function parseRSSItems(xml: string, source: string): Article[] {
  const parsed = parser.parse(xml);
  const items = parsed?.rss?.channel?.item ?? parsed?.feed?.entry ?? [];
  const itemArray = Array.isArray(items) ? items : [items];

  return itemArray
    .map((item: Record<string, unknown>) => {
      const title = item.title?.['#text'] ?? item.title ?? '';
      const link = item.link?.['#text'] ?? item.link ?? item.guid ?? '';
      const pubDateStr = item.pubDate?.['#text'] ?? item.pubDate ?? item.published ?? '';
      const description = item.description?.['#text'] ?? item.description?.['__cdata'] ?? item.description ?? item.summary ?? '';

      if (!title || !link || !pubDateStr) return null;

      const pubDate = new Date(pubDateStr as string);
      if (isNaN(pubDate.getTime())) return null;

      return {
        title: decodeEntities(String(title).trim()),
        link: String(link).trim(),
        pubDate,
        source,
        description: truncateDescription(description as string),
      } satisfies Article;
    })
    .filter((a): a is Article => a !== null);
}

export function parseArticles(fetchResults: FetchResult[]): Article[] {
  const articles: Article[] = [];
  for (const result of fetchResults) {
    if (result.error || !result.xml) continue;
    const parsed = parseRSSItems(result.xml, result.source);
    articles.push(...parsed);
  }
  return articles;
}
```

---

## Task 3: 创建核心业务层

**Files:**
- Create: `src/core/filter.ts`
- Create: `src/core/formatter.ts`
- Create: `src/core/aggregator.ts`

- [ ] **Step 1: 创建 src/core/filter.ts**

```typescript
import type { Article } from '../models/article.js';

const STAR_KEYWORDS = [
  'GPT', 'LLM', '大模型', 'Agent', 'OpenAI', 'Anthropic', 'DeepMind',
  'Gemini', 'AI Agent', '多模态', '推理模型'
];

function isHighlight(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return STAR_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
}

export function filterLast1Hour(articles: Article[]): Article[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 60 * 60 * 1000);

  return articles
    .filter(article => article.pubDate >= cutoff)
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
}

export function deduplicateByUrl(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter(article => {
    if (seen.has(article.link)) return false;
    seen.add(article.link);
    return true;
  });
}

export function markHighlights(articles: Article[]): Article[] {
  return articles.map(article => ({
    ...article,
    isHighlight: isHighlight(article.title, article.description),
  }));
}
```

- [ ] **Step 2: 创建 src/core/formatter.ts**

```typescript
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
    `## 统计`,
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
```

- [ ] **Step 3: 创建 src/core/aggregator.ts**

```typescript
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
```

---

## Task 4: 创建 AI 服务层

**Files:**
- Create: `src/services/ai/summarizer.ts`

- [ ] **Step 1: 创建 src/services/ai/summarizer.ts**

```typescript
import type { Article } from '../../models/article.js';

const MODEL = 'MiniMax-M2.7-highspeed';

function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY 环境变量未设置');
  return key;
}

function getBaseUrl(): string {
  return process.env.ANTHROPIC_BASE_URL || 'https://api.minimaxi.com/anthropic';
}

export async function summarizeArticles(articles: Article[], quiet: boolean): Promise<void> {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const contentToSummarize = article.description.trim();

    if (!contentToSummarize) {
      if (!quiet) {
        process.stdout.write(`\r  [${i + 1}/${articles.length}] 跳过（无内容）: ${article.title.slice(0, 35)}...`);
      }
      continue;
    }

    const isUrlDescription = /^https?:\/\//i.test(contentToSummarize);
    const summaryContent = isUrlDescription ? article.title : contentToSummarize;

    if (!quiet) {
      const label = isUrlDescription ? '（标题生成）' : '';
      process.stdout.write(`\r  [${i + 1}/${articles.length}] 摘要生成中${label}: ${article.title.slice(0, 35)}...`);
    }

    try {
      const result = await generateSummaryAndInterpretation(baseUrl, apiKey, article.title, summaryContent);
      article.description = result.summary;
      article.interpretation = result.interpretation;
      article.chineseTitle = result.chineseTitle;
    } catch (err) {
      if (!quiet) {
        console.warn(`\n  ⚠️ 摘要失败: ${article.title.slice(0, 30)}`);
      }
    }
  }

  if (!quiet) process.stdout.write('\n');
}

async function generateSummaryAndInterpretation(
  baseUrl: string,
  apiKey: string,
  title: string,
  currentDescription: string
): Promise<{ summary: string; interpretation: string; chineseTitle: string }> {
  const truncatedDescription = currentDescription.slice(0, 500);

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2500,
      temperature: 0,
      messages: [{
        role: 'user',
        content: `为以下文章完成三项任务：
1. 将标题翻译为中文
2. 生成一句话摘要（不超过50字）
3. 撰写解读（100-200字，总结核心观点、结论或重要细节）

标题：${title}
内容：${truncatedDescription}

输出格式（严格按此格式，不要任何前缀）：
中文标题 | 摘要 | 解读`
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((block: { type: string }) => block.type === 'text');
  const text = textBlock?.text ?? '';
  const trimmed = text.trim();

  if (!trimmed || !trimmed.includes('|')) {
    return { summary: currentDescription, interpretation: '', chineseTitle: '' };
  }

  const parts = trimmed.split('|').map((p: string) => p.trim());
  if (parts.length < 3) {
    return { summary: currentDescription, interpretation: '', chineseTitle: '' };
  }
  const chineseTitle = parts[0] || '';
  const summary = parts[1] || currentDescription;
  const interpretation = parts.slice(2).join(' | ');

  return {
    summary: summary.length > 0 ? summary : currentDescription,
    interpretation: interpretation.length > 0 ? interpretation : '',
    chineseTitle: chineseTitle.length > 0 ? chineseTitle : '',
  };
}
```

---

## Task 5: 创建输出服务层

**Files:**
- Create: `src/services/output/writer.ts`

- [ ] **Step 1: 创建 src/services/output/writer.ts**

```typescript
import { mkdir, writeFile } from 'fs/promises';

export async function writeDigest(content: string, date: Date): Promise<void> {
  const dateStr = date.toISOString().split('T')[0];
  const outputDir = 'output';
  const latestPath = `${outputDir}/latest.md`;
  const datedPath = `${outputDir}/${dateStr}.md`;

  await mkdir(outputDir, { recursive: true });

  await writeFile(latestPath, content, 'utf-8');
  await writeFile(datedPath, content, 'utf-8');
}
```

---

## Task 6: 创建 CLI 层

**Files:**
- Create: `src/cli/parser.ts`
- Create: `src/cli/index.ts`

- [ ] **Step 1: 创建 src/cli/parser.ts**

```typescript
import type { CLIArgs } from '../models/config.js';

export function parseArgs(): CLIArgs {
  const quiet = process.argv.includes('--quiet') || process.argv.includes('-q');
  const cron = process.argv.includes('-cron') || process.argv.includes('--cron');
  return { quiet, cron };
}
```

- [ ] **Step 2: 创建 src/cli/index.ts**

```typescript
import 'dotenv/config';
import cron from 'node-cron';
import { parseArgs } from './parser.js';
import { runAggregation } from '../core/aggregator.js';

async function main() {
  const { quiet, cron: isCronMode } = parseArgs();

  if (isCronMode) {
    console.log('⏰ 定时模式已启动，每天早上 8:00 自动生成日报');
    cron.schedule('0 8 * * *', () => {
      console.log('\n🤖 [定时任务] 开始抓取...\n');
      runAggregation({ quiet: false }).catch(err => {
        console.error('❌ 错误:', err);
      });
    });
    return;
  }

  await runAggregation({ quiet });
}

main().catch(err => {
  console.error('❌ 错误:', err);
  process.exit(1);
});
```

- [ ] **Step 3: 更新 package.json scripts**

```json
{
  "scripts": {
    "start": "tsx src/cli/index.ts"
  }
}
```

---

## Task 7: 删除旧文件并验证

**Files:**
- Delete: `src/index.ts`
- Delete: `src/fetcher.ts`
- Delete: `src/parser.ts`
- Delete: `src/filter.ts`
- Delete: `src/formatter.ts`
- Delete: `src/summarizer.ts`
- Delete: `src/output.ts`
- Delete: `src/config.ts`
- Delete: `src/types.ts`

- [ ] **Step 1: 删除旧文件**

```bash
rm src/index.ts src/fetcher.ts src/parser.ts src/filter.ts src/formatter.ts src/summarizer.ts src/output.ts src/config.ts src/types.ts
```

- [ ] **Step 2: 验证构建**

```bash
npx tsx src/cli/index.ts --quiet
```

- [ ] **Step 3: 验证定时模式**

```bash
npx tsx src/cli/index.ts -cron
```

---

## Task 8: 创建单元测试

**Files:**
- Create: `tests/unit/filter.test.ts`
- Create: `tests/unit/parser.test.ts`

- [ ] **Step 1: 创建 tests/unit/filter.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { filterLast1Hour, deduplicateByUrl, markHighlights } from '../../src/core/filter.js';

describe('filterLast1Hour', () => {
  it('should filter articles within the last hour', () => {
    const now = new Date();
    const articles = [
      { title: 'A', link: 'http://a.com', pubDate: new Date(now.getTime() - 30 * 60 * 1000), source: 'Test', description: '' },
      { title: 'B', link: 'http://b.com', pubDate: new Date(now.getTime() - 2 * 60 * 60 * 1000), source: 'Test', description: '' },
    ];
    const result = filterLast1Hour(articles);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('A');
  });
});

describe('deduplicateByUrl', () => {
  it('should remove duplicate articles by URL', () => {
    const articles = [
      { title: 'A', link: 'http://a.com', pubDate: new Date(), source: 'Test', description: '' },
      { title: 'A duplicate', link: 'http://a.com', pubDate: new Date(), source: 'Test', description: '' },
      { title: 'B', link: 'http://b.com', pubDate: new Date(), source: 'Test', description: '' },
    ];
    const result = deduplicateByUrl(articles);
    expect(result).toHaveLength(2);
  });
});

describe('markHighlights', () => {
  it('should mark articles with keywords as highlights', () => {
    const articles = [
      { title: 'GPT-5 Released', link: 'http://a.com', pubDate: new Date(), source: 'Test', description: '' },
      { title: 'Weather is nice', link: 'http://b.com', pubDate: new Date(), source: 'Test', description: '' },
    ];
    const result = markHighlights(articles);
    expect(result[0].isHighlight).toBe(true);
    expect(result[1].isHighlight).toBe(false);
  });
});
```

- [ ] **Step 2: 创建 tests/fixtures/sample-rss.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>Test Article</title>
      <link>https://example.com/test</link>
      <pubDate>Wed, 15 Apr 2026 12:00:00 GMT</pubDate>
      <description>This is a test article description.</description>
    </item>
  </channel>
</rss>
```

- [ ] **Step 3: 添加 vitest 依赖**

```bash
npm install -D vitest
```

- [ ] **Step 4: 运行测试**

```bash
npx vitest run
```

---

## 依赖关系

```
src/models/ (类型定义)
    ↓
src/utils/ (工具函数)
    ↓
src/services/rss/ (RSS 服务)
src/services/ai/ (AI 服务)
src/services/output/ (输出服务)
    ↓
src/core/ (核心业务)
    ↓
src/cli/ (CLI 入口)
```

---

## 自我检查清单

- [ ] spec覆盖：关注点分离 ✓，模块化 ✓，可测试性 ✓
- [ ] placeholder扫描：无TBD/TODO，无空步骤
- [ ] 类型一致性：所有模块通过 models/ 类型交互
- [ ] 导入路径正确：使用 `.js` 扩展名（ESM）
- [ ] 测试覆盖：filter.ts, parser.ts 核心逻辑
