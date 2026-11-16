# Cracking the Cryptic puzzles

A static site listing every sudoku video from
[Cracking the Cryptic](https://www.youtube.com/@CrackingTheCryptic) that links a puzzle on
[SudokuPad](https://sudokupad.app), with its title, thumbnail and length, and links to both the
video and the puzzle.

## How it works

- `scripts/fetch.ts` reads the channel's uploads from the YouTube Data API v3 and stores every
  video, including the full description, in `data/videos/<year>.json` (newest first). The fetch is incremental: it reads
  the uploads newest first, stops at the first page with no new videos, and only requests details
  for videos that aren't stored yet. Videos without a puzzle link are stored too, so they aren't
  fetched again. Upcoming and live streams are skipped until they have finished.
- `scripts/build.ts` picks the videos whose description contains a link to `sudokupad.app` (or a subdomain such as `beta.sudokupad.app`) and
  renders `dist/index.html` from the template in `site/`. Puzzle links are extracted at build
  time, so changing the extraction never needs a refetch.
- `.github/workflows/pages.yml` runs daily (and on push to `main`): it fetches new videos,
  commits the updated data, builds the site and deploys it to GitHub Pages.

## Requirements

- Node.js 24 or later. There are no dependencies to install.
- A YouTube Data API v3 key in `YOUTUBE_API_KEY`. Create one in the
  [Google Cloud console](https://console.cloud.google.com/apis/credentials) for a project with the
  YouTube Data API v3 enabled. The fetch uses a few API units per day, and the first full fetch
  uses a few hundred, well within the default daily quota.

## Usage

```sh
YOUTUBE_API_KEY=... npm run fetch   # fetch new videos into data/
npm run build                       # build the site into dist/
npm test                            # run the unit tests
```

`node scripts/fetch.ts --full` scans the whole uploads playlist instead of stopping at the first
page without new videos. It still only fetches details for videos that aren't stored.

## Deploying

1. Add the API key as the repository secret `YOUTUBE_API_KEY`.
2. Under Settings → Pages, set the source to GitHub Actions.
3. Push to `main`, or run the workflow by hand from the Actions tab.
