# AI新闻日报

从 20+ 个 RSS 源抓取近1小时AI相关新闻，AI生成中文摘要+解读，输出Markdown日报，支持⭐精读标记和定时自动执行。

## 快速开始

```bash
# 安装依赖
bun install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入 ANTHROPIC_API_KEY 和 ANTHROPIC_BASE_URL

# 运行一次
bun start

# 开启定时模式（每天早上8点自动运行）
bun start -- -cron
```

## RSS 源（20+）

**研究机构**：GoogleResearch、DeepMind、OpenAI、BAIR、AWS_ML、AmazonScience

**科技媒体**：TechCrunch、The Verge、The Decoder、MarkTechPost、DailyAI、LastWeekInAI、HackerNoon、ScienceDaily

**中文源**：MSRA_Asia、SanHuaAI、RuanYifeng、Solidot、Sspai

**技术深度**：MLMastery、GradientFlow、AISummer、AIHub

**社区**：Hacker News (AI关键词，前30条)

详见 `src/services/rss/sources.ts`

## 功能特性

- **AI摘要生成** — 调用 MiniMax API 为每篇文章生成中文标题、一句话摘要和解读
- **⭐精读标记** — 标题或摘要含以下关键词的文章自动标记：GPT、LLM、大模型、Agent、OpenAI、Anthropic、DeepMind、Gemini、AI Agent、多模态、推理模型
- **URL去重** — 基于链接去重，避免同一文章重复收录
- **1小时过滤** — 仅保留近1小时发布的文章
- **定时任务** — 支持 cron 模式，每天早上8点自动生成

## 命令行参数

| 命令 | 说明 |
|------|------|
| `bun start` | 立即执行一次 |
| `bun start -- --quiet` | 静默模式（无进度输出） |
| `bun start -- -cron` | 定时模式（每天8:00执行） |

## 输出

- `output/latest.md` — 最新日报
- `output/YYYY-MM-DD.md` — 历史归档

## 环境变量

```env
ANTHROPIC_API_KEY=your_api_key
ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic
```

## 项目结构

```
src/
├── cli/                    # CLI 层
│   ├── index.ts           # CLI 入口、定时任务调度
│   └── parser.ts          # 命令行参数解析
├── core/                   # 核心业务层
│   ├── aggregator.ts      # 聚合流程编排
│   ├── filter.ts          # 1小时过滤、URL去重、⭐精读标记
│   └── formatter.ts       # Markdown 日报格式化
├── services/               # 服务层
│   ├── rss/
│   │   ├── sources.ts     # RSS 源配置（20+源分类管理）
│   │   ├── fetcher.ts     # HTTP 请求（并发抓取、重试）
│   │   └── parser.ts      # XML 解析
│   ├── ai/
│   │   └── summarizer.ts  # AI 摘要生成（MiniMax API）
│   └── output/
│       └── writer.ts      # 文件写入
├── models/                 # 类型定义
│   ├── article.ts         # Article、FetchResult、DigestStats
│   └── config.ts          # CLIArgs、RSSSource、AppConfig
└── utils/                  # 工具函数
    ├── error.ts           # 错误处理
    └── html.ts            # HTML 实体解码
```

## 模块依赖

```
cli → core → services → models/utils
```

## 测试

```bash
# 运行单元测试
bun run vitest run
```
