# StudyLens

**Interactive textbook lessons from a photo**

Priyanshu Gupta · Solo entry · Great Indian AI Internship Challenge

## The problem

Students can read a textbook paragraph several times and still struggle to picture the idea or explain it in their own words. Switching between a textbook, a video, and a quiz can make it harder to connect the explanation back to the original page.

## The solution

StudyLens lets learners upload a readable page or paste its text, then check and correct the source before building a lesson. The lesson breaks the material into short sections. Learners can follow a clickable diagram, listen to a step, explain the idea in their own words, and practise with questions that show the supporting passage.

In the photosynthesis demo, a student explains how water and carbon dioxide enter the plant. StudyLens identifies the two ideas the student covered and flags the missing point about chlorophyll absorbing energy from sunlight. A practice question then shows the original sentence that supports the correct answer.

## Technology and contribution

Gnani Prisma v3.0 transcribes spoken responses, and Gnani Timbre v2.5 reads lesson explanations aloud. OpenAI GPT-4.1 mini handles page extraction, lesson generation, and feedback. The React interface renders diagrams from structured data returned by a Python FastAPI backend.

StudyLens builds on my earlier PageAble prototype. For this entry, I refined the upload review and lesson flow, improved mobile navigation and diagram readability, and verified the Gnani speech integration. The recorded uploaded-page lesson is in English.
