import assert from "node:assert/strict";
import { pageFileError, sourceTextError } from "../src/import-validation.ts";
import { diagramLabelLines } from "../src/diagram-label.ts";
import { parseSavedLesson } from "../src/session-lesson.ts";

assert.equal(pageFileError({ type: "image/jpeg", size: 100 }), "");
assert.equal(pageFileError({ type: "image/png", size: 8 * 1024 * 1024 }), "");
assert.match(pageFileError({ type: "application/pdf", size: 100 }), /screenshot/);
assert.match(pageFileError({ type: "image/png", size: 0 }), /empty/);
assert.match(pageFileError({ type: "image/jpeg", size: 8 * 1024 * 1024 + 1 }), /larger/);
assert.match(sourceTextError(" ".repeat(100)), /20 characters/);
assert.match(sourceTextError("too short"), /20 characters/);
assert.equal(sourceTextError("A textbook sentence with enough context."), "");
assert.match(sourceTextError("a".repeat(6001)), /6,000/);
for (const label of ["Chlorophyll (Leaf Pigment)", "Equation: Two expressions are equal", "Supercalifragilisticexpialidocious", "x + 3 = 7; subtract 3 from each side", "a ".repeat(22).trim()]) {
  const lines = diagramLabelLines(label);
  assert.equal(lines.join("").replaceAll(/\s/g, ""), label.replaceAll(/\s/g, ""), "SVG label must preserve every character");
  assert(lines.every(l => l.length <= 15));
}
const lesson={general:true,id:"saved-test",title:"Plants",subject:"Science",source:"Plants need sunlight.",blocks:[{id:"b1",title:"Light",text:"Plants need sunlight.",source_quote:"Plants need sunlight.",teach_prompt:"Explain it",key_points:["Light"],questions:[{id:"q1",question:"What is needed?",choices:["Light","Rock","Metal"]}]}]};
assert.equal(parseSavedLesson(JSON.stringify({lesson,savedAt:1000}),2000)?.id,"saved-test");
assert.equal(parseSavedLesson(JSON.stringify({lesson,savedAt:1000}),46*60*1000),null);
assert.equal(parseSavedLesson("{broken"),null);
assert.equal(parseSavedLesson(JSON.stringify({lesson:{...lesson,blocks:[]},savedAt:1000}),2000),null);
console.log("UI flow checks passed: file and text boundaries, lossless diagram labels, and safe lesson restoration.");
