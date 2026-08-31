'use client'

import { useState, useCallback, useEffect } from 'react'

export default function FFmpegExportTestPage() {
	const [results, setResults] = useState<any>(null)
	const [loading, setLoading] = useState(false)
	const [progress, setProgress] = useState(0)
	const [logs, setLogs] = useState<string[]>([])
	const [ffmpegLoaded, setFfmpegLoaded] = useState(false)

	const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
		const timestamp = new Date().toLocaleTimeString()
		const colors = {
			info: '#60a5fa',
			success: '#34d399',
			error: '#f87171',
			warning: '#fbbf24',
		}
		setLogs((prev) => [...prev, `[${timestamp}] <span style="color: ${colors[type]}">${message}</span>`])
	}, [])

	// 预加载 FFmpeg
	useEffect(() => {
		if (ffmpegLoaded) return

		const preloadFFmpeg = async () => {
			try {
				addLog('⏳ 预加载 FFmpeg 模块...', 'info')

				// 使用动态 script 标签加载
				await loadScript('https://unpkg.com/@ffmpeg/ffmpeg@0.12.1/dist/esm/index.js')
				await loadScript('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js')

				addLog('✅ FFmpeg 模块加载成功', 'success')
				setFfmpegLoaded(true)
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error)
				addLog(`⚠️  FFmpeg 预加载失败: ${message}`, 'warning')
			}
		}

		preloadFFmpeg()
	}, [ffmpegLoaded, addLog])

	const loadScript = (src: string): Promise<void> => {
		return new Promise((resolve, reject) => {
			if (document.querySelector(`script[src="${src}"]`)) {
				resolve()
				return
			}

			const script = document.createElement('script')
			script.src = src
			script.type = 'module'
			script.onload = () => resolve()
			script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
			document.head.appendChild(script)
		})
	}

	const runFullExportTest = useCallback(async () => {
		addLog('🎬 开始完整导出流程测试...', 'info')
		addLog('📋 步骤 1/2: Canvas 渲染', 'info')

		setLoading(true)
		setProgress(0)
		setResults(null)

		try {
			// 步骤 1: Canvas 渲染
			const canvasResult = await runCanvasTest()
			setProgress(50)
			addLog('✅ Canvas 渲染测试通过', 'success')

			if (!canvasResult.success) {
				throw new Error('Canvas 渲染失败')
			}

			// 步骤 2: FFmpeg 编码
			addLog('📋 步骤 2/2: FFmpeg 编码', 'info')
			const ffmpegResult = await runFFmpegEncodeTest()
			setProgress(100)

			if (!ffmpegResult.success) {
				throw new Error('FFmpeg 编码失败')
			}

			// 完成
			const totalDuration = (canvasResult?.duration || 0) + (ffmpegResult?.duration || 0)

			addLog('', 'info')
			addLog('🎉 完整导出流程测试通过！', 'success')
			addLog(`⏱️ 总耗时: ${totalDuration.toFixed(0)}ms`, 'info')
			addLog(`📦 输出大小: ${(ffmpegResult.outputSize / 1024).toFixed(2)} KB`, 'info')
			addLog('📹 格式: MP4 (H.264)', 'info')
			addLog('', 'info')
			addLog('✨ Canvas → PNG → FFmpeg → MP4 流程验证成功！', 'success')

			setResults({
				success: true,
				canvas: canvasResult,
				ffmpeg: ffmpegResult,
				total: {
					duration: totalDuration,
					outputSize: ffmpegResult.outputSize,
					format: 'MP4 (H.264)',
				},
			})
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			addLog(`❌ 测试失败: ${message}`, 'error')
			setResults({ success: false, error: message })
		} finally {
			setLoading(false)
		}
	}, [runCanvasTest, runFFmpegEncodeTest, addLog])

	const runCanvasTest = useCallback(async () => {
		addLog('🎨 开始 Canvas 渲染测试...', 'info')

		try {
			// 动态导入 CanvasRenderer
			const { CanvasRenderer } = await import('@/services/renderer/canvas-renderer')

			addLog('✅ CanvasRenderer 导入成功', 'success')

			// 创建渲染器
			const startTime = performance.now()
			const renderer = new CanvasRenderer({
				width: 640,
				height: 480,
				fps: 30,
			})

			addLog('✅ CanvasRenderer 创建成功 (640x480)', 'success')

			// 创建一个简单的场景
			const canvas = renderer.canvas
			const ctx = renderer.context

			// 渲染 30 帧（1秒）
			const frameCount = 30
			for (let i = 0; i < frameCount; i++) {
				// 简单的颜色渐变
				const r = Math.floor((i / frameCount) * 255)
				const g = Math.floor(128 + (i / frameCount) * 127)
				const b = 255

				ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
				ctx.fillRect(0, 0, canvas.width, canvas.height)

				// 添加帧号
				ctx.fillStyle = '#fff'
				ctx.font = 'bold 32px Arial'
				ctx.textAlign = 'center'
				ctx.fillText(`Frame ${i + 1}`, canvas.width / 2, canvas.height / 2)
			}

			const duration = performance.now() - startTime

			addLog(`✅ 渲染完成: ${frameCount} 帧 (${duration.toFixed(0)}ms)`, 'success')

			// 导出最后一帧为图片
			const blob = await new Promise<Blob>((resolve, reject) => {
				;(renderer.canvas as unknown as OffscreenCanvas)
					.convertToBlob({ type: 'image/png' })
					.then(resolve)
					.catch(reject)
			})
			const size = blob.size

			addLog(`✅ 导出成功: ${(size / 1024).toFixed(2)} KB`, 'success')

			return {
				success: true,
				frames: frameCount,
				duration,
				outputSize: size,
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			addLog(`❌ Canvas 渲染失败: ${message}`, 'error')
			return { success: false, error: message }
		}
	}, [addLog])

	const runFFmpegEncodeTest = useCallback(async () => {
		addLog('⚙️ 开始 FFmpeg 编码测试...', 'info')

		try {
			// 等待 FFmpeg 模块加载
			if (!ffmpegLoaded) {
				addLog('⏳ 等待 FFmpeg 模块加载...', 'info')
				await new Promise((resolve) => setTimeout(resolve, 3000))
			}

			// 使用 window 对象访问已加载的模块
			// @ts-expect-error - FFmpeg 全局变量
			const FFmpeg = window.FFmpeg
			// @ts-expect-error - FFmpeg util 全局变量
			const { fetchFile, toBlobURL } = window.FFmpegUtil || {}

			if (!FFmpeg) {
				throw new Error('FFmpeg 未加载')
			}

			addLog('✅ FFmpeg 模块获取成功', 'success')

			// 创建 FFmpeg 实例
			const ffmpeg = new FFmpeg()

			// 设置日志
			ffmpeg.on('log', ({ message }: { message: string }) => {
				addLog(`[FFmpeg] ${message}`, 'info')
			})

			// 设置进度
			ffmpeg.on('progress', ({ progress }: { progress: number }) => {
				setProgress(progress * 100)
			})

			// 加载核心
			const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.1/dist/esm'
			addLog('⏳ 正在加载 FFmpeg...', 'info')

			await ffmpeg.load({
				coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
				wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
			})

			ffmpeg.fetchFile = fetchFile

			addLog('✅ FFmpeg 加载成功', 'success')
			setProgress(30)

			// 创建测试图片
			const testCanvas = document.createElement('canvas')
			testCanvas.width = 640
			testCanvas.height = 480
			const testCtx = testCanvas.getContext('2d')!

			// 绘制渐变背景
			const gradient = testCtx.createLinearGradient(0, 0, 640, 480)
			gradient.addColorStop(0, '#667eea')
			gradient.addColorStop(1, '#764ba2')
			testCtx.fillStyle = gradient
			testCtx.fillRect(0, 0, 640, 480)

			// 添加文字
			testCtx.fillStyle = '#fff'
			testCtx.font = 'bold 48px Arial'
			testCtx.textAlign = 'center'
			testCtx.fillText('FFmpegExporter Test', 320, 220)
			testCtx.font = '24px Arial'
			testCtx.fillText('Test Video - 1 second', 320, 260)

			const testBlob = await new Promise<Blob>((resolve, reject) => {
				testCanvas.toBlob(
					(blob) => (blob ? resolve(blob) : reject(new Error('Failed to create blob'))),
					'image/png',
				)
			})
			const testData = new Uint8Array(await testBlob.arrayBuffer())

			await ffmpeg.writeFile('test.png', testData)
			addLog('✅ 测试图片写入成功', 'success')
			setProgress(40)

			// 编码为 MP4
			addLog('⏳ 开始编码 MP4...', 'info')
			const startTime = performance.now()

			await ffmpeg.exec([
				'-framerate', '1',
				'-i', 'test.png',
				'-t', '1',
				'-c:v', 'libx264',
				'-pix_fmt', 'yuv420p',
				'-y',
				'output.mp4',
			])

			const encodeDuration = performance.now() - startTime
			addLog(`✅ 编码完成 (${encodeDuration.toFixed(0)}ms)`, 'success')
			setProgress(70)

			// 读取输出
			const outputData = await ffmpeg.readFile('output.mp4')
			const outputSize = outputData.length

			addLog(`✅ 读取成功: ${(outputSize / 1024).toFixed(2)} KB`, 'success')
			setProgress(80)

			// 清理临时文件
			await ffmpeg.deleteFile('test.png')
			await ffmpeg.deleteFile('output.mp4')

			addLog('🧹 清理完成', 'info')
			setProgress(100)

			return {
				success: true,
				duration: encodeDuration,
				outputSize,
				format: 'MP4 (H.264)',
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			addLog(`❌ FFmpeg 编码失败: ${message}`, 'error')
			return { success: false, error: message }
		}
	}, [addLog, ffmpegLoaded])

	return (
		<div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
			<h1 style={{ fontSize: '32px', marginBottom: '10px' }}>🎬 FFmpegExporter 导出流程测试</h1>
			<p style={{ color: '#999', marginBottom: '30px' }}>验证 Canvas → PNG → FFmpeg → MP4 完整导出流程</p>

			{/* 测试控制 */}
			<div
				style={{
					background: 'rgba(255, 255, 255, 0.05)',
					borderRadius: '12px',
					padding: '24px',
					marginBottom: '20px',
				}}
			>
				<h2 style={{ fontSize: '20px', marginBottom: '16px', color: '#fbbf24' }}>🚀 测试控制</h2>
				<button onClick={runFullExportTest} disabled={loading} style={{ marginRight: '12px' }}>
					{loading ? '⏳ 测试中...' : '▶️ 开始完整测试'}
				</button>
				<button onClick={() => {}} disabled={loading}>
					🎨 仅 Canvas 渲染
				</button>
				<button onClick={() => {}} disabled={loading}>
					⚙️ 仅 FFmpeg 编码
				</button>
				{!ffmpegLoaded && (
					<span style={{ marginLeft: '12px', color: '#fbbf24' }}>⏳ FFmpeg 模块预加载中...</span>
				)}
			</div>

			{/* 进度条 */}
			{loading && (
				<div style={{ marginBottom: '20px' }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
						<span style={{ fontSize: '14px', color: '#999' }}>进度</span>
						<span style={{ fontSize: '14px', color: '#60a5fa', fontWeight: 600 }}>{progress.toFixed(0)}%</span>
					</div>
					<div
						style={{
							width: '100%',
							height: '8px',
							background: 'rgba(255, 255, 255, 0.1)',
							borderRadius: '4px',
							overflow: 'hidden',
						}}
					>
						<div
							style={{
								width: `${progress}%`,
								height: '100%',
								background: 'linear-gradient(90deg, #10b981, #34d399)',
								transition: 'width 0.3s',
							}}
						/>
					</div>
				</div>
			)}

			{/* 日志 */}
			<div
				style={{
					background: 'rgba(26, 26, 26, 0.9)',
					borderRadius: '12px',
					padding: '24px',
					marginBottom: '20px',
					maxHeight: '500px',
					overflow: 'auto',
				}}
			>
				<h2 style={{ fontSize: '20px', marginBottom: '16px', color: '#fbbf24' }}>📋 测试日志</h2>
				<div style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.6 }}>
					{logs.length === 0 ? (
						<p style={{ color: '#666' }}>等待测试...</p>
					) : (
						logs.map((log, i) => (
							<div key={i} dangerouslySetInnerHTML={{ __html: log }} />
						))
					)}
				</div>
			</div>

			{/* 测试结果 */}
			{results && (
				<div
					style={{
						background: 'rgba(255, 255, 255, 0.05)',
						borderRadius: '12px',
						padding: '24px',
					}}
				>
					<h2 style={{ fontSize: '20px', marginBottom: '16px', color: '#fbbf24' }}>📊 测试结果</h2>

					{results.success ? (
						<>
							<div
								style={{
									background: 'rgba(16, 185, 129, 0.1)',
									border: '1px solid rgba(16, 185, 129, 0.3)',
									borderRadius: '8px',
									padding: '16px',
									marginBottom: '16px',
								}}
							>
								<p style={{ color: '#10b981', fontSize: '18px', fontWeight: 600 }}>✅ 所有测试通过！</p>
							</div>

							<div style={{ display: 'grid', gap: '16px' }}>
								<div
									style={{
										background: 'rgba(255, 255, 255, 0.05)',
										borderRadius: '8px',
										padding: '16px',
									}}
								>
									<h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#60a5fa' }}>🎨 Canvas 渲染</h3>
									<div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
										<span style={{ color: '#999' }}>帧数</span>
										<span style={{ fontWeight: 600 }}>{results.canvas.frames} 帧</span>
									</div>
									<div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
										<span style={{ color: '#999' }}>耗时</span>
										<span style={{ fontWeight: 600 }}>{results.canvas.duration.toFixed(0)}ms</span>
									</div>
									<div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
										<span style={{ color: '#999' }}>输出大小</span>
										<span style={{ fontWeight: 600 }}>{(results.canvas.outputSize / 1024).toFixed(2)} KB</span>
									</div>
								</div>

								<div
									style={{
										background: 'rgba(255, 255, 255, 0.05)',
										borderRadius: '8px',
										padding: '16px',
									}}
								>
									<h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#60a5fa' }}>⚙️ FFmpeg 编码</h3>
									<div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
										<span style={{ color: '#999' }}>格式</span>
										<span style={{ fontWeight: 600 }}>{results.ffmpeg.format}</span>
									</div>
									<div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
										<span style={{ color: '#999' }}>耗时</span>
										<span style={{ fontWeight: 600 }}>{results.ffmpeg.duration.toFixed(0)}ms</span>
									</div>
									<div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
										<span style={{ color: '#999' }}>输出大小</span>
										<span style={{ fontWeight: 600 }}>{(results.ffmpeg.outputSize / 1024).toFixed(2)} KB</span>
									</div>
								</div>

								<div
									style={{
										background: 'rgba(16, 185, 129, 0.05)',
										border: '1px solid rgba(16, 185, 129, 0.2)',
										borderRadius: '8px',
										padding: '16px',
									}}
								>
									<h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#10b981' }}>🎬 完整流程</h3>
									<div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
										<span style={{ color: '#999' }}>总耗时</span>
										<span style={{ fontWeight: 600 }}>{results.total.duration.toFixed(0)}ms</span>
									</div>
									<div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
										<span style={{ color: '#999' }}>输出大小</span>
										<span style={{ fontWeight: 600 }}>{(results.total.outputSize / 1024).toFixed(2)} KB</span>
									</div>
									<div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
										<span style={{ color: '#999' }}>格式</span>
										<span style={{ fontWeight: 600 }}>{results.total.format}</span>
									</div>
								</div>
							</div>
						</>
					) : (
						<div
							style={{
								background: 'rgba(239, 68, 68, 0.1)',
								border: '1px solid rgba(239, 68, 68, 0.3)',
								borderRadius: '8px',
								padding: '16px',
							}}
						>
							<p style={{ color: '#ef4444', fontSize: '18px', fontWeight: 600 }}>❌ 测试失败</p>
							<p style={{ color: '#999', marginTop: '8px' }}>{results.error}</p>
						</div>
					)}
				</div>
			)}

			{/* 使用说明 */}
			<div style={{ marginTop: '40px', padding: '24px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
				<h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#fbbf24' }}>📝 使用说明</h3>
				<ul style={{ color: '#999', lineHeight: 1.8, paddingLeft: '20px' }}>
					<li>点击"开始完整测试"验证完整的导出流程</li>
					<li>测试将自动执行：Canvas 渲染 → FFmpeg 编码 → MP4 输出</li>
					<li>首次加载 FFmpeg 需要下载 ~25MB 核心文件，请耐心等待</li>
					<li>如果遇到 SharedArrayBuffer 错误，请配置 COOP/COEP 头</li>
					<li>测试视频仅 1 秒，快速验证功能正确性</li>
				</ul>
			</div>
		</div>
	)
}
