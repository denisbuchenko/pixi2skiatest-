const bytesCache = new Map<string, Uint8Array>();

export function normalizeImageSource(source: string): string {
  if (!source || source.startsWith('data:')) {
    return source;
  }

  if (source.startsWith('/')) {
    return new URL(source, window.location.origin).href;
  }

  return source;
}

function decodeDataUrl(source: string): Uint8Array | null {
  const [, payload = ''] = source.split(',');
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function detectMime(source: string, bytes: Uint8Array): string {
  if (source.startsWith('data:')) {
    const header = source.slice(0, source.indexOf(';'));
    return header.slice(5) || 'application/octet-stream';
  }

  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    return 'image/png';
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return 'image/jpeg';
  }

  if (/\.png($|\?)/i.test(source)) {
    return 'image/png';
  }

  if (/\.jpe?g($|\?)/i.test(source)) {
    return 'image/jpeg';
  }

  return 'application/octet-stream';
}

export function getCachedImageBytes(source: string): Uint8Array | null {
  const key = normalizeImageSource(source);
  const cached = bytesCache.get(key);
  if (cached) {
    return cached;
  }

  if (key.startsWith('data:')) {
    const bytes = decodeDataUrl(key);
    if (bytes) {
      bytesCache.set(key, bytes);
    }
    return bytes;
  }

  return null;
}

export async function loadImageBytes(source: string): Promise<Uint8Array | null> {
  const cached = getCachedImageBytes(source);
  if (cached) {
    return cached;
  }

  const key = normalizeImageSource(source);
  if (key.startsWith('data:')) {
    return null;
  }

  try {
    const response = await fetch(key);
    if (!response.ok) {
      return null;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    bytesCache.set(key, bytes);
    return bytes;
  } catch {
    return null;
  }
}

export async function preloadImage(source: string): Promise<void> {
  await loadImageBytes(source);
}

export function getImageMime(source: string, bytes: Uint8Array): string {
  return detectMime(normalizeImageSource(source), bytes);
}
