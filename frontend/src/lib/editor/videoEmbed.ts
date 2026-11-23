/**
 * Universal Video Embed Parser & Responsive HTML Builder.
 * Supports YouTube (Standard, Live, Shorts), TikTok, Vimeo, Facebook (Video/Reels),
 * Instagram (Reels/Posts), Loom, Dailymotion, Google Drive, Streamable, and direct MP4/WebM/Ogg videos,
 * as well as safe HTTPS <iframe> embed snippets from any platform.
 */

export interface ParsedVideoEmbed {
  platform: string;
  embedType: 'iframe' | 'video';
  src: string;
  aspect: '16:9' | '9:16';
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Parses a video URL or raw <iframe> embed snippet from any major platform.
 * Returns null if the input is not a recognized video URL or safe HTTPS iframe.
 */
export function parseVideoEmbed(rawInput: string): ParsedVideoEmbed | null {
  const input = (rawInput || '').trim();
  if (!input) return null;

  // 1. Raw <iframe src="https://..."> snippet from any platform
  if (/^<iframe\b/i.test(input)) {
    const srcMatch = input.match(/\bsrc\s*=\s*["'](https:\/\/[^"']+)["']/i);
    if (!srcMatch) return null;
    const iframeSrc = srcMatch[1].trim();
    const isVertical = /tiktok\.com|instagram\.com\/reel|youtube\.com\/shorts/i.test(iframeSrc);
    return {
      platform: 'Embedded Video',
      embedType: 'iframe',
      src: iframeSrc,
      aspect: isVertical ? '9:16' : '16:9',
    };
  }

  // Must be a single clean URL (no spaces/newlines)
  if (/\s/.test(input) || !/^https?:\/\//i.test(input)) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
  const path = parsed.pathname;

  // 2. Direct video file (.mp4, .webm, .ogg, .mov)
  if (/\.(?:mp4|webm|ogg|mov)(?:$|\?)/i.test(path)) {
    return {
      platform: 'Direct Video',
      embedType: 'video',
      src: input,
      aspect: '16:9',
    };
  }

  // 3. YouTube (watch, youtu.be, shorts, embed, live)
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com') {
    let videoId = '';
    let isShort = false;

    if (host === 'youtu.be') {
      videoId = path.split('/').filter(Boolean)[0] || '';
    } else if (path.startsWith('/shorts/')) {
      videoId = path.split('/')[2] || '';
      isShort = true;
    } else if (path.startsWith('/embed/') || path.startsWith('/live/')) {
      videoId = path.split('/')[2] || '';
    } else {
      videoId = parsed.searchParams.get('v') || '';
    }

    if (/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
      const startParam = parsed.searchParams.get('t') || parsed.searchParams.get('start');
      const startSeconds = startParam ? parseInt(startParam.replace(/[^\d]/g, ''), 10) : 0;
      const query = Number.isFinite(startSeconds) && startSeconds > 0 ? `?start=${startSeconds}` : '';
      return {
        platform: isShort ? 'YouTube Shorts' : 'YouTube',
        embedType: 'iframe',
        src: `https://www.youtube.com/embed/${videoId}${query}`,
        aspect: isShort ? '9:16' : '16:9',
      };
    }
  }

  // 4. Vimeo
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const match = path.match(/\/(?:video\/)?(\d+)/);
    if (match?.[1]) {
      return {
        platform: 'Vimeo',
        embedType: 'iframe',
        src: `https://player.vimeo.com/video/${match[1]}`,
        aspect: '16:9',
      };
    }
  }

  // 5. TikTok
  if (host === 'tiktok.com') {
    const match = path.match(/\/video\/(\d+)/);
    if (match?.[1]) {
      return {
        platform: 'TikTok',
        embedType: 'iframe',
        src: `https://www.tiktok.com/embed/v2/${match[1]}`,
        aspect: '9:16',
      };
    }
  }

