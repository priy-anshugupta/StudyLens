import type { Lesson } from "./learning";

export function parseSavedLesson(raw: string | null, now = Date.now()): Lesson | null {
  try {
    if (!raw) return null;
    const { lesson, savedAt } = JSON.parse(raw);
    if (typeof savedAt !== "number" || now - savedAt > 45 * 60 * 1000 || savedAt > now) return null;
    if (!lesson?.general || typeof lesson.id !== "string" || typeof lesson.title !== "string" ||
        typeof lesson.subject !== "string" || typeof lesson.source !== "string" || !Array.isArray(lesson.blocks) ||
        lesson.blocks.length < 1 || lesson.blocks.length > 3) return null;
    for (const b of lesson.blocks) {
      if (typeof b.id !== "string" || typeof b.title !== "string" || typeof b.text !== "string" ||
          typeof b.source_quote !== "string" || typeof b.teach_prompt !== "string" ||
          !Array.isArray(b.key_points) || !b.key_points.every((p: unknown) => typeof p === "string") ||
          !Array.isArray(b.questions) || b.questions.length < 1 ||
          !b.questions.every((q: { id: unknown; question: unknown; choices: unknown }) =>
            typeof q?.id === "string" && typeof q.question === "string" && Array.isArray(q.choices) &&
            q.choices.length >= 3 && q.choices.every((c: unknown) => typeof c === "string"))) return null;
    }
    return lesson as Lesson;
  } catch { return null; }
}
