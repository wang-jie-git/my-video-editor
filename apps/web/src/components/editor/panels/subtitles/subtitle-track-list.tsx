/**
 * 字幕轨道列表组件
 *
 * 显示和管理多个字幕轨道
 */

import React from 'react'
import type { SubtitleTrack } from '@/services/renderer/subtitles'
import styles from './subtitle-panel.module.css'

export interface SubtitleTrackListProps {
  tracks: SubtitleTrack[]
  selectedTrackId?: string
  selectedSubtitleId?: string
  onTrackSelect: (trackId: string) => void
  onSubtitleSelect: (subtitleId: string) => void
  onAddTrack: () => void
  onRemoveTrack: (trackId: string) => void
  onToggleTrack: (trackId: string) => void
  onDeleteSubtitle: (subtitleId: string) => void
}

/**
 * 字幕轨道列表组件
 */
export function SubtitleTrackList({
  tracks,
  selectedTrackId,
  selectedSubtitleId,
  onTrackSelect,
  onSubtitleSelect,
  onAddTrack,
  onRemoveTrack,
  onToggleTrack,
  onDeleteSubtitle,
}: SubtitleTrackListProps) {
  return (
    <div className={styles.trackList}>
      <div className={styles.trackListHeader}>
        <h3>Subtitle Tracks</h3>
        <button className={styles.addTrackButton} onClick={onAddTrack}>
          + Add Track
        </button>
      </div>

      <div className={styles.trackListItems}>
        {tracks.map((track) => (
          <div
            key={track.id}
            className={`${styles.trackItem} ${selectedTrackId === track.id ? styles.selected : ''}`}
          >
            {/* 轨道头部 */}
            <div className={styles.trackHeader}>
              <div className={styles.trackInfo}>
                <input
                  type="checkbox"
                  checked={track.enabled}
                  onChange={() => onToggleTrack(track.id)}
                  className={styles.trackCheckbox}
                />
                <div className={styles.trackDetails}>
                  <div className={styles.trackName}>{track.name}</div>
                  <div className={styles.trackLanguage}>
                    {track.language.toUpperCase()} · {track.subtitles.length} subtitles
                  </div>
                </div>
              </div>
              <button
                className={styles.removeTrackButton}
                onClick={() => onRemoveTrack(track.id)}
                title="Remove track"
              >
                ×
              </button>
            </div>

            {/* 字幕列表 */}
            {track.subtitles.length > 0 && (
              <div className={styles.subtitleList}>
                {track.subtitles.slice(0, 5).map((subtitle, index) => (
                  <div
                    key={subtitle.id}
                    className={`${styles.subtitleItem} ${
                      selectedSubtitleId === subtitle.id ? styles.selected : ''
                    }`}
                    onClick={() => onSubtitleSelect(subtitle.id)}
                  >
                    <div className={styles.subtitleIndex}>#{index + 1}</div>
                    <div className={styles.subtitleContent}>
                      <div className={styles.subtitleTime}>
                        {formatTime(subtitle.startTime)} → {formatTime(subtitle.endTime)}
                      </div>
                      <div className={styles.subtitleText}>{subtitle.text}</div>
                    </div>
                  </div>
                ))}
                {track.subtitles.length > 5 && (
                  <div className={styles.moreSubtitles}>
                    +{track.subtitles.length - 5} more
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 格式化时间
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`
}
