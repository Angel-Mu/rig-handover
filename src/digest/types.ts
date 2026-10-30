export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

export type DigestRow = {
  job: string;
  owner: string | null;
  // Every line for the job, retries included.
  runs: number;
  // Lines with status `retry`.
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  // `at` as written in the log, offset kept.
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string;
  // Sorted by job.
  rows: DigestRow[];
  // Lines that did not parse; counted, never thrown.
  badLines: number;
  // Lines per status across the night, for the board.
  counts: Record<RunStatus, number>;
};

/**
 * Reads `<runsDir>/<night>.jsonl`. Returns `null` when the night has no file, so routes can 404;
 * an empty file is a Night with no rows. Never throws on a bad line.
 */
export type ReadNight = (runsDir: string, night: string) => Night | null;
