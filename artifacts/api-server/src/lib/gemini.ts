import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

let client: GoogleGenAI | null = null;

/** Lazily create the Gemini client so the server can start without a key. */
export function gemini(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY must be set to analyze resumes.");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export interface ResumeAnalysis {
  overallScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  keywords: string[];
  missingKeywords: string[];
  matchScore: number | null;
  matchedSkills: string[];
  experienceGaps: string[];
  sectionScores: {
    contactInfo: number;
    workExperience: number;
    education: number;
    skills: number;
    formatting: number;
    impact: number;
  };
}

const stringList = { type: "array", items: { type: "string" } };
const score = { type: "integer", minimum: 0, maximum: 100 };

// JSON Schema for Gemini structured output, so the model always returns parseable JSON.
const analysisSchema = {
  type: "object",
  properties: {
    overallScore: score,
    summary: { type: "string" },
    strengths: stringList,
    weaknesses: stringList,
    suggestions: stringList,
    keywords: stringList,
    missingKeywords: stringList,
    matchScore: { type: ["integer", "null"], minimum: 0, maximum: 100 },
    matchedSkills: stringList,
    experienceGaps: stringList,
    sectionScores: {
      type: "object",
      properties: {
        contactInfo: score,
        workExperience: score,
        education: score,
        skills: score,
        formatting: score,
        impact: score,
      },
      required: ["contactInfo", "workExperience", "education", "skills", "formatting", "impact"],
    },
  },
  required: [
    "overallScore",
    "summary",
    "strengths",
    "weaknesses",
    "suggestions",
    "keywords",
    "missingKeywords",
    "matchScore",
    "matchedSkills",
    "experienceGaps",
    "sectionScores",
  ],
};

function buildInstructions(jobTitle?: string | null, jobDescription?: string | null): string {
  const base = `You are an expert resume coach and technical recruiter. Analyze the resume and fill every field of the JSON schema.
- overallScore and sectionScores: 0-100, scored strictly; a perfect resume is rare.
- summary: a 2-3 sentence overall assessment.
- strengths, weaknesses: 3 specific items each. suggestions: 4 actionable improvements.
- keywords: important skills and terms the resume contains.`;

  if (jobDescription) {
    return `${base}
The candidate is applying for the job description below${jobTitle ? ` (${jobTitle})` : ""}. Compare the resume against it:
- matchScore: 0-100, how well the resume meets the job's requirements.
- matchedSkills: skills, tools and qualifications from the job description that the resume clearly shows.
- missingKeywords: important keywords from the job description that do not appear in the resume.
- experienceGaps: experience, responsibilities or qualifications the job asks for that the resume does not demonstrate.
- Tailor weaknesses and suggestions to this job.

JOB DESCRIPTION:
${jobDescription}`;
  }

  return `${base}
No job description was provided${jobTitle ? `; the target role is ${jobTitle}` : ""}.
- matchScore: null. matchedSkills: []. experienceGaps: [].
- missingKeywords: keywords commonly expected for ${jobTitle ? "that role" : "the candidate's field"} that are missing.`;
}

export async function analyzeResume(input: {
  content: string;
  jobTitle?: string | null;
  jobDescription?: string | null;
}): Promise<ResumeAnalysis> {
  const response = await gemini().models.generateContent({
    model: GEMINI_MODEL,
    contents: `Analyze this resume:\n\n${input.content}`,
    config: {
      systemInstruction: buildInstructions(input.jobTitle, input.jobDescription),
      responseMimeType: "application/json",
      responseJsonSchema: analysisSchema,
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }
  return JSON.parse(text) as ResumeAnalysis;
}
