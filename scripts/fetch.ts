// Fetches video metadata for the Cracking the Cryptic channel from the
// YouTube Data API v3 and stores it under data/ (see data.ts).
//
// The fetch is incremental: the uploads playlist is read newest first and
// scanning stops at the first page that contains no unknown videos. Details
// are only requested for videos that are not stored yet. Every fetched video
// is stored, with or without a SudokuPad link, so it is never fetched again.
//
// Usage: YOUTUBE_API_KEY=... node scripts/fetch.ts [--full]
//   --full  scan the whole uploads playlist instead of stopping early
//           (still only fetches details for videos that are not stored)

import { loadChannel, saveChannel, loadVideos, saveVideos } from './data.ts';
import type { Channel, Video } from './types.ts';

const API = 'https://www.googleapis.com/youtube/v3';
const HANDLE = '@CrackingTheCryptic';

const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) {
  console.error('YOUTUBE_API_KEY is not set. See README.md for how to get one.');
  process.exit(1);
}
const fullScan = process.argv.includes('--full');

async function api<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${API}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('key', apiKey!);
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`YouTube API ${endpoint} failed (${res.status}): ${body?.error?.message ?? res.statusText}`);
  }
  return body as T;
}

async function resolveChannel(): Promise<Channel> {
  const res = await api<{ items?: { id: string; contentDetails: { relatedPlaylists: { uploads: string } } }[] }>(
    'channels',
    { part: 'contentDetails', forHandle: HANDLE },
  );
  const channel = res.items?.[0];
  if (!channel) throw new Error(`Channel ${HANDLE} not found`);
  return { channelId: channel.id, uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads };
}

async function findNewIds(playlistId: string, known: Set<string>): Promise<string[]> {
  const found: string[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const res = await api<{ nextPageToken?: string; items: { contentDetails: { videoId: string } }[] }>(
      'playlistItems',
      { part: 'contentDetails', playlistId, maxResults: '50', ...(pageToken ? { pageToken } : {}) },
    );
    pages++;
    const unknown = res.items.map((i) => i.contentDetails.videoId).filter((id) => !known.has(id));
    found.push(...unknown);
    if (unknown.length === 0 && !fullScan) break;
    pageToken = res.nextPageToken;
  } while (pageToken);
  console.log(`Scanned ${pages} playlist page(s), ${found.length} new video(s)`);
  return [...new Set(found)];
}

type ApiVideo = {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    liveBroadcastContent: string;
    thumbnails: Video['thumbnails'];
  };
  contentDetails: { duration: string };
};

async function fetchDetails(ids: string[]): Promise<Video[]> {
  const videos: Video[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const res = await api<{ items: ApiVideo[] }>('videos', {
      part: 'snippet,contentDetails',
      id: batch.join(','),
      maxResults: '50',
    });
    for (const v of res.items) {
      // Upcoming and ongoing streams have no final duration yet; leave them
      // unstored so a later run picks them up once they have finished.
      if (v.snippet.liveBroadcastContent !== 'none') continue;
      videos.push({
        id: v.id,
        title: v.snippet.title,
        publishedAt: v.snippet.publishedAt,
        duration: v.contentDetails.duration,
        thumbnails: v.snippet.thumbnails,
        description: v.snippet.description,
      });
    }
  }
  return videos;
}

let channel = await loadChannel();
if (!channel) {
  channel = await resolveChannel();
  await saveChannel(channel);
}
const stored = await loadVideos();
const known = new Set(stored.map((v) => v.id));

const newIds = await findNewIds(channel.uploadsPlaylistId, known);
const fetched = await fetchDetails(newIds);
await saveVideos(fetched);
console.log(`Stored ${fetched.length} new video(s), ${stored.length + fetched.length} in total`);
