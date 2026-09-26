import episodes from './videos.json';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 1. ڕێگەپێدانی CORS بۆ هەموو ئامێر و پلەیەرەکان
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
      return new Response('No videos in videos.json', { status: 500 });
    }

    // 2. دیاریکردنی درێژی سێگمێنتەکان (10 چڕکەیی بۆ لایڤی هاوسەنگ)
    const SEGMENT_DURATION = 10;
    
    // کاتی ڕاستەقینەی جیهانی (UNIX Timestamp)
    const nowSec = Math.floor(Date.now() / 1000);

    // هەژمارکردنی تەواوی کاتی پێڕستی ڤیدیۆکان
    const totalDuration = episodes.reduce((acc, ep) => acc + (ep.duration || 300), 0);
    if (totalDuration === 0) return new Response('Invalid video durations', { status: 500 });

    // کاتی ئێستای زنجیرە لۆپەکە (24/7 Timeline)
    const loopTime = nowSec % totalDuration;

    // دیاریکردنی کاتی ئێستای ڤیدیۆ لە سەر خەتی کات
    let accumulated = 0;
    let currentEpisode = episodes[0];
    let timeInEpisode = 0;

    for (const ep of episodes) {
      const dur = ep.duration || 300;
      if (accumulated + dur > loopTime) {
        currentEpisode = ep;
        timeInEpisode = loopTime - accumulated;
        break;
      }
      accumulated += dur;
    }

    const streamUrl = currentEpisode.url.trim();

    // 3. ئەگەر لینکەکە خۆی .m3u8 بێت
    if (streamUrl.includes('.m3u8') || streamUrl.includes('/hls/')) {
      try {
        const res = await fetch(streamUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const manifest = await res.text();
        return new Response(manifest, {
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

    // 4. دابەشکردنی لایڤی زەمەنی (Virtual Live Sliding Window)
    // ئەم هەژمارکردنە وادەکات لای هەموو جیهان تەنها 3-4 سێگمێنتی کۆتایی دەربکەوێت وەک کەناڵی ئاسمانی
    const mediaSequence = Math.floor(nowSec / SEGMENT_DURATION);
    const episodeDuration = currentEpisode.duration || 300;

    // دروستکردنی مانێفێست بە ڕێکخستنی کاتی ڕاستەقینەی ISO
    const programDateTime = new Date(nowSec * 1000).toISOString();

    const m3u8Content = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:${SEGMENT_DURATION}
#EXT-X-MEDIA-SEQUENCE:${mediaSequence}
#EXT-X-DISCONTINUITY-SEQUENCE:${Math.floor(mediaSequence / 100)}
#EXT-X-PROGRAM-DATE-TIME:${programDateTime}

#EXT-X-DISCONTINUITY
#EXTINF:${SEGMENT_DURATION}.0,
${streamUrl}#t=${timeInEpisode.toFixed(1)}
`;

    return new Response(m3u8Content, {
      headers: {
        'Content-Type': 'application/x-mpegURL',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  },
};
