import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Leaf,
  LoaderCircle,
  MessageCircle,
  Mic,
  Pause,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { request, recordWav } from "./api";
import FractionVisual from "./FractionVisual";
import ConceptVisual, { type VisualPlan } from "./ConceptVisual";
import { sampleCommand, type Scene, type RubricRow } from "./learning";

export type GeneralLesson = {
  id: string;
  title: string;
  subject: string;
  source: string;
  general: true;
  blocks: {
    id: string;
    title: string;
    text: string;
    source_quote: string;
    key_points: string[];
    teach_prompt: string;
    visual: "none" | "fractions";
    questions: { id: string; question: string; choices: string[] }[];
  }[];
};
type Result = {
  question_id: string;
  choice_index: number;
  correct: boolean;
  correct_index: number;
  explanation: string;
  source_quote: string;
  question: string;
  response: string;
};
type Props = {
  lesson: GeneralLesson;
  sourceImage: string;
  recap: boolean;
  providers: { gnani: boolean };
  onNavigate: (view: "home" | "import" | "studio" | "summary") => void;
  onError: (message: string) => void;
};

export default function GeneralStudio({
  lesson,
  sourceImage,
  recap,
  providers,
  onNavigate,
  onError,
}: Props) {
  const [index, setIndex] = useState(0),
    [tab, setTab] = useState<"explore" | "explain" | "practice">("explore");
  const [mode, setMode] = useState<"read" | "focus">("read"),
    [step, setStep] = useState(0),
    [source, setSource] = useState(false),
    [busy, setBusy] = useState("");
  const [explanation, setExplanation] = useState(""),
    [rows, setRows] = useState<RubricRow[] | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0),
    [choice, setChoice] = useState<number | null>(null),
    [result, setResult] = useState<Result | null>(null);
  const [summary, setSummary] = useState<{
    attempts: Result[];
    correct: number;
    total: number;
    teach_backs: number;
  } | null>(null);
  const [summaryError, setSummaryError] = useState("");
  const visualCache = useRef(new Map<string, VisualPlan>());
  const [asking, setAsking] = useState(false),
    [selection, setSelection] = useState(""),
    [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState<{
      answer: string;
      source_quote: string;
    } | null>(null);
  const [playing, setPlaying] = useState(false),
    [recording, setRecording] = useState(false),
    [seconds, setSeconds] = useState(0),
    [transcript, setTranscript] = useState<string | null>(null),
    [recordTarget, setRecordTarget] = useState<"teach" | "ask">("teach");
  const [scene, setScene] = useState<Scene>({
      a: { n: 1, d: 2 },
      b: { n: 2, d: 4 },
      representation: "bars",
    }),
    [command, setCommand] = useState("");
  const player = useRef<HTMLAudioElement | null>(null),
    recorder = useRef<Awaited<ReturnType<typeof recordWav>> | null>(null),
    lock = useRef(false),
    epoch = useRef(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const dialogOpen = asking || recording || transcript !== null;
  useEffect(() => {
    if (!dialogOpen) return;
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
      );
      if (!items?.length) return;
      const first = items[0],
        last = items[items.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === dialogRef.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === dialogRef.current)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keyboard);
      previous?.focus();
    };
  }, [dialogOpen, recording, transcript !== null]);
  const block = lesson.blocks[index],
    item = block.questions[questionIndex],
    sentences = block.text.split(/(?<=[.!?])\s+/);
  function stop() {
    epoch.current++;
    player.current?.pause();
    window.speechSynthesis?.cancel();
    setPlaying(false);
  }
  useEffect(
    () => () => {
      player.current?.pause();
      window.speechSynthesis?.cancel();
      recorder.current?.cancel();
    },
    [],
  );
  useEffect(() => {
    if (!recap) return;
    stop();
    setSummary(null);
    setSummaryError("");
    request<typeof summary>(`/lessons/${lesson.id}/summary`, undefined, "GET")
      .then(setSummary)
      .catch((e) => setSummaryError(e.message));
  }, [recap, lesson.id]);
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);
  useEffect(() => {
    if (recording && seconds >= 25) void finishRecording();
  }, [seconds]);
  function select(i: number) {
    stop();
    setIndex(i);
    setStep(0);
    setQuestionIndex(0);
    setTab("explore");
    setRows(null);
    setExplanation("");
    setResult(null);
    setChoice(null);
    setAnswer(null);
    setSelection("");
  }
  async function operation(label: string, action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(label);
    onError("");
    try {
      await action();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy("");
    }
  }
  async function speak(text = block.text) {
    if (playing) {
      stop();
      return;
    }
    const token = ++epoch.current;
    await operation("Preparing narration", async () => {
      if (providers.gnani) {
        const data = await request<{ audio: string; content_type: string }>(
          "/speech/synthesize",
          { text, language: "en-IN" },
        );
        if (token !== epoch.current) return;
        const audio = new Audio(
          `data:${data.content_type};base64,${data.audio}`,
        );
        player.current = audio;
        audio.onended = () => setPlaying(false);
        audio.onerror = () => {
          setPlaying(false);
          onError("Audio could not play. The text remains available.");
        };
        await audio.play();
        setPlaying(true);
      } else if ("speechSynthesis" in window) {
        const voice = new SpeechSynthesisUtterance(text);
        voice.lang = "en-IN";
        voice.onstart = () => setPlaying(true);
        voice.onend = () => setPlaying(false);
        voice.onerror = () => setPlaying(false);
        window.speechSynthesis.speak(voice);
      } else throw new Error("Narration is unavailable in this browser.");
    });
  }
  async function startRecording(target: "teach" | "ask") {
    if (!providers.gnani) {
      onError("Gnani speech is not configured. You can type instead.");
      return;
    }
    stop();
    setRecordTarget(target);
    try {
      recorder.current = await recordWav();
      setSeconds(0);
      setRecording(true);
    } catch {
      onError("Microphone access is unavailable. You can type instead.");
    }
  }
  async function finishRecording() {
    const current = recorder.current;
    if (!current) return;
    recorder.current = null;
    setRecording(false);
    await operation("Transcribing your words", async () => {
      const wav = await current.stop();
      const form = new FormData();
      form.append("audio", wav, "recording.wav");
      form.append("language", "en-IN");
      const data = await request<{ transcript: string }>(
        "/speech/transcribe",
        form,
      );
      if (!data.transcript.trim())
        throw new Error("No clear speech was heard. Try again or type.");
      setTranscript(data.transcript);
    });
  }
  async function submitTeach() {
    if (explanation.trim().length < 12) {
      onError("Explain the idea in a little more detail first.");
      return;
    }
    const token = epoch.current;
    const text = explanation;
    await operation("Reading your explanation", async () => {
      const data = await request<{ rows: RubricRow[] }>(
        `/lessons/${lesson.id}/teach-back`,
        { block_id: block.id, text },
      );
      if (token === epoch.current) setRows(data.rows);
    });
  }
  async function check() {
    if (choice === null || result) return;
    await operation("Checking your answer", async () => {
      setResult(
        await request<Result>(`/lessons/${lesson.id}/attempts`, {
          question_id: item.id,
          choice_index: choice,
          submission_id: crypto.randomUUID(),
        }),
      );
    });
  }
  function next() {
    if (questionIndex === block.questions.length - 1) {
      if (index < lesson.blocks.length - 1) select(index + 1);
      else onNavigate("summary");
      return;
    }
    setQuestionIndex((i) => i + 1);
    setChoice(null);
    setResult(null);
  }
  function askAbout() {
    setSelection(selection || block.text);
    setQuestion("");
    setAnswer(null);
    setAsking(true);
  }
  async function ask() {
    if (!question.trim()) return;
    const token = epoch.current;
    await operation("Looking at your source", async () => {
      const data = await request<{ answer: string; source_quote: string }>(
        `/lessons/${lesson.id}/ask`,
        { block_id: block.id, question, selection: selection || block.text },
      );
      if (token === epoch.current) setAnswer(data);
    });
  }

  if (recap)
    return (
      <main id="main-content" className="summary-page wrap page-transition">
        <button className="back-link" onClick={() => onNavigate("studio")}>
          <ArrowLeft size={15} /> Back to your lesson
        </button>
        <div className="summary-header">
          <div>
            <span className="eyebrow">
              YOUR LEARNING JOURNAL · {lesson.subject.toUpperCase()}
            </span>
            <h1>
              A little more
              <br />
              <em>understanding.</em>
            </h1>
            <p>{lesson.title}</p>
          </div>
          <img src="/images/book-garden.webp" alt="" />
        </div>
        {summary ? (
          <>
            <div className="recap-stats">
              <div>
                <span>{summary.total}</span>
                <p>Questions attempted</p>
              </div>
              <div>
                <span>
                  {summary.correct}
                  <small> / {summary.total}</small>
                </span>
                <p>Answers that fit</p>
              </div>
              <div>
                <span>{summary.teach_backs}</span>
                <p>Teach-back activities</p>
              </div>
            </div>
            <section className="recap-section">
              <h2>Your work, linked to the page.</h2>
              {summary.attempts.length ? (
                summary.attempts.map((a, i) => (
                  <div className="attempt-row" key={i}>
                    <span className="attempt-number">{i + 1}</span>
                    <div>
                      <strong>{a.question}</strong>
                      <p>Your answer: {a.response}</p>
                    </div>
                    <span
                      className={`result-label ${a.correct ? "positive" : ""}`}
                    >
                      {a.correct ? "Fits the source" : "Worth another look"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty-recap">
                  <BookOpen size={28} />
                  <h3>Your first question is waiting.</h3>
                  <p>
                    Complete a practice question to see your actual evidence
                    here.
                  </p>
                </div>
              )}
            </section>
          </>
        ) : (
          summaryError ? <div className="recap-error" role="alert"><p>{summaryError}</p><button className="text-btn" onClick={() => { setSummaryError(""); request<typeof summary>(`/lessons/${lesson.id}/summary`, undefined, "GET").then(setSummary).catch(e => setSummaryError(e.message)); }}>Try loading the recap again</button></div> : <p role="status">Loading your session evidence…</p>
        )}
        <button className="btn" onClick={() => onNavigate("studio")}>
          Keep exploring <ArrowRight size={16} />
        </button>
        <p className="summary-disclosure">
          These are practice results from this session, not a validated mastery
          score.
        </p>
      </main>
    );

  return (
    <main id="main-content" className="studio-shell general-studio">
      <aside className="lesson-sidebar">
        <button className="back-link" onClick={() => onNavigate("home")}>
          <ArrowLeft size={15} /> Back to home
        </button>
        <button className="btn sidebar-upload" onClick={() => onNavigate("import")}>
          <ArrowUpRight size={18} /> Upload a new page
        </button>
        <div className="lesson-cover">
          <img src="/images/book-garden.webp" alt="" />
          <span>{lesson.subject.toUpperCase()}</span>
          <h2>{lesson.title}</h2>
        </div>
        <div className="outline-label">YOUR WAY THROUGH</div>
        <nav className="lesson-outline" aria-label="Lesson outline">
          {lesson.blocks.map((b, i) => (
            <button
              key={b.id}
              className={index === i ? "active" : ""}
              disabled={!!busy}
              onClick={() => select(i)}
            >
              <span className="outline-num">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                <strong>{b.title}</strong>
                <small>From your original page</small>
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Leaf size={20} />
          <p>
            Your subject.
            <br />
            Your way of understanding.
          </p>
        </div>
      </aside>
      <section className="studio-main">
        <button className="btn mobile-upload" onClick={() => onNavigate("import")}><ArrowUpRight size={18} /> Upload a new page</button>
        <div className="studio-topline">
          <span className="eyebrow">
            <span className="status-dot" /> YOUR SOURCE-LINKED LESSON
          </span>
          <button
            className="text-btn source-toggle"
            onClick={() => setSource(!source)}
          >
            <FileText size={15} /> {source ? "Hide source" : "View source"}{" "}
            <ChevronRight size={14} />
          </button>
        </div>
        <label className="mobile-concept-select">
          YOUR WAY THROUGH
          <select
            aria-label="Choose a lesson section"
            disabled={!!busy}
            value={index}
            onChange={(e) => select(+e.target.value)}
          >
            {lesson.blocks.map((b, i) => (
              <option value={i} key={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </label>
        <div className="studio-heading">
          <div>
            <span className="chapter-label">
              SECTION {String(index + 1).padStart(2, "0")} ·{" "}
              {lesson.subject.toUpperCase()}
            </span>
            <h1>{block.title}</h1>
          </div>
          <button
            className="round-play"
            aria-label={
              playing ? "Stop narration" : "Read this explanation aloud"
            }
            onClick={() => void speak()}
          >
            {playing ? <Pause size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
        <p className="lesson-route-guide">Start with the explanation below. Explore its visual, explain it in your own words, then try a question.</p>
        {source && (
          <section className="source-excerpt">
            {sourceImage && <details className="source-image-preview"><summary>View the page image</summary><img src={sourceImage} alt="The source page used to build this lesson" /><a className="text-btn" href={sourceImage} target="_blank" rel="noopener noreferrer">Open image at full size <ArrowUpRight size={14} /></a></details>}
            <span className="eyebrow">THE EXACT SOURCE PASSAGE</span>
            <blockquote>{block.source_quote}</blockquote>
            <details>
              <summary>Read the complete confirmed source</summary>
              <p>{lesson.source}</p>
            </details>
          </section>
        )}
        <div
          className="destination-tabs"
          role="tablist"
          aria-label="Learning activity"
        >
          {(["explore", "explain", "practice"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              id={`general-tab-${t}`}
              className={tab === t ? "active" : ""}
              aria-selected={tab === t}
              aria-controls="general-activity"
              tabIndex={tab === t ? 0 : -1}
              onKeyDown={(event) => {
                const tabs = ["explore", "explain", "practice"] as const;
                const current = tabs.indexOf(t);
                const next = event.key === "ArrowRight" ? (current + 1) % 3 : event.key === "ArrowLeft" ? (current + 2) % 3 : event.key === "Home" ? 0 : event.key === "End" ? 2 : -1;
                if (next >= 0) { event.preventDefault(); stop(); setTab(tabs[next]); document.getElementById(`general-tab-${tabs[next]}`)?.focus(); }
              }}
              disabled={!!busy}
              onClick={() => {
                stop();
                setTab(t);
              }}
            >
              {t === "explore" ? (
                <Eye size={16} />
              ) : t === "explain" ? (
                <MessageCircle size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}{" "}
              {t === "explore"
                  ? "1. Understand"
                : t === "explain"
                  ? "2. Explain it back"
                  : "3. Practise"}
            </button>
          ))}
        </div>
        <div className="activity-panel" id="general-activity" role="tabpanel" aria-labelledby={`general-tab-${tab}`} key={block.id + tab}>
          {tab === "explore" && (
            <>
              <div
                className={`explanation lesson-reading ${mode === "focus" ? "focus-reading" : ""} ${playing ? "general-speaking" : ""}`}
              >
                <div className="reading-toolbar">
                  <div className="mode-control">
                    <button
                      className={mode === "read" ? "active" : ""}
                      onClick={() => {
                        stop();
                        setMode("read");
                      }}
                    >
                      {" "}
                      <BookOpen size={14} /> Read
                    </button>
                    <button
                      className={mode === "focus" ? "active" : ""}
                      onClick={() => {
                        stop();
                        setMode("focus");
                        setStep(0);
                      }}
                    >
                      <Eye size={14} /> One sentence
                    </button>
                    <button onClick={() => void speak()}>
                      <Volume2 size={14} /> {playing ? "Stop" : "Listen"}
                    </button>
                  </div>
                  <button className="text-btn ask-trigger" onClick={askAbout}>
                    <MessageCircle size={14} /> {selection ? "Ask about selection" : "Ask about this"}
                  </button>
                </div>
                <p
                  onMouseUp={() => {
                    const s = window.getSelection()?.toString().trim() ?? "";
                    if (s && block.text.includes(s)) setSelection(s);
                  }}
                >
                  {mode === "focus"
                    ? sentences[Math.min(step, sentences.length - 1)]
                    : block.text}
                </p>
                {mode === "focus" && (
                  <div className="focus-steps">
                    <button
                      className="text-btn"
                      disabled={!step}
                      onClick={() => setStep((i) => i - 1)}
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>
                    <span>
                      Step {step + 1} of {sentences.length}
                    </span>
                    <button
                      className="text-btn"
                      disabled={step === sentences.length - 1}
                      onClick={() => setStep((i) => i + 1)}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                )}
                <button
                  className="source-citation"
                  onClick={() => setSource(true)}
                >
                  <FileText size={12} /> View supporting passage ·{" "}
                  {block.id.toUpperCase()}
                </button>
              </div>
              <ConceptVisual key={lesson.id + block.id} lessonId={lesson.id} blockId={block.id} cache={visualCache.current} busy={!!busy} speaking={playing} onStop={stop} onSpeak={(text) => { void speak(text); }} />
              <section className="key-point-panel">
                <span className="eyebrow">THE IDEAS TO TAKE WITH YOU</span>
                {block.key_points.map((point, i) => (
                  <div key={i}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <p>{point}</p>
                  </div>
                ))}
              </section>
              {block.visual === "fractions" && (
                <section className="scene-card">
                  <div className="scene-top">
                    <span className="eyebrow">
                      VALIDATED FRACTION EXPLORER · ILLUSTRATIVE EXAMPLE
                    </span>
                  </div>
                  <FractionVisual scene={scene} />
                  <form
                    className="general-scene-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      try {
                        setScene(sampleCommand(command, scene).scene);
                        setCommand("");
                      } catch (e) {
                        onError((e as Error).message);
                      }
                    }}
                  >
                    <input
                      aria-label="Change the fraction example"
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      placeholder="Compare 1/2 and 2/4"
                    />
                    <button className="text-btn">
                      Update <ArrowRight size={14} />
                    </button>
                  </form>
                </section>
              )}
              <div className="activity-next">
                <span>What makes sense so far?</span>
                <button
                  className="btn btn-small"
                  onClick={() => setTab("explain")}
                >
                  Put it in your words <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
          {tab === "explain" && (
            <div className="teach-panel">
              <div className="activity-intro">
                <span className="small-illustration">
                  <MessageCircle size={30} />
                </span>
                <h2>
                  Your words.
                  <br />
                  <em>Your understanding.</em>
                </h2>
                <p>{block.teach_prompt}</p>
              </div>
              <label className="field-label" htmlFor="general-teach">
                YOUR EXPLANATION
              </label>
              <textarea
                id="general-teach"
                value={explanation}
                disabled={!!busy}
                maxLength={2000}
                onChange={(e) => {
                  setExplanation(e.target.value);
                  setRows(null);
                }}
                placeholder="Here is how I would explain it…"
              />
              <div className="textarea-actions">
                <button
                  className="text-btn"
                  onClick={() => void startRecording("teach")}
                  disabled={!!busy}
                >
                  <Mic size={16} /> Say it instead
                </button>
                <span>No perfect words needed.</span>
              </div>
              <div className="teach-actions">
                <button
                  className="btn"
                  disabled={!!busy}
                  onClick={() => void submitTeach()}
                >
                  Look at my explanation <ArrowRight size={16} />
                </button>
              </div>
              {rows && (
                <section className="rubric-section">
                  <span className="eyebrow">
                    OPENAI FEEDBACK · CHECK THE EVIDENCE
                  </span>
                  {rows.map((r, i) => (
                    <div
                      className={`rubric-row ${r.status === "supported" ? "supported" : ""}`}
                      key={i}
                    >
                      <MessageCircle size={20} />
                      <div>
                        <strong>{r.criterion}</strong>
                        {r.quote && <blockquote>“{r.quote}”</blockquote>}
                        <p>{r.feedback}</p>
                      </div>
                      <span className="rubric-status">
                        {r.status.replaceAll("_", " ")}
                      </span>
                    </div>
                  ))}
                  <button
                    className="btn btn-small"
                    onClick={() => setTab("practice")}
                  >
                    Try a fresh question <ArrowRight size={15} />
                  </button>
                </section>
              )}
            </div>
          )}
          {tab === "practice" && (
            <div className="practice-panel">
              <div className="practice-meta">
                <span className="eyebrow">
                  FROM YOUR PAGE · QUESTION {questionIndex + 1} OF{" "}
                  {block.questions.length}
                </span>
              </div>
              <h2>{item.question}</h2>
              <fieldset
                className="answer-choices"
                disabled={!!busy || !!result}
              >
                <legend className="sr-only">Choose an answer</legend>
                {item.choices.map((option, i) => (
                  <label
                    key={i}
                    className={`${choice === i ? "selected" : ""} ${result && result.correct_index === i ? "correct" : ""}`}
                  >
                    <input
                      type="radio"
                      name="general-answer"
                      checked={choice === i}
                      onChange={() => setChoice(i)}
                    />
                    <span className="choice-letter">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <strong>{option}</strong>
                  </label>
                ))}
              </fieldset>
              {!result ? (
                <div className="practice-actions">
                  <button
                    className="btn"
                    disabled={!!busy || choice === null}
                    onClick={() => void check()}
                  >
                    Check my answer <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <div
                  className={`answer-feedback ${result.correct ? "success" : "try-again"}`}
                >
                  <h3>
                    {result.correct
                      ? "That fits the source."
                      : "Let’s look at the idea again."}
                  </h3>
                  <p>{result.explanation}</p>
                  <blockquote>{result.source_quote}</blockquote>
                  <span className="eyebrow">
                    EXACT PASSAGE FROM YOUR SOURCE
                  </span>
                  <button className="text-btn" onClick={next}>
                    {questionIndex < block.questions.length - 1 ? "Try the next question" : index < lesson.blocks.length - 1 ? "Continue to the next section" : "Finish and see my recap"} <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="narration-note">
          <Volume2 size={12} />{" "}
          {providers.gnani
            ? "AI-generated narration · Gnani"
            : "Optional device narration"}{" "}
          · English lesson
        </div>
        <div className="studio-footer">
          <span>
            <Leaf size={13} /> A little progress is still progress.
          </span>
          <button className="text-btn" onClick={() => onNavigate("summary")}>
            See my recap <ArrowRight size={13} />
          </button>
          <button className="text-btn" onClick={() => onNavigate("import")}>Upload another page <ArrowUpRight size={13} /></button>
        </div>
      </section>
      {asking && !recording && transcript === null && (
        <div
          className="modal-backdrop"
          onClick={() => {
            stop();
            setAsking(false);
          }}
        >
          <div
            className="modal"
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="general-ask-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setAsking(false);
            }}
          >
            <div className="modal-heading">
              <h2 id="general-ask-title">A closer look at this part.</h2>
              <button
                className="icon-btn"
                aria-label="Close question"
                onClick={() => {
                  stop();
                  setAsking(false);
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="selected-passage">
              <blockquote>{selection || block.text}</blockquote>
            </div>
            <label className="field-label" htmlFor="general-ask">
              WHAT WOULD YOU LIKE TO KNOW?
            </label>
            <div className="ask-input">
              <input
                autoFocus
                id="general-ask"
                value={question}
                maxLength={500}
                disabled={!!busy}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Explain this part another way…"
              />
              <button
                className="icon-btn"
                aria-label="Speak your question"
                disabled={!!busy}
                onClick={() => void startRecording("ask")}
              >
                <Mic size={17} />
              </button>
            </div>
            <button
              className="btn btn-small"
              disabled={!!busy}
              onClick={() => void ask()}
            >
              Take a closer look <ArrowRight size={15} />
            </button>
            {answer && (
              <div className="context-answer">
                <p>{answer.answer}</p>
                {answer.source_quote ? (
                  <>
                    <span className="eyebrow">SUPPORTING SOURCE</span>
                    <blockquote>{answer.source_quote}</blockquote>
                  </>
                ) : (
                  <p className="muted">
                    This source does not establish an answer to that question.
                  </p>
                )}
                <button
                  className="text-btn"
                  onClick={() => void speak(answer.answer)}
                >
                  <Volume2 size={15} /> Listen
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {(recording || transcript !== null) && (
        <div className="modal-backdrop voice-overlay">
          <div
            className="modal"
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Voice input"
          >
            <div className="modal-heading">
              <h2>
                {recording ? "Your words, your pace." : "Here’s what we heard."}
              </h2>
              <button
                className="icon-btn"
                aria-label="Cancel recording"
                onClick={() => {
                  recorder.current?.cancel();
                  recorder.current = null;
                  setRecording(false);
                  setTranscript(null);
                }}
              >
                <X size={20} />
              </button>
            </div>
            {recording ? (
              <div className="recording-content">
                <div className="recording-mark">
                  <Mic size={30} />
                </div>
                <p>{seconds}s / 25s</p>
                <button className="btn" onClick={() => void finishRecording()}>
                  <Square size={15} /> Stop and review
                </button>
              </div>
            ) : (
              <>
                <p>
                  Correct anything before using these words. This does not
                  submit your response.
                </p>
                <textarea
                  aria-label="Review your transcript"
                  value={transcript ?? ""}
                  onChange={(e) => setTranscript(e.target.value)}
                />
                <button
                  className="btn"
                  onClick={() => {
                    if (recordTarget === "teach") {
                      setExplanation(transcript ?? "");
                      setRows(null);
                    } else setQuestion(transcript ?? "");
                    setTranscript(null);
                  }}
                >
                  Use these words <ArrowRight size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {busy && (
        <div className="busy-indicator" role="status">
          <LoaderCircle size={16} className="spin" />
          {busy}…
        </div>
      )}
    </main>
  );
}
