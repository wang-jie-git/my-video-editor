# CanvasRenderer.render() 实现状态 ✅

**日期**: 2026-08-31
**状态**: ✅ 已完整实现

---

## 📋 实现概览

`CanvasRenderer.render()` 方法已经在 `canvas-renderer.ts` 中完整实现，包括所有必要的节点渲染逻辑。

---

## 🔍 核心实现

### 1. **CanvasRenderer.render()** (`canvas-renderer.ts:74-77`)

```typescript
async render({ node, time }: { node: BaseNode; time: number }) {
    this.clear();  // 清除画布为黑色
    await node.render({ renderer: this, time });  // 委托给节点树
}
```

**功能**:
- ✅ 清除画布（黑色背景）
- ✅ 委托给 BaseNode 渲染树

---

### 2. **BaseNode.render()** (`nodes/base-node.ts:24-34`)

```typescript
async render({ renderer, time }: { renderer: CanvasRenderer; time: number }): Promise<void> {
    for (const child of this.children) {
        await child.render({ renderer, time });
    }
}
```

**功能**:
- ✅ 递归遍历所有子节点
- ✅ 按顺序渲染（从底到顶）

---

### 3. **具体节点渲染实现**

所有节点类型都已实现 `render()` 方法：

| 节点类型 | 文件 | 渲染逻辑 |
|---------|------|---------|
| **RootNode** | `root-node.ts` | 继承 BaseNode（仅容器） |
| **VideoNode** | `video-node.ts` | 从 videoCache 获取帧 → renderVisual() |
| **ImageNode** | `image-node.ts` | 加载 HTMLImageElement → renderVisual() |
| **TextNode** | `text-node.ts` | Canvas fillText/wrapText |
| **StickerNode** | `sticker-node.ts` | 图片 + 变换渲染 |
| **ColorNode** | `color-node.ts` | fillRect 纯色背景 |
| **TransitionNode** | `transition-node.ts` | 转场效果（淡入淡出等） |
| **BlurBackgroundNode** | `blur-background-node.ts` | 模糊背景处理 |

---

### 4. **VisualNode.renderVisual()** (`nodes/visual-node.ts:44-91`)

核心视觉渲染方法，处理所有变换：

```typescript
protected renderVisual({
    renderer,
    source,
    sourceWidth,
    sourceHeight,
}: {
    renderer: CanvasRenderer;
    source: CanvasImageSource;
    sourceWidth: number;
    sourceHeight: number;
}): void {
    renderer.context.save();

    // 1. 计算缩放（contain 模式）
    const containScale = Math.min(
        (fitCanvasSize?.width ?? renderer.width) / sourceWidth,
        (fitCanvasSize?.height ?? renderer.height) / sourceHeight,
    );
    const scaledWidth = sourceWidth * containScale * transform.scale;
    const scaledHeight = sourceHeight * containScale * transform.scale;

    // 2. 计算位置（居中 + transform）
    const x = renderer.width / 2 + transform.position.x - scaledWidth / 2;
    const y = renderer.height / 2 + transform.position.y - scaledHeight / 2;

    // 3. 设置透明度
    renderer.context.globalAlpha = opacity;

    // 4. 处理旋转和翻转
    if (needsRotate || needsFlip) {
        renderer.context.translate(centerX, centerY);
        if (needsRotate) renderer.context.rotate(...);
        if (needsFlip) renderer.context.scale(...);
        renderer.context.translate(-centerX, -centerY);
    }

    // 5. 绘制图像
    renderer.context.drawImage(source, x, y, scaledWidth, scaledHeight);

    renderer.context.restore();
}
```

**支持的变换**:
- ✅ 位置（position.x, position.y）
- ✅ 缩放（scale）
- ✅ 旋转（rotate，角度制）
- ✅ 水平翻转（flipX）
- ✅ 垂直翻转（flipY）
- ✅ 透明度（opacity）
- ✅ Contain 适配（fitCanvasSize）

---

## 🎯 渲染流程

```
FFmpegExporter.renderFramesToImages()
    ↓
CanvasRenderer.render({ node: rootNode, time: t })
    ↓
BaseNode.render() - 递归遍历子节点
    ↓
┌──────────────┬──────────────┬──────────────┐
│  VideoNode   │   TextNode   │  ImageNode   │ ...
└──────────────┴──────────────┴──────────────┘
    ↓
VisualNode.renderVisual() - 应用变换
    ↓
CanvasRenderingContext2D.drawImage()
```

---

## ✅ 功能清单

### 基础功能
- [x] 画布清除（黑色背景）
- [x] 递归渲染树形结构
- [x] 时间轴定位

### 视觉元素
- [x] 视频帧渲染（VideoNode → videoCache）
- [x] 图片渲染（ImageNode → HTMLImageElement）
- [x] 文本渲染（TextNode → fillText）
- [x] 纯色背景（ColorNode → fillRect）
- [x] 贴纸渲染（StickerNode）
- [x] 转场效果（TransitionNode）

### 变换支持
- [x] 位置偏移（position.x/y）
- [x] 缩放（scale）
- [x] 旋转（rotate）
- [x] 翻转（flipX/flipY）
- [x] 透明度（opacity）
- [x] Contain 适配（fitCanvasSize）

### 时间控制
- [x] trimStart（裁剪开始）
- [x] trimEnd（裁剪结束）
- [x] timeOffset（时间偏移）
- [x] playbackRate（播放速度）
- [x] reversed（倒放）

---

## 🧪 验证

### 类型检查
```bash
npx tsc --noEmit  # ✅ 通过，无错误
```

### Biome Lint
```bash
bun run lint:web  # ✅ 通过
```

---

## 📝 使用示例

```typescript
// 创建渲染器
const renderer = new CanvasRenderer({
    width: 1920,
    height: 1080,
    fps: 30,
});

// 构建场景树
const rootNode = buildScene({
    tracks,
    mediaAssets,
    duration,
    canvasSize,
    fitCanvasSize: canvasSize,
    background: { type: 'color', color: '#000000' },
});

// 渲染某一帧
await renderer.render({
    node: rootNode,
    time: 2.5,  // 第 2.5 秒
});

// 导出为图片
const blob = await renderer.canvas.convertToBlob({ type: 'image/png' });
```

---

## 🚀 用于 FFmpegExporter

在 `ffmpeg-exporter.ts` 中的使用：

```typescript
private async renderFramesToImages(params: {
    rootNode: any;
    fps: number;
    canvasSize: TCanvasSize;
    onProgress: (progress: number) => void;
}): Promise<string[]> {
    const { rootNode, fps, canvasSize } = params;
    const frameCount = Math.ceil(rootNode.duration * fps);

    // 创建渲染器
    const renderer = new CanvasRenderer({
        width: canvasSize.width,
        height: canvasSize.height,
        fps,
    });

    for (let i = 0; i < frameCount; i++) {
        const time = i / fps;

        // 渲染帧
        await renderer.render({ node: rootNode, time });

        // 导出为 PNG
        const blob = await renderer.canvas.convertToBlob({ type: 'image/png' });
        // ... 写入 FFmpeg 虚拟文件系统
    }
}
```

---

## 🎉 总结

**CanvasRenderer.render() 已完整实现，可以立即用于 FFmpegExporter！**

- ✅ 所有节点类型都有 render() 实现
- ✅ 支持完整的变换系统
- ✅ 时间轴控制完备
- ✅ 类型检查通过
- ✅ 可直接用于 Phase 2 视频导出

**下一步**:
1. 测试完整导出流程（帧 → PNG → 视频）
2. 验证与 Mediabunny 的输出一致性
3. 性能优化（并行渲染、内存管理）
