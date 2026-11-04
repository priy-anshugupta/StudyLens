# Neural Storm submission preparation

## Event requirements

Source checked: https://neuralstorm.devpost.com/rules and https://neuralstorm.devpost.com/ on November 4, 2026.

- Deadline: November 4, 2026, 8:00 PM IST. No late submissions.
- Public GitHub source repository required.
- README must document problem statement, participant/team, problem, solution, stack, setup, running, results and AI-development tools.
- Actual screenshots or a demo GIF must appear in the README.
- A deployed application is strongly recommended, not mandatory.
- Python is required as the primary language for AI/ML components; APIs, pretrained models and AI assistants are allowed with disclosure.
- One submission per participant/team; changes allowed before the deadline.
- Eligibility and registration must be confirmed by the participant. Devpost says students who are above the legal age of majority; the organizer website describes college students and teams of 1–3. This project is a solo entry.

## Project fields

**Title:** PageAble — Your textbook. Your way in.

**Tagline:** Turn a textbook page into a lesson you can read, explore visually, listen to, explain back and practise.

**Track:** Human Impact

**Problem statement:** HI-03 — Adaptive Learning for Students with Disabilities

**Participant:** Priyanshu Gupta (solo)

**Source:** https://github.com/priy-anshugupta/PageAble

**Built with:** Python, FastAPI, OpenAI, Gnani.ai, Pydantic, React, TypeScript, Vite, SVG, CSS, Lucide, Pillow.

## Prepared project description

### Inspiration

A textbook gives every learner the same printed presentation. A student may need a smaller passage, speech, a visual explanation, or room to explain an idea back. PageAble brings those interactions to the student's own page while keeping its source visible.

### What it does

A learner uploads a JPG/PNG or pastes text, reviews the extracted words and receives a subject-general lesson. They can read a section, reveal one sentence at a time, explore a clickable visual with paired text, listen, explain the idea back and try generated questions. The recap records actual attempts. An authored fraction sample provides exact manipulable diagrams without API keys.

### How it was built

A Python FastAPI backend calls OpenAI for extraction, structured lessons, visual plans and feedback, with Gnani.ai speech adapters. Pydantic enforces response structure. Source passages, visual references and learner quotations are checked; answer keys remain on the server. React and TypeScript render the interface and SVG visual components. Visual plans are data, not executable generated code.

### Challenges

The first implementation focused too narrowly on fractions, so the lesson pipeline was expanded to general textbook content. Visual testing also exposed a source-grounding failure when generated diagrams quoted rewritten lesson text; the final visual plan selects numbered original passages and the backend attaches exact quotations. The UI was revised around a clear upload, review and explore flow.

### Results

51 backend tests, 14 existing learning behavior checks, UI helper checks, static React rendering checks and a production build pass. Live image extraction, lesson creation, visual generation, practice submission and recap passed a source-page smoke test. These are engineering checks, not a measured accuracy benchmark or evidence of student learning gains.

### What is next

Manual accessibility testing with learners and assistive technology, labelled educational-content evaluation, broader speech/language review and a persistent hosted backend.

### AI disclosure

OpenAI Codex / ChatGPT assisted planning, implementation, debugging, documentation and tests. OpenAI Image Generation produced decorative assets. Runtime AI uses OpenAI and Gnani.ai. No student study or from-scratch trained model is claimed.

## Remaining submission actions

- [ ] Confirm registration and eligibility in the event portal.
- [ ] Verify the GitHub repository is public and contains the final source.
- [ ] Open the README on GitHub and verify its screenshots render.
- [ ] Manually demonstrate the latest desktop/mobile upload and output screens.
- [ ] If available, add a public Python-backed deployment or record a short live demo; do not use localhost as a judge-accessible demo URL.
- [ ] Fill the Devpost project entry, select Human Impact / HI-03, and submit before 8:00 PM IST.

No submission has been made by this preparation step. No public full-stack deployment is asserted.
