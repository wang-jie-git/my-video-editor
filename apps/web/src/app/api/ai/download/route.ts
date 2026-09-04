import { NextResponse } from "next/server";
import { mkdir, copyFile } from "fs/promises";
import path from "path";

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
 * - B站/抖音/小红书等 → nexus-browser /video/download/with_browser
 *   （nexus 负责浏览器 cookies + 直链提取 + 落盘，实测抖音/小红书/B站可用）
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

const DOMAIN_HINT: Record<string, string> = {
  bilibili: "bilibili",
  douyin: "douyin",
  xiaohongshu: "xiaohongshu",
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

  // 1. 直接调用 nexus-browser 的下载端点（浏览器 cookies + 直链提取 + 落盘）
  const dlResp = await fetch(`${NEXUS_URL}/video/download/with_browser`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      domain: DOMAIN_HINT[platform] ?? platform,
      format_spec: format === "audio" ? "bestaudio/best" : "best[height<=1080]/best",
    }),
  });

  if (!dlResp.ok) {
    let detail = `HTTP ${dlResp.status}`;
    try {
      const err = (await dlResp.json()) as { detail?: string };
      if (err.detail) detail = err.detail;
    } catch {
      // ignore parse error
    }
    return NextResponse.json(
      { success: false, message: `Nexus 下载失败: ${detail}` },
      { status: 502 },
    );
  }

  const dlData = (await dlResp.json()) as {
    status?: string;
    result?: {
      file_path?: string;
      title?: string;
      platform?: string;
      url?: string;
    };
  };

  if (dlData.status !== "success" || !dlData.result?.file_path) {
    return NextResponse.json({
      success: false,
      message: `Nexus 未返回下载文件: ${JSON.stringify(dlData).slice(0, 300)}`,
    });
  }

  const { file_path, title } = dlData.result;

  // 2. 把文件复制到 public/downloads/，让前端同源可访问
  const srcPath = file_path;
  const filename = path.basename(srcPath);
  const destDir = path.join(process.cwd(), "public", "downloads");
  const destPath = path.join(destDir, filename);

  try {
    await mkdir(destDir, { recursive: true });
    await copyFile(srcPath, destPath);
  } catch (e) {
    return NextResponse.json({
      success: false,
      message: `文件复制到素材目录失败: ${e instanceof Error ? e.message : e}`,
      data: { filePath: srcPath },
    });
  }

  const downloadUrl = `/downloads/${filename}`;

  return NextResponse.json({
    success: true,
    message: `${platform === "default" ? "视频" : platformName(platform)} 下载完成: ${title ?? filename}`,
    data: {
      provider: "nexus",
      platform,
      filename,
      downloadUrl,
      videoUrl: downloadUrl,
    },
  });
}

function platformName(platform: string): string {
  switch (platform) {
    case "bilibili":
      return "B站";
    case "douyin":
      return "抖音";
    case "xiaohongshu":
      return "小红书";
    default:
      return "视频";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
