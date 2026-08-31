/**
 * LUT 文件处理 Hook
 *
 * 提供 LUT 文件读取、验证和管理功能
 */

import { useState, useCallback } from 'react'

interface LutFile {
  /** 文件名 */
  name: string
  /** 文件大小（字节） */
  size: number
  /** 文件类型 */
  type: string
  /** Base64 编码的数据 */
  data: string
  /** 读取时间 */
  loadedAt: Date
}

interface UseLutFileUploadReturn {
  /** 当前加载的 LUT 文件 */
  lutFile: LutFile | null
  /** 是否正在加载 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null
  /** 读取 LUT 文件 */
  readLutFile: (file: File) => Promise<void>
  /** 清除 LUT 文件 */
  clearLutFile: () => void
}

/**
 * LUT 文件处理 Hook
 *
 * 支持 .cube 格式 LUT 文件
 */
export function useLutFileUpload(): UseLutFileUploadReturn {
  const [lutFile, setLutFile] = useState<LutFile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 读取 LUT 文件
   */
  const readLutFile = useCallback(async (file: File): Promise<void> => {
    // 验证文件类型
    if (!file.name.endsWith('.cube')) {
      const err = '仅支持 .cube 格式的 LUT 文件'
      setError(err)
      throw new Error(err)
    }

    // 验证文件大小（限制 10MB）
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      const err = `LUT 文件过大（${(file.size / 1024 / 1024).toFixed(2)}MB），最大 10MB`
      setError(err)
      throw new Error(err)
    }

    setIsLoading(true)
    setError(null)

    try {
      // 读取文件为 Base64
      const base64 = await fileToBase64(file)

      // 创建 LUT 文件对象
      const lutFileObj: LutFile = {
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        data: base64,
        loadedAt: new Date(),
      }

      setLutFile(lutFileObj)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '读取 LUT 文件失败'
      setError(errorMsg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * 清除 LUT 文件
   */
  const clearLutFile = useCallback(() => {
    setLutFile(null)
    setError(null)
  }, [])

  return {
    lutFile,
    isLoading,
    error,
    readLutFile,
    clearLutFile,
  }
}

/**
 * 将文件转换为 Base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // 移除 data URL 前缀
        const base64 = reader.result.split(',')[1] || reader.result
        resolve(base64)
      } else {
        reject(new Error('读取文件失败'))
      }
    }

    reader.onerror = () => {
      reject(new Error('读取文件失败'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * 验证 LUT 文件格式
 *
 * @param base64Data - Base64 编码的 LUT 数据
 * @returns 验证结果
 */
export function validateLutFormat(base64Data: string): { valid: boolean; error?: string } {
  try {
    // 解码 Base64
    const content = atob(base64Data)
    const firstLine = content.split('\n')[0]

    // 检查是否是 .cube 格式
    if (!firstLine.includes('LUT') && !firstLine.includes('CUBE')) {
      return {
        valid: false,
        error: '无效的 LUT 格式：缺少 LUT/CUBE 标识',
      }
    }

    // 检查是否包含必要的标题
    if (!content.includes('TITLE') && !content.includes('LUT_3D_SIZE')) {
      return {
        valid: false,
        error: '无效的 LUT 格式：缺少必要的元数据',
      }
    }

    return { valid: true }
  } catch (err) {
    return {
      valid: false,
      error: `LUT 格式验证失败: ${err instanceof Error ? err.message : '未知错误'}`,
    }
  }
}

/**
 * 从 Base64 创建 Blob URL
 *
 * @param base64Data - Base64 编码的 LUT 数据
 * @param fileName - 文件名
 * @returns Blob URL
 */
export function createLutBlobUrl(base64Data: string, fileName: string): string {
  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  const blob = new Blob([bytes], { type: 'application/octet-stream' })
  return URL.createObjectURL(blob)
}

/**
 * 格式化文件大小
 *
 * @param bytes - 文件大小（字节）
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
