import { test } from 'node:test';
import assert from 'node:assert/strict';
import { puzzleLinks, formatDuration } from './build.ts';

test('extracts SudokuPad puzzle links from a description', () => {
  const description = [
    'Play the puzzle here: https://sudokupad.app/c2f1n9ks0w.',
    'Again (https://sudokupad.app/c2f1n9ks0w)',
    'Second: https://www.sudokupad.app/sudoku/abc?setting-x=1',
    'Beta: https://beta.sudokupad.app/Gnb2TrBHnF',
    'App home: https://sudokupad.app/',
    'Other: https://example.com/c2f1n9ks0w',
  ].join('\n');
  assert.deepEqual(puzzleLinks(description), [
    'https://sudokupad.app/c2f1n9ks0w',
    'https://www.sudokupad.app/sudoku/abc?setting-x=1',
    'https://beta.sudokupad.app/Gnb2TrBHnF',
  ]);
});

test('returns no links when the description has none', () => {
  assert.deepEqual(puzzleLinks('No puzzle today'), []);
});

test('formats ISO 8601 durations', () => {
  assert.equal(formatDuration('PT45S'), '0:45');
  assert.equal(formatDuration('PT27M3S'), '27:03');
  assert.equal(formatDuration('PT1H2M'), '1:02:00');
  assert.equal(formatDuration('P1DT1H'), '25:00:00');
});
