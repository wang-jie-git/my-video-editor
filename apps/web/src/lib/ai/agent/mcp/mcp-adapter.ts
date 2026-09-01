/**
 * McpToolAdapter - MCP 工具适配器
 *
 * 将 MCP 工具转换为 Cutia AI 助手的 AgentTool 格式
 */

import type { AgentTool } from "../tools/types";
import type { AgentToolResult } from "../types";
import type { McpToolSchema } from "./types";
import { getMcpManager } from "./mcp-manager";

/**
 * 将 MCP 工具转换为 AgentTool
 *
 * @param mcpTool - MCP 工具 Schema
 * @param serverId - Server ID
 * @returns AgentTool
 */
export function mcpToolToAgentTool(mcpTool: McpToolSchema, serverId: string): AgentTool {
  return {
    name: mcpTool.name,
    description: mcpTool.description,
    parameters: mcpTool.inputSchema,

    execute: async (args: Record<string, unknown>): Promise<AgentToolResult> => {
      const manager = getMcpManager();

      try {
        const result = await manager.callTool(serverId, mcpTool.name, args);

        return {
          success: result.success,
          message: result.message,
          data: result.data as AgentToolResult["data"],
        };
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error
              ? `MCP tool execution failed: ${error.message}`
              : "MCP tool execution failed",
        };
      }
    },
  };
}

/**
 * 批量转换 MCP 工具列表
 *
 * @param mcpTools - MCP 工具列表
 * @param serverId - Server ID
 * @returns AgentTool 列表
 */
export function mcpToolsToAgentTools(
  mcpTools: McpToolSchema[],
  serverId: string
): AgentTool[] {
  return mcpTools.map((tool) => mcpToolToAgentTool(tool, serverId));
}
