// Reads and writes the stored video data.
//
// data/channel.json  the channel and uploads playlist IDs
// data/videos/YYYY.json  every fetched video published that year, newest first
//
// Splitting by year keeps each file small and means a daily fetch only
// rewrites the current year's file.

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import type { Channel, Video } from './types.ts';

const DATA_DIR = new URL('../data/', import.meta.url);
const CHANNEL_FILE = new URL('channel.json', DATA_DIR);
const VIDEOS_DIR = new URL('videos/', DATA_DIR);

async function readJson<T>(url: URL): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(url, 'utf8'));
  } catch (e: any) {
    if (e.code === 'ENOENT') return undefined;
    throw e;
  }
}

function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n';
}

export function loadChannel(): Promise<Channel | undefined> {
  return readJson<Channel>(CHANNEL_FILE);
}

export async function saveChannel(channel: Channel): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CHANNEL_FILE, toJson(channel));
}

/** All stored videos, newest first. */
export async function loadVideos(): Promise<Video[]> {
  let files: string[];
  try {
    files = await readdir(VIDEOS_DIR);
  } catch (e: any) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
  const years = await Promise.all(
    files.filter((f) => f.endsWith('.json')).map((f) => readJson<Video[]>(new URL(f, VIDEOS_DIR))),
  );
  return sortNewestFirst(years.flatMap((v) => v ?? []));
}

/** Writes the given videos into their year files, merged with what is stored. */
export async function saveVideos(videos: Video[]): Promise<void> {
  const byYear = Map.groupBy(videos, (v) => v.publishedAt.slice(0, 4));
  await mkdir(VIDEOS_DIR, { recursive: true });
  for (const [year, added] of byYear) {
    const file = new URL(`${year}.json`, VIDEOS_DIR);
    const ids = new Set(added.map((v) => v.id));
    const kept = ((await readJson<Video[]>(file)) ?? []).filter((v) => !ids.has(v.id));
    await writeFile(file, toJson(sortNewestFirst([...added, ...kept])));
  }
}

function sortNewestFirst(videos: Video[]): Video[] {
  return videos.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
