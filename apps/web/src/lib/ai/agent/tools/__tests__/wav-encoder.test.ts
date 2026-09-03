/**
 * wav-encoder 单元测试
 *
 * encodeWav 是纯逻辑（不依赖 DOM），可直接在 bun 环境测试。
 * 通过构造伪 AudioBuffer 验证 WAV 头字段 + PCM 采样数据正确性。
 */

import { describe, expect, it } from "bun:test";
import { encodeWav } from "../../../wav-encoder";

/** 构造最小 AudioBuffer 兼容对象（bun 环境无 Web Audio，用结构性伪对象） */
function makeFakeAudioBuffer({
	sampleRate,
	length,
	channelData,
}: {
	sampleRate: number;
	length: number;
	channelData: Float32Array[];
}): AudioBuffer {
	return {
		sampleRate,
		length,
		duration: length / sampleRate,
		numberOfChannels: channelData.length,
		getChannelData: (c: number) => channelData[c],
		copyFromChannel: () => {},
		copyToChannel: () => {},
	} as unknown as AudioBuffer;
}

function readWavHeader(bytes: Uint8Array) {
	const text = (offset: number, len: number) =>
		String.fromCharCode(...Array.from(bytes.slice(offset, offset + len)));
	return {
		riff: text(0, 4),
		wave: text(8, 4),
		fmt: text(12, 4),
		audioFormat: bytes[18] | (bytes[19] << 8),
		numChannels: bytes[20] | (bytes[21] << 8),
		sampleRate: bytes[22] | (bytes[23] << 8) | (bytes[24] << 16) | (bytes[25] << 24),
		byteRate: bytes[26] | (bytes[27] << 8) | (bytes[28] << 16) | (bytes[29] << 24),
		blockAlign: bytes[30] | (bytes[31] << 8),
		bitsPerSample: bytes[32] | (bytes[33] << 8),
		data: text(36, 4),
		dataSize: bytes[40] | (bytes[41] << 8) | (bytes[42] << 16) | (bytes[43] << 24),
		fileSize: bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24),
	};
}

describe("encodeWav", () => {
	it("encodes a mono 16kHz buffer with correct WAV header", async () => {
		const sr = 16000;
		const buffer = makeFakeAudioBuffer({
			sampleRate: sr,
			length: sr, // 1 second
			channelData: [new Float32Array(sr)], // silence
		});
		const blob = encodeWav(buffer, 16000);
		const bytes = new Uint8Array(await blob.arrayBuffer());

		// Blob in bun: use arrayBuffer
		expect(bytes.length).toBe(sr * 2 + 44); // data + header
		const header = readWavHeader(bytes);
		expect(header.riff).toBe("RIFF");
		expect(header.wave).toBe("WAVE");
		expect(header.fmt).toBe("fmt ");
		expect(header.audioFormat).toBe(1); // PCM
		expect(header.numChannels).toBe(1); // mono
		expect(header.sampleRate).toBe(16000);
		expect(header.byteRate).toBe(16000 * 2);
		expect(header.blockAlign).toBe(2);
		expect(header.bitsPerSample).toBe(16);
		expect(header.data).toBe("data");
		expect(header.dataSize).toBe(16000 * 2); // 1s * 2 bytes
	});

	it("mixes stereo to mono", async () => {
		const sr = 8000;
		const length = 4;
		// Left = 1, Right = -1 → mono average = 0
		const buffer = makeFakeAudioBuffer({
			sampleRate: sr,
			length,
			channelData: [
				new Float32Array([1, 1, 1, 1]),
				new Float32Array([-1, -1, -1, -1]),
			],
		});
		const blob = encodeWav(buffer, sr);
		const bytes = new Uint8Array(await blob.arrayBuffer());
		const view = new DataView(bytes.buffer);
		expect(view.getInt16(44, true)).toBe(0); // (1 + -1)/2 = 0
		expect(view.getInt16(46, true)).toBe(0);
	});

	it("resamples 44.1k to 16k (length shrinks ~2.76x)", async () => {
		const sr = 44100;
		const length = 44100; // 1s at 44.1k
		const buffer = makeFakeAudioBuffer({
			sampleRate: sr,
			length,
			channelData: [new Float32Array(length)],
		});
		const blob = encodeWav(buffer, 16000);
		const bytes = new Uint8Array(await blob.arrayBuffer());
		const header = readWavHeader(bytes);
		// 1s at 16k mono = 16000 samples * 2 = 32000 bytes data
		expect(header.sampleRate).toBe(16000);
		expect(header.numChannels).toBe(1);
		expect(header.dataSize).toBeLessThanOrEqual(16000 * 2 + 2);
		expect(header.dataSize).toBeGreaterThan(15000 * 2);
	});

	it("clamps samples to [-1, 1] PCM16 range", async () => {
		const sr = 16000;
		const buffer = makeFakeAudioBuffer({
			sampleRate: sr,
			length: 3,
			channelData: [new Float32Array([2, 0, -2])],
		});
		const blob = encodeWav(buffer, sr);
		const bytes = new Uint8Array(await blob.arrayBuffer());
		const view = new DataView(bytes.buffer);
		expect(view.getInt16(44, true)).toBe(32767); // clamped +1 → 0x7fff
		expect(view.getInt16(46, true)).toBe(0);
		expect(view.getInt16(48, true)).toBe(-32768); // clamped -1 → 0x8000
	});
});