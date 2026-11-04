export const API_BASE =
  (import.meta as ImportMeta & { env: Record<string, string> }).env
    .VITE_API_BASE ?? "";
export async function request<T>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 65000);
  try {
    const response = await fetch(`${API_BASE}/api${path}`, {
      method,
      credentials: "include",
      signal: controller.signal,
      headers:
        body instanceof FormData ? {} : { "Content-Type": "application/json" },
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(
        typeof data?.detail === "string"
          ? data.detail
          : "The service is unavailable. Your confirmed work is still here.",
      );
    if (!data)
      throw new Error(
        "This preview does not have a Python API connected. The sample lesson is available.",
      );
    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw new Error(
        "This request took too long. Your confirmed work is still here. Please try again.",
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
export async function recordWav(): Promise<{
  stop: () => Promise<Blob>;
  cancel: () => void;
}> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const context = new AudioContext();
  try {
    await context.audioWorklet.addModule("/recorder-worklet.js");
    await context.resume();
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    await context.close();
    throw error;
  }
  const source = context.createMediaStreamSource(stream);
  const processor = new AudioWorkletNode(context, "pageable-recorder");
  const silent = context.createGain();
  silent.gain.value = 0;
  const frames: Float32Array[] = [];
  processor.port.onmessage = (e) => frames.push(new Float32Array(e.data));
  source.connect(processor);
  processor.connect(silent);
  silent.connect(context.destination);
  const cleanup = () => {
    processor.disconnect();
    source.disconnect();
    silent.disconnect();
    stream.getTracks().forEach((t) => t.stop());
    void context.close();
  };
  return {
    cancel: cleanup,
    stop: async () => {
      const rate = context.sampleRate;
      cleanup();
      const length = frames.reduce((n, f) => n + f.length, 0);
      const buffer = new ArrayBuffer(44 + length * 2);
      const view = new DataView(buffer);
      const str = (at: number, s: string) => {
        for (let i = 0; i < s.length; i++)
          view.setUint8(at + i, s.charCodeAt(i));
      };
      str(0, "RIFF");
      view.setUint32(4, 36 + length * 2, true);
      str(8, "WAVE");
      str(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, rate, true);
      view.setUint32(28, rate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      str(36, "data");
      view.setUint32(40, length * 2, true);
      let offset = 44;
      for (const f of frames)
        for (const x of f) {
          view.setInt16(
            offset,
            Math.max(-1, Math.min(1, x)) * (x < 0 ? 32768 : 32767),
            true,
          );
          offset += 2;
        }
      return new Blob([buffer], { type: "audio/wav" });
    },
  };
}
