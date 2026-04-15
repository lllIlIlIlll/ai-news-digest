# AI新闻聚合CLI工具 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从 20+ 个 RSS 源抓取 AI 新闻，过滤近1小时文章，URL去重，AI生成摘要，输出 Markdown 日报到 `output/` 目录，支持 ⭐精读标记和定时任务。

**Architecture:** 并发抓取 20+ 个 RSS 源，独立重试，解析后严格按1小时过滤+URL去重，按时间倒序输出 Markdown。双文件输出：latest.md + YYYY-MM-DD.md。

**Tech Stack:** TypeScript + tsx（直接运行）+ fast-xml-parser（RSS解析）+ @anthropic-ai/sdk（AI摘要）+ node-cron（定时任务）

---

## 文件结构

```
ai-news-digest/
├── src/
│   ├── index.ts        # CLI入口、参数解析、主流程编排
│   ├── fetcher.ts      # RSS HTTP请求（并发抓取、重试逻辑）
│   ├── parser.ts       # XML解析：提取标题/链接/时间/来源/摘要
│   ├── filter.ts       # 1小时过滤、URL去重、⭐精读标记
│   ├── formatter.ts    # Markdown日报生成
│   ├── summarizer.ts   # AI摘要生成（MiniMax API）
│   ├── output.ts       # 文件写入：latest.md + YYYY-MM-DD.md
│   ├── config.ts       # RSS源配置（20+个源分类管理）
│   └── types.ts        # 类型定义
├── output/              # 日报输出目录（.gitkeep）
├── package.json
└── tsconfig.json
```

---

