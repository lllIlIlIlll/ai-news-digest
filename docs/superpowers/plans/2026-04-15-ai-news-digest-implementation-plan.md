# AI新闻聚合CLI工具 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从3个RSS源抓取AI新闻，过滤24小时内文章，输出Markdown日报到 `output/` 目录

**Architecture:** 并发抓取3个RSS源，独立重试，解析后严格按24小时过滤，按时间倒序输出Markdown。双文件输出：latest.md + YYYY-MM-DD.md。

**Tech Stack:** TypeScript + tsx（直接运行）+ fast-xml-parser（RSS解析）+ 原生fetch（HTTP）

---

## 文件结构

```
ai-news-digest/
├── src/
│   ├── index.ts        # CLI入口、参数解析、主流程编排
│   ├── fetcher.ts     # RSS HTTP请求（并发抓取、重试逻辑）
│   ├── parser.ts      # XML解析：提取标题/链接/时间/来源/摘要
│   ├── filter.ts      # 24小时过滤（严格策略）
│   ├── formatter.ts   # Markdown日报生成
│   └── output.ts      # 文件写入：latest.md + YYYY-MM-DD.md
├── output/             # 日报输出目录（.gitkeep）
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
    "fast-xml-parser": "^4.5.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
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
Expected: 安装 fast-xml-parser, tsx, typescript, @types/node

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
  source: 'TechCrunch' | 'The Verge' | 'Hacker News';
  description: string; // 摘要：description前100字
}

export interface FetchResult {
  source: Article['source'];
  articles: Article[];
  error?: string;
}

export interface CLIArgs {
  quiet: boolean;
}

export interface DigestStats {
  totalArticles: number;
  sourcesCount: number;
  failedSources: string[];
  sourceBreakdown: Record<string, number>;
}
```

---

## Task 3: fetcher.ts — RSS抓取模块

**Files:**
- Create: `src/fetcher.ts`

- [ ] **Step 1: 创建 src/fetcher.ts**

```typescript
import { FetchResult, Article } from './types.js';

const RSS_SOURCES = {
  'TechCrunch': 'https://techcrunch.com/category/artificial-intelligence/feed/',
  'The Verge': 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
} as const;

const HN_SOURCE = 'https://hnrss.org/newest?q=AI&count=30';

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

  const results = await Promise.all([
    fetchSource('TechCrunch', RSS_SOURCES['TechCrunch'], quiet),
    fetchSource('The Verge', RSS_SOURCES['The Verge'], quiet),
    fetchSource('Hacker News', HN_SOURCE, quiet),
  ]);

  return results;
}

async function fetchSource(
  name: Article['source'],
  url: string,
  quiet: boolean
): Promise<FetchResult> {
  try {
    if (!quiet) console.log(`  抓取中: ${name}`);
    const xml = await fetchWithTimeout(url);
    return { source: name, articles: [], xml }; // xml暂存，parser后续处理
  } catch (err) {
    if (!quiet) console.warn(`  失败: ${name} — ${err instanceof Error ? err.message : err}`);
    return { source: name, articles: [], error: String(err) };
  }
}

export type { FetchResult };
```

---

## Task 4: parser.ts — XML解析模块

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

function parseRSSItems(xml: string, source: Article['source']): Article[] {
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

export function parseArticles(fetchResults: { source: Article['source']; xml?: string; error?: string }[]): Article[] {
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

## Task 5: filter.ts — 时间过滤模块

**Files:**
- Create: `src/filter.ts`

- [ ] **Step 1: 创建 src/filter.ts**

```typescript
import { Article } from './types.js';

export function filterLast24Hours(articles: Article[]): Article[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return articles
    .filter(article => article.pubDate >= cutoff)
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
}
```

---

## Task 6: formatter.ts — Markdown生成模块

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

  const sourceList = ['TechCrunch', 'The Verge', 'Hacker News']
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
    lines.push(
      `### ${timeLabel} [${article.source}] ${article.title}`,
      '',
      `${article.description}`,
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

## Task 7: output.ts — 文件输出模块

**Files:**
- Create: `src/output.ts`

- [ ] **Step 1: 创建 src/output.ts**

```typescript
import { mkdir, writeFile, copyFile } from 'fs/promises';
import { dirname } from 'path';

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

## Task 8: index.ts — CLI入口

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: 创建 src/index.ts**

```typescript
import { fetchAllSources } from './fetcher.js';
import { parseArticles } from './parser.js';
import { filterLast24Hours } from './filter.js';
import { formatDigest } from './formatter.js';
import { writeDigest } from './output.js';
import { DigestStats } from './types.js';

function parseArgs(): { quiet: boolean } {
  const quiet = process.argv.includes('--quiet') || process.argv.includes('-q');
  return { quiet };
}

async function main() {
  const { quiet } = parseArgs();
  const publishedAt = new Date();

  if (!quiet) {
    console.log('🤖 AI新闻聚合CLI — 开始抓取\n');
  }

  const fetchResults = await fetchAllSources(quiet);
  const articles = parseArticles(fetchResults);
  const recentArticles = filterLast24Hours(articles);

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
    sourcesCount: Object.values(sourceBreakdown).filter(v => v > 0).length,
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

main().catch(err => {
  console.error('❌ 错误:', err);
  process.exit(1);
});
```

---

## Task 9: 验证运行

- [ ] **Step 1: 运行工具**

Run: `npx tsx src/index.ts`
Expected: 输出Markdown日报到 output/latest.md 和 output/YYYY-MM-DD.md

- [ ] **Step 2: 验证输出文件**

检查 output/latest.md 格式是否包含：
- 统计信息（收录X篇，来自Y个源）
- 每篇文章的标题、时间、来源、摘要（100字内）、链接

- [ ] **Step 3: 测试静默模式**

Run: `npx tsx src/index.ts --quiet`
Expected: 无日志输出，文件正常生成

---

## 依赖关系

```
Task 1 (项目初始化)
    ↓
Task 2 (types.ts) ← 所有模块依赖
    ↓
Task 3 (fetcher.ts) ← index.ts 依赖
Task 4 (parser.ts) ← index.ts 依赖
Task 5 (filter.ts) ← index.ts 依赖
Task 6 (formatter.ts) ← index.ts 依赖
Task 7 (output.ts) ← index.ts 依赖
    ↓
Task 8 (index.ts) — 主入口
    ↓
Task 9 (验证运行)
```

## 自我检查清单

- [ ] spec覆盖：3个RSS源 ✓，文章5字段 ✓，24小时过滤 ✓，双文件输出 ✓，统计信息 ✓
- [ ] placeholder扫描：无TBD/TODO，无空步骤
- [ ] 类型一致性：Article接口在types.ts定义后，各模块引用一致
