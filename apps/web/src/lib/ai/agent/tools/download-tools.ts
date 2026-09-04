import type { AgentTool } from "./types";

export const downloadVideoTool: AgentTool = {
  name: "download_video",
  description:
    "从 YouTube、B站、抖音、小红书等平台下载视频或音频素材。" +
    "YouTube 使用 ReClip (yt-dlp)，国内平台使用 Nexus Browser 导航+提取视频地址。" +
    "下载完成后返回文件 URL，可用于导入项目素材。" +
    "参数: url=视频页面链接(必填), format=video或audio(默认video)",
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description:
          "视频页面 URL。支持 youtube.com, youtu.be, bilibili.com, douyin.com, xiaohongshu.com 等。",
      },
      format: {
        type: "string",
        enum: ["video", "audio"],
        description: "下载格式：video=视频(MP4)，audio=音频(MP3)。默认 video。",
      },
    },
    required: ["url"],
  },
  requiresConfirmation: true,
  async execute(args: Record<string, unknown>) {
    const url = args.url as string;
    const format = (args.format as "video" | "audio") ?? "video";

    if (!url) {
      return {
        success: false,
        message: "缺少 url 参数",
      };
    }

    try {
      const resp = await fetch("/api/ai/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, format }),
      });
      const data = (await resp.json()) as {
        success: boolean;
        message: string;
        data?: {
          provider: string;
          platform?: string;
          filename?: string;
          downloadUrl: string;
          videoUrl?: string;
        };
      };

      if (!data.success) {
        return {
          success: false,
          message: data.message ?? "下载失败",
        };
      }

      const dl = data.data;
      return {
        success: true,
        message: data.message,
        data: {
          provider: dl?.provider ?? "unknown",
          platform: dl?.platform,
          filename: dl?.filename,
          downloadUrl: dl?.downloadUrl,
          videoUrl: dl?.videoUrl,
        } as Record<string, unknown>,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "下载请求失败",
      };
    }
  },
};

export const downloadTools: AgentTool[] = [downloadVideoTool];
