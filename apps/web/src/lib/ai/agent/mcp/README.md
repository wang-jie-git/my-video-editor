# MCP Integration Guide

## Overview

Cutia AI 助手已集成 One Memory 的 MCP (Model Context Protocol) 记忆系统。

**One Memory MCP 工具数量**: 19 个（15 个项目级 + 4 个全局级）

## Features

✅ **记忆读写**：AI 助手可以记住用户偏好、项目信息
✅ **用户画像**：记录用户行为、技能、知识等
✅ **工作流程记忆**：记录和复用常见操作流程
✅ **主动建议**：基于历史对话主动提醒
✅ **会话压缩**：自动压缩长对话节省 token
✅ **优雅降级**：MCP 不可用时自动使用本地工具

## Architecture

```
Cutia AI Agent
    ↓
AgentService (service.ts)
    ↓
Tool Registry (tools/index.ts)
    ↓
├─ 本地工具（29 个，现有）
└─ MCP 工具（15 个项目级，动态加载）
    ↓
McpClient (mcp-client.ts)
    ↓
One Memory MCP Server (stdio)
    ↓
MemorySystem (SQLite + 向量)
```

## Components

### 1. McpClient (`mcp-client.ts`)

**职责**：
- 管理 One Memory MCP Server 子进程
- stdio JSON-RPC 2.0 通信
- 工具发现和调用
- 自动重连

**关键特性**：
- ✅ 超时处理（30s 默认）
- ✅ 自动重连（5s 延迟）
- ✅ 优雅关闭（SIGTERM）
- ✅ 环境检测（仅 Node.js 环境）

### 2. McpToolAdapter (`mcp-adapter.ts`)

**职责**：
- 将 MCP 工具转换为 OpenAI Function Calling 格式
- 统一结果格式

**转换示例**：
```typescript
// MCP 格式
{
  name: "memory_write",
  description: "写入记忆",
  inputSchema: { type: "object", properties: {...} }
}

// 转换为 AgentTool
{
  name: "memory_write",
  description: "写入记忆",
  parameters: { type: "object", properties: {...} },
  execute: async (args) => { /* 调用 MCP */ }
}
```

### 3. McpTools Registry (`mcp-tools.ts`)

**职责**：
- 管理 MCP 工具生命周期
- 初始化/断开/状态检查

**关键函数**：
- `initMcpTools()` - 初始化 MCP 连接
- `getMcpTools()` - 获取 MCP 工具列表
- `isMcpReady()` - 检查连接状态
- `disconnectMcp()` - 断开连接

### 4. Config (`config.ts`)

**配置选项**：
```typescript
{
  enabled: boolean;           // 是否启用（默认 false）
  serverPath: string;         // MCP Server 路径
  serverArgs?: string[];      // Server 参数
  timeout?: number;           // 超时时间（默认 30s）
}
```

## Environment Variables

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `NEXT_PUBLIC_MCP_ENABLED` | 是否启用 MCP | `false` |
| `NEXT_PUBLIC_MCP_SERVER_PATH` | MCP Server 路径 | `/Users/mac/Desktop/AI-memory/packages/memory-mcp/build/index.js` |
| `NEXT_PUBLIC_CODEGRAPH_DIR` | CodeGraph 目录 | 自动查找 |
| `NEXT_PUBLIC_MCP_EMBEDDER` | Embedder 类型 | `simple` |
| `NEXT_PUBLIC_MCP_EMBEDDER_API_KEY` | Embedder API Key | - |
| `NEXT_PUBLIC_MCP_EMBEDDER_BASE_URL` | Embedder API Base URL | - |
| `NEXT_PUBLIC_MCP_EMBEDDER_MODEL` | Embedder Model | - |

### 配置示例

**本地开发**（`apps/web/.env.local`）：
```bash
NEXT_PUBLIC_MCP_ENABLED=true
NEXT_PUBLIC_MCP_SERVER_PATH=/Users/mac/Desktop/AI-memory/packages/memory-mcp/build/index.js
```

**生产环境**：
```bash
NEXT_PUBLIC_MCP_ENABLED=true
NEXT_PUBLIC_MCP_EMBEDDER=api
NEXT_PUBLIC_MCP_EMBEDDER_API_KEY=your_api_key
NEXT_PUBLIC_MCP_EMBEDDER_BASE_URL=https://api.openai.com/v1
NEXT_PUBLIC_MCP_EMBEDDER_MODEL=text-embedding-3-small
```

## Environment Restrictions

⚠️ **MCP 仅在以下环境可用**：
- ✅ Server Components
- ✅ API Routes (`app/api/`)
- ✅ Server Actions
- ❌ **Client Components**（浏览器环境）

**原因**：McpClient 使用 `child_process.spawn` 启动子进程，这在浏览器环境中不可用。

## Usage

### 初始化 MCP

MCP 工具会在 AI 助手首次发送消息时自动初始化：

```typescript
// service.ts 中自动调用
if (!isMcpReady()) {
  await initMcpTools();
}
```

### AI 助手使用 MCP 工具

AI 助手可以像调用本地工具一样调用 MCP 工具：

**示例对话**：
```
用户: 记住我喜欢 MP4 格式
AI: [调用 memory_write 工具] ✅ 已记住您偏好 MP4 格式

用户: 我喜欢什么格式？
AI: [调用 memory_query 工具] 您偏好 MP4 格式
```

### 手动控制 MCP

