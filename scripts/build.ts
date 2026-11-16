// Builds the static site in dist/ from the stored video data.
// Videos without a SudokuPad link in their description are left out.
//
// Usage: node scripts/build.ts

import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { loadVideos } from './data.ts';
import type { Video } from './types.ts';

const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);

const SUDOKUPAD_LINK = /https?:\/\/(?:[a-z0-9-]+\.)*sudokupad\.app\/[^\s"'<>()[\]]+/gi;

export function puzzleLinks(description: string): string[] {
  const links = (description.match(SUDOKUPAD_LINK) ?? [])
    .map((l) => l.replace(/[.,;:!?]+$/, ''))
    // A bare link to the app itself is not a puzzle.
    .filter((l) => new URL(l).pathname.length > 1);
  return [...new Set(links)];
}

export function formatDuration(iso: string): string {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return '';
  const [, d = '0', h = '0', min = '0', s = '0'] = m;
  const hours = Number(d) * 24 + Number(h);
  const ss = s.padStart(2, '0');
  return hours > 0 ? `${hours}:${min.padStart(2, '0')}:${ss}` : `${Number(min)}:${ss}`;
}

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function thumbnail(v: Video): string {
  return v.thumbnails.medium?.url ?? `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`;
}

function renderVideo(v: Video, links: string[]): string {
  const videoUrl = `https://www.youtube.com/watch?v=${v.id}`;
  const duration = formatDuration(v.duration);
  const puzzles =
    links.length === 1
      ? `<a class="play" href="${esc(links[0]!)}">Play the puzzle</a>`
      : links.map((l, i) => `<a class="play" href="${esc(l)}">Puzzle ${i + 1}</a>`).join('');
  return `<li class="cell" data-q="${esc(v.title.toLowerCase())}">
<a class="thumb" href="${videoUrl}" tabindex="-1" aria-hidden="true"><img src="${esc(thumbnail(v))}" width="320" height="180" alt="" loading="lazy" decoding="async">${duration ? `<span class="timer">${duration}</span>` : ''}</a>
<h2><a href="${videoUrl}">${esc(v.title)}</a></h2>
<time datetime="${v.publishedAt}">${dateFormat.format(new Date(v.publishedAt))}</time>
<div class="puzzles">${puzzles}</div>
</li>`;
}

async function main() {
  const videos = await loadVideos();
  const entries = videos
    .map((v) => ({ v, links: puzzleLinks(v.description) }))
    .filter((e) => e.links.length > 0);

  const template = await readFile(new URL('site/index.html', root), 'utf8');
  const updated = dateFormat.format(new Date());
  const html = template
    .replaceAll('{{count}}', entries.length.toLocaleString('en-GB'))
    .replaceAll('{{updated}}', updated)
    .replace('{{videos}}', entries.map((e) => renderVideo(e.v, e.links)).join('\n'));

  await mkdir(dist, { recursive: true });
  await writeFile(new URL('index.html', dist), html);
  await copyFile(new URL('site/style.css', root), new URL('style.css', dist));
  await copyFile(new URL('site/search.js', root), new URL('search.js', dist));
  console.log(`Built dist/index.html with ${entries.length} of ${videos.length} videos`);
}

if (import.meta.main) await main();
