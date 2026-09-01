/**
 * MCP 配置
 *
 * 默认连接到 One Memory MCP Server
 * 可以通过环境变量自定义配置
 */

import type { McpServerConfig } from "./types";

/**
 * 默认 MCP Server 配置（One Memory）
 */
export const DEFAULT_MCP_SERVERS: McpServerConfig[] = [
  {
    id: "one-memory",
    name: "One Memory",
    description: "One Memory 记忆系统（19 个工具）",
    enabled: false,
    serverPath:
      process.env.NEXT_PUBLIC_MCP_SERVER_PATH ||
      "/Users/mac/Desktop/AI-memory/packages/memory-mcp/build/index.js",
    serverArgs: [
      // 查找 .codegraph 目录（从项目根目录向上查找）
      "--embedder",
      "simple", // 默认使用轻量 embedder（零模型下载）
    ].filter(Boolean),
    timeout: 30000,
    icon: "🧠",
    category: "memory",
  },
];

/**
 * 环境变量说明
 *
 * | 环境变量 | 说明 | 默认值 |
 * |---------|------|--------|
 * | NEXT_PUBLIC_MCP_ENABLED | 是否启用 MCP | false |
 * | NEXT_PUBLIC_MCP_SERVER_PATH | MCP Server 路径 | /Users/mac/Desktop/AI-memory/packages/memory-mcp/build/index.js |
 * | NEXT_PUBLIC_CODEGRAPH_DIR | CodeGraph 目录（可选） | 自动查找 |
 * | NEXT_PUBLIC_MCP_EMBEDDER | Embedder 类型（simple/api/local） | simple |
 * | NEXT_PUBLIC_MCP_EMBEDDER_API_KEY | Embedder API Key（api 模式需要） | - |
 * | NEXT_PUBLIC_MCP_EMBEDDER_BASE_URL | Embedder API Base URL | - |
 * | NEXT_PUBLIC_MCP_EMBEDDER_MODEL | Embedder Model | - |
 */

/**
 * 检查当前环境是否支持 MCP
 *
 * ⚠️ McpClient 只能在 Node.js 环境运行
 * - ✅ Server Components
 * - ✅ API Routes
 * - ✅ Server Actions
 * - ❌ Client Components（浏览器环境直接调用时）
 *
 * 💡 注意：客户端组件可以调用 MCP（通过 Server Actions），
 *    但客户端组件代码本身不能直接 import/use McpClient
 */
export function isMcpSupported(): boolean {
  // 浏览器环境不支持 McpClient（需要 node child_process 启动子进程）
  if (typeof window !== "undefined") {
    return false;
  }
  // 检查是否启用了 MCP
  // 注意：这里只检查环境变量，不检查 window
  // 因为客户端组件可以通过 Server Actions 调用 MCP
  if (process.env.NEXT_PUBLIC_MCP_ENABLED !== "true") {
    console.log("[MCP] MCP is disabled via environment variable.");
    return false;
  }

  return true;
}
