import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

const row = (night: NonNullable<ReturnType<typeof readNight>>, job: string) => night.rows.find((r) => r.job === job);

describe('readNight on runs/2026-10-28.jsonl', () => {
  const night = readNight('runs', '2026-10-28');

  it('has 5 jobs, sorted, and 1 bad line', () => {
    expect(night).not.toBeNull();
    expect(night!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(night!.badLines).toBe(1);
    expect(night!.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
  });

  it('fixtures/refresh retried 3 times and ended ok', () => {
    expect(row(night!, 'fixtures/refresh')).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
  });

  it('notes/backup failed with its error', () => {
    const r = row(night!, 'notes/backup');
    expect(r?.lastStatus).toBe('fail');
    expect(r?.lastError).toBe('quota exceeded');
  });

  it('digest/render keeps a null owner', () => {
    const r = row(night!, 'digest/render');
    expect(r).toBeDefined();
    expect(r!.owner).toBeNull();
  });
});

describe('readNight edge cases', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));

  it('returns null when the night has no file', () => {
    expect(readNight(dir, '2026-01-01')).toBeNull();
  });

  it('reads an empty file as a night with no rows', () => {
    writeFileSync(join(dir, '2026-01-02.jsonl'), '');
    expect(readNight(dir, '2026-01-02')).toEqual({
      night: '2026-01-02',
      rows: [],
      badLines: 0,
      counts: { ok: 0, retry: 0, fail: 0 },
    });
  });

  it('counts invalid lines and ignores blank ones', () => {
    writeFileSync(
      join(dir, '2026-01-03.jsonl'),
      [
        '{"at":"t1","job":"a","status":"ok","owner":null}',
        '',
        '   ',
        'null',
        '[]',
        '{"at":"t2","job":"a","status":"done","owner":null}',
        '{"at":"t3","job":"a","status":"ok"}',
        '{"at":"t4","job":"a","status":"ok","owner":null,"error":5}',
        '',
      ].join('\n'),
    );
    const night = readNight(dir, '2026-01-03');
    expect(night?.badLines).toBe(5);
    expect(night?.rows).toHaveLength(1);
  });

  it('rejects a night that is not YYYY-MM-DD', () => {
    expect(readNight(dir, '../runs/2026-10-28')).toBeNull();
    expect(readNight('runs', '2026-10-28.jsonl')).toBeNull();
  });
});
