import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const RECLIP_URL = process.env.RECLIP_URL || "http://localhost:8899";
const NEXUS_URL = process.env.NEXUS_URL || "http://localhost:8001";

interface DownloadRequest {
  url: string;
  format?: "video" | "audio";
  height?: number;
}

/**
 * POST /api/ai/download
 *
 * 下载视频/音频素材。自动路由：
 * - YouTube → ReClip (yt-dlp wrapper, localhost:8899)
 * - B站/抖音/小红书等 → nexus-browser 导航 + JS 提取视频地址
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DownloadRequest;
    if (!body.url) {
      return NextResponse.json(
        { success: false, message: "Missing required field: url" },
        { status: 400 },
      );
    }

    const url = body.url;
    const format = body.format ?? "video";

    // 路由：YouTube → ReClip；其他 → nexus-browser
    if (isYouTube(url)) {
      return await downloadViaReclip(url, format, body.height);
    }
    return await downloadViaNexus(url, format);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Download failed",
      },
      { status: 500 },
    );
  }
}

// ── 平台检测 ──

function isYouTube(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

// ── ReClip 路径（YouTube）──

async function downloadViaReclip(
  url: string,
  format: "video" | "audio",
  height?: number,
) {
  // 1. 提交下载任务
  const downloadBody: Record<string, unknown> = { url, format };
  if (height) downloadBody.height = height;

  const resp = await fetch(`${RECLIP_URL}/api/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(downloadBody),
  });

  if (!resp.ok) {
    const err = await resp.text();
    return NextResponse.json(
      { success: false, message: `ReClip error: ${err}` },
      { status: 502 },
    );
  }

  const job = (await resp.json()) as { job_id?: string; error?: string };
  if (job.error) {
    return NextResponse.json({ success: false, message: job.error });
  }
  if (!job.job_id) {
    return NextResponse.json(
      { success: false, message: "ReClip returned no job_id" },
      { status: 502 },
    );
  }

  // 2. 轮询任务状态
  const maxRetries = 120; // 10 分钟超时
  for (let i = 0; i < maxRetries; i++) {
    await sleep(5000);
    const statusResp = await fetch(
      `${RECLIP_URL}/api/status/${job.job_id}`,
    );
    const status = (await statusResp.json()) as {
      status?: string;
      progress?: number;
      error?: string;
      filename?: string;
    };

    if (status.status === "completed" && status.filename) {
      // 3. 获取下载文件 URL
      return NextResponse.json({
        success: true,
        message: `下载完成: ${status.filename}`,
        data: {
          provider: "reclip",
          jobId: job.job_id,
          filename: status.filename,
          downloadUrl: `${RECLIP_URL}/api/file/${job.job_id}`,
        },
      });
    }
    if (status.status === "failed" || status.error) {
      return NextResponse.json({
        success: false,
        message: `ReClip 下载失败: ${status.error ?? "unknown"}`,
      });
    }
  }

  return NextResponse.json(
    { success: false, message: "ReClip 下载超时" },
    { status: 504 },
  );
}

// ── Nexus Browser 路径（B站/抖音/小红书等）──

const PLATFORM_JS: Record<
  string,
  { videoExtractor: string; platform: string }
> = {
  bilibili: {
    platform: "B站",
    // B站视频地址在 <video> 标签的 src 属性或 window.__playinfo__
    videoExtractor: `
      (function() {
        var video = document.querySelector('video');
        if (video && video.src) return video.src;
        var playinfo = window.__playinfo__;
        if (playinfo) {
          var durl = playinfo?.data?.dash?.video?.[0]?.baseUrl;
          if (durl) return durl;
          var durl2 = playinfo?.data?.durl?.[0]?.url;
          if (durl2) return durl2;
        }
        return null;
      })()
    `,
  },
  douyin: {
    platform: "抖音",
    // 抖音视频在 video 标签
    videoExtractor: `
      (function() {
        var video = document.querySelector('video');
        if (video && video.src) return video.src;
        var source = video?.querySelector('source');
        if (source && source.src) return source.src;
        return null;
      })()
    `,
  },
  xiaohongshu: {
    platform: "小红书",
    videoExtractor: `
      (function() {
        var video = document.querySelector('video');
        if (video && video.src) return video.src;
        return null;
      })()
    `,
  },
  default: {
    platform: "网页",
    videoExtractor: `
      (function() {
        var video = document.querySelector('video');
        if (video && video.src) return video.src;
        var source = video?.querySelector('source');
        if (source && source.src) return source.src;
        return null;
      })()
    `,
  },
};

function detectPlatform(url: string): string {
  if (/bilibili\.com/.test(url)) return "bilibili";
  if (/douyin\.com/.test(url)) return "douyin";
  if (/xiaohongshu\.com/.test(url)) return "xiaohongshu";
  return "default";
}

async function downloadViaNexus(
  url: string,
  format: "video" | "audio",
) {
  const platform = detectPlatform(url);
  const config = PLATFORM_JS[platform] ?? PLATFORM_JS.default;

  // 1. 导航到视频页面
  const navResp = await fetch(`${NEXUS_URL}/browser/navigate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!navResp.ok) {
    return NextResponse.json(
      { success: false, message: `Nexus 导航失败: ${navResp.status}` },
      { status: 502 },
    );
  }

  // 2. 等待视频元素加载
  await sleep(3000);

  // 3. 执行 JS 提取视频地址
  const evalResp = await fetch(`${NEXUS_URL}/browser/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ js_code: config.videoExtractor }),
  });
  const evalData = (await evalResp.json()) as {
    result?: string;
    error?: string;
  };

  if (!evalData.result) {
    // 回退：获取页面内容，尝试从 HTML 中提取视频地址
    return NextResponse.json({
      success: false,
      message: `${config.platform} 视频地址提取失败。可能需要登录 cookies。`,
      data: { platform, error: evalData.error },
    });
  }

  const videoUrl = evalData.result;

  // 4. 通过 ReClip 下载提取到的视频地址（yt-dlp 可以下载直链）
  const downloadResp = await fetch(`${RECLIP_URL}/api/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: videoUrl, format }),
  });
  const dlResult = (await downloadResp.json()) as {
    job_id?: string;
    error?: string;
  };

  if (dlResult.error || !dlResult.job_id) {
    // 回退方案：直接返回视频地址，让前端下载
    return NextResponse.json({
      success: true,
      message: `已提取 ${config.platform} 视频地址（直链下载回退）`,
      data: {
        provider: "nexus-direct",
        platform,
        videoUrl,
        downloadUrl: videoUrl,
      },
    });
  }

  // 5. 轮询下载状态
  const maxRetries = 120;
  for (let i = 0; i < maxRetries; i++) {
    await sleep(5000);
    const statusResp = await fetch(
      `${RECLIP_URL}/api/status/${dlResult.job_id}`,
    );
    const status = (await statusResp.json()) as {
      status?: string;
      error?: string;
      filename?: string;
    };

    if (status.status === "completed" && status.filename) {
      return NextResponse.json({
        success: true,
        message: `${config.platform} 下载完成: ${status.filename}`,
        data: {
          provider: "nexus-reclip",
          platform,
          jobId: dlResult.job_id,
          filename: status.filename,
          downloadUrl: `${RECLIP_URL}/api/file/${dlResult.job_id}`,
        },
      });
    }
    if (status.status === "failed" || status.error) {
      // 回退：返回直链
      return NextResponse.json({
        success: true,
        message: `${config.platform} 视频地址已提取（下载回退为直链）`,
        data: {
          provider: "nexus-direct",
          platform,
          videoUrl,
          downloadUrl: videoUrl,
        },
      });
    }
  }

  return NextResponse.json({
    success: true,
    message: `${config.platform} 视频地址已提取（下载超时，回退为直链）`,
    data: {
      provider: "nexus-direct",
      platform,
      videoUrl,
      downloadUrl: videoUrl,
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
