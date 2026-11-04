import assert from "node:assert/strict";
import {
  sampleCommand,
  exactEqual,
  sampleRubric,
  SAMPLE,
  TEACH_PROMPTS,
} from "../src/learning.ts";
const initial = { a: { n: 1, d: 2 }, b: null, representation: "bars" };
assert.deepEqual(sampleCommand("compare 3/4 and 2/4", initial).scene, {
  a: { n: 3, d: 4 },
  b: { n: 2, d: 4 },
  representation: "bars",
});
assert.deepEqual(sampleCommand("show three quarters", initial).scene.a, {
  n: 3,
  d: 4,
});
assert.equal(
  sampleCommand("show 3/4 on a number line", initial).scene.representation,
  "line",
);
assert.throws(() => sampleCommand("show 5/4", initial));
assert.throws(() => sampleCommand("show 1/0", initial));
assert.deepEqual(sampleCommand("split the parts", initial).scene.b, {
  n: 2,
  d: 4,
});
assert(exactEqual("3/6", "1/2"));
assert(!exactEqual("1/0", "1/2"));
assert(!exactEqual("2/3", "1/2"));
assert(
  sampleRubric("same whole with equal parts and the same amount").every(
    (r) => r.status === "supported",
  ),
);
for (const concept of ["parts", "equivalence", "addition"])
  assert(
    sampleRubric(TEACH_PROMPTS[concept].example, concept).every(
      (row) => row.status === "supported",
    ),
  );
assert(
  SAMPLE.blocks.every((block) => SAMPLE.source.includes(block.source_quote)),
);
console.log("14 learning behavior checks passed.");
