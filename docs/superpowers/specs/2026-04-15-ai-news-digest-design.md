# AI新闻聚合CLI工具 — 设计文档

## 概述

从 20+ 个 RSS 源抓取近1小时 AI 新闻，过滤去重后，AI 生成一句话中文摘要，输出 Markdown 日报到 `output/` 目录。支持 ⭐精读标记和定时自动执行。

## 输入源（20+）

| 分类 | 源 | URL |
|------|----|-----|
| 研究机构 | GoogleResearch | `https://research.google/blog/rss` |
| | DeepMind | `https://deepmind.google/discover/blog/rss` |
| | OpenAI | `https://openai.com/news/rss.xml` |
| | BAIR | `https://bair.berkeley.edu/blog/feed.xml` |
| | AWS_ML | `https://aws.amazon.com/blogs/machine-learning/feed` |
| | AmazonScience | `https://www.amazon.science/index.rss` |
| 科技媒体 | TechCrunch | `https://techcrunch.com/category/artificial-intelligence/feed/` |
| | TheVerge | `https://www.theverge.com/rss/ai-artificial-intelligence/index.xml` |
| | TheDecoder | `https://the-decoder.com/feed/` |
| | MarkTechPost | `https://www.marktechpost.com/feed` |
| | DailyAI | `https://dailyai.com/feed` |
| | LastWeekInAI | `https://lastweekin.ai/feed` |
| | HackerNoon | `https://hackernoon.com/tagged/ai/feed` |
| | ScienceDaily | `https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml` |
| 中文源 | MSRA_Asia | `https://plink.anyfeeder.com/weixin/MSRAsia` |
| | SanHuaAI | `https://sanhua.himrr.com/daily-news/feed` |
| | RuanYifeng | `https://www.ruanyifeng.com/blog/atom.xml` |
| | Solidot | `https://www.solidot.org/index.rss` |
| | Sspai | `https://sspai.com/feed` |
| 技术深度 | MLMastery | `https://machinelearningmastery.com/blog/feed` |
| | GradientFlow | `https://gradientflow.com/feed/` |
| | AISummer | `https://theaisummer.com/feed.xml` |
| | AIHub | `https://aihub.org/feed` |
| 社区 | Hacker News | `https://hnrss.org/newest?q=AI&count=30` |

详见 `src/config.ts`

## 输出

- `output/YYYY-MM-DD.md` — 带日期的历史归档
- `output/latest.md` — 最新日报

## 文章字段

每篇文章提取：
- **标题** (title)
- **链接** (link) — 用于 URL 去重
- **发布时间** (pubDate) — 严格过滤，时间缺失的文章直接排除
- **来源** (source) — 分类标签
- **AI摘要** (description) — AI 生成的一句话中文摘要
- **精读标记** (starred) — Boolean，是否匹配精读关键词

## 过滤规则

| 规则 | 说明 |
|------|------|
| **1小时过滤** | 仅保留近1小时内发布的文章 |
| **URL去重** | 基于链接去重，避免同一文章重复收录 |
| **时间策略** | 时间字段缺失的文章一律排除 |
| **时区** | 统一使用 UTC 时间比较 |

## 精读标记规则

标题或摘要含以下关键词的文章自动标记 ⭐精读：

```
GPT、LLM、大模型、Agent、OpenAI、Anthropic、DeepMind、Gemini、AI Agent、多模态、推理模型
```

## AI 摘要生成

- **模型**: claude-sonnet-4-6
- **API**: MiniMax API (通过 ANTHROPIC_BASE_URL 配置)
- **策略**: 串行调用，每篇独立请求
- **Prompt**: 生成不超过50字的一句话中文摘要
- **容错**: API 失败保留原文，不中断流程

## 错误处理

- 单源最多重试3次，超时5秒/次
- 重试全部失败后跳过该源，最终报告中标注失败源
- 其他源不受影响

## CLI接口

```bash
npx tsx src/index.ts         # 默认模式：打印进度日志
npx tsx src/index.ts --quiet  # 静默模式：仅输出错误
npx tsx src/index.ts -cron    # 定时模式：每天8:00自动运行
```

## 项目结构

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
├── output/              # 日报输出目录
├── package.json
└── tsconfig.json
```

## 依赖

- `tsx` — 直接运行 TypeScript
- `fast-xml-parser` — RSS XML 解析
- `@anthropic-ai/sdk` — Anthropic API 调用
- `node-cron` — 定时任务

## 日报 Markdown 格式

```markdown
# AI新闻日报 — 2026-04-15

> 自动聚合自 TechCrunch / The Verge / Hacker News 等，发布于 10:30

## 统计
共收录 42 篇，来自 15 个源

---

### ⭐ 10:45 [TechCrunch] OpenAI发布GPT-5 Turbo
一句话摘要：OpenAI在今日凌晨发布了GPT-5 Turbo模型，据称在多项 benchmark 上刷新SOTA纪录...

https://techcrunch.com/...

### 09:30 [The Decoder] Google发布Gemini 1.5...
一句话摘要：Google于今日正式发布Gemini 1.5 Pro，支持100万token上下文窗口...

https://the-decoder.com/...

---

*由 AI新闻聚合CLI 自动生成 | 抓取失败: The Verge (已重试3次)*
```

---

## 关键设计决策

1. **1小时过滤**：相比24小时过滤，减少信息过载，突出最新资讯
2. **URL去重**：基于链接去重，避免同一文章从不同源重复收录
3. **⭐精读标记**：自动识别重要文章，方便快速浏览
3. **并发抓取**：多个源同时拉取，不串行等待，节省总耗时
4. **双文件输出**：`latest.md` 方便集成到其他系统
5. **严格时间过滤**：时间缺失即排除，避免陈旧文章混入日报
6. **定时任务**：支持 cron 模式，每天早上8点自动生成
