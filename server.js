import episodes from './videos.json';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 1. پشتیوانی CORS بۆ هەموو پلەیەرەکان
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

    // 2. هەژمارکردنی کاتی جیهانی 24/7 (Global Time Sync)
    const totalDuration = episodes.reduce((acc, ep) => acc + (ep.duration || 300), 0);
    const now = Math.floor(Date.now() / 1000);
    const currentLoopTime = now % totalDuration;

    let accumulatedTime = 0;
    let currentEpisode = episodes[0];
    let timeIntoEpisode = 0;

    for (const ep of episodes) {
      const dur = ep.duration || 300;
      if (accumulatedTime + dur > currentLoopTime) {
        currentEpisode = ep;
        timeIntoEpisode = currentLoopTime - accumulatedTime;
        break;
      }
      accumulatedTime += dur;
    }

    const streamUrl = currentEpisode.url.trim();

    // 3. ئەگەر لینکەکە HLS / m3u8 بوو
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
            'Cache-Control': 'no-cache',
          },
        });
      } catch (e) {
        return Response.redirect(streamUrl, 302);
      }
    }

    // 4. دروستکردنی HLS Manifest ی ستاندارد و هاوکات لەگەڵ کات (Live Timeline)
    const duration = currentEpisode.duration || 300;
    const mediaSequence = Math.floor(now / 10);
    const startTime = timeIntoEpisode.toFixed(1);

    const m3u8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:${duration}
#EXT-X-MEDIA-SEQUENCE:${mediaSequence}
#EXT-X-START:TIME-OFFSET=${startTime},PRECISE=YES
#EXTINF:${duration},${currentEpisode.title || 'Live Stream'}
${streamUrl}
`;

    return new Response(m3u8Content, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  },
};
