# TypeScript 核心编码规则

## 核心原则

**类型安全优先于便利性，编译时错误优于运行时错误。**

本规则基于本项目现有代码实践，旨在保持代码库的一致性和质量。

## 类型安全规范

### 必须遵循

| 场景 | 正确做法 | 错误做法 |
|------|----------|----------|
| 类型定义 | 使用具体类型或接口 | 使用 `any` 类型 |
| 可选属性 | 使用 `?` 修饰符 | 使用 `| undefined` 联合类型 |
| 只读属性 | 使用 `readonly` 修饰符 | 可变属性不必要修改 |
| 类型推断 | 允许 TypeScript 自动推断局部变量类型 | 不必要的类型注解 |
| 类型断言 | 仅在类型守卫后使用 `as` | 滥用类型断言绕过检查 |

### 禁止行为

- **禁止** 在项目代码中使用 `any` 类型（与第三方库交互除外）
- **禁止** 使用 `@ts-ignore` 或 `@ts-expect-error` 压制类型错误
- **禁止** 使用非空断言运算符 `!` 除非能证明值非空
- **禁止** 在测试中使用 `as any` 绕过类型检查
- **禁止** 创建没有明确类型的公共 API

## 接口与类型设计

### 接口优先原则
- 对象类型定义：优先使用 `interface`
- 联合/交叉类型：使用 `type`
- 函数类型：优先使用接口方法签名或类型别名

### 只读设计
- 不可变数据：使用 `Readonly<T>` 包装
- 配置对象：使用 `readonly` 修饰符
- 枚举值：使用 `const enum` 或字面量类型

### 可选与默认值
```typescript
// 正确
interface User {
  name: string;
  age?: number;  // 可选属性
}

// 错误
interface User {
  name: string;
  age: number | undefined;
}
```

## 错误处理模式

### 异常处理
- **可恢复错误**：返回 `Result<T, E>` 类型或使用选项类型
- **不可恢复错误**：使用 `throw` 抛出异常
- **异步错误**：Promise 必须处理拒绝情况

### 空值安全
```typescript
// 正确：使用可选链和空值合并
const name = user?.profile?.name ?? 'Unknown';

// 正确：类型守卫
if (typeof value === 'string') {
  // 安全使用 value
}

// 错误：非空断言
const name = user!.profile!.name;
```

### 输入验证
```typescript
// 正确：运行时类型检查
function isValidArticle(obj: unknown): obj is Article {
  return typeof obj === 'object' && 
         obj !== null &&
         'title' in obj && 
         typeof (obj as any).title === 'string';
}
```

## 异步编程规范

### Promise 使用
- 优先使用 `async/await` 语法
- 避免回调地狱，保持代码扁平化
- 始终处理 Promise 拒绝

### 并发控制
```typescript
// 正确：并行执行独立任务
const [result1, result2] = await Promise.all([task1(), task2()]);

// 正确：处理部分失败
const results = await Promise.allSettled([task1(), task2()]);

// 错误：串行不必要的任务
const r1 = await task1();
const r2 = await task2(); // 如果任务独立，应该并行
```

## 模块与组织

### 文件结构
- 单一职责：每个文件只导出一个主要功能
- 避免循环依赖：使用依赖注入或重构解耦
- 按功能组织：`models/`, `services/`, `utils/` 等目录

### 导入导出
```typescript
// 导入顺序：第三方库 → 项目模块 → 类型导入
import { parse } from 'fast-xml-parser';
import { Article } from '../models/article.js';
import type { Config } from '../models/config.js';

// 优先命名导出
export { filterLast1Hour, deduplicateByUrl };
export type { Article, FetchResult }; // 类型单独导出
```

## 测试规范

### 类型安全测试
- 测试文件必须通过 TypeScript 编译
- 使用工厂函数创建测试数据
- 避免硬编码重复数据

### 测试模式
```typescript
// 正确：使用工厂函数
function createTestArticle(overrides?: Partial<Article>): Article {
  return {
    title: 'Test Article',
    link: 'https://example.com',
    pubDate: new Date(),
    source: 'Test',
    description: '',
    ...overrides,
  };
}

// 正确：异步测试
it('should fetch articles', async () => {
  const result = await fetchArticles();
  expect(result).toHaveLength(1);
});

// 错误：使用 as any
const article = { title: 'Test' } as any; // 禁止
```

## 工具配置要求

### TypeScript 配置
- 必须启用严格模式：`"strict": true`
- 目标版本：`ES2022` 或更高
- 模块解析：`"bundler"` 或 `"node"`

### 代码质量工具
- ESLint：启用 `@typescript-eslint/recommended` 规则集
- Prettier：统一代码格式化
- 编辑器：项目包含 `.editorconfig`

## 违反此规则的典型错误

| 错误做法 | 正确做法 |
|----------|----------|
| `const data: any = response;` | `const data = response as ApiResponse;` |
| `function getUser(): User \| undefined` | `function getUser(): User \| null` |
| `await task1(); await task2();` | `await Promise.all([task1(), task2()]);` |
| `export default class Filter` | `export class Filter` |
| 测试中使用 `as any` | 使用工厂函数创建类型安全数据 |

## 检查清单

编写 TypeScript 代码时，问自己：

1. **类型安全吗？** → 避免 `any`，使用具体类型
2. **空值安全吗？** → 使用可选链和空值合并
3. **错误处理了吗？** → Promise 拒绝必须处理
4. **测试安全吗？** → 测试数据通过类型检查
5. **导入清晰吗？** → 按顺序分组导入

**最终检验**：资深 TypeScript 工程师是否会认为这段代码类型安全且符合最佳实践？如果是，就可以提交。