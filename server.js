import episodes from './videos.json';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // ئەگەر داوای m3u8 یان لاپەڕەی سەرەکی کرا
    if (url.pathname.endsWith('.m3u8') || url.pathname === '/') {
      return generateM3U8();
    }

    return new Response('Not Found', { status: 404 });
  }
};

function generateM3U8() {
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

  // دروستکردنی مانێفێستی ستانداری HLS
  const m3u8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:${currentEp.duration}
#EXT-X-MEDIA-SEQUENCE:${Math.floor(now / 10)}
#EXTINF:${currentEp.duration},${currentEp.title}
${currentEp.url}
#EXT-X-ENDLIST
`;

  return new Response(m3u8Content, {
    headers: {
      'Content-Type': 'application/x-mpegURL',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
