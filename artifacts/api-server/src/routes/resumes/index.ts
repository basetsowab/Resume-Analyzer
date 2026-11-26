import { Router, type IRouter } from "express";
import { eq, desc, avg, count } from "drizzle-orm";
import { db, resumesTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
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

  const { content, jobTitle } = parsed.data;

  const jobContext = jobTitle ? ` The candidate is targeting a role as: ${jobTitle}.` : "";

  const systemPrompt = `You are an expert professional resume coach and HR specialist with 15+ years of experience. Analyze the provided resume and return ONLY a valid JSON object with this exact structure:
{
  "overallScore": <integer 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "suggestions": ["<actionable suggestion 1>", "<actionable suggestion 2>", "<actionable suggestion 3>", "<actionable suggestion 4>"],
  "keywords": ["<keyword found 1>", "<keyword found 2>", ...],
  "missingKeywords": ["<missing keyword 1>", "<missing keyword 2>", ...],
  "sectionScores": {
    "contactInfo": <integer 0-100>,
    "workExperience": <integer 0-100>,
    "education": <integer 0-100>,
    "skills": <integer 0-100>,
    "formatting": <integer 0-100>,
    "impact": <integer 0-100>
  }
}
Be honest, specific, and actionable. Score strictly — a perfect resume is rare.${jobContext}`;

  let analysisResult: {
    overallScore: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    keywords: string[];
    missingKeywords: string[];
    sectionScores: {
      contactInfo: number;
      workExperience: number;
      education: number;
      skills: number;
      formatting: number;
      impact: number;
    };
  };

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please analyze this resume:\n\n${content}` },
      ],
    });

    const rawContent = response.choices[0]?.message?.content ?? "{}";
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    analysisResult = JSON.parse(jsonMatch[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to analyze resume with AI");
    res.status(500).json({ error: "Failed to analyze resume. Please try again." });
    return;
  }

  const [resume] = await db
    .insert(resumesTable)
    .values({
      content,
      jobTitle: jobTitle ?? null,
      overallScore: Math.max(0, Math.min(100, Math.round(analysisResult.overallScore))),
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
