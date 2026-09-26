import episodes from './videos.json';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // پشتیوانی CORS
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

    // 1. هەژمارکردنی تەواوی کاتی پێڕستەکە (Total Loop Duration)
    const totalDuration = episodes.reduce((acc, ep) => acc + (ep.duration || 300), 0);
    const now = Math.floor(Date.now() / 1000);
    
    // کاتی ئێستای بەردەوامی لۆپەکە لە هەموو جیهاندا
    const currentLoopTime = now % totalDuration;

    let accumulatedTime = 0;
    let currentEpisodeIndex = 0;
    let timeIntoCurrentEpisode = 0;

    for (let i = 0; i < episodes.length; i++) {
      const epDuration = episodes[i].duration || 300;
      if (accumulatedTime + epDuration > currentLoopTime) {
        currentEpisodeIndex = i;
        timeIntoCurrentEpisode = currentLoopTime - accumulatedTime;
        break;
      }
      accumulatedTime += epDuration;
    }

    const currentEpisode = episodes[currentEpisodeIndex];
    const streamUrl = currentEpisode.url.trim();

    // 2. ئەگەر لینکەکە خۆی .m3u8 یان HLS Stream بێت
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
        return Response.redirect(streamUrl, 302);
      }
    }

    // 3. دروستکردنی HLS Manifest ی 24/7 بەکارهێنانی کاتی ISO و EXT-X-START
    const episodeDuration = currentEpisode.duration || 300;
    const isoString = new Date(now * 1000).toISOString();
    
    // شێوازی تایبەت بۆ ناچارکردنی پلەیەرەکە کە بچێتە سەر کاتی ڕاستەقینەی لایڤ
    const m3u8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:${episodeDuration}
#EXT-X-MEDIA-SEQUENCE:${Math.floor(now / 10)}
#EXT-X-START:TIME-OFFSET=${timeIntoCurrentEpisode.toFixed(1)},PRECISE=YES
#EXT-X-PROGRAM-DATE-TIME:${isoString}
#EXTINF:${episodeDuration},${currentEpisode.title || 'Live Channel'}
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
