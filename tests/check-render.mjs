// Static React rendering only; this does not replace browser layout or interaction QA.
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const storage = () => ({ getItem: () => null, setItem() {}, removeItem() {} });
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.document = { hidden: false };
globalThis.window = { location: { hash: "#import" }, matchMedia: () => ({ matches: false }) };
const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
try {
  const { default: App } = await server.ssrLoadModule("/src/App.tsx");
  const upload = renderToStaticMarkup(React.createElement(App));
  assert.match(upload, /Create your lesson/);
  assert.match(upload, /Upload one textbook page image/);
  assert.match(upload, /for="source-text"/);
  assert.match(upload, /id="source-text-count"/);
  assert.match(upload, /disabled=""[^>]*>Build my lesson/);
  assert.equal([...upload.matchAll(/id="main-content"/g)].length, 1);
  for (const view of ["", "#studio", "#summary"]) {
    window.location.hash = view;
    const page = renderToStaticMarkup(React.createElement(App));
    assert.equal([...page.matchAll(/id="main-content"/g)].length, 1, view + " needs exactly one main landmark");
  }
  const { default: GeneralStudio } = await server.ssrLoadModule("/src/GeneralStudio.tsx");
  const lesson = { id: "audit-test", title: "Photosynthesis", subject: "Science", source: "Plants use sunlight.", general: true,
    blocks: [{ id: "b1", title: "How plants use light", text: "Plants use sunlight.", source_quote: "Plants use sunlight.", key_points: ["Light provides energy", "Plants make food"], teach_prompt: "Explain the role of light.", visual: "none", questions: [{ id: "q1", question: "What provides energy?", choices: ["Light", "Rock", "Metal"] }] }] };
  const props = { lesson, sourceImage: "/testing/photosynthesis.png", recap: false, providers: { gnani: true }, onNavigate() {}, onError() {} };
  const output = renderToStaticMarkup(React.createElement(GeneralStudio, props));
  assert.match(output, /id="general-tab-explore" class="active" aria-selected="true"/);
  assert.match(output, /role="tabpanel" aria-labelledby="general-tab-explore"/);
  assert.match(output, /View diagram/);
  assert.match(output, /1\. Understand/);
  assert.match(output, /2\. Explain it back/);
  assert.match(output, /3\. Practise/);
  assert(!output.includes("fractions"), "A science lesson must not inherit fraction UI");
  const recap = renderToStaticMarkup(React.createElement(GeneralStudio, { ...props, recap: true }));
  assert.match(recap, /role="status"/);
  console.log("Static rendering checks passed: home, upload, sample, recap, and general-subject output. Browser layout and interactions remain unverified.");
} finally { await server.close(); }