  // 6. Facebook Video / Watch / Reel
  if (
    (host === 'facebook.com' &&
      (path.includes('/videos/') || path.startsWith('/watch') || path.startsWith('/reel/'))) ||
    host === 'fb.watch'
  ) {
    const isReel = path.startsWith('/reel/');
    return {
      platform: isReel ? 'Facebook Reels' : 'Facebook Video',
      embedType: 'iframe',
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(input)}&show_text=false`,
      aspect: isReel ? '9:16' : '16:9',
    };
  }

  // 7. Instagram Reel / Post / TV
  if (host === 'instagram.com') {
    const match = path.match(/^\/(reel|p|tv)\/([a-zA-Z0-9_-]+)/);
    if (match?.[2]) {
      return {
        platform: match[1] === 'reel' ? 'Instagram Reels' : 'Instagram',
        embedType: 'iframe',
        src: `https://www.instagram.com/${match[1]}/${match[2]}/embed`,
        aspect: '9:16',
      };
    }
  }

  // 8. Loom
  if (host === 'loom.com') {
    const match = path.match(/^\/(?:share|embed)\/([a-zA-Z0-9]+)/);
    if (match?.[1]) {
      return {
        platform: 'Loom',
        embedType: 'iframe',
        src: `https://www.loom.com/embed/${match[1]}`,
        aspect: '16:9',
      };
    }
  }

  // 9. Dailymotion
  if (host === 'dailymotion.com' || host === 'dai.ly') {
    const match = host === 'dai.ly' ? path.match(/^\/([a-zA-Z0-9]+)/) : path.match(/\/video\/([a-zA-Z0-9]+)/);
    if (match?.[1]) {
      return {
        platform: 'Dailymotion',
        embedType: 'iframe',
        src: `https://www.dailymotion.com/embed/video/${match[1]}`,
        aspect: '16:9',
      };
    }
  }

  // 10. Google Drive video preview
  if (host === 'drive.google.com') {
    const match = path.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match?.[1]) {
      return {
        platform: 'Google Drive',
        embedType: 'iframe',
        src: `https://drive.google.com/file/d/${match[1]}/preview`,
        aspect: '16:9',
      };
    }
  }

  // 11. Streamable
  if (host === 'streamable.com') {
    const match = path.match(/^\/([a-zA-Z0-9]+)/);
    if (match?.[1]) {
      return {
        platform: 'Streamable',
        embedType: 'iframe',
        src: `https://streamable.com/e/${match[1]}`,
        aspect: '16:9',
      };
    }
  }

  return null;
}

/**
 * Generates responsive, editor-manageable HTML for a parsed video embed.
 */
export function buildVideoEmbedHtml(
  embed: ParsedVideoEmbed,
  caption = '',
  widthPct: '100%' | '80%' | '60%' = '100%'
): string {
  const isVertical = embed.aspect === '9:16';
  const maxWidth = isVertical ? '360px' : widthPct;
  const paddingBottom = isVertical ? '177.78%' : '56.25%';
  const cleanCaption = caption.trim();

  const mediaElement =
    embed.embedType === 'video'
      ? `<video controls playsinline preload="metadata" src="${escapeAttr(embed.src)}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 12px; background: #0f172a;"></video>`
      : `<iframe src="${escapeAttr(embed.src)}" title="${escapeAttr(cleanCaption || `${embed.platform} video`)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 12px;"></iframe>`;

  const captionHtml = cleanCaption
    ? `<figcaption style="text-align: center; font-size: 12px; color: #64748b; margin-top: 8px; font-style: italic;">${escapeHtml(cleanCaption)}</figcaption>`
    : '';

  return `<figure class="editorial-box group/box relative" data-box-type="video" data-platform="${escapeAttr(embed.platform)}" data-video-src="${escapeAttr(embed.src)}" data-video-width="${widthPct}" style="margin: 24px auto; width: 100%; max-width: ${maxWidth};">
  <div contenteditable="false" class="editor-only-controls" style="position: absolute; top: 8px; right: 8px; z-index: 10; display: flex; gap: 4px; user-select: none;">
    <span style="background: rgba(15,23,42,0.8); color: #e2e8f0; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; backdrop-filter: blur(4px);">${escapeHtml(embed.platform)}</span>
    <button type="button" class="video-edit-btn" style="background: rgba(37,99,235,0.88); color: #ffffff; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; border: none; cursor: pointer; backdrop-filter: blur(4px);">✎ Edit</button>
    <button type="button" class="box-delete-btn" style="background: rgba(220,38,38,0.85); color: #ffffff; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; border: none; cursor: pointer; backdrop-filter: blur(4px);">✕ Delete Video</button>
  </div>
  <div style="position: relative; width: 100%; padding-bottom: ${paddingBottom}; height: 0; overflow: hidden; border-radius: 12px; background: #0f172a; box-shadow: 0 6px 20px rgba(15,23,42,0.12);">${mediaElement}</div>
  ${captionHtml}
</figure><p><br /></p>`;
}
