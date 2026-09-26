import episodes from './videos.json' assert { type: 'json' };

export default {
  async fetch(request) {
    const url = new URL(request.url);

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
  const remainingDuration = currentEp.duration - timeIntoCurrentEpisode;

  let m3u8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:${totalDuration}
#EXT-X-MEDIA-SEQUENCE:${Math.floor(now / 10)}
#EXT-X-DISCONTINUITY
#EXTINF:${remainingDuration},${currentEp.title}
${currentEp.url}
`;

  const nextEpIndex = (currentEpisodeIndex + 1) % episodes.length;
  const nextEp = episodes[nextEpIndex];
  m3u8Content += `#EXT-X-DISCONTINUITY\n#EXTINF:${nextEp.duration},${nextEp.title}\n${nextEp.url}\n`;

  return new Response(m3u8Content, {
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
