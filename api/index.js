const express = require('express');
const axios = require('axios');
const serverless = require('serverless-http');
const { getAccessTokenFromRefreshToken } = require('../utils/auth');
const qs = require('querystring');
require('dotenv').config();
const router = express.Router();

const app = express();


const port = 3000;

// Make sure these exist in your .env file
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'http://127.0.0.1:3000/spotify/callback';

app.get('/spotify/callback', async (req, res) => {

  const accessToken = await getAccessTokenFromRefreshToken();

  if (!accessToken) {
    return res.status(500).send('Could not get access token');
  }

  res.send(`✅ Spotify Access Token:<br><code>${accessToken}</code>`);
});

app.get('/spotify-overview', async (req, res) => {
  try {
    const accessToken = await getAccessTokenFromRefreshToken();

    // Top 10 tracks
    const topTracksResponse = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { limit: 10, time_range: 'long_term' }
    });

    const topTracks = topTracksResponse.data.items.map(track => ({
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      id: track.id,
      album: track.album.name,
      image: track.album.images[0]?.url,
      preview_url: track.preview_url
    }));

    // Currently playing track
    const nowPlayingResponse = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    let nowPlaying = null;
    if (nowPlayingResponse.status === 200 && nowPlayingResponse.data?.item) {
      const track = nowPlayingResponse.data.item;
      nowPlaying = {
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        id: track.id,
        album: track.album.name,
        image: track.album.images[0]?.url,
        preview_url: track.preview_url,
        is_playing: nowPlayingResponse.data.is_playing
      };
    }

    res.json({ topTracks, nowPlaying });

  } catch (error) {
    console.error('❌ Error fetching data:', error.response?.data || error.message);
    res.status(500).send('Failed to fetch Spotify data');
  }
});

// Pause playback
app.put('/pause', async (req, res) => {
  try {
    const accessToken = await getAccessTokenFromRefreshToken();
    await axios.put('https://api.spotify.com/v1/me/player/pause', null, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    res.sendStatus(204);
  } catch (error) {
    console.error('❌ Error pausing playback:', error.response?.data || error.message);
    res.status(500).send('Failed to pause playback');
  }
});

// Play a specific track by ID
app.put('/play/:trackId', async (req, res) => {
  const trackId = req.params.trackId;
  try {
    const accessToken = await getAccessTokenFromRefreshToken();

    // Optionally, specify the device_id via query/device API
    await axios.put('https://api.spotify.com/v1/me/player/play', {
      uris: [`spotify:track:${trackId}`]
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    res.sendStatus(204);
  } catch (error) {
    console.error('❌ Error starting playback:', error.response?.data || error.message);
    res.status(500).send('Failed to start playback');
  }
});

const PORT = 3000;
module.exports.handler = serverless(app);
