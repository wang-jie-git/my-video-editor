# MCP (Model Context Protocol) 支持

## 概述

Cutia AI 助手现已支持 **MCP (Model Context Protocol)**，可以连接任何兼容的 MCP Server，扩展 AI 的能力。

## 核心特性

✅ **通用 MCP 支持** - 不只是 One Memory，可以连接任何 MCP Server
✅ **多 Server 管理** - 同时连接多个 MCP Server
✅ **动态工具加载** - 自动发现和加载 MCP 工具
✅ **优雅降级** - MCP 不可用时继续使用本地工具
✅ **配置持久化** - 配置保存到 localStorage
✅ **UI 配置界面** - 可视化的 MCP 管理面板

## 快速开始

### 1. 启用 MCP

在 `.env.local` 中配置：

```bash
NEXT_PUBLIC_MCP_ENABLED=true
```

### 2. 添加 MCP Server

**方式 A：通过 UI 配置面板**

打开 AI 助手设置 → MCP 配置 → 添加 Server

**方式 B：代码配置**

```typescript
import { useMcpStore } from "@/lib/ai/agent/mcp/mcp-store";

// 添加 One Memory
useMcpStore.getState().addServer({
  name: "One Memory",
  description: "One Memory 记忆系统",
  enabled: true,
  serverPath: "/path/to/mcp-server.js",
  serverArgs: ["--embedder", "simple"],
  timeout: 30000,
  icon: "🧠",
  category: "memory",
});
```

### 3. 使用 MCP 工具

配置完成后，AI 助手会自动调用 MCP 工具：

```
用户: 记住我喜欢 MP4 格式
AI: [调用 memory_write 工具] ✅ 已记住您偏好 MP4 格式
```

## 架构

```
AI 助手
  ↓
Tool Registry
  ↓
├─ 本地工具（29 个）
└─ MCP 工具（动态）
    ↓
McpManager
  ↓
├─ McpClient (Server 1)
├─ McpClient (Server 2)
└─ McpClient (Server N)
    ↓
MCP Servers (stdio)
```

## 组件

### 1. McpClient

**职责**：
- 管理单个 MCP Server 连接
- JSON-RPC 2.0 通信
- 工具发现和调用

**文件**：`src/lib/ai/agent/mcp/mcp-client.ts`

### 2. McpManager

**职责**：
- 管理多个 MCP Server
- 聚合所有工具
- 自动重连

**文件**：`src/lib/ai/agent/mcp/mcp-manager.ts`

### 3. McpStore

**职责**：
- Zustand store 管理配置
- UI 状态管理
- 配置持久化

**文件**：`src/lib/ai/agent/mcp/mcp-store.ts`

### 4. McpAdapter

**职责**：
- MCP 工具 → AgentTool 转换
- 统一工具调用接口

**文件**：`src/lib/ai/agent/mcp/mcp-adapter.ts`

### 5. McpSettingsPanel

**职责**：
- UI 配置面板
- 添加/删除/启用/禁用 Server
- 查看连接状态

**文件**：`src/components/editor/panels/ai/mcp-settings-panel.tsx`

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NEXT_PUBLIC_MCP_ENABLED` | 全局 MCP 开关 | `false` |

## 环境限制

⚠️ **MCP 仅在以下环境可用**：
- ✅ Server Components
- ✅ API Routes
- ✅ Server Actions
- ❌ Client Components（浏览器环境）

**原因**：McpClient 使用 `child_process.spawn` 启动子进程。

## 使用示例

### 添加 One Memory

```typescript
import { useMcpStore } from "@/lib/ai/agent/mcp/mcp-store";

// 在 Server Component 或 API Route 中
const mcpStore = useMcpStore.getState();

mcpStore.addServer({
  id: "one-memory",
  name: "One Memory",
  description: "One Memory 记忆系统",
  enabled: true,
  serverPath: "/Users/mac/Desktop/AI-memory/packages/memory-mcp/build/index.js",
  serverArgs: ["--embedder", "simple"],
  timeout: 30000,
  icon: "🧠",
  category: "memory",
});
```

### 查询所有 MCP 工具

```typescript
import { getMcpManager } from "@/lib/ai/agent/mcp/mcp-manager";

const manager = getMcpManager();
const allTools = manager.getAllTools();

console.log("Available MCP tools:", allTools.map(t => t.name));
```

### 调用 MCP 工具

```typescript
import { getMcpManager } from "@/lib/ai/agent/mcp/mcp-manager";

const manager = getMcpManager();
const result = await manager.callTool(
  "one-memory",  // Server ID
  "memory_write", // 工具名
  {
    title: "用户偏好",
    summary: "喜欢 MP4 格式",
    body: "用户在视频导出时偏好使用 MP4 格式",
    importance: 5,
    tags: ["偏好", "视频格式"],
  }
);

console.log(result);
```

## 预设配置

### One Memory

```typescript
{
  id: "one-memory",
  name: "One Memory",
  description: "One Memory 记忆系统（19 个工具）",
  enabled: false,
  serverPath: "/Users/mac/Desktop/AI-memory/packages/memory-mcp/build/index.js",
  serverArgs: ["--embedder", "simple"],
  timeout: 30000,
  icon: "🧠",
  category: "memory",
}
```

## 错误处理

### 优雅降级

如果 MCP 初始化失败，AI 助手会自动继续使用本地工具：

```typescript
try {
  await initMcpTools();
} catch (error) {
  console.warn("MCP initialization failed. Using local tools only.");
}
```

### 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| `McpClient cannot run in browser` | 在浏览器环境调用 | 仅在服务端调用 |
| `MCP server not connected` | Server 崩溃 | 自动重连（5s 延迟） |
| `MCP request timeout` | 请求超时 | 增加 timeout 配置 |

## 未来规划

- [ ] 支持 HTTP/SSE 传输（不只是 stdio）
- [ ] MCP Server 市场/预设库
- [ ] 工具权限控制
- [ ] 工具调用日志和调试
- [ ] 批量工具导入/导出配置

## 参考资料

- **MCP 规范**: https://spec.modelcontextprotocol.io/
- **One Memory**: https://github.com/wang-jie-git/AI-memory
- **Anthropic MCP**: https://github.com/anthropics/anthropic-sdk-typescript
