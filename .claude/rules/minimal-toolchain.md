# 最小化工具链规则

## 核心原则

**优先使用内置工具，避免不必要的外部工具调用。**

工具选择优先级（从高到低）：
1. **Read/Write/Edit** - 文件读写编辑
2. **Glob/Grep** - 文件搜索
3. **Bash** - 仅用于运行项目脚本和 git 操作
4. **Task** - 仅用于独立并行任务
5. **WebFetch/WebSearch** - 仅在需要获取外部信息时

## 行为约束

### 必须遵循

| 场景 | 正确做法 | 错误做法 |
|------|----------|----------|
| 读取文件 | 直接用 Read | `cat` + Bash |
| 搜索文件 | Glob/Grep | `find` + Bash |
| 编辑代码 | Edit | `sed`/`awk` + Bash |
| 查看目录 | Glob | `ls` + Bash |
| 网络请求 | WebFetch | `curl` + Bash |
| 复杂搜索 | Task subagent | 直接用多种工具 |
| 运行脚本 | Bash (npm/bun/tsx) | 新启一个解释器 |

### 禁止行为

- **禁止** 用 Bash 执行可以用 Read/Write/Edit 完成的文件操作
- **禁止** 用 Bash + grep/find/awk/sed 代替 Glob/Grep/Edit
- **禁止** 用 `curl` 代替 WebFetch（获取网页内容）
- **禁止** 启动多个串行 Task 而可以合并或用 Bash 代替
- **禁止** 用 Task 做简单任务（简单搜索、读文件等）

### 工具使用判断

```
任务类型 → 判断树

├── 读文件内容？
│   └── Yes → Read（禁止 cat）
├── 写/改文件？
│   └── Yes → Write/Edit（禁止 tee/echo重定向）
├── 搜索文件名？
│   └── Yes → Glob（禁止 find）
├── 搜索文件内容？
│   └── Yes → Grep（禁止 grep -r + Bash）
├── 运行项目命令？
│   └── Yes → Bash（仅 npm/bun/tsx/git）
├── 获取网页内容？
│   └── Yes → WebFetch（禁止 curl）
└── 独立并行大任务？
    └── Yes → Task subagent
```

## 工具链最小化检查清单

执行任何 Bash 之前，问自己：

1. **Read 可以完成吗？** → 用 Read
2. **Glob/Grep 可以完成吗？** → 用 Glob/Grep
3. **这是项目脚本吗？** → Bun/tsx/npm run
4. **这是 git 操作吗？** → git 命令
5. **以上都不行吗？** → 才用 Bash

## 违反此规则的典型错误

| 错误做法 | 正确做法 |
|----------|----------|
| `Bash → cat file.ts` | `Read → file.ts` |
| `Bash → find . -name "*.ts"` | `Glob → **/*.ts` |
| `Bash → grep -r "func" src/` | `Grep → "func" + path:src` |
| `Bash → echo "text" > file` | `Write → file + content` |
| `Bash → curl url` | `WebFetch → url + prompt` |
| 多个串行 Task | 合并为 1 个 Task 或用 Bash |
