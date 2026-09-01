/**
 * 字幕批量操作面板
 *
 * 提供批量编辑字幕的功能：
 * - 批量时间调整
 * - 批量文本替换
 * - 批量样式应用
 * - 批量删除/移动
 */

import React, { useState, useCallback } from 'react'
import type { SubtitleTrack } from '@/services/renderer/subtitles'

export interface SubtitleBatchOperationsProps {
  /** 当前轨道列表 */
  tracks: SubtitleTrack[]
  /** 选中的轨道 ID */
  selectedTrackId?: string
  /** 批量操作完成后的回调 */
  onOperationComplete?: (track: SubtitleTrack) => void
  /** 是否禁用 */
  disabled?: boolean
}

type OperationType = 'shift-time' | 'scale-time' | 'replace-text' | 'apply-style' | 'delete' | 'merge'

interface BatchOperation {
  type: OperationType
  label: string
  description: string
}

const BATCH_OPERATIONS: BatchOperation[] = [
  {
    type: 'shift-time',
    label: '时间偏移',
    description: '统一调整所有字幕的开始和结束时间',
  },
  {
    type: 'scale-time',
    label: '时间缩放',
    description: '按比例缩放所有字幕的时间轴',
  },
  {
    type: 'replace-text',
    label: '文本替换',
    description: '批量查找并替换字幕文本',
  },
  {
    type: 'apply-style',
    label: '应用样式',
    description: '批量应用样式到所有字幕',
  },
  {
    type: 'delete',
    label: '批量删除',
    description: '根据条件批量删除字幕',
  },
  {
    type: 'merge',
    label: '合并字幕',
    description: '合并相邻或重叠的字幕',
  },
]

/**
 * 字幕批量操作面板组件
 */
