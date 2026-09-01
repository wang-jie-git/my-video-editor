'use client'

import { useState, useEffect } from 'react'
import { getMcpManager } from '@/lib/ai/agent/mcp/mcp-manager'
import { isMcpSupported } from '@/lib/ai/agent/mcp/config'
import { useMcpStore } from '@/lib/ai/agent/mcp/mcp-store'

export default function TestMcpPage() {
	const mcpSupported = typeof window === 'undefined' ? false : isMcpSupported()
	const mcpEnabled = process.env.NEXT_PUBLIC_MCP_ENABLED === 'true'

	const [servers, setServers] = useState<any[]>([])
	const [serverStatuses, setServerStatuses] = useState<any[]>([])
	const [mcpTools, setMcpTools] = useState<any[]>([])
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
		refreshData()
	}, [])

	const refreshData = () => {
		const manager = getMcpManager()
		const store = useMcpStore.getState()

		setServers(store.config.servers)
		setServerStatuses(manager ? manager.getAllServerStatuses() : [])
		setMcpTools(manager ? manager.getAllTools() : [])
	}

	const handleAddServer = () => {
		useMcpStore.getState().addServer({
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

	const handleToggleConnection = async (serverId: string, connected: boolean) => {
		const store = useMcpStore.getState()
		if (connected) {
			await store.disconnectServer(serverId)
		} else {
			await store.connectServer(serverId)
		}
		refreshData()
	}

	const handleRemoveServer = (serverId: string) => {
		useMcpStore.getState().removeServer(serverId)
		refreshData()
	}

	const handleConnectAll = async () => {
		if (mcpEnabled) {
			await useMcpStore.getState().connectAll()
			refreshData()
		}
	}

	const handleDisconnectAll = () => {
		useMcpStore.getState().disconnectAll()
		refreshData()
	}

	const handleRefreshStatus = () => {
		useMcpStore.getState().refreshStatus()
		refreshData()
	}

	if (!mounted) {
		return <div className="min-h-screen bg-gray-50 p-8">加载中...</div>
	}

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="max-w-6xl mx-auto">
				<h1 className="text-4xl font-bold mb-8 text-gray-900">MCP 测试页面</h1>

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
						<div className="flex items-center gap-2">
							<span className="font-medium">Server 数量:</span>
							<span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
								{servers.length}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="font-medium">工具数量:</span>
							<span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
								{mcpTools.length}
							</span>
						</div>
					</div>
				</section>

				{/* Server 列表 */}
				<section className="bg-white rounded-lg shadow-md p-6 mb-6">
					<h2 className="text-2xl font-semibold mb-4 text-gray-800">🔌 MCP Servers</h2>

					{servers.length === 0 ? (
						<div className="text-gray-500 text-center py-8">
							暂无 MCP Server，请添加一个 Server 开始测试
						</div>
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
													<span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
														❌ 未连接
													</span>
												)}
											</div>
										</div>

										<div className="bg-gray-50 rounded p-3 mb-3">
											<p className="text-xs font-mono text-gray-700 break-all">{server.serverPath}</p>
											{server.serverArgs && server.serverArgs.length > 0 && (
												<p className="text-xs font-mono text-gray-600 mt-1">
													参数: {server.serverArgs.join(' ')}
												</p>
											)}
										</div>

										{status?.lastError && (
											<div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
												<p className="text-sm text-red-800">错误: {status.lastError}</p>
											</div>
										)}

										<div className="flex gap-2">
											<button
												onClick={() => handleToggleConnection(server.id, status?.connected)}
												className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
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
					<h2 className="text-2xl font-semibold mb-4 text-gray-800">
						🛠️ 可用工具 ({mcpTools.length})
					</h2>

					{mcpTools.length === 0 ? (
						<div className="text-gray-500 text-center py-8">
							暂无可用工具，请先连接一个 MCP Server
						</div>
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
							className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
						>
							🔗 连接所有 Server
						</button>

						<button
							onClick={handleDisconnectAll}
							className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
						>
							🔌 断开所有连接
						</button>

						<button
							onClick={handleRefreshStatus}
							className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
						>
							🔄 刷新状态
						</button>
					</div>
				</section>
			</div>
		</div>
	)
}
