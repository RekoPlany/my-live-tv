const express = require('express');
const app = express();
const playlist = require('./videos.json');

const totalDuration = playlist.reduce((acc, video) => acc + video.duration, 0);

app.get('/live.m3u8', (req, res) => {
    const totalSecondsToday = Math.floor((Date.now() % (24 * 60 * 60 * 1000)) / 1000);
    let currentPosition = totalSecondsToday % totalDuration;
    
    let currentVideo = null;
    let seekTime = 0;
    
    for (let video of playlist) {
        if (currentPosition < video.duration) {
            currentVideo = video;
            seekTime = currentPosition;
            break;
        }
        currentPosition -= video.duration;
    }

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    // لێرەدا سێرڤەرەکە ڕاستەوخۆ بەرنامەی IPTV دەباتە ناو ئەو چرکەیەی کە ئێستا دەبێت پەخش بکرێت
    res.redirect(currentVideo.url); 
});

app.listen(process.env.PORT || 3000);
