/**
 * Neutralizes spreadsheet formula triggers and safely escapes CSV cells.
 */
export function escapeCsvCell(
  value: string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  const raw = String(value);
  const safe = /^[\s\u0000-\u001F]*[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Triggers a UTF-8 BOM CSV file download via Blob + Object URL.
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