```typescript
import { initMcpTools, disconnectMcp, isMcpReady, getMcpTools } from "@/lib/ai/agent/mcp/mcp-tools";

// 初始化
await initMcpTools();

// 检查状态
if (isMcpReady()) {
  console.log("MCP is connected");
  console.log("Available tools:", getMcpTools().map(t => t.name));
}

// 断开连接
disconnectMcp();
```

## Available MCP Tools

### 项目级工具（15 个）

| 工具名 | 功能 | 说明 |
|--------|------|------|
| `memory_write` | 写入记忆 | 记录项目信息、用户偏好等 |
| `memory_query` | 查询记忆 | 语义搜索历史记忆 |
| `memory_delete` | 删除记忆 | 删除指定记忆 |
| `memory_dream` | 梦境整理 | 自动合并冗余记忆、提炼 insight |
| `memory_health` | 健康检查 | 记忆系统状态 |
| `memory_logs` | 查看日志 | 调试用 |
| `memory_report` | 评估报告 | 完整的组件评分和修复建议 |
| `memory_stats` | 统计数据 | 记忆系统统计信息 |
| `session_compress` | 会话压缩 | 压缩长对话为摘要 |
| `memory_nudge` | 主动建议 | 发现跨会话模式 |
| `user_profile` | 用户画像 | 记录和查询用户特征 |
| `user_profile_observe` | 快速观察 | 快捷记录用户观察 |
| `procedure_record` | 记录工作流 | 保存操作流程 |
| `procedure_find` | 查找工作流 | 查找相似工作流 |
| `procedure_execute` | 执行工作流 | 执行推荐工作流 |

### 全局级工具（4 个）

**仅 One-Prime 可调用，Cutia AI 助手无法使用**

| 工具名 | 功能 |
|--------|------|
| `global_write` | 写入全局记忆 |
| `global_query` | 查询全局记忆 |
| `global_stats` | 全局统计 |
| `global_dream` | 全局梦境整理 |

## Error Handling

### 优雅降级

如果 MCP 初始化失败，AI 助手会自动降级到仅使用本地工具：

```typescript
try {
  await initMcpTools();
} catch (error) {
  console.warn("MCP initialization failed. Using local tools only.");
  // 继续执行，不中断 AI 助手
}
```

### 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| `McpClient cannot run in browser` | 在浏览器环境调用 | 仅在服务端调用 |
| `MCP server not connected` | MCP Server 崩溃 | 自动重连（5s 延迟） |
| `MCP request timeout` | 请求超时（默认 30s） | 增加 timeout 配置 |
| `MCP server path not found` | 路径错误 | 检查 `NEXT_PUBLIC_MCP_SERVER_PATH` |

## Testing

### 验证 MCP 连接

```typescript
import { isMcpReady, getMcpTools } from "@/lib/ai/agent/mcp/mcp-tools";

// 在 Server Component 或 API Route 中
if (isMcpReady()) {
  const tools = getMcpTools();
  console.log(`MCP tools loaded: ${tools.length}`);
  tools.forEach(tool => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });
} else {
  console.warn("MCP is not ready");
}
```

### 测试记忆读写

```typescript
// 在 AI 对话中测试
用户: 记住我喜欢暗色主题
AI: [调用 memory_write] ✅ 已记住您偏好暗色主题

用户: 我喜欢什么主题？
AI: [调用 memory_query] 您偏好暗色主题
```

## Performance

### 性能指标（One Memory）

| 指标 | 值 | 目标 |
|------|-----|------|
| 混合查询 P50 | 6.6ms | < 200ms |
| 混合查询 P99 | 14.6ms | < 1s |
| 写入吞吐 | 556 条/秒 | > 100 条/秒 |

### 资源占用

- **MCP Server 内存**: < 100MB
- **启动时间**: < 2s
- **工具调用延迟**: < 200ms (P50)

## Troubleshooting

### MCP 工具未出现在 AI 工具列表中

**检查清单**：
1. ✅ `NEXT_PUBLIC_MCP_ENABLED=true` 在 `.env.local`
2. ✅ `NEXT_PUBLIC_MCP_SERVER_PATH` 路径正确
3. ✅ One Memory 已构建（`packages/memory-mcp/build/index.js` 存在）
4. ✅ 在服务端环境调用（Server Component/API Route）

**调试**：
```typescript
console.log("MCP enabled:", process.env.NEXT_PUBLIC_MCP_ENABLED);
console.log("MCP path:", process.env.NEXT_PUBLIC_MCP_SERVER_PATH);
console.log("MCP ready:", isMcpReady());
```

### MCP Server 崩溃

**原因**：
- Node.js 版本不兼容
- 缺少依赖
- 权限问题

**解决**：
```bash
# 手动测试 MCP Server
node /Users/mac/Desktop/AI-memory/packages/memory-mcp/build/index.js --help

# 检查 Node.js 版本
node --version  # 需要 >= 18
```

### 工具调用超时

**解决方案**：
- 增加 `mcpConfig.timeout` 配置
- 优化 MCP Server 性能
- 检查网络（如果使用远程 Embedder）

## Future Enhancements

- [ ] **会话压缩集成**：长对话自动压缩
- [ ] **主动 Nudge**：基于记忆模式主动建议
- [ ] **梦境整理**：定期自动整理记忆
- [ ] **用户画像注入**：将用户画像注入 System Prompt
- [ ] **记忆管理 UI**：查看/编辑/删除记忆的可视化界面

## References

- **One Memory 仓库**: `/Users/mac/Desktop/AI-memory`
- **MCP 规范**: https://spec.modelcontextprotocol.io/
- **Cutia AI 助手**: `apps/web/src/lib/ai/agent/`
