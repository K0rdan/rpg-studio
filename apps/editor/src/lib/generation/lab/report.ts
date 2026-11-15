import {
  BASELINE_GENERATION_VARIANT_ID,
  BASELINE_POST_VARIANT_ID,
} from './definitions';
import type { LabRawResult, LabResults } from './runner';

/**
 * Objective metrics. `better` tells how a delta against the baseline is read:
 * `lower`/`higher` are monotonic, `one` means closer to 1 is better.
 */
export const SUMMARY_METRICS = [
  { key: 'copyScore', label: 'copy vs ref', better: 'lower', digits: 2 },
  { key: 'rawCopyScore', label: 'raw copy vs ref', better: 'lower', digits: 2 },
  { key: 'isolatedPixelRatio', label: 'isolated px', better: 'lower', digits: 3 },
  { key: 'meanRegionSize', label: 'mean region px', better: 'higher', digits: 1 },
  { key: 'seamRatio', label: 'seam ratio', better: 'one', digits: 2 },
  { key: 'internalRepeat', label: 'internal repeat', better: 'lower', digits: 2 },
  { key: 'rawInternalRepeat', label: 'raw internal repeat', better: 'lower', digits: 2 },
  { key: 'colourCount', label: 'colours', better: 'lower', digits: 1 },
  { key: 'reviewPassRate', label: 'review pass', better: 'higher', digits: 2 },
] as const;

export type SummaryMetricKey = typeof SUMMARY_METRICS[number]['key'];

export interface SummaryRow {
  generationVariantId: string;
  postVariantId: string;
  samples: number;
  failures: number;
  metrics: Partial<Record<SummaryMetricKey, number>>;
}

