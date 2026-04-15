# AI新闻聚合CLI工具 — 设计文档

## 概述

从三个RSS源抓取AI相关新闻，过滤24小时内文章，输出Markdown格式日报到 `output/` 目录。

## 输入源

| 源 | URL | 数量 |
|----|-----|------|
| TechCrunch AI | `https://techcrunch.com/category/artificial-intelligence/feed/` | 全部 |
| The Verge AI | `https://www.theverge.com/rss/ai-artificial-intelligence/index.xml` | 全部 |
| Hacker News | `https://hnrss.org/newest?q=AI&count=30` | 前30条 |

## 输出

- `output/YYYY-MM-DD.md` — 带日期的历史归档
- `output/latest.md` — 最新日报的软链接/副本

## 文章字段

每篇文章提取：
- **标题** (title)
- **链接** (link)
- **发布时间** (pubDate) — 严格过滤，时间缺失的文章直接排除
- **来源** (source: TechCrunch / The Verge / Hacker News)
- **摘要** (description前100字，截断时不拆词)

## 过滤规则

- **时间窗口**：最近24小时（相对于工具运行时间）
- **严格策略**：时间字段缺失的文章一律排除，不进入日报
- **时区**：统一使用UTC时间比较

## 错误处理

- 单源最多重试3次，超时5秒/次
- 重试全部失败后跳过该源，最终报告中标注失败源
- 其他源不受影响

## CLI接口

```bash
npx tsx src/index.ts         # 默认模式：打印进度日志
npx tsx src/index.ts --quiet  # 静默模式：仅输出错误
```

## 项目结构

```
ai-news-digest/
├── src/
│   ├── index.ts        # CLI入口、参数解析、主流程编排
│   ├── fetcher.ts     # RSS HTTP请求（并发抓取、重试逻辑）
│   ├── parser.ts      # XML解析：提取标题/链接/时间/来源/摘要
│   ├── filter.ts      # 24小时过滤（严格策略）
│   ├── formatter.ts   # Markdown日报生成
│   └── output.ts      # 文件写入：latest.md + YYYY-MM-DD.md
├── output/             # 日报输出目录
├── package.json
└── tsconfig.json
```

## 依赖

- `tsx` — 直接运行TypeScript
- `fast-xml-parser` — RSS XML解析

## 日报Markdown格式

```markdown
# AI新闻日报 — 2026-04-15

> 自动聚合自 TechCrunch AI / The Verge AI / Hacker News，发布于 10:30

## 统计
共收录 42 篇，来自 3 个源

---

### 10:45 [TechCrunch] OpenAI发布GPT-5 Turbo
一句话摘要：OpenAI在今日凌晨发布了GPT-5 Turbo模型，据称在多项 benchmark 上刷新SOTA纪录...

https://techcrunch.com/...

### 09:30 [The Verge] Google发布Gemini 1.5...
一句话摘要：Google于今日正式发布Gemini 1.5 Pro，支持100万token上下文窗口...

https://theverge.com/...

---

*由 AI新闻聚合CLI 自动生成 | 抓取失败: The Verge (已重试3次)*
```

---

## 关键设计决策

1. **并发抓取**：三个源同时拉取，不串行等待，节省总耗时
2. **摘要截断**：取description前100字，截断时不拆解单词
3. **双文件输出**：`latest.md` 方便集成到其他系统（如静态网站）
4. **严格时间过滤**：时间缺失即排除，避免陈旧文章混入日报
