import { z } from "zod";

export const requiredCandidateColumns = [
  "name",
  "experience_years",
  "location",
  "skills",
  "github_url",
  "salary_expectation_lpa",
  "summary",
] as const;

export const candidateSchema = z.object({
  name: z.string().min(1),
  experience_years: z.coerce.number().min(0).default(0),
  location: z.string().default(""),
  skills: z.string().default(""),
  github_url: z.string().default(""),
  salary_expectation_lpa: z.coerce.number().min(0).default(0),
  summary: z.string().default(""),
});

export const runPipelineInputSchema = z.object({
  roleDescription: z.string().min(12),
  candidates: z.array(candidateSchema).min(1),
  options: z
    .object({
      strictMode: z.boolean().default(true),
      inviteCap: z.number().int().positive().default(5),
      githubMode: z.enum(["live", "fallback"]).default("fallback"),
    })
    .default({ strictMode: true, inviteCap: 5, githubMode: "fallback" }),
});

export type CandidateInput = z.infer<typeof candidateSchema>;
export type RunPipelineInput = z.infer<typeof runPipelineInputSchema>;

export type RoleProfile = {
  minYears: number;
  maxYears: number;
  salaryMin: number;
  salaryMax: number;
  skills: string[];
  mustSkills: string[];
  skillGroups: string[][];
  locations: string[];
  strict: boolean;
};

export type GateCandidate = CandidateInput & {
  id: string;
  skillsList: string[];
  hardPass?: boolean;
  hardReason?: string;
  profileScore?: number;
  profileSignals?: string;
  advanceG2?: boolean;
  deepScore?: number;
  careerCoherence?: string;
  intentSignal?: string;
  redFlags?: string;
  advanceG3?: boolean;
  githubSignal?: string;
  githubDetail?: string;
  githubScore?: number;
  ownershipScore?: number;
  probeQuestion?: string;
  invite?: boolean;
  scenarioQuestion?: string;
  simulationScore?: number | null;
  simulationNotes?: string;
  finalScore?: number;
  hireConfidence?: "provisional" | "high" | "medium" | "low";
  recommendation?: string;
  rank?: number;
  aiReview?: CandidateAiReview;
};

export type CandidateAiReview = {
  personalNote: string;
  nextAction: string;
  riskLevel: "Low" | "Medium" | "High";
  strengths: string[];
  weaknesses: string[];
  missingEvidence: string[];
  interviewQuestion: string;
  confidenceNote: string;
  sourceFields: string[];
  provider: "gemini";
};

export type PipelineResult = {
  roleProfile: RoleProfile;
  gate1: GateCandidate[];
  gate2: GateCandidate[];
  gate3: GateCandidate[];
  gate4: GateCandidate[];
  invited: GateCandidate[];
  simulation: GateCandidate[];
  final: GateCandidate[];
  intelligence?: PipelineIntelligence;
};

export type PipelineIntelligence = {
  provider: "gemini";
  enabled: boolean;
  configured: boolean;
  status: "completed" | "fallback" | "disabled";
  model: string;
  reviewedCandidates: number;
  message: string;
};

const defaultSkills = [
  "python",
  "sql",
  "spark",
  "kafka",
  "airflow",
  "gcp",
  "aws",
  "azure",
  "dbt",
  "flink",
  "java",
  "scala",
  "snowflake",
  "bigquery",
  "databricks",
  "docker",
  "kubernetes",
];

