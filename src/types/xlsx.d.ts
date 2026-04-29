declare module 'xlsx' {
  export const SSF: {
    parse_date_code(
      value: number
    ): { y: number; m: number; d: number; H: number; M: number; S: number } | null;
  };

  export const utils: {
    sheet_to_json<T = unknown>(
      sheet: unknown,
      options?: Record<string, unknown>
    ): T[];
    json_to_sheet(rows: Record<string, unknown>[]): unknown;
    book_new(): unknown;
    book_append_sheet(workbook: unknown, worksheet: unknown, name: string): void;
  };

  const XLSX: {
    read(data: Buffer, options?: Record<string, unknown>): {
      SheetNames: string[];
      Sheets: Record<string, unknown>;
    };
    SSF: typeof SSF;
    utils: typeof utils;
    write(
      workbook: unknown,
      options: { type: 'buffer'; bookType: 'xlsx' }
    ): Buffer;
  };

  export default XLSX;
}
