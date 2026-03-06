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
  };

  const XLSX: {
    read(data: Buffer, options?: Record<string, unknown>): {
      SheetNames: string[];
      Sheets: Record<string, unknown>;
    };
    SSF: typeof SSF;
    utils: typeof utils;
  };

  export default XLSX;
}
