/**
 * 字幕编辑器组件
 *
 * 编辑单个字幕条目的内容、时间和样式
 */

import React, { useState, useEffect } from 'react'
import type { Subtitle, SubtitleStyle } from '@/services/renderer/subtitles'
import styles from './subtitle-panel.module.css'

export interface SubtitleEditorProps {
  subtitle: Subtitle
  onSave: (updates: Partial<Subtitle>) => void
  onCancel: () => void
}

/**
 * 字幕编辑器组件
 */
export function SubtitleEditor({ subtitle, onSave, onCancel }: SubtitleEditorProps) {
  const [text, setText] = useState(subtitle.text)
  const [startTime, setStartTime] = useState(subtitle.startTime)
  const [endTime, setEndTime] = useState(subtitle.endTime)
  const [style, setStyle] = useState<SubtitleStyle>(subtitle.style || {})

  // 同步外部变化
  useEffect(() => {
    setText(subtitle.text)
    setStartTime(subtitle.startTime)
    setEndTime(subtitle.endTime)
    setStyle(subtitle.style || {})
  }, [subtitle])

  // 处理保存
  const handleSave = () => {
    const updates: Partial<Subtitle> = {
      text,
      startTime,
      endTime,
      style,
    }
    onSave(updates)
  }

  // 验证时间
  const isTimeValid = startTime >= 0 && endTime > startTime
  const hasChanges =
    text !== subtitle.text ||
    startTime !== subtitle.startTime ||
    endTime !== subtitle.endTime ||
    JSON.stringify(style) !== JSON.stringify(subtitle.style)

  return (
    <div className={styles.subtitleEditor}>
      <div className={styles.editorHeader}>
        <h3>Edit Subtitle</h3>
        <div className={styles.editorActions}>
          <button className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={!isTimeValid || !hasChanges}
          >
            Save
          </button>
        </div>
      </div>

      <div className={styles.editorContent}>
        {/* 文本输入 */}
        <div className={styles.editorField}>
          <label className={styles.fieldLabel}>Text</label>
          <textarea
            className={styles.textInput}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter subtitle text..."
            rows={3}
          />
        </div>

        {/* 时间输入 */}
        <div className={styles.timeInputs}>
          <div className={styles.editorField}>
            <label className={styles.fieldLabel}>Start Time</label>
            <input
              type="number"
              className={styles.timeInput}
              value={startTime}
              onChange={(e) => setStartTime(parseFloat(e.target.value) || 0)}
              min={0}
              step={0.1}
            />
          </div>

          <div className={styles.editorField}>
            <label className={styles.fieldLabel}>End Time</label>
            <input
              type="number"
              className={styles.timeInput}
              value={endTime}
              onChange={(e) => setEndTime(parseFloat(e.target.value) || 0)}
              min={0}
              step={0.1}
            />
          </div>

          <div className={styles.editorField}>
            <label className={styles.fieldLabel}>Duration</label>
            <div className={styles.durationDisplay}>
              {(endTime - startTime).toFixed(2)}s
            </div>
          </div>
        </div>

        {/* 样式输入 */}
        <div className={styles.styleInputs}>
          <div className={styles.editorField}>
            <label className={styles.fieldLabel}>Font Size</label>
            <input
              type="number"
              className={styles.timeInput}
              value={style.fontSize || 24}
              onChange={(e) => setStyle({ ...style, fontSize: parseInt(e.target.value) || 24 })}
              min={12}
              max={72}
            />
          </div>

          <div className={styles.editorField}>
            <label className={styles.fieldLabel}>Color</label>
            <input
              type="color"
              className={styles.colorInput}
              value={style.color || '#FFFFFF'}
              onChange={(e) => setStyle({ ...style, color: e.target.value })}
            />
          </div>

          <div className={styles.editorField}>
            <label className={styles.fieldLabel}>Background</label>
            <input
              type="color"
              className={styles.colorInput}
              value={
                style.backgroundColor?.replace(/^rgba?\(|\)$/g, '') || '#000000'
              }
              onChange={(e) => setStyle({ ...style, backgroundColor: e.target.value })}
            />
          </div>

          <div className={styles.editorField}>
            <label className={styles.fieldLabel}>
              <input
                type="checkbox"
                checked={style.bold || false}
                onChange={(e) => setStyle({ ...style, bold: e.target.checked })}
              />
              Bold
            </label>
          </div>
        </div>

        {!isTimeValid && (
          <div className={styles.errorMessage}>
            Invalid time range: end time must be greater than start time
          </div>
        )}
      </div>
    </div>
  )
}
