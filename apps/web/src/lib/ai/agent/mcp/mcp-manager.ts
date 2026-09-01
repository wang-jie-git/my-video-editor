/**
 * MCP Manager - 管理多个 MCP Server 连接
 *
 * 职责：
 * - 管理多个 MCP Server 连接
 * - 动态启用/禁用 Server
 * - 聚合所有 Server 的工具
 * - 自动重连和错误恢复
 */

import type { McpServerConfig, McpToolSchema, McpToolResult, McpServerStatus } from "./types";
import { McpClient } from "./mcp-client";

interface McpClientInstance {
  config: McpServerConfig;
  client: McpClient;
  status: McpServerStatus;
}

/**
 * MCP Manager
 *
 * 管理多个 MCP Server 连接，聚合工具列表
 */
export class McpManager {
  private servers = new Map<string, McpClientInstance>();
  private allTools = new Map<string, McpToolSchema>();

  /**
   * 添加并启动 MCP Server
   *
   * @param config - Server 配置
   */
  async addServer(config: McpServerConfig): Promise<void> {
    if (this.servers.has(config.id)) {
      throw new Error(`MCP Server "${config.id}" already exists`);
    }

    console.log(`[MCP Manager] Adding server: ${config.name} (${config.id})`);

    const client = new McpClient();
    const status: McpServerStatus = {
      id: config.id,
      connected: false,
      toolsCount: 0,
    };

    const instance: McpClientInstance = {
      config,
      client,
      status,
    };

    this.servers.set(config.id, instance);

    if (config.enabled) {
      await this.connectServer(instance);
    }
  }

  /**
   * 连接单个 Server
   */
  private async connectServer(instance: McpClientInstance): Promise<void> {
    const { config, client, status } = instance;

    console.log("[MCP Manager] ========== connectServer ==========");
    console.log("[MCP Manager] Server:", config.name, config.id);
    console.log("[MCP Manager] Server path:", config.serverPath);
    console.log("[MCP Manager] Server args:", config.serverArgs);

    try {
      console.log("[MCP Manager] Connecting to server...");
      await client.connect(config.serverPath, config.serverArgs);

      status.connected = true;
      status.lastConnected = new Date();
      status.lastError = undefined;

      // 获取工具列表（延迟一点，确保 discoverTools 完成）
      console.log("[MCP Manager] Client tools count:", client.getTools().length);
      await new Promise((resolve) => setTimeout(resolve, 100)); // 等待 100ms
      const tools = client.getTools();
      status.toolsCount = tools.length;

      console.log("[MCP Manager] Tools discovered:", tools.length);
      console.log("[MCP Manager] Tool names:", tools.map((t) => t.name));

      // 添加到全局工具映射
      for (const tool of tools) {
        // 如果工具名冲突，添加 Server ID 后缀
        const toolName = this.allTools.has(tool.name)
          ? `${config.id}_${tool.name}`
          : tool.name;

        this.allTools.set(toolName, {
          ...tool,
          name: toolName,
          description: `[${config.name}] ${tool.description}`,
        });
      }

      console.log(
        `[MCP Manager] Server "${config.name}" connected with ${tools.length} tools`
      );
      console.log("[MCP Manager] Total tools in manager:", this.allTools.size);
      console.log("[MCP Manager] ==========================================");
    } catch (error) {
      status.connected = false;
      status.lastError = error instanceof Error ? error.message : "Unknown error";

      console.error(
        `[MCP Manager] Failed to connect server "${config.name}":`,
        status.lastError
      );
      console.log("[MCP Manager] ==========================================");
    }
  }

  /**
   * 移除 MCP Server
   */
  removeServer(id: string): void {
    const instance = this.servers.get(id);
    if (!instance) {
      console.warn(`[MCP Manager] Server "${id}" not found`);
      return;
    }

    console.log(`[MCP Manager] Removing server: ${id}`);

    // 断开连接
    instance.client.disconnect();

    // 从工具映射中移除（需要查找所有工具）
    for (const [toolName, tool] of this.allTools) {
      if (toolName.startsWith(`${id}_`) || toolName === id) {
        this.allTools.delete(toolName);
      }
    }

    this.servers.delete(id);
  }

  /**
   * 启用 Server
   */
  async enableServer(id: string): Promise<void> {
    const instance = this.servers.get(id);
    if (!instance) {
      throw new Error(`MCP Server "${id}" not found`);
    }

    if (instance.status.connected) {
      console.log(`[MCP Manager] Server "${id}" already connected`);
      return;
    }

    instance.config.enabled = true;
    await this.connectServer(instance);
  }

  /**
   * 禁用 Server
   */
  disableServer(id: string): void {
    const instance = this.servers.get(id);
    if (!instance) {
      console.warn(`[MCP Manager] Server "${id}" not found`);
      return;
    }

    console.log(`[MCP Manager] Disabling server: ${id}`);

    instance.config.enabled = false;
    instance.client.disconnect();
    instance.status.connected = false;
    instance.status.toolsCount = 0;

    // 从工具映射中移除
    for (const [toolName] of this.allTools) {
      if (toolName.startsWith(`${id}_`) || toolName === id) {
        this.allTools.delete(toolName);
      }
    }
  }

  /**
   * 获取所有工具
   */
  getAllTools(): McpToolSchema[] {
    return Array.from(this.allTools.values());
  }

  /**
   * 连接所有已添加的 Server（公开方法）
   */
  async connectAllServers(): Promise<void> {
    console.log("[MCP Manager] Connecting all servers...");
    for (const instance of this.servers.values()) {
      await this.connectServer(instance);
    }
    console.log("[MCP Manager] All servers connection attempts completed");
  }

  /**
   * 获取 Server 状态
   */
  getServerStatus(id: string): McpServerStatus | undefined {
    return this.servers.get(id)?.status;
  }

  /**
   * 获取所有 Server 状态
   */
  getAllServerStatuses(): McpServerStatus[] {
    return Array.from(this.servers.values()).map((instance) => instance.status);
  }

  /**
   * 调用工具
   */
  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<McpToolResult> {
    const instance = this.servers.get(serverId);
    if (!instance) {
      return {
        success: false,
        message: `MCP Server "${serverId}" not found`,
      };
    }

    if (!instance.status.connected) {
      return {
        success: false,
        message: `MCP Server "${serverId}" is not connected`,
      };
    }

    try {
      return await instance.client.callTool(toolName, args);
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Tool execution failed",
      };
    }
  }

  /**
   * 清理所有连接
   */
  disconnectAll(): void {
    console.log("[MCP Manager] Disconnecting all servers...");

    for (const [id, instance] of this.servers) {
      console.log(`[MCP Manager] Disconnecting: ${id}`);
      instance.client.disconnect();
    }

    this.servers.clear();
    this.allTools.clear();
  }
}

/**
 * 单例实例
 */
let mcpManagerInstance: McpManager | null = null;

export function getMcpManager(): McpManager {
  if (!mcpManagerInstance) {
    mcpManagerInstance = new McpManager();
  }
  return mcpManagerInstance;
}

export function setMcpManager(manager: McpManager | null): void {
  mcpManagerInstance = manager;
}
