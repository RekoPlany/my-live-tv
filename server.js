import episodes from './videos.json';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 1. پشتگیری تەواوی CORS
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
      return new Response('No episodes configured', { status: 500 });
    }

    // 2. هەژمارکردنی تەواوی کاتی 24/7 لەسەر کاتی جیهانی (UTC)
    const totalDuration = episodes.reduce((acc, ep) => acc + (ep.duration || 300), 0);
    const nowSec = Math.floor(Date.now() / 1000);
    const loopTime = nowSec % totalDuration;

    let accumulatedTime = 0;
    let currentEpisode = episodes[0];
    let timeIntoEpisode = 0;

    for (const ep of episodes) {
      const dur = ep.duration || 300;
      if (accumulatedTime + dur > loopTime) {
        currentEpisode = ep;
        timeIntoEpisode = loopTime - accumulatedTime;
        break;
      }
      accumulatedTime += dur;
    }

    const streamUrl = currentEpisode.url.trim();

    // 3. ئەگەر لینکەکە خۆی .m3u8 بێت
    if (streamUrl.includes('.m3u8') || streamUrl.includes('/hls/')) {
      try {
        const response = await fetch(streamUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const content = await response.text();
        return new Response(content, {
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store',
          },
        });
      } catch (e) {
        return Response.redirect(streamUrl, 302);
      }
    }

    // 4. چارەسەری زۆر زیرەک (Byte Range & HLS Engine Integration)
    // بڕینی کاتی بەردەوام بە چوارچێوەی 10 چڕکەیی
    const segmentDuration = 10;
    const mediaSequence = Math.floor(nowSec / segmentDuration);
    const currentSegmentIndex = Math.floor(timeIntoEpisode / segmentDuration);

    const m3u8Dynamic = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-TARGETDURATION:${segmentDuration}
#EXT-X-MEDIA-SEQUENCE:${mediaSequence}
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-PROGRAM-DATE-TIME:${new Date(nowSec * 1000).toISOString()}

#EXTINF:${segmentDuration}.0,
${streamUrl}#t=${timeIntoEpisode.toFixed(1)}
`;

    return new Response(m3u8Dynamic, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  },
};
