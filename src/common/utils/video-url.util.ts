export type VideoPlatform = 'youtube' | 'aparat';

export interface ParsedVideo {
  platform: VideoPlatform;
  id: string; // youtube video id | aparat video hash
  embedUrl: string;
  watchUrl: string;
}

const ID_RE = /^[A-Za-z0-9_-]+$/;

function youtube(id: string): ParsedVideo | null {
  if (!ID_RE.test(id)) return null;
  return {
    platform: 'youtube',
    id,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
  };
}

function aparat(hash: string): ParsedVideo | null {
  if (!ID_RE.test(hash)) return null;
  return {
    platform: 'aparat',
    id: hash,
    embedUrl: `https://www.aparat.com/video/video/embed/videohash/${hash}/vt/frame`,
    watchUrl: `https://www.aparat.com/v/${hash}`,
  };
}

/**
 * Parses and validates YouTube / Aparat video URLs.
 * Returns null if invalid or unsupported.
 */
export function parseVideoUrl(raw?: string): ParsedVideo | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname
    .replace(/^www\./, '')
    .replace(/^m\./, '')
    .toLowerCase();

  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') {
      return youtube(url.searchParams.get('v') ?? '');
    }
    if (url.pathname.startsWith('/embed/')) {
      return youtube(url.pathname.slice('/embed/'.length).split('/')[0]);
    }
    return null;
  }
  if (host === 'youtu.be') {
    return youtube(url.pathname.slice(1).split('/')[0]);
  }
  if (host === 'aparat.com') {
    const mV = url.pathname.match(/^\/v\/([^/]+)/);
    if (mV) return aparat(mV[1]);
    const mEmbed = url.pathname.match(
      /^\/video\/video\/embed\/videohash\/([^/]+)/,
    );
    if (mEmbed) return aparat(mEmbed[1]);
    return null;
  }
  return null;
}

/**
 * Returns true if the URL is a supported YouTube or Aparat link.
 */
export function isValidVideoUrl(raw?: string): boolean {
  if (!raw || !raw.trim()) return true; // empty is allowed
  return parseVideoUrl(raw) !== null;
}
