/**
 * FFmpeg 直接 CDN 导入测试
 * 绕过所有浏览器限制，直接在 Node.js/服务端环境测试
 */

import { describe, it, expect } from 'bun:test'

describe('FFmpeg CDN 导入', () => {
	it('应该成功从 jsdelivr 导入 FFmpeg', async () => {
		// 直接导入 classes.js（不是 index.js）
		// @ts-expect-error 远程 URL 动态导入（bun 运行时支持，TS 无法静态解析）
		const module = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/classes.js')

		expect(module).toBeDefined()
		expect(module.FFmpeg).toBeDefined()
		expect(typeof module.FFmpeg).toBe('function')

		// 测试创建实例
		const ffmpeg = new module.FFmpeg()
		expect(ffmpeg).toBeDefined()
		expect(ffmpeg.loaded).toBe(false)
	})

	it('应该成功从 jsdelivr 导入 FFmpeg Util', async () => {
		// @ts-expect-error 远程 URL 动态导入（bun 运行时支持，TS 无法静态解析）
		const module = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.10/dist/esm/index.js')

		expect(module).toBeDefined()
		expect(module.fetchFile).toBeDefined()
		expect(module.toBlobURL).toBeDefined()
	})
})
