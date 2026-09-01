/**
 * FormatDetector - 格式检测组件
 *
 * 检测文件格式并显示检测结果
 */

import { useTranslation } from '@i18next-toolkit/nextjs-approuter'
import { useState } from 'react'

interface FormatDetectorProps {
  /** 文件名 */
  fileName: string
  /** 检测结果 */
  onDetect: (format: string, isVideo: boolean, supported: boolean) => void
}

/**
 * FormatDetector 组件
 */
export function FormatDetector({ fileName, onDetect }: FormatDetectorProps) {
  const { t } = useTranslation()

  // 提取扩展名
  const getExtension = (name: string): string => {
    const lastDot = name.lastIndexOf('.')
    if (lastDot === -1) return ''
    return name.substring(lastDot + 1).toLowerCase()
  }

  // 支持的视频格式
  const VIDEO_FORMATS = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v']
  const SUPPORTED_CONVERSION = ['mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', 'mp4', 'webm']

  const ext = getExtension(fileName)
  const isVideo = VIDEO_FORMATS.includes(ext)
  const supported = SUPPORTED_CONVERSION.includes(ext)

  // 通知父组件
  if (fileName) {
    onDetect(ext, isVideo, supported)
  }

  if (!fileName) {
    return null
  }

  return (
    <div className="format-detector">
      <div className="format-info">
        <span className="format-label">{t('formatConverter.format')}:</span>
        <span className={`format-value ${isVideo ? 'video' : 'non-video'}`}>
          {ext.toUpperCase() || t('formatConverter.unknown')}
        </span>
      </div>

      <div className="format-status">
        {isVideo ? (
          <span className="status-badge video">
            {t('formatConverter.videoFormat')}
          </span>
        ) : (
          <span className="status-badge non-video">
            {t('formatConverter.nonVideoFormat')}
          </span>
        )}

        {isVideo && supported && (
          <span className="status-badge supported">
            {t('formatConverter.conversionSupported')}
          </span>
        )}

        {isVideo && !supported && (
          <span className="status-badge unsupported">
            {t('formatConverter.conversionNotSupported')}
          </span>
        )}
      </div>

      <style jsx>{`
        .format-detector {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: var(--surface-elevated);
          border-radius: 8px;
        }

        .format-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .format-label {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .format-value {
          font-size: 16px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .format-value.video {
          color: var(--accent-primary);
        }

        .format-value.non-video {
          color: var(--text-muted);
        }

        .format-status {
          display: flex;
          gap: 8px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.video {
          background: rgba(var(--accent-primary-rgb), 0.1);
          color: var(--accent-primary);
        }

        .status-badge.non-video {
          background: var(--surface-muted);
          color: var(--text-muted);
        }

        .status-badge.supported {
          background: rgba(34, 197, 94, 0.1);
          color: rgb(34, 197, 94);
        }

        .status-badge.unsupported {
          background: rgba(239, 68, 68, 0.1);
          color: rgb(239, 68, 68);
        }
      `}</style>
    </div>
  )
}
