export function pageFileError(file: { type: string; size: number }): string {
  if (!["image/png", "image/jpeg"].includes(file.type))
    return "Choose a JPG or PNG image. For a PDF, save or screenshot one page first.";
  if (!file.size) return "This file is empty. Choose a readable page image.";
  if (file.size > 8 * 1024 * 1024) return "This image is larger than 8 MB. Choose a smaller JPG or PNG.";
  return "";
}
export function sourceTextError(text: string): string {
  if (text.trim().length < 20) return "Add at least 20 characters of textbook text before building your lesson.";
  if (text.length > 6000) return "Keep the source to one page, up to 6,000 characters.";
  return "";
}
