import type { CandidateAiReview, GateCandidate } from "@seederpro/core";
import { z } from "zod";
import { config } from "./config.js";

const stringListSchema = z.preprocess(normalizeStringList, z.array(z.string()).min(1).max(8));
const riskLevelSchema = z.preprocess(normalizeRiskLevel, z.enum(["Low", "Medium", "High"]));
export const geminiReviewCandidateLimit = 5;

const reviewSchema = z.object({
  reviews: z.array(
    z.object({
      id: z.string(),
      personalNote: z.string().min(1),
      nextAction: z.string().min(1),
      riskLevel: riskLevelSchema,
      strengths: stringListSchema,
      weaknesses: stringListSchema,
      missingEvidence: stringListSchema,
      interviewQuestion: z.string().min(1),
      confidenceNote: z.string().min(1),
      sourceFields: stringListSchema,
    }),
  ),
});

type ReviewMap = Map<string, CandidateAiReview>;
const biasedReviewPattern = /\b(age|gender|male|female|woman|man|caste|religion|muslim|hindu|christian|sikh|race|ethnicity|disability|disabled|married|marital|pregnant|parent|mother|father|photo|picture|accent|native language)\b/i;

export async function reviewCandidatesWithGemini(roleDescription: string, candidates: GateCandidate[]): Promise<ReviewMap> {
  if (!config.geminiReviewEnabled || !config.geminiApiKey || !candidates.length) return new Map();

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}:generateContent`;
  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: buildPrompt(roleDescription, candidates.slice(0, geminiReviewCandidateLimit)),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": config.geminiApiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Gemini review failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  const parsedJson = JSON.parse(text) as unknown;
  const parsed = reviewSchema.parse(parsedJson);

  return new Map(
    parsed.reviews.map((review) => [
      review.id,
      {
        personalNote: cleanAiReviewText(review.personalNote, "Evidence-only review ready; validate role proof in interview."),
        nextAction: cleanAiReviewText(review.nextAction, "Review only job evidence and validate missing proof in interview."),
        riskLevel: review.riskLevel,
        strengths: cleanAiReviewList(review.strengths, ["Relevant job evidence found in the provided profile fields."]),
        weaknesses: cleanAiReviewList(review.weaknesses, ["Needs more job-specific evidence before final decision."]),
        missingEvidence: cleanAiReviewList(review.missingEvidence, ["Ask for concrete project proof tied to the role."]),
        interviewQuestion: cleanAiReviewText(review.interviewQuestion, "Walk through one relevant project and the tradeoffs you personally owned."),
        confidenceNote: cleanAiReviewText(
          review.confidenceNote,
          "Bias guardrail applied: review uses only role evidence and score fields, not protected traits.",
        ),
        sourceFields: review.sourceFields.filter((field) => field !== "name").slice(0, 8),
        provider: "gemini" as const,
      },
    ]),
  );
}

export function attachAiReviews(resultCandidates: GateCandidate[], reviews: ReviewMap): GateCandidate[] {
  return resultCandidates.map((candidate) => ({
    ...candidate,
    aiReview: reviews.get(candidate.id) ?? candidate.aiReview,
  }));
}

function buildPrompt(roleDescription: string, candidates: GateCandidate[]): string {
  return [
    "You are reviewing recruitment shortlist data for a hiring workflow.",
    "Use only the role and candidate fields provided. Do not invent employers, degrees, locations, or accomplishments.",
    "Do not use protected traits or proxies as quality evidence: age, gender, caste, religion, race, ethnicity, disability, marital status, family status, photo, accent, name origin, or school prestige.",
    "Location and salary may only be mentioned as logistics or budget fit when directly relevant to the role, never as a measure of ability.",
    "Return strict JSON only with a top-level reviews array.",
    "Each review must include: id, personalNote, nextAction, riskLevel, strengths, weaknesses, missingEvidence, interviewQuestion, confidenceNote, sourceFields.",
    "personalNote must be two short lines or fewer. strengths/weaknesses/missingEvidence must be blunt and constructive.",
    "",
    `Role: ${roleDescription}`,
    "",
    `Candidates: ${JSON.stringify(
      candidates.map((candidate) => ({
        id: candidate.id,
        experience_years: candidate.experience_years,
        location: candidate.location,
        skills: candidate.skills,
        summary: candidate.summary,
        salary_expectation_lpa: candidate.salary_expectation_lpa,
        github_url: candidate.github_url,
        profileScore: candidate.profileScore,
        deepScore: candidate.deepScore,
        ownershipScore: candidate.ownershipScore,
        finalScore: candidate.finalScore,
        redFlags: candidate.redFlags,
        probeQuestion: candidate.probeQuestion,
      })),
    )}`,
    "",
    "sourceFields must be an array using only these field names when relevant: experience_years, location, skills, summary, salary_expectation_lpa, github_url, profileScore, deepScore, ownershipScore, finalScore, redFlags, probeQuestion.",
  ].join("\n");
}

function cleanAiReviewText(value: string, fallback: string): string {
  const trimmed = String(value || "").trim();
  if (!trimmed || biasedReviewPattern.test(trimmed)) return fallback;
  return trimSentences(trimmed, 2);
}

function cleanAiReviewList(values: string[], fallback: string[]): string[] {
  const cleaned = values.map((value) => cleanAiReviewText(value, "")).filter(Boolean);
  return cleaned.length ? cleaned : fallback;
}

function trimSentences(value: string, maxSentences: number): string {
  const sentences = value.match(/[^.!?]+[.!?]*/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [value.trim()];
  return sentences.slice(0, maxSentences).join(" ");
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 8);
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${String(item).trim()}`)
      .filter(Boolean)
      .slice(0, 8);
  }
  if (typeof value === "string") {
    return value
      .split(/\n|;|\u2022|,(?=\s*[A-Z])/)
      .map((item) => item.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 8);
  }
  return [];
}

function normalizeRiskLevel(value: unknown): "Low" | "Medium" | "High" {
  const lower = String(value ?? "").toLowerCase();
  if (lower.includes("high")) return "High";
  if (lower.includes("low") && !lower.includes("medium")) return "Low";
  if (lower.includes("medium") || lower.includes("moderate")) return "Medium";
  return "Medium";
}
