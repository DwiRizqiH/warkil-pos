// Excel reads a UTF-8 CSV with a BOM as the local encoding, so "Rp" and names survive the export.
const BOM = '﻿';

// A cell starting with =, +, - or @ is executed as a formula by Excel; the leading quote keeps it text.
function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export const toCsv = (rows) => BOM + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');

export function downloadCsv(filename, rows) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
