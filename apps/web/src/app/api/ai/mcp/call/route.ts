import { NextResponse } from "next/server";
import { getMcpManager } from "@/lib/ai/agent/mcp/mcp-manager";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/mcp/call
 *
 * 在 server 端调用 MCP 工具（真实 Node 环境执行）。
 * body: { serverId, toolName, args }
 */
export async function POST(request: Request) {
	try {
		const body = (await request.json()) as {
			serverId?: string;
			toolName?: string;
			args?: Record<string, unknown>;
		};
		if (!body.serverId || !body.toolName) {
			return NextResponse.json(
				{ success: false, message: "Missing required fields: serverId, toolName" },
				{ status: 400 },
			);
		}

		const manager = getMcpManager();
		const result = await manager.callTool(body.serverId, body.toolName, body.args ?? {});

		return NextResponse.json({
			success: result.success,
			message: result.message,
			data: result.data ?? null,
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: error instanceof Error ? error.message : "Failed to call MCP tool",
				data: null,
			},
			{ status: 500 },
		);
	}
}
