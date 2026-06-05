import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Brain, ClipboardList, Database, Download, FileDown, Play, ShieldCheck, Upload } from "lucide-react";
import type { BiasAudit, CandidateInput, GateCandidate, PipelineResult, RedrobRankingRow } from "@seederpro/core";

type RunResponse = {
  runId: string | null;
  result: PipelineResult;
};

type Phase = "role" | "setup" | "processing";
type OutputFormat = "report_csv" | "report" | "csv";
type PrivacyMode = "local" | "ai";
type CandidateDataMode = "standard" | "redrob";
type ProductPrinciple = "trust" | "cost" | "privacy" | "simplicity";
type RoleTemplate = {
  title: string;
  years: [number, number];
  stack: string;
  workMode: "remote" | "location";
  location: string;
  salary: [number, number];
  wantsProject: boolean;
  notes: string;
};
type EmailRow = {
  name: string;
  email: string;
  subject: string;
  body: string;
};
type RedrobRankResponse = {
  rows: RedrobRankingRow[];
  csv: string;
  count: number;
  biasAudit: BiasAudit;
};
type RedrobChallengeAsset = {
  processedCandidates: number;
  runtimeSeconds: number;
  generatedAt: string;
  note: string;
  biasAudit: BiasAudit;
  rows: RedrobRankingRow[];
};
type ReviewAgentOpinion = {
  agent: string;
  verdict: string;
  question: string;
  focus: string;
};

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4000";
const softCandidateLimit = 500;
const hardCandidateLimit = 2000;
const aiReviewLimit = 5;
const productPrinciples: Array<{ key: ProductPrinciple; title: string; body: string }> = [
  {
    key: "trust",
    title: "Clear reasons",
    body: "Know why each person made the shortlist, so you can explain it with confidence.",
  },
  {
    key: "cost",
    title: "Cost stays low",
    body: "Use the free local flow first. Add extra help only when it genuinely helps your decision.",
  },
  {
    key: "privacy",
    title: "Private by default",
    body: "Candidate details are sensitive. Sifter starts with a local workflow that respects that.",
  },
  {
    key: "simplicity",
    title: "Easy daily flow",
    body: "Add candidate data, describe the role, get a shortlist, and share the report.",
  },
];
const roleTemplates: RoleTemplate[] = [
  { title: "Senior AI Engineer", years: [5, 9], stack: "Python, embeddings, retrieval, vector databases, ranking, evaluation frameworks, LLMs", workMode: "location", location: "Pune or Noida hybrid, open to Tier-1 Indian cities", salary: [0, 100], wantsProject: true, notes: "Founding-team role. Require production retrieval/ranking systems, evaluation depth, strong Python, and a shipper mindset. Penalize pure research, shallow LangChain-only work, stale coding, and title-chasing." },
  { title: "Sales Development Representative", years: [0, 2], stack: "Cold outreach, CRM, email writing, discovery calls", workMode: "location", location: "Mumbai onsite", salary: [4, 8], wantsProject: false, notes: "Look for clear communication, persistence, CRM hygiene, and comfort with daily targets." },
  { title: "Account Executive", years: [2, 6], stack: "B2B sales, demos, negotiation, CRM, pipeline ownership", workMode: "location", location: "Bengaluru hybrid", salary: [8, 18], wantsProject: false, notes: "Prefer people who can own a sales cycle, handle objections, and close with discipline." },
  { title: "Customer Support Executive", years: [0, 3], stack: "Ticketing, chat support, email support, empathy, escalation handling", workMode: "remote", location: "", salary: [3, 7], wantsProject: false, notes: "Look for patient communication, clear writing, and calm issue ownership." },
  { title: "Customer Success Manager", years: [3, 7], stack: "Onboarding, renewals, account health, customer training, CRM", workMode: "location", location: "Bengaluru hybrid", salary: [10, 22], wantsProject: false, notes: "Prefer people who can retain customers, spot risks early, and build trust with accounts." },
  { title: "Recruiter", years: [1, 5], stack: "Sourcing, screening, scheduling, stakeholder updates, ATS", workMode: "location", location: "Delhi NCR hybrid", salary: [5, 12], wantsProject: false, notes: "Look for fast follow-up, strong candidate judgement, and clean hiring communication." },
  { title: "HR Generalist", years: [2, 6], stack: "Employee relations, onboarding, payroll coordination, HR operations", workMode: "location", location: "Mumbai onsite", salary: [6, 14], wantsProject: false, notes: "Prefer practical HR ownership, policy comfort, and people-first communication." },
  { title: "Operations Executive", years: [1, 4], stack: "Vendor coordination, reporting, SOPs, Excel, daily operations", workMode: "location", location: "Pune onsite", salary: [4, 9], wantsProject: false, notes: "Look for reliable execution, ownership of follow-ups, and comfort with operational details." },
  { title: "Operations Manager", years: [4, 9], stack: "Process design, team management, vendor management, reporting", workMode: "location", location: "Bengaluru onsite", salary: [12, 26], wantsProject: false, notes: "Prefer people who improved processes, managed teams, and owned outcomes." },
  { title: "Marketing Manager", years: [3, 7], stack: "Campaigns, content, performance marketing, analytics, brand", workMode: "location", location: "Mumbai hybrid", salary: [10, 24], wantsProject: true, notes: "Look for campaign ownership, clear metrics, and practical creative judgement." },
  { title: "Content Writer", years: [1, 5], stack: "Blogs, landing pages, SEO, editing, research", workMode: "remote", location: "", salary: [4, 12], wantsProject: true, notes: "Prefer strong writing samples, research depth, and ability to match brand voice." },
  { title: "SEO Specialist", years: [2, 6], stack: "Keyword research, technical SEO, content briefs, Search Console, analytics", workMode: "remote", location: "", salary: [6, 16], wantsProject: true, notes: "Look for ranking improvements, site audits, and practical SEO execution." },
  { title: "Performance Marketer", years: [2, 6], stack: "Google Ads, Meta Ads, landing pages, CAC, ROAS, analytics", workMode: "location", location: "Bengaluru hybrid", salary: [8, 20], wantsProject: true, notes: "Prefer people who managed budgets, improved conversion, and explain tradeoffs clearly." },
  { title: "Product Manager", years: [3, 8], stack: "Roadmaps, user research, PRDs, analytics, stakeholder management", workMode: "location", location: "Bengaluru hybrid", salary: [18, 40], wantsProject: true, notes: "Look for customer judgement, prioritization, shipping history, and clear product thinking." },
  { title: "UX Designer", years: [2, 7], stack: "Figma, user flows, wireframes, prototypes, usability testing", workMode: "remote", location: "", salary: [10, 28], wantsProject: true, notes: "Prefer strong portfolio proof, thoughtful flows, and practical product judgement." },
  { title: "UI Designer", years: [1, 5], stack: "Figma, visual design, components, responsive layouts, design systems", workMode: "remote", location: "", salary: [6, 18], wantsProject: true, notes: "Look for polished screens, consistency, and clean component thinking." },
  { title: "Frontend Developer", years: [2, 6], stack: "React, TypeScript, CSS, API integration, responsive UI", workMode: "remote", location: "", salary: [10, 28], wantsProject: true, notes: "Prefer shipped UI work, clean code habits, and comfort with real user flows." },
  { title: "Backend Developer", years: [2, 7], stack: "Node.js, APIs, SQL, queues, auth, cloud basics", workMode: "location", location: "Bengaluru hybrid", salary: [12, 32], wantsProject: true, notes: "Look for API ownership, database comfort, reliability thinking, and debugging ability." },
  { title: "Full Stack Developer", years: [2, 7], stack: "React, Node.js, TypeScript, SQL, APIs, cloud deployment", workMode: "remote", location: "", salary: [12, 34], wantsProject: true, notes: "Prefer people who can ship end to end and communicate tradeoffs clearly." },
  { title: "Data Analyst", years: [1, 5], stack: "SQL, Excel, dashboards, BI tools, stakeholder reporting", workMode: "location", location: "Bengaluru hybrid", salary: [6, 18], wantsProject: true, notes: "Look for clear analysis, business context, and useful dashboard/report examples." },
  { title: "Data Engineer", years: [3, 8], stack: "Python, SQL, Spark, Airflow, Kafka, AWS or GCP", workMode: "location", location: "Bengaluru hybrid", salary: [18, 38], wantsProject: true, notes: "Prefer production pipeline ownership, data quality thinking, and incident handling." },
  { title: "Machine Learning Engineer", years: [3, 8], stack: "Python, ML pipelines, model serving, feature engineering, cloud", workMode: "remote", location: "", salary: [20, 45], wantsProject: true, notes: "Look for shipped ML systems, not only notebooks. Prefer measurable model impact." },
  { title: "DevOps Engineer", years: [3, 8], stack: "AWS, Docker, Kubernetes, CI/CD, monitoring, Terraform", workMode: "location", location: "Pune hybrid", salary: [16, 38], wantsProject: true, notes: "Prefer people who improved reliability, automated deployments, and handled incidents calmly." },
  { title: "QA Engineer", years: [1, 6], stack: "Manual testing, automation, Playwright or Selenium, API testing, bug reports", workMode: "remote", location: "", salary: [5, 18], wantsProject: true, notes: "Look for careful testing habits, clear bug writing, and ownership of release quality." },
  { title: "Finance Executive", years: [1, 5], stack: "Tally, Excel, invoicing, reconciliation, GST, reporting", workMode: "location", location: "Mumbai onsite", salary: [4, 12], wantsProject: false, notes: "Prefer accurate reporting, clean documentation, and comfort with month-end work." },
  { title: "Business Analyst", years: [2, 6], stack: "Requirements, Excel, SQL basics, dashboards, stakeholder communication", workMode: "location", location: "Bengaluru hybrid", salary: [8, 20], wantsProject: true, notes: "Look for clear requirements, business sense, and ability to turn messy asks into action." },
];

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const workAreaRef = useRef<HTMLDivElement | null>(null);
  const [roleTitle, setRoleTitle] = useState("Senior Data Engineer");
  const [experienceMin, setExperienceMin] = useState(4);
  const [experienceMax, setExperienceMax] = useState(7);
  const [keyLanguages, setKeyLanguages] = useState("Python, Spark, Kafka, Airflow, GCP or AWS");
  const [wantsProject, setWantsProject] = useState(true);
  const [workMode, setWorkMode] = useState<"remote" | "location">("location");
  const [location, setLocation] = useState("Bengaluru hybrid");
  const [salaryMin, setSalaryMin] = useState(18);
  const [salaryMax, setSalaryMax] = useState(28);
  const [roleNotes, setRoleNotes] = useState("Prefer people who have owned real projects and worked well with a team.");
  const [csv, setCsv] = useState("");
  const [candidates, setCandidates] = useState<CandidateInput[]>([]);
  const [dataMode, setDataMode] = useState<CandidateDataMode>("standard");
  const [redrobCandidateCount, setRedrobCandidateCount] = useState(0);
  const [redrobRows, setRedrobRows] = useState<RedrobRankingRow[]>([]);
  const [redrobCsv, setRedrobCsv] = useState("");
  const [redrobBiasAudit, setRedrobBiasAudit] = useState<BiasAudit | null>(null);
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
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>("local");
  const [showVisionNotes, setShowVisionNotes] = useState(false);
  const [inviteLink, setInviteLink] = useState("https://cal.com/your-team/interview");

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
  const candidateLimitState = candidates.length > hardCandidateLimit ? "hard" : candidates.length > softCandidateLimit ? "soft" : "ok";
  const loadedCandidateCount = dataMode === "redrob" ? redrobCandidateCount : candidates.length;
  const rankedCount = dataMode === "redrob" ? redrobRows.length : finalWithScores.length;
  const setupReady =
    dataMode === "redrob"
      ? roleReady && redrobCandidateCount > 0 && Boolean(outputFormat)
      : roleReady && candidates.length > 0 && candidates.length <= hardCandidateLimit && inviteCap > 0 && Boolean(outputFormat);
  const ready = setupReady;

  useEffect(() => {
    function updateVisionNotes() {
      const target = workAreaRef.current;
      if (!target) return;
      const top = target.getBoundingClientRect().top;
      setShowVisionNotes(top < window.innerHeight * 0.48);
    }

    const frame = window.requestAnimationFrame(updateVisionNotes);
    window.addEventListener("scroll", updateVisionNotes, { passive: true });
    window.addEventListener("resize", updateVisionNotes);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateVisionNotes);
      window.removeEventListener("resize", updateVisionNotes);
    };
  }, [phase]);

  async function parseCsvText(nextCsv = csv, nextMode: CandidateDataMode = dataMode) {
    setError(null);
    setStatus("reading candidate data");
    if (nextMode === "redrob" || looksLikeRedrobData(nextCsv)) {
      await parseRedrobText(nextCsv);
      return;
    }
    const response = await fetch(`${apiBase}/csv/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: nextCsv }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readError(payload));
    setCandidates(payload.candidates);
    setDataMode("standard");
    setRedrobCandidateCount(0);
    setRedrobRows([]);
    setRedrobCsv("");
    setRedrobBiasAudit(null);
    setResult(null);
    setRunId(null);
    setPhase("setup");
    setStatus(`parsed ${payload.candidates.length} candidates`);
  }

  async function parseRedrobText(nextText = csv) {
    setError(null);
    setStatus("reading Redrob candidates");
    const response = await fetch(`${apiBase}/redrob/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: nextText }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readError(payload));
    setDataMode("redrob");
    setCandidates([]);
    setRedrobCandidateCount(payload.count);
    setRedrobRows([]);
    setRedrobCsv("");
    setRedrobBiasAudit(null);
    setResult(null);
    setRunId(null);
    setPhase("setup");
    setStatus(`parsed ${payload.count} Redrob candidates`);
  }

  async function runPipeline() {
    if (!ready) {
      setError("Complete role requirements, add candidate data, choose output format, and set invite cap before running.");
      return;
    }
    if (dataMode === "redrob") {
      await runRedrobRanking();
      return;
    }
    setPhase("processing");
    setStatus("running");
    setRunProgress(8);
    setProgressLabel("Reading your candidates");
    setError(null);
    await delay(350);
    setRunProgress(24);
    setProgressLabel("Reading role parameters");
    await delay(350);
    setRunProgress(42);
    setProgressLabel("Checking role fit");
    try {
      const response = await fetch(`${apiBase}/pipeline-runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleDescription,
          candidates,
          options: { strictMode, inviteCap, githubMode: "fallback", aiReview: privacyMode === "ai" },
        }),
      });
      const payload: RunResponse | { error: unknown } = await response.json();
      if (!response.ok) {
        setStatus("error");
        setRunProgress(0);
        setProgressLabel("shortlist stopped");
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
      setProgressLabel("Shortlist ready");
      setStatus("complete");
      window.setTimeout(() => setRunProgress(0), 900);
    } catch (err) {
      setStatus("error");
      setRunProgress(0);
      setProgressLabel("shortlist stopped");
      setError(err instanceof Error ? err.message : "Could not reach local API");
    }
  }

  async function runRedrobRanking() {
    if (redrobRows.length && redrobCsv && !csv.trim()) {
      setPhase("processing");
      setStatus("complete");
      setProgressLabel("Full challenge output ready");
      setRunProgress(0);
      setError(null);
      return;
    }
    setPhase("processing");
    setStatus("running");
    setRunProgress(8);
    setProgressLabel("Reading Redrob candidate profiles");
    setError(null);
    await delay(350);
    setRunProgress(34);
    setProgressLabel("Scoring against the Senior AI Engineer JD");
    try {
      const response = await fetch(`${apiBase}/redrob/rank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: csv, limit: 100 }),
      });
      const payload: RedrobRankResponse | { error: unknown } = await response.json();
      if (!response.ok) {
        setStatus("error");
        setRunProgress(0);
        setProgressLabel("ranking stopped");
        setError(readError(payload));
        return;
      }
      setRunProgress(78);
      setProgressLabel("Building validator-ready CSV");
      await delay(350);
      const typed = payload as RedrobRankResponse;
      setRedrobRows(typed.rows);
      setRedrobCsv(typed.csv);
      setRedrobCandidateCount(typed.count);
      setRedrobBiasAudit(typed.biasAudit);
      setResult(null);
      setRunId(null);
      setSimulationScores({});
      setRunProgress(100);
      setProgressLabel("Challenge CSV ready");
      setStatus("complete");
      window.setTimeout(() => setRunProgress(0), 900);
    } catch (err) {
      setStatus("error");
      setRunProgress(0);
      setProgressLabel("ranking stopped");
      setError(err instanceof Error ? err.message : "Could not reach local API");
    }
  }

  async function loadRedrobChallengeOutput() {
    setError(null);
    setStatus("loading Redrob challenge");
    setProgressLabel("Loading full challenge output");
    setDataMode("redrob");
    setPhase("setup");
    applyRoleTemplate("Senior AI Engineer");
    try {
      const response = await fetch("/redrob-challenge-result.json", { cache: "no-cache" });
      const payload = (await response.json()) as RedrobChallengeAsset;
      if (!response.ok || !Array.isArray(payload.rows)) throw new Error("Could not load the bundled Redrob result.");
      setCandidates([]);
      setCsv("");
      setRedrobCandidateCount(payload.processedCandidates);
      setRedrobRows(payload.rows);
      setRedrobCsv(exportRowsAsRedrobCsv(payload.rows));
      setRedrobBiasAudit(payload.biasAudit);
      setResult(null);
      setRunId(null);
      setUploadedFileName("Full Redrob challenge output");
      setOutputFormat("report_csv");
      setRunProgress(0);
      setProgressLabel(`Ready: ${payload.processedCandidates.toLocaleString()} Redrob candidates`);
      setStatus("challenge ready");
      setPhase("setup");
    } catch (err) {
      setStatus("error");
      setRunProgress(0);
      setProgressLabel("challenge load stopped");
      setError(err instanceof Error ? err.message : "Could not load the Redrob challenge output");
    }
  }

  async function importCsvFile(file: File | null) {
    if (!file) return;
    setUploadedFileName(file.name);
    setStatus(`reading ${file.name}`);
    setError(null);
    if (file.name.endsWith(".gz") || file.size > 8 * 1024 * 1024) {
      setDataMode(file.name.includes("json") || file.name.endsWith(".gz") ? "redrob" : "standard");
      setStatus("use streaming ranker");
      setError("This file is too large for the browser upload path. Use the local challenge:rank command for the full candidates.jsonl file.");
      return;
    }
    const text = await file.text();
    setCsv(text);
    setStatus(`loaded ${file.name}`);
    try {
      await parseCsvText(text, candidateModeFromFile(file.name, text));
      setStatus(`parsed ${file.name}`);
    } catch (err) {
      setStatus("error");
      setCandidates([]);
      setRedrobCandidateCount(0);
      setError(err instanceof Error ? err.message : "Could not read candidate data");
    }
  }

  function downloadTemplate() {
    const template = "name,email,experience_years,location,skills,github_url,salary_expectation_lpa,summary\n";
    const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "seederpro_candidate_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    if (dataMode === "redrob") {
      exportRedrobCsv();
      return;
    }
    if (!finalWithScores.length) return;
    const columns = [
      "rank",
      "name",
      "email",
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

  function exportRedrobCsv() {
    if (!redrobCsv) return;
    const blob = new Blob([redrobCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "redrob_submission.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function applyRoleTemplate(title: string) {
    const template = roleTemplates.find((item) => item.title === title);
    if (!template) return;
    setRoleTitle(template.title);
    setExperienceMin(template.years[0]);
    setExperienceMax(template.years[1]);
    setKeyLanguages(template.stack);
    setWorkMode(template.workMode);
    setLocation(template.location);
    setSalaryMin(template.salary[0]);
    setSalaryMax(template.salary[1]);
    setWantsProject(template.wantsProject);
    setRoleNotes(template.notes);
    setError(null);
  }

  function exportEmailCsv(type: "invite" | "sorry") {
    if (!result) return;
    const rows = buildEmailRows(type, finalWithScores, result.gate1, roleTitle, inviteLink);
    if (!rows.length) return;
    const columns = ["name", "email", "subject", "body"];
    const body = rows.map((row) => columns.map((column) => quoteCsv(String(row[column as keyof EmailRow] ?? ""))).join(","));
    const blob = new Blob([[columns.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = type === "invite" ? "sifter_invite_emails.csv" : "sifter_sorry_emails.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadReport() {
    if (!result || !finalWithScores.length) return;
    const report = buildMarkdownReport({
      roleTitle,
      roleDescription,
      result,
      rows: finalWithScores,
      outputFormat,
      privacyMode,
      strictMode,
    });
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sifter_recruiter_report.md";
    link.click();
    URL.revokeObjectURL(url);
  }

  function clearCsvData() {
    setCsv("");
    setCandidates([]);
    setDataMode("standard");
    setRedrobCandidateCount(0);
    setRedrobRows([]);
    setRedrobCsv("");
    setRedrobBiasAudit(null);
    setUploadedFileName(null);
    setResult(null);
    setRunId(null);
    setSimulationScores({});
    setStatus("idle");
    setProgressLabel("waiting for inputs");
    setRunProgress(0);
    setError(null);
  }

  function clearCurrentRun() {
    setResult(null);
    setRunId(null);
    setRedrobRows([]);
    setRedrobCsv("");
    setRedrobBiasAudit(null);
    setSimulationScores({});
    setStatus(loadedCandidateCount ? `parsed ${loadedCandidateCount} candidates` : "idle");
    setProgressLabel("waiting for inputs");
    setRunProgress(0);
    setError(null);
    setShowAuditGates(false);
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
          <button className="btn btn-secondary" onClick={downloadReport} disabled={!finalWithScores.length || outputFormat === "csv"}>
            <Download size={16} />
            Report
          </button>
          <button className="btn btn-secondary" onClick={exportCsv} disabled={!rankedCount || outputFormat === "report"}>
            <FileDown size={16} />
            {dataMode === "redrob" ? "Challenge CSV" : "Export"}
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
          <div className="eyebrow">Recruiter shortlist helper</div>
          <h1>Simple, private & cheap help to find your shortlist.</h1>
          <p>
            Bring your candidate data, tell Sifter what you need, and leave with a shortlist you can explain to your team.
          </p>
        </div>
        <div className="hero-console" aria-label="Pipeline status">
          <div className="console-header">
            <span>sifter.status</span>
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
            <Metric value={loadedCandidateCount} label="candidates" />
            <Metric value={dataMode === "redrob" ? redrobRows.slice(0, 10).length : result?.gate1.filter((candidate) => candidate.hardPass).length ?? 0} label={dataMode === "redrob" ? "top 10" : "passed gate 1"} />
            <Metric value={dataMode === "redrob" ? 100 : result?.invited.length ?? 0} label={dataMode === "redrob" ? "target rows" : "invited"} />
            <Metric value={rankedCount} label="ranked" />
          </div>
          <div className="cost-meter">
            <span>{privacyMode === "local" ? "free local mode" : `AI capped at top ${aiReviewLimit}`}</span>
            <strong>{result?.intelligence?.reviewedCandidates ?? 0} extra reviews used</strong>
          </div>
        </div>
      </section>
      <FloatingPrincipleClouds visible={showVisionNotes} />

      <div ref={workAreaRef} className={phase === "processing" ? "workbench pipeline-stage" : "input-stage"}>
        {phase === "role" ? (
          <section className="panel input-panel">
            <PanelTitle
              title="Step 1: Role Requirements"
              meta={roleReady ? "ready" : "required"}
              action={
                <button className="btn btn-primary panel-title-button" type="button" onClick={loadRedrobChallengeOutput} disabled={status === "running"}>
                  <Database size={15} />
                  Redrob Challenge
                </button>
              }
            />
            <StepRail phase={phase} />

            <div className="role-builder">
              <Field label="Start from template">
                <select className="field-control compact-control" defaultValue="" onChange={(event) => applyRoleTemplate(event.target.value)}>
                  <option value="" disabled>
                    Choose a common role
                  </option>
                  {roleTemplates.map((template) => (
                    <option key={template.title} value={template.title}>
                      {template.title}
                    </option>
                  ))}
                </select>
              </Field>

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
            <PanelTitle title="Step 2: Candidate Data & Output Setup" meta={candidates.length ? `${candidates.length} ready` : "waiting"} />
            <StepRail phase={phase} />

            <div className="role-preview setup-role-preview">
              <span>Role locked for this run</span>
              <p>{roleDescription}</p>
            </div>

            <Field label="Candidate data">
              <div className="button-row">
                <div className="segmented-control data-mode-control">
                  <button type="button" className={dataMode === "standard" ? "active" : ""} onClick={() => setDataMode("standard")}>
                    CSV
                  </button>
                  <button type="button" className={dataMode === "redrob" ? "active" : ""} onClick={() => setDataMode("redrob")}>
                    Redrob
                  </button>
                </div>
                <button className="btn btn-secondary" type="button" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={16} />
                  Upload candidate data
                </button>
                <button className="btn btn-primary" type="button" onClick={loadRedrobChallengeOutput} disabled={status === "running"}>
                  <Database size={16} />
                  Redrob Challenge
                </button>
                <input
                  ref={fileInputRef}
                  className="hidden-input"
                  type="file"
                  accept=".csv,text/csv,.json,.jsonl,application/json"
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
                <span>{loadedCandidateCount ? `${loadedCandidateCount} candidates ready` : "0 candidates ready"}</span>
              </div>
              <textarea
                className="field-control csv-box"
                value={csv}
                onChange={(event) => setCsv(event.target.value)}
                placeholder={dataMode === "redrob" ? "Paste Redrob JSON array or JSONL here" : "Paste candidate CSV here"}
              />
              <button
                className="btn btn-secondary full-width"
                type="button"
                onClick={() =>
                  parseCsvText(csv, dataMode).catch((err: Error) => {
                    setStatus("error");
                    setCandidates([]);
                    setRedrobCandidateCount(0);
                    setError(err.message);
                  })
                }
              >
                Read candidate data
              </button>
            </Field>

            <div className="settings-grid">
              <Field label="Output format">
                <select className="field-control compact-control" value={outputFormat} onChange={(event) => setOutputFormat(event.target.value as OutputFormat)}>
                  <option value="report_csv">Report + data file</option>
                  <option value="report">Report only</option>
                  <option value="csv">Data file only</option>
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

            <Field label="Interview invite link">
              <input
                className="field-control compact-control"
                value={inviteLink}
                onChange={(event) => setInviteLink(event.target.value)}
                placeholder="Paste Calendly, Google Meet, or scheduling link"
              />
            </Field>

            <Field label="Privacy mode">
              <div className="segmented-control">
                <button type="button" className={privacyMode === "local" ? "active" : ""} onClick={() => setPrivacyMode("local")}>
                  Local only
                </button>
                <button type="button" className={privacyMode === "ai" ? "active" : ""} onClick={() => setPrivacyMode("ai")}>
                  AI assisted
                </button>
              </div>
              <div className="privacy-note">
                {privacyMode === "local"
                  ? "Keep this run on your machine and get the shortlist without using AI."
                  : "Use extra AI help only for the recommended candidates."}
              </div>
            </Field>

            <TrustStrip
              privacyMode={privacyMode}
              candidateCount={loadedCandidateCount}
              reviewedCandidates={result?.intelligence?.reviewedCandidates ?? 0}
            />

            {dataMode === "standard" && candidates.length ? (
              <div className={`candidate-limit ${candidateLimitState}`}>
                <strong>{candidates.length} candidates loaded</strong>
                <span>
                  {candidateLimitState === "hard"
                    ? `Hard limit is ${hardCandidateLimit}. Split the candidate data before running.`
                    : candidateLimitState === "soft"
                      ? `Large file warning: above ${softCandidateLimit}, review may take longer.`
                      : "Candidate data size is within the recommended local range."}
                </span>
              </div>
            ) : null}

            {dataMode === "redrob" && redrobCandidateCount ? (
              <div className="candidate-limit">
                <strong>{redrobCandidateCount} Redrob candidates loaded</strong>
                <span>
                  {redrobRows.length
                    ? "Full challenge output loaded from the 100,000-candidate run and ready to inspect or export."
                    : "Challenge mode ranks against the bundled Senior AI Engineer JD and exports the required top-100 CSV."}
                </span>
              </div>
            ) : null}

            <label className="toggle-control setup-toggle">
              <input type="checkbox" checked={strictMode} onChange={(event) => setStrictMode(event.target.checked)} />
              <span>Strict matching</span>
            </label>

            {error ? <div className="error-box">{error}</div> : null}

            <div className="danger-actions">
              <button className="btn btn-secondary" type="button" onClick={clearCsvData} disabled={!csv && !loadedCandidateCount && !result && !redrobRows.length}>
                Clear candidate data
              </button>
              <button className="btn btn-secondary" type="button" onClick={clearCurrentRun} disabled={!result && !redrobRows.length}>
                Clear run
              </button>
            </div>

            <div className="stage-actions stage-actions-split">
              <button className="btn btn-secondary" type="button" onClick={() => setPhase("role")}>
                <ArrowLeft size={16} />
                Back
              </button>
              {setupReady ? (
                <button className="btn btn-primary run-step-button" onClick={runPipeline} disabled={status === "running"}>
                  <Play size={16} />
                  {status === "running" ? "Finding shortlist" : dataMode === "redrob" ? "Rank challenge" : "Find shortlist"}
                </button>
              ) : (
                <div className="setup-waiting">The shortlist button appears after your candidate data and settings are ready.</div>
              )}
            </div>
          </section>
        ) : null}

        {phase === "processing" ? (
        <section className="pipeline-stack">
          <section className="panel run-panel">
            <PanelTitle title="Step 3: Processing & Results" meta={ready ? `${loadedCandidateCount} candidates loaded` : "needs input"} />
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
                <strong>{uploadedFileName ?? (dataMode === "redrob" ? "Pasted Redrob data" : "Pasted candidate data")}</strong>
              </div>
              <div>
                <span>Output</span>
                <strong>{outputFormatLabel(outputFormat)}</strong>
              </div>
              <div>
                <span>Privacy</span>
                <strong>{privacyMode === "ai" ? "AI assisted" : "Local only"}</strong>
              </div>
            </div>
            <div className="stage-actions">
              <button className="btn btn-secondary" onClick={() => setPhase("setup")}>
                <ArrowLeft size={16} />
                Edit setup
              </button>
              <button className="btn btn-secondary" onClick={clearCurrentRun} disabled={!result && !redrobRows.length}>
                Clear run
              </button>
            </div>
            {error ? <div className="error-box">{error}</div> : null}
          </section>
          {dataMode === "redrob" && redrobRows.length ? <RedrobChallengeSummary rows={redrobRows} candidateCount={redrobCandidateCount} /> : null}
          {dataMode === "redrob" && redrobBiasAudit ? <BiasAuditPanel audit={redrobBiasAudit} /> : null}
          {dataMode === "standard" && result ? <ResultSummary result={result} recommended={finalWithScores} inviteCap={inviteCap} strictMode={strictMode} /> : null}
          {dataMode === "standard" && result ? <BiasAuditPanel audit={result.biasAudit} /> : null}
          {dataMode === "standard" && result ? (
            <TrustStrip
              privacyMode={privacyMode}
              candidateCount={result.gate1.length}
              reviewedCandidates={result.intelligence?.reviewedCandidates ?? 0}
              resultReady
            />
          ) : null}
          {dataMode === "redrob" && outputFormat !== "report" ? <RedrobChallengeRanking rows={redrobRows} /> : null}
          {dataMode === "standard" && outputFormat !== "csv" ? <RecommendedCandidates rows={finalWithScores} inviteCap={inviteCap} /> : null}
          {dataMode === "standard" && result ? <EmailConnector rows={finalWithScores} allRows={result.gate1} roleTitle={roleTitle} inviteLink={inviteLink} onExport={exportEmailCsv} /> : null}
          {dataMode === "standard" ? <Simulation rows={result?.simulation ?? []} scores={simulationScores} setScores={setSimulationScores} /> : null}
          {dataMode === "standard" && outputFormat !== "report" ? <Final rows={finalWithScores} /> : null}
          {dataMode === "standard" ? <section className="panel audit-panel">
            <button className="audit-toggle" type="button" onClick={() => setShowAuditGates(!showAuditGates)}>
              <ShieldCheck size={16} />
              {showAuditGates ? "Hide full reasons" : "Show full reasons"}
            </button>
            {showAuditGates ? (
              <div className="audit-stack">
                <Gate title="Gate 1: Hard Filter" rows={result?.gate1 ?? []} kind="gate1" />
                <Gate title="Gate 2: Profile Score" rows={result?.gate2 ?? []} kind="gate2" />
                <Gate title="Gate 3: Risk And Intent" rows={result?.gate3 ?? []} kind="gate3" />
                <Gate title="Gate 4: Ownership Probe" rows={result?.gate4 ?? []} kind="gate4" />
              </div>
            ) : null}
          </section> : null}
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

function PanelTitle({ title, meta, action }: { title: string; meta: string; action?: React.ReactNode }) {
  return (
    <div className="panel-title">
      <div className="panel-title-main">
        <span>{title}</span>
        {action}
      </div>
      <span className="panel-title-meta">{meta}</span>
    </div>
  );
}

function StepRail({ phase }: { phase: Phase }) {
  const steps: { id: Phase; label: string }[] = [
    { id: "role", label: "Role" },
    { id: "setup", label: "Data & Output" },
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

function FloatingPrincipleClouds({ visible }: { visible: boolean }) {
  return (
    <section className={visible ? "vision-notes is-visible" : "vision-notes"} aria-label="Sifter product principles" aria-hidden={!visible}>
      {productPrinciples.map((principle) => (
        <article key={principle.key} className={`vision-note vision-note-${principle.key}`}>
          <div className="vision-note-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <span>{principle.title}</span>
            <p>{principle.body}</p>
          </div>
        </article>
      ))}
    </section>
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
        <div className="empty-state">Waiting for your shortlist.</div>
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
        <div className="empty-state">Find your shortlist to see the final list here.</div>
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

function RedrobChallengeSummary({ rows, candidateCount }: { rows: RedrobRankingRow[]; candidateCount: number }) {
  const top = rows[0];
  const floor = rows[rows.length - 1];
  return (
    <section className="panel summary-panel">
      <PanelTitle title="Redrob Challenge Output" meta={`${rows.length} rows`} />
      <div className="summary-grid">
        <Metric value={candidateCount} label="loaded" />
        <Metric value={rows.length} label="ranked" />
        <Metric value={top ? Math.round(top.score * 1000) : 0} label="top score x1000" />
        <Metric value={floor ? Math.round(floor.score * 1000) : 0} label="cutoff x1000" />
      </div>
      <div className="summary-message">
        Ranking uses the bundled Senior AI Engineer JD: production retrieval and ranking systems, evaluation depth, Python, shipper mindset, and Redrob availability signals. Names and school prestige are not used as scoring boosts.
      </div>
    </section>
  );
}

function BiasAuditPanel({ audit }: { audit: BiasAudit }) {
  const flagged = audit.proxyGroups.filter((group) => group.flag !== "ok").slice(0, 6);
  const visibleGroups = flagged.length ? flagged : audit.proxyGroups.slice(0, 4);
  return (
    <section className={`panel bias-panel bias-${audit.status}`}>
      <PanelTitle title="Bias Guardrail" meta={audit.status === "pass" ? "checked" : "review needed"} />
      <div className="bias-summary">
        <ShieldCheck size={18} />
        <div>
          <strong>{audit.summary}</strong>
          <span>Protected attributes used for scoring: {audit.protectedAttributesUsed.length}</span>
        </div>
      </div>
      <div className="bias-plain-note">
        In simple words: Sifter tries to judge people by job proof, not identity clues. It ignores names, school prestige,
        and similar signals, then checks whether the shortlist is leaning too heavily toward proxy groups like location,
        notice period, or experience band. If something looks uneven, it marks it for human review instead of pretending
        the score is automatically fair.
      </div>
      <div className="bias-grid">
        <div>
          <span>Removed from scoring</span>
          <p>{audit.excludedSignals.slice(0, 6).join(", ")}</p>
        </div>
        <div>
          <span>Mitigation</span>
          <p>{audit.mitigations.slice(0, 3).join("; ")}</p>
        </div>
      </div>
      {visibleGroups.length ? (
        <div className="bias-table">
          {visibleGroups.map((group) => (
            <div key={`${group.field}-${group.group}`} className={group.flag === "ok" ? "" : "flagged"}>
              <span>{group.field}</span>
              <strong>{group.group}</strong>
              <p>
                selected {(group.selectedShare * 100).toFixed(1)}% vs pool {(group.poolShare * 100).toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      ) : null}
      <div className="bias-warning">{audit.warnings[0]}</div>
    </section>
  );
}

function RedrobChallengeRanking({ rows }: { rows: RedrobRankingRow[] }) {
  const reviewRows = rows.slice(0, 4);
  return (
    <section className="panel gate-panel">
      <PanelTitle title="Challenge Submission Rows" meta={rows.length ? "validator columns" : "waiting"} />
      {!rows.length ? (
        <div className="empty-state">Run the Redrob challenge ranker to generate the top-100 submission rows.</div>
      ) : (
        <>
          <div className="challenge-agent-stack">
            {reviewRows.map((row) => (
              <article key={`agent-${row.candidate_id}`} className="challenge-agent-card">
                <div className="challenge-agent-head">
                  <span>#{row.rank}</span>
                  <strong>{row.candidate_id}</strong>
                </div>
                <ReviewerOpinions opinions={buildRedrobAgentOpinions(row)} />
              </article>
            ))}
          </div>
          <div className="table-frame">
            <table className="challenge-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Candidate ID</th>
                  <th>Score</th>
                  <th>Reasoning</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.candidate_id}>
                    <td>{row.rank}</td>
                    <td className="strong-cell">{row.candidate_id}</td>
                    <td>{row.score.toFixed(4)}</td>
                    <td>{row.reasoning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function EmailConnector({
  rows,
  allRows,
  roleTitle,
  inviteLink,
  onExport,
}: {
  rows: GateCandidate[];
  allRows: GateCandidate[];
  roleTitle: string;
  inviteLink: string;
  onExport: (type: "invite" | "sorry") => void;
}) {
  const inviteRows = buildEmailRows("invite", rows, allRows, roleTitle, inviteLink);
  const sorryRows = buildEmailRows("sorry", rows, allRows, roleTitle, inviteLink);
  const firstInvite = inviteRows.find((row) => row.email) ?? inviteRows[0];
  const firstSorry = sorryRows.find((row) => row.email) ?? sorryRows[0];

  return (
    <section className="panel email-panel">
      <PanelTitle title="Email Connector" meta={`${inviteRows.length} invites, ${sorryRows.length} sorry notes`} />
      <div className="email-grid">
        <div className="email-card">
          <span>Selected candidates</span>
          <strong>Invite to interview</strong>
          <p>Open a ready email draft with your interview link, or export all invite emails for mail merge.</p>
          <div className="email-actions">
            <a className={`btn btn-secondary ${firstInvite ? "" : "is-disabled"}`} href={firstInvite ? mailtoLink(firstInvite) : undefined}>
              Open invite draft
            </a>
            <button className="btn btn-secondary" type="button" onClick={() => onExport("invite")} disabled={!inviteRows.length}>
              Export invites
            </button>
          </div>
        </div>
        <div className="email-card">
          <span>Not selected</span>
          <strong>Send kind update</strong>
          <p>Give every other applicant a respectful note instead of leaving them waiting.</p>
          <div className="email-actions">
            <a className={`btn btn-secondary ${firstSorry ? "" : "is-disabled"}`} href={firstSorry ? mailtoLink(firstSorry) : undefined}>
              Open sorry draft
            </a>
            <button className="btn btn-secondary" type="button" onClick={() => onExport("sorry")} disabled={!sorryRows.length}>
              Export sorry notes
            </button>
          </div>
        </div>
      </div>
      <div className="email-preview">
        <span>Preview</span>
        <strong>{firstInvite?.subject ?? "No invite draft yet"}</strong>
        <p>{firstInvite?.body ?? "Run the shortlist to create invite and sorry email drafts."}</p>
      </div>
    </section>
  );
}

function TrustStrip({
  privacyMode,
  candidateCount,
  reviewedCandidates,
  resultReady = false,
}: {
  privacyMode: PrivacyMode;
  candidateCount: number;
  reviewedCandidates: number;
  resultReady?: boolean;
}) {
  const costLabel = privacyMode === "local" ? "No AI cost" : `AI help for top ${aiReviewLimit}`;
  const dataLabel =
    privacyMode === "local"
      ? "Your candidate list stays on this local setup for the run."
      : "Only the recommended candidates get the extra review.";
  const runLabel = resultReady ? `${candidateCount} candidates checked` : candidateCount ? `${candidateCount} candidates ready` : "Waiting for candidate data";

  return (
    <section className={resultReady ? "panel trust-panel" : "trust-panel trust-panel-inline"}>
      <PanelTitle title="Your Hiring Guardrails" meta={runLabel} />
      <div className="trust-grid">
        <div>
          <span>Keep costs calm</span>
          <strong>{costLabel}</strong>
          <p>{privacyMode === "local" ? "Best for everyday screening and larger candidate lists." : `${reviewedCandidates} candidate${reviewedCandidates === 1 ? "" : "s"} got extra help in this run.`}</p>
        </div>
        <div>
          <span>Respect privacy</span>
          <strong>{privacyMode === "local" ? "Stays local" : "Shared carefully"}</strong>
          <p>{dataLabel}</p>
        </div>
        <div>
          <span>Stay in control</span>
          <strong>You decide</strong>
          <p>Sifter helps you see who to review next. You still make the hiring call.</p>
        </div>
        <div>
          <span>Explain the choice</span>
          <strong>Reasons included</strong>
          <p>Each recommendation shows strengths, concerns, missing proof, and what to ask next.</p>
        </div>
      </div>
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
                    <div className="reviewer-pill">{report.reviewer === "local" ? "Local note" : "Extra note"}</div>
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
                <ReviewerOpinions opinions={report.agentOpinions} />
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

function ReviewerOpinions({ opinions }: { opinions: ReviewAgentOpinion[] }) {
  return (
    <div className="agent-review-panel">
      <div className="agent-review-title">
        <Brain size={15} />
        <span>Cross-question agents</span>
      </div>
      <div className="agent-review-grid">
        {opinions.map((opinion) => (
          <div key={opinion.agent} className="agent-review-card">
            <span>{opinion.agent}</span>
            <strong>{opinion.verdict}</strong>
            <p>{opinion.question}</p>
            <em>{opinion.focus}</em>
          </div>
        ))}
      </div>
    </div>
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
    row.hireConfidence === "provisional" ? "Final confidence still needs a live exercise or recruiter score." : "",
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
    strengths: ai?.strengths?.length ? ai.strengths : strengths.length ? strengths : ["Matched the key role needs and stayed competitive."],
    weaknesses: ai?.weaknesses?.length ? ai.weaknesses : weaknesses.length ? weaknesses : ["No major concern found in the candidate data; still verify live examples."],
    missingEvidence: ai?.missingEvidence?.length ? ai.missingEvidence : missingEvidence,
    interviewQuestion: ai?.interviewQuestion ?? interviewQuestion,
    nextAction: ai?.nextAction ?? nextAction,
    riskLevel: ai?.riskLevel ?? riskLevel,
    confidenceNote: ai?.confidenceNote ?? "Local note only; no extra AI note was added.",
    sourceFields: cleanSourceFields(ai?.sourceFields ?? ["skills", "summary", "profileScore", "deepScore", "ownershipScore"]),
    reviewer: ai?.provider ?? "local",
    rankReason: `Why top 5: ranked #${row.rank} because the combined score (${row.finalScore ?? 0}) is built from ${scoreParts.join(", ")}.`,
    agentOpinions: buildCandidateAgentOpinions(row, {
      riskLevel: ai?.riskLevel ?? riskLevel,
      nextAction: ai?.nextAction ?? nextAction,
      missingEvidence: ai?.missingEvidence?.length ? ai.missingEvidence : missingEvidence,
      interviewQuestion: ai?.interviewQuestion ?? interviewQuestion,
    }),
  };
}

function buildCandidateAgentOpinions(
  row: GateCandidate,
  report: {
    riskLevel: "Low" | "Medium" | "High";
    nextAction: string;
    missingEvidence: string[];
    interviewQuestion: string;
  },
): ReviewAgentOpinion[] {
  const score = row.finalScore ?? row.ownershipScore ?? row.deepScore ?? row.profileScore ?? 0;
  const skills = row.skillsList.slice(0, 3).join(", ") || "the listed skills";
  const flags = row.redFlags && row.redFlags !== "none" ? row.redFlags : "no major listed red flag";
  const salary = row.salary_expectation_lpa ? `${row.salary_expectation_lpa} LPA` : "not listed";
  const evidenceGap = report.missingEvidence[0] ?? "live proof";

  return [
    {
      agent: "Hiring Manager",
      verdict: score >= 82 ? "Strong role-fit, but still needs proof of ownership." : "Possible fit; compare against stronger profiles before advancing.",
      question: `Ask: which ${skills} project did they personally own from problem to result?`,
      focus: "Checks whether the person can actually do the job.",
    },
    {
      agent: "Interview Designer",
      verdict: "Do not rely only on the resume; test the weakest assumption live.",
      question: report.interviewQuestion,
      focus: "Turns the shortlist into a practical interview plan.",
    },
    {
      agent: "Recruiter Ops",
      verdict: report.nextAction,
      question: `Confirm location, salary (${salary}), availability, and whether ${evidenceGap.toLowerCase()} can be shared.`,
      focus: "Checks whether the candidate is realistic to move forward.",
    },
    {
      agent: "Bias & Compliance",
      verdict: `Decision should stay tied to job evidence; current risk is ${report.riskLevel.toLowerCase()}.`,
      question: `Are we advancing this person because of skills and proof, not name, school, background, or proxies? Current flag: ${flags}.`,
      focus: "Challenges unfair or weak reasoning before a human decision.",
    },
  ];
}

function buildRedrobAgentOpinions(row: RedrobRankingRow): ReviewAgentOpinion[] {
  const scoreLabel = row.score >= 0.92 ? "high-confidence" : row.score >= 0.84 ? "solid" : "review-needed";
  const concern = row.reasoning.match(/Concern: ([^.]+)\./)?.[1] ?? "no single concern listed";
  const matched = row.reasoning.match(/matches ([^.;]+) from/)?.[1] ?? "the listed role evidence";
  const production = row.reasoning.match(/production proof includes ([^.;]+)/)?.[1] ?? "production proof";

  return [
    {
      agent: "Hiring Manager",
      verdict: `${scoreLabel} fit based on ${matched}.`,
      question: `Ask them to explain one shipped system using ${matched} and what tradeoff they owned.`,
      focus: "Validates job capability, not just ranking position.",
    },
    {
      agent: "Technical Interviewer",
      verdict: `Interview should test ${production}.`,
      question: "Give a retrieval/ranking failure case and ask how they would debug metrics, data quality, and rollout risk.",
      focus: "Turns the score into a real technical screen.",
    },
    {
      agent: "Recruiter Ops",
      verdict: concern === "no single concern listed" ? "No major logistics concern in the reasoning." : `Check logistics: ${concern}.`,
      question: "Confirm availability, notice period, work mode, and willingness to interview before spending hiring-team time.",
      focus: "Checks practical hiring movement.",
    },
    {
      agent: "Bias & Compliance",
      verdict: "Keep the decision tied to role evidence and the audit trail.",
      question: "Would this candidate still be shortlisted if candidate ID, location, and school-style signals were hidden?",
      focus: "Challenges proxy bias before treating the rank as final.",
    },
  ];
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
  return missing.length ? missing.slice(0, 3) : ["No major missing evidence in the candidate data; verify examples in interview."];
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

function buildEmailRows(type: "invite" | "sorry", selectedRows: GateCandidate[], allRows: GateCandidate[], roleTitle: string, inviteLink: string): EmailRow[] {
  const selectedIds = new Set(selectedRows.map((row) => row.id));
  const sourceRows = type === "invite" ? selectedRows : allRows.filter((row) => !selectedIds.has(row.id));
  return sourceRows.map((row) => {
    const firstName = row.name.split(" ")[0] || row.name;
    if (type === "invite") {
      return {
        name: row.name,
        email: row.email,
        subject: `Next step for ${roleTitle || "the role"}`,
        body: [
          `Hi ${firstName},`,
          "",
          `Thanks for your interest in ${roleTitle || "the role"}. We liked your profile and would like to invite you for the next step.`,
          inviteLink ? `You can pick a time here: ${inviteLink}` : "Please reply with a few times that work for you this week.",
          "",
          "Best,",
          "Hiring team",
        ].join("\n"),
      };
    }
    return {
      name: row.name,
      email: row.email,
      subject: `Update on ${roleTitle || "your application"}`,
      body: [
        `Hi ${firstName},`,
        "",
        `Thank you for taking the time to apply for ${roleTitle || "the role"}. We reviewed your profile carefully, but we will not be moving ahead this time.`,
        "We appreciate your interest and wish you the best with your search.",
        "",
        "Best,",
        "Hiring team",
      ].join("\n"),
    };
  });
}

function mailtoLink(row: EmailRow): string {
  const params = new URLSearchParams({ subject: row.subject, body: row.body });
  return `mailto:${encodeURIComponent(row.email)}?${params.toString()}`;
}

function buildMarkdownReport({
  roleTitle,
  roleDescription,
  result,
  rows,
  outputFormat,
  privacyMode,
  strictMode,
}: {
  roleTitle: string;
  roleDescription: string;
  result: PipelineResult;
  rows: GateCandidate[];
  outputFormat: OutputFormat;
  privacyMode: PrivacyMode;
  strictMode: boolean;
}) {
  const rejected = result.gate1.filter((row) => !row.hardPass);
  const reasons = countReasons(rejected.map((row) => row.hardReason ?? "not specified")).slice(0, 5);
  const candidateSections = rows.slice(0, 5).map((row) => {
    const report = buildCandidateReport(row);
    return [
      `## #${row.rank} ${row.name}`,
      `Score: ${row.finalScore ?? "n/a"} | Confidence: ${row.hireConfidence ?? "n/a"} | Risk: ${report.riskLevel}`,
      "",
      `Next action: ${report.nextAction}`,
      "",
      `Personal note: ${report.note}`,
      "",
      `Strengths:`,
      ...report.strengths.map((item) => `- ${item}`),
      "",
      `Weaknesses:`,
      ...report.weaknesses.map((item) => `- ${item}`),
      "",
      `Missing evidence:`,
      ...report.missingEvidence.map((item) => `- ${item}`),
      "",
      `Interview question: ${report.interviewQuestion}`,
      "",
      `Cross-question agents:`,
      ...report.agentOpinions.flatMap((opinion) => [
        `- ${opinion.agent}: ${opinion.verdict}`,
        `  Question: ${opinion.question}`,
        `  Focus: ${opinion.focus}`,
      ]),
      "",
      `Review basis: ${report.confidenceNote}`,
      `Fields used: ${report.sourceFields.join(", ")}`,
      "",
    ].join("\n");
  });

  return [
    `# Sifter Recruiter Report`,
    "",
    `Role: ${roleTitle || "Untitled role"}`,
    `Generated: ${new Date().toLocaleString()}`,
    `Output format: ${outputFormatLabel(outputFormat)}`,
    `Privacy mode: ${privacyMode === "ai" ? "AI assisted" : "Local only"}`,
    `Strict filter: ${strictMode ? "on" : "off"}`,
    "",
    `## What You Asked For`,
    roleDescription,
    "",
    `## Summary`,
    `- Uploaded: ${result.gate1.length}`,
    `- Rejected: ${rejected.length}`,
    `- Invited: ${result.invited.length}`,
    `- Recommended: ${rows.length}`,
    `- Extra help: ${intelligenceMessage(result.intelligence)}`,
    `- Cost note: ${privacyMode === "local" ? "no extra AI help was used" : `extra help was limited to the top ${aiReviewLimit} recommended candidates`}`,
    `- Your call: Sifter helps you choose who to review next. You still make the hiring decision.`,
    "",
    `## How Sifter Helps`,
    ...productPrinciples.map((principle) => `- ${principle.title}: ${principle.body}`),
    "",
    `## Top Rejection Reasons`,
    ...(reasons.length ? reasons.map((reason) => `- ${reason.label}: ${reason.count}`) : ["- No dominant hard-filter rejection reason."]),
    "",
    ...candidateSections,
  ].join("\n");
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

function exportRowsAsRedrobCsv(rows: RedrobRankingRow[]): string {
  const header = "candidate_id,rank,score,reasoning";
  const body = rows.map((row) =>
    [row.candidate_id, String(row.rank), row.score.toFixed(4), row.reasoning].map((value) => quoteCsv(value)).join(","),
  );
  return [header, ...body].join("\n");
}

function outputFormatLabel(format: OutputFormat): string {
  if (format === "report") return "Report only";
  if (format === "csv") return "Data file only";
  return "Report + data file";
}

function candidateModeFromFile(fileName: string, text: string): CandidateDataMode {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".json") || lower.endsWith(".jsonl") || looksLikeRedrobData(text)) return "redrob";
  return "standard";
}

function looksLikeRedrobData(text: string): boolean {
  const trimmed = text.trimStart();
  return (
    trimmed.startsWith("[") ||
    trimmed.startsWith('{"candidate_id"') ||
    trimmed.includes('"candidate_id"') && trimmed.includes('"redrob_signals"')
  );
}

function intelligenceTitle(status?: NonNullable<PipelineResult["intelligence"]>["status"]): string {
  if (status === "completed") return "Extra review added";
  if (status === "fallback") return "Local report ready";
  return "Local review only";
}

function intelligenceMessage(intelligence?: PipelineResult["intelligence"]): string {
  if (!intelligence) return "Your local shortlist is ready.";
  if (intelligence.status === "completed") {
    return `Extra notes were added for ${intelligence.reviewedCandidates} recommended candidate${intelligence.reviewedCandidates === 1 ? "" : "s"}.`;
  }
  if (intelligence.status === "fallback") return "Extra review was not available, so Sifter kept the local shortlist ready.";
  return "No AI help used. Your local shortlist is ready.";
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
