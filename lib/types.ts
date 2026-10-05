export type CellValue = string | number | null;
export type CsvRow = Record<string, CellValue>;
export type ColumnKind = "number" | "date" | "category" | "text";

export interface NumericSummary {
  count: number;
  missing: number;
  sum: number;
  average: number;
  min: number;
  max: number;
}

export interface CategoryValue {
  value: string;
  count: number;
  metrics: Record<string, { sum: number; average: number }>;
}

export interface ColumnProfile {
  name: string;
  kind: ColumnKind;
  missing: number;
  unique: number;
  numeric?: NumericSummary;
}

export interface CategorySummary {
  column: string;
  values: CategoryValue[];
}

export interface ChartConfig {
  type: "bar" | "line";
  xKey: string;
  yKey: string;
  data: Array<{ label: string; value: number }>;
}

export interface DataProfile {
  fileName: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  categorySummaries: CategorySummary[];
  sampleRows: CsvRow[];
  chart: ChartConfig | null;
}

export interface BriefingInsight {
  headline: string;
  evidence: string;
}

export interface Briefing {
  overview: string;
  insights: BriefingInsight[];
  recommendedAction: string;
  suggestedQuestions: string[];
}

export interface Answer {
  answer: string;
  evidence: string;
  caveat: string;
}
