import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Brain, ClipboardList, Download, FileDown, Play, ShieldCheck, Upload } from "lucide-react";
import type { CandidateInput, GateCandidate, PipelineResult } from "@seederpro/core";

type RunResponse = {
  runId: string | null;
  result: PipelineResult;
};

type Phase = "role" | "setup" | "processing";
type OutputFormat = "report_csv" | "report" | "csv";

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
  const [phase, setPhase] = useState<Phase>("role");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("report_csv");
  const [showAuditGates, setShowAuditGates] = useState(false);

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

  const roleReady = roleDescription.trim().length >= 12 && roleTitle.trim().length > 0;
  const setupReady = roleReady && candidates.length > 0 && inviteCap > 0 && Boolean(outputFormat);
  const ready = setupReady;

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
    setPhase("setup");
    setStatus(`parsed ${payload.candidates.length} candidates`);
  }

  async function runPipeline() {
    if (!ready) {
      setError("Complete role requirements, parse candidate CSV, choose output format, and set invite cap before running.");
      return;
    }
    setPhase("processing");
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
    const columns = [
      "rank",
      "name",
      "finalScore",
      "hireConfidence",
      "nextAction",
      "riskLevel",
      "missingEvidence",
      "interviewQuestion",
      "experience_years",
      "location",
      "salary_expectation_lpa",
      "recommendation",
      "redFlags",
      "github_url",
    ];
    const body = finalWithScores.map((row) => {
      const report = buildCandidateReport(row);
      const values: Record<string, unknown> = {
        ...row,
        nextAction: report.nextAction,
        riskLevel: report.riskLevel,
        missingEvidence: report.missingEvidence.join("; "),
        interviewQuestion: report.interviewQuestion,
      };
      return columns.map((column) => quoteCsv(String(values[column] ?? ""))).join(",");
    });
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
      {status === "running" ? <FilteringOverlay /> : null}
      <MoneyPlantVine className="vine-top-right" />
      <MoneyPlantVine className="vine-left-edge" />
      <MoneyPlantVine className="vine-bottom-right" />
      <header className="topbar">
        <div className="brand-lockup">
          <img className="brand-logo" src="/sifter_logo_no_bg.svg" alt="Sifter" />
        </div>
        <div className="top-actions">
          <button className="btn btn-secondary" onClick={exportCsv} disabled={!finalWithScores.length || outputFormat === "report"}>
            <FileDown size={16} />
            Export
          </button>
          {phase === "setup" ? (
            <button className="btn btn-secondary" onClick={() => setPhase("role")}>
              <ArrowLeft size={16} />
              Role
            </button>
          ) : null}
          {phase === "processing" ? (
            <button className="btn btn-secondary" onClick={() => setPhase("setup")}>
              <ArrowLeft size={16} />
              Setup
            </button>
          ) : null}
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

      <div className={phase === "processing" ? "workbench pipeline-stage" : "input-stage"}>
        {phase === "role" ? (
          <section className="panel input-panel">
            <PanelTitle title="Step 1: Role Requirements" meta={roleReady ? "ready" : "required"} />
            <StepRail phase={phase} />

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

            <div className="stage-actions stage-actions-end">
              <button
                className="btn btn-primary"
                type="button"
                disabled={!roleReady}
                onClick={() => {
                  setError(null);
                  setPhase("setup");
                }}
              >
                <ArrowRight size={16} />
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {phase === "setup" ? (
          <section className="panel input-panel">
            <PanelTitle title="Step 2: CSV Upload & Output Setup" meta={candidates.length ? `${candidates.length} parsed` : "waiting"} />
            <StepRail phase={phase} />

            <div className="role-preview setup-role-preview">
              <span>Role locked for this run</span>
              <p>{roleDescription}</p>
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
              <Field label="Output format">
                <select className="field-control compact-control" value={outputFormat} onChange={(event) => setOutputFormat(event.target.value as OutputFormat)}>
                  <option value="report_csv">Report + CSV</option>
                  <option value="report">Report only</option>
                  <option value="csv">CSV only</option>
                </select>
              </Field>
              <Field label="Invite cap">
                <select className="field-control compact-control" value={inviteCap} onChange={(event) => setInviteCap(Number(event.target.value))}>
                  <option value={3}>Top 3</option>
                  <option value={5}>Top 5</option>
                  <option value={8}>Top 8</option>
                </select>
              </Field>
            </div>

            <label className="toggle-control setup-toggle">
              <input type="checkbox" checked={strictMode} onChange={(event) => setStrictMode(event.target.checked)} />
              <span>Strict hard filter</span>
            </label>

            {error ? <div className="error-box">{error}</div> : null}

            <div className="stage-actions stage-actions-split">
              <button className="btn btn-secondary" type="button" onClick={() => setPhase("role")}>
                <ArrowLeft size={16} />
                Back
              </button>
              {setupReady ? (
                <button className="btn btn-primary run-step-button" onClick={runPipeline} disabled={status === "running"}>
                  <Play size={16} />
                  {status === "running" ? "Running" : "Run pipeline"}
                </button>
              ) : (
                <div className="setup-waiting">Run appears after CSV is parsed and settings are ready.</div>
              )}
            </div>
          </section>
        ) : null}

        {phase === "processing" ? (
        <section className="pipeline-stack">
          <section className="panel run-panel">
            <PanelTitle title="Step 3: Processing & Results" meta={ready ? `${candidates.length} candidates loaded` : "needs input"} />
            <StepRail phase={phase} />
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
              <div>
                <span>Output</span>
                <strong>{outputFormatLabel(outputFormat)}</strong>
              </div>
            </div>
            <div className="stage-actions">
              <button className="btn btn-secondary" onClick={() => setPhase("setup")}>
                <ArrowLeft size={16} />
                Edit setup
              </button>
            </div>
            {error ? <div className="error-box">{error}</div> : null}
          </section>
          {result ? <ResultSummary result={result} recommended={finalWithScores} inviteCap={inviteCap} strictMode={strictMode} /> : null}
          {outputFormat !== "csv" ? <RecommendedCandidates rows={finalWithScores} inviteCap={inviteCap} /> : null}
          <Simulation rows={result?.simulation ?? []} scores={simulationScores} setScores={setSimulationScores} />
          {outputFormat !== "report" ? <Final rows={finalWithScores} /> : null}
          <section className="panel audit-panel">
            <button className="audit-toggle" type="button" onClick={() => setShowAuditGates(!showAuditGates)}>
              <ShieldCheck size={16} />
              {showAuditGates ? "Hide audit gates" : "Show audit gates"}
            </button>
            {showAuditGates ? (
              <div className="audit-stack">
                <Gate title="Gate 1: Hard Filter" rows={result?.gate1 ?? []} kind="gate1" />
                <Gate title="Gate 2: Profile Score" rows={result?.gate2 ?? []} kind="gate2" />
                <Gate title="Gate 3: Risk And Intent" rows={result?.gate3 ?? []} kind="gate3" />
                <Gate title="Gate 4: Ownership Probe" rows={result?.gate4 ?? []} kind="gate4" />
              </div>
            ) : null}
          </section>
        </section>
        ) : null}
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

function StepRail({ phase }: { phase: Phase }) {
  const steps: { id: Phase; label: string }[] = [
    { id: "role", label: "Role" },
    { id: "setup", label: "CSV & Output" },
    { id: "processing", label: "Processing" },
  ];
  const current = steps.findIndex((step) => step.id === phase);

  return (
    <div className="step-rail" aria-label="Pipeline steps">
      {steps.map((step, index) => (
        <div key={step.id} className={`step-pill ${index === current ? "active" : ""} ${index < current ? "done" : ""}`}>
          <span>{index + 1}</span>
          <strong>{step.label}</strong>
        </div>
      ))}
    </div>
  );
}

function FilteringOverlay() {
  const leaves = Array.from({ length: 18 }, (_, index) => index);

  return (
    <div className="filtering-overlay" role="status" aria-live="polite">
      <div className="wind-field" aria-hidden="true">
        {leaves.map((leaf) => (
          <span key={leaf} className={`wind-leaf leaf-${leaf + 1}`} />
        ))}
      </div>
      <div className="filtering-copy">
        <span>Processing candidates</span>
        <strong>Filtering Your Next Hire</strong>
      </div>
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

function ResultSummary({
  result,
  recommended,
  inviteCap,
  strictMode,
}: {
  result: PipelineResult;
  recommended: GateCandidate[];
  inviteCap: number;
  strictMode: boolean;
}) {
  const hardRejected = result.gate1.filter((row) => !row.hardPass);
  const reasons = countReasons(hardRejected.map((row) => row.hardReason ?? "not specified"));
  const topReasons = reasons.slice(0, 3);
  const intelligence = result.intelligence;
  const message =
    recommended.length >= Math.min(inviteCap, 5)
      ? `${recommended.length} candidates are ready for review.`
      : `Only ${recommended.length} candidate${recommended.length === 1 ? "" : "s"} met ${strictMode ? "strict" : "current"} filters. Relax filters or review rejected profiles if this feels too narrow.`;

  return (
    <section className="panel summary-panel">
      <PanelTitle title="Recruiter Summary" meta="next action" />
      <div className={`intelligence-banner intelligence-${intelligence?.status ?? "disabled"}`}>
        <Brain size={16} />
        <div>
          <strong>{intelligenceTitle(intelligence?.status)}</strong>
          <span>{intelligenceMessage(intelligence)}</span>
        </div>
      </div>
      <div className="summary-grid">
        <Metric value={result.gate1.length} label="uploaded" />
        <Metric value={hardRejected.length} label="rejected" />
        <Metric value={result.invited.length} label="invited" />
        <Metric value={recommended.length} label="recommended" />
      </div>
      <div className="summary-message">{message}</div>
      <div className="reason-strip">
        {topReasons.length ? (
          topReasons.map((reason) => (
            <div key={reason.label}>
              <span>{reason.count}</span>
              <strong>{reason.label}</strong>
            </div>
          ))
        ) : (
          <div>
            <span>0</span>
            <strong>No hard-filter rejection reason dominates.</strong>
          </div>
        )}
      </div>
    </section>
  );
}

function RecommendedCandidates({ rows, inviteCap }: { rows: GateCandidate[]; inviteCap: number }) {
  const topRows = rows.slice(0, 5);
  return (
    <section className="panel report-panel">
      <PanelTitle title="Recommended Candidates" meta={`${topRows.length} profiles`} />
      {!topRows.length ? (
        <div className="empty-state">No recommended candidates yet. Review rejected profiles or relax strict filters.</div>
      ) : (
        <>
          {topRows.length < Math.min(inviteCap, 5) ? (
            <div className="recommendation-notice">
              Only {topRows.length} candidate{topRows.length === 1 ? "" : "s"} met strict filters. You can relax filters or inspect rejected rows before deciding.
            </div>
          ) : null}
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
                  <div className="report-badges">
                    <div className={`score-pill risk-${report.riskLevel.toLowerCase()}`}>
                      <ClipboardList size={14} />
                      {report.riskLevel} risk
                    </div>
                    <div className="reviewer-pill">{report.reviewer === "local" ? "Local review" : "AI review"}</div>
                  </div>
                </div>
                <p className="personal-note">{report.note}</p>
                <div className="next-action-box">
                  <span>Next action</span>
                  <strong>{report.nextAction}</strong>
                </div>
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
                <div className="report-columns report-columns-lower">
                  <div>
                    <span>Missing evidence</span>
                    <ul>
                      {report.missingEvidence.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span>Interview question</span>
                    <p>{report.interviewQuestion}</p>
                  </div>
                </div>
                <div className="confidence-note">
                  <span>Review basis</span>
                  <p>{report.confidenceNote}</p>
                  <strong>Fields used: {report.sourceFields.join(", ")}</strong>
                </div>
                <div className="rank-reason">{report.rankReason}</div>
              </article>
              );
            })}
          </div>
        </>
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
  const ai = row.aiReview;
  const riskLevel = candidateRisk(row);
  const missingEvidence = buildMissingEvidence(row);
  const nextAction = nextActionFor(row, riskLevel, missingEvidence);
  const interviewQuestion = row.probeQuestion || row.scenarioQuestion || `Ask ${row.name} to walk through one production project and the tradeoffs they personally owned.`;
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
    note:
      ai?.personalNote ??
      `${row.name} looks strongest around ${skillText}, with ${row.experience_years} years in ${row.location || "the listed market"}. ${row.careerCoherence ?? "Profile continuity needs interview validation."}`,
    strengths: ai?.strengths?.length ? ai.strengths : strengths.length ? strengths : ["Cleared the required gates and remained competitive on score."],
    weaknesses: ai?.weaknesses?.length ? ai.weaknesses : weaknesses.length ? weaknesses : ["No major weakness found from CSV signals; still verify live examples."],
    missingEvidence: ai?.missingEvidence?.length ? ai.missingEvidence : missingEvidence,
    interviewQuestion: ai?.interviewQuestion ?? interviewQuestion,
    nextAction: ai?.nextAction ?? nextAction,
    riskLevel: ai?.riskLevel ?? riskLevel,
    confidenceNote: ai?.confidenceNote ?? "Deterministic review only; no AI reviewer note was attached.",
    sourceFields: cleanSourceFields(ai?.sourceFields ?? ["skills", "summary", "profileScore", "deepScore", "ownershipScore"]),
    reviewer: ai?.provider ?? "local",
    rankReason: `Why top 5: ranked #${row.rank} because the combined score (${row.finalScore ?? 0}) is built from ${scoreParts.join(", ")}.`,
  };
}

function cleanSourceFields(fields: string[]): string[] {
  const allowed = ["name", "experience_years", "location", "skills", "summary", "salary_expectation_lpa", "github_url", "profileScore", "deepScore", "ownershipScore", "finalScore", "redFlags", "probeQuestion"];
  const normalized = fields
    .flatMap((field) => field.split(/,|;/))
    .map((field) => field.trim())
    .map((field) => allowed.find((allowedField) => field.toLowerCase().includes(allowedField.toLowerCase())) ?? field)
    .filter((field) => allowed.includes(field));
  return Array.from(new Set(normalized)).slice(0, 6);
}

function buildMissingEvidence(row: GateCandidate): string[] {
  const missing = [];
  if (row.githubSignal !== "present") missing.push("Public project or repository evidence.");
  if (row.simulationScore == null) missing.push("Live simulation score.");
  if (!row.summary.toLowerCase().includes("owned") && !row.summary.toLowerCase().includes("led")) missing.push("Clear ownership example.");
  if (row.redFlags && row.redFlags !== "none") missing.push(`Clarification on ${row.redFlags}.`);
  return missing.length ? missing.slice(0, 3) : ["No major missing evidence from CSV; verify examples in interview."];
}

function candidateRisk(row: GateCandidate): "Low" | "Medium" | "High" {
  const flags = row.redFlags && row.redFlags !== "none" ? row.redFlags.split(";").length : 0;
  if ((row.finalScore ?? 0) >= 85 && flags === 0 && row.simulationScore != null) return "Low";
  if ((row.finalScore ?? 0) < 70 || flags >= 2) return "High";
  return "Medium";
}

function nextActionFor(row: GateCandidate, riskLevel: "Low" | "Medium" | "High", missingEvidence: string[]): string {
  if (riskLevel === "Low") return "Invite to interview with hiring team.";
  if (row.simulationScore == null) return "Run live simulation or ask for project proof before final decision.";
  if (missingEvidence.some((item) => item.toLowerCase().includes("repository") || item.toLowerCase().includes("ownership"))) {
    return "Ask for missing project evidence, then compare with other recommended candidates.";
  }
  return "Keep as backup unless the interview resolves the risk.";
}

function countReasons(reasons: string[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  reasons
    .flatMap((reason) => reason.split(";"))
    .map((reason) => reason.trim())
    .filter(Boolean)
    .forEach((reason) => counts.set(reason, (counts.get(reason) ?? 0) + 1));
  return Array.from(counts, ([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
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

function outputFormatLabel(format: OutputFormat): string {
  if (format === "report") return "Report only";
  if (format === "csv") return "CSV only";
  return "Report + CSV";
}

function intelligenceTitle(status?: NonNullable<PipelineResult["intelligence"]>["status"]): string {
  if (status === "completed") return "AI review completed";
  if (status === "fallback") return "AI fallback used";
  return "Local review only";
}

function intelligenceMessage(intelligence?: PipelineResult["intelligence"]): string {
  if (!intelligence) return "Local deterministic report is available.";
  if (intelligence.status === "completed") {
    return `AI reviewed ${intelligence.reviewedCandidates} recommended candidate${intelligence.reviewedCandidates === 1 ? "" : "s"}.`;
  }
  if (intelligence.status === "fallback") return "AI review was unavailable during this run; local deterministic report is available.";
  return "AI review is disabled or not configured; local deterministic report is available.";
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
