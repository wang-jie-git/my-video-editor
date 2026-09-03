/**
 * MCP 浏览器桥接（Phase 2）
 *
 * agent loop 运行在浏览器端，但 MCP Server 需要 Node 环境（spawn 子进程）。
 * 本模块通过 HTTP 将 MCP 操作转发到 Next server 端 API：
 * - connect: POST /api/ai/mcp/connect
 * - tools:   GET  /api/ai/mcp/tools
 * - call:    POST /api/ai/mcp/call
 *
 * 纯浏览器部署（无 server）时 fetch 失败 → 优雅降级（返回空，不抛错）。
 */
import type { AgentTool } from "../tools/types";
import type { McpServerConfig, McpServerStatus } from "../mcp/types";

const BASE = "/api/ai/mcp";

interface BridgeMcpTool {
	name: string;
	description: string;
	inputSchema: { type: "object"; properties: Record<string, unknown> };
	serverId: string;
}

/**
 * 拉取 MCP Server 状态（从 server 端的 McpManager）
 */
export async function bridgeFetchMcpStatuses(): Promise<McpServerStatus[]> {
	try {
		const res = await fetch(`${BASE}/servers`, { cache: "no-store" });
		if (!res.ok) return [];
		const data = (await res.json()) as {
			success: boolean;
			statuses?: McpServerStatus[];
		};
		if (!data.success) return [];
		return data.statuses ?? [];
	} catch (error) {
		console.warn("[MCP Bridge] fetch status failed (graceful):", error);
		return [];
	}
}

/**
 * 断开一个 MCP Server（转发到 server 端 removeServer）
 */
export async function bridgeDisconnectServer(serverId: string): Promise<boolean> {
	try {
		const res = await fetch(`${BASE}/disconnect`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ serverId }),
		});
		const data = (await res.json()) as { success: boolean };
		return data.success;
	} catch (error) {
		console.warn("[MCP Bridge] disconnect failed (graceful):", error);
		return false;
	}
}

/**
 * 检测桥接是否可用（server 端 API 可达性）。
 * 纯浏览器部署（无 server）时返回 false。
 */
export async function bridgeIsAvailable(): Promise<boolean> {
	try {
		const res = await fetch(`${BASE}/servers`, { cache: "no-store" });
		return res.ok;
	} catch {
		return false;
	}
}

/**
 * 连接所有启用的 MCP Server（转发到 server 端 spawn）
 */
export async function bridgeConnectServers(
	servers: McpServerConfig[],
): Promise<boolean> {
	try {
		const enabled = servers.filter((s) => s.enabled);
		if (enabled.length === 0) return false;

		const results = await Promise.all(
			enabled.map(async (server) => {
				const res = await fetch(`${BASE}/connect`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(server),
				});
				const data = (await res.json()) as { success: boolean };
				return data.success;
			}),
		);
		return results.some(Boolean);
	} catch (error) {
		console.warn("[MCP Bridge] connect failed (graceful):", error);
		return false;
	}
}

/**
 * 拉取 MCP 工具 Schema（从 server 端已连接的工具）
 */
export async function bridgeFetchMcpTools(): Promise<BridgeMcpTool[]> {
	try {
		const res = await fetch(`${BASE}/tools`, { cache: "no-store" });
		if (!res.ok) return [];
		const data = (await res.json()) as {
			success: boolean;
			tools?: BridgeMcpTool[];
		};
		if (!data.success) return [];
		return data.tools ?? [];
	} catch (error) {
		console.warn("[MCP Bridge] fetch tools failed (graceful):", error);
		return [];
	}
}

/**
 * 调用 MCP 工具（转发到 server 端 Node 环境执行）
 */
export async function bridgeCallMcpTool(
	serverId: string,
	toolName: string,
	args: Record<string, unknown>,
): Promise<{ success: boolean; message: string; data?: unknown }> {
	try {
		const res = await fetch(`${BASE}/call`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ serverId, toolName, args }),
		});
		const data = (await res.json()) as {
			success: boolean;
			message: string;
			data?: unknown;
		};
		return {
			success: data.success,
			message: data.message ?? "MCP tool call failed",
			data: data.data,
		};
	} catch (error) {
		return {
			success: false,
			message: error instanceof Error ? error.message : "MCP bridge call failed",
		};
	}
}

/**
 * 构建 MCP AgentTool 列表（execute 通过 HTTP 转发到 server）
 */
export function buildBridgeMcpTools(tools: BridgeMcpTool[]): AgentTool[] {
	return tools.map((tool) => ({
		name: tool.name,
		description: tool.description,
		parameters: tool.inputSchema,
		execute: async (args: Record<string, unknown>) => {
			const result = await bridgeCallMcpTool(tool.serverId, tool.name, args);
			return {
				success: result.success,
				message: result.message,
				data: result.data as Record<string, unknown> | undefined,
			};
		},
	}));
}