export function parseCsv(text: string): CandidateInput[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuote = false;
  const clean = String(text || "").replace(/^\uFEFF/, "");

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    const next = clean[i + 1];
    if (ch === '"' && inQuote && next === '"') {
      cur += '"';
      i += 1;
    } else if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      row.push(cur);
      cur = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuote) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cur);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      cur = "";
    } else {
      cur += ch;
    }
  }

  row.push(cur);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  if (!rows.length) throw new Error("CSV is empty");

  const headers = rows[0].map(normalizeHeader);
  const missing = requiredCandidateColumns.filter((column) => !headers.includes(column));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}`);

  return rows
    .slice(1)
    .map((values) => {
      const record: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        record[header] = values[index]?.trim() ?? "";
      });
      return candidateSchema.parse(record);
    })
    .filter((candidate) => candidate.name.trim());
}

export function normalizeHeader(header: string): string {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function extractRoleProfile(text: string, strict = true): RoleProfile {
  const lower = String(text || "").toLowerCase();
  const yearMatches =
    lower.match(/(\d+(?:\.\d+)?)\s*(?:-|to|\u2013|\u2014)\s*(\d+(?:\.\d+)?)\s*(?:yrs?|years?)/) ||
    lower.match(/(\d+(?:\.\d+)?)\s*(?:\+|plus)\s*(?:yrs?|years?)/);
  const salaryMatch =
    lower.match(/(\d+(?:\.\d+)?)\s*(?:-|to|\u2013|\u2014)\s*(\d+(?:\.\d+)?)\s*lpa/) ||
    lower.match(/(?:up to|max|budget)\s*(\d+(?:\.\d+)?)\s*lpa/);
  const minYears = yearMatches ? Number(yearMatches[1]) || 0 : 0;
  const maxYears = yearMatches?.[2] ? Number(yearMatches[2]) : 99;
  const salaryMin = salaryMatch?.[2] ? Number(salaryMatch[1]) : 0;
  const salaryMax = salaryMatch ? Number(salaryMatch[2] || salaryMatch[1]) : 999;
  const skills = extractSkills(lower);
  const mustSection = lower.match(/(?:must have|must-have|required|requirements?)[:\s-]+([^.\n]+)/);
  let mustSkills = mustSection ? extractSkills(mustSection[1]) : skills.slice(0, Math.min(5, skills.length));
  const skillGroups: string[][] = [];
  const cloudAlternatives = ["gcp", "aws", "azure"].filter((skill) => skills.includes(skill));
  const saysCloudAlternative = /(gcp|aws|azure)\s*(?:or|\/)\s*(gcp|aws|azure)/.test(lower) || /cloud[^.\n]*(?:gcp|aws|azure)/.test(lower);

  if (saysCloudAlternative && cloudAlternatives.length > 1) {
    skillGroups.push(cloudAlternatives);
    mustSkills = mustSkills.filter((skill) => !cloudAlternatives.includes(skill));
  }

  const locations = [
    "bengaluru",
    "bangalore",
    "mumbai",
    "delhi",
    "ncr",
    "pune",
    "hyderabad",
    "chennai",
    "remote",
    "india",
  ]
    .filter((loc) => lower.includes(loc))
    .map((loc) => (loc === "bangalore" ? "bengaluru" : loc));

  return {
    minYears,
    maxYears,
    salaryMin,
    salaryMax,
    skills: unique(skills),
    mustSkills: unique(mustSkills),
    skillGroups,
    locations: unique(locations),
    strict,
  };
}

export function extractSkills(text: string): string[] {
  const lower = String(text || "").toLowerCase();
  return defaultSkills.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, "i").test(lower);
  });
}

export function runDeterministicPipeline(input: RunPipelineInput): PipelineResult {
  const parsed = runPipelineInputSchema.parse(input);
  const roleProfile = extractRoleProfile(parsed.roleDescription, parsed.options.strictMode);
  const base = parsed.candidates.map(toGateCandidate);
  const gate1 = runGate1(base, roleProfile);
  const gate2 = runGate2(gate1.filter((candidate) => candidate.hardPass), roleProfile);
  const gate3 = runGate3(gate2.filter((candidate) => candidate.advanceG2), roleProfile);
  const gate4 = runGate4(gate3.filter((candidate) => candidate.advanceG3), roleProfile, parsed.options.inviteCap);
  const invited = gate4.filter((candidate) => candidate.invite);
  const simulation = invited.map((candidate) => ({
    ...candidate,
    scenarioQuestion: buildScenario(candidate, roleProfile),
    simulationScore: null,
    simulationNotes: "",
  }));
  const final = buildFinalShortlist(simulation);

  return { roleProfile, gate1, gate2, gate3, gate4, invited, simulation, final };
}

function toGateCandidate(candidate: CandidateInput, index: number): GateCandidate {
  return {
    ...candidate,
    id: `c${index + 1}`,
    skillsList: extractSkills(`${candidate.skills} ${candidate.summary}`),
  };
}

function runGate1(candidates: GateCandidate[], role: RoleProfile): GateCandidate[] {
  return candidates.map((candidate) => {
    const reasons: string[] = [];
    let pass = true;
    if (candidate.experience_years < role.minYears) {
      pass = false;
      reasons.push("below minimum experience");
    }
    if (role.maxYears < 99 && candidate.experience_years > role.maxYears + 1) {
      reasons.push("above preferred seniority");
    }
    if (role.locations.length && !locationMatches(candidate.location, role.locations)) {
      pass = false;
      reasons.push("location mismatch");
    }
    const missingMust = role.mustSkills.filter((skill) => !candidate.skillsList.includes(skill));
    const missingGroups = role.skillGroups
      .filter((group) => !group.some((skill) => candidate.skillsList.includes(skill)))
      .map((group) => `one of ${group.join("/")}`);
    const missing = [...missingMust, ...missingGroups];
    if (role.strict && missing.length) {
      pass = false;
      reasons.push(`missing must-have: ${missing.join(", ")}`);
    }
    if (role.strict && role.salaryMax < 999 && candidate.salary_expectation_lpa > role.salaryMax) {
      pass = false;
      reasons.push("salary above cap");
    }
    return { ...candidate, hardPass: pass, hardReason: reasons.length ? reasons.join("; ") : "matches hard requirements" };
  });
}

function runGate2(candidates: GateCandidate[], role: RoleProfile): GateCandidate[] {
  return candidates
    .map((candidate) => {
      const skillHits = role.skills.filter((skill) => candidate.skillsList.includes(skill));
      const mustHits = role.mustSkills.filter((skill) => candidate.skillsList.includes(skill));
      const groupHits = role.skillGroups.filter((group) => group.some((skill) => candidate.skillsList.includes(skill)));
      const mustUnits = role.mustSkills.length + role.skillGroups.length;
      const mustHitUnits = mustHits.length + groupHits.length;
      const skillScore = role.skills.length ? (skillHits.length / role.skills.length) * 42 : 22;
      const mustScore = mustUnits ? (mustHitUnits / mustUnits) * 18 : 12;
      const expScore = experienceFit(candidate.experience_years, role.minYears, role.maxYears) * 20;
      const summaryScore = summarySignals(candidate.summary) * 12;
      const salaryScore = role.salaryMax < 999 ? Math.max(0, 8 - Math.max(0, candidate.salary_expectation_lpa - role.salaryMax) * 2) : 6;
      const score = clamp(skillScore + mustScore + expScore + summaryScore + salaryScore, 0, 100);

      return {
        ...candidate,
        profileScore: Math.round(score),
        profileSignals: skillHits.length ? `Matched ${skillHits.join(", ")}` : "Few explicit skill matches",
        advanceG2: score >= 58,
      };
    })
    .sort(desc("profileScore"));
}

function runGate3(candidates: GateCandidate[], role: RoleProfile): GateCandidate[] {
  return candidates
    .map((candidate) => {
      const lower = `${candidate.summary} ${candidate.skills}`.toLowerCase();
      const flags: string[] = [];
      if (lower.includes("limited") || lower.includes("transition")) flags.push("limited direct role evidence");
      if (role.salaryMax < 999 && candidate.salary_expectation_lpa > role.salaryMax * 0.96) flags.push("near salary ceiling");
      if (role.maxYears < 99 && candidate.experience_years > role.maxYears + 1) flags.push("possible seniority mismatch");
      const missesRequired = role.mustSkills.some((skill) => !candidate.skillsList.includes(skill));
      const missesGroup = role.skillGroups.some((group) => !group.some((skill) => candidate.skillsList.includes(skill)));
      if (missesRequired || missesGroup) flags.push("must-have gap");
      const coherence = inferCoherence(candidate.summary);
      const intent = inferIntent(candidate.summary);
      const score = clamp((candidate.profileScore ?? 0) + (coherence.score - 70) * 0.25 + intent.score * 0.1 - flags.length * 6, 0, 100);

      return {
        ...candidate,
        deepScore: Math.round(score),
        careerCoherence: coherence.text,
        intentSignal: intent.text,
        redFlags: flags.length ? flags.join("; ") : "none",
        advanceG3: score >= 62,
      };
    })
    .sort(desc("deepScore"));
}

function runGate4(candidates: GateCandidate[], role: RoleProfile, inviteCap: number): GateCandidate[] {
  return candidates
    .map((candidate) => {
      const github = fallbackGithubSignal(candidate);
      const ownershipScore = clamp((candidate.deepScore ?? 0) * 0.72 + github.score * 0.28, 0, 100);
      return {
        ...candidate,
        githubSignal: github.label,
        githubDetail: github.detail,
        githubScore: github.score,
        ownershipScore: Math.round(ownershipScore),
        probeQuestion: buildProbeQuestion(candidate, role),
        invite: false,
      };
    })
    .sort(desc("ownershipScore"))
    .map((candidate, index) => ({
      ...candidate,
      invite: index < inviteCap && (candidate.ownershipScore ?? 0) >= 60,
    }));
}

export function buildFinalShortlist(candidates: GateCandidate[]): GateCandidate[] {
  return candidates
    .map((candidate) => {
      const live = candidate.simulationScore ?? null;
      const base = candidate.ownershipScore ?? candidate.deepScore ?? candidate.profileScore ?? 0;
      const composite = live == null ? base : base * 0.55 + live * 0.45;
      const hireConfidence: GateCandidate["hireConfidence"] =
        live == null ? "provisional" : composite >= 82 ? "high" : composite >= 70 ? "medium" : "low";
      return {
        ...candidate,
        finalScore: Math.round(clamp(composite, 0, 100)),
        hireConfidence,
        recommendation: recommendationFor(composite, live),
      };
    })
    .sort(desc("finalScore"))
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

function locationMatches(candidateLocation: string, locations: string[]): boolean {
  const loc = candidateLocation.toLowerCase();
  if (locations.includes("remote") && loc.includes("remote")) return true;
  if (locations.includes("india")) return true;
  return locations.some((required) => loc.includes(required) || (required === "bengaluru" && loc.includes("bangalore")));
}

function experienceFit(years: number, min: number, max: number): number {
  if (years < min) return Math.max(0, years / Math.max(1, min));
  if (max < 99 && years > max + 2) return 0.72;
  if (max < 99 && years > max) return 0.88;
  return 1;
}

function summarySignals(summary: string): number {
  const lower = summary.toLowerCase();
  const words = lower.split(/[^a-z0-9+#.]+/).filter(Boolean);
  const signals = ["built", "led", "owned", "production", "scale", "platform", "real-time", "distributed", "certified", "team"];
  const hits = signals.filter((signal) => words.includes(signal) || lower.includes(signal)).length;
  return clamp(hits / 5, 0, 1);
}

function inferCoherence(summary: string): { score: number; text: string } {
  const lower = summary.toLowerCase();
  if (lower.includes("led") || lower.includes("platform") || lower.includes("production")) {
    return { score: 88, text: "clear trajectory into production ownership" };
  }
  if (lower.includes("transition") || lower.includes("analyst")) {
    return { score: 62, text: "transition path, needs proof in simulation" };
  }
  return { score: 74, text: "reasonable profile continuity" };
}

function inferIntent(summary: string): { score: number; text: string } {
  const lower = summary.toLowerCase();
  if (lower.includes("open to") || lower.includes("startup")) return { score: 72, text: "mobility or startup signal present" };
  if (lower.includes("certified") || lower.includes("team lead")) return { score: 78, text: "growth signal toward larger scope" };
  return { score: 65, text: "intent not explicit; validate in interview" };
}

function fallbackGithubSignal(candidate: GateCandidate): { label: string; detail: string; score: number } {
  const username = githubUsername(candidate.github_url);
  let score = username ? 55 : 30;
  if (candidate.summary.toLowerCase().includes("built")) score += 10;
  if (candidate.summary.toLowerCase().includes("led")) score += 8;
  return {
    label: username ? "profile-only" : "none",
    detail: username ? `${username}: inferred from resume evidence` : "No GitHub URL provided",
    score: clamp(score, 0, 100),
  };
}

function githubUsername(url: string): string {
  return String(url || "").match(/github\.com\/([^/?#\s]+)/i)?.[1] ?? "";
}

function buildProbeQuestion(candidate: GateCandidate, role: RoleProfile): string {
  const skills = role.skills.filter((skill) => candidate.skillsList.includes(skill));
  const main = skills[0] || candidate.skillsList[0] || "your core system";
  const second = skills[1] || "production constraints";
  return `Walk through one production decision involving ${main} and explain the tradeoff you made around ${second}.`;
}

function buildScenario(candidate: GateCandidate, role: RoleProfile): string {
  const stack = (role.mustSkills.length ? role.mustSkills : role.skills).slice(0, 3).join(", ") || candidate.skillsList.slice(0, 3).join(", ") || "the required stack";
  return `A critical pipeline using ${stack} is delayed and data quality checks are failing. Explain your diagnosis path, mitigation, and what you would change over the next week.`;
}

function recommendationFor(score: number, live: number | null): string {
  if (live == null) return "Invite complete; waiting for live simulation score.";
  if (score >= 82) return "Strong shortlist. Advance to hiring team discussion.";
  if (score >= 70) return "Viable candidate. Review notes and compare against top rank.";
  return "Keep as backup unless interview notes explain the lower score.";
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function unique<T>(list: T[]): T[] {
  return Array.from(new Set(list));
}

function desc(key: keyof GateCandidate) {
  return (a: GateCandidate, b: GateCandidate) => Number(b[key] ?? 0) - Number(a[key] ?? 0);
}
