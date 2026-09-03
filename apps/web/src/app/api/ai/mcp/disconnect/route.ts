import { NextResponse } from "next/server";
import { getMcpManager } from "@/lib/ai/agent/mcp/mcp-manager";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/mcp/disconnect
 *
 * 在 server 端断开一个 MCP Server（移除实例，停止子进程）。
 * body: { serverId: string }
 */
export async function POST(request: Request) {
	try {
		const body = (await request.json()) as { serverId?: string };
		if (!body.serverId) {
			return NextResponse.json(
				{ success: false, message: "Missing required field: serverId" },
				{ status: 400 },
			);
		}

		const manager = getMcpManager();
		if (
			(manager as unknown as { servers: Map<string, unknown> }).servers?.has(
				body.serverId,
			)
		) {
			manager.removeServer(body.serverId);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: error instanceof Error ? error.message : "Failed to disconnect MCP server",
			},
			{ status: 500 },
		);
	}
}