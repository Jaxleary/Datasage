import type {
  CategorySummary,
  CellValue,
  ChartConfig,
  ColumnKind,
  ColumnProfile,
  CsvRow,
  DataProfile,
  NumericSummary,
} from "@/lib/types";

const MISSING = new Set(["", "na", "n/a", "null", "undefined", "-"]);
const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function clean(value: CellValue): string {
  return String(value ?? "").trim();
}

function isMissing(value: CellValue): boolean {
  return MISSING.has(clean(value).toLowerCase());
}

function parseNumber(value: CellValue): number | null {
  const text = clean(value).replace(/[$,%\s,]/g, "");
  if (!text || !/^-?(?:\d+\.?\d*|\.\d+)$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function parseDate(value: CellValue): Date | null {
  const text = clean(value);
  if (!text || /^\d+(\.\d+)?$/.test(text)) return null;
  const date = new Date(text);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function inferColumnKind(values: CellValue[]): ColumnKind {
  const present = values.filter((value) => !isMissing(value));
  if (present.length === 0) return "text";
  const numericShare = present.filter((value) => parseNumber(value) !== null).length / present.length;
  if (numericShare >= 0.85) return "number";
  const dateShare = present.filter((value) => parseDate(value) !== null).length / present.length;
  if (dateShare >= 0.85) return "date";
  const uniqueShare = new Set(present.map(clean)).size / present.length;
  return uniqueShare <= 0.7 || present.length <= 20 ? "category" : "text";
}

function summarizeNumeric(values: CellValue[]): NumericSummary {
  const numericValues = values.map(parseNumber).filter((value): value is number => value !== null);
  const sum = numericValues.reduce((total, value) => total + value, 0);
  return {
    count: numericValues.length,
    missing: values.length - numericValues.length,
    sum,
    average: numericValues.length ? sum / numericValues.length : 0,
    min: numericValues.length ? Math.min(...numericValues) : 0,
    max: numericValues.length ? Math.max(...numericValues) : 0,
  };
}

function buildCategorySummary(
  rows: CsvRow[],
  column: string,
  numericColumns: string[],
): CategorySummary {
  const buckets = new Map<string, CsvRow[]>();
  for (const row of rows) {
    const value = clean(row[column]) || "(blank)";
    buckets.set(value, [...(buckets.get(value) ?? []), row]);
  }
  const values = [...buckets.entries()]
    .map(([value, records]) => {
      const metrics: Record<string, { sum: number; average: number }> = {};
      for (const metric of numericColumns.slice(0, 5)) {
        const numbers = records
          .map((record) => parseNumber(record[metric]))
          .filter((item): item is number => item !== null);
        const sum = numbers.reduce((total, item) => total + item, 0);
        metrics[metric] = { sum, average: numbers.length ? sum / numbers.length : 0 };
      }
      return { value, count: records.length, metrics };
    })
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, 20);
  return { column, values };
}

function makeChart(
  columns: ColumnProfile[],
  categorySummaries: CategorySummary[],
): ChartConfig | null {
  const firstNumeric = columns.find((column) => column.kind === "number");
  const firstDimension = columns.find((column) => column.kind === "category" || column.kind === "date");
  if (!firstNumeric || !firstDimension) return null;
  const source = categorySummaries.find((summary) => summary.column === firstDimension.name);
  if (!source) return null;
  const data = source.values
    .map((item) => ({ label: item.value, value: item.metrics[firstNumeric.name]?.sum ?? 0 }))
    .filter((item) => Number.isFinite(item.value));
  if (!data.length) return null;
  if (firstDimension.kind === "date") {
    data.sort((a, b) => Date.parse(a.label) - Date.parse(b.label));
  }
  return {
    type: firstDimension.kind === "date" ? "line" : "bar",
    xKey: firstDimension.name,
    yKey: firstNumeric.name,
    data,
  };
}

export function createDataProfile(rows: CsvRow[], fileName: string): DataProfile {
  const names = Object.keys(rows[0] ?? {});
  const columns: ColumnProfile[] = names.map((name) => {
    const values = rows.map((row) => row[name]);
    const kind = inferColumnKind(values);
    const presentValues = values.filter((value) => !isMissing(value));
    return {
      name,
      kind,
      missing: values.length - presentValues.length,
      unique: new Set(presentValues.map(clean)).size,
      ...(kind === "number" ? { numeric: summarizeNumeric(values) } : {}),
    };
  });

  const numericColumns = columns.filter((column) => column.kind === "number").map((column) => column.name);
  const categoricalColumns = columns
    .filter((column) => (column.kind === "category" || column.kind === "date") && column.unique <= 40)
    .slice(0, 10)
    .map((column) => column.name);
  const categorySummaries = categoricalColumns.map((column) => buildCategorySummary(rows, column, numericColumns));
  const stride = Math.max(1, Math.floor(rows.length / 20));
  const sampleRows = rows.filter((_, index) => index % stride === 0).slice(0, 20);

  return {
    fileName,
    rowCount: rows.length,
    columnCount: columns.length,
    columns,
    categorySummaries,
    sampleRows,
    chart: makeChart(columns, categorySummaries),
  };
}

export function formatValue(value: number): string {
  return numberFormatter.format(value);
}
