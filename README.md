# AI新闻日报

从 TechCrunch AI、The Verge AI、Hacker News 抓取近24小时AI相关新闻，AI生成一句话摘要，输出Markdown日报。

## 快速开始

```bash
# 克隆后安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入 ANTHROPIC_API_KEY 和 ANTHROPIC_BASE_URL

# 运行一次
npx tsx src/index.ts

# 开启定时模式（每天早上8点自动运行）
npx tsx src/index.ts -cron
```

## RSS 源

| 源 | URL |
|----|-----|
| TechCrunch AI | `https://techcrunch.com/category/artificial-intelligence/feed/` |
| The Verge AI | `https://www.theverge.com/rss/ai-artificial-intelligence/index.xml` |
| Hacker News | `https://hnrss.org/newest?q=AI&count=30` |

## 命令行参数

| 命令 | 说明 |
|------|------|
| `npx tsx src/index.ts` | 立即执行一次 |
| `npx tsx src/index.ts --quiet` | 静默模式（无进度输出） |
| `npx tsx src/index.ts -cron` | 定时模式（每天8:00执行） |

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
├── index.ts      # CLI入口
├── fetcher.ts    # RSS抓取
├── parser.ts     # XML解析
├── summarizer.ts  # AI摘要生成
├── filter.ts     # 24小时过滤
├── formatter.ts   # Markdown生成
└── output.ts     # 文件输出
```
