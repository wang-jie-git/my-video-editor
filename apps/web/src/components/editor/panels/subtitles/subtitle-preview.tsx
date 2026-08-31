/**
 * 字幕预览组件
 *
 * 实时预览字幕在当前时间点的显示效果
 */

import React, { useMemo, useEffect, useState } from 'react'
import type { SubtitleTrack } from '@/services/renderer/subtitles'
import styles from './subtitle-panel.module.css'

export interface SubtitlePreviewProps {
  track: SubtitleTrack
  currentTime: number
  onTimeUpdate: (time: number) => void
}

/**
 * 字幕预览组件
 */
export function SubtitlePreview({ track, currentTime, onTimeUpdate }: SubtitlePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  // 获取当前时间点的字幕
  const currentSubtitle = useMemo(() => {
    return track.subtitles.find(
      (sub) => currentTime >= sub.startTime && currentTime <= sub.endTime
    )
  }, [track.subtitles, currentTime])

  // 合并样式
  const mergedStyle = useMemo(() => {
    const subtitleStyle = currentSubtitle?.style || track.style || {}

    return {
      ...track.style,
      ...subtitleStyle,
    } as React.CSSProperties
  }, [currentSubtitle, track.style])

  // 播放/暂停
  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  // 重置时间
  const resetTime = () => {
    onTimeUpdate(0)
    setIsPlaying(false)
  }

  // 播放动画
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      onTimeUpdate((prevTime) => {
        const maxTime = track.subtitles.length > 0
          ? Math.max(...track.subtitles.map((s) => s.endTime))
          : 10

        if (prevTime >= maxTime) {
          setIsPlaying(false)
          return 0
        }

        return prevTime + 0.1
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isPlaying, onTimeUpdate, track.subtitles])

  // 获取最大时间
  const maxTime = useMemo(() => {
    if (track.subtitles.length === 0) return 10
    return Math.max(...track.subtitles.map((s) => s.endTime))
  }, [track.subtitles])

  // 时间进度百分比
  const progressPercent = maxTime > 0 ? (currentTime / maxTime) * 100 : 0

  return (
    <div className={styles.preview}>
      <div className={styles.previewHeader}>
        <h4>Preview</h4>
        <div className={styles.previewControls}>
          <button className={styles.previewButton} onClick={resetTime}>
            ↺
          </button>
          <button className={styles.previewButton} onClick={togglePlay}>
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>
      </div>

      {/* 时间轴 */}
      <div className={styles.previewTimeline}>
        <div className={styles.timeDisplay}>
          {formatTime(currentTime)} / {formatTime(maxTime)}
        </div>
        <div className={styles.timelineTrack}>
          <div
            className={styles.timelineProgress}
            style={{ width: `${progressPercent}%` }}
          />
          <input
            type="range"
            className={styles.timelineSlider}
            value={currentTime}
            onChange={(e) => onTimeUpdate(parseFloat(e.target.value))}
            min={0}
            max={maxTime}
            step={0.1}
          />
        </div>
      </div>

      {/* 预览区域 */}
      <div className={styles.previewArea}>
        <div className={styles.previewBackground}>
          <div className={styles.previewPlaceholder}>Video Preview</div>
        </div>

        {/* 字幕显示 */}
        {currentSubtitle && (
          <div
            className={styles.previewSubtitle}
            style={{
              fontFamily: mergedStyle.font,
              fontSize: mergedStyle.fontSize ? `${mergedStyle.fontSize}px` : '24px',
              color: mergedStyle.color,
              backgroundColor:
                typeof mergedStyle.backgroundColor === 'string'
                  ? mergedStyle.backgroundColor
                  : 'rgba(0, 0, 0, 0.5)',
              borderColor: mergedStyle.borderColor,
              borderWidth: mergedStyle.borderWidth ? `${mergedStyle.borderWidth}px` : '0px',
              borderStyle: mergedStyle.borderWidth ? 'solid' : 'none',
              fontWeight: mergedStyle.bold ? 'bold' : 'normal',
              fontStyle: mergedStyle.italic ? 'italic' : 'normal',
              textShadow: mergedStyle.shadow
                ? `${mergedStyle.shadow.x}px ${mergedStyle.shadow.y}px ${mergedStyle.shadow.blur}px ${mergedStyle.shadow.color}`
                : 'none',
            }}
          >
            {currentSubtitle.text}
          </div>
        )}
      </div>

      {/* 提示 */}
      {!currentSubtitle && track.subtitles.length > 0 && (
        <div className={styles.previewHint}>
          No subtitle at current time
        </div>
      )}

      {track.subtitles.length === 0 && (
        <div className={styles.previewEmpty}>No subtitles to preview</div>
      )}
    </div>
  )
}

/**
 * 格式化时间
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${ms}`
}
