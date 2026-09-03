# AGENTS.md

## Overview

Privacy-first video editor, with a focus on simplicity and ease of use.

## Media Download (素材下载)

When the user asks to download a video/audio from YouTube, Bilibili, TikTok, etc., **always use the ReClip CLI** — never curl video URLs directly (they often return HTML/redirect pages or get blocked by anti-scraping).

```bash
# 查询链接信息（标题/清晰度/时长）
scripts/reclip-dl.sh info "https://www.youtube.com/watch?v=xxx"

# 下载为 MP4 视频（默认）
scripts/reclip-dl.sh download "https://www.youtube.com/watch?v=xxx"

# 下载为 MP3 音频
scripts/reclip-dl.sh download "https://youtu.be/xxx" audio

# 指定清晰度 + 输出目录
scripts/reclip-dl.sh download "https://vimeo.com/xxx" video --height 720 --out assets/refs
```

- ReClip is a local yt-dlp wrapper service (http://localhost:8899, source in `~/Tools/reclip`). The script auto-starts it if not running.
- Downloads land in `downloads/reclip/` by default; move/import the file into `apps/web` assets if needed.
- Output filename = sanitized video title; the script prints the saved path.
- Privacy/terms: only download content the user has the right to use.

## Lib vs Utils

- `lib/` - domain logic (specific to this app)
- `utils/` - small helper utils (generic, could be copy-pasted into any other app)

## Core Editor System

The editor uses a **singleton EditorCore** that manages all editor state through specialized managers.

### Architecture

```
EditorCore (singleton)
├── playback: PlaybackManager
├── timeline: TimelineManager
├── scene: SceneManager
├── project: ProjectManager
├── media: MediaManager
└── renderer: RendererManager
```

### When to Use What

#### In React Components

**Always use the `useEditor()` hook:**

```typescript
import { useEditor } from '@/hooks/use-editor';

function MyComponent() {
  const editor = useEditor();
  const tracks = editor.timeline.getTracks();

  // Call methods
  editor.timeline.addTrack({ type: 'media' });

  // Display data (auto re-renders on changes)
  return <div>{tracks.length} tracks</div>;
}
```

The hook:

- Returns the singleton instance
- Subscribes to all manager changes
- Automatically re-renders when state changes

#### Outside React Components

**Use `EditorCore.getInstance()` directly:**

```typescript
// In utilities, event handlers, or non-React code
import { EditorCore } from "@/core";

const editor = EditorCore.getInstance();
await editor.export({ format: "mp4", quality: "high" });
```

## Actions System

Actions are the trigger layer for user-initiated operations. The single source of truth is `@/lib/actions/definitions.ts`.

**To add a new action:**

1. Add it to `ACTIONS` in `@/lib/actions/definitions.ts`:

```typescript
export const ACTIONS = {
  "my-action": {
    description: "What the action does",
    category: "editing",
    defaultShortcuts: ["ctrl+m"],
  },
  // ...
};
```

2. Add handler in `@/hooks/use-editor-actions.ts`:

```typescript
useActionHandler(
  "my-action",
  () => {
    // implementation
  },
  undefined,
);
```

**In components, use `invokeAction()` for user-triggered operations:**

```typescript
import { invokeAction } from '@/lib/actions';

// Good - uses action system
const handleSplit = () => invokeAction("split-selected");

// Avoid - bypasses UX layer (toasts, validation feedback)
const handleSplit = () => editor.timeline.splitElements({ ... });
```

Direct `editor.xxx()` calls are for internal use (commands, tests, complex multi-step operations).

## Commands System

Commands handle undo/redo. They live in `@/lib/commands/` organized by domain (timeline, media, scene).

Each command extends `Command` from `@/lib/commands/base-command` and implements:

- `execute()` - saves current state, then does the mutation
- `undo()` - restores the saved state

Actions and commands work together: actions are "what triggered this", commands are "how to do it (and undo it)".
