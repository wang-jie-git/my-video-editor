/**
 * FilterPanel 使用示例
 *
 * 展示如何在项目中使用 FilterPanel 组件
 */

import { useState } from 'react'
import { FilterPanel } from './filter-panel'
import { FilterPipeline } from '@/services/renderer/filters/filter-pipeline'
import { FFmpegService } from '@/services/renderer/ffmpeg/ffmpeg-service'
import type { FilterChain, FilterApplyResult } from '@/services/renderer/filters/filter-types'
import { createEmptyFilterChain } from '@/services/renderer/filters'

// ==================== 示例 1: 基础用法 ====================

/**
 * 示例 1: 基础滤镜面板
 */
export function Example1_BasicUsage() {
  const handleChainChange = (chain: FilterChain) => {
    console.log('滤镜链变化:', chain)
  }

  const handleApply = (chain: FilterChain) => {
    console.log('应用滤镜:', chain)
  }

  return (
    <FilterPanel
      onChainChange={handleChainChange}
      onApply={handleApply}
    />
  )
}

// ==================== 示例 2: 带初始滤镜 ====================

/**
 * 示例 2: 带初始滤镜的面板
 */
export function Example2_WithInitialFilters() {
  const [chain] = useState<FilterChain>({
    filters: [
      {
        id: 'color-correction-1',
        name: '颜色校正',
        description: '调整亮度、对比度、饱和度和色相',
        type: 'color-correction',
        enabled: true,
        brightness: 0.1,
        contrast: 1.2,
        saturation: 1.1,
        hue: 0,
      },
      {
        id: 'sharpen-1',
        name: '锐化',
        description: '增强图像清晰度',
        type: 'sharpen',
        enabled: true,
        amount: 1,
        radius: 1.5,
      },
    ],
    enabled: true,
  })

  return (
    <FilterPanel
      initialChain={chain}
      onApply={(chain) => console.log('应用滤镜:', chain)}
    />
  )
}

// ==================== 示例 3: 集成到编辑器页面 ====================

/**
 * 示例 3: 集成到视频编辑器
 */
