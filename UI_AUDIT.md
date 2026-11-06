# StudyLens UI and flow audit

Audit date: 2026-11-04. Scope: local application at http://127.0.0.1:8000/.

## Fixed

| Area | Finding and change |
| --- | --- |
| Upload guidance | Added Add a page / Check the text / Explore your lesson steps, plain-language labels, photo guidance, file types, PDF screenshot advice and selected filename. |
| Validation | Reject empty files, unsupported formats, files above 8 MB, insufficient source text and excessive text before submission. Build is disabled until source text is ready. |
| Progress and recovery | Reading/building progress appears by the form. Errors appear near it. Existing text survives a failed replacement. Same-file retry works. Drag hover is visible and multiple file drops are rejected. |
| Request races | Upload, example loading and building share a lock; navigation invalidates pending results. Source editing is disabled during processing. |
| Output orientation | Added a short route guide and numbered Understand / Explain it / Practise tabs. Active styling and ARIA panel relationships now work, with arrow/Home/End keyboard navigation. |
| Source access | Current uploaded image is accessible from View source with a full-size link. Confirmed source text remains available. |
| Practice | Last question advances to the next section or final recap instead of silently looping. |
| Visual explanation | Cached plans survive tab/section changes; labels preserve all characters; narrow diagrams scroll instead of shrinking labels; controls have larger targets. Text-size and spacing preferences apply to written visual explanations. |
| Navigation | Mobile navigation includes Upload a page and expanded-state semantics; lesson footer also exposes uploading another page. Removed misleading Back to your pages wording. |
| Refresh | General lessons use validated, short-lived sessionStorage restoration (45-minute window). The original local image is not restored after reload; confirmed source text is. Server-owned operations still require the original session and may expire. |
| Recap failure | Replaced endless loading after errors with an explicit retry control. |
| Source reliability | Live image testing revealed visual citations copied from rewritten lesson content. Visual generation now selects numbered original source passages; backend attaches literal evidence. Graph and coverage checks remain enforced. |

## Verification performed

- 51 Python tests pass, including visual graph checks, source-reference resolution, session ownership, grading and bounded repair.
- 14 existing learning behavior checks pass.
- New UI flow checks pass for file/text boundaries, complete diagram labels and validated/expired lesson restoration.
- Static React rendering checks pass for home, upload, sample studio, recap and general science output; checked labels, disabled empty build, main landmarks, active tabs and panel relationships.
- TypeScript and production Vite build pass.
- Live provider check with a team-authored photosynthesis PNG: image reading, lesson creation, visual creation, answer submission and recap all returned HTTP 200; recap recorded one attempt.
- Homepage, test image/text, hero illustration and font CSS returned HTTP 200.

## Verification limits / remaining risks

- Browser automation is disabled in Work settings. No screenshots, computed layout checks, real keyboard/focus interaction checks or mobile viewport rendering were performed. Static rendering does not establish visual correctness or accessibility conformance.
- Responsive styles were reviewed and adjusted in source; desktop/mobile appearance still needs a real browser check.
- Narration/recording were not re-tested with microphone or playback in this audit.
- Source references prove the quoted text exists, not that every model claim or diagram relation is semantically correct. Generated content still requires educational accuracy review.
- Lesson restoration retains text in this tab's sessionStorage. Backend memory restart/expiration can invalidate grading and generation until the page is rebuilt.
- This audit updates the local Python-backed project; it does not deploy the static hosted preview.
