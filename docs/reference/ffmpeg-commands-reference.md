# FFmpeg 命令参考 - VideoComposer

**版本**: 1.0.0  
**更新日期**: 2026-08-31

本文档提供 VideoComposer 内部使用的 FFmpeg 命令参考，适合需要手动执行类似操作或调试的用户。

---

## 目录

1. [视频合并](#视频合并)
2. [转场效果](#转场效果)
3. [视频分割](#视频分割)
4. [视频裁剪](#视频裁剪)
5. [视频信息查询](#视频信息查询)
6. [常用参数说明](#常用参数说明)

---

## 视频合并

### 流复制模式（快速）

**适用场景**: 视频格式一致，不需要转场效果

```bash
# 步骤 1: 创建文件列表
echo "file 'video1.mp4'" > filelist.txt
echo "file 'video2.mp4'" >> filelist.txt
echo "file 'video3.mp4'" >> filelist.txt

# 步骤 2: 合并视频
ffmpeg -f concat -safe 0 -i filelist.txt -c copy -y output.mp4
```

**参数说明**:
- `-f concat`: 使用 concat 解复用器
- `-safe 0`: 允许不安全的文件路径
- `-i filelist.txt`: 输入文件列表
- `-c copy`: 流复制（不重新编码）
- `-y`: 覆盖输出文件（如果存在）

**优点**:
- ✅ 速度极快（几乎瞬间完成）
- ✅ 无质量损失
- ✅ 不占用大量 CPU/内存

**缺点**:
- ❌ 不支持转场效果
- ❌ 要求所有视频编码格式相同

### 重新编码模式

**适用场景**: 需要转场效果或视频格式不一致

```bash
ffmpeg -i video1.mp4 -i video2.mp4 \
  -filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[vout][aout]" \
  -map "[vout]" -map "[aout]" \
  -y output.mp4
```

**参数说明**:
- `-filter_complex`: 复杂的滤镜图
- `[0:v][0:a][1:v][1:a]`: 选择两个输入的视频和音频流
- `concat=n=2:v=1:a=1`: 合并 2 个输入，1 个视频流，1 个音频流
- `[vout][aout]`: 输出标签
- `-map`: 选择输出流

**优点**:
- ✅ 支持转场效果
- ✅ 兼容不同格式的视频
- ✅ 可以重新编码为指定格式

**缺点**:
- ❌ 速度较慢
- ❌ 可能会有质量损失（取决于编码设置）

---

## 转场效果

### 淡入淡出（Fade）

```bash
ffmpeg -i video1.mp4 -i video2.mp4 \
  -filter_complex \
  "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[xfade=transition=fade:offset=5:duration=1][ain]" \
  -map "[xfade]" -map "[ain]" \
  -y output.mp4
```

**参数说明**:
- `xfade=transition=fade`: 淡入淡出转场
- `offset=5`: 转场开始时间（第 5 秒）
- `duration=1`: 转场持续时间（1 秒）

### 滑动（Slide）

```bash
ffmpeg -i video1.mp4 -i video2.mp4 \
  -filter_complex \
  "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[xfade=transition=slide:offset=5:duration=1][ain]" \
  -map "[xfade]" -map "[ain]" \
  -y output.mp4
```

### 擦除（Wipe）

```bash
ffmpeg -i video1.mp4 -i video2.mp4 \
  -filter_complex \
  "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[xfade=transition=wipe:offset=5:duration=1][ain]" \
  -map "[xfade]" -map "[ain]" \
  -y output.mp4
```

### 溶解（Dissolve）

```bash
ffmpeg -i video1.mp4 -i video2.mp4 \
  -filter_complex \
  "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[xfade=transition=dissolve:offset=5:duration=1][ain]" \
  -map "[xfade]" -map "[ain]" \
  -y output.mp4
```

### 多个转场效果

```bash
ffmpeg -i video1.mp4 -i video2.mp4 -i video3.mp4 \
  -filter_complex \
  "[0:v][0:a][1:v][1:a]concat=n=3:v=1:a=1[xfade0=transition=fade:offset=5:duration=1][ain0];
   [xfade0][2:v][2:a]concat=n=2:v=1:a=1[xfade1=transition=slide:offset=15:duration=1][ain1]" \
  -map "[xfade1]" -map "[ain1]" \
  -y output.mp4
```

---

## 视频分割

### 基础分割

**分割成 3 个片段**（在第 10 秒和第 20 秒处分割）：

```bash
# 第 1 个片段（0-10 秒）
ffmpeg -i input.mp4 -ss 0 -t 10 -c copy -y segment_1.mp4

# 第 2 个片段（10-20 秒）
ffmpeg -i input.mp4 -ss 10 -t 10 -c copy -y segment_2.mp4

# 第 3 个片段（20 秒到结尾）
ffmpeg -i input.mp4 -ss 20 -c copy -y segment_3.mp4
```

**参数说明**:
- `-ss 0`: 开始时间（秒）
- `-t 10`: 持续时间（秒），省略表示到文件末尾
- `-c copy`: 流复制

### 精确分割（重新编码）

如果需要更精确的分割，使用重新编码：

```bash
# 第 1 个片段
ffmpeg -i input.mp4 -ss 0 -t 10 -c:v libx264 -c:a aac -y segment_1.mp4

# 第 2 个片段
ffmpeg -i input.mp4 -ss 10 -t 10 -c:v libx264 -c:a aac -y segment_2.mp4

# 第 3 个片段
ffmpeg -i input.mp4 -ss 20 -c:v libx264 -c:a aac -y segment_3.mp4
```

### 自动分割脚本

```bash
#!/bin/bash

# 配置
INPUT="video.mp4"
PREFIX="segment"
INTERVAL=30  # 每隔 30 秒

# 获取视频时长
DURATION=$(ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 "$INPUT")

echo "视频时长: $DURATION 秒"

# 计算分割点
SPLIT_POINTS=()
for ((t=INTERVAL; t<DURATION; t+=INTERVAL)); do
  SPLIT_POINTS+=($t)
done

echo "分割点: ${SPLIT_POINTS[*]}"

# 执行分割
START=0
INDEX=1
for POINT in "${SPLIT_POINTS[@]}"; do
  DUR=$((POINT - START))
  echo "生成 ${PREFIX}_${INDEX}.mp4 (${START}s - ${POINT}s)"
  ffmpeg -i "$INPUT" -ss $START -t $DUR -c copy -y "${PREFIX}_${INDEX}.mp4"
  START=$POINT
  INDEX=$((INDEX + 1))
done

# 最后一个片段
echo "生成 ${PREFIX}_${INDEX}.mp4 (${START}s - ${DURATION}s)"
ffmpeg -i "$INPUT" -ss $START -c copy -y "${PREFIX}_${INDEX}.mp4"
```

---

## 视频裁剪

### 裁剪开始部分

移除视频开头：

```bash
ffmpeg -i input.mp4 -ss 5 -t 60 -c copy -y output.mp4
```

**解释**: 从第 5 秒开始，保留 60 秒

### 裁剪结束部分

移除视频结尾：

```bash
ffmpeg -i input.mp4 -t 120 -c copy -y output.mp4
```

**解释**: 只保留前 120 秒

### 提取中间片段

```bash
ffmpeg -i input.mp4 -ss 30 -t 60 -c copy -y output.mp4
```

**解释**: 从第 30 秒开始，保留 60 秒（到第 90 秒）

### 精确裁剪（重新编码）

如果需要精确到帧：

```bash
ffmpeg -i input.mp4 -ss 00:00:05.123 -t 00:01:00.456 \
  -c:v libx264 -crf 18 -c:a aac -b:a 192k \
  -y output.mp4
```

**参数说明**:
- `-ss 00:00:05.123`: 精确到毫秒的开始时间
- `-crf 18`: 质量控制（18-28 是常用范围，越小质量越好）
- `-b:a 192k`: 音频比特率

---

## 视频信息查询

### 获取视频时长

```bash
ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 video.mp4
```

**输出**: `120.5`（秒）

### 获取视频详细信息

```bash
ffprobe -v error \
  -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate,codec_name \
  -show_entries format=duration,size,bit_rate \
  -of json video.mp4
```

**输出示例**:
```json
{
  "streams": [
    {
      "width": 1920,
      "height": 1080,
      "r_frame_rate": "30/1",
      "codec_name": "h264"
    }
  ],
  "format": {
    "duration": "120.5",
    "size": "104857600",
    "bit_rate": "6980000"
  }
}
```

### 获取音频信息

```bash
ffprobe -v error \
  -select_streams a:0 \
  -show_entries stream=codec_name,sample_rate,channels \
  -of json video.mp4
```

---

## 常用参数说明

### 通用参数

| 参数 | 描述 | 示例 |
|------|------|------|
| `-i` | 输入文件 | `-i input.mp4` |
| `-y` | 覆盖输出文件 | `-y output.mp4` |
| `-ss` | 开始时间（秒或 hh:mm:ss） | `-ss 30` 或 `-ss 00:00:30` |
| `-t` | 持续时间（秒） | `-t 60` |
| `-to` | 结束时间（秒） | `-to 120` |
| `-c:v` | 视频编码器 | `-c:v libx264` |
| `-c:a` | 音频编码器 | `-c:a aac` |
| `-c copy` | 流复制（不重新编码） | `-c copy` |

### 编码参数

#### H.264（MP4）

```bash
# 高质量
-c:v libx264 -crf 18 -preset slow

# 平衡质量/速度
-c:v libx264 -crf 23 -preset medium

# 快速编码
-c:v libx264 -crf 28 -preset fast
```

**CRF 说明**:
- 18-20: 视觉无损（大文件）
- 21-23: 高质量（推荐）
- 24-26: 中等质量
- 27-28: 低质量（小文件）

#### VP9（WebM）

```bash
# 高质量
-c:v libvpx-vp9 -crf 30 -b:v 0

# WebM 音频
-c:a libopus -b:a 128k
```

### 滤镜参数

#### xfade 转场

```bash
xfade=transition=<type>:offset=<seconds>:duration=<seconds>
```

**可用类型**:
- `fade` - 淡入淡出
- `slide` - 滑动
- `wipe` - 擦除
- `dissolve` - 溶解
- `pixelize` - 像素化
- `distance` - 距离
- `circleopen` - 圆圈打开
- `circleclose` - 圆圈关闭

**示例**:
```bash
xfade=transition=fade:offset=5:duration=1
xfade=transition=slide:offset=10:duration=0.5
xfade=transition=wipe:offset=15:duration=2
```

---

## 实用脚本

### 批量处理视频

```bash
#!/bin/bash

# 批量合并视频
for i in {1..10}; do
  INPUT="video_${i}.mp4"
  OUTPUT="batch/merged_${i}.mp4"

  ffmpeg -i "$INPUT" -c copy -y "$OUTPUT"
done
```

### 视频格式转换

```bash
# MP4 转 WebM
ffmpeg -i input.mp4 -c:v libvpx-vp9 -c:a libopus -y output.webm

# WebM 转 MP4
ffmpeg -i input.webm -c:v libx264 -c:a aac -y output.mp4
```

### 提取音频

```bash
# 从视频提取音频
ffmpeg -i video.mp4 -vn -c:a libmp3lame -q:a 2 -y audio.mp3

# 指定比特率
ffmpeg -i video.mp4 -vn -c:a aac -b:a 192k -y audio.m4a
```

---

## 故障排除

### 问题：编码速度慢

**解决方案**: 降低质量或使用更快的编码预设

```bash
# 使用快速编码预设
ffmpeg -i input.mp4 -c:v libx264 -preset veryfast -y output.mp4
```

### 问题：输出文件很大

**解决方案**: 提高 CRF 值或降低比特率

```bash
# 提高 CRF（降低质量）
-c:v libx264 -crf 28

# 或指定比特率
-c:v libx264 -b:v 1M
```

### 问题：音频不同步

**解决方案**: 使用 `-async 1` 参数

```bash
ffmpeg -i input.mp4 -async 1 -c copy -y output.mp4
```

---

## 参考资源

- **FFmpeg 官方文档**: https://ffmpeg.org/documentation.html
- **FFmpeg Wiki**: https://trac.ffmpeg.org/wiki
- **xfade 滤镜**: https://ffmpeg.org/ffmpeg-filters.html#xfade
- **concat 滤镜**: https://ffmpeg.org/ffmpeg-filters.html#concat

---

**版本**: 1.0.0  
**更新日期**: 2026-08-31  
**维护**: Cutia 开发团队
