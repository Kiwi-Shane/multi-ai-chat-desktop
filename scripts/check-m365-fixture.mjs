import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = path.join(root, 'fixtures', 'm365', 'synthetic-review.docx');
const manifestPath = path.join(root, 'fixtures', 'm365', 'manifest.json');

const fixture = await readFile(fixturePath);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const sha256 = createHash('sha256').update(fixture).digest('hex');
const text = fixture.toString('utf8');

const expectedStatements = [
  'Synthetic device codename: BIRCH-47.',
  'Declared surface temperature limit: 41.7 degrees Celsius.',
  'Single-fault scenarios reviewed: 17.',
  'Deliberate review issue: the submission-readiness statement is unsupported.',
];

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

requireCondition(fixture.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])), 'fixture is not a ZIP/DOCX file');
requireCondition(manifest.schemaVersion === 1, 'manifest.schemaVersion must be 1');
requireCondition(manifest.classification === 'synthetic_public', 'manifest.classification must be synthetic_public');
requireCondition(manifest.file === 'synthetic-review.docx', 'manifest.file mismatch');
requireCondition(manifest.containsRealData === false, 'manifest must state containsRealData=false');
requireCondition(/^[0-9a-f]{64}$/.test(manifest.sha256), 'manifest.sha256 must be lowercase SHA-256');
requireCondition(sha256 === manifest.sha256, `fixture SHA-256 mismatch: actual=${sha256} expected=${manifest.sha256}`);

for (const statement of expectedStatements) {
  requireCondition(text.includes(statement), `fixture is missing expected statement: ${statement}`);
}
for (const fact of ['BIRCH-47', '41.7', '17']) {
  requireCondition(manifest.expectedFacts.includes(fact), `manifest.expectedFacts is missing ${fact}`);
}

const prohibited = [
  { pattern: /[A-Z]:\\/i, label: 'absolute Windows path' },
  { pattern: /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/, label: 'email address' },
  { pattern: /Consulting/i, label: 'Consulting path or identifier' },
];
for (const { pattern, label } of prohibited) {
  requireCondition(!pattern.test(text), `fixture contains prohibited ${label}`);
}

console.log(`M365 fixture check passed (${fixture.length} bytes, sha256=${sha256})`);
