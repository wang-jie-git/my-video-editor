'use server'

/**
 * MCP Server Actions
 *
 * 客户端组件通过这些 Server Actions 来操作 MCP
 * 所有实际的 MCP 连接都在服务端执行
 */

import { getMcpManager } from '@/lib/ai/agent/mcp/mcp-manager'
import { useMcpStore } from '@/lib/ai/agent/mcp/mcp-store'

// 模块加载日志
console.log('[McpActions] ========== MODULE LOADED ==========');
console.log('[McpActions] This should appear in terminal when page loads');

/**
 * 连接 MCP Server（在服务端执行）
 */
export async function connectMcpServerAction(serverId: string): Promise<{ success: boolean; error?: string }> {
	// 函数调用日志
	console.log(`[McpActions] ========== connectMcpServerAction CALLED ==========`);
	console.log(`[McpActions] serverId: ${serverId}`);

	try {
		const store = useMcpStore.getState()
		const server = store.config.servers.find((s) => s.id === serverId)

		console.log('[McpActions] ========== connectMcpServerAction ==========')
		console.log('[McpActions] serverId:', serverId)
		console.log('[McpActions] server:', server)
		console.log('[McpActions] store.config.servers:', store.config.servers)

		if (!server) {
			console.error('[McpActions] Server not found:', serverId)
			return { success: false, error: `Server "${serverId}" not found` }
		}

		const manager = getMcpManager()

		console.log('[McpActions] Manager instance:', manager)
		console.log('[McpActions] Manager servers before:', (manager as any).servers?.size)
		console.log('[McpActions] Manager tools before:', manager.getAllTools().length)

		// 检查是否已存在
		if ((manager as any).servers?.has(serverId)) {
			console.log(`[McpActions] Removing existing server "${serverId}" before reconnecting`)
			manager.removeServer(serverId)
		}

		console.log('[McpActions] Adding server...')
		await manager.addServer(server)

		console.log('[McpActions] Manager servers after:', (manager as any).servers?.size)
		console.log('[McpActions] Manager tools after:', manager.getAllTools().length)
		console.log('[McpActions] Manager getAllServerStatuses():', manager.getAllServerStatuses())

		store.refreshStatus()

		console.log('[McpActions] Store serverStatuses after refresh:', store.serverStatuses)
		console.log('[McpActions] ================================================')

		return { success: true }
	} catch (error) {
		console.error('[McpActions] Failed to connect server:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		}
	}
}

/**
 * 断开 MCP Server 连接（在服务端执行）
 */
export async function disconnectMcpServerAction(serverId: string): Promise<{ success: boolean; error?: string }> {
	console.log(`[McpActions] ========== disconnectMcpServerAction CALLED ==========`);
	console.log(`[McpActions] serverId: ${serverId}`);

	try {
		const store = useMcpStore.getState()
		const manager = getMcpManager()

		if ((manager as any).servers?.has(serverId)) {
			manager.removeServer(serverId)
		}

		store.refreshStatus()
		return { success: true }
	} catch (error) {
		console.error('[McpActions] Failed to disconnect server:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		}
	}
}

/**
 * 连接所有启用的 Server（在服务端执行）
 */
export async function connectAllMcpServersAction(): Promise<{ success: boolean; error?: string }> {
	console.log(`[McpActions] ========== connectAllMcpServersAction CALLED ==========`);

	try {
		const store = useMcpStore.getState()
		const manager = getMcpManager()

		for (const server of store.config.servers) {
			if (server.enabled) {
				try {
					await manager.addServer(server)
				} catch (error) {
					console.error(`[McpActions] Failed to connect "${server.name}":`, error)
				}
			}
		}

		store.refreshStatus()
		return { success: true }
	} catch (error) {
		console.error('[McpActions] Failed to connect all servers:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		}
	}
}

/**
 * 断开所有 Server（在服务端执行）
 */
export async function disconnectAllMcpServersAction(): Promise<{ success: boolean }> {
	console.log(`[McpActions] ========== disconnectAllMcpServersAction CALLED ==========`);

	try {
		const manager = getMcpManager()
		manager.disconnectAll()

		const store = useMcpStore.getState()
		store.refreshStatus()

		return { success: true }
	} catch (error) {
		console.error('[McpActions] Failed to disconnect all servers:', error)
		return { success: false }
	}
}

/**
 * 获取 MCP 状态（在服务端执行）
 */
export async function getMcpStatusAction() {
	try {
		const manager = getMcpManager()
		const store = useMcpStore.getState()

		console.log('[McpActions] ========== getMcpStatusAction ==========')
		console.log('[McpActions] Manager instance:', manager)
		console.log('[McpActions] Manager servers size:', (manager as any).servers?.size)
		console.log('[McpActions] Manager tools size:', manager.getAllTools().length)
		console.log('[McpActions] Manager getAllServerStatuses():', manager.getAllServerStatuses())
		console.log('[McpActions] Store serverStatuses:', store.serverStatuses)
		console.log('[McpActions] Store config.servers:', store.config.servers)

		// 调用 refreshStatus 确保状态最新
		store.refreshStatus()
		const freshStatuses = store.serverStatuses
		const freshTools = manager.getAllTools()

		console.log('[McpActions] After refreshStatus - serverStatuses:', freshStatuses)
		console.log('[McpActions] After refreshStatus - tools:', freshTools.length)
		console.log('[McpActions] ===========================================')

		return {
			success: true,
			data: {
				servers: store.config.servers,
				statuses: freshStatuses,
				tools: freshTools,
			},
		}
	} catch (error) {
		console.error('[McpActions] Failed to get MCP status:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		}
	}
}
