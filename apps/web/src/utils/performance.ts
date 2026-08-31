/**
 * 性能优化工具
 *
 * 提供防抖、节流、虚拟滚动等优化
 */

/**
 * 防抖函数
 *
 * @param fn - 要防抖的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timerId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timerId) {
      clearTimeout(timerId)
    }

    timerId = setTimeout(() => {
      fn(...args)
      timerId = null
    }, delay)
  }
}

/**
 * 节流函数
 *
 * @param fn - 要节流的函数
 * @param interval - 间隔时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastCall = 0
  let timerId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    const now = Date.now()

    if (now - lastCall >= interval) {
      lastCall = now
      fn(...args)
    } else if (!timerId) {
      timerId = setTimeout(() => {
        lastCall = Date.now()
        timerId = null
        fn(...args)
      }, interval - (now - lastCall))
    }
  }
}

/**
 * 创建防抖 Hook
 *
 * @param value - 要防抖的值
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的值
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timerId)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * 创建节流 Hook
 *
 * @param callback - 要节流的回调
 * @param delay - 延迟时间（毫秒）
 * @returns 节流后的回调
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef(0)
  const timerIdRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)

  // 更新 callback 引用
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()

      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now
        callbackRef.current(...args)
      } else if (!timerIdRef.current) {
        timerIdRef.current = setTimeout(() => {
          lastCallRef.current = Date.now()
          timerIdRef.current = null
          callbackRef.current(...args)
        }, delay - (now - lastCallRef.current))
      }
    },
    [delay]
  ) as T
}

/**
 * 虚拟滚动项
 */
interface VirtualScrollItem<T> {
  data: T
  index: number
  top: number
  height: number
}

/**
 * 虚拟滚动 Hook
 *
 * @param items - 所有数据
 * @param itemHeight - 每个项的高度
 * @param containerHeight - 容器高度
 * @returns 虚拟滚动后的可见项
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
): VirtualScrollItem<T>[] {
  const [scrollTop, setScrollTop] = useState(0)

  // 计算可见范围
  const startIndex = Math.floor(scrollTop / itemHeight)
  const endIndex = Math.min(
    Math.ceil((scrollTop + containerHeight) / itemHeight),
    items.length
  )

  // 生成可见项
  const visibleItems: VirtualScrollItem<T>[] = []

  for (let i = startIndex; i < endIndex; i++) {
    visibleItems.push({
      data: items[i],
      index: i,
      top: i * itemHeight,
      height: itemHeight,
    })
  }

  return visibleItems
}

/**
 * 延迟加载图片
 *
 * @param src - 图片 URL
 * @param placeholder - 占位图 URL
 * @returns 图片 URL（已加载或占位）
 */
export function useLazyImage(src: string, placeholder?: string): string {
  const [imageSrc, setImageSrc] = useState(placeholder || '')

  useEffect(() => {
    const img = new Image()

    img.onload = () => {
      setImageSrc(src)
    }

    img.onerror = () => {
      if (placeholder) {
        setImageSrc(placeholder)
      }
    }

    img.src = src
  }, [src, placeholder])

  return imageSrc
}

/**
 * 性能监控 Hook
 *
 * @param name - 组件名称
 * @returns 性能指标
 */
export function usePerformanceMonitor(name: string) {
  const [metrics, setMetrics] = useState<{
    renderCount: number
    lastRenderTime: number
    avgRenderTime: number
  }>({
    renderCount: 0,
    lastRenderTime: 0,
    avgRenderTime: 0,
  })

  const renderTimesRef = useRef<number[]>([])

  useEffect(() => {
    const startTime = performance.now()

    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime

      renderTimesRef.current.push(renderTime)

      // 只保留最近 50 次
      if (renderTimesRef.current.length > 50) {
        renderTimesRef.current = renderTimesRef.current.slice(-50)
      }

      const avgRenderTime =
        renderTimesRef.current.reduce((a, b) => a + b, 0) /
        renderTimesRef.current.length

      setMetrics({
        renderCount: renderTimesRef.current.length,
        lastRenderTime: renderTime,
        avgRenderTime,
      })
    }
  })

  return metrics
}

/**
 * 缓存计算结果
 *
 * @param fn - 要缓存的函数
 * @param keyFn - 生成缓存键的函数
 * @returns 缓存版本的函数
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyFn?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>()

  return ((...args: Parameters<T>) => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args)

    if (cache.has(key)) {
      return cache.get(key)!
    }

    const result = fn(...args)
    cache.set(key, result)

    return result
  }) as T
}

/**
 * 批量处理 Hook
 *
 * @param items - 要处理的数据
 * @param batchSize - 每批处理的数量
 * @param processor - 处理函数
 */
export function useBatchProcessor<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => R | Promise<R>
) {
  const [results, setResults] = useState<R[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  const process = useCallback(async () => {
    setIsProcessing(true)
    setResults([])
    setProgress(0)

    const allResults: R[] = []

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map(processor))
      allResults.push(...batchResults)

      setResults([...allResults])
      setProgress(Math.min(((i + batchSize) / items.length) * 100, 100))
    }

    setIsProcessing(false)
    setProgress(100)
  }, [items, batchSize, processor])

  return {
    results,
    isProcessing,
    progress,
    process,
    reset: () => {
      setResults([])
      setProgress(0)
    },
  }
}

// 导入所需的 React hooks
import { useState, useEffect, useRef, useCallback } from 'react'
