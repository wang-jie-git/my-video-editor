/**
 * 提供 FFmpeg 测试页面
 * GET /api/ffmpeg-test-standalone?file=cdntest|standalone
 */

import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const fileType = searchParams.get('file') || 'standalone'

  const basePath = process.cwd()
  const fileMap = {
    'cdntest': 'public/ffmpeg-cdn-test.html',
    'standalone': 'public/ffmpeg-standalone-test.html',
  }

  const filePath = join(basePath, fileMap[fileType as keyof typeof fileMap] || fileMap.standalone)

  try {
    const content = readFileSync(filePath, 'utf-8')
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('读取文件失败:', error)
    return NextResponse.json(
      { error: '文件不存在' },
      { status: 404 }
    )
  }
}
