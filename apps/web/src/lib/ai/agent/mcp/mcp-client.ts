/**
 * McpClient - MCP Client
 *
 * 管理与单个 MCP Server 的通信
 * - 通过 stdio 发送 JSON-RPC 2.0 消息
 * - 工具发现（tools/list）
 * - 工具调用（tools/call）
 * - 自动重连 + 超时处理
 *
 * ⚠️ 注意：只能在 Node.js 环境运行
 */

import type { McpToolSchema, McpToolResult } from "./types";

const DEFAULT_TIMEOUT = 30000; // 30s
const RECONNECT_DELAY = 5000; // 5s

interface JsonRpcMessage {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * MCP 客户端（服务端专用）
 *
 * ⚠️ 注意：只能在 Node.js 环境运行
 * 浏览器环境会抛出错误，调用方需要检查环境
 */
export class McpClient {
  private process: ReturnType<typeof import("child_process").spawn> | null = null;
  private tools: McpToolSchema[] = [];
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>();
  private isConnecting = false;
  private serverPath: string | null = null;
  private serverArgs: string[] = [];

  /**
   * 连接到 MCP Server
   *
   * @param mcpServerPath - MCP Server 可执行文件路径
   * @param serverArgs - 传递给 MCP Server 的参数（如 --codegraph-dir）
   */
  async connect(mcpServerPath: string, serverArgs: string[] = []): Promise<void> {
    if (this.isConnecting) {
      throw new Error("Already connecting to MCP server");
    }

    if (this.process) {
      throw new Error("Already connected to MCP server");
    }

    this.isConnecting = true;
    this.serverPath = mcpServerPath;
    this.serverArgs = serverArgs;

    try {
      // 环境检测：只能在 Node.js 环境运行
      if (typeof window !== "undefined") {
        throw new Error(
          "McpClient cannot run in browser environment. Only available in Node.js/Edge runtime."
        );
      }

      const { spawn } = await import("child_process");

      this.process = spawn("node", [mcpServerPath, ...serverArgs], {
        stdio: ["pipe", "pipe", "pipe"], // stdin, stdout, stderr
      });

      if (!this.process.stdin || !this.process.stdout) {
        throw new Error("Failed to create stdio pipes");
      }

      // 监听 MCP Server 输出
      this.process.stdout.on("data", (data: Buffer) => {
        this.handleMessage(data.toString());
      });

      this.process.stderr?.on("data", (data: Buffer) => {
        console.error("[MCP Server]", data.toString().trim());
      });

      this.process.on("exit", (code, signal) => {
        console.log(`[MCP Client] Server exited: code=${code} signal=${signal}`);
        this.cleanup();

        // 自动重连（除非是主动断开）
        if (code !== 0 && signal !== "SIGTERM") {
          console.log(`[MCP Client] Attempting to reconnect in ${RECONNECT_DELAY}ms...`);
          setTimeout(() => {
            this.reconnect();
          }, RECONNECT_DELAY);
        }
      });

      this.process.on("error", (err) => {
        console.error("[MCP Client] Process error:", err);
        this.cleanup();
      });

      // 等待初始化完成（发送 initialize 请求）
      await this.initialize();

      // 发现工具
      await this.discoverTools();

      console.log(`[MCP Client] Connected successfully. Found ${this.tools.length} tools.`);
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * 发送 JSON-RPC 初始化请求
   */
  private async initialize(): Promise<void> {
    await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "cutia-ai-assistant",
        version: "1.0.0",
      },
    });

    // 发送 initialized 通知
    this.sendNotification("initialized", {});
  }

  /**
   * 发现可用工具
   */
  private async discoverTools(): Promise<void> {
    console.log("[MCP Client] Discovering tools...");
    const response = await this.sendRequest("tools/list", {});
    console.log("[MCP Client] tools/list response:", response);

    if (response && typeof response === "object" && "tools" in response) {
      this.tools = (response as { tools: McpToolSchema[] }).tools;
      console.log(`[MCP Client] Discovered ${this.tools.length} tools`);
    } else {
      console.warn("[MCP Client] No tools found in response");
      this.tools = [];
    }
  }

