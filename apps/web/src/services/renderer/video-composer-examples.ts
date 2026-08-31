/**
 * VideoComposer 使用示例
 *
 * 演示视频合并、转场、分割、裁剪等功能
 */

import { VideoComposer } from "./video-composer";

// ============ 示例目录 ============

/**
 * 1. 基础合并 - 合并两个视频文件
 * 2. 合并多个视频 - 合并 3+ 个视频
 * 3. 带转场的合并 - 添加淡入淡出效果
 * 4. 分割视频 - 按时间点分割
 * 5. 裁剪视频 - 裁剪开始/结束部分
 * 6. 批量分割 - 分割成多个片段
 * 7. 完整工作流 - 合并 + 分割 + 裁剪
 */

// ============ 示例 1: 基础合并 ============

/**
 * 示例 1a: 基础合并（流复制模式）
 *
 * 最简单的视频合并方式，使用流复制模式，速度快
 */
export async function example1a_basicMerge(composer: VideoComposer) {
  const result = await composer.mergeVideos(
    ["intro.mp4", "main.mp4", "outro.mp4"],
    {
      outputFile: "merged.mp4",
      includeAudio: true,
      reencode: false, // 流复制模式（快速）
    },
    (progress) => {
      console.log(`合并进度: ${(progress.progress * 100).toFixed(1)}%`);
    },
  );

  if (result.success) {
    console.log("合并成功:", result.outputFile);
    console.log("文件大小:", (result.size! / 1024 / 1024).toFixed(2), "MB");
  } else {
    console.error("合并失败:", result.error);
  }

  return result;
}

/**
 * 示例 1b: 基础合并（重新编码模式）
 *
 * 重新编码模式，速度慢但更兼容
 */
export async function example1b_basicMergeReencode(composer: VideoComposer) {
  const result = await composer.mergeVideos(
    ["video1.mp4", "video2.mp4"],
    {
      outputFile: "merged-reencode.mp4",
      includeAudio: true,
      reencode: true, // 重新编码模式
    },
    (progress) => {
      console.log(`合并进度: ${(progress.progress * 100).toFixed(1)}%`);
    },
  );

  return result;
}

// ============ 示例 2: 合并多个视频 ============

/**
 * 示例 2: 合并多个视频文件
 *
 * 演示如何合并 5 个视频片段
 */
export async function example2_mergeMultiple(composer: VideoComposer) {
  const videoFiles = [
    "scene1.mp4",
    "scene2.mp4",
    "scene3.mp4",
    "scene4.mp4",
    "scene5.mp4",
  ];

  const result = await composer.mergeVideos(videoFiles, {
    outputFile: "full-video.mp4",
    includeAudio: true,
    reencode: false,
  });

  if (result.success) {
    console.log(`成功合并 ${result.videoCount} 个视频`);
  }

  return result;
}

// ============ 示例 3: 带转场的合并 ============

/**
 * 示例 3a: 淡入淡出转场
 *
 * 在视频片段之间添加淡入淡出效果
 */
export async function example3a_fadeTransition(composer: VideoComposer) {
  const result = await composer.concatWithTransitions(
    ["part1.mp4", "part2.mp4", "part3.mp4"],
    {
      outputFile: "merged-with-fade.mp4",
      includeAudio: true,
      transitions: [
        { type: "fade", duration: 1.0 }, // 第一个转场：1 秒淡入淡出
        { type: "fade", duration: 1.0 }, // 第二个转场：1 秒淡入淡出
      ],
    },
    (progress) => {
      console.log(`转场合并进度: ${(progress.progress * 100).toFixed(1)}%`);
    },
  );

  return result;
}

/**
 * 示例 3b: 混合转场效果
 *
 * 组合不同的转场效果
 */
export async function example3b_mixedTransitions(composer: VideoComposer) {
  const result = await composer.concatWithTransitions(
    ["intro.mp4", "main.mp4", "outro.mp4"],
    {
      outputFile: "merged-mixed-transitions.mp4",
      includeAudio: true,
      transitions: [
        { type: "fade", duration: 0.8 }, // 淡入淡出
        { type: "slide", duration: 1.0 }, // 滑动
      ],
    },
  );

  return result;
}

/**
 * 示例 3c: 自定义转场时长
 *
 * 演示不同的转场时长效果
 */
export async function example3c_customTransitionDuration(
  composer: VideoComposer,
) {
  // 快速转场（0.5 秒）
  const quickFade = await composer.concatWithTransitions(
    ["video1.mp4", "video2.mp4"],
    {
      outputFile: "quick-transition.mp4",
      transitions: [{ type: "fade", duration: 0.5 }],
    },
  );

  // 慢速转场（2 秒）
  const slowFade = await composer.concatWithTransitions(
    ["video1.mp4", "video2.mp4"],
    {
      outputFile: "slow-transition.mp4",
      transitions: [{ type: "fade", duration: 2.0 }],
    },
  );

  return { quickFade, slowFade };
}

