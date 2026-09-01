import { NextResponse } from "next/server";
import { getMcpManager } from "@/lib/ai/agent/mcp/mcp-manager";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/mcp/servers
 *
 * 返回 MCP Server 配置与连接状态。
 * server 端持有实际连接（McpManager 单例），浏览器端通过本路由查看状态。
 */
export async function GET() {
	try {
		const manager = getMcpManager();
		const statuses = manager.getAllServerStatuses();
		return NextResponse.json({ success: true, statuses });
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: error instanceof Error ? error.message : "Failed to get MCP servers",
			},
			{ status: 500 },
		);
	}
}
