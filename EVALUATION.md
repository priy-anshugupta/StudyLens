# Verification record

Date: November 4, 2026, IST. This file records implementation checks, not learning-efficacy results.

| Area | Observed result |
| --- | --- |
| Exact fraction arithmetic | Equivalent fractions accepted; incorrect values rejected; zero denominators and executable expressions rejected |
| Scene safety | Integer bounds, supported representations, and maximum 12 parts checked |
| Quoted feedback | Invented quotes rejected; supported/contradicted claims require quoted evidence |
| API handling | Health omits keys; unauthorized origins and oversized bodies rejected; session deletion removes server data |
| Frontend learning engine | 10 cases cover explicit/natural-language fractions, representation changes, subdivision, invalid inputs, and sample rubric evidence |
| Production build | TypeScript and Vite build pass |
| Desktop browser | Home, studio, typed scene request, teach-back sample, addition counterexample, fresh question, and recap inspected |
| Mobile browser | 390 px studio checked; concepts accessible through select; no page-level horizontal overflow in the inspected view |
| Assets | Generated images load; fonts are bundled locally; mathematical geometry is data-driven |

Automated totals: 22 Python checks and 10 frontend learning checks at this checkpoint. These tests verify specific behavior, not model accuracy or accessibility conformance.

## Not established yet

- OpenAI extraction accuracy, rubric agreement, grounded-answer quality, latency, or account access with the user's key.
- Gnani speech accuracy, pronunciation, model/voice access, quotas, or live audio response format with the user's account.
- Fluent review of the Hindi preview.
- Full keyboard/screen-reader audit, all color-state combinations, or WCAG conformance.
- Learning gains, disability-specific effectiveness, longitudinal progress, real student adoption, or measured completion improvement.

## Live evaluation to run after configuration

Use the held-out sample sizes and rubrics in the PRD. Log model/voice identifiers, prompt version, denominators, observed failures, and timing. Treat transcription corrections separately from learner errors. Report source-link validity separately from explanation correctness. A small review set does not establish population-level efficacy.


## Subject-general scope correction — live checks

The active upload route no longer restricts educational subjects. Live OpenAI calls on team-authored pages returned lessons for photosynthesis (Science), printing history (History), the water cycle (classified as Science), and linear equations (Mathematics). The first three produced three sections and six questions each; the final algebra run produced two sections and four questions.

Photosynthesis additionally passed actual PNG extraction, source-linked contextual answering, dynamic teach-back feedback, practice submission, and summary retrieval. Generated answer keys are kept on the server and returned only after submission. An algebra draft initially failed validation; one bounded repair is now permitted, and the later algebra check passed without relaxing citation or answer-index checks. This is a functional integration check, not a measured accuracy or learning-efficacy benchmark.

Current automated checks: 43 Python tests and 14 frontend learning checks. The production build passes. General-subject browser visual inspection remains unverified because browser automation is disabled in Work settings. English is the current uploaded-lesson language; the Hindi authored sample remains an explicitly unreviewed preview. Exact fraction diagrams are an optional capability, not a requirement or a claim of arbitrary diagram generation.

The earlier fractions-only limitations in this file describe the initial build and are superseded by this section. Raw example run metadata is local in `output/general-live-check.json`; it contains test identifiers and outcomes, not credentials.


## Visual + text explanation addition
- Added session-owned, source-linked `/api/lessons/{id}/visual` plans with bounded nodes/steps and per-section caching.
- Tested source quote rejection, nonexistent links, repeated identifiers, unexplained nodes, cache reuse, section/session ownership and bounded repair. Python total: 50 passing; existing frontend learning checks: 14 passing; TypeScript/Vite build passes.
- Live OpenAI checks: photosynthesis (6 nodes/3 steps), history (4/3), geography (4/4), algebra (4/4), all HTTP 200. Outputs saved in ignored output/visual-*.json.
- An initial live draft falsely sequenced independent photosynthesis inputs; prompt refined to distinguish relationships from chronology/flow and require evidence for links, then retested. This remains a semantic accuracy limitation that schema checks alone cannot eliminate.
- Browser automation disabled: generated content/API inspected, rendered interactions and visual layout not browser-verified.
