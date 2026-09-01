/**
 * MCP 类型定义
 */

/**
 * MCP Server 配置
 */
export interface McpServerConfig {
  /** 唯一 ID */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 是否启用 */
  enabled: boolean;
  /** MCP Server 可执行文件路径 */
  serverPath: string;
  /** 传递给 Server 的参数 */
  serverArgs?: string[];
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 环境变量（传递给 Server） */
  env?: Record<string, string>;
  /** 图标（emoji 或 URL） */
  icon?: string;
  /** 分类（如 "memory", "tools", "services"） */
  category?: string;
}

/**
 * MCP 工具 Schema（与 MCP 协议一致）
 */
export interface McpToolSchema {
  name: string;
  description: string;
  title?: string;
  annotations?: {
    audience?: ("user" | "assistant")[];
    priority?: number;
  };
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * MCP 工具调用结果
 */
export interface McpToolResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * MCP Server 连接状态
 */
export interface McpServerStatus {
  id: string;
  connected: boolean;
  toolsCount: number;
  lastError?: string;
  lastConnected?: Date;
}

/**
 * MCP 配置存储
 */
export interface McpConfig {
  /** 全局开关 */
  enabled: boolean;
  /** MCP Server 列表 */
  servers: McpServerConfig[];
}
