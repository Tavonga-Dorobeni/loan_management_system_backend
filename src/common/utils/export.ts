import type { Response } from 'express';
import XLSX from 'xlsx';

export type ReportFormat = 'json' | 'csv' | 'xlsx';

const escapeCsvValue = (value: unknown): string => {
  const stringValue =
    value === null || value === undefined ? '' : String(value);
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
};

export const toCsvBuffer = (rows: Record<string, unknown>[]): Buffer => {
  if (rows.length === 0) {
    return Buffer.from('');
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvValue(row[header])).join(',')
    ),
  ].join('\n');

  return Buffer.from(csv, 'utf-8');
};

export const toXlsxBuffer = (rows: Record<string, unknown>[]): Buffer => {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

export const sendAttachment = (
  res: Response,
  {
    contentType,
    extension,
    fileName,
    buffer,
  }: {
    contentType: string;
    extension: string;
    fileName: string;
    buffer: Buffer;
  }
): Response => {
  const timestamp = new Date().toISOString().replace(/[:]/g, '-');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${fileName}-${timestamp}.${extension}"`
  );
  res.setHeader('Content-Type', contentType);
  return res.status(200).send(buffer);
};
