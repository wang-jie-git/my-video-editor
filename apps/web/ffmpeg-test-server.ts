#!/usr/bin/env bun

/**
 * 简单的静态文件服务器，用于 FFmpeg 测试
 * 绕过 Next.js 的所有限制
 */

import { serve } from 'bun'

const PORT = 8080
const PUBLIC_DIR = './public'

const mimeTypes = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.svg': 'image/svg+xml',
}

serve({
	port: PORT,
	async fetch(req) {
		const url = new URL(req.url)
		let pathname = url.pathname

		// 默认返回 index.html
		if (pathname === '/') {
			pathname = '/index.html'
		}

		const filePath = `${PUBLIC_DIR}${pathname}`

		try {
			const file = await Bun.file(filePath)

			if (!file.exists()) {
				return new Response('404 Not Found', { status: 404 })
			}

			const ext = filePath.substring(filePath.lastIndexOf('.'))
			const contentType = mimeTypes[ext] || 'application/octet-stream'

			return new Response(file, {
				headers: {
					'Content-Type': contentType,
					'Cross-Origin-Embedder-Policy': 'require-corp',
					'Cross-Origin-Opener-Policy': 'same-origin',
				},
			})
		} catch (err) {
			return new Response(`Error: ${err.message}`, { status: 500 })
		}
	},
})

console.log(`🚀 FFmpeg 测试服务器启动: http://localhost:${PORT}`)
console.log(`📁 服务目录: ${PUBLIC_DIR}`)
console.log(`🔗 FFmpeg 测试: http://localhost:${PORT}/ffmpeg-export-standalone.html`)
