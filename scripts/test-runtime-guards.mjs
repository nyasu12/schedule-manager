import assert from 'node:assert/strict';
import {
  assertUniqueScheduleDates,
  detectFileType,
  fileExtensionMatchesType,
  normalizeDate,
  normalizeTime,
  validatedDate,
  validatedTime,
} from '../src/runtime-guards.js';

assert.equal(normalizeDate('2026-02-28'), '2026-02-28');
assert.equal(normalizeDate('2026-02-30'), '');
assert.equal(normalizeDate('2024-02-29'), '2024-02-29');
assert.equal(normalizeDate('2025-02-29'), '');
assert.throws(() => validatedDate('2026-13-01', '開始日', true), /実在する日付/);
assert.throws(() => validatedDate('', '開始日', true), /入力してください/);

assert.equal(normalizeTime('00:00'), '00:00');
assert.equal(normalizeTime('23:59'), '23:59');
assert.equal(normalizeTime('24:00'), '');
assert.equal(normalizeTime('12:60'), '');
assert.throws(() => validatedTime('25:10', '開始時刻'), /00:00〜23:59/);

const pdf = new TextEncoder().encode('%PDF-1.7 sample').buffer;
const png = Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00]).buffer;
const jpeg = Uint8Array.from([0xff,0xd8,0xff,0xdb,0x00]).buffer;
assert.deepEqual(detectFileType(pdf), { mime: 'application/pdf', kind: 'pdf' });
assert.deepEqual(detectFileType(png), { mime: 'image/png', kind: 'png' });
assert.deepEqual(detectFileType(jpeg), { mime: 'image/jpeg', kind: 'jpeg' });
assert.equal(fileExtensionMatchesType('pdf', detectFileType(pdf)), true);
assert.equal(fileExtensionMatchesType('jpg', detectFileType(jpeg)), true);
assert.equal(fileExtensionMatchesType('png', detectFileType(jpeg)), false);
assert.equal(detectFileType(new Uint8Array([1,2,3,4]).buffer), null);

assert.doesNotThrow(() => assertUniqueScheduleDates([
  { schedule: { date: '2026-08-15' } },
  { schedule: { date: '2026-10-27' } },
]));
assert.throws(() => assertUniqueScheduleDates([
  { schedule: { date: '2026-08-15' } },
  { schedule: { date: '2026-08-15' } },
]), /重複/);

console.log('runtime guard regression tests: PASS');
