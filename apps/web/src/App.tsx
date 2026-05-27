import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ClipboardList, Download, FileDown, Play, Upload } from "lucide-react";
import type { CandidateInput, GateCandidate, PipelineResult } from "@seederpro/core";

type RunResponse = {
  runId: string | null;
  result: PipelineResult;
};

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4000";

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [roleTitle, setRoleTitle] = useState("Senior Data Engineer");
  const [experienceMin, setExperienceMin] = useState(4);
  const [experienceMax, setExperienceMax] = useState(7);
  const [keyLanguages, setKeyLanguages] = useState("Python, Spark, Kafka, Airflow, GCP or AWS");
  const [wantsProject, setWantsProject] = useState(true);
  const [workMode, setWorkMode] = useState<"remote" | "location">("location");
  const [location, setLocation] = useState("Bengaluru hybrid");
  const [salaryMin, setSalaryMin] = useState(18);
  const [salaryMax, setSalaryMax] = useState(28);
  const [roleNotes, setRoleNotes] = useState("Prefer production pipeline ownership, distributed systems, and team collaboration.");
  const [csv, setCsv] = useState("");
  const [candidates, setCandidates] = useState<CandidateInput[]>([]);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [strictMode, setStrictMode] = useState(true);
  const [inviteCap, setInviteCap] = useState(5);
  const [status, setStatus] = useState("idle");
  const [runProgress, setRunProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("waiting for inputs");
  const [error, setError] = useState<string | null>(null);
  const [simulationScores, setSimulationScores] = useState<Record<string, number | "">>({});
  const [phase, setPhase] = useState<"input" | "pipeline">("input");

  const finalWithScores = useMemo(() => {
    if (!result) return [];
    return buildClientShortlist(result.simulation, simulationScores);
  }, [result, simulationScores]);

  const roleDescription = useMemo(
    () =>
      [
        `${roleTitle || "Role"}, ${experienceMin}-${experienceMax} years, ${workMode === "remote" ? "remote" : location || "location required"}, ${salaryMin}-${salaryMax} LPA.`,
        `Must have ${keyLanguages || "the listed key skills"}.`,
        wantsProject ? "Must show relevant production project ownership or shipped project evidence." : "Project portfolio is optional.",
        roleNotes.trim(),
      ]
        .filter(Boolean)
        .join(" "),
    [experienceMax, experienceMin, keyLanguages, location, roleNotes, roleTitle, salaryMax, salaryMin, wantsProject, workMode],
  );

  const ready = roleDescription.trim().length >= 12 && candidates.length > 0;
  const readyMessage = ready
    ? `Ready: ${candidates.length} candidates parsed`
    : candidates.length === 0 && roleDescription.trim().length < 12
      ? "Add a role description and upload or parse candidate CSV"
      : candidates.length === 0
        ? "Upload CSV or paste CSV, then parse candidates"
        : "Add a role description before running";
  const showReadiness = ready || roleDescription.trim().length < 12;

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
    setPhase("pipeline");
    setStatus(`parsed ${payload.candidates.length} candidates`);
  }

  async function runPipeline() {
    if (!ready) {
      setError(readyMessage);
      return;
    }
    setStatus("running");
    setRunProgress(8);
    setProgressLabel("Preparing candidate data");
    setError(null);
    await delay(350);
    setRunProgress(24);
    setProgressLabel("Reading role parameters");
    await delay(350);
    setRunProgress(42);
    setProgressLabel("Running screening gates");
    try {
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
        setRunProgress(0);
        setProgressLabel("pipeline stopped");
        setError(readError(payload));
        return;
      }
      setRunProgress(72);
      setProgressLabel("Building shortlist");
      await delay(450);
      const typed = payload as RunResponse;
      setResult(typed.result);
      setRunId(typed.runId);
      setSimulationScores({});
      setRunProgress(100);
      setProgressLabel("Pipeline complete");
      setStatus("complete");
      window.setTimeout(() => setRunProgress(0), 900);
    } catch (err) {
      setStatus("error");
      setRunProgress(0);
      setProgressLabel("pipeline stopped");
      setError(err instanceof Error ? err.message : "Could not reach local API");
    }
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
      <MoneyPlantVine className="vine-top-right" />
      <MoneyPlantVine className="vine-left-edge" />
      <MoneyPlantVine className="vine-bottom-right" />
      <header className="topbar">
        <div className="brand-lockup">
          <img className="brand-logo" src="/sifter_logo_no_bg.svg" alt="Sifter" />
        </div>
        <div className="top-actions">
          <button className="btn btn-secondary" onClick={exportCsv} disabled={!finalWithScores.length}>
            <FileDown size={16} />
            Export
          </button>
          {phase === "pipeline" ? (
            <button className="btn btn-secondary" onClick={() => setPhase("input")}>
              <ArrowLeft size={16} />
              Edit inputs
            </button>
          ) : null}
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
          <div className="progress-block">
            <div className="progress-copy">
              <span>{progressLabel}</span>
              <span>{runProgress ? `${runProgress}%` : "standby"}</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${runProgress}%` }} />
            </div>
          </div>
          <div className="console-metrics">
            <Metric value={candidates.length} label="candidates" />
            <Metric value={result?.gate1.filter((candidate) => candidate.hardPass).length ?? 0} label="passed gate 1" />
            <Metric value={result?.invited.length ?? 0} label="invited" />
            <Metric value={finalWithScores.length} label="ranked" />
          </div>
        </div>
      </section>

      <div className={phase === "input" ? "input-stage" : "workbench pipeline-stage"}>
        {phase === "input" ? (
        <section className="panel input-panel">
          <PanelTitle title="Inputs" meta={ready ? "ready" : "waiting"} />
          {showReadiness ? <div className={`readiness ${ready ? "is-ready" : ""}`}>{readyMessage}</div> : null}

          <div className="role-builder">
            <Field label="Role title">
              <input className="field-control compact-control" value={roleTitle} onChange={(event) => setRoleTitle(event.target.value)} />
            </Field>

            <RangePair
              label="Experience"
              min={0}
              max={20}
              unit="yrs"
              low={experienceMin}
              high={experienceMax}
              setLow={(value) => setExperienceMin(Math.min(value, experienceMax))}
              setHigh={(value) => setExperienceMax(Math.max(value, experienceMin))}
            />

            <Field label="Key languages / stack">
              <input className="field-control compact-control" value={keyLanguages} onChange={(event) => setKeyLanguages(event.target.value)} placeholder="Python, Spark, Kafka, Airflow" />
            </Field>

            <Field label="Project evidence">
              <div className="segmented-control">
                <button type="button" className={wantsProject ? "active" : ""} onClick={() => setWantsProject(true)}>
                  Required
                </button>
                <button type="button" className={!wantsProject ? "active" : ""} onClick={() => setWantsProject(false)}>
                  Optional
                </button>
              </div>
            </Field>

            <Field label="Work mode">
              <div className="segmented-control">
                <button type="button" className={workMode === "location" ? "active" : ""} onClick={() => setWorkMode("location")}>
                  Location
                </button>
                <button type="button" className={workMode === "remote" ? "active" : ""} onClick={() => setWorkMode("remote")}>
                  Remote
                </button>
              </div>
            </Field>

            {workMode === "location" ? (
              <Field label="Location">
                <input className="field-control compact-control" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Bengaluru hybrid" />
              </Field>
            ) : null}

            <RangePair
              label="Salary expectation"
              min={0}
              max={100}
              unit="LPA"
              low={salaryMin}
              high={salaryMax}
              setLow={(value) => setSalaryMin(Math.min(value, salaryMax))}
              setHigh={(value) => setSalaryMax(Math.max(value, salaryMin))}
            />

            <Field label="Extra signals">
              <textarea className="field-control notes-box" value={roleNotes} onChange={(event) => setRoleNotes(event.target.value)} placeholder="Add preferred signals, dealbreakers, or context." />
            </Field>

            <div className="role-preview">
              <span>Generated role brief</span>
              <p>{roleDescription}</p>
            </div>
          </div>

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
        ) : (
        <section className="pipeline-stack">
          <section className="panel run-panel">
            <PanelTitle title="Pipeline Workspace" meta={ready ? `${candidates.length} candidates loaded` : "needs input"} />
            <div className="workspace-summary">
              <div>
                <span>Role</span>
                <strong>{roleTitle || "Untitled role"}</strong>
              </div>
              <div>
                <span>Experience</span>
                <strong>
                  {experienceMin}-{experienceMax} yrs
                </strong>
              </div>
              <div>
                <span>Salary</span>
                <strong>
                  {salaryMin}-{salaryMax} LPA
                </strong>
              </div>
              <div>
                <span>Source</span>
                <strong>{uploadedFileName ?? "Pasted CSV"}</strong>
              </div>
            </div>
            <div className="stage-actions">
              <button className="btn btn-secondary" onClick={() => setPhase("input")}>
                <ArrowLeft size={16} />
                Edit inputs
              </button>
              <button className="btn btn-primary" onClick={runPipeline} disabled={!ready || status === "running"}>
                <Play size={16} />
                {status === "running" ? "Running" : "Run pipeline"}
              </button>
            </div>
            {error ? <div className="error-box">{error}</div> : null}
          </section>
          <Gate title="Gate 1: Hard Filter" rows={result?.gate1 ?? []} kind="gate1" />
          <Gate title="Gate 2: Profile Score" rows={result?.gate2 ?? []} kind="gate2" />
          <Gate title="Gate 3: Risk And Intent" rows={result?.gate3 ?? []} kind="gate3" />
          <Gate title="Gate 4: Ownership Probe" rows={result?.gate4 ?? []} kind="gate4" />
          <Simulation rows={result?.simulation ?? []} scores={simulationScores} setScores={setSimulationScores} />
          <TopFiveReport rows={finalWithScores} />
          <Final rows={finalWithScores} />
        </section>
        )}
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

function RangePair({
  label,
  min,
  max,
  unit,
  low,
  high,
  setLow,
  setHigh,
}: {
  label: string;
  min: number;
  max: number;
  unit: string;
  low: number;
  high: number;
  setLow: (value: number) => void;
  setHigh: (value: number) => void;
}) {
  return (
    <div className="field">
      <div className="range-head">
        <span className="field-label">{label}</span>
        <span>
          {low}-{high} {unit}
        </span>
      </div>
      <div className="dual-range">
        <input type="range" min={min} max={max} value={low} onChange={(event) => setLow(Number(event.target.value))} />
        <input type="range" min={min} max={max} value={high} onChange={(event) => setHigh(Number(event.target.value))} />
      </div>
      <div className="range-scale">
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
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

function MoneyPlantVine({ className }: { className: string }) {
  const leaves = [
    { x: 118, y: 34, rotate: -34, scale: 0.72 },
    { x: 152, y: 76, rotate: 32, scale: 0.88 },
    { x: 102, y: 128, rotate: -42, scale: 0.92 },
    { x: 158, y: 182, rotate: 30, scale: 1.02 },
    { x: 96, y: 244, rotate: -36, scale: 0.95 },
    { x: 151, y: 306, rotate: 34, scale: 0.86 },
    { x: 111, y: 370, rotate: -28, scale: 0.8 },
    { x: 150, y: 438, rotate: 31, scale: 0.72 },
  ];

  return (
    <svg className={`money-vine ${className}`} aria-hidden="true" viewBox="0 0 260 520" focusable="false">
      <path className="vine-stem-shadow" d="M128 8 C76 76 176 126 120 198 C78 252 176 304 118 374 C86 412 130 462 106 512" />
      <path className="vine-stem" d="M128 8 C76 76 176 126 120 198 C78 252 176 304 118 374 C86 412 130 462 106 512" />
      {leaves.map((leaf, index) => (
        <g key={index} className="money-leaf" transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.rotate}) scale(${leaf.scale})`}>
          <path d="M0 -24 C18 -48 54 -35 54 -2 C54 30 18 48 0 62 C-18 48 -54 30 -54 -2 C-54 -35 -18 -48 0 -24 Z" />
          <path className="leaf-vein" d="M0 -16 C-2 6 -1 30 0 54" />
          <path className="leaf-vein side" d="M0 14 C13 7 24 -2 34 -14" />
          <path className="leaf-vein side" d="M0 20 C-14 12 -26 1 -36 -12" />
        </g>
      ))}
    </svg>
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

