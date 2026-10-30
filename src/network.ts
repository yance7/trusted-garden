interface AssetOptions {
  timeoutMs?: number; retries?: number; expectedBytes?: number;
  onProgress?: (loaded: number, total: number) => void; fetcher?: typeof fetch;
  signal?: AbortSignal;
}

/** Bound both connection and body stalls; active large transfers may continue. */
export async function readAsset(url: string, options: AssetOptions = {}): Promise<ArrayBuffer> {
  const { timeoutMs = 12000, retries = 1, fetcher = fetch } = options;
  for (let attempt = 0; ; attempt++) {
    if(options.signal?.aborted)throw new Error(`${url}: download cancelled`);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>, reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let rejectTimeout: (reason: Error) => void;
    const timeout = new Promise<never>((_, reject) => { rejectTimeout = reject; });
    const cancel=()=>{controller.abort();rejectTimeout(new Error(`${url}: download cancelled`));};
    options.signal?.addEventListener('abort',cancel,{once:true});
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { controller.abort(); rejectTimeout(new Error(`${url}: download timed out; please retry`)); }, timeoutMs);
    };
    arm();
    try {
      return await Promise.race([(async () => {
        const response = await fetcher(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
        arm();
        if (!response.body) return response.arrayBuffer();
        reader = response.body.getReader();
        const total = Number(response.headers.get('content-length')) || options.expectedBytes || 0;
        const chunks: Uint8Array[] = []; let loaded = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (controller.signal.aborted) throw new Error(`${url}: download timed out`);
          if (done) break;
          arm(); chunks.push(value); loaded += value.byteLength; options.onProgress?.(loaded, total);
        }
        const result = new Uint8Array(loaded); let offset = 0;
        for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
        return result.buffer;
      })(), timeout]);
    } catch (error) {
      controller.abort(); void reader?.cancel().catch(() => {});
      if (attempt >= retries || options.signal?.aborted) throw error;
    } finally { clearTimeout(timer!);options.signal?.removeEventListener('abort',cancel); }
  }
}

export async function readJSON<T>(url: string): Promise<T> {
  return JSON.parse(new TextDecoder().decode(await readAsset(url))) as T;
}
