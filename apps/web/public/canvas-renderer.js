/**
 * 简化版 CanvasRenderer - 用于独立测试
 */

export class CanvasRenderer {
	constructor({ width, height, fps, imageSmoothingQuality = 'low' }) {
		this.width = width
		this.height = height
		this.fps = fps
		this.canvas = null
		this.context = null

		try {
			this.canvas = new OffscreenCanvas(width, height)
		} catch {
			this.canvas = document.createElement('canvas')
			this.canvas.width = width
			this.canvas.height = height
		}

		const context = this.canvas.getContext('2d')
		if (!context) {
			throw new Error('Failed to get canvas context')
		}

		this.context = context
		this.applySmoothing()
	}

	applySmoothing() {
		const ctx = this.context
		if (ctx instanceof CanvasRenderingContext2D) {
			ctx.imageSmoothingEnabled = true
			ctx.imageSmoothingQuality = 'low'
		}
	}

	setSize({ width, height }) {
		this.width = width
		this.height = height

		if (this.canvas instanceof OffscreenCanvas) {
			this.canvas = new OffscreenCanvas(width, height)
		} else {
			this.canvas.width = width
			this.canvas.height = height
		}
		this.applySmoothing()
	}

	clear() {
		const ctx = this.context
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
	}

	render(params) {
		// 简化版本 - 不实现完整的节点渲染
		console.log('CanvasRenderer.render() called', params)
	}
}