export function Example3_EditorIntegration() {
  const [filterChain, setFilterChain] = useState<FilterChain | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  const handleApplyFilters = async (chain: FilterChain) => {
    setIsApplying(true)

    try {
      const ffmpegService = new FFmpegService()
      const pipeline = new FilterPipeline(ffmpegService)

      const result: FilterApplyResult = await pipeline.applyFilters({
        inputFile: '/path/to/input.mp4',
        outputFile: '/path/to/output.mp4',
        filterChain: chain,
        onProgress: (progress) => {
          console.log(`应用进度: ${progress}%`)
        },
      })

      if (result.success) {
        console.log('✅ 滤镜应用成功:', result.outputFile)
        // 更新视频预览
      } else {
        console.error('❌ 滤镜应用失败:', result.error)
      }
    } catch (error) {
      console.error('❌ 应用滤镜时出错:', error)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="editor-layout">
      {/* 预览区域 */}
      <div className="preview">
        {/* 视频预览组件 */}
      </div>

      {/* 右侧面板 */}
      <div className="panels">
        {/* 滤镜面板 */}
        <FilterPanel
          initialChain={filterChain || undefined}
          onChainChange={setFilterChain}
          onApply={handleApplyFilters}
        />

        {/* 其他面板 */}
      </div>
    </div>
  )
}

// ==================== 示例 4: 与项目管理集成 ====================

/**
 * 示例 4: 与项目管理集成
 */
export function Example4_ProjectIntegration() {
  const [currentProject, setCurrentProject] = useState<any>(null)
  const [filterChain, setFilterChain] = useState<FilterChain | null>(null)

  const handleSaveProject = () => {
    if (!currentProject || !filterChain) return

    // 保存滤镜链到项目
    const updatedProject = {
      ...currentProject,
      filterChain,
      updatedAt: new Date().toISOString(),
    }

    setCurrentProject(updatedProject)
    console.log('项目已保存:', updatedProject)
  }

  const handleLoadProject = (project: any) => {
    setCurrentProject(project)
    setFilterChain(project.filterChain || null)
  }

  return (
    <div>
      <FilterPanel
        initialChain={filterChain || undefined}
        onChainChange={setFilterChain}
        onApply={(chain) => {
          console.log('应用滤镜')
          handleSaveProject()
        }}
      />
    </div>
  )
}

// ==================== 示例 5: 批量应用滤镜 ====================

/**
 * 示例 5: 批量应用滤镜到多个视频
 */
export async function Example5_BatchApply() {
  const chain: FilterChain = {
    filters: [
      {
        id: 'color-correction-1',
        name: '颜色校正',
        description: '调整亮度、对比度、饱和度和色相',
        type: 'color-correction',
        enabled: true,
        brightness: 0.1,
        contrast: 1.15,
        saturation: 1.1,
        hue: 0,
      },
      {
        id: 'sharpen-1',
        name: '锐化',
        description: '增强图像清晰度',
        type: 'sharpen',
        enabled: true,
        amount: 0.8,
        radius: 1.5,
      },
    ],
    enabled: true,
  }

  const ffmpegService = new FFmpegService()
  const pipeline = new FilterPipeline(ffmpegService)

  // 批量应用
  const files = [
    { input: 'video1.mp4', output: 'output1.mp4' },
    { input: 'video2.mp4', output: 'output2.mp4' },
    { input: 'video3.mp4', output: 'output3.mp4' },
  ]

  const results = await pipeline.batchApplyFilters(
    files,
    chain,
    (file, progress) => {
      console.log(`${file}: ${progress}%`)
    }
  )

  const successCount = results.filter((r) => r.success).length
  console.log(`批量处理完成: ${successCount}/${files.length}`)
}

// ==================== 示例 6: 导出/导入滤镜链 ====================

/**
 * 示例 6: 导出/导入滤镜链配置
 */
export function Example6_ExportImport() {
  // 导出滤镜链到 JSON
  const exportFilterChain = (chain: FilterChain) => {
    const json = JSON.stringify(chain, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = 'filter-chain.json'
    a.click()

    URL.revokeObjectURL(url)
  }

  // 从 JSON 导入滤镜链
  const importFilterChain = async (file: File): Promise<FilterChain> => {
    const text = await file.text()
    const chain: FilterChain = JSON.parse(text)

    // 验证
    const pipeline = new FilterPipeline(null as any)
    const validation = pipeline.validateFilterChain(chain)

    if (!validation.valid) {
      throw new Error(`滤镜链验证失败: ${validation.errors.join(', ')}`)
    }

    return chain
  }

  return null // 这是一个纯逻辑示例，无 UI
}

// ==================== 示例 7: 撤销/重做支持 ====================

/**
 * 示例 7: 支持撤销/重做
 */
export function Example7_UndoRedo() {
  const [history, setHistory] = useState<FilterChain[]>([createEmptyFilterChain()])
  const [historyIndex, setHistoryIndex] = useState(0)

  const pushToHistory = (chain: FilterChain) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(chain)

    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      return history[newIndex]
    }
    return null
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      return history[newIndex]
    }
    return null
  }

  return (
    <div>
      <div className="undo-redo-buttons">
        <button onClick={undo} disabled={historyIndex === 0}>
          ↶ 撤销
        </button>
        <button onClick={redo} disabled={historyIndex === history.length - 1}>
          ↷ 重做
        </button>
      </div>

      <FilterPanel
        onChainChange={(chain) => pushToHistory(chain)}
        onApply={(chain) => console.log('应用:', chain)}
      />
    </div>
  )
}

// ==================== 示例 8: 滤镜预设模板 ====================

/**
 * 示例 8: 使用滤镜预设模板
 */
export function Example8_FilterPresets() {
  const presetTemplates: Array<{
    name: string
    description: string
    chain: FilterChain
  }> = [
    {
      name: '电影感',
      description: '增强对比度，添加暖色调',
      chain: {
        filters: [
          {
            id: 'color-correction-cinematic',
            name: '颜色校正',
            description: '电影感调色',
            type: 'color-correction',
            enabled: true,
            brightness: 0,
            contrast: 1.3,
            saturation: 1.1,
            hue: -5,
          },
          {
            id: 'sharpen-cinematic',
            name: '锐化',
            description: '轻微锐化',
            type: 'sharpen',
            enabled: true,
            amount: 0.5,
            radius: 1,
          },
        ],
        enabled: true,
      },
    },
    {
      name: '复古风格',
      description: '降低饱和度，降低对比度',
      chain: {
        filters: [
          {
            id: 'color-correction-vintage',
            name: '颜色校正',
            description: '复古调色',
            type: 'color-correction',
            enabled: true,
            brightness: 5,
            contrast: 0.85,
            saturation: 0.7,
            hue: 20,
          },
        ],
        enabled: true,
      },
    },
    {
      name: '清新自然',
      description: '增加亮度，提升饱和度',
      chain: {
        filters: [
          {
            id: 'color-correction-natural',
            name: '颜色校正',
            description: '清新自然调色',
            type: 'color-correction',
            enabled: true,
            brightness: 10,
            contrast: 1.1,
            saturation: 1.2,
            hue: 0,
          },
        ],
        enabled: true,
      },
    },
  ]

  return (
    <div>
      <h3>滤镜预设模板</h3>
      <div className="preset-templates">
        {presetTemplates.map((preset, index) => (
          <button
            key={index}
            onClick={() => console.log('应用预设:', preset.name)}
          >
            {preset.name}
            <p>{preset.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