function TopFiveReport({ rows }: { rows: GateCandidate[] }) {
  const topRows = rows.slice(0, 5);
  return (
    <section className="panel report-panel">
      <PanelTitle title="Top 5 Constructive Report" meta={`${topRows.length} profiles`} />
      {!topRows.length ? (
        <div className="empty-state">Run the pipeline to generate candidate notes.</div>
      ) : (
        <div className="report-grid">
          {topRows.map((row) => {
            const report = buildCandidateReport(row);
            return (
              <article key={`report-${row.id}`} className="report-card">
                <div className="report-card-head">
                  <div>
                    <span>#{row.rank}</span>
                    <strong>{row.name}</strong>
                  </div>
                  <div className="score-pill">
                    <ClipboardList size={14} />
                    {row.finalScore ?? 0}
                  </div>
                </div>
                <p className="personal-note">{report.note}</p>
                <div className="report-columns">
                  <div>
                    <span>Strengths</span>
                    <ul>
                      {report.strengths.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span>Weaknesses</span>
                    <ul>
                      {report.weaknesses.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="rank-reason">{report.rankReason}</div>
              </article>
            );
          })}
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

function buildCandidateReport(row: GateCandidate) {
  const strengths = [
    row.profileSignals && row.profileSignals !== "Few explicit skill matches" ? row.profileSignals : "",
    row.careerCoherence && !row.careerCoherence.includes("transition") ? row.careerCoherence : "",
    row.githubSignal === "present" ? `GitHub evidence: ${row.githubDetail}` : "",
    row.experience_years ? `${row.experience_years} years within the target range` : "",
  ]
    .filter(Boolean)
    .slice(0, 3);

  const weaknessPool = [
    row.redFlags && row.redFlags !== "none" ? row.redFlags : "",
    row.githubSignal !== "present" ? "Public project proof is thin; validate ownership live." : "",
    row.hireConfidence === "provisional" ? "Final confidence still needs live simulation scoring." : "",
    row.salary_expectation_lpa ? `Salary expectation is ${row.salary_expectation_lpa} LPA; confirm budget fit.` : "",
  ].filter(Boolean);

  const weaknesses = weaknessPool.slice(0, 3);
  const skillText = row.skillsList.slice(0, 4).join(", ") || "the relevant stack";
  const scoreParts = [
    `profile ${row.profileScore ?? "-"}`,
    `risk ${row.deepScore ?? "-"}`,
    `ownership ${row.ownershipScore ?? "-"}`,
    row.simulationScore == null ? "simulation pending" : `simulation ${row.simulationScore}`,
  ];

  return {
    note: `${row.name} looks strongest around ${skillText}, with ${row.experience_years} years in ${row.location || "the listed market"}. ${row.careerCoherence ?? "Profile continuity needs interview validation."}`,
    strengths: strengths.length ? strengths : ["Cleared the required gates and remained competitive on score."],
    weaknesses: weaknesses.length ? weaknesses : ["No major weakness found from CSV signals; still verify live examples."],
    rankReason: `Why top 5: ranked #${row.rank} because the combined score (${row.finalScore ?? 0}) is built from ${scoreParts.join(", ")}.`,
  };
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

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
