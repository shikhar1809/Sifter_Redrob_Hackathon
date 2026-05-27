import { useMemo, useRef, useState } from "react";
import { Download, FileDown, Play, Upload } from "lucide-react";
import type { CandidateInput, GateCandidate, PipelineResult } from "@seederpro/core";

type RunResponse = {
  runId: string | null;
  result: PipelineResult;
};

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4000";

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [roleDescription, setRoleDescription] = useState("");
  const [csv, setCsv] = useState("");
  const [candidates, setCandidates] = useState<CandidateInput[]>([]);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [strictMode, setStrictMode] = useState(true);
  const [inviteCap, setInviteCap] = useState(5);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState<string | null>(null);
  const [simulationScores, setSimulationScores] = useState<Record<string, number | "">>({});

  const finalWithScores = useMemo(() => {
    if (!result) return [];
    return buildClientShortlist(result.simulation, simulationScores);
  }, [result, simulationScores]);

  const ready = roleDescription.trim().length >= 12 && candidates.length > 0;
  const readyMessage = ready
    ? `Ready: ${candidates.length} candidates parsed`
    : candidates.length === 0 && roleDescription.trim().length < 12
      ? "Add a role description and upload or parse candidate CSV"
      : candidates.length === 0
        ? "Upload CSV or paste CSV, then parse candidates"
        : "Add a role description before running";

  async function parseCsvText(nextCsv = csv) {
    setError(null);
    setStatus("parsing CSV");
    const response = await fetch(`${apiBase}/csv/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: nextCsv }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readError(payload));
    setCandidates(payload.candidates);
    setResult(null);
    setRunId(null);
    setStatus(`parsed ${payload.candidates.length} candidates`);
  }

  async function runPipeline() {
    if (!ready) {
      setError(readyMessage);
      return;
    }
    setStatus("running");
    setError(null);
    const response = await fetch(`${apiBase}/pipeline-runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roleDescription,
        candidates,
        options: { strictMode, inviteCap, githubMode: "fallback" },
      }),
    });
    const payload: RunResponse | { error: unknown } = await response.json();
    if (!response.ok) {
      setStatus("error");
      setError(readError(payload));
      return;
    }
    const typed = payload as RunResponse;
    setResult(typed.result);
    setRunId(typed.runId);
    setSimulationScores({});
    setStatus("complete");
  }

  async function importCsvFile(file: File | null) {
    if (!file) return;
    setUploadedFileName(file.name);
    setStatus(`reading ${file.name}`);
    setError(null);
    const text = await file.text();
    setCsv(text);
    setStatus(`loaded ${file.name}`);
    try {
      await parseCsvText(text);
      setStatus(`parsed ${file.name}`);
    } catch (err) {
      setStatus("error");
      setCandidates([]);
      setError(err instanceof Error ? err.message : "Could not parse CSV file");
    }
  }

  function downloadTemplate() {
    const template = "name,experience_years,location,skills,github_url,salary_expectation_lpa,summary\n";
    const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "seederpro_candidate_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    if (!finalWithScores.length) return;
    const columns = ["rank", "name", "finalScore", "hireConfidence", "experience_years", "location", "salary_expectation_lpa", "recommendation", "redFlags", "github_url"];
    const body = finalWithScores.map((row) => columns.map((column) => quoteCsv(String(row[column as keyof GateCandidate] ?? ""))).join(","));
    const blob = new Blob([[columns.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "seederpro_shortlist.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <div className="eco-sprig sprig-one" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="eco-sprig sprig-two" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="eco-sprig sprig-three" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <header className="topbar">
        <div className="brand-lockup">
          <img className="brand-logo" src="/sifter_logo_no_bg.svg" alt="Sifter" />
        </div>
        <div className="top-actions">
          <button className="btn btn-secondary" onClick={exportCsv} disabled={!finalWithScores.length}>
            <FileDown size={16} />
            Export
          </button>
          <button className="btn btn-primary" onClick={runPipeline} disabled={!ready || status === "running"}>
            <Play size={16} />
            {status === "running" ? "Running" : "Run pipeline"}
          </button>
        </div>
      </header>

      <section className="hero-grid">
        <div className="hero-copy">
          <div className="eyebrow">Recruitment operating console</div>
          <h1>Screen candidates with a pipeline you can audit.</h1>
          <p>
            Upload real CSV data, describe the role, run deterministic gates, prepare simulation prompts, and export the ranked shortlist.
          </p>
        </div>
        <div className="hero-console" aria-label="Pipeline status">
          <div className="console-header">
            <span>pipeline.status</span>
            <span>{status}</span>
          </div>
          <div className="console-metrics">
            <Metric value={candidates.length} label="candidates" />
            <Metric value={result?.gate1.filter((candidate) => candidate.hardPass).length ?? 0} label="passed gate 1" />
            <Metric value={result?.invited.length ?? 0} label="invited" />
            <Metric value={finalWithScores.length} label="ranked" />
          </div>
        </div>
      </section>

      <div className="workbench">
        <section className="panel input-panel">
          <PanelTitle title="Inputs" meta={ready ? "ready" : "waiting"} />
          <div className={`readiness ${ready ? "is-ready" : ""}`}>{readyMessage}</div>

          <Field label="Role description">
            <textarea
              className="field-control role-box"
              value={roleDescription}
              onChange={(event) => setRoleDescription(event.target.value)}
              placeholder="Paste the exact role description here, including experience range, location, salary range, must-have skills, and preferred signals."
            />
          </Field>

          <Field label="Candidate CSV">
            <div className="button-row">
              <button className="btn btn-secondary" type="button" onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} />
                Upload CSV
              </button>
              <input
                ref={fileInputRef}
                className="hidden-input"
                type="file"
                accept=".csv,text/csv"
                onClick={(event) => {
                  event.currentTarget.value = "";
                }}
                onChange={(event) => importCsvFile(event.target.files?.[0] ?? null)}
              />
              <button className="btn btn-secondary" type="button" onClick={downloadTemplate}>
                <Download size={16} />
                Template
              </button>
            </div>
            <div className="file-state">
              <span>{uploadedFileName ? `Uploaded: ${uploadedFileName}` : "No file uploaded yet"}</span>
              <span>{candidates.length ? `${candidates.length} candidates parsed` : "0 candidates parsed"}</span>
            </div>
            <textarea className="field-control csv-box" value={csv} onChange={(event) => setCsv(event.target.value)} placeholder="Paste candidate CSV here" />
            <button
              className="btn btn-secondary full-width"
              type="button"
              onClick={() =>
                parseCsvText().catch((err: Error) => {
                  setStatus("error");
                  setCandidates([]);
                  setError(err.message);
                })
              }
            >
              Parse CSV
            </button>
          </Field>

          <div className="settings-grid">
            <Field label="Invite cap">
              <select className="field-control compact-control" value={inviteCap} onChange={(event) => setInviteCap(Number(event.target.value))}>
                <option value={3}>Top 3</option>
                <option value={5}>Top 5</option>
                <option value={8}>Top 8</option>
              </select>
            </Field>
            <label className="toggle-control">
              <input type="checkbox" checked={strictMode} onChange={(event) => setStrictMode(event.target.checked)} />
              <span>Strict hard filter</span>
            </label>
          </div>

          {error ? <div className="error-box">{error}</div> : null}
          {runId ? <div className="run-id">Saved run: {runId}</div> : null}
        </section>

        <section className="pipeline-stack">
          <Gate title="Gate 1: Hard Filter" rows={result?.gate1 ?? []} kind="gate1" />
          <Gate title="Gate 2: Profile Score" rows={result?.gate2 ?? []} kind="gate2" />
          <Gate title="Gate 3: Risk And Intent" rows={result?.gate3 ?? []} kind="gate3" />
          <Gate title="Gate 4: Ownership Probe" rows={result?.gate4 ?? []} kind="gate4" />
          <Simulation rows={result?.simulation ?? []} scores={simulationScores} setScores={setSimulationScores} />
          <Final rows={finalWithScores} />
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {children}
    </div>
  );
}

function PanelTitle({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="panel-title">
      <span>{title}</span>
      <span>{meta}</span>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="metric-card">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

function Gate({ title, rows, kind }: { title: string; rows: GateCandidate[]; kind: "gate1" | "gate2" | "gate3" | "gate4" }) {
  return (
    <section className="panel gate-panel">
      <PanelTitle title={title} meta={`${rows.length} rows`} />
      {!rows.length ? (
        <div className="empty-state">Waiting for pipeline run.</div>
      ) : (
        <div className="table-frame">
          <table>
            <thead>
              <tr>{headersFor(kind).map((header) => <th key={header}>{header}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${kind}-${row.id}`} className={row.invite || row.advanceG3 || row.advanceG2 || row.hardPass ? "row-pass" : "row-fail"}>
                  {cellsFor(row, kind).map((cell, index) => <td key={index}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Simulation({
  rows,
  scores,
  setScores,
}: {
  rows: GateCandidate[];
  scores: Record<string, number | "">;
  setScores: (next: Record<string, number | "">) => void;
}) {
  return (
    <section className="panel">
      <PanelTitle title="Simulation Kit" meta={`${rows.length} invited`} />
      {!rows.length ? <div className="empty-state">No invited candidates yet.</div> : null}
      <div className="simulation-grid">
        {rows.map((row) => (
          <div key={`sim-${row.id}`} className="mini-card">
            <div className="mini-card-head">
              <span>{row.name}</span>
              <span>readiness {row.ownershipScore}</span>
            </div>
            <div className="scenario-text">{row.scenarioQuestion}</div>
            <label className="score-entry">
              <span>Live score</span>
              <input
                className="field-control compact-control"
                type="number"
                min={0}
                max={100}
                value={scores[row.id] ?? ""}
                onChange={(event) => setScores({ ...scores, [row.id]: event.target.value === "" ? "" : Number(event.target.value) })}
              />
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}

function Final({ rows }: { rows: GateCandidate[] }) {
  return (
    <section className="panel gate-panel">
      <PanelTitle title="Final Shortlist" meta={`${rows.length} ranked`} />
      {!rows.length ? (
        <div className="empty-state">Run the pipeline to build the shortlist.</div>
      ) : (
        <div className="table-frame">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Score</th>
                <th>Confidence</th>
                <th>Recommendation</th>
                <th>Red flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`final-${row.id}`} className="row-pass">
                  <td>#{row.rank}</td>
                  <td className="strong-cell">{row.name}</td>
                  <td>{row.finalScore}</td>
                  <td>{row.hireConfidence}</td>
                  <td>{row.recommendation}</td>
                  <td>{row.redFlags}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function headersFor(kind: "gate1" | "gate2" | "gate3" | "gate4") {
  if (kind === "gate1") return ["Name", "Result", "Experience", "Location", "Reason"];
  if (kind === "gate2") return ["Name", "Score", "Signals", "Status"];
  if (kind === "gate3") return ["Name", "Score", "Coherence", "Intent", "Red flags"];
  return ["Name", "Ownership", "GitHub", "Probe", "Status"];
}

function cellsFor(row: GateCandidate, kind: "gate1" | "gate2" | "gate3" | "gate4") {
  if (kind === "gate1") return [row.name, row.hardPass ? "PASS" : "FAIL", `${row.experience_years} yrs`, row.location, row.hardReason];
  if (kind === "gate2") return [row.name, row.profileScore, row.profileSignals, row.advanceG2 ? "ADVANCE" : "HOLD"];
  if (kind === "gate3") return [row.name, row.deepScore, row.careerCoherence, row.intentSignal, row.redFlags];
  return [row.name, row.ownershipScore, `${row.githubSignal}: ${row.githubDetail}`, row.probeQuestion, row.invite ? "INVITE" : "HOLD"];
}

function buildClientShortlist(rows: GateCandidate[], scores: Record<string, number | "">): GateCandidate[] {
  return rows
    .map((row) => {
      const live = scores[row.id] === "" || scores[row.id] == null ? null : Number(scores[row.id]);
      const base = row.ownershipScore ?? row.deepScore ?? row.profileScore ?? 0;
      const finalScore = Math.round(live == null ? base : base * 0.55 + live * 0.45);
      const hireConfidence: GateCandidate["hireConfidence"] = live == null ? "provisional" : finalScore >= 82 ? "high" : finalScore >= 70 ? "medium" : "low";
      return {
        ...row,
        simulationScore: live,
        finalScore,
        hireConfidence,
        recommendation: live == null ? "Invite complete; waiting for live simulation score." : finalScore >= 82 ? "Strong shortlist. Advance to hiring team discussion." : "Review against the top-ranked candidates.",
      };
    })
    .sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function readError(payload: unknown): string {
  if (typeof payload === "object" && payload && "error" in payload) {
    const error = (payload as { error: unknown }).error;
    return typeof error === "string" ? error : JSON.stringify(error);
  }
  return "Request failed";
}

function quoteCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
