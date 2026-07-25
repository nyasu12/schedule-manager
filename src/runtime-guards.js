function trimValue(value, max = 5000) {
  return String(value ?? '').trim().slice(0, max);
}

export function normalizeTime(value) {
  const v = trimValue(value, 5);
  const match = v.match(/^(\d{2}):(\d{2})$/);
  if (!match) return '';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 ? v : '';
}

export function normalizeDate(value) {
  const v = trimValue(value, 10);
  const match = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return '';
  return v;
}

export function validatedDate(value, label, required = false) {
  const raw = trimValue(value, 10);
  if (!raw) {
    if (required) throw new Error(`${label}を入力してください。`);
    return '';
  }
  const normalized = normalizeDate(raw);
  if (!normalized) throw new Error(`${label}が正しくありません。YYYY-MM-DD形式の実在する日付を入力してください。`);
  return normalized;
}

export function validatedTime(value, label) {
  const raw = trimValue(value, 5);
  if (!raw) return '';
  const normalized = normalizeTime(raw);
  if (!normalized) throw new Error(`${label}が正しくありません。00:00〜23:59で入力してください。`);
  return normalized;
}

export function detectFileType(buffer) {
  const bytes = new Uint8Array(buffer);
  const ascii = (start, length) => String.fromCharCode(...bytes.subarray(start, start + length));
  if (bytes.length >= 5 && ascii(0, 5) === '%PDF-') return { mime: 'application/pdf', kind: 'pdf' };
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: 'image/jpeg', kind: 'jpeg' };
  if (bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((v, i) => bytes[i] === v)) return { mime: 'image/png', kind: 'png' };
  if (bytes.length >= 6 && ['GIF87a','GIF89a'].includes(ascii(0, 6))) return { mime: 'image/gif', kind: 'gif' };
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return { mime: 'image/webp', kind: 'webp' };
  if (bytes.length >= 12 && ascii(4, 4) === 'ftyp') {
    const brand = ascii(8, 4).toLowerCase();
    if (['heic','heix','hevc','hevx','heim','heis'].includes(brand)) return { mime: 'image/heic', kind: 'heic' };
    if (['mif1','msf1'].includes(brand)) return { mime: 'image/heif', kind: 'heif' };
  }
  return null;
}

export function fileExtensionMatchesType(ext, detected) {
  const normalized = String(ext || '').toLowerCase();
  if (!detected) return false;
  if (detected.kind === 'jpeg') return normalized === 'jpg' || normalized === 'jpeg';
  if (detected.kind === 'heic' || detected.kind === 'heif') return normalized === 'heic' || normalized === 'heif';
  return normalized === detected.kind;
}

export function assertUniqueScheduleDates(rows) {
  const seen = new Set();
  for (const row of rows || []) {
    const date = normalizeDate(row?.schedule?.date ?? row?.date);
    if (!date) continue;
    if (seen.has(date)) throw new Error(`同じ日付（${date}）の予定が一括保存内で重複しています。`);
    seen.add(date);
  }
}
