/**
 * 浏览器原生 WAV 编码器（纯逻辑，无 DOM 依赖）
 *
 * 将 AudioBuffer 编码为 16-bit PCM WAV Blob，用于 OpenAI 兼容
 * /audio/transcriptions 端点。支持单声道混音 + 线性插值重采样。
 */

/**
 * AudioBuffer → 16-bit PCM WAV Blob。
 * 典型用途：decodeAudioData 得到 44.1k/48k 立体声 → 编码为 16kHz 单声道 WAV。
 */
export function encodeWav(
	buffer: AudioBuffer,
	targetSampleRate = 16000,
): Blob {
	// 混音到单声道
	const channels = buffer.numberOfChannels;
	const sourceLength = buffer.length;
	const mono = new Float32Array(sourceLength);
	for (let c = 0; c < channels; c++) {
		const data = buffer.getChannelData(c);
		for (let i = 0; i < sourceLength; i++) mono[i] += data[i] / channels;
	}

	// 重采样到目标采样率（线性插值）
	const sourceRate = buffer.sampleRate;
	let samples: Float32Array;
	if (sourceRate === targetSampleRate) {
		samples = mono;
	} else {
		const ratio = sourceRate / targetSampleRate;
		const targetLength = Math.max(1, Math.floor(sourceLength / ratio));
		samples = new Float32Array(targetLength);
		for (let i = 0; i < targetLength; i++) {
			const pos = i * ratio;
			const i0 = Math.floor(pos);
			const i1 = Math.min(sourceLength - 1, i0 + 1);
			const frac = pos - i0;
			samples[i] = mono[i0] * (1 - frac) + mono[i1] * frac;
		}
	}

	// 编码 16-bit PCM
	const numSamples = samples.length;
	const pcm = new Int16Array(numSamples);
	for (let i = 0; i < numSamples; i++) {
		const s = Math.max(-1, Math.min(1, samples[i]));
		pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
	}

	const bytes = new Uint8Array(44 + pcm.length * 2);
	const dataSize = pcm.length * 2;
	const writeString = (offset: number, str: string) => {
		for (let i = 0; i < str.length; i++) bytes[offset + i] = str.charCodeAt(i);
	};
	writeString(0, "RIFF");
	bytes[4] = (36 + dataSize) & 0xff;
	bytes[5] = ((36 + dataSize) >> 8) & 0xff;
	bytes[6] = ((36 + dataSize) >> 16) & 0xff;
	bytes[7] = ((36 + dataSize) >> 24) & 0xff;
	writeString(8, "WAVE");
	writeString(12, "fmt ");
	bytes[16] = 16; // PCM chunk size
	bytes[17] = 0;
	bytes[18] = 1; // PCM format
	bytes[19] = 0;
	bytes[20] = 1; // mono
	bytes[21] = 0;
	bytes[22] = targetSampleRate & 0xff;
	bytes[23] = (targetSampleRate >> 8) & 0xff;
	bytes[24] = (targetSampleRate >> 16) & 0xff;
	bytes[25] = (targetSampleRate >> 24) & 0xff;
	const byteRate = targetSampleRate * 2;
	bytes[26] = byteRate & 0xff;
	bytes[27] = (byteRate >> 8) & 0xff;
	bytes[28] = (byteRate >> 16) & 0xff;
	bytes[29] = (byteRate >> 24) & 0xff;
	bytes[30] = 2; // block align
	bytes[31] = 0;
	bytes[32] = 16; // bits per sample
	bytes[33] = 0;
	writeString(36, "data");
	bytes[40] = dataSize & 0xff;
	bytes[41] = (dataSize >> 8) & 0xff;
	bytes[42] = (dataSize >> 16) & 0xff;
	bytes[43] = (dataSize >> 24) & 0xff;
	const view = new DataView(bytes.buffer);
	for (let i = 0; i < numSamples; i++) {
		view.setInt16(44 + i * 2, pcm[i], true);
	}

	return new Blob([bytes], { type: "audio/wav" });
}