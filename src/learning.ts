export type Concept = "parts" | "equivalence" | "addition";
export type View = "home" | "studio" | "import" | "summary";
export type Destination = "explore" | "explain" | "practice";
export type Fraction = { n: number; d: number };
export type Scene = {
  a: Fraction;
  b: Fraction | null;
  representation: "bars" | "line";
};
export type Lesson = {
  general?: boolean;
  subject?: string;
  id: string;
  title: string;
  source: string;
  blocks: {
    id: string;
    title: string;
    text: string;
    concept: Concept;
    source_quote?: string;
  }[];
  sample: boolean;
};
export type Attempt = {
  id: string;
  concept: Concept;
  question: string;
  response: string;
  correct: boolean;
  supported: boolean;
};
export type RubricRow = {
  criterion: string;
  status: "supported" | "not_mentioned" | "unclear" | "contradicted";
  quote: string;
  feedback: string;
};
export const SAMPLE: Lesson = {
  id: "sample-v1",
  title: "A whole new way to see fractions",
  sample: true,
  source:
    "A fraction describes equal parts of a whole. The denominator tells us the total equal parts. The numerator counts the selected parts. Equivalent fractions name the same amount of the same whole. One half equals two quarters: 1/2 = 2/4. To add fractions with the same denominator, keep the denominator and add the numerators: 1/4 + 2/4 = 3/4.",
  blocks: [
    {
      id: "s1",
      title: "Every whole has its parts",
      text: "A fraction describes equal parts of a whole. The denominator tells us how many equal parts there are. The numerator counts the parts we select.",
      concept: "parts",
      source_quote:
        "A fraction describes equal parts of a whole. The denominator tells us the total equal parts. The numerator counts the selected parts.",
    },
    {
      id: "s2",
      title: "Different names. Same amount.",
      text: "Equivalent fractions name the same amount of the same whole. One half and two quarters cover exactly the same amount, even though their pieces have different sizes.",
      concept: "equivalence",
      source_quote:
        "Equivalent fractions name the same amount of the same whole. One half equals two quarters: 1/2 = 2/4.",
    },
    {
      id: "s3",
      title: "Bring the parts together",
      text: "When the pieces have the same size, add the selected parts and keep the denominator. One quarter plus two quarters is three quarters: 1/4 + 2/4 = 3/4.",
      concept: "addition",
      source_quote:
        "To add fractions with the same denominator, keep the denominator and add the numerators: 1/4 + 2/4 = 3/4.",
    },
  ],
};
export const HINDI = {
  parts: {
    title: "हर पूर्ण के बराबर हिस्से",
    text: "भिन्न किसी पूर्ण के बराबर हिस्सों को दर्शाती है। हर बताता है कि कुल कितने बराबर हिस्से हैं। अंश चुने गए हिस्सों की संख्या बताता है।",
  },
  equivalence: {
    title: "अलग नाम। समान मात्रा।",
    text: "समतुल्य भिन्न एक ही पूर्ण की समान मात्रा दर्शाती हैं। एक आधा और दो चौथाई समान मात्रा को दर्शाते हैं, भले ही हिस्सों के आकार अलग हों।",
  },
  addition: {
    title: "हिस्सों को साथ लाएँ",
    text: "जब हिस्सों का आकार समान हो, तो अंशों को जोड़ें और हर वही रखें। एक चौथाई और दो चौथाई मिलकर तीन चौथाई होते हैं: 1/4 + 2/4 = 3/4।",
  },
};
export const CONCEPTS: { id: Concept; label: string; subtitle: string }[] = [
  {
    id: "parts",
    label: "The parts of a whole",
    subtitle: "Start with the basics",
  },
  {
    id: "equivalence",
    label: "Same amount, new name",
    subtitle: "Explore equivalent fractions",
  },
  {
    id: "addition",
    label: "Bring the parts together",
    subtitle: "Add like fractions",
  },
];
export const TEACH_PROMPTS: Record<
  Concept,
  { question: string; example: string }
