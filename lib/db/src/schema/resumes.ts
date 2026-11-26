import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const SectionScoresSchema = z.object({
  contactInfo: z.number().int(),
  workExperience: z.number().int(),
  education: z.number().int(),
  skills: z.number().int(),
  formatting: z.number().int(),
  impact: z.number().int(),
});

export type SectionScores = z.infer<typeof SectionScoresSchema>;

export const resumesTable = pgTable("resumes", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  jobTitle: text("job_title"),
  overallScore: integer("overall_score").notNull().default(0),
  summary: text("summary").notNull().default(""),
  strengths: jsonb("strengths").$type<string[]>().notNull().default([]),
  weaknesses: jsonb("weaknesses").$type<string[]>().notNull().default([]),
  suggestions: jsonb("suggestions").$type<string[]>().notNull().default([]),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  missingKeywords: jsonb("missing_keywords").$type<string[]>().notNull().default([]),
  sectionScores: jsonb("section_scores").$type<SectionScores>().notNull().default({
    contactInfo: 0,
    workExperience: 0,
    education: 0,
    skills: 0,
    formatting: 0,
    impact: 0,
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertResumeSchema = createInsertSchema(resumesTable).omit({ id: true, createdAt: true });
export type InsertResume = z.infer<typeof insertResumeSchema>;
export type Resume = typeof resumesTable.$inferSelect;
