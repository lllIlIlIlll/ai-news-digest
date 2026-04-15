# AI摘要生成功能 — 设计文档

## 概述

对每篇文章使用 Claude API 生成一句话中文摘要，替换原有的 description 截断方案。

## 模型

- **模型**: `claude-sonnet-4-6`
- **API**: MiniMax API（通过 `ANTHROPIC_BASE_URL` 配置）
- **API Key**: 环境变量 `ANTHROPIC_API_KEY` 读取

## 流程变更

```
fetchAllSources → parseArticles → summarizeArticles → filterLast1Hour → formatDigest → writeDigest
```

`summarizeArticles` 在 `filterLast1Hour` 之前执行，减少不必要的 API 调用。

## API 调用

- **Endpoint**: 通过 `ANTHROPIC_BASE_URL` 环境变量配置（默认 `https://api.minimaxi.com/anthropic`）
- **Method**: POST
- **Headers**: `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`
- **策略**: 串行调用，每篇独立请求

## Prompt

```
为以下文章生成一句话中文摘要（不超过50字）：
标题：{title}
内容：{description前500字}
```

## 错误处理

- API 调用失败 → 打印警告，保留原始 description，不中断流程
- 环境变量缺失 → 抛出明确错误，退出
- 单篇失败不影响其他文章

## 依赖

- `@anthropic-ai/sdk` — Anthropic SDK for API 调用
