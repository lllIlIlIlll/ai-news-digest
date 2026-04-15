# AI摘要生成功能 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对每篇文章调用 Claude API 生成一句话中文摘要，替换原有 description 截断方案

**Architecture:** 在现有 pipeline 中插入 `summarizeArticles` 步骤，使用 claude-sonnet-4-6 模型串行调用 API，摘要结果直接写回 Article.description 字段。`filterLast24Hours` 在摘要生成之后执行，减少不必要的 API 调用。

**Tech Stack:** TypeScript + tsx + 原生 fetch（直接调用 Anthropic API）

---

## 依赖变更

- 新增 `@anthropic-ai/sdk` 包（或使用原生 fetch 直接调用，无新增依赖）

---

## Task 1: 安装 Anthropic SDK

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 更新 package.json 添加依赖**

```json
{
  "dependencies": {
    "fast-xml-parser": "^4.5.0",
    "@anthropic-ai/sdk": "^0.30.0"
  }
}
```

- [ ] **Step 2: 安装依赖**

Run: `npm install`
Expected: `added 1 package, audited N packages`

---

## Task 2: 创建 summarizer.ts

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

export async function summarizeArticles(articles: Article[], quiet: boolean): Promise<void> {
  const apiKey = getApiKey();
  const client = new Anthropic({ apiKey });

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

## Task 3: 修改 index.ts — 集成 summarizer

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: 读取当前 src/index.ts**

```typescript
// 当前 pipeline (简化版):
// const fetchResults = await fetchAllSources(quiet);
// const articles = parseArticles(fetchResults);
// const recentArticles = filterLast24Hours(articles);
// const stats = ...;
// const markdown = formatDigest(recentArticles, stats, publishedAt);
// await writeDigest(markdown, publishedAt);
```

- [ ] **Step 2: 修改 index.ts**

在 `parseArticles` 之后、`filterLast24Hours` 之前插入 `summarizeArticles`：

```typescript
import { fetchAllSources } from './fetcher.js';
import { parseArticles } from './parser.js';
import { summarizeArticles } from './summarizer.js';  // 新增
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

  // 新增：AI摘要生成（串行，在过滤之前，减少不必要的API调用）
  if (articles.length > 0) {
    if (!quiet) console.log('\n🤖 开始生成AI摘要...\n');
    await summarizeArticles(articles, quiet);
  }

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

## Task 4: 验证运行

**Files:**
- Run: `src/index.ts`

- [ ] **Step 1: 设置 API Key**

Run: `export ANTHROPIC_API_KEY=your_key_here`

- [ ] **Step 2: 运行正常模式**

Run: `npx tsx src/index.ts`
Expected:
- 进度显示 `  [1/N] 摘要生成中: 文章标题...`
- 每篇约1-2秒，N篇约N*1.5秒
- 最终输出日报，description 为 AI 生成的一句话摘要

- [ ] **Step 3: 验证日报格式**

检查 `output/latest.md`：
- 每篇文章的 description 应该是 AI 生成的中文摘要（不超过50字）
- 不是原始 HTML 截断

- [ ] **Step 4: 运行静默模式**

Run: `ANTHROPIC_API_KEY=xxx npx tsx src/index.ts --quiet`
Expected: 无进度日志，日报正常生成

- [ ] **Step 5: 测试 API Key 缺失**

Run: `unset ANTHROPIC_API_KEY; npx tsx src/index.ts`
Expected: 抛出明确错误 `ANTHROPIC_API_KEY 环境变量未设置`

---

## 依赖关系

```
Task 1 (安装SDK) ← Task 2 依赖
Task 2 (summarizer.ts) ← Task 3 依赖
Task 3 (修改index.ts) ← Task 4 依赖
Task 4 (验证运行)
```

## 自我检查清单

- [ ] spec覆盖：Claude API调用 ✓，claude-sonnet-4-6 ✓，串行调用 ✓，错误处理 ✓，流程插入位置 ✓
- [ ] placeholder扫描：无TBD/TODO，无空步骤
- [ ] 类型一致性：Article.description 仍为 string，summarizer 正确导入 Article 类型