function mean(values: number[]): number | undefined {
  return values.length === 0
    ? undefined
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Averages every metric over cases and repeats for each variant pair. */
export function summarise(results: LabResults): SummaryRow[] {
  const rows: SummaryRow[] = [];
  const generationIds = [...new Set(results.raws.map((raw) => raw.generationVariantId))];
  for (const generationVariantId of generationIds) {
    const raws = results.raws.filter((raw) => raw.generationVariantId === generationVariantId);
    const failures = raws.filter((raw) => raw.error).length;
    for (const post of results.manifest.postVariants) {
      const cells = raws.flatMap((raw) => raw.posts
        .filter((candidate) => candidate.postVariantId === post.id)
        .map((candidate) => ({ raw, post: candidate })));
      const collect = (read: (cell: typeof cells[number]) => number | undefined) => (
        mean(cells.map(read).filter((value): value is number => value !== undefined))
      );
      rows.push({
        generationVariantId,
        postVariantId: post.id,
        samples: cells.length,
        failures,
        metrics: {
          copyScore: collect((cell) => cell.post.vsReference?.copyScore),
          rawCopyScore: collect((cell) => cell.raw.rawVsReference?.copyScore),
          isolatedPixelRatio: collect((cell) => cell.post.metrics.isolatedPixelRatio),
          meanRegionSize: collect((cell) => cell.post.metrics.meanRegionSize),
          seamRatio: collect((cell) => cell.post.metrics.seamRatio),
          internalRepeat: collect((cell) => cell.post.metrics.internalRepeat),
          rawInternalRepeat: collect((cell) => cell.raw.rawMetrics?.internalRepeat),
          colourCount: collect((cell) => cell.post.metrics.colourCount),
          reviewPassRate: collect((cell) => (cell.post.reviewPassed ? 1 : 0)),
        },
      });
    }
  }
  return rows;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMetric(value: number | undefined, digits: number): string {
  return value === undefined ? '—' : value.toFixed(digits);
}

type Direction = 'good' | 'bad' | 'same';

function judge(
  better: typeof SUMMARY_METRICS[number]['better'],
  value: number | undefined,
  baseline: number | undefined,
): Direction {
  if (value === undefined || baseline === undefined) {
    return 'same';
  }
  const tolerance = Math.max(0.01, Math.abs(baseline) * 0.05);
  const distance = (x: number) => (better === 'one' ? Math.abs(x - 1) : x);
  const delta = distance(value) - distance(baseline);
  if (Math.abs(delta) <= tolerance) {
    return 'same';
  }
  const improved = better === 'higher' ? delta > 0 : delta < 0;
  return improved ? 'good' : 'bad';
}

function summaryTable(rows: SummaryRow[]): string {
  const baseline = rows.find((row) => (
    row.generationVariantId === BASELINE_GENERATION_VARIANT_ID
    && row.postVariantId === BASELINE_POST_VARIANT_ID
  ));
  const arrow = (better: typeof SUMMARY_METRICS[number]['better']) => (
    better === 'one' ? '→ 1' : better === 'lower' ? '↓' : '↑'
  );
  const header = SUMMARY_METRICS
    .map((metric) => `<th>${metric.label}<br /><small>${arrow(metric.better)}</small></th>`)
    .join('');
  const body = rows.map((row) => {
    const cells = SUMMARY_METRICS.map((metric) => {
      const value = row.metrics[metric.key];
      const verdict = judge(metric.better, value, baseline?.metrics[metric.key]);
      const cssClass = row === baseline ? '' : verdict;
      return `<td class="${cssClass}">${formatMetric(value, metric.digits)}</td>`;
    }).join('');
    const failed = row.failures ? ` (${row.failures} failed)` : '';
    return `<tr><th>${escapeHtml(row.generationVariantId)}</th><th>${escapeHtml(row.postVariantId)}</th><td>${row.samples}${failed}</td>${cells}</tr>`;
  }).join('');
  return `<table class="summary"><thead><tr><th>generation</th><th>post-process</th><th>n</th>${header}</tr></thead><tbody>${body}</tbody></table>
  <p class="hint">Green/red compare with <b>${BASELINE_GENERATION_VARIANT_ID} + ${BASELINE_POST_VARIANT_ID}</b> (5% tolerance). Metrics guide the eye; the visual ratings below decide.</p>`;
}

const CRITERIA = {
  raw: [
    ['R1', 'Material is what was asked'],
    ['R2', 'Independent from the reference'],
  ],
  post: [
    ['R3', 'Readable at 32px'],
    ['R4', 'Tiles without seam or visible repeat'],
    ['R5', 'Matches the reference style'],
  ],
} as const;

function ratingSelects(
  key: string,
  criteria: ReadonlyArray<readonly [string, string]>,
): string {
  const options = [0, 1, 2, 3].map((value) => `<option value="${value}">${value}</option>`).join('');
  return criteria
    .map(([id, label]) => `<label title="${escapeHtml(label)}">${id}
    <select data-key="${escapeHtml(key)}" data-criterion="${id}"><option value="">·</option>${options}</select></label>`)
    .join('');
}

function metricLine(raw: LabRawResult['rawMetrics']): string {
  return raw
    ? `${raw.width}×${raw.height} · ${raw.colourCount} col · repeat ${raw.internalRepeat.toFixed(2)}`
    : '';
}

function rawCard(raw: LabRawResult): string {
  const key = `raw|${raw.caseId}|${raw.generationVariantId}|${raw.repeat}`;
  if (raw.error) {
    return `<div class="card error">${escapeHtml(raw.error)}</div>`;
  }
  const copy = raw.rawVsReference ? ` · copy ${raw.rawVsReference.copyScore.toFixed(2)}` : '';
  const links = raw.promptFile
    ? `<a class="meta" href="${raw.promptFile}">prompt</a> <a class="meta" href="${raw.inputFile}">input</a>`
    : '';
  return `<div class="card">
    <a href="${raw.rawFile}"><img class="raw" src="${raw.rawFile}" alt="raw" /></a>
    <div class="meta">${metricLine(raw.rawMetrics)}${copy}</div>
    <div class="rate">${ratingSelects(key, CRITERIA.raw)}</div>
    ${links}
  </div>`;
}

function postCard(raw: LabRawResult, postId: string): string {
  const post = raw.posts.find((candidate) => candidate.postVariantId === postId);
  if (!post) {
    return '<div class="card"></div>';
  }
  const key = `post|${raw.caseId}|${raw.generationVariantId}|${raw.repeat}|${postId}`;
  const metrics = post.metrics;
  const copy = post.vsReference ? ` · copy ${post.vsReference.copyScore.toFixed(2)}` : '';
  return `<div class="card">
    <div class="pair"><img class="tile" src="${post.file}" alt="tile" /><img class="tiled" src="${post.tiledFile}" alt="3×3 tiling" /></div>
    <div class="meta">${metrics.colourCount} col · seam ${metrics.seamRatio.toFixed(2)} · iso ${metrics.isolatedPixelRatio.toFixed(2)} · region ${metrics.meanRegionSize.toFixed(1)}${copy}</div>
    <div class="rate">${ratingSelects(key, CRITERIA.post)}</div>
  </div>`;
}

function caseSection(results: LabResults, caseId: string): string {
  const manifestCase = results.manifest.cases.find((candidate) => candidate.id === caseId);
  const raws = results.raws.filter((raw) => raw.caseId === caseId);
  const references = (manifestCase?.references ?? [])
    .map((_, index) => `<img class="ref" src="references/${caseId}/ref-${index}.png" alt="reference ${index}" />`)
    .join('');
  const head = results.manifest.postVariants
    .map((post) => `<th>${escapeHtml(post.id)}</th>`)
    .join('');
  const body = raws.map((raw) => `<tr>
    <th>${escapeHtml(raw.generationVariantId)}<br />r${raw.repeat}</th>
    <td>${rawCard(raw)}</td>
    ${results.manifest.postVariants.map((post) => `<td>${raw.error ? '' : postCard(raw, post.id)}</td>`).join('')}
  </tr>`).join('');
  const referenceLine = references ? `· reference sent: ${references}` : '· no reference';
  return `<section>
    <h2>${escapeHtml(manifestCase?.label ?? caseId)}</h2>
    <p class="meta">“${escapeHtml(manifestCase?.subjectDescription ?? '')}” ${referenceLine}</p>
    <table class="grid"><thead><tr><th></th><th>raw</th>${head}</tr></thead><tbody>${body}</tbody></table>
  </section>`;
}

const CLIENT_SCRIPT = `
const storeKey = 'generation-lab:' + document.body.dataset.run;
const ratings = JSON.parse(localStorage.getItem(storeKey) || '{}');
const selects = [...document.querySelectorAll('select[data-key]')];
function mean(values) { return values.reduce((a, b) => a + b, 0) / values.length; }
function render() {
  const groups = new Map();
  for (const [key, scores] of Object.entries(ratings)) {
    const parts = key.split('|');
    const group = parts[0] === 'raw' ? 'raw|' + parts[2] : 'post|' + parts[2] + '|' + parts[4];
    if (!groups.has(group)) groups.set(group, {});
    for (const [criterion, value] of Object.entries(scores)) {
      (groups.get(group)[criterion] ||= []).push(Number(value));
    }
  }
  const cell = (values) => values ? mean(values).toFixed(2) + ' <small>(' + values.length + ')</small>' : '—';
  const rows = [...groups.entries()].sort().map(([group, scores]) => {
    const [stage, ...rest] = group.split('|');
    return '<tr><th>' + stage + '</th><th>' + rest.join(' + ') + '</th>' +
      ['R1','R2','R3','R4','R5'].map((c) => '<td>' + cell(scores[c]) + '</td>').join('') + '</tr>';
  }).join('');
  document.getElementById('ratings-summary').innerHTML = rows ||
    '<tr><td colspan="7">No rating yet. Score each image 0 (bad) to 3 (excellent).</td></tr>';
}
for (const select of selects) {
  const saved = ratings[select.dataset.key]?.[select.dataset.criterion];
  if (saved !== undefined) select.value = saved;
  select.addEventListener('change', () => {
    const entry = ratings[select.dataset.key] ||= {};
    if (select.value === '') delete entry[select.dataset.criterion];
    else entry[select.dataset.criterion] = Number(select.value);
    localStorage.setItem(storeKey, JSON.stringify(ratings));
    render();
  });
}
document.getElementById('export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(ratings, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'ratings.json';
  link.click();
});
render();
`;

export function renderReport(results: LabResults): string {
  const { manifest } = results;
  const caseIds = [...new Set(results.raws.map((raw) => raw.caseId))];
  const rows = summarise(results);
  const imageModel = manifest.imageModel ? ` (${escapeHtml(String(manifest.imageModel))})` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Generation lab — ${escapeHtml(manifest.runId)}</title>
<style>
  body { font-family: sans-serif; margin: 24px; background: #111; color: #eee; }
  h1 { font-size: 18px; } h2 { font-size: 15px; margin-top: 36px; }
  table { border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #333; padding: 4px 8px; vertical-align: top; text-align: left; }
  .summary td.good { background: #12351f; } .summary td.bad { background: #4a1c1c; }
  .hint, .meta { font-size: 12px; color: #999; }
  .grid td { background: #181818; }
  .card { width: 300px; } .card.error { color: #f88; width: 200px; }
  img { image-rendering: pixelated; background: #333; }
  img.raw { width: 256px; height: 256px; image-rendering: auto; }
  img.tile { width: 96px; height: 96px; } img.tiled { width: 192px; height: 192px; }
  img.ref { width: 64px; height: 64px; vertical-align: middle; margin-left: 8px; }
  .pair { display: flex; gap: 8px; align-items: flex-start; }
  .rate { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; font-size: 11px; }
  select { background: #222; color: #eee; border: 1px solid #444; }
  button { margin: 8px 0; }
</style>
</head>
<body data-run="${escapeHtml(manifest.runId)}">
<h1>Generation lab — ${escapeHtml(manifest.runId)}</h1>
<p class="meta">${escapeHtml(manifest.createdAt)} · model ${escapeHtml(manifest.model)}${imageModel} · ${manifest.repeats} repeat(s) · ${manifest.cases.length} case(s)</p>
<h2>Objective metrics (mean over cases and repeats)</h2>
${summaryTable(rows)}
<h2>Visual ratings (saved in this browser)</h2>
<p class="hint">R1 material · R2 independence from reference · R3 readable at 32px · R4 tiling · R5 style match. 0 bad … 3 excellent.</p>
<table class="summary"><thead><tr><th>stage</th><th>variant</th><th>R1</th><th>R2</th><th>R3</th><th>R4</th><th>R5</th></tr></thead><tbody id="ratings-summary"></tbody></table>
<button id="export">Export ratings.json</button>
${caseIds.map((caseId) => caseSection(results, caseId)).join('\n')}
<script>${CLIENT_SCRIPT}</script>
</body>
</html>
`;
}

/** Markdown diff of two runs' summaries, matched by variant ids. */
export function compareRuns(left: LabResults, right: LabResults): string {
  const leftRows = summarise(left);
  const rightRows = summarise(right);
  const labels = SUMMARY_METRICS.map((metric) => metric.label).join(' | ');
  const lines = [
    `| generation | post | ${labels} |`,
    `| --- | --- | ${SUMMARY_METRICS.map(() => '---').join(' | ')} |`,
  ];
  for (const row of rightRows) {
    const match = leftRows.find((candidate) => (
      candidate.generationVariantId === row.generationVariantId
      && candidate.postVariantId === row.postVariantId
    ));
    if (!match) {
      continue;
    }
    const cells = SUMMARY_METRICS.map((metric) => {
      const before = match.metrics[metric.key];
      const after = row.metrics[metric.key];
      if (before === undefined || after === undefined) {
        return '—';
      }
      const verdict = judge(metric.better, after, before);
      const mark = verdict === 'good' ? '✅' : verdict === 'bad' ? '❌' : '';
      return `${before.toFixed(metric.digits)} → ${after.toFixed(metric.digits)} ${mark}`.trim();
    });
    lines.push(`| ${row.generationVariantId} | ${row.postVariantId} | ${cells.join(' | ')} |`);
  }
  return lines.join('\n');
}
