/**
 * 字幕面板组件
 *
 * 提供字幕轨道的管理、编辑和预览功能
 */

import React, { useState, useCallback } from 'react'
import type { SubtitleTrack, Subtitle } from '@/services/renderer/subtitles'
import { SubtitlePipeline } from '@/services/renderer/subtitles'
import { FFmpegService } from '@/services/renderer/ffmpeg/ffmpeg-service'
import { SubtitleTrackList } from './subtitle-track-list'
import { SubtitleStyleEditor } from './subtitle-style-editor'
import { SubtitleEditor } from './subtitle-editor'
import { SubtitlePreview } from './subtitle-preview'
import { SubtitleBatchOperations } from './subtitle-batch-operations'
import styles from './subtitle-panel.module.css'

export interface SubtitlePanelProps {
  tracks: SubtitleTrack[]
  selectedTrackId?: string
  onTracksChange?: (tracks: SubtitleTrack[]) => void
  onTrackSelect?: (trackId: string) => void
  onSubtitleSelect?: (subtitleId: string) => void
  className?: string
  /** 是否显示高级功能 */
  showAdvancedFeatures?: boolean
}

/**
 * 字幕面板组件
 */
export function SubtitlePanel({
  tracks,
  selectedTrackId,
  onTracksChange,
  onTrackSelect,
  onSubtitleSelect,
  className = '',
  showAdvancedFeatures = true,
}: SubtitlePanelProps) {
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null)
  const [previewTime, setPreviewTime] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'subtitles' | 'batch' | 'advanced'>('subtitles')

  // 获取选中的轨道
  const selectedTrack = tracks.find((t) => t.id === selectedTrackId)

  // 获取选中的字幕
  const selectedSubtitle = selectedTrack?.subtitles.find((s) => s.id === selectedSubtitleId)

  // 轨道变更处理
  const handleTracksChange = useCallback(
    (newTracks: SubtitleTrack[]) => {
      onTracksChange?.(newTracks)
    },
    [onTracksChange]
  )

  // 轨道选择处理
  const handleTrackSelect = useCallback(
    (trackId: string) => {
      onTrackSelect?.(trackId)
      setSelectedSubtitleId(null)
    },
    [onTrackSelect]
  )

  // 字幕选择处理
  const handleSubtitleSelect = useCallback(
    (subtitleId: string) => {
      setSelectedSubtitleId(subtitleId)
      onSubtitleSelect?.(subtitleId)

      // 更新时间轴预览
      const subtitle = selectedTrack?.subtitles.find((s) => s.id === subtitleId)
      if (subtitle) {
        setPreviewTime(subtitle.startTime)
      }
    },
    [selectedTrack, onSubtitleSelect]
  )

  // 添加字幕处理
  const handleAddSubtitle = useCallback(() => {
    if (!selectedTrack) return

    const pipeline = new SubtitlePipeline(new FFmpegService())

    // 在最后一个字幕后添加新字幕
    const lastSubtitle = selectedTrack.subtitles[selectedTrack.subtitles.length - 1]
    const startTime = lastSubtitle ? lastSubtitle.endTime + 0.5 : 0
    const endTime = startTime + 2

    const newTrack = pipeline.addSubtitle(selectedTrack, 'New subtitle', startTime, endTime)

    const newTracks = tracks.map((t) => (t.id === selectedTrack.id ? newTrack : t))
    handleTracksChange(newTracks)
    setIsEditing(true)
  }, [selectedTrack, tracks, handleTracksChange])

  // 删除字幕处理
  const handleDeleteSubtitle = useCallback(
    (subtitleId: string) => {
      if (!selectedTrack) return

      const pipeline = new SubtitlePipeline(new FFmpegService())
      const newTrack = pipeline.removeSubtitle(selectedTrack, subtitleId)

      const newTracks = tracks.map((t) => (t.id === selectedTrack.id ? newTrack : t))
      handleTracksChange(newTracks)

      if (selectedSubtitleId === subtitleId) {
        setSelectedSubtitleId(null)
      }
    },
    [selectedTrack, selectedSubtitleId, tracks, handleTracksChange]
  )

  // 更新字幕处理
  const handleUpdateSubtitle = useCallback(
    (subtitleId: string, updates: Partial<Subtitle>) => {
      if (!selectedTrack) return

      const pipeline = new SubtitlePipeline(new FFmpegService())
      const newTrack = pipeline.updateSubtitle(selectedTrack, subtitleId, updates)

      const newTracks = tracks.map((t) => (t.id === selectedTrack.id ? newTrack : t))
      handleTracksChange(newTracks)
    },
    [selectedTrack, tracks, handleTracksChange]
  )

  // 样式变更处理
  const handleStyleChange = useCallback(
    (style: SubtitleTrack['style']) => {
      if (!selectedTrack) return

      const newTrack: SubtitleTrack = {
        ...selectedTrack,
        style,
      }

      const newTracks = tracks.map((t) => (t.id === selectedTrack.id ? newTrack : t))
      handleTracksChange(newTracks)
    },
    [selectedTrack, tracks, handleTracksChange]
  )

  // 添加轨道处理
  const handleAddTrack = useCallback(() => {
    const pipeline = new SubtitlePipeline(new FFmpegService())
    const newTrack = {
      id: `track-${Date.now()}`,
      name: `Track ${tracks.length + 1}`,
      language: 'en',
      enabled: true,
      subtitles: [],
      style: {},
    }

    const newTracks = pipeline.addTrack(tracks, newTrack)
    handleTracksChange(newTracks)
    handleTrackSelect(newTrack.id)
  }, [tracks, handleTracksChange, handleTrackSelect])

  // 删除轨道处理
  const handleRemoveTrack = useCallback(
    (trackId: string) => {
      const pipeline = new SubtitlePipeline(new FFmpegService())
      const newTracks = pipeline.removeTrack(tracks, trackId)
      handleTracksChange(newTracks)

      if (selectedTrackId === trackId) {
        onTrackSelect?.(newTracks[0]?.id || '')
      }
    },
    [tracks, selectedTrackId, handleTracksChange, onTrackSelect]
  )

  // 切换轨道启用状态
  const handleToggleTrack = useCallback(
    (trackId: string) => {
      const pipeline = new SubtitlePipeline(new FFmpegService())
      const newTracks = pipeline.toggleTrack(tracks, trackId)
      handleTracksChange(newTracks)
    },
    [tracks, handleTracksChange]
  )

  // 合并字幕处理
  const handleMergeSubtitle = useCallback(
    (subtitleId: string, mergeWithId: string) => {
      if (!selectedTrack) return

      const pipeline = new SubtitlePipeline(new FFmpegService())
      const subtitles = selectedTrack.subtitles
      const index1 = subtitles.findIndex(s => s.id === subtitleId)
      const index2 = subtitles.findIndex(s => s.id === mergeWithId)

      if (index1 === -1 || index2 === -1) return

      const [sub1, sub2] = index1 < index2
        ? [subtitles[index1], subtitles[index2]]
        : [subtitles[index2], subtitles[index1]]

      const mergedSubtitle: Subtitle = {
        id: `merged-${Date.now()}`,
        startTime: sub1.startTime,
        endTime: sub2.endTime,
        text: `${sub1.text} ${sub2.text}`,
        style: sub1.style,
      }

      const newSubtitles = subtitles.filter(s => s.id !== subtitleId && s.id !== mergeWithId)
      newSubtitles.push(mergedSubtitle)

      const newTrack = { ...selectedTrack, subtitles: newSubtitles.sort((a, b) => a.startTime - b.startTime) }
      const newTracks = tracks.map(t => t.id === selectedTrack.id ? newTrack : t)
      handleTracksChange(newTracks)
    },
    [selectedTrack, tracks, handleTracksChange]
  )

  // 渲染空状态
  if (tracks.length === 0) {
    return (
      <div className={`${styles.subtitlePanel} ${className}`}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📝</div>
          <div className={styles.emptyText}>No subtitle tracks</div>
          <div className={styles.emptyDescription}>Add a track to get started</div>
          <button className={styles.addTrackButton} onClick={handleAddTrack}>
            + Add Track
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.subtitlePanel} ${className}`}>
      {/* 轨道列表 */}
      <div className={styles.trackListSection}>
        <SubtitleTrackList
          tracks={tracks}
          selectedTrackId={selectedTrackId}
          selectedSubtitleId={selectedSubtitleId ?? undefined}
          onTrackSelect={handleTrackSelect}
          onSubtitleSelect={handleSubtitleSelect}
          onAddTrack={handleAddTrack}
          onRemoveTrack={handleRemoveTrack}
          onToggleTrack={handleToggleTrack}
          onDeleteSubtitle={handleDeleteSubtitle}
        />
      </div>

      {/* 主编辑区域 */}
      {selectedTrack && (
        <>
          {/* Tab 导航 */}
          {showAdvancedFeatures && (
            <div className={styles.tabNavigation}>
              <button
                className={`${styles.tabButton} ${activeTab === 'subtitles' ? styles.active : ''}`}
                onClick={() => setActiveTab('subtitles')}
              >
                Subtitles
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'batch' ? styles.active : ''}`}
                onClick={() => setActiveTab('batch')}
              >
                Batch Operations
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'advanced' ? styles.active : ''}`}
                onClick={() => setActiveTab('advanced')}
              >
                Advanced
              </button>
            </div>
          )}

          {/* Subtitles Tab */}
          {activeTab === 'subtitles' && (
            <>
              {/* 样式编辑器 */}
              <div className={styles.styleEditorSection}>
                <SubtitleStyleEditor
                  style={selectedTrack.style}
                  onChange={handleStyleChange}
                />
              </div>

              {/* 字幕列表 */}
              {selectedSubtitle && isEditing ? (
                <div className={styles.subtitleEditorSection}>
                  <SubtitleEditor
                    subtitle={selectedSubtitle}
                    onSave={(updates: Partial<Subtitle>) => {
                      handleUpdateSubtitle(selectedSubtitle.id, updates)
                      setIsEditing(false)
                    }}
                    onCancel={() => setIsEditing(false)}
                  />
                </div>
              ) : (
                <div className={styles.subtitleListSection}>
                  <div className={styles.subtitleListHeader}>
                    <h3>Subtitles</h3>
                    <button className={styles.addSubtitleButton} onClick={handleAddSubtitle}>
                      + Add
                    </button>
                  </div>
                  <div className={styles.subtitleList}>
                    {selectedTrack.subtitles.map((subtitle) => (
                      <div
                        key={subtitle.id}
                        className={`${styles.subtitleListItem} ${
                          selectedSubtitleId === subtitle.id ? styles.selected : ''
                        }`}
                        onClick={() => handleSubtitleSelect(subtitle.id)}
                      >
                        <div className={styles.subtitleTime}>
                          {formatTime(subtitle.startTime)} - {formatTime(subtitle.endTime)}
                        </div>
                        <div className={styles.subtitleText}>{subtitle.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Batch Operations Tab */}
          {activeTab === 'batch' && showAdvancedFeatures && (
            <div className={styles.batchOperationsSection}>
              <SubtitleBatchOperations
                tracks={tracks}
                selectedTrackId={selectedTrackId}
                onOperationComplete={(updatedTrack) => {
                  const newTracks = tracks.map(t => t.id === updatedTrack.id ? updatedTrack : t)
                  handleTracksChange(newTracks)
                }}
              />
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && showAdvancedFeatures && (
            <div className={styles.advancedSection}>
              <div className={styles.advancedSectionHeader}>
                <h3>Advanced Features</h3>
              </div>
              <div className={styles.advancedButtons}>
                <button
                  className={styles.advancedButton}
                  onClick={() => alert('OCR 识别功能需要配置 API 密钥')}
                  disabled
                  title="识别视频中的字幕"
                >
                  <span className={styles.advancedButtonIcon}>🔍</span>
                  <span className={styles.advancedButtonText}>
                    OCR Recognition
                    <span className={styles.advancedButtonDescription}>
                      Recognize subtitles from video
                    </span>
                  </span>
                </button>
                <button
                  className={styles.advancedButton}
                  onClick={() => {
                    const targetLang = prompt('Enter target language code (e.g., zh, en, ja):', 'zh')
                    if (targetLang) {
                      alert(`Translation to ${targetLang} will be implemented`)
                    }
                  }}
                  disabled
                  title="翻译字幕"
                >
                  <span className={styles.advancedButtonIcon}>🌐</span>
                  <span className={styles.advancedButtonText}>
                    Translate
                    <span className={styles.advancedButtonDescription}>
                      Translate subtitles to another language
                    </span>
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* 预览 */}
          <div className={styles.previewSection}>
            <SubtitlePreview
              track={selectedTrack}
              currentTime={previewTime}
              onTimeUpdate={setPreviewTime}
            />
          </div>
        </>
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
  const ms = Math.floor((seconds % 1) * 100)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`
}