export function SubtitleBatchOperations({
  tracks,
  selectedTrackId,
  onOperationComplete,
  disabled = false,
}: SubtitleBatchOperationsProps) {
  const [selectedOperation, setSelectedOperation] = useState<OperationType | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const selectedTrack = tracks.find(t => t.id === selectedTrackId)

  // 时间偏移操作
  const handleShiftTime = useCallback(() => {
    if (!selectedTrack) return

    const offsetSeconds = prompt('请输入时间偏移量（秒，正数为延后，负数为提前）', '0')
    if (offsetSeconds === null) return

    const offset = parseFloat(offsetSeconds)
    if (isNaN(offset)) {
      alert('请输入有效的数字')
      return
    }

    setIsProcessing(true)

    const updatedSubtitles = selectedTrack.subtitles.map(subtitle => ({
      ...subtitle,
      startTime: Math.max(0, subtitle.startTime + offset),
      endTime: Math.max(0, subtitle.endTime + offset),
    }))

    onOperationComplete?.({
      ...selectedTrack,
      subtitles: updatedSubtitles.sort((a, b) => a.startTime - b.startTime),
    })

    setIsProcessing(false)
    setSelectedOperation(null)
  }, [selectedTrack, onOperationComplete])

  // 时间缩放操作
  const handleScaleTime = useCallback(() => {
    if (!selectedTrack) return

    const scaleFactor = prompt('请输入缩放比例（1.0 = 原始大小，0.5 = 一半速度，2.0 = 两倍速度）', '1.0')
    if (scaleFactor === null) return

    const factor = parseFloat(scaleFactor)
    if (isNaN(factor) || factor <= 0) {
      alert('请输入有效的正数')
      return
    }

    setIsProcessing(true)

    const updatedSubtitles = selectedTrack.subtitles.map(subtitle => ({
      ...subtitle,
      startTime: subtitle.startTime * factor,
      endTime: subtitle.endTime * factor,
    }))

    onOperationComplete?.({
      ...selectedTrack,
      subtitles: updatedSubtitles.sort((a, b) => a.startTime - b.startTime),
    })

    setIsProcessing(false)
    setSelectedOperation(null)
  }, [selectedTrack, onOperationComplete])

  // 文本替换操作
  const handleReplaceText = useCallback(() => {
    if (!selectedTrack) return

    const searchText = prompt('请输入要查找的文本', '')
    if (searchText === null || searchText === '') return

    const replaceText = prompt('请输入替换后的文本', '')
    if (replaceText === null) return

    setIsProcessing(true)

    const updatedSubtitles = selectedTrack.subtitles.map(subtitle => ({
      ...subtitle,
      text: subtitle.text.replace(new RegExp(searchText, 'gi'), replaceText),
    }))

    onOperationComplete?.({
      ...selectedTrack,
      subtitles: updatedSubtitles,
    })

    alert(`已替换 ${updatedSubtitles.filter(s => s.text.includes(replaceText)).length} 个字幕`)

    setIsProcessing(false)
    setSelectedOperation(null)
  }, [selectedTrack, onOperationComplete])

  // 应用样式操作
  const handleApplyStyle = useCallback(() => {
    if (!selectedTrack) return

    const fontSize = prompt('请输入字体大小（像素，留空保持不变）', '')
    const fontColor = prompt('请输入字体颜色（如 #FFFFFF，留空保持不变）', '')
    const backgroundColor = prompt('请输入背景颜色（如 #000000，留空保持不变）', '')

    setIsProcessing(true)

    const updatedSubtitles = selectedTrack.subtitles.map(subtitle => ({
      ...subtitle,
      style: {
        ...subtitle.style,
        ...(fontSize ? { fontSize: parseInt(fontSize) } : {}),
        ...(fontColor ? { fontColor } : {}),
        ...(backgroundColor ? { backgroundColor } : {}),
      },
    }))

    onOperationComplete?.({
      ...selectedTrack,
      subtitles: updatedSubtitles,
    })

    setIsProcessing(false)
    setSelectedOperation(null)
  }, [selectedTrack, onOperationComplete])

  // 批量删除操作
  const handleDelete = useCallback(() => {
    if (!selectedTrack) return

    const condition = confirm(
      '删除所有时长小于 1 秒的字幕？\n\n' +
      '确定 = 删除短字幕\n' +
      '取消 = 取消操作'
    )

    if (!condition) return

    setIsProcessing(true)

    const updatedSubtitles = selectedTrack.subtitles.filter(
      subtitle => subtitle.endTime - subtitle.startTime >= 1.0
    )

    const deletedCount = selectedTrack.subtitles.length - updatedSubtitles.length

    onOperationComplete?.({
      ...selectedTrack,
      subtitles: updatedSubtitles,
    })

    alert(`已删除 ${deletedCount} 个字幕`)

    setIsProcessing(false)
    setSelectedOperation(null)
  }, [selectedTrack, onOperationComplete])

  // 合并字幕操作
  const handleMerge = useCallback(() => {
    if (!selectedTrack) return

    const maxGap = parseFloat(prompt('最大间隔时间（秒，字幕间隔小于此时长将合并）', '0.5') || '0.5')

    if (isNaN(maxGap) || maxGap < 0) {
      alert('请输入有效的正数')
      return
    }

    setIsProcessing(true)

    const subtitles = [...selectedTrack.subtitles].sort((a, b) => a.startTime - b.startTime)
    const mergedSubtitles: typeof subtitles = []

    let current: (typeof subtitles)[0] | null = null

    for (const subtitle of subtitles) {
      if (!current) {
        current = { ...subtitle }
        continue
      }

      // 如果当前字幕与前一个字幕间隔小于 maxGap，则合并
      if (subtitle.startTime - current.endTime <= maxGap) {
        current = {
          ...current,
          endTime: subtitle.endTime,
          text: `${current.text} ${subtitle.text}`,
        }
      } else {
        mergedSubtitles.push(current)
        current = { ...subtitle }
      }
    }

    if (current) {
      mergedSubtitles.push(current)
    }

    onOperationComplete?.({
      ...selectedTrack,
      subtitles: mergedSubtitles,
    })

    alert(`合并完成，从 ${selectedTrack.subtitles.length} 个字幕减少到 ${mergedSubtitles.length} 个`)

    setIsProcessing(false)
    setSelectedOperation(null)
  }, [selectedTrack, onOperationComplete])

  // 执行选中的操作
  const executeOperation = useCallback(() => {
    switch (selectedOperation) {
      case 'shift-time':
        handleShiftTime()
        break
      case 'scale-time':
        handleScaleTime()
        break
      case 'replace-text':
        handleReplaceText()
        break
      case 'apply-style':
        handleApplyStyle()
        break
      case 'delete':
        handleDelete()
        break
      case 'merge':
        handleMerge()
        break
    }
  }, [selectedOperation, handleShiftTime, handleScaleTime, handleReplaceText, handleApplyStyle, handleDelete, handleMerge])

  if (!selectedTrack) {
    return (
      <div className="batch-operations-empty">
        <p>请先选择一个字幕轨道</p>
      </div>
    )
  }

  return (
    <div className="batch-operations">
      <div className="batch-operations-header">
        <h3>批量操作</h3>
        <span className="batch-operations-count">
          轨道: {selectedTrack.name} ({selectedTrack.subtitles.length} 个字幕)
        </span>
      </div>

      <div className="batch-operations-grid">
        {BATCH_OPERATIONS.map(op => (
          <button
            key={op.type}
            className={`batch-operation-button ${selectedOperation === op.type ? 'selected' : ''}`}
            onClick={() => setSelectedOperation(op.type)}
            disabled={disabled || isProcessing}
            title={op.description}
          >
            {op.label}
          </button>
        ))}
      </div>

      {selectedOperation && (
        <div className="batch-operations-confirm">
          <p className="batch-operations-description">
            {BATCH_OPERATIONS.find(op => op.type === selectedOperation)?.description}
          </p>
          <div className="batch-operations-actions">
            <button
              className="batch-operations-confirm-button"
              onClick={executeOperation}
              disabled={disabled || isProcessing}
            >
              {isProcessing ? '处理中...' : '执行'}
            </button>
            <button
              className="batch-operations-cancel-button"
              onClick={() => setSelectedOperation(null)}
              disabled={isProcessing}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="batch-operations-progress">
          <div className="progress-bar">
            <div className="progress-fill" />
          </div>
        </div>
      )}
    </div>
  )
}
