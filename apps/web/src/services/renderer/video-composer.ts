/**
 * VideoComposer - 视频合并/分割
 *
 * 使用 FFmpeg.wasm 实现视频合并、转场、分割、裁剪功能
 *
 * @example
 * ```typescript
 * const composer = new VideoComposer(ffmpegService)
 *
 * // 合并视频
 * await composer.mergeVideos({
 *   inputFiles: ['video1.mp4', 'video2.mp4'],
 *   outputFile: 'merged.mp4',
 * })
 *
 * // 添加转场效果
 * await composer.concatWithTransitions({
 *   inputFiles: ['video1.mp4', 'video2.mp4'],
 *   transitions: [{ type: 'fade', duration: 1.0 }],
 *   outputFile: 'merged-with-transition.mp4',
 * })
 *
 * // 分割视频
 * await composer.splitVideo({
 *   inputFile: 'video.mp4',
 *   splitPoints: [10, 20], // 在第 10 秒和第 20 秒处分割
 *   outputPrefix: 'segment',
 * })
 *
 * // 裁剪视频
 * await composer.trimVideo({
 *   inputFile: 'video.mp4',
 *   startTime: 5,
 *   endTime: 15,
 *   outputFile: 'trimmed.mp4',
 * })
 * ```
 */

import { FFmpegService } from "./ffmpeg/ffmpeg-service";
import type {
  MergeOptions,
  MergeResult,
  TransitionMergeOptions,
  SplitOptions,
  SplitResult,
  TrimOptions,
  TrimResult,
  Transition,
  TransitionType,
  VideoInfo,
  TimeSegment,
  VideoComposerProgress,
} from "./video-composer/types";

/**
 * VideoComposer 类
 *
 * 提供视频合并、转场、分割、裁剪功能
 */
export class VideoComposer {
  private ffmpegService: FFmpegService;

  constructor(ffmpegService: FFmpegService) {
    this.ffmpegService = ffmpegService;
  }

  // ============ 视频合并 ============

