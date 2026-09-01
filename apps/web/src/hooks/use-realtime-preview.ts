/**
 * 实时预览 Hook
 *
 * 提供带 debounce 的实时滤镜预览
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { FilterPipeline } from '@/services/renderer/filters/filter-pipeline'
import { FFmpegService } from '@/services/renderer/ffmpeg/ffmpeg-service'
import type { FilterChain } from '@/services/renderer/filters/filter-types'

interface UseRealtimePreviewOptions {
  /** 原始视频文件路径 */
  inputFile: string
  /** 预览输出路径 */
  previewOutput?: string
  /** 防抖延迟 (ms) */
  debounceMs?: number
  /** 最大预览宽度 */
  maxWidth?: number
  /** 最大预览高度 */
  maxHeight?: number
}

interface UseRealtimePreviewReturn {
  /** 预览缩略图 URL */
  previewUrl: string | null
  /** 是否正在生成预览 */
  isGenerating: boolean
  /** 最后错误信息 */
  error: string | null
  /** 手动触发预览更新 */
  updatePreview: (chain: FilterChain) => Promise<void>
  /** 清理预览 */
  clearPreview: () => void
}

/**
 * 实时预览 Hook
 *
 * 使用 debounce 优化预览生成频率
 */
export function useRealtimePreview(
  options: UseRealtimePreviewOptions
): UseRealtimePreviewReturn {
  const {
    inputFile,
    previewOutput = '/preview.jpg',
    debounceMs = 500,
    maxWidth = 320,
    maxHeight = 180,
  } = options

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ffmpegServiceRef = useRef<FFmpegService | null>(null)
  const pipelineRef = useRef<FilterPipeline | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingChainRef = useRef<FilterChain | null>(null)

  // 初始化 FFmpeg 服务
  if (!ffmpegServiceRef.current) {
    ffmpegServiceRef.current = new FFmpegService()
  }

  if (!pipelineRef.current) {
    pipelineRef.current = new FilterPipeline(ffmpegServiceRef.current)
  }

  // 生成预览
  const generatePreview = useCallback(
    async (chain: FilterChain): Promise<void> => {
      if (!ffmpegServiceRef.current || !pipelineRef.current) return

      setIsGenerating(true)
      setError(null)

      try {
        // 1. 构建滤镜图
        const filterGraph = pipelineRef.current.buildFilterGraph(chain)

        // 2. 生成缩略图命令
        const args = ['-i', inputFile]

        if (filterGraph) {
          args.push('-vf', `${filterGraph},scale=${maxWidth}:${maxHeight}`)
        } else {
          args.push('-vf', `scale=${maxWidth}:${maxHeight}`)
        }

        // 3. 提取第一帧
        args.push('-vframes', '1', '-y', previewOutput)

        await ffmpegServiceRef.current.exec(args)

        // 4. 读取缩略图
        const data = await ffmpegServiceRef.current.readFile(previewOutput)
        const blob = new Blob([data], { type: 'image/jpeg' })
        const url = URL.createObjectURL(blob)

        // 5. 清理旧 URL
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
        }

        setPreviewUrl(url)
      } catch (err) {
        console.error('[useRealtimePreview] 生成预览失败:', err)
        setError(err instanceof Error ? err.message : '生成预览失败')
      } finally {
        setIsGenerating(false)
      }
    },
    [inputFile, previewOutput, maxWidth, maxHeight, previewUrl]
  )

  // 更新预览（带防抖）
  const updatePreview = useCallback(
    async (chain: FilterChain): Promise<void> => {
      // 保存待处理的滤镜链
      pendingChainRef.current = chain

      // 清除之前的定时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // 设置新的定时器
      debounceTimerRef.current = setTimeout(async () => {
        const chainToProcess = pendingChainRef.current
        if (chainToProcess) {
          await generatePreview(chainToProcess)
        }
      }, debounceMs)
    },
    [debounceMs, generatePreview]
  )

  // 清理预览
  const clearPreview = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setPreviewUrl(null)
    setError(null)
    pendingChainRef.current = null
  }, [previewUrl])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  return {
    previewUrl,
    isGenerating,
    error,
    updatePreview,
    clearPreview,
  }
}
