import { NextResponse } from "next/server";
import { getMcpManager } from "@/lib/ai/agent/mcp/mcp-manager";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/mcp/tools
 *
 * 返回当前已连接的所有 MCP 工具 Schema（含所属 Server ID）。
 * 浏览器端据此构建 AgentTool，并可通过 /api/ai/mcp/call 转发执行。
 */
export async function GET() {
	try {
		const manager = getMcpManager();
		const tools = manager.getAllToolsWithServer();
		return NextResponse.json({
			success: true,
			tools: tools.map(({ tool, serverId }) => ({
				name: tool.name,
				description: tool.description,
				inputSchema: tool.inputSchema,
				serverId,
			})),
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: error instanceof Error ? error.message : "Failed to get MCP tools",
				tools: [],
			},
			{ status: 500 },
		);
	}
}
