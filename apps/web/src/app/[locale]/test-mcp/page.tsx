'use client'

import { useState, useEffect, useCallback } from 'react'
import { isMcpSupported } from '@/lib/ai/agent/mcp/config'
import { useMcpStore } from '@/lib/ai/agent/mcp/mcp-store'
import {
	connectMcpServerAction,
	disconnectMcpServerAction,
	connectAllMcpServersAction,
	disconnectAllMcpServersAction,
	getMcpStatusAction,
} from '@/lib/ai/agent/mcp/mcp-actions'

/**
 * MCP 测试页面（客户端版本）
 *
 * 功能：
 * - 显示 MCP 环境状态
 * - 添加/删除 MCP Server 配置
 * - 通过 Server Actions 连接/断开 Server
 * - 显示可用工具
 */
export default function TestMcpPage() {
	// 环境检测
	// 注意：客户端组件可以通过 Server Actions 调用 MCP
	const mcpSupported = isMcpSupported()
	const mcpEnabled = process.env.NEXT_PUBLIC_MCP_ENABLED === 'true'

	// 本地状态
	const [servers, setServers] = useState<any[]>([])
	const [serverStatuses, setServerStatuses] = useState<any[]>([])
	const [mcpTools, setMcpTools] = useState<any[]>([])
	const [mounted, setMounted] = useState(false)
	const [loading, setLoading] = useState(false)

	// 刷新数据
	const refreshData = useCallback(() => {
		const store = useMcpStore.getState()

		setServers(store.config.servers)
		setServerStatuses(store.serverStatuses)
		setMcpTools([]) // 工具列表从 Server Actions 获取
	}, [])

	// 从服务端获取完整状态
	const refreshFromServer = useCallback(async () => {
		console.log('[TestMCP] refreshFromServer called')
		setLoading(true)
		try {
			const result = await getMcpStatusAction()

			console.log('[TestMCP] getMcpStatusAction result:', result)

			if (result.success && result.data) {
				console.log('[TestMCP] Setting statuses and tools:', {
					statuses: result.data.statuses,
					toolsCount: result.data.tools.length,
				})
				setServerStatuses(result.data.statuses)
				setMcpTools(result.data.tools)
			} else {
				console.error('[TestMCP] getMcpStatusAction failed:', result.error)
			}

			refreshData()
		} catch (error) {
			console.error('[TestMCP] Failed to refresh from server:', error)
		} finally {
			setLoading(false)
		}
	}, [refreshData])

	// 初始化
	useEffect(() => {
		setMounted(true)
		refreshData()

		// 如果 MCP 已启用，从服务端获取状态
		if (mcpEnabled && mcpSupported) {
			refreshFromServer()
		}
	}, [mcpEnabled, mcpSupported, refreshData, refreshFromServer])

	// 添加 Server
	const handleAddServer = () => {
		const store = useMcpStore.getState()
		const existingServer = store.config.servers.find(
			(s) => s.serverPath === '/Users/mac/Desktop/AI-memory/packages/memory-mcp/build/index.js'
		)

		if (existingServer) {
			alert('One Memory 已存在！')
			return
		}

		store.addServer({
			name: 'One Memory',
			description: 'One Memory 记忆系统（19 个工具）',
			enabled: mcpEnabled,
			serverPath: '/Users/mac/Desktop/AI-memory/packages/memory-mcp/build/index.js',
			serverArgs: ['--embedder', 'simple'],
			timeout: 30000,
			icon: '🧠',
			category: 'memory',
		})
		refreshData()
	}

	// 连接 Server（通过 Server Action）
	const handleConnectServer = async (serverId: string) => {
		setLoading(true)
		try {
			console.log('[TestMCP] Calling connectMcpServerAction with serverId:', serverId)
			const result = await connectMcpServerAction(serverId)

			console.log('[TestMCP] connectMcpServerAction result:', result)

			if (result.success) {
				console.log(`[TestMCP] Connected server: ${serverId}`)
				await refreshFromServer()
			} else {
				console.error(`[TestMCP] Connection failed:`, result.error)
				alert(`连接失败: ${result.error}`)
			}
		} catch (error) {
			console.error('[TestMCP] Failed to connect server:', error)
			alert(`连接失败: ${error}`)
		} finally {
			setLoading(false)
		}
	}

	// 断开 Server（通过 Server Action）
	const handleDisconnectServer = async (serverId: string) => {
		setLoading(true)
		try {
			const result = await disconnectMcpServerAction(serverId)

			if (result.success) {
				console.log(`[TestMCP] Disconnected server: ${serverId}`)
				await refreshFromServer()
			} else {
				alert(`断开失败: ${result.error}`)
			}
		} catch (error) {
			console.error('[TestMCP] Failed to disconnect server:', error)
			alert(`断开失败: ${error}`)
		} finally {
			setLoading(false)
		}
	}

	// 连接所有 Server（通过 Server Action）
	const handleConnectAll = async () => {
		if (!mcpEnabled) {
			alert('MCP 未启用，请先设置环境变量')
			return
		}

		setLoading(true)
		try {
			const result = await connectAllMcpServersAction()

			if (result.success) {
				console.log('[TestMCP] Connected all servers')
				await refreshFromServer()
			} else {
				alert(`连接失败: ${result.error}`)
			}
		} catch (error) {
			console.error('[TestMCP] Failed to connect all servers:', error)
			alert(`连接失败: ${error}`)
		} finally {
			setLoading(false)
		}
	}

	// 断开所有连接（通过 Server Action）
	const handleDisconnectAll = async () => {
		setLoading(true)
		try {
			const result = await disconnectAllMcpServersAction()

			if (result.success) {
				console.log('[TestMCP] Disconnected all servers')
				await refreshFromServer()
			}
		} catch (error) {
			console.error('[TestMCP] Failed to disconnect all servers:', error)
		} finally {
			setLoading(false)
		}
	}

	// 刷新状态
	const handleRefreshStatus = async () => {
		await refreshFromServer()
	}

	// 删除 Server
	const handleRemoveServer = (serverId: string) => {
		useMcpStore.getState().removeServer(serverId)
		refreshData()
	}

	// 清理重复的 Server
	const handleRemoveDuplicates = () => {
		const store = useMcpStore.getState()
		const seen = new Map<string, string>()

		for (const server of store.config.servers) {
			const key = server.serverPath
			if (seen.has(key)) {
				console.log(`[TestMCP] Removing duplicate: ${server.name} (${server.id})`)
				store.removeServer(server.id)
			} else {
				seen.set(key, server.id)
			}
		}

		refreshData()
	}

	if (!mounted) {
		return <div className="min-h-screen bg-gray-50 p-8">加载中...</div>
	}

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="max-w-6xl mx-auto">
				<h1 className="text-4xl font-bold mb-8 text-gray-900">MCP 测试页面</h1>

				{loading && (
					<div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
						<p className="text-sm text-blue-800">⏳ 处理中...</p>
					</div>
				)}

				{/* 环境状态 */}
				<section className="bg-white rounded-lg shadow-md p-6 mb-6">
					<h2 className="text-2xl font-semibold mb-4 text-gray-800">🌍 环境状态</h2>
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<span className="font-medium">MCP 支持:</span>
							<span
								className={`px-2 py-1 rounded text-sm ${
									mcpSupported ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
								}`}
							>
								{mcpSupported ? '✅ 支持' : '❌ 不支持'}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="font-medium">MCP 启用:</span>
							<span
								className={`px-2 py-1 rounded text-sm ${
									mcpEnabled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
								}`}
							>
								{mcpEnabled ? '✅ 已启用' : '⚠️ 未启用'}
							</span>
						</div>
						{!mcpEnabled && (
							<div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
								<p className="text-sm text-blue-800">
									<strong>💡 启用 MCP:</strong>
								</p>
								<p className="text-sm text-blue-700 mt-1">
									在 <code className="px-1 py-0.5 bg-blue-100 rounded">apps/web/.env.local</code> 中添加：
								</p>
								<pre className="mt-2 p-2 bg-blue-100 rounded text-xs font-mono text-blue-900 overflow-x-auto">
NEXT_PUBLIC_MCP_ENABLED=true
NEXT_PUBLIC_MCP_SERVER_PATH=/Users/mac/Desktop/AI-memory/packages/memory-mcp/build/index.js
								</pre>
								<p className="text-xs text-blue-600 mt-2">然后重启开发服务器</p>
							</div>
						)}
						<div className="flex items-center gap-2">
							<span className="font-medium">Server 数量:</span>
							<span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">{servers.length}</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="font-medium">工具数量:</span>
							<span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">{mcpTools.length}</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="font-medium">连接状态:</span>
							<span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
								{serverStatuses.filter((s) => s.connected).length} / {serverStatuses.length}
							</span>
						</div>
					</div>
				</section>

				{/* Server 列表 */}
				<section className="bg-white rounded-lg shadow-md p-6 mb-6">
					<h2 className="text-2xl font-semibold mb-4 text-gray-800">🔌 MCP Servers</h2>

					{servers.length === 0 ? (
						<div className="text-gray-500 text-center py-8">暂无 MCP Server，请添加一个 Server 开始测试</div>
					) : (
						<div className="space-y-4">
							{servers.map((server) => {
								const status = serverStatuses.find((s: any) => s.id === server.id)
								return (
									<div
										key={server.id}
										className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
									>
										<div className="flex items-start justify-between mb-2">
											<div className="flex items-center gap-2">
												<span className="text-2xl">{server.icon}</span>
												<div>
													<h3 className="font-semibold text-lg">{server.name}</h3>
													<p className="text-sm text-gray-600">{server.description}</p>
												</div>
											</div>
											<div className="flex gap-2">
												{status?.connected ? (
													<span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
														✅ 已连接 ({status.toolsCount} 工具)
													</span>
												) : (
													<span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">❌ 未连接</span>
												)}
											</div>
										</div>

										<div className="bg-gray-50 rounded p-3 mb-3">
											<p className="text-xs font-mono text-gray-700 break-all">{server.serverPath}</p>
											{server.serverArgs && server.serverArgs.length > 0 && (
												<p className="text-xs font-mono text-gray-600 mt-1">参数: {server.serverArgs.join(' ')}</p>
											)}
										</div>

										{status?.lastError && (
											<div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
												<p className="text-sm text-red-800">错误: {status.lastError}</p>
											</div>
										)}

										<div className="flex gap-2">
											<button
												onClick={() =>
													status?.connected ? handleDisconnectServer(server.id) : handleConnectServer(server.id)
												}
												disabled={loading}
												className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
											>
												{status?.connected ? '断开连接' : '连接'}
											</button>
											<button
												onClick={() => handleRemoveServer(server.id)}
												className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
											>
												删除
											</button>
										</div>
									</div>
								)
							})}
						</div>
					)}
				</section>

				{/* 工具列表 */}
				<section className="bg-white rounded-lg shadow-md p-6 mb-6">
					<h2 className="text-2xl font-semibold mb-4 text-gray-800">🛠️ 可用工具 ({mcpTools.length})</h2>

					{mcpTools.length === 0 ? (
						<div className="text-gray-500 text-center py-8">暂无可用工具，请先连接一个 MCP Server</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{mcpTools.map((tool) => (
								<div
									key={tool.name}
									className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
								>
									<h3 className="font-semibold text-sm mb-2 text-blue-600">{tool.name}</h3>
									<p className="text-xs text-gray-600 line-clamp-3">{tool.description}</p>
								</div>
							))}
						</div>
					)}
				</section>

				{/* 快速操作 */}
				<section className="bg-white rounded-lg shadow-md p-6">
					<h2 className="text-2xl font-semibold mb-4 text-gray-800">⚡ 快速操作</h2>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<button
							onClick={handleAddServer}
							className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
						>
							🧠 添加 One Memory
						</button>

						<button
							onClick={handleConnectAll}
							disabled={!mcpEnabled || loading}
							className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							🔗 连接所有 Server
						</button>

						<button
							onClick={handleDisconnectAll}
							disabled={loading}
							className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							🔌 断开所有连接
						</button>

						<button
							onClick={handleRefreshStatus}
							disabled={loading}
							className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							🔄 刷新状态
						</button>

						<button
							onClick={handleRemoveDuplicates}
							className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
						>
							🧹 清理重复
						</button>
					</div>
				</section>
			</div>
		</div>
	)
}