> = {
  parts: {
    question: "What do the top and bottom numbers in a fraction tell you?",
    example:
      "The whole is divided into equal parts. The denominator is the total number of parts, and the numerator counts the selected parts.",
  },
  equivalence: {
    question: "How can one half and two quarters be the same amount?",
    example:
      "They describe the same amount of the same whole. Each whole has equal parts, but one is divided into halves and the other into quarters.",
  },
  addition: {
    question: "How do you add fractions when their denominators are the same?",
    example:
      "The pieces have the same size. Add the numerators to count the selected pieces, and keep the same denominator.",
  },
};
export const QUESTIONS = [
  {
    id: "q1",
    concept: "equivalence" as Concept,
    question: "Which fraction names the same amount as one half?",
    choices: ["2/3", "2/4", "1/4"],
    answer: "2/4",
    explanation:
      "Two of four equal parts cover the same amount as one of two equal parts.",
  },
  {
    id: "q2",
    concept: "equivalence" as Concept,
    question: "Three sixths is equivalent to which fraction?",
    choices: ["1/2", "1/3", "3/4"],
    answer: "1/2",
    explanation: "Three of six equal parts make half of the same whole.",
  },
  {
    id: "q3",
    concept: "addition" as Concept,
    question: "What is one half plus one half?",
    choices: ["2/4", "1", "1/4"],
    answer: "1",
    explanation:
      "Two halves cover one whole. Keep the denominator: 1/2 + 1/2 = 2/2 = 1.",
  },
  {
    id: "q4",
    concept: "addition" as Concept,
    question: "What is one quarter plus two quarters?",
    choices: ["3/8", "3/4", "2/4"],
    answer: "3/4",
    explanation:
      "The pieces are all quarters. Add the selected pieces, keeping four as the denominator.",
  },
  {
    id: "q5",
    concept: "parts" as Concept,
    question:
      "A whole has 4 equal parts. You select 3. What fraction is selected?",
    choices: ["4/3", "1/4", "3/4"],
    answer: "3/4",
    explanation:
      "Three selected parts out of four equal parts is three quarters.",
  },
  {
    id: "q6",
    concept: "parts" as Concept,
    question: "In the fraction 2/5, how many equal parts make the whole?",
    choices: ["2", "5", "3"],
    answer: "5",
    explanation: "The denominator is five, so five equal parts make the whole.",
  },
];
export function exactEqual(a: string, b: string) {
  const parse = (s: string) => {
    const m = s.trim().match(/^(\d{1,3})(?:\s*\/\s*(\d{1,3}))?$/);
    return m && Number(m[2] ?? 1) !== 0
      ? [Number(m[1]), Number(m[2] ?? 1)]
      : null;
  };
  const x = parse(a),
    y = parse(b);
  return !!x && !!y && x[0] * y[1] === y[0] * x[1];
}
export function validFraction(f: Fraction) {
  return (
    Number.isInteger(f.n) &&
    Number.isInteger(f.d) &&
    f.d >= 1 &&
    f.d <= 12 &&
    f.n >= 0 &&
    f.n <= f.d
  );
}
export function sampleCommand(
  text: string,
  scene: Scene,
): { scene: Scene; message: string } {
  const words: [RegExp, string][] = [
    [/\bthree quarters?\b/g, "3/4"],
    [/\btwo quarters?\b/g, "2/4"],
    [/\bone quarter\b/g, "1/4"],
    [/\b(?:one|a) half\b/g, "1/2"],
    [/\bthree sixths?\b/g, "3/6"],
  ];
  let t = text.toLowerCase().trim();
  for (const [pattern, value] of words) t = t.replace(pattern, value);
  if (/split|subdivide|smaller/.test(t)) {
    const next = { n: scene.a.n * 2, d: scene.a.d * 2 };
    if (!validFraction(next))
      throw new Error(
        "This example supports up to 12 equal parts. Try comparing one half and two quarters.",
      );
    return {
      scene: { ...scene, b: next },
      message:
        "Each part is divided in two. The selected amount stays the same.",
    };
  }
  const matches = [...t.matchAll(/(\d{1,2})\s*\/\s*(\d{1,2})/g)].map((m) => ({
    n: +m[1],
    d: +m[2],
  }));
  if (matches.length) {
    if (matches.length > 2 || !matches.every(validFraction))
      throw new Error(
        "Choose at most two fractions with 1 to 12 equal parts and a valid selection.",
      );
    return {
      scene: {
        a: matches[0],
        b: matches[1] ?? null,
        representation: /number line|numberline/.test(t)
          ? "line"
          : /\bbars?/.test(t)
            ? "bars"
            : scene.representation,
      },
      message: `Showing ${matches.map((f) => `${f.n} of ${f.d} equal parts`).join(" beside ")}.`,
    };
  }
  if (/number line|numberline/.test(t))
    return {
      scene: { ...scene, representation: "line" },
      message: "The same amount, shown on a number line.",
    };
  if (/\bbar|\bpieces/.test(t))
    return {
      scene: { ...scene, representation: "bars" },
      message: "Back to equal parts of a whole.",
    };
  if (/compare|equivalent|half|halves/.test(t))
    return {
      scene: {
        a: { n: 1, d: 2 },
        b: { n: 2, d: 4 },
        representation: scene.representation,
      },
      message:
        "One half and two quarters cover the same amount of the same whole.",
    };
  if (/why|explain/.test(t))
    return {
      scene,
      message:
        "Keep the whole the same. Compare the selected amount, rather than only counting the pieces.",
    };
  throw new Error(
    "Try “compare 1/2 and 2/4”, “show 3/4”, “split the parts”, or “show a number line”.",
  );
}
export function sampleRubric(
  text: string,
  concept: Concept = "equivalence",
): RubricRow[] {
  const rules: Record<Concept, [string, RegExp, string][]> = {
    parts: [
      [
        "Equal parts",
        /equal(?:ly)?\s+(?:parts|pieces|sized|divided)/i,
        "Within the whole, the parts must be equal in size.",
      ],
      [
        "The denominator",
        /denominator.{0,45}(?:total|number|parts)/i,
        "The denominator counts the total equal parts.",
      ],
      [
        "The numerator",
        /numerator.{0,45}(?:selected|counts|chosen)/i,
        "The numerator counts the selected parts.",
      ],
    ],
    equivalence: [
      [
        "The same whole",
        /same\s+(?:sized?\s+)?(?:whole|pizza|cake|bar)/i,
        "Equivalent fractions refer to the same-sized whole.",
      ],
      [
        "Equal parts",
        /equal(?:ly)?\s+(?:parts|pieces|sized|divided)|same\s+size\s+(?:parts|pieces)/i,
        "Within each whole, the parts must be equal in size.",
      ],
      [
        "The same amount",
        /same\s+(?:amount|quantity)|equivalent|both\s+(?:are|make)\s+(?:a\s+)?half/i,
        "Different fractions can describe the same selected amount.",
      ],
    ],
    addition: [
      [
        "Equal-sized pieces",
        /same\s+size|equal(?:ly)?[-\s]+sized|same\s+denominator/i,
        "The denominators identify equal-sized pieces.",
      ],
      [
        "Add the numerators",
        /add\s+(?:the\s+)?numerators|numerators.{0,25}add/i,
        "Add the numerators to count the selected pieces.",
      ],
      [
        "Keep the denominator",
        /keep\s+(?:the\s+)?(?:same\s+)?denominator|denominator.{0,20}(?:same|unchanged)/i,
        "Keep the denominator because the piece size stays the same.",
      ],
    ],
  };
  return rules[concept].map(([criterion, pattern, feedback]) => {
    const quote = text.match(pattern)?.[0] ?? "";
    return {
      criterion,
      quote,
      feedback,
      status: quote ? "supported" : "not_mentioned",
    };
  });
}