## Task 1: 项目初始化

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `output/.gitkeep`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "ai-news-digest",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts"
  },
  "dependencies": {
    "fast-xml-parser": "^4.5.0",
    "@anthropic-ai/sdk": "^0.30.0",
    "node-cron": "^4.2.1",
    "dotenv": "^17.4.2"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/node-cron": "^3.0.11",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: 创建 output/.gitkeep**

```
（空文件，保持output目录存在）
```

- [ ] **Step 4: 安装依赖**

Run: `npm install`
Expected: 安装所有依赖包

---

## Task 2: 类型定义与数据模型

**Files:**
- Create: `src/types.ts` — 文章类型定义

- [ ] **Step 1: 创建 src/types.ts**

```typescript
export interface Article {
  title: string;
  link: string;
  pubDate: Date;
  source: string;
  description: string;
  starred?: boolean;
}

export interface FetchResult {
  source: string;
  articles: Article[];
  error?: string;
}

export interface CLIArgs {
  quiet: boolean;
  cron: boolean;
}

export interface DigestStats {
  totalArticles: number;
  sourcesCount: number;
  failedSources: string[];
  sourceBreakdown: Record<string, number>;
}
```

---

## Task 3: config.ts — RSS源配置

**Files:**
- Create: `src/config.ts`

- [ ] **Step 1: 创建 src/config.ts**

```typescript
// 研究机构
const RESEARCH_SOURCES = {
  'GoogleResearch': 'https://research.google/blog/rss',
  'DeepMind': 'https://deepmind.google/discover/blog/rss',
  'OpenAI': 'https://openai.com/news/rss.xml',
  'BAIR': 'https://bair.berkeley.edu/blog/feed.xml',
  'AWS_ML': 'https://aws.amazon.com/blogs/machine-learning/feed',
  'AmazonScience': 'https://www.amazon.science/index.rss',
} as const;

// 科技新闻媒体
const NEWS_SOURCES = {
  'TechCrunch': 'https://techcrunch.com/category/artificial-intelligence/feed/',
  'TheVerge': 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
  'TheDecoder': 'https://the-decoder.com/feed/',
  'MarkTechPost': 'https://www.marktechpost.com/feed',
  'DailyAI': 'https://dailyai.com/feed',
  'LastWeekInAI': 'https://lastweekin.ai/feed',
  'HackerNoon': 'https://hackernoon.com/tagged/ai/feed',
  'ScienceDaily': 'https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml',
} as const;

// 中文源
const CN_SOURCES = {
  'MSRA_Asia': 'https://plink.anyfeeder.com/weixin/MSRAsia',
  'SanHuaAI': 'https://sanhua.himrr.com/daily-news/feed',
  'RuanYifeng': 'https://www.ruanyifeng.com/blog/atom.xml',
  'Solidot': 'https://www.solidot.org/index.rss',
  'Sspai': 'https://sspai.com/feed',
} as const;

// 技术深度
const TECH_SOURCES = {
  'MLMastery': 'https://machinelearningmastery.com/blog/feed',
  'GradientFlow': 'https://gradientflow.com/feed/',
  'AISummer': 'https://theaisummer.com/feed.xml',
  'AIHub': 'https://aihub.org/feed',
} as const;

// Hacker News
const HN_SOURCE = 'https://hnrss.org/newest?q=AI&count=30';

// 合并所有源
export const RSS_SOURCES = {
  ...RESEARCH_SOURCES,
  ...NEWS_SOURCES,
  ...CN_SOURCES,
  ...TECH_SOURCES,
} as const;

export { HN_SOURCE };
```

---

## Task 4: fetcher.ts — RSS抓取模块

**Files:**
- Create: `src/fetcher.ts`

- [ ] **Step 1: 创建 src/fetcher.ts**

```typescript
import { FetchResult } from './types.js';
import { RSS_SOURCES, HN_SOURCE } from './config.js';

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
  if (!quiet) console.log('开始抓取RSS源...\n');

  const sourceEntries = Object.entries(RSS_SOURCES);
  const results = await Promise.all([
    ...sourceEntries.map(([name, url]) =>
      fetchSource(name, url, quiet)
    ),
    fetchSource('Hacker News', HN_SOURCE, quiet),
  ]);

  return results;
}

async function fetchSource(
  name: string,
  url: string,
  quiet: boolean
): Promise<FetchResult> {
  try {
    if (!quiet) console.log(`  抓取中: ${name}`);
    const xml = await fetchWithTimeout(url);
    return { source: name, articles: [], xml };
  } catch (err) {
    if (!quiet) console.warn(`  失败: ${name} — ${err instanceof Error ? err.message : err}`);
    return { source: name, articles: [], error: String(err) };
  }
}
```

---

## Task 5: parser.ts — XML解析模块

**Files:**
- Create: `src/parser.ts`

- [ ] **Step 1: 创建 src/parser.ts**

```typescript
import { XMLParser } from 'fast-xml-parser';
import { Article } from './types.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

function truncateDescription(text: string, maxChars = 100): string {
  const stripped = text.replace(/<[^>]+>/g, '').trim();
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
    .map((item: any) => {
      const title = item.title?.['#text'] ?? item.title ?? '';
      const link = item.link?.['#text'] ?? item.link ?? item.guid ?? '';
      const pubDateStr = item.pubDate?.['#text'] ?? item.pubDate ?? item.published ?? '';
      const description = item.description?.['#text'] ?? item.description?.['__cdata'] ?? item.description ?? item.summary ?? '';

      if (!title || !link || !pubDateStr) return null;

      const pubDate = new Date(pubDateStr);
      if (isNaN(pubDate.getTime())) return null;

      return {
        title: String(title).trim(),
        link: String(link).trim(),
        pubDate,
        source,
        description: truncateDescription(description),
      } satisfies Article;
    })
    .filter((a): a is Article => a !== null);
}

export function parseArticles(fetchResults: { source: string; xml?: string; error?: string }[]): Article[] {
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

## Task 6: filter.ts — 过滤模块（1小时过滤 + URL去重 + ⭐精读标记）

**Files:**
- Create: `src/filter.ts`

- [ ] **Step 1: 创建 src/filter.ts**

```typescript
import { Article } from './types.js';

const STAR_KEYWORDS = [
  'GPT', 'LLM', '大模型', 'Agent', 'OpenAI', 'Anthropic', 'DeepMind',
  'Gemini', 'AI Agent', '多模态', '推理模型'
];

function isStarred(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return STAR_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
}

export function filterLast1Hour(articles: Article[]): Article[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 60 * 60 * 1000); // 1小时

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

export function markStarred(articles: Article[]): Article[] {
  return articles.map(article => ({
    ...article,
    starred: isStarred(article.title, article.description),
  }));
}
```

---

## Task 7: formatter.ts — Markdown生成模块

**Files:**
- Create: `src/formatter.ts`

- [ ] **Step 1: 创建 src/formatter.ts**

```typescript
import { Article, DigestStats } from './types.js';

export function formatDigest(
  articles: Article[],
  stats: DigestStats,
  publishedAt: Date
): string {
  const dateStr = publishedAt.toISOString().split('T')[0];
  const timeStr = publishedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  const sourceList = Object.keys(stats.sourceBreakdown)
    .filter(s => (stats.sourceBreakdown[s] ?? 0) > 0)
    .join(' / ');

  const lines: string[] = [
    `# AI新闻日报 — ${dateStr}`,
    '',
    `> 自动聚合自 ${sourceList}，发布于 ${timeStr}`,
    '',
    `## 统计`,
    `共收录 ${stats.totalArticles} 篇，来自 ${stats.sourcesCount} 个源${stats.failedSources.length > 0 ? `\n> 抓取失败: ${stats.failedSources.join(', ')}` : ''}`,
    '',
    '---',
    '',
  ];

  for (const article of articles) {
    const timeLabel = article.pubDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const star = article.starred ? '⭐ ' : '';
    lines.push(
      `### ${star}${timeLabel} [${article.source}] ${article.title}`,
      '',
      `一句话摘要：${article.description}`,
      '',
      `${article.link}`,
      '',
      '---',
      ''
    );
  }

  lines.push(`*由 AI新闻聚合CLI 自动生成*`);

  return lines.join('\n');
}
```

---

## Task 8: output.ts — 文件输出模块

**Files:**
- Create: `src/output.ts`

- [ ] **Step 1: 创建 src/output.ts**

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

## Task 9: summarizer.ts — AI摘要生成模块

**Files:**
- Create: `src/summarizer.ts`

- [ ] **Step 1: 创建 src/summarizer.ts**

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { Article } from './types.js';

const MODEL = 'claude-sonnet-4-6';

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
  const client = new Anthropic({ apiKey, baseURL: baseUrl });

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    if (!quiet) {
      process.stdout.write(`\r  [${i + 1}/${articles.length}] 摘要生成中: ${article.title.slice(0, 35)}...`);
    }

    try {
      const summary = await generateSummary(client, article.title, article.description);
      article.description = summary;
    } catch (err) {
      if (!quiet) {
        console.warn(`\n  ⚠️ 摘要失败，保留原文: ${article.title.slice(0, 30)}`);
      }
    }
  }

  if (!quiet) process.stdout.write('\n');
}

async function generateSummary(client: Anthropic, title: string, currentDescription: string): Promise<string> {
  const truncatedDescription = currentDescription.slice(0, 500);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `为以下文章生成一句话中文摘要（不超过50字，返回纯摘要文字，不要任何前缀或解释）：

标题：${title}
内容：${truncatedDescription}`
    }]
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return text.trim();
}
```

---

## Task 10: index.ts — CLI入口（含定时任务）

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: 创建 src/index.ts**

```typescript
import cron from 'node-cron';
import { fetchAllSources } from './fetcher.js';
import { parseArticles } from './parser.js';
import { filterLast1Hour, deduplicateByUrl, markStarred } from './filter.js';
import { summarizeArticles } from './summarizer.js';
import { formatDigest } from './formatter.js';
import { writeDigest } from './output.js';
import { DigestStats } from './types.js';

function parseArgs(): { quiet: boolean; cron: boolean } {
  const quiet = process.argv.includes('--quiet') || process.argv.includes('-q');
  const cron = process.argv.includes('-cron');
  return { quiet, cron };
}

async function run(quiet: boolean): Promise<void> {
  const publishedAt = new Date();

  if (!quiet) {
    console.log('🤖 AI新闻聚合CLI — 开始抓取\n');
  }

  const fetchResults = await fetchAllSources(quiet);
  const articles = parseArticles(fetchResults);

  // AI摘要生成（在过滤之前，减少不必要的API调用）
  if (articles.length > 0) {
    if (!quiet) console.log('\n🤖 开始生成AI摘要...\n');
    await summarizeArticles(articles, quiet);
  }

  // 1小时过滤 + URL去重 + ⭐精读标记
  const recentArticles = filterLast1Hour(articles);
  const deduplicatedArticles = deduplicateByUrl(recentArticles);
  const starredArticles = markStarred(deduplicatedArticles);

  if (!quiet) {
    console.log(`\n抓取完成，共解析 ${articles.length} 篇文章`);
    console.log(`过滤后（1小时内）: ${recentArticles.length} 篇`);
    console.log(`去重后: ${starredArticles.length} 篇`);
  }

  const failedSources = fetchResults
    .filter(r => r.error)
    .map(r => r.source);

  const sourceBreakdown: Record<string, number> = {};
  for (const a of starredArticles) {
    sourceBreakdown[a.source] = (sourceBreakdown[a.source] ?? 0) + 1;
  }

  const stats: DigestStats = {
    totalArticles: starredArticles.length,
    sourcesCount: Object.values(sourceBreakdown).filter(v => v > 0).length,
    failedSources,
    sourceBreakdown,
  };

  const markdown = formatDigest(starredArticles, stats, publishedAt);
  await writeDigest(markdown, publishedAt);

  if (!quiet) {
    console.log(`\n✅ 日报已生成: output/latest.md`);
    if (failedSources.length > 0) {
      console.warn(`⚠️ 失败源: ${failedSources.join(', ')}`);
    }
  }
}

async function main() {
  const { quiet, cron } = parseArgs();

  if (cron) {
    // 定时模式：每天早上8点执行
    cron.schedule('0 8 * * *', () => {
      run(false).catch(err => {
        console.error('❌ 错误:', err);
        process.exit(1);
      });
    });
    if (!quiet) {
      console.log('⏰ 定时任务已启动，每天早上8:00自动运行');
    }
  } else {
    // 立即执行模式
    await run(quiet);
  }
}

main().catch(err => {
  console.error('❌ 错误:', err);
  process.exit(1);
});
```

---

## Task 11: 验证运行

- [ ] **Step 1: 配置环境变量**

```bash
cp .env.example .env
# 编辑 .env 填入 ANTHROPIC_API_KEY 和 ANTHROPIC_BASE_URL
```

- [ ] **Step 2: 运行工具**

Run: `npx tsx src/index.ts`
Expected: 输出 Markdown 日报到 output/latest.md 和 output/YYYY-MM-DD.md

- [ ] **Step 3: 验证输出文件**

检查 output/latest.md 格式是否包含：
- 统计信息（收录X篇，来自Y个源）
- ⭐精读标记
- 每篇文章的标题、时间、来源、AI摘要（不超过50字）、链接

- [ ] **Step 4: 测试静默模式**

Run: `npx tsx src/index.ts --quiet`
Expected: 无日志输出，文件正常生成

- [ ] **Step 5: 测试定时模式**

Run: `npx tsx src/index.ts -cron`
Expected: 显示定时任务启动提示，程序保持运行

---

## 依赖关系

```
Task 1 (项目初始化)
    ↓
Task 2 (types.ts) ← 所有模块依赖
Task 3 (config.ts) ← fetcher.ts 依赖
    ↓
Task 4 (fetcher.ts) ← index.ts 依赖
Task 5 (parser.ts) ← index.ts 依赖
Task 6 (filter.ts) ← index.ts 依赖
Task 7 (formatter.ts) ← index.ts 依赖
Task 8 (output.ts) ← index.ts 依赖
Task 9 (summarizer.ts) ← index.ts 依赖
    ↓
Task 10 (index.ts) — 主入口
    ↓
Task 11 (验证运行)
```

## 自我检查清单

- [ ] spec覆盖：20+ RSS源 ✓，1小时过滤 ✓，URL去重 ✓，⭐精读标记 ✓，AI摘要 ✓，双文件输出 ✓，统计信息 ✓，定时任务 ✓
- [ ] placeholder扫描：无TBD/TODO，无空步骤
- [ ] 类型一致性：Article接口在types.ts定义后，各模块引用一致
