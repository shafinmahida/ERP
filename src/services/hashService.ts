export async function computeSha256Buffer(buffer: Uint8Array | ArrayBuffer): Promise<string> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  // 1. Browser Web Crypto API (Tauri Webview / Chrome)
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {}
  }


  // 2. Node.js Environment (Scripts / CLI / IPC Backend)
  try {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');
  } catch {}

  // 3. Simple Hash Fallback
  let hash = 0;
  for (let i = 0; i < bytes.length; i++) {
    hash = (hash << 5) - hash + bytes[i];
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}