  /**
   * 调用 MCP 工具
   *
   * @param name - 工具名称
   * @param args - 工具参数
   * @param timeout - 超时时间（默认 30s）
   */
  async callTool(
    name: string,
    args: Record<string, unknown>,
    timeout = DEFAULT_TIMEOUT
  ): Promise<McpToolResult> {
    if (!this.process) {
      throw new Error("MCP server not connected");
    }

    let response: unknown;
    try {
      response = await this.sendRequest(
        "tools/call",
        {
          name,
          arguments: args,
        },
        timeout
      );
    } catch (error) {
      // JSON-RPC error（如工具不存在/参数错误）→ 返回失败结果，不抛异常
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "MCP tool call failed",
      };
    }

    if (!response) {
      throw new Error(`Empty response from tool: ${name}`);
    }

    // MCP 工具调用结果格式
    const result = response as {
      content?: Array<{ type: string; text?: string }>;
      isError?: boolean;
    };

    const textContent = result.content?.find((c) => c.type === "text");
    const message = textContent?.text || "No response";
    const isError = result.isError === true;

    return {
      success: !isError,
      message,
      data: isError ? undefined : result,
    };
  }

  /**
   * 获取所有已发现工具
   */
  getTools(): McpToolSchema[] {
    return [...this.tools];
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.process != null && !this.process.killed;
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.process) {
      console.log("[MCP Client] Disconnecting...");
      this.process.kill("SIGTERM");
      this.cleanup();
    }
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    this.process = null;
    this.tools = [];
    this.requestId = 0;

    // 拒绝所有等待中的请求
    for (const [id, { reject, timeout }] of this.pendingRequests) {
      clearTimeout(timeout);
      reject(new Error("MCP server disconnected"));
    }
    this.pendingRequests.clear();
  }

  /**
   * 重连（内部方法）
   */
  private async reconnect(): Promise<void> {
    if (this.isConnecting) return;

    try {
      if (this.serverPath) {
        await this.connect(this.serverPath, this.serverArgs);
      }
    } catch (error) {
      console.error("[MCP Client] Reconnection failed:", error);
    }
  }

  /**
   * 发送 JSON-RPC 请求并等待响应
   */
  private async sendRequest(
    method: string,
    params: Record<string, unknown>,
    timeout = DEFAULT_TIMEOUT
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const message: JsonRpcMessage = {
        jsonrpc: "2.0",
        id,
        method,
        params,
      };

      // 设置超时
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`MCP request timeout: ${method} (${timeout}ms)`));
      }, timeout);

      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout: timer as unknown as NodeJS.Timeout,
      });

      // 发送消息
      if (this.process?.stdin) {
        this.process.stdin.write(JSON.stringify(message) + "\n");
      } else {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(new Error("MCP server not connected"));
      }
    });
  }

  /**
   * 发送 JSON-RPC 通知（无响应）
   */
  private sendNotification(
    method: string,
    params: Record<string, unknown>
  ): void {
    if (!this.process?.stdin) {
      console.error("[MCP Client] Cannot send notification: not connected");
      return;
    }

    const message: JsonRpcMessage = {
      jsonrpc: "2.0",
      id: 0, // 通知的 id 为 0
      method,
      params,
    };

    this.process.stdin.write(JSON.stringify(message) + "\n");
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(data: string): void {
    try {
      const lines = data.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        const response: JsonRpcResponse = JSON.parse(line);

        if (response.id === 0) {
          // 通知消息，忽略
          continue;
        }

        const pending = this.pendingRequests.get(response.id);
        if (!pending) {
          console.warn(`[MCP Client] Unexpected response id: ${response.id}`);
          continue;
        }

        this.pendingRequests.delete(response.id);
        clearTimeout(pending.timeout);

        if (response.error) {
          pending.reject(
            new Error(
              `MCP error [${response.error.code}]: ${response.error.message}`
            )
          );
        } else {
          pending.resolve(response.result);
        }
      }
    } catch (error) {
      console.error("[MCP Client] Failed to parse message:", error, data);
    }
  }
}

/**
 * 单例实例
 */
let mcpClientInstance: McpClient | null = null;

export function getMcpClient(): McpClient | null {
  return mcpClientInstance;
}

export function setMcpClient(client: McpClient | null): void {
  mcpClientInstance = client;
}
