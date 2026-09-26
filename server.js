import episodes from './videos.json';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // ڕێگەپێدانی CORS بۆ هەموو پلەیەرەکان
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    const totalDuration = episodes.reduce((acc, ep) => acc + ep.duration, 0);
    if (totalDuration === 0) return new Response('No episodes configured', { status: 500 });

    const now = Math.floor(Date.now() / 1000);
    const currentLoopTime = now % totalDuration;

    let accumulatedTime = 0;
    let currentEpisodeIndex = 0;
    let timeIntoCurrentEpisode = 0;

    for (let i = 0; i < episodes.length; i++) {
      if (accumulatedTime + episodes[i].duration > currentLoopTime) {
        currentEpisodeIndex = i;
        timeIntoCurrentEpisode = currentLoopTime - accumulatedTime;
        break;
      }
      accumulatedTime += episodes[i].duration;
    }

    const currentEp = episodes[currentEpisodeIndex];

    // ئەگەر داوای فایلەکە لە براوسەر یان پلەیەر کرا
    const m3u8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:${currentEp.duration}
#EXT-X-MEDIA-SEQUENCE:${Math.floor(now / 10)}
#EXTINF:${currentEp.duration},${currentEp.title}
${currentEp.url}
`;

    return new Response(m3u8Content, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  },
};