// ============ 示例 4: 视频分割 ============

/**
 * 示例 4a: 基础分割
 *
 * 将视频分割成多个片段
 */
export async function example4a_basicSplit(composer: VideoComposer) {
  // 在第 10 秒和第 20 秒处分割
  const result = await composer.splitVideo(
    "video.mp4",
    {
      splitPoints: [10, 20],
      outputPrefix: "segment",
      format: "mp4",
    },
    (progress) => {
      console.log(`分割进度: ${(progress.progress * 100).toFixed(1)}%`);
    },
  );

  if (result.success) {
    console.log("分割完成，生成文件:");
    result.outputFiles?.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
  }

  return result;
}

/**
 * 示例 4b: 精确分割
 *
 * 按精确的时间点分割
 */
export async function example4b_preciseSplit(composer: VideoComposer) {
  // 每隔 30 秒分割一次
  const splitPoints = [];
  for (let i = 30; i < 300; i += 30) {
    splitPoints.push(i);
  }

  const result = await composer.splitVideo("long-video.mp4", {
    splitPoints,
    outputPrefix: "clip",
    format: "mp4",
  });

  return result;
}

// ============ 示例 5: 视频裁剪 ============

/**
 * 示例 5a: 裁剪视频开始部分
 *
 * 移除视频开头的片头
 */
export async function example5a_trimStart(composer: VideoComposer) {
  const result = await composer.trimVideo(
    "video-with-intro.mp4",
    {
      startTime: 5, // 从第 5 秒开始
      endTime: 65, // 到第 65 秒结束
      outputFile: "trimmed-start.mp4",
      reencode: false,
    },
    (progress) => {
      console.log(`裁剪进度: ${(progress.progress * 100).toFixed(1)}%`);
    },
  );

  return result;
}

/**
 * 示例 5b: 裁剪视频结束部分
 *
 * 移除视频结尾的片尾
 */
export async function example5b_trimEnd(composer: VideoComposer) {
  const result = await composer.trimVideo("video-with-outro.mp4", {
    startTime: 0, // 从开头开始
    endTime: 120, // 到第 120 秒结束（移除最后 10 秒）
    outputFile: "trimmed-end.mp4",
    reencode: false,
  });

  return result;
}

/**
 * 示例 5c: 提取视频片段
 *
 * 提取视频中间的一部分
 */
export async function example5c_extractSegment(composer: VideoComposer) {
  const result = await composer.trimVideo("full-video.mp4", {
    startTime: 30, // 从第 30 秒开始
    endTime: 90, // 到第 90 秒结束（提取 1 分钟片段）
    outputFile: "extracted-segment.mp4",
    reencode: true, // 重新编码以确保精度
  });

  if (result.success) {
    console.log("提取片段时长:", result.duration, "秒");
  }

  return result;
}

// ============ 示例 6: 批量处理 ============

/**
 * 示例 6: 批量分割多个视频
 *
 * 批量处理多个视频文件
 */
export async function example6_batchSplit(composer: VideoComposer) {
  const videos = ["video1.mp4", "video2.mp4", "video3.mp4"];
  const results: any[] = [];

  for (const video of videos) {
    console.log(`处理: ${video}`);

    const result = await composer.splitVideo(video, {
      splitPoints: [30, 60], // 在第 30 秒和第 60 秒处分割
      outputPrefix: video.replace(".mp4", ""),
    });

    results.push({ video, result });

    if (result.success) {
      console.log(`  ✓ 生成 ${result.outputFiles?.length} 个片段`);
    } else {
      console.error(`  ✗ 失败:`, result.error);
    }
  }

  return results;
}

// ============ 示例 7: 完整工作流 ============

/**
 * 示例 7: 完整工作流
 *
 * 演示合并 → 分割 → 裁剪的完整流程
 */
export async function example7_completeWorkflow(composer: VideoComposer) {
  console.log("=== 开始完整工作流 ===");

  // 步骤 1: 合并 3 个视频
  console.log("\n步骤 1: 合并视频...");
  const mergeResult = await composer.mergeVideos(
    ["part1.mp4", "part2.mp4", "part3.mp4"],
    {
      outputFile: "merged.mp4",
      includeAudio: true,
      reencode: false,
    },
  );

  if (!mergeResult.success) {
    console.error("合并失败:", mergeResult.error);
    return;
  }

  console.log("✓ 合并完成");

  // 步骤 2: 分割合并后的视频
  console.log("\n步骤 2: 分割视频...");
  const splitResult = await composer.splitVideo("merged.mp4", {
    splitPoints: [60, 120], // 在第 60 秒和第 120 秒处分割
    outputPrefix: "final",
  });

  if (!splitResult.success) {
    console.error("分割失败:", splitResult.error);
    return;
  }

  console.log("✓ 分割完成，生成", splitResult.outputFiles?.length, "个片段");

  // 步骤 3: 裁剪第一个片段（移除开头 5 秒）
  console.log("\n步骤 3: 裁剪片段...");
  const trimResult = await composer.trimVideo("final_1.mp4", {
    startTime: 5,
    endTime: 55,
    outputFile: "final_1_trimmed.mp4",
    reencode: false,
  });

  if (!trimResult.success) {
    console.error("裁剪失败:", trimResult.error);
    return;
  }

  console.log("✓ 裁剪完成");

  // 步骤 4: 清理临时文件
  console.log("\n步骤 4: 清理临时文件...");
  await composer.cleanup([
    "merged.mp4",
    "final_1.mp4",
    "final_2.mp4",
    "final_3.mp4",
  ]);
  console.log("✓ 清理完成");

  console.log("\n=== 工作流完成 ===");

  return {
    mergeResult,
    splitResult,
    trimResult,
  };
}

