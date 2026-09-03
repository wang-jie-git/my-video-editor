/**
 * MCP 工具注册表（兼容层）
 *
 * 保留旧的单 Server API 以兼容现有代码
 * 新代码应直接使用 McpManager
 */

import { getMcpManager } from "./mcp-manager";
import { isMcpSupported } from "./config";
import { DEFAULT_MCP_SERVERS } from "./config";
import { setMcpTools } from "../tools";
import type { AgentTool } from "../tools/types";
import type { AgentToolResult } from "../types";

/**
 * MCP 工具列表（动态加载）
 */
let mcpTools: AgentTool[] = [];
let isMcpInitialized = false;

/**
 * 初始化 MCP 工具（兼容层）
 *
 * 这个函数现在会初始化 McpManager 并连接所有启用的 Server
 */
export async function initMcpTools(): Promise<void> {
  if (isMcpInitialized) {
    console.log("[MCP] Already initialized");
    return;
  }

  if (!isMcpSupported()) {
    console.warn("[MCP] MCP is not supported in current environment");
    return;
  }

  try {
    console.log("[MCP] Initializing MCP Manager...");

    // 使用 McpManager 初始化
    const manager = getMcpManager();

    // 添加默认 Server（先添加配置）
    for (const server of DEFAULT_MCP_SERVERS) {
      console.log(`[MCP] Adding server config: ${server.name} (enabled=${server.enabled})`);
      await manager.addServer(server);
    }

    // 手动连接所有 Server
    console.log("[MCP] Connecting all servers...");
    await manager.connectAllServers();

    // 等待连接完成
    console.log("[MCP] Waiting for connections to complete...");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 获取所有工具（含所属 Server ID，精确路由，无前缀歧义）
    const allTools = manager.getAllToolsWithServer();
    console.log(`[MCP] Found ${allTools.length} tools from manager`);

    mcpTools = allTools.map(({ tool, serverId }) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
      execute: async (args: Record<string, unknown>): Promise<AgentToolResult> => {
        const result = await manager.callTool(serverId, tool.name, args);
        return {
          success: result.success,
          message: result.message,
          data: result.data as AgentToolResult["data"],
        };
      },
    }));

    // 更新工具注册表
    setMcpTools(mcpTools);

    isMcpInitialized = true;
    console.log(`[MCP] Successfully initialized ${mcpTools.length} MCP tools`);
  } catch (error) {
    console.error("[MCP] Failed to initialize MCP tools:", error);
    console.warn(
      "[MCP] MCP initialization failed. AI assistant will continue with local tools only."
    );
    // 优雅降级
  }
}

/**
 * 获取 MCP 工具列表
 */
export function getMcpTools(): AgentTool[] {
  return [...mcpTools];
}

/**
 * 检查 MCP 是否已初始化
 */
export function isMcpReady(): boolean {
  return isMcpInitialized;
}

/**
 * 断开 MCP 连接
 */
export function disconnectMcp(): void {
  const manager = getMcpManager();
  manager.disconnectAll();
  mcpTools = [];
  isMcpInitialized = false;
  setMcpTools([]);
  console.log("[MCP] Disconnected");
}
