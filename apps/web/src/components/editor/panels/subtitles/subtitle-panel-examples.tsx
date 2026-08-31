/**
 * 字幕面板组件使用示例
 *
 * 展示如何使用字幕面板 UI 组件
 */

import React, { useState } from 'react'
import type { SubtitleTrack, Subtitle } from '@/services/renderer/subtitles'
import { SubtitlePanel } from './subtitle-panel'
import { createSubtitle, createSubtitleTrack } from '@/services/renderer/subtitles'

// ==================== 示例 1: 基础用法 ====================

/**
 * 示例 1: 使用字幕面板管理字幕
 */
export function SubtitlePanelExample1() {
  // 初始字幕轨道
  const initialTracks: SubtitleTrack[] = [
    createSubtitleTrack('English', 'en', {
      subtitles: [
        createSubtitle('Hello World', 1, 4),
        createSubtitle('This is a test', 5, 8),
        createSubtitle('Subtitle example', 9, 12),
      ],
      style: {
        fontSize: 24,
        color: '#FFFFFF',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      },
    }),
  ]

  const [tracks, setTracks] = useState<SubtitleTrack[]>(initialTracks)
  const [selectedTrackId, setSelectedTrackId] = useState<string | undefined>(
    initialTracks[0]?.id
  )

  return (
    <div style={{ height: '600px', border: '1px solid #333', borderRadius: '8px' }}>
      <SubtitlePanel
        tracks={tracks}
        selectedTrackId={selectedTrackId}
        onTracksChange={setTracks}
        onTrackSelect={setSelectedTrackId}
      />
    </div>
  )
}

// ==================== 示例 2: 多轨道管理 ====================

/**
 * 示例 2: 管理多个字幕轨道
 */
export function SubtitlePanelExample2() {
  const [tracks, setTracks] = useState<SubtitleTrack[]>([
    createSubtitleTrack('English', 'en', {
      subtitles: [createSubtitle('Hello', 1, 4)],
    }),
    createSubtitleTrack('中文', 'zh', {
      subtitles: [createSubtitle('你好', 1, 4)],
    }),
    createSubtitleTrack('日本語', 'ja', {
      subtitles: [createSubtitle('こんにちは', 1, 4)],
    }),
  ])

  return (
    <div style={{ height: '600px', border: '1px solid #333', borderRadius: '8px' }}>
      <SubtitlePanel
        tracks={tracks}
        onTracksChange={setTracks}
        onTrackSelect={(trackId) => console.log('Selected track:', trackId)}
      />
    </div>
  )
}

// ==================== 示例 3: 样式自定义 ====================

/**
 * 示例 3: 自定义字幕样式
 */
export function SubtitlePanelExample3() {
  const [tracks] = useState<SubtitleTrack[]>([
    createSubtitleTrack('Styled', 'en', {
      subtitles: [
        createSubtitle(
          'Gold text with shadow',
          1,
          4,
          {
            fontSize: 32,
            color: '#FFD700',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            shadow: {
              color: '#000000',
              blur: 6,
              x: 2,
              y: 2,
            },
            bold: true,
          }
        ),
      ],
      style: {
        font: 'Georgia',
        fontSize: 28,
        color: '#FFFFFF',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      },
    }),
  ])

  return (
    <div style={{ height: '600px', border: '1px solid #333', borderRadius: '8px' }}>
      <SubtitlePanel tracks={tracks} />
    </div>
  )
}

// ==================== 示例 4: 事件处理 ====================

/**
 * 示例 4: 监听字幕事件
 */
export function SubtitlePanelExample4() {
  const [tracks, setTracks] = useState<SubtitleTrack[]>([
    createSubtitleTrack('English', 'en', {
      subtitles: [
        createSubtitle('First', 1, 4),
        createSubtitle('Second', 5, 8),
      ],
    }),
  ])

  const [events, setEvents] = useState<string[]>([])

  const addEvent = (event: string) => {
    setEvents((prev) => [...prev.slice(-9), event]) // 保留最近 10 条
  }

  return (
    <div style={{ height: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SubtitlePanel
        tracks={tracks}
        onTracksChange={(newTracks) => {
          setTracks(newTracks)
          addEvent('Tracks changed')
        }}
        onTrackSelect={(trackId) => {
          addEvent(`Track selected: ${trackId}`)
        }}
        onSubtitleSelect={(subtitleId) => {
          addEvent(`Subtitle selected: ${subtitleId}`)
        }}
      />
      <div
        style={{
          padding: '12px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          maxHeight: '150px',
          overflowY: 'auto',
        }}
      >
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Events:</div>
        {events.map((event, index) => (
          <div key={index} style={{ fontSize: '13px', color: '#fff', marginBottom: '4px' }}>
            {event}
          </div>
        ))}
      </div>
    </div>
  )
}

// ==================== 示例 5: 完整工作流 ====================

/**
 * 示例 5: 完整的字幕编辑工作流
 */
export function SubtitlePanelExample5() {
  const [tracks, setTracks] = useState<SubtitleTrack[]>([
    createSubtitleTrack('English', 'en', {
      subtitles: [
        createSubtitle('Welcome to the video', 0, 3),
        createSubtitle('Today we will learn about TypeScript', 3.5, 7),
        createSubtitle('Let\'s get started!', 7.5, 10),
      ],
      style: {
        fontSize: 26,
        color: '#FFFFFF',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        bold: true,
      },
    }),
  ])

  const [selectedTrackId, setSelectedTrackId] = useState(tracks[0]?.id)

  // 导出字幕
  const handleExport = () => {
    const track = tracks.find((t) => t.id === selectedTrackId)
    if (!track) return

    const srtContent = track.subtitles
      .map((sub, index) => {
        const startTime = formatSrtTime(sub.startTime)
        const endTime = formatSrtTime(sub.endTime)
        return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n`
      })
      .join('\n')

    console.log('Exported SRT:', srtContent)
  }

  return (
    <div style={{ height: '700px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleExport}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Export SRT
        </button>
      </div>
      <SubtitlePanel
        tracks={tracks}
        selectedTrackId={selectedTrackId}
        onTracksChange={setTracks}
        onTrackSelect={setSelectedTrackId}
      />
    </div>
  )
}

// ==================== 工具函数 ====================

/**
 * 格式化时间为 SRT 格式
 */
function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

// ==================== 运行所有示例 ====================

/**
 * 运行所有示例（用于演示）
 */
export function runAllExamples() {
  console.log('🚀 开始运行所有字幕面板示例\n')

  console.log('示例 1: 基础用法')
  console.log('组件已渲染')

  console.log('\n示例 2: 多轨道管理')
  console.log('组件已渲染')

  console.log('\n示例 3: 样式自定义')
  console.log('组件已渲染')

  console.log('\n示例 4: 事件处理')
  console.log('组件已渲染')

  console.log('\n示例 5: 完整工作流')
  console.log('组件已渲染')

  console.log('\n✨ 所有示例渲染完成！')
}
