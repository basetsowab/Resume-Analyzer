import { Router, type IRouter } from "express";
import { eq, desc, avg, count } from "drizzle-orm";
import { db, resumesTable } from "@workspace/db";
import { analyzeResume, type ResumeAnalysis } from "../../lib/gemini";
import {
  AnalyzeResumeBody,
  GetResumeParams,
  DeleteResumeParams,
} from "@workspace/api-zod";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

router.get("/resumes/stats", async (req, res): Promise<void> => {
  const resumes = await db.select().from(resumesTable);
  if (resumes.length === 0) {
    res.json({
      totalAnalyzed: 0,
      averageScore: 0,
      topScoreRange: "N/A",
      commonWeaknesses: [],
    });
    return;
  }

  const totalAnalyzed = resumes.length;
  const averageScore = resumes.reduce((acc, r) => acc + r.overallScore, 0) / totalAnalyzed;

  let topScoreRange = "0-49";
  if (averageScore >= 75) topScoreRange = "75-100";
  else if (averageScore >= 50) topScoreRange = "50-74";

  const weaknessCounts: Record<string, number> = {};
  for (const resume of resumes) {
    for (const w of resume.weaknesses) {
      weaknessCounts[w] = (weaknessCounts[w] ?? 0) + 1;
    }
  }

  const commonWeaknesses = Object.entries(weaknessCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);

  res.json({
    totalAnalyzed,
    averageScore: Math.round(averageScore * 10) / 10,
    topScoreRange,
    commonWeaknesses,
  });
});

router.get("/resumes", async (req, res): Promise<void> => {
  const resumes = await db
    .select()
    .from(resumesTable)
    .orderBy(desc(resumesTable.createdAt));
  res.json(resumes);
});

router.post("/resumes", async (req, res): Promise<void> => {
  const parsed = AnalyzeResumeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { content, jobTitle, jobDescription } = parsed.data;
  const jd = jobDescription?.trim() || null;

  let analysisResult: ResumeAnalysis;
  try {
    analysisResult = await analyzeResume({ content, jobTitle, jobDescription: jd });
  } catch (err) {
    req.log.error({ err }, "Failed to analyze resume with Gemini");
    res.status(500).json({ error: "Failed to analyze resume. Please try again." });
    return;
  }

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  const [resume] = await db
    .insert(resumesTable)
    .values({
      content,
      jobTitle: jobTitle ?? null,
      jobDescription: jd,
      matchScore: jd && typeof analysisResult.matchScore === "number" ? clamp(analysisResult.matchScore) : null,
      matchedSkills: jd ? (analysisResult.matchedSkills ?? []) : [],
      experienceGaps: jd ? (analysisResult.experienceGaps ?? []) : [],
      overallScore: clamp(analysisResult.overallScore),
      summary: analysisResult.summary ?? "",
      strengths: analysisResult.strengths ?? [],
      weaknesses: analysisResult.weaknesses ?? [],
      suggestions: analysisResult.suggestions ?? [],
      keywords: analysisResult.keywords ?? [],
      missingKeywords: analysisResult.missingKeywords ?? [],
      sectionScores: analysisResult.sectionScores ?? {
        contactInfo: 0,
        workExperience: 0,
        education: 0,
        skills: 0,
        formatting: 0,
        impact: 0,
      },
    })
    .returning();

  res.status(201).json(resume);
});

router.get("/resumes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetResumeParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [resume] = await db
    .select()
    .from(resumesTable)
    .where(eq(resumesTable.id, params.data.id));

  if (!resume) {
    res.status(404).json({ error: "Resume not found" });
    return;
  }

  res.json(resume);
});

router.delete("/resumes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteResumeParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(resumesTable)
    .where(eq(resumesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Resume not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
