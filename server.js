import episodes from './videos.json';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 1. پشتیوانی هەموو داواکارییەکانی CORS بە بێپەڕبوون
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    if (!episodes || episodes.length === 0) {
      return new Response('No streams/videos configured', { status: 500 });
    }

    // 2. هەژمارکردنی کاتی ئێستای لایڤ (Live Loop Calculation)
    const totalDuration = episodes.reduce((acc, ep) => acc + (ep.duration || 300), 0);
    const now = Math.floor(Date.now() / 1000);
    const currentLoopTime = now % totalDuration;

    let accumulatedTime = 0;
    let currentEpisode = episodes[0];

    for (const ep of episodes) {
      const duration = ep.duration || 300;
      if (accumulatedTime + duration > currentLoopTime) {
        currentEpisode = ep;
        break;
      }
      accumulatedTime += duration;
    }

    const streamUrl = currentEpisode.url.trim();

    // 3. لۆژیکی زیرەک (Adaptive Handler): ئەگەر لینکەکە خۆی HLS/M3U8 بوو
    if (streamUrl.includes('.m3u8') || streamUrl.includes('/hls/')) {
      try {
        const response = await fetch(streamUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const content = await response.text();
        
        return new Response(content, {
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
          },
        });
      } catch (e) {
        // ئەگەر ڕاستەوخۆ داواکاری نەبوو، ڕێڕەوەکەی بپەڕێنەوە (Redirect fallback)
        return Response.redirect(streamUrl, 302);
      }
    }

    // 4. ئەگەر لینکەکە MP4 یان فایلی جێگیر بوو (VOD Generator)
    const duration = currentEpisode.duration || 300;
    const m3u8Dynamic = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:${duration}
#EXT-X-MEDIA-SEQUENCE:${Math.floor(now / 10)}
#EXT-X-DISCONTINUITY
#EXTINF:${duration},${currentEpisode.title || 'Live Channel'}
${streamUrl}
`;

    return new Response(m3u8Dynamic, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  },
};
