# FFmpeg AI 工具端到端测试

本目录包含 FFmpeg AI 工具的端到端测试套件。

## 测试文件

### 1. `e2e-tools.test.ts` - 结构完整性测试
**类型**: 静态代码分析测试
**运行方式**: `bun test e2e-tools.test.ts`

**测试内容**:
- ✅ 文件完整性验证（所有 7 个工具文件存在）
- ✅ 工具 Schema 验证（name, description, parameters, execute）
- ✅ 错误处理验证（try-catch、EditorCore 检查、绝对路径验证）
- ✅ 工具数量统计（29 个工具）
- ✅ 代码质量验证（TypeScript 类型、多语言描述）
- ✅ 参数验证一致性（路径类型、范围验证、枚举定义）

**测试结果**: 26 测试全部通过 ✅

### 2. `e2e-test.html` - 浏览器交互测试
**类型**: 手动浏览器测试
**运行方式**: 在浏览器中打开该 HTML 文件

**功能**:
- 📊 实时统计（总测试数、通过数、失败数、完成度）
- 🎯 按 Phase 测试（Phase 1-7 独立测试）
- 🚀 一键运行所有测试
- 📝 实时日志输出
- 🎨 可视化测试结果

**注意事项**:
- 由于 ES 模块安全限制，需要 HTTP 服务器运行
- 实际 FFmpeg 执行需要在真实浏览器环境测试

### 3. `e2e-test.node.js` - Node.js 运行时测试
**类型**: 动态执行测试（已废弃，被 e2e-tools.test.ts 替代）
**状态**: ⚠️ 仅供参考，不推荐使用

## 运行测试

### 运行结构完整性测试（推荐）

```bash
cd apps/web
bun test src/lib/ai/agent/tools/__tests__/e2e-tools.test.ts
```

**预期结果**: 26 测试全部通过

### 运行浏览器测试（可选）

```bash
cd apps/web
# 启动开发服务器
bun run dev:web

# 在浏览器访问
open http://localhost:4100/src/lib/ai/agent/tools/__tests__/e2e-test.html
```

### 运行所有 AI 工具测试

```bash
# 结构验证测试
bun test src/lib/ai/agent/tools/__tests__/ffmpeg-tools-*.test.ts

# 端到端测试
bun test src/lib/ai/agent/tools/__tests__/e2e-tools.test.ts
```

## 测试覆盖范围

### Phase 1: FFmpeg 基础工具（3 个）
- ✅ `execute_ffmpeg_command`
- ✅ `get_ffmpeg_status`
- ✅ `check_file_exists`

### Phase 2: 视频导出工具（4 个）
- ✅ `export_video`
- ✅ `get_video_info`
- ✅ `get_video_duration`
- ✅ `generate_thumbnail`

### Phase 3: 格式转换工具（2 个）
- ✅ `convert_video_format`
- ✅ `batch_convert_format`

### Phase 4: 视频滤镜工具（7 个）
- ✅ `apply_color_correction`
- ✅ `apply_blur`
- ✅ `apply_sharpen`
- ✅ `apply_lut`
- ✅ `apply_filter_chain`
- ✅ `adjust_video_speed`
- ✅ `reverse_video`

### Phase 5: 字幕工具（4 个）
- ✅ `parse_subtitles`
- ✅ `burn_subtitles`
- ✅ `add_subtitle_track`
- ✅ `translate_subtitles`

### Phase 6: 音频处理工具（5 个）
- ✅ `apply_equalizer`
- ✅ `apply_compressor`
- ✅ `apply_reverb`
- ✅ `apply_audio_effects_chain`
- ✅ `normalize_audio`

### Phase 7: 视频合并/分割工具（4 个）
- ✅ `merge_videos`
- ✅ `concat_with_transitions`
- ✅ `split_video`
- ✅ `trim_video`

**总计**: 29 个工具 ✅

## 测试结果

### 最新测试结果（2026-08-31）

```
✅ 26 测试通过
❌ 0 测试失败
📊 75 个断言
⏱️ 37ms 执行时间
```

### 测试历史

- **2026-08-31**: 初始版本，26 测试全部通过

## 已知限制

1. **浏览器端执行**: Node.js 环境无法模拟真实的 EditorCore 和 FFmpegService
2. **实际 FFmpeg 命令**: 需要在真实的浏览器环境（支持 SharedArrayBuffer）中测试
3. **进度回调**: 浏览器环境的进度回调需要特殊处理
4. **文件系统**: Node.js 的虚拟文件系统与浏览器的 IndexedDB 不同

## 下一步

### 短期
- [ ] 在真实浏览器环境运行完整测试
- [ ] 测试进度回调
- [ ] 测试大文件处理

### 长期
- [ ] 集成到 CI/CD 流程
- [ ] 添加性能基准测试
- [ ] 添加回归测试

## 参考

- [AI 工具化任务清单](../../../docs/08.FFmpeg迁移任务.md)
- [工具 Schema 定义](./types.ts)
- [各 Phase 工具文件](../ffmpeg-*-tools.ts)
