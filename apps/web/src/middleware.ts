import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
	// 排除 public 目录下的静态文件
	const staticFiles = [
		'/ffmpeg-export-standalone.html',
		'/ffmpeg-test-standalone.html',
		'/ffmpeg-export-test.html',
		'/ffmpeg-auto-test.html',
		'/ffmpeg-cdn-test.html',
		'/ffmpeg-standalone-test.html',
		'/ffmpeg-test-simple.html',
	]

	const pathname = request.nextUrl.pathname

	// 如果是静态文件，跳过 i18n 重定向
	if (staticFiles.some((file) => pathname === file || pathname.endsWith(file))) {
		return
	}

	// 默认重定向到 /zh
	const locale = request.cookies.get('NEXT_LOCALE')?.value || 'zh'
	if (!pathname.startsWith(`/${locale}/`) && !pathname.startsWith('/_next')) {
		return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url))
	}

	return
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
