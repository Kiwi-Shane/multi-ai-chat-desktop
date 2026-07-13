import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureDir = path.join(root, 'fixtures', 'm365');
const fixturePath = path.join(fixtureDir, 'synthetic-review.docx');
const manifestPath = path.join(fixtureDir, 'manifest.json');

const FACTS = [
  'Synthetic device codename: BIRCH-47.',
  'Declared surface temperature limit: 41.7 degrees Celsius.',
  'Single-fault scenarios reviewed: 17.',
  'Deliberate review issue: the submission-readiness statement is unsupported.',
];

const utf8 = (value) => Buffer.from(value, 'utf8');

const entries = [
  {
    name: '[Content_Types].xml',
    data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
`),
  },
  {
    name: '_rels/.rels',
    data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
`),
  },
  {
    name: 'word/document.xml',
    data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Synthetic M365 Tauri Feasibility Fixture</w:t></w:r></w:p>
${FACTS.map((fact) => `    <w:p><w:r><w:t>${fact}</w:t></w:r></w:p>`).join('\n')}
    <w:sectPr/>
  </w:body>
</w:document>
`),
  },
  {
    name: 'word/_rels/document.xml.rels',
    data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>
`),
  },
];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  const buffer = Buffer.allocUnsafe(2);
  buffer.writeUInt16LE(value & 0xffff, 0);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.allocUnsafe(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

function buildStoredZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const flags = 0x0800;
  const method = 0;
  const dosTime = 0;
  const dosDate = ((2026 - 1980) << 9) | (7 << 5) | 13;

  for (const file of files) {
    const name = utf8(file.name);
    const checksum = crc32(file.data);
    const localHeader = Buffer.concat([
      u32(0x04034b50), u16(20), u16(flags), u16(method), u16(dosTime), u16(dosDate),
      u32(checksum), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), name,
    ]);
    localParts.push(localHeader, file.data);

    const centralHeader = Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(flags), u16(method), u16(dosTime), u16(dosDate),
      u32(checksum), u32(file.data.length), u32(file.data.length), u16(name.length),
      u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ]);
    centralParts.push(centralHeader);
    offset += localHeader.length + file.data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endOfCentralDirectory = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(centralDirectory.length), u32(offset), u16(0),
  ]);
  return Buffer.concat([...localParts, centralDirectory, endOfCentralDirectory]);
}

await mkdir(fixtureDir, { recursive: true });
const docx = buildStoredZip(entries);
const sha256 = createHash('sha256').update(docx).digest('hex');
const manifest = {
  schemaVersion: 1,
  classification: 'synthetic_public',
  file: 'synthetic-review.docx',
  sha256,
  expectedFacts: ['BIRCH-47', '41.7', '17'],
  containsRealData: false,
};

await writeFile(fixturePath, docx);
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Generated ${path.relative(root, fixturePath)} (${docx.length} bytes, sha256=${sha256})`);
