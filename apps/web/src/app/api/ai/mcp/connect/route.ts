import { NextResponse } from "next/server";
import { getMcpManager } from "@/lib/ai/agent/mcp/mcp-manager";
import type { McpServerConfig } from "@/lib/ai/agent/mcp/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/mcp/connect
 *
 * 在 server 端连接一个 MCP Server（真实 spawn 子进程）。
 * body: McpServerConfig
 */
export async function POST(request: Request) {
	try {
		const body = (await request.json()) as Partial<McpServerConfig>;
		if (!body.id || !body.name || !body.serverPath) {
			return NextResponse.json(
				{ success: false, message: "Missing required fields: id, name, serverPath" },
				{ status: 400 },
			);
		}

		const config: McpServerConfig = {
			id: body.id,
			name: body.name,
			description: body.description,
			enabled: true,
			serverPath: body.serverPath,
			serverArgs: body.serverArgs ?? [],
			timeout: body.timeout,
			env: body.env,
			icon: body.icon,
			category: body.category,
		};

		const manager = getMcpManager();
		// 重复连接前先移除旧实例，保证幂等
		if ((manager as unknown as { servers: Map<string, unknown> }).servers?.has(config.id)) {
			manager.removeServer(config.id);
		}
		await manager.addServer(config);

		const status = manager.getServerStatus(config.id);
		return NextResponse.json({ success: true, status });
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: error instanceof Error ? error.message : "Failed to connect MCP server",
			},
			{ status: 500 },
		);
	}
}