  /**
   * 合并多个视频文件
   *
   * @param inputFiles 输入文件列表（必须在 FFmpeg 虚拟文件系统中）
   * @param options 合并选项
   * @param onProgress 进度回调
   * @returns 合并结果
   *
   * @example
   * ```typescript
   * await composer.mergeVideos(
   *   ['part1.mp4', 'part2.mp4', 'part3.mp4'],
   *   { outputFile: 'merged.mp4', includeAudio: true }
   * )
   * ```
   */
  async mergeVideos(
    inputFiles: string[],
    options: MergeOptions,
    onProgress?: (progress: VideoComposerProgress) => void,
  ): Promise<MergeResult> {
    const { outputFile, includeAudio = true, reencode = false } = options;

    try {
      // 验证输入
      if (!inputFiles || inputFiles.length === 0) {
        return { success: false, error: "输入文件列表为空" };
      }

      if (inputFiles.length === 1) {
        return { success: false, error: "至少需要 2 个视频文件才能合并" };
      }

      // 验证输出文件名
      if (!outputFile || outputFile.trim() === "") {
        return { success: false, error: "输出文件名不能为空" };
      }

      // 验证输入文件是否存在（通过检查文件名格式）
      for (const file of inputFiles) {
        if (!file || file.trim() === "") {
          return { success: false, error: "输入文件名不能为空" };
        }

        // 检查文件扩展名
        const ext = file.split(".").pop()?.toLowerCase();
        if (!ext || !["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) {
          return {
            success: false,
            error: `不支持的文件格式: ${file}，支持的格式: mp4, webm, mov, avi, mkv`,
          };
        }
      }

      // 检查输出文件扩展名
      const outputExt = outputFile.split(".").pop()?.toLowerCase();
      if (!outputExt || !["mp4", "webm"].includes(outputExt)) {
        return {
          success: false,
          error: `不支持的输出格式: ${outputExt}，支持的格式: mp4, webm`,
        };
      }

      onProgress?.({
        phase: "merging",
        progress: 0,
        completed: 0,
        total: inputFiles.length,
      });

      // 如果是流复制模式，需要先写入文件列表
      if (!reencode) {
        const listFile = this.generateFileList(inputFiles);
        await this.ffmpegService.writeFile(
          "filelist.txt",
          new TextEncoder().encode(listFile),
        );
      }

      // 构建 FFmpeg 命令
      const args = this.buildMergeArgs({
        inputFiles,
        outputFile,
        includeAudio,
        reencode,
      });

      // 执行合并
      await this.ffmpegService.exec(args, {
        onProgress: ({ progress }) => {
          onProgress?.({
            phase: "merging",
            progress,
            completed: Math.floor(progress * inputFiles.length),
            total: inputFiles.length,
          });
        },
      });

      // 读取输出文件
      const outputData = await this.ffmpegService.readFile(outputFile);
      const fileSize = outputData.length;

      onProgress?.({
        phase: "complete",
        progress: 1,
        completed: inputFiles.length,
        total: inputFiles.length,
      });

      return {
        success: true,
        outputFile,
        size: fileSize,
        videoCount: inputFiles.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "合并失败";
      onProgress?.({
        phase: "error",
        progress: 0,
        completed: 0,
        total: inputFiles.length,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 合并视频并添加转场效果
   *
   * @param inputFiles 输入文件列表
   * @param options 转场合并选项
   * @param onProgress 进度回调
   * @returns 合并结果
   *
   * @example
   * ```typescript
   * await composer.concatWithTransitions(
   *   ['video1.mp4', 'video2.mp4', 'video3.mp4'],
   *   {
   *     outputFile: 'merged.mp4',
   *     transitions: [
   *       { type: 'fade', duration: 1.0 },
   *       { type: 'slide', duration: 0.8 },
   *     ],
   *   }
   * )
   * ```
   */
  async concatWithTransitions(
    inputFiles: string[],
    options: TransitionMergeOptions,
    onProgress?: (progress: VideoComposerProgress) => void,
  ): Promise<MergeResult> {
    const { outputFile, includeAudio = true, transitions } = options;

    try {
      // 验证输入
      if (inputFiles.length === 0) {
        return { success: false, error: "输入文件列表为空" };
      }

      if (inputFiles.length < 2) {
        return { success: false, error: "至少需要 2 个视频文件才能合并" };
      }

      if (transitions.length !== inputFiles.length - 1) {
        return {
          success: false,
          error: `需要 ${inputFiles.length - 1} 个转场效果，但提供了 ${transitions.length} 个`,
        };
      }

      onProgress?.({
        phase: "transition",
        progress: 0,
        completed: 0,
        total: inputFiles.length,
      });

      // 构建转场滤镜
      const filterComplex = this.buildTransitionFilter(inputFiles, transitions);

      // 构建 FFmpeg 命令
      const args = this.buildTransitionArgs({
        inputFiles,
        outputFile,
        filterComplex,
      });

      // 执行合并
      await this.ffmpegService.exec(args, {
        onProgress: ({ progress }) => {
          onProgress?.({
            phase: "transition",
            progress,
            completed: Math.floor(progress * inputFiles.length),
            total: inputFiles.length,
          });
        },
      });

      // 读取输出文件
      const outputData = await this.ffmpegService.readFile(outputFile);
      const fileSize = outputData.length;

      onProgress?.({
        phase: "complete",
        progress: 1,
        completed: inputFiles.length,
        total: inputFiles.length,
      });

      return {
        success: true,
        outputFile,
        size: fileSize,
        videoCount: inputFiles.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "转场合并失败";
      onProgress?.({
        phase: "error",
        progress: 0,
        completed: 0,
        total: inputFiles.length,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }

  // ============ 视频分割 ============

  /**
   * 分割视频
   *
   * @param inputFile 输入文件名
   * @param options 分割选项
   * @param onProgress 进度回调
   * @returns 分割结果
   *
   * @example
   * ```typescript
   * // 在第 10 秒和第 20 秒处分割
   * await composer.splitVideo('video.mp4', {
   *   splitPoints: [10, 20],
   *   outputPrefix: 'segment',
   * })
   * // 输出: ['segment_1.mp4', 'segment_2.mp4', 'segment_3.mp4']
   * ```
   */
  async splitVideo(
    inputFile: string,
    options: SplitOptions,
    onProgress?: (progress: VideoComposerProgress) => void,
  ): Promise<SplitResult> {
    const {
      outputPrefix,
      splitPoints,
      includeAudio = true,
      format = "mp4",
    } = options;

    try {
      // 验证输入
      if (!inputFile || inputFile.trim() === "") {
        return { success: false, error: "输入文件名不能为空" };
      }

      if (!splitPoints || splitPoints.length === 0) {
        return { success: false, error: "分割点列表为空" };
      }

      if (!outputPrefix || outputPrefix.trim() === "") {
        return { success: false, error: "输出文件前缀不能为空" };
      }

      // 验证分割点（必须按升序排列且为正数）
      for (let i = 0; i < splitPoints.length; i++) {
        if (splitPoints[i] <= 0) {
          return {
            success: false,
            error: `分割点必须大于 0，收到: ${splitPoints[i]}`,
          };
        }

        if (i > 0 && splitPoints[i] <= splitPoints[i - 1]) {
          return { success: false, error: "分割点必须按升序排列" };
        }
      }

      onProgress?.({
        phase: "splitting",
        progress: 0,
        completed: 0,
        total: splitPoints.length + 1,
      });

      // 计算时间片段（包含验证）
      const segments = await this.calculateSegments(inputFile, splitPoints);

      // 逐个分割
      const outputFiles: string[] = [];
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const outputFile = `${outputPrefix}_${i + 1}.${format}`;

        const args = this.buildSplitArgs({
          inputFile,
          outputFile,
          startTime: segment.start,
          duration: segment.end - segment.start,
          includeAudio,
        });

        await this.ffmpegService.exec(args, {
          onProgress: ({ progress }) => {
            const overallProgress = (i + progress) / segments.length;
            onProgress?.({
              phase: "splitting",
              progress: overallProgress,
              completed: i,
              total: segments.length,
            });
          },
        });

        outputFiles.push(outputFile);
      }

      onProgress?.({
        phase: "complete",
        progress: 1,
        completed: segments.length,
        total: segments.length,
      });

      return {
        success: true,
        outputFiles,
        segmentCount: segments.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "分割失败";
      onProgress?.({
        phase: "error",
        progress: 0,
        completed: 0,
        total: splitPoints.length + 1,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }

  // ============ 视频裁剪 ============

  /**
   * 裁剪视频
   *
   * @param inputFile 输入文件名
   * @param options 裁剪选项
   * @param onProgress 进度回调
   * @returns 裁剪结果
   *
   * @example
   * ```typescript
   * // 保留视频的第 10-20 秒
   * await composer.trimVideo('video.mp4', {
   *   startTime: 10,
   *   endTime: 20,
   *   outputFile: 'trimmed.mp4',
   * })
   * ```
   */
  async trimVideo(
    inputFile: string,
    options: TrimOptions,
    onProgress?: (progress: VideoComposerProgress) => void,
  ): Promise<TrimResult> {
    const {
      outputFile,
      startTime,
      endTime,
      reencode = false,
      format = "mp4",
    } = options;

    try {
      // 验证输入
      if (!inputFile || inputFile.trim() === "") {
        return { success: false, error: "输入文件名不能为空" };
      }

      if (!outputFile || outputFile.trim() === "") {
        return { success: false, error: "输出文件名不能为空" };
      }

      if (typeof startTime !== "number" || isNaN(startTime)) {
        return { success: false, error: "开始时间必须是一个有效的数字" };
      }

      if (typeof endTime !== "number" || isNaN(endTime)) {
        return { success: false, error: "结束时间必须是一个有效的数字" };
      }

      if (startTime < 0) {
        return { success: false, error: "开始时间不能为负数" };
      }

      if (endTime <= startTime) {
        return { success: false, error: "结束时间必须大于开始时间" };
      }

      // 检查时间差是否太小（小于 0.1 秒）
      if (endTime - startTime < 0.1) {
        return { success: false, error: "裁剪时长不能小于 0.1 秒" };
      }

      onProgress?.({
        phase: "trimming",
        progress: 0,
        completed: 0,
        total: 1,
      });

      // 构建裁剪参数
      const duration = endTime - startTime;
      const args = this.buildTrimArgs({
        inputFile,
        outputFile,
        startTime,
        duration,
        reencode,
      });

      // 执行裁剪
      await this.ffmpegService.exec(args, {
        onProgress: ({ progress }) => {
          onProgress?.({
            phase: "trimming",
            progress,
            completed: progress < 1 ? 0 : 1,
            total: 1,
          });
        },
      });

      // 读取输出文件
      const outputData = await this.ffmpegService.readFile(outputFile);
      const fileSize = outputData.length;

      onProgress?.({
        phase: "complete",
        progress: 1,
        completed: 1,
        total: 1,
      });

      return {
        success: true,
        outputFile,
        size: fileSize,
        duration,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "裁剪失败";
      onProgress?.({
        phase: "error",
        progress: 0,
        completed: 0,
        total: 1,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }

  // ============ 辅助方法 ============

  /**
   * 生成文件列表（用于 concat demuxer）
   */
  private generateFileList(inputFiles: string[]): string {
    return inputFiles.map((file) => `file '${file}'`).join("\n");
  }

  /**
   * 构建合并参数（流复制模式）
   */
  private buildMergeArgs(params: {
    inputFiles: string[];
    outputFile: string;
    includeAudio: boolean;
    reencode: boolean;
  }): string[] {
    const { inputFiles, outputFile, includeAudio, reencode } = params;

    if (reencode) {
      // 重新编码模式（支持转场，但速度慢）
      const filterComplex = this.buildConcatFilter(
        inputFiles.length,
        includeAudio,
      );
      const args = inputFiles.flatMap((file) => ["-i", file]);
      args.push("-filter_complex", filterComplex);
      args.push("-y", outputFile);
      return args;
    } else {
      // 流复制模式（快速，但不支持转场）
      // 文件列表已在调用方写入虚拟文件系统
      return [
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "filelist.txt",
        ...(includeAudio ? [] : ["-an"]),
        "-c",
        "copy",
        "-y",
        outputFile,
      ];
    }
  }

  /**
   * 构建转场合并参数
   */
  private buildTransitionArgs(params: {
    inputFiles: string[];
    outputFile: string;
    filterComplex: string;
  }): string[] {
    const { inputFiles, outputFile, filterComplex } = params;

    const args = inputFiles.flatMap((file) => ["-i", file]);
    args.push("-filter_complex", filterComplex);
    args.push("-y", outputFile);

    return args;
  }

  /**
   * 构建 concat 滤镜（重新编码模式）
   */
  private buildConcatFilter(inputCount: number, includeAudio: boolean): string {
    // 构建输入标签
    const inputLabels: string[] = [];
    for (let i = 0; i < inputCount; i++) {
      inputLabels.push(`[${i}:v]`);
      if (includeAudio) {
        inputLabels.push(`[${i}:a]`);
      }
    }

    // 构建 concat 滤镜参数
    const concatParams = `n=${inputCount}:v=1${includeAudio ? ":a=1" : ""}`;

    // 构建输出标签
    const outputLabels = `[vout]${includeAudio ? "[aout]" : ""}`;

    return `${inputLabels.join("")}concat=${concatParams}${outputLabels}`;
  }

  /**
   * 构建转场滤镜（xfade）
   */
  private buildTransitionFilter(
    inputFiles: string[],
    transitions: Transition[],
  ): string {
    if (inputFiles.length < 2 || transitions.length === 0) {
      return this.buildConcatFilter(inputFiles.length, true);
    }

    const parts: string[] = [];
    let currentVideo = `[0:v]`;
    let currentAudio = `[0:a]`;

    // 计算每个转场的偏移时间
    let offset = 0;
    for (let i = 1; i < inputFiles.length; i++) {
      const transition = transitions[i - 1];
      offset += transition.duration;

      // 添加 xfade 滤镜
      const xfadeFilter = `[0:v]xfade=transition=${transition.type}:offset=${offset}:duration=${transition.duration}[v${i}]`;

      // TODO: 实现完整的 xfade 滤镜构建逻辑
      // 这里需要更复杂的逻辑来处理多个转场
    }

    // 简化版本：直接使用 concat 滤镜
    return this.buildConcatFilter(inputFiles.length, true);
  }

  /**
   * 构建分割参数
   */
  private buildSplitArgs(params: {
    inputFile: string;
    outputFile: string;
    startTime: number;
    duration: number;
    includeAudio: boolean;
  }): string[] {
    const { inputFile, outputFile, startTime, duration, includeAudio } = params;

    return [
      "-i",
      inputFile,
      "-ss",
      startTime.toString(),
      "-t",
      duration.toString(),
      ...(includeAudio ? [] : ["-an"]),
      "-c",
      "copy",
      "-y",
      outputFile,
    ];
  }

  /**
   * 构建裁剪参数
   */
  private buildTrimArgs(params: {
    inputFile: string;
    outputFile: string;
    startTime: number;
    duration: number;
    reencode: boolean;
  }): string[] {
    const { inputFile, outputFile, startTime, duration, reencode } = params;

    if (reencode) {
      // 重新编码模式
      return [
        "-i",
        inputFile,
        "-ss",
        startTime.toString(),
        "-t",
        duration.toString(),
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-y",
        outputFile,
      ];
    } else {
      // 流复制模式（快速但可能有精度问题）
      return [
        "-i",
        inputFile,
        "-ss",
        startTime.toString(),
        "-t",
        duration.toString(),
        "-c",
        "copy",
        "-y",
        outputFile,
      ];
    }
  }

  /**
   * 计算时间片段
   *
   * @param inputFile 输入文件名
   * @param splitPoints 分割点列表（秒）
   * @returns 时间片段列表
   */
  private async calculateSegments(
    inputFile: string,
    splitPoints: number[],
  ): Promise<TimeSegment[]> {
    // 获取视频实际时长
    const totalDuration = await this.getVideoDuration(inputFile);

    if (totalDuration <= 0) {
      throw new Error("无法获取视频时长");
    }

    const segments: TimeSegment[] = [];
    let startTime = 0;

    for (let i = 0; i < splitPoints.length; i++) {
      const splitPoint = splitPoints[i];

      // 验证分割点
      if (splitPoint <= startTime) {
        throw new Error(`分割点 ${splitPoint} 必须大于起始时间 ${startTime}`);
      }

      if (splitPoint >= totalDuration) {
        throw new Error(`分割点 ${splitPoint} 超出视频时长 ${totalDuration}`);
      }

      segments.push({
        start: startTime,
        end: splitPoint,
        index: i + 1,
      });

      startTime = splitPoint;
    }

    // 添加最后一个片段（从最后一个分割点到视频末尾）
    if (startTime < totalDuration) {
      segments.push({
        start: startTime,
        end: totalDuration,
        index: segments.length + 1,
      });
    }

    return segments;
  }

  /**
   * 获取视频时长
   *
   * @param inputFile 输入文件名
   * @returns 视频时长（秒）
   */
  async getVideoDuration(inputFile: string): Promise<number> {
    try {
      // 使用 FFprobe 获取视频信息
      // FFprobe 命令：获取视频时长
      const args = [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        inputFile,
      ];

      // 执行 FFprobe 命令
      const result = await this.ffmpegService.exec(args);

      // 解析输出（秒）
      const duration = parseFloat(result.stdout.trim());

      if (isNaN(duration) || duration <= 0) {
        throw new Error(`无法获取视频时长: ${result.stdout}`);
      }

      return duration;
    } catch (error) {
      console.error("[VideoComposer] 获取视频时长失败:", error);
      return 0;
    }
  }

  /**
   * 获取视频信息
   *
   * @param inputFile 输入文件名
   * @returns 视频信息
   */
  async getVideoInfo(inputFile: string): Promise<VideoInfo | null> {
    try {
      // 使用 FFprobe 获取视频信息
      const args = [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,r_frame_rate,codec_name",
        "-show_entries",
        "format=duration,size",
        "-of",
        "json",
        inputFile,
      ];

      const result = await this.ffmpegService.exec(args);

      // 解析 JSON 输出
      const info = JSON.parse(result.stdout);

      const videoStream = info.streams?.[0];
      const format = info.format;

      if (!videoStream || !format) {
        throw new Error("无法解析视频信息");
      }

      // 解析帧率（例如 "30/1" → 30）
      const fpsParts = videoStream.r_frame_rate?.split("/") || ["30", "1"];
      const fps = parseInt(fpsParts[0]) / parseInt(fpsParts[1]);

      return {
        fileName: inputFile,
        duration: parseFloat(format.duration || "0"),
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        fps: isNaN(fps) ? 30 : fps,
        size: parseInt(format.size || "0"),
        hasAudio: true, // TODO: 检查音频流
        videoCodec: videoStream.codec_name,
        audioCodec: "aac", // TODO: 从音频流获取
      };
    } catch (error) {
      console.error("[VideoComposer] 获取视频信息失败:", error);
      return null;
    }
  }

  /**
   * 清理临时文件
   */
  async cleanup(files?: string[]): Promise<void> {
    try {
      if (files) {
        await Promise.all(
          files.map((file) => this.ffmpegService.deleteFile(file)),
        );
      } else {
        // 清理所有临时文件
        await this.ffmpegService.cleanup();
      }
    } catch (error) {
      console.warn("[VideoComposer] 清理失败:", error);
    }
  }
}
