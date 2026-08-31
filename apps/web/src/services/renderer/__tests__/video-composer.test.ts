/**
 * VideoComposer 单元测试
 *
 * 覆盖视频合并、转场、分割、裁剪等核心功能
 */

import { describe, expect, test, vi, beforeEach, afterEach } from 'bun:test'
import { VideoComposer } from '../video-composer'
import { FFmpegService } from '../ffmpeg/ffmpeg-service'

// Mock FFmpegService
vi.mock('../ffmpeg/ffmpeg-service', () => ({
  FFmpegService: vi.fn().mockImplementation(() => ({
    isLoaded: vi.fn().mockReturnValue(true),
    load: vi.fn().mockResolvedValue(undefined),
    exec: vi.fn().mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      duration: 100,
    }),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(new Uint8Array(1024 * 1024)), // 1MB
    deleteFile: vi.fn().mockResolvedValue(undefined),
    listDir: vi.fn().mockResolvedValue([]),
    cleanup: vi.fn().mockResolvedValue(undefined),
  })),
}))

describe('VideoComposer', () => {
  let composer: VideoComposer
  let mockFFmpegService: any
  let mockOnProgress: (progress: any) => void

  beforeEach(() => {
    vi.clearAllMocks()
    mockFFmpegService = new FFmpegService()
    composer = new VideoComposer(mockFFmpegService)
    mockOnProgress = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============ 视频合并测试 ============

  describe('mergeVideos', () => {
    test('应该成功合并两个视频文件', async () => {
      const result = await composer.mergeVideos(
        ['video1.mp4', 'video2.mp4'],
        { outputFile: 'merged.mp4' },
        mockOnProgress
      )

      expect(result.success).toBe(true)
      expect(result.outputFile).toBe('merged.mp4')
      expect(result.videoCount).toBe(2)
      expect(result.size).toBeGreaterThan(0)
    })

    test('应该支持多个视频文件合并', async () => {
      const result = await composer.mergeVideos(
        ['video1.mp4', 'video2.mp4', 'video3.mp4', 'video4.mp4'],
        { outputFile: 'merged.mp4' },
        mockOnProgress
      )

      expect(result.success).toBe(true)
      expect(result.videoCount).toBe(4)
    })

    test('应该支持包含音频选项', async () => {
      const result = await composer.mergeVideos(
        ['video1.mp4', 'video2.mp4'],
        { outputFile: 'merged.mp4', includeAudio: true },
        mockOnProgress
      )

      expect(result.success).toBe(true)
      expect(mockFFmpegService.exec).toHaveBeenCalled()
    })

    test('应该支持不包含音频选项', async () => {
      const result = await composer.mergeVideos(
        ['video1.mp4', 'video2.mp4'],
        { outputFile: 'merged.mp4', includeAudio: false },
        mockOnProgress
      )

      expect(result.success).toBe(true)
    })

    test('应该处理空文件列表', async () => {
      const result = await composer.mergeVideos([], { outputFile: 'merged.mp4' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('为空')
    })

    test('应该处理单个文件', async () => {
      const result = await composer.mergeVideos(['video1.mp4'], {
        outputFile: 'merged.mp4',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('至少需要 2 个视频文件')
    })

    test('应该调用进度回调', async () => {
      await composer.mergeVideos(
        ['video1.mp4', 'video2.mp4'],
        { outputFile: 'merged.mp4' },
        mockOnProgress
      )

      expect(mockOnProgress).toHaveBeenCalled()
      expect(mockOnProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'merging',
          progress: expect.any(Number),
          completed: expect.any(Number),
          total: 2,
        })
      )
    })

    test('应该支持重新编码模式', async () => {
      const result = await composer.mergeVideos(
        ['video1.mp4', 'video2.mp4'],
        { outputFile: 'merged.mp4', reencode: true },
        mockOnProgress
      )

      expect(result.success).toBe(true)
    })
  })

  // ============ 转场合并测试 ============

  describe('concatWithTransitions', () => {
    test('应该成功合并视频并添加淡入淡出转场', async () => {
      const result = await composer.concatWithTransitions(
        ['video1.mp4', 'video2.mp4'],
        {
          outputFile: 'merged.mp4',
          transitions: [{ type: 'fade', duration: 1.0 }],
        },
        mockOnProgress
      )

      expect(result.success).toBe(true)
      expect(result.outputFile).toBe('merged.mp4')
      expect(result.videoCount).toBe(2)
    })

    test('应该支持多个转场效果', async () => {
      const result = await composer.concatWithTransitions(
        ['video1.mp4', 'video2.mp4', 'video3.mp4'],
        {
          outputFile: 'merged.mp4',
          transitions: [
            { type: 'fade', duration: 1.0 },
            { type: 'slide', duration: 0.8 },
          ],
        },
        mockOnProgress
      )

      expect(result.success).toBe(true)
    })

    test('应该处理转场数量不匹配', async () => {
      const result = await composer.concatWithTransitions(
        ['video1.mp4', 'video2.mp4', 'video3.mp4'],
        {
          outputFile: 'merged.mp4',
          transitions: [{ type: 'fade', duration: 1.0 }], // 缺少一个转场
        },
        mockOnProgress
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('需要 2 个转场效果')
    })

    test('应该支持自定义转场时长', async () => {
      const result = await composer.concatWithTransitions(
        ['video1.mp4', 'video2.mp4'],
        {
          outputFile: 'merged.mp4',
          transitions: [{ type: 'fade', duration: 2.5 }],
        },
        mockOnProgress
      )

      expect(result.success).toBe(true)
    })

    test('应该处理空文件列表', async () => {
      const result = await composer.concatWithTransitions([], {
        outputFile: 'merged.mp4',
        transitions: [],
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('为空')
    })

    test('应该处理单个文件', async () => {
      const result = await composer.concatWithTransitions(['video1.mp4'], {
        outputFile: 'merged.mp4',
        transitions: [],
      })

      expect(result.success).toBe(false)
    })

    test('应该支持所有转场类型', async () => {
      const transitionTypes: TransitionType[] = ['fade', 'slide', 'wipe', 'dissolve']

      for (const type of transitionTypes) {
        const result = await composer.concatWithTransitions(
          ['video1.mp4', 'video2.mp4'],
          {
            outputFile: 'merged.mp4',
            transitions: [{ type, duration: 1.0 }],
          }
        )

        expect(result.success).toBe(true)
      }
    })
  })

  // ============ 视频分割测试 ============

  describe('splitVideo', () => {
    test('应该成功分割视频', async () => {
      const result = await composer.splitVideo(
        'video.mp4',
        { splitPoints: [10, 20, 30], outputPrefix: 'segment' },
        mockOnProgress
      )

      expect(result.success).toBe(true)
      expect(result.outputFiles?.length).toBe(4) // 3 个分割点 → 4 个片段
      expect(result.segmentCount).toBe(4)
    })

    test('应该支持单个分割点', async () => {
      const result = await composer.splitVideo('video.mp4', {
        splitPoints: [10],
        outputPrefix: 'segment',
      })

      expect(result.success).toBe(true)
      expect(result.outputFiles?.length).toBe(2) // 1 个分割点 → 2 个片段
    })

    test('应该生成正确的输出文件名', async () => {
      const result = await composer.splitVideo('video.mp4', {
        splitPoints: [10, 20],
        outputPrefix: 'clip',
      })

      expect(result.success).toBe(true)
      expect(result.outputFiles).toContain('clip_1.mp4')
      expect(result.outputFiles).toContain('clip_2.mp4')
      expect(result.outputFiles).toContain('clip_3.mp4')
    })

    test('应该支持自定义输出格式', async () => {
      const result = await composer.splitVideo('video.mp4', {
        splitPoints: [10],
        outputPrefix: 'segment',
        format: 'webm',
      })

      expect(result.success).toBe(true)
      expect(result.outputFiles?.[0]).toBe('segment_1.webm')
    })

    test('应该处理空分割点列表', async () => {
      const result = await composer.splitVideo('video.mp4', {
        splitPoints: [],
        outputPrefix: 'segment',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('为空')
    })

    test('应该验证分割点排序', async () => {
      const result = await composer.splitVideo('video.mp4', {
        splitPoints: [20, 10], // 未排序
        outputPrefix: 'segment',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('升序')
    })

    test('应该调用进度回调', async () => {
      await composer.splitVideo(
        'video.mp4',
        { splitPoints: [10, 20], outputPrefix: 'segment' },
        mockOnProgress
      )

      expect(mockOnProgress).toHaveBeenCalled()
    })
  })

  // ============ 视频裁剪测试 ============

  describe('trimVideo', () => {
    test('应该成功裁剪视频', async () => {
      const result = await composer.trimVideo(
        'video.mp4',
        { startTime: 5, endTime: 15, outputFile: 'trimmed.mp4' },
        mockOnProgress
      )

      expect(result.success).toBe(true)
      expect(result.outputFile).toBe('trimmed.mp4')
      expect(result.duration).toBe(10) // 15 - 5 = 10
    })

    test('应该支持从视频开头裁剪', async () => {
      const result = await composer.trimVideo('video.mp4', {
        startTime: 0,
        endTime: 10,
        outputFile: 'trimmed.mp4',
      })

      expect(result.success).toBe(true)
    })

    test('应该支持裁剪到视频末尾', async () => {
      const result = await composer.trimVideo('video.mp4', {
        startTime: 50,
        endTime: 60,
        outputFile: 'trimmed.mp4',
      })

      expect(result.success).toBe(true)
    })

    test('应该支持重新编码模式', async () => {
      const result = await composer.trimVideo(
        'video.mp4',
        { startTime: 5, endTime: 15, outputFile: 'trimmed.mp4', reencode: true },
        mockOnProgress
      )

      expect(result.success).toBe(true)
    })

    test('应该处理负数开始时间', async () => {
      const result = await composer.trimVideo('video.mp4', {
        startTime: -5,
        endTime: 10,
        outputFile: 'trimmed.mp4',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('负数')
    })

    test('应该处理结束时间小于开始时间', async () => {
      const result = await composer.trimVideo('video.mp4', {
        startTime: 15,
        endTime: 5,
        outputFile: 'trimmed.mp4',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('大于开始时间')
    })

    test('应该支持流复制模式（默认）', async () => {
      const result = await composer.trimVideo('video.mp4', {
        startTime: 5,
        endTime: 15,
        outputFile: 'trimmed.mp4',
      })

      expect(result.success).toBe(true)
    })
  })

  // ============ 辅助方法测试 ============

  describe('generateFileList', () => {
    test('应该生成正确的文件列表格式', async () => {
      // 测试私有方法通过公开 API 间接验证
      const result = await composer.mergeVideos(
        ['video1.mp4', 'video2.mp4'],
        { outputFile: 'merged.mp4' }
      )

      expect(result.success).toBe(true)
      expect(mockFFmpegService.exec).toHaveBeenCalled()
    })
  })

  // ============ 视频信息测试 ============

  describe('getVideoInfo', () => {
    test('应该返回视频信息', async () => {
      const info = await composer.getVideoInfo('video.mp4')

      expect(info).not.toBeNull()
      expect(info?.fileName).toBe('video.mp4')
      expect(info?.duration).toBeGreaterThan(0)
    })
  })

  // ============ 清理测试 ============

  describe('cleanup', () => {
    test('应该清理指定文件', async () => {
      await composer.cleanup(['temp1.mp4', 'temp2.mp4'])

      expect(mockFFmpegService.deleteFile).toHaveBeenCalledWith('temp1.mp4')
      expect(mockFFmpegService.deleteFile).toHaveBeenCalledWith('temp2.mp4')
    })

    test('应该清理所有文件（不传参数）', async () => {
      await composer.cleanup()

      expect(mockFFmpegService.cleanup).toHaveBeenCalled()
    })
  })
})
