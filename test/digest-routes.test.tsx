import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const base = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

const line = (job: string, status: string, at: string) =>
  JSON.stringify({ at, job, status, owner: 'ana', ...(status === 'fail' ? { error: 'boom' } : {}) });

// Written out of job order on purpose, so sorting is the route's doing.
const GOOD = [
  line('zeta-sync', 'ok', '2026-10-28T01:00:00+01:00'),
  line('alpha-backup', 'ok', '2026-10-28T02:00:00+01:00'),
  line('mid-report', 'ok', '2026-10-28T03:00:00+01:00'),
].join('\n') + '\n';

const BAD = GOOD + 'this is not json\n';

let dir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, '2026-10-01.jsonl'), GOOD);
  writeFileSync(join(dir, '2026-10-02.jsonl'), '');
  writeFileSync(join(dir, '2026-10-03.jsonl'), BAD);
  app = createApp({ ...base, runsDir: dir });
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('GET /digest/:night', () => {
  it('returns 200 HTML with the lane banner and every job of a good night', async () => {
    process.env.LANE_MARKER = 'TEST-MARKER';
    const res = await app.request('/digest/2026-10-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(html).toContain('TEST-MARKER');
    for (const job of ['alpha-backup', 'mid-report', 'zeta-sync']) expect(html).toContain(job);
    expect(html).not.toContain('could not be read');
  });

  it('returns 404 for a night with no file', async () => {
    const res = await app.request('/digest/2026-10-09');
    expect(res.status).toBe(404);
  });

  it('says nothing ran for an empty night', async () => {
    const res = await app.request('/digest/2026-10-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('reports one unreadable line and still shows the rows', async () => {
    const res = await app.request('/digest/2026-10-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('1 line could not be read');
    for (const job of ['alpha-backup', 'mid-report', 'zeta-sync']) expect(html).toContain(job);
  });
});

describe('GET /api/digest/:night', () => {
  it('returns 200 JSON with night, rows, badLines and counts for a good night', async () => {
    const res = await app.request('/api/digest/2026-10-01');
    const body = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(body.night).toBe('2026-10-01');
    expect(body.rows.map((r) => r.job)).toEqual(['alpha-backup', 'mid-report', 'zeta-sync']);
    expect(body.badLines).toBe(0);
    expect(body.counts).toEqual({ ok: 3, retry: 0, fail: 0 });
  });

  it('returns 404 with an error message for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-10-09');
    const body = (await res.json()) as { error: unknown };
    expect(res.status).toBe(404);
    expect(typeof body.error).toBe('string');
  });

  it('returns no rows and zero bad lines for an empty night', async () => {
    const res = await app.request('/api/digest/2026-10-02');
    const body = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });

  it('counts one bad line and keeps the rows', async () => {
    const res = await app.request('/api/digest/2026-10-03');
    const body = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(body.badLines).toBe(1);
    expect(body.rows).toHaveLength(3);
  });
});

describe('digest page and JSON', () => {
  it('list the jobs in the same order', async () => {
    const html = await (await app.request('/digest/2026-10-01')).text();
    const json = (await (await app.request('/api/digest/2026-10-01')).json()) as Night;
    const jobs = json.rows.map((r) => r.job);
    const positions = jobs.map((j) => html.indexOf(j));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
