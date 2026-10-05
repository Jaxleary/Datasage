"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createDataProfile, formatValue } from "@/lib/profile";
import type { Answer, Briefing, CsvRow, DataProfile } from "@/lib/types";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;
const MAX_COLUMNS = 25;

function Brand() {
  return (
    <div className="brand" aria-label="DataSage home">
      <span className="brand-mark">✦</span>
      <span>DataSage</span>
    </div>
  );
}

function UploadView({ onFile }: { onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <>
      <main className="page hero">
        <section>
          <p className="eyebrow">Friendly data analysis</p>
          <h1>Turn your spreadsheet into <em>clear next steps.</em></h1>
          <p className="lede">
            Upload a CSV, see the story in your data, and ask practical questions in plain English. No SQL. No Python. No intimidating dashboards.
          </p>
        </section>
        <section className="upload-card">
          <div
            className={`dropzone ${dragging ? "dragging" : ""}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <div>
              <div className="file-icon">CSV</div>
              <h2>Start with your data</h2>
              <p>Drag a CSV here, or choose one from your computer. Up to 5 MB and 5,000 rows.</p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const file = event.target.files?.[0];
                  if (file) onFile(file);
                  event.target.value = "";
                }}
              />
              <button className="button button-primary" onClick={() => inputRef.current?.click()}>Choose a CSV</button>
              <div style={{ marginTop: 14 }}>
                <a className="eyebrow" href="/sample-sales.csv" download>Download a sample sales CSV →</a>
              </div>
              <p className="privacy"><span>◉</span><span>Demo-safe only. Do not upload confidential, personal, or regulated data. Version 1 does not save files.</span></p>
            </div>
          </div>
        </section>
      </main>
      <section className="page features">
        <div className="feature"><span className="feature-number">01</span><div><b>Upload once</b><span>Your CSV stays in this browser while DataSage builds a compact summary.</span></div></div>
        <div className="feature"><span className="feature-number">02</span><div><b>See the pattern</b><span>Explore the key figures, data quality, and an automatic chart.</span></div></div>
        <div className="feature"><span className="feature-number">03</span><div><b>Ask naturally</b><span>Get a grounded answer, evidence, and an honest caveat.</span></div></div>
      </section>
    </>
  );
}

function ChartPanel({ profile }: { profile: DataProfile }) {
  const chart = profile.chart;
  if (!chart) {
    return <div className="empty-chart">This file does not have a clear category/date and numeric pair for an automatic chart. The profile and preview are still ready to explore.</div>;
  }
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        {chart.type === "line" ? (
          <LineChart data={chart.data} margin={{ top: 10, right: 8, left: -18, bottom: 30 }}>
            <CartesianGrid stroke="#e7eee9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5d6b64" }} interval={0} angle={-30} textAnchor="end" />
            <YAxis tick={{ fontSize: 11, fill: "#5d6b64" }} tickFormatter={(value) => formatValue(Number(value))} />
            <Tooltip formatter={(value) => formatValue(Number(value))} contentStyle={{ borderRadius: 10, border: "1px solid #d9e4dd" }} />
            <Line type="monotone" dataKey="value" stroke="#0c6b50" strokeWidth={3} dot={{ r: 4, fill: "#d9f56a", stroke: "#0c6b50", strokeWidth: 2 }} />
          </LineChart>
        ) : (
          <BarChart data={chart.data} margin={{ top: 10, right: 8, left: -18, bottom: 30 }}>
            <CartesianGrid stroke="#e7eee9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5d6b64" }} interval={0} angle={-30} textAnchor="end" />
            <YAxis tick={{ fontSize: 11, fill: "#5d6b64" }} tickFormatter={(value) => formatValue(Number(value))} />
            <Tooltip formatter={(value) => formatValue(Number(value))} contentStyle={{ borderRadius: 10, border: "1px solid #d9e4dd" }} />
            <Bar dataKey="value" fill="#0c6b50" radius={[5, 5, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function InsightPanel({
  profile,
  briefing,
  briefingError,
  briefingLoading,
}: {
  profile: DataProfile;
  briefing: Briefing | null;
  briefingError: string | null;
  briefingLoading: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const suggested = briefing?.suggestedQuestions ?? ["Which category appears most often?", "What should I investigate next?"];

  const ask = async (nextQuestion = question) => {
    const cleanQuestion = nextQuestion.trim();
    if (!cleanQuestion || asking) return;
    setQuestion(cleanQuestion);
    setAnswer(null);
    setAskError(null);
    setAsking(true);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, question: cleanQuestion }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "DataSage could not answer that.");
      setAnswer(body.answer as Answer);
    } catch (error) {
      setAskError(error instanceof Error ? error.message : "DataSage could not answer that.");
    } finally {
      setAsking(false);
    }
  };

  return (
    <aside className="panel insight-panel">
      <h2>DataSage briefing</h2>
      <p className="panel-subtitle">AI uses your compact data profile—not your original file.</p>
      {briefingLoading && <p className="loading-copy">Reading the patterns in your data…</p>}
      {briefingError && <p className="error">{briefingError}</p>}
      {briefing && <>
        <p className="briefing">{briefing.overview}</p>
        <ul className="insights">
          {briefing.insights.map((insight, index) => <li key={`${insight.headline}-${index}`}><b>{insight.headline}</b>{insight.evidence}</li>)}
        </ul>
        <div className="recommendation"><b>Try this next:</b> {briefing.recommendedAction}</div>
      </>}
      <div className="ask">
        <label htmlFor="question">Ask about your data</label>
        <div className="ask-row">
          <input id="question" value={question} maxLength={300} placeholder="Which products performed best?" onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void ask(); }} />
          <button onClick={() => void ask()} disabled={asking}>{asking ? "…" : "Ask"}</button>
        </div>
        <div className="question-chips">
          {suggested.map((item) => <button key={item} onClick={() => void ask(item)}>{item}</button>)}
        </div>
        {askError && <p className="error">{askError}</p>}
        {answer && <div className="answer"><strong>DataSage says</strong>{answer.answer}<div className="evidence"><b>Evidence:</b> {answer.evidence}</div><div className="caveat"><b>Keep in mind:</b> {answer.caveat}</div></div>}
      </div>
    </aside>
  );
}

function ResultsView({ profile, onReset }: { profile: DataProfile; onReset: () => void }) {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  useEffect(() => {
    setBriefing(null);
    setBriefingError(null);
    setBriefingLoading(true);
    fetch("/api/briefing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "DataSage could not create a briefing.");
        setBriefing(body.briefing as Briefing);
      })
      .catch((error: unknown) => setBriefingError(error instanceof Error ? error.message : "DataSage could not create a briefing."))
      .finally(() => setBriefingLoading(false));
  }, [profile]);

  const mainNumeric = profile.columns.find((column) => column.kind === "number");
  const missingCells = profile.columns.reduce((total, column) => total + column.missing, 0);
  return (
    <main className="page">
      <header className="app-head">
        <div><p className="eyebrow">Your data, explained</p><h1>Here’s what DataSage found.</h1></div>
        <div style={{ display: "flex", gap: 9, alignItems: "center" }}><span className="file-pill">{profile.fileName}</span><button className="button button-secondary" onClick={onReset}>New file</button></div>
      </header>
      <section className="metrics" aria-label="Dataset summary">
        <div className="metric"><div className="metric-label">Rows analyzed</div><div className="metric-value">{formatValue(profile.rowCount)}</div></div>
        <div className="metric"><div className="metric-label">Columns found</div><div className="metric-value">{profile.columnCount}</div></div>
        <div className="metric"><div className="metric-label">Missing cells</div><div className="metric-value">{formatValue(missingCells)}</div></div>
        <div className="metric"><div className="metric-label">{mainNumeric ? `${mainNumeric.name} total` : "Data types"}</div><div className="metric-value">{mainNumeric?.numeric ? formatValue(mainNumeric.numeric.sum) : `${new Set(profile.columns.map((column) => column.kind)).size}`}</div></div>
      </section>
      <section className="dashboard">
        <div className="panel"><h2>{profile.chart ? `${profile.chart.yKey} by ${profile.chart.xKey}` : "Automatic visualization"}</h2><p className="panel-subtitle">This chart is calculated directly from your uploaded CSV.</p><ChartPanel profile={profile} /></div>
        <div className="panel"><h2>Your columns</h2><p className="panel-subtitle">Type detection and basic data-quality checks.</p><div className="profile-grid">{profile.columns.map((column) => <div className="column-card" key={column.name}><strong title={column.name}>{column.name}</strong><span className={`tag tag-${column.kind}`}>{column.kind}</span><span className={column.missing ? "missing" : ""} style={{ display: "block", marginTop: 4 }}>{column.missing ? `${column.missing} missing` : `${column.unique} unique`}</span></div>)}</div></div>
      </section>
      <section className="below">
        <div className="panel"><h2>Data preview</h2><p className="panel-subtitle">The first 10 uploaded rows. Your file is not saved.</p><div className="table-wrap"><table><thead><tr>{profile.columns.map((column) => <th key={column.name}>{column.name}</th>)}</tr></thead><tbody>{profile.sampleRows.slice(0, 10).map((row, index) => <tr key={index}>{profile.columns.map((column) => <td key={column.name} title={String(row[column.name] ?? "")}>{String(row[column.name] ?? "—") || "—"}</td>)}</tr>)}</tbody></table></div></div>
        <InsightPanel profile={profile} briefing={briefing} briefingError={briefingError} briefingLoading={briefingLoading} />
      </section>
    </main>
  );
}

export default function Home() {
  const [profile, setProfile] = useState<DataProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const processFile = (file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") return setError("Please choose a CSV file. Excel files are not supported in this first version.");
    if (file.size === 0) return setError("That file is empty. Choose a CSV with a header row and data.");
    if (file.size > MAX_FILE_BYTES) return setError("That CSV is larger than 5 MB. Please use a smaller file for this demo version.");
    setReading(true);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (result) => {
        setReading(false);
        const fields = result.meta.fields?.filter(Boolean) ?? [];
        if (result.errors.length || !fields.length) return setError("We could not read that CSV. Check that it has a header row and balanced quotes, then try again.");
        if (fields.length > MAX_COLUMNS) return setError(`This version supports up to ${MAX_COLUMNS} columns. Your file has ${fields.length}.`);
        const rows = result.data.filter((row) => Object.values(row).some((value) => String(value ?? "").trim())) as CsvRow[];
        if (!rows.length) return setError("We found headers but no data rows in that file.");
        if (rows.length > MAX_ROWS) return setError(`This version supports up to ${MAX_ROWS.toLocaleString()} rows. Your file has ${rows.length.toLocaleString()}.`);
        setProfile(createDataProfile(rows, file.name));
      },
      error: () => { setReading(false); setError("We could not open that file. Please try another CSV."); },
    });
  };

  return <div className="shell"><div className="grain" /><nav className="page nav"><Brand /><a className="button button-secondary" href="/sample-sales.csv" download>Try the sample</a></nav>{profile ? <ResultsView profile={profile} onReset={() => { setProfile(null); setError(null); }} /> : <>{reading && <div className="page error">Reading your CSV…</div>}{error && <div className="page error">{error}</div>}<UploadView onFile={processFile} /></>}</div>;
}