// ============ 示例 8: 视频信息查询 ============

/**
 * 示例 8: 获取视频信息
 *
 * 查询视频的详细信息
 */
export async function example8_getVideoInfo(composer: VideoComposer) {
  const videoFiles = ["video1.mp4", "video2.mp4", "video3.mp4"];

  for (const file of videoFiles) {
    const info = await composer.getVideoInfo(file);

    if (info) {
      console.log(`\n${file}:`);
      console.log(`  时长: ${info.duration.toFixed(2)} 秒`);
      console.log(`  分辨率: ${info.width}x${info.height}`);
      console.log(`  帧率: ${info.fps.toFixed(2)} fps`);
      console.log(`  文件大小: ${(info.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  视频编码: ${info.videoCodec}`);
      console.log(`  音频编码: ${info.audioCodec}`);
    } else {
      console.error(`无法获取视频信息: ${file}`);
    }
  }
}

// ============ 示例 9: 错误处理 ============

/**
 * 示例 9: 错误处理
 *
 * 演示如何处理各种错误情况
 */
export async function example9_errorHandling(composer: VideoComposer) {
  // 1. 空文件列表
  const result1 = await composer.mergeVideos([], {
    outputFile: "output.mp4",
  });

  if (!result1.success) {
    console.log("✓ 正确处理空文件列表:", result1.error);
  }

  // 2. 单个文件
  const result2 = await composer.mergeVideos(["single.mp4"], {
    outputFile: "output.mp4",
  });

  if (!result2.success) {
    console.log("✓ 正确处理单个文件:", result2.error);
  }

  // 3. 无效的分割点
  const result3 = await composer.splitVideo("video.mp4", {
    splitPoints: [-10, 20], // 负数分割点
    outputPrefix: "output",
  });

  if (!result3.success) {
    console.log("✓ 正确处理负数分割点:", result3.error);
  }

  // 4. 无效的裁剪时间
  const result4 = await composer.trimVideo("video.mp4", {
    startTime: 20,
    endTime: 10, // 结束时间小于开始时间
    outputFile: "output.mp4",
  });

  if (!result4.success) {
    console.log("✓ 正确处理无效裁剪时间:", result4.error);
  }
}

// ============ 示例 10: 高级用法 ============

/**
 * 示例 10: 高级用法
 *
 * 组合多个功能创建复杂的视频编辑工作流
 */
export async function example10_advancedWorkflow(composer: VideoComposer) {
  console.log("=== 高级工作流 ===");

  // 步骤 1: 获取视频信息
  const videoInfo = await composer.getVideoInfo("source.mp4");

  if (!videoInfo) {
    console.error("无法获取视频信息");
    return;
  }

  console.log(`视频时长: ${videoInfo.duration} 秒`);

  // 步骤 2: 计算分割点（每 30 秒一个片段）
  const splitPoints: number[] = [];
  for (let t = 30; t < videoInfo.duration; t += 30) {
    splitPoints.push(t);
  }

  console.log(`分割点:`, splitPoints);

  // 步骤 3: 分割视频
  const splitResult = await composer.splitVideo("source.mp4", {
    splitPoints,
    outputPrefix: "segment",
  });

  if (!splitResult.success) {
    console.error("分割失败:", splitResult.error);
    return;
  }

  // 步骤 4: 为每个片段添加转场效果
  if (splitResult.outputFiles && splitResult.outputFiles.length >= 2) {
    const mergedResult = await composer.concatWithTransitions(
      splitResult.outputFiles,
      {
        outputFile: "final-with-transitions.mp4",
        includeAudio: true,
        transitions: splitResult.outputFiles.slice(1).map(() => ({
          type: "fade",
          duration: 0.8,
        })),
      },
    );

    if (mergedResult.success) {
      console.log("✓ 最终视频生成成功");
    }
  }

  // 步骤 5: 清理临时文件
  await composer.cleanup();

  console.log("=== 工作流完成 ===");
}
