/**
 * 音频导出工具
 *
 * 将 AudioBuffer 导出为 WAV 文件供 FFmpeg 使用
 */

/**
 * 将 AudioBuffer 导出为 WAV 格式的 Blob
 */
export function audioBufferToWavBlob(audioBuffer: AudioBuffer): Blob {
	const numChannels = audioBuffer.numberOfChannels;
	const sampleRate = audioBuffer.sampleRate;
	const length = audioBuffer.length;

	// WAV 文件头
	const wavBuffer = new ArrayBuffer(44 + length * numChannels * 2);
	const view = new DataView(wavBuffer);

	// RIFF chunk descriptor
	writeString(view, 0, 'RIFF');
	view.setUint32(4, 36 + length * numChannels * 2, true);
	writeString(view, 8, 'WAVE');

	// fmt sub-chunk
	writeString(view, 12, 'fmt ');
	view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
	view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
	view.setUint16(22, numChannels, true); // NumChannels
	view.setUint32(24, sampleRate, true); // SampleRate
	view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
	view.setUint16(32, numChannels * 2, true); // BlockAlign
	view.setUint16(34, 16, true); // BitsPerSample

	// data sub-chunk
	writeString(view, 36, 'data');
	view.setUint32(40, length * numChannels * 2, true); // Subchunk2Size

	// 写入音频数据
	const channels: Float32Array[] = [];
	for (let i = 0; i < numChannels; i++) {
		channels.push(audioBuffer.getChannelData(i));
	}

	let offset = 44;
	for (let i = 0; i < length; i++) {
		for (let channel = 0; channel < numChannels; channel++) {
			// 将 float32 (-1 到 1) 转换为 int16 (-32768 到 32767)
			const sample = Math.max(-1, Math.min(1, channels[channel][i]));
			const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
			view.setInt16(offset, intSample, true);
			offset += 2;
		}
	}

	return new Blob([wavBuffer], { type: 'audio/wav' });
}

/**
 * 将 AudioBuffer 导出为 WAV 文件的 ArrayBuffer
 */
export async function audioBufferToWavArrayBuffer(audioBuffer: AudioBuffer): Promise<ArrayBuffer> {
	return (await audioBufferToWavBlob(audioBuffer)).arrayBuffer();
}

/**
 * 写入字符串到 DataView
 */
function writeString(view: DataView, offset: number, str: string): void {
	for (let i = 0; i < str.length; i++) {
		view.setUint8(offset + i, str.charCodeAt(i));
	}
}

/**
 * 将 AudioBuffer 导出为 MP3 格式（需要编码器）
 * 暂时返回 WAV，因为 MP3 编码需要额外的库
 */
export function audioBufferToMp3Blob(audioBuffer: AudioBuffer): Blob {
	// 暂时返回 WAV 格式
	// TODO: 集成 lamejs 或其他 MP3 编码器
	console.warn('MP3 编码暂未实现，返回 WAV 格式');
	return audioBufferToWavBlob(audioBuffer);
}
