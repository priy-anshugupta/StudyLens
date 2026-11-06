import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Headphones,
  Mic,
  Upload,
  SlidersHorizontal,
  X,
  Play,
  Pause,
  Volume2,
  Globe,
  MousePointer2,
  MessageCircle,
  CheckCircle2,
  RotateCcw,
  Plus,
  Minus,
  FileText,
  Leaf,
  Menu,
  ExternalLink,
  Info,
  AlertCircle,
  Square,
  LoaderCircle,
  Trash2,
  Eye,
  Type,
  Accessibility,
} from "lucide-react";
import {
  SAMPLE,
  HINDI,
  CONCEPTS,
  QUESTIONS,
  TEACH_PROMPTS,
  exactEqual,
  sampleCommand,
  sampleRubric,
  validFraction,
  type View,
  type Concept,
  type Scene,
  type Lesson,
  type Destination,
  type Attempt,
  type RubricRow,
} from "./learning";
import { request, recordWav } from "./api";
import FractionVisual from "./FractionVisual";
import AnimatedBook from "./AnimatedBook";
import GeneralStudio, { type GeneralLesson } from "./GeneralStudio";
import { pageFileError, sourceTextError } from "./import-validation";
import { parseSavedLesson } from "./session-lesson";

function Brand({ onClick }: { onClick: () => void }) {
  return (
    <button className="brand" onClick={onClick} aria-label="StudyLens home">
      <span className="brand-mark">
        <BookOpen size={22} strokeWidth={1.7} />
      </span>
      Study<span className="brand-lens">Lens</span>
      <span className="brand-dot">.</span>
    </button>
  );
}
function App() {
  const initialHash = window.location.hash.slice(1);
  const [view, setView] = useState<View>(
    ["studio", "import", "summary"].includes(initialHash)
      ? (initialHash as View)
      : "home",
  );
  const [lesson, setLesson] = useState<Lesson>(() => {
    try { return parseSavedLesson(sessionStorage.getItem("pa-lesson")) ?? SAMPLE; }
    catch { return SAMPLE; }
  });
  const [concept, setConcept] = useState<Concept>("equivalence");
  const [destination, setDestination] = useState<Destination>("explore");
  const [scene, setScene] = useState<Scene>({
    a: { n: 1, d: 2 },
    b: { n: 2, d: 4 },
    representation: "bars",
  });
  const [pastScene, setPastScene] = useState<Scene | null>(null);
  const [settings, setSettings] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [fontSize, setFontSize] = useState(() =>
    Number(localStorage.getItem("pa-font") ?? 20),
  );
  const [spacing, setSpacing] = useState(
    () => localStorage.getItem("pa-spacing") === "true",
  );
  const [reduced, setReduced] = useState(
    () => localStorage.getItem("pa-motion") === "true",
  );
  const [contrast, setContrast] = useState(
    () => localStorage.getItem("pa-contrast") === "true",
  );
  const [focusIndex, setFocusIndex] = useState(0);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [mode, setMode] = useState<"read" | "focus" | "listen">("read");
  const [sceneMessage, setSceneMessage] = useState(
    "Keep the whole the same. Compare the amount that is selected.",
  );
  const sceneVersion = useRef(0);
  const submissionLock = useRef(false);
  const audioVersion = useRef(0);
  const [sourceQuote, setSourceQuote] = useState("");
  const [command, setCommand] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [providers, setProviders] = useState({
    backend: false,
    openai: false,
    gnani: false,
  });
  const [teachText, setTeachText] = useState("");
  const [rubric, setRubric] = useState<RubricRow[] | null>(null);
  const [rubricEngine, setRubricEngine] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [hint, setHint] = useState(false);
  const [counter, setCounter] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [askQuestion, setAskQuestion] = useState("");
  const [askAnswer, setAskAnswer] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [uploadPreview, setUploadPreview] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [pendingUploadName, setPendingUploadName] = useState("");
  const [lessonImage, setLessonImage] = useState("");
  const [dragging, setDragging] = useState(false);
  const importLock = useRef(false), importVersion = useRef(0);
  const previewUrls = useRef(new Set<string>());
  const [sourceText, setSourceText] = useState("");
  const [docId, setDocId] = useState("");
  const [importStage, setImportStage] = useState<"empty" | "review">("empty");
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorder = useRef<Awaited<ReturnType<typeof recordWav>> | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordTarget, setRecordTarget] = useState<
    "command" | "teach" | "answer" | "ask"
  >("command");
  const [transcript, setTranscript] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const messageTimer = useRef<number | undefined>(undefined);
  const [supportCount, setSupportCount] = useState(0);
  const teachPrompt = TEACH_PROMPTS[concept];
  const activeBlock =
    lesson.blocks.find((b) => b.concept === concept) ?? lesson.blocks[0];
  const translated = language === "hi" && lesson.sample ? HINDI[concept] : null;
  const question = QUESTIONS[questionIndex];
  const focusSentences = (translated?.text ?? activeBlock.text).split(
    /(?<=[.!?।])\s+/,
  );
  const latestSource = useRef(sourceText);
  latestSource.current = sourceText;
  const latestTeach = useRef(teachText);
  latestTeach.current = teachText;
  function navigate(v: View) {
    importVersion.current++;
    sceneVersion.current++;
    stopAudio();
    setError("");
    setNotice("");
    setView(v);
    window.location.hash = v === "home" ? "" : v;
    window.scrollTo({ top: 0, behavior: "instant" });
    setMenuOpen(false);
  }
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const main = document.getElementById("main-content");
      main?.setAttribute("tabindex", "-1");
      main?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [view]);
  function notify(message: string) {
    setNotice(message);
    clearTimeout(messageTimer.current);
    messageTimer.current = window.setTimeout(() => setNotice(""), 7000);
  }
  async function refreshConnections() {
    try {
      const status = await request<{ openai: boolean; gnani: boolean }>(
        "/health",
        undefined,
        "GET",
      );
      setProviders({ backend: true, ...status });
      return status;
    } catch {
      setProviders({ backend: false, openai: false, gnani: false });
      return null;
    }
  }
  useEffect(() => {
    void refreshConnections();
    return () => {
      window.speechSynthesis?.cancel();
      recorder.current?.cancel();
      previewUrls.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);
  useEffect(() => {
    const h = () => {
      importVersion.current++;
      const v = window.location.hash.slice(1);
      if (["home", "studio", "import", "summary", ""].includes(v))
        setView((v || "home") as View);
    };
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  useEffect(() => {
    localStorage.setItem("pa-font", String(fontSize));
    localStorage.setItem("pa-spacing", String(spacing));
    localStorage.setItem("pa-motion", String(reduced));
    localStorage.setItem("pa-contrast", String(contrast));
  }, [fontSize, spacing, reduced, contrast]);
  useEffect(() => {
    try {
      if (lesson.general) sessionStorage.setItem("pa-lesson", JSON.stringify({ lesson, savedAt: Date.now() }));
      else sessionStorage.removeItem("pa-lesson");
    } catch { /* Storage can be unavailable; the active lesson still works. */ }
  }, [lesson]);
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(
      () => setRecordSeconds((s) => s + 1),
      1000,
    );
    return () => clearInterval(timer);
  }, [recording]);
  useEffect(() => {
    if (recording && recordSeconds >= 25) void stopRecording();
  }, [recordSeconds]);
  function stopAudio() {
    audioVersion.current++;
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    setAudioPlaying(false);
  }
  function chooseConcept(c: Concept) {
    sceneVersion.current++;
    setPastScene(null);
    setTeachText("");
    setSourceQuote("");
    setSceneMessage(
      "Keep the whole the same. Compare the amount that is selected.",
    );
    stopAudio();
    setFocusIndex(0);
    setConcept(c);
    setDestination("explore");
    setRubric(null);
    setAskAnswer("");
    setError("");
    setScene(
      c === "parts"
        ? { a: { n: 3, d: 4 }, b: null, representation: "bars" }
        : c === "addition"
          ? { a: { n: 1, d: 4 }, b: { n: 2, d: 4 }, representation: "bars" }
          : { a: { n: 1, d: 2 }, b: { n: 2, d: 4 }, representation: "bars" },
    );
  }
  async function speak(text = translated?.text ?? activeBlock.text) {
    if (audioPlaying) {
      stopAudio();
      return;
    }
    const pendingAudio = ++audioVersion.current;
    setError("");
    try {
      if (providers.gnani) {
        setBusy("Preparing narration");
        const data = await request<{ audio: string; content_type: string }>(
          "/speech/synthesize",
          { text, language: translated ? "hi-IN" : "en-IN" },
        );
        if (pendingAudio !== audioVersion.current) return;
        const player = new Audio(
          `data:${data.content_type};base64,${data.audio}`,
        );
        audioRef.current = player;
        player.onended = () => setAudioPlaying(false);
        player.onerror = () => {
          setAudioPlaying(false);
          setError("Audio could not play. Your lesson is still readable.");
        };
        await player.play();
        setAudioPlaying(true);
      } else if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = translated ? "hi-IN" : "en-IN";
        utterance.rate = 0.9;
        utterance.onend = () => setAudioPlaying(false);
        utterance.onerror = () => setAudioPlaying(false);
        utterance.onstart = () => setAudioPlaying(true);
        window.speechSynthesis.speak(utterance);
        notify(
          "Device narration · AI speech from Gnani will be available after connection.",
        );
      } else
        throw new Error(
          "Narration is unavailable in this browser. You can keep reading.",
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function startRecording(target: typeof recordTarget) {
    if (!providers.gnani) {
      setInfoOpen(true);
      return;
    }
    if (recording || busy) return;
    stopAudio();
    setError("");
    setRecordTarget(target);
    try {
      recorder.current = await recordWav();
      setRecordSeconds(0);
      setRecording(true);
    } catch {
      setError(
        "Microphone access is unavailable. You can type your response instead.",
      );
    }
  }
  async function stopRecording() {
    if (!recorder.current) return;
    const r = recorder.current;
    recorder.current = null;
    setRecording(false);
    setBusy("Transcribing your words");
    try {
      const blob = await r.stop();
      const form = new FormData();
      form.append("audio", blob, "recording.wav");
      form.append("language", language === "hi" ? "hi-IN" : "en-IN");
      const data = await request<{ transcript: string }>(
        "/speech/transcribe",
        form,
      );
      if (!data.transcript.trim())
        throw new Error(
          "We did not hear a clear answer. Please try again or type.",
        );
      setTranscript(data.transcript);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  function confirmTranscript() {
    if (transcript === null) return;
    if (recordTarget === "command") setCommand(transcript);
    if (recordTarget === "teach") {
      setTeachText(transcript);
      setRubric(null);
    }
    if (recordTarget === "answer") setAnswer(transcript);
    if (recordTarget === "ask") setAskQuestion(transcript);
    setTranscript(null);
    notify("Transcript confirmed. Review it, then submit when you are ready.");
  }
  async function applyCommand(text = command) {
    if (!text.trim()) return;
    setError("");
    stopAudio();
    if (/^(pause|stop)( narration| audio)?[.!]?$/i.test(text.trim())) {
      setCommand("");
      notify("Narration paused.");
      return;
    }
    if (/^repeat( this)?[.!]?$/i.test(text.trim())) {
      setCommand("");
      void speak();
      return;
    }
    if (/one step at a time/i.test(text)) {
      setMode("focus");
      setFocusIndex(0);
      setCommand("");
      notify("Focus mode is ready, one step at a time.");
      return;
    }
    if (busy) return;
    const pendingVersion = ++sceneVersion.current;
    setBusy("Updating your example");
    try {
      let result: { scene: Scene; message: string };
      if (providers.openai)
        result = await request("/scenes/action", {
          text,
          scene,
          source: lesson.source,
        });
      else result = sampleCommand(text, scene);
      if (pendingVersion !== sceneVersion.current) return;
      if (
        !validFraction(result.scene.a) ||
        (result.scene.b && !validFraction(result.scene.b))
      )
        throw new Error("This scene cannot display those values.");
      setPastScene(scene);
      setScene(result.scene);
      setSceneMessage(result.message);
      setCommand("");
      notify(result.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function evaluateTeach() {
    if (busy) return;
    if (teachText.trim().length < 12) {
      setError(
        "Tell us a little more about the idea, or use the guided example.",
      );
      return;
    }
    setError("");
    const pendingText = teachText;
    const pendingEpoch = sceneVersion.current;
    setBusy("Reading your explanation");
    try {
      if (providers.openai) {
        const data = await request<{ rows: RubricRow[] }>("/teach-back", {
          text: teachText,
          source: lesson.source,
          concept,
        });
        if (
          pendingText !== latestTeach.current ||
          pendingEpoch !== sceneVersion.current
        )
          return;
        setRubric(data.rows);
        setRubricEngine("OpenAI feedback · inspect the quoted evidence");
      } else {
        setRubric(sampleRubric(teachText, concept));
        setRubricEngine(
          "Sample rubric · phrase matching, not an AI assessment",
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function checkAnswer() {
    if (submissionLock.current || checked !== null) return;
    if (!answer.trim()) {
      setError("Choose or type an answer first.");
      return;
    }
    if (!/^\s*\d{1,3}(?:\s*\/\s*[1-9]\d{0,2})?\s*$/.test(answer)) {
      setError(
        "Use a whole number or a fraction, such as 1/2. Please check a spoken answer before submitting.",
      );
      return;
    }
    submissionLock.current = true;
    setError("");
    let correct = exactEqual(answer, question.answer);
    if (providers.backend) {
      try {
        const result = await request<{ correct: boolean }>("/practice/check", {
          question_id: question.id,
          response: answer,
        });
        correct = result.correct;
      } catch (e) {
        setError((e as Error).message);
        submissionLock.current = false;
        return;
      }
    }
    setChecked(correct);
    setAttempts((a) => [
      ...a,
      {
        id: crypto.randomUUID(),
        concept: question.concept,
        question: question.question,
        response: answer,
        correct,
        supported: hint || counter !== null,
      },
    ]);
    submissionLock.current = false;
  }
  function nextQuestion() {
    const matches = QUESTIONS.map((q, i) => ({ q, i })).filter(
      (x) => x.q.concept === concept,
    );
    const current = matches.findIndex((x) => x.i === questionIndex);
    setQuestionIndex(matches[(current + 1) % matches.length]?.i ?? 0);
    setAnswer("");
    setChecked(null);
    setHint(false);
    setCounter(null);
    setReason("");
    setError("");
  }
  function openPractice() {
    sceneVersion.current++;
    const i = QUESTIONS.findIndex((q) => q.concept === concept);
    setQuestionIndex(i < 0 ? 0 : i);
    setAnswer("");
    setChecked(null);
    setHint(false);
    setCounter(null);
    setDestination("practice");
    stopAudio();
  }
  async function ask() {
    if (!askQuestion.trim()) return;
    setError("");
    setBusy("Looking at this passage");
    try {
      if (providers.openai) {
        const data = await request<{ answer: string }>("/context-question", {
          question: askQuestion,
          selection: selectedText || activeBlock.text,
          source: lesson.source,
        });
        setAskAnswer(data.answer);
      } else {
        const text = askQuestion.toLowerCase();
        if (/denominator|bottom|हर/.test(text))
          setAskAnswer(
            "The denominator is the bottom number. It tells you how many equal parts make the whole. For example, in 3/4, four equal parts make the whole.",
          );
        else if (/numerator|top|अंश/.test(text))
          setAskAnswer(
            "The numerator counts the selected parts. In 3/4, three of the four equal parts are selected.",
          );
        else if (/equal|same|half|equivalent|why/.test(text))
          setAskAnswer(
            "Keep the whole the same. Splitting each half into two quarters changes the number of pieces, but not the amount selected: 1/2 = 2/4.",
          );
        else
          setAskAnswer(
            "This sample answers questions about the numerator, denominator, and equivalent fractions. Connect OpenAI for an answer to your specific question.",
          );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  function openAsk() {
    const freshSelection = window.getSelection()?.toString().trim() ?? "";
    const selection = freshSelection || selectedText;
    setSelectedText(
      activeBlock.text.includes(selection) && selection
        ? selection
        : activeBlock.text,
    );
    setAskQuestion("");
    setAskAnswer("");
    setAskOpen(true);
  }
  async function upload(file: File) {
    if (importLock.current) return;
    setError("");
    const fileError = pageFileError(file);
    if (fileError) {
      setError(fileError);
      return;
    }
    if (!providers.openai) {
      setError(
        "Page understanding needs your OpenAI connection. You can still explore the complete sample lesson.",
      );
      return;
    }
    importLock.current = true;
    const version = ++importVersion.current;
    // Keep existing confirmed text until the replacement page has been read.
    const preview = URL.createObjectURL(file);
    previewUrls.current.add(preview);
    setPendingUploadName(file.name);
    setBusy("Reading your page");
    try {
      const form = new FormData();
      form.append("image", file);
      const data = await request<{ document_id: string; source: string }>(
        "/documents",
        form,
      );
      if (version !== importVersion.current) { URL.revokeObjectURL(preview); return; }
      setUploadPreview(preview);
      setUploadName(file.name);
      setSourceText(data.source);
      setDocId(data.document_id);
      setImportStage("review");
      notify("Page read. Check the extracted text, then choose Build my lesson.");
      requestAnimationFrame(() => {
        document.getElementById("source-text")?.focus();
        document.getElementById("source-review")?.scrollIntoView({ block: "center", behavior: "instant" });
      });
    } catch (e) {
      URL.revokeObjectURL(preview);
      if (version === importVersion.current) setError((e as Error).message + " Your previous text has been kept. Choose the image again to retry, or paste the text.");
    } finally {
      importLock.current = false;
      setPendingUploadName("");
      setBusy("");
    }
  }
  async function loadExample(name: string) {
    if (importLock.current) return;
    importLock.current = true;
    const version = ++importVersion.current;
    setBusy("Loading example page");
    setError("");
    try {
      const response = await fetch("/testing/" + name + ".txt");
      if (!response.ok) throw new Error("Example page could not be loaded. Please try again.");
      const text = await response.text();
      if (version !== importVersion.current) return;
      setSourceText(text);
      setDocId("");
      setUploadPreview("/testing/" + name + ".png");
      setUploadName(name[0].toUpperCase() + name.slice(1) + " · example page");
      setImportStage("review");
      requestAnimationFrame(() => document.getElementById("source-text")?.focus());
    } catch (e) {
      if (version === importVersion.current) setError((e as Error).message);
    } finally {
      importLock.current = false;
      setBusy("");
    }
  }
  async function buildLesson() {
    if (importLock.current) return;
    setError("");
    const textError = sourceTextError(sourceText);
    if (textError) {
      setError(textError);
      return;
    }
    if (!providers.openai) {
      setError(
        "Connect OpenAI to build a lesson from your own text. The sample lesson works now.",
      );
      return;
    }
    importLock.current = true;
    const version = ++importVersion.current;
    setBusy("Building your lesson");
    const submittedSource = sourceText;
    try {
      const result = await request<Lesson>("/lessons", {
        document_id: docId,
        source: submittedSource,
      });
      if (version !== importVersion.current) return;
      if (latestSource.current !== submittedSource)
        throw new Error(
          "Your source changed while the lesson was building. Please build again from the corrected text.",
        );
      setLesson(result);
      setLessonImage(uploadPreview);
      setConcept(result.general ? "equivalence" : result.blocks[0].concept);
      setDestination("explore");
      setAttempts([]);
      setSupportCount(0);
      setLanguage("en");
      setFocusIndex(0);
      setRubric(null);
      setScene({
        a: { n: 1, d: 2 },
        b: { n: 2, d: 4 },
        representation: "bars",
      });
      navigate("studio");
    } catch (e) {
      if (version === importVersion.current) setError((e as Error).message);
    } finally {
      importLock.current = false;
      setBusy("");
    }
  }
  const countCorrect = attempts.filter((a) => a.correct).length;
  return (
    <div
      className={`${audioPlaying ? "is-speaking " : ""}${reduced ? "reduce-motion " : ""}${contrast ? "high-contrast " : ""}${spacing ? "wide-spacing " : ""}`}
      style={{ "--lesson-font": `${fontSize}px` } as React.CSSProperties}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className={`site-header ${view !== "home" ? "app-header" : ""}`}>
        <div className="header-inner">
          <Brand onClick={() => navigate("home")} />
          {view === "home" ? (
            <>
              <nav className="desktop-nav">
                <a
                  href="#how-it-works"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("how-it-works")?.scrollIntoView({
                      behavior: reduced ? "instant" : "smooth",
                    });
                  }}
                >
                  How it works
                </a>
                <a
                  href="#made-for-you"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("made-for-you")?.scrollIntoView({
                      behavior: reduced ? "instant" : "smooth",
                    });
                  }}
                >
                  Made for you
                </a>
                <button onClick={() => setInfoOpen(true)}>
                  About the project <ArrowUpRight size={14} />
                </button>
              </nav>
              <div className="header-actions">
                <button
                  className="icon-btn"
                  aria-label="Accessibility preferences"
                  onClick={() => setSettings(true)}
                >
                  <SlidersHorizontal size={19} />
                </button>
                <button
                  className="btn btn-small"
                  onClick={() => navigate("studio")}
                >
                  Try a lesson <ArrowUpRight size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="header-breadcrumb">
                <span className="breadcrumb-divider" />
                Your learning space <ChevronRight size={14} />
                <span>
                  {view === "import"
                    ? "Bring a page"
                    : view === "summary"
                      ? "Your recap"
                      : (lesson.subject ?? "Fractions")}
                </span>
              </span>
              <div className="header-actions">
                <button
                  className="text-btn language-trigger"
                  onClick={() => {
                    stopAudio();
                    if (lesson.general) {
                      notify(
                        "Uploaded lessons currently use English. The Hindi preview is available for the authored sample.",
                      );
                      return;
                    }
                    setFocusIndex(0);
                    setLanguage((l) => (l === "en" ? "hi" : "en"));
                    notify(
                      "Hindi is an authored sample preview awaiting fluent language review.",
                    );
                  }}
                >
                  <Globe size={16} />
                  {language === "en" ? "English" : "हिन्दी"}
                  <ChevronDown size={12} />
                </button>
                <button
                  className="icon-btn"
                  aria-label="Accessibility preferences"
                  onClick={() => setSettings(true)}
                >
                  <SlidersHorizontal size={19} />
                </button>
                <button
                  className="text-btn"
                  onClick={() =>
                    navigate(view === "summary" || view === "import" ? "studio" : "summary")
                  }
                >
                  {view === "import" ? lesson.sample ? "Try the sample" : "Back to lesson" : view === "summary" ? "Back to lesson" : "My recap"}{" "}
                  <ArrowUpRight size={15} />
                </button>
              </div>
            </>
          )}
          <button
            className="mobile-menu icon-btn"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu size={21} />
          </button>
        </div>
        {menuOpen && (
          <nav className="mobile-nav" id="mobile-navigation" aria-label="Main navigation">
            <button onClick={() => navigate("home")}>Home</button>
            <button onClick={() => navigate("import")}>Upload a page</button>
            <button onClick={() => navigate("studio")}>My lesson</button>
            <button onClick={() => navigate("summary")}>Learning recap</button>
            <button
              onClick={() => {
                setSettings(true);
                setMenuOpen(false);
              }}
            >
              Accessibility preferences
            </button>
          </nav>
        )}
      </header>

      {view === "home" && (
        <main id="main-content">
          <section className="hero wrap">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="little-line" /> EVERY MIND DESERVES A WAY IN
              </div>
              <h1>
                Your textbook.
                <br />
                Your <em>way in.</em>
                <svg
                  className="headline-underline"
                  viewBox="0 0 265 14"
                  aria-hidden="true"
                >
                  <path
                    d="M3 9 Q120 -1 260 6 M17 13 Q140 5 243 9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </svg>
              </h1>
              <p className="hero-description">
                Some ideas click when you see them.
                <br />
                Others, when you hear them. Find your way
                <br className="desktop-break" /> into learning—with a lesson
                that meets you there.
              </p>
              <div className="hero-buttons">
                <button className="btn" onClick={() => navigate("studio")}>
                  Find your way in <ArrowUpRight size={19} />
                </button>
                <button
                  className="text-btn upload-link"
                  onClick={() => navigate("import")}
                >
                  <Upload size={17} /> Bring your own page
                </button>
              </div>
              <div className="hero-footnote">
                <span className="tiny-avatars">
                  <span>Aa</span>
                  <Headphones size={15} />
                  <MousePointer2 size={15} />
                </span>
                <span>Read it. Hear it. Make it make sense.</span>
              </div>
            </div>
            <div className="hero-art">
              <div className="art-caption">
                <span className="status-dot" /> A LITTLE CURIOSITY GOES A LONG
                WAY
              </div>
              <AnimatedBook reduced={reduced} />
              <div className="hero-note">
                <span className="note-icon">
                  <Leaf size={17} />
                </span>
                <div>
                  A different way to learn.
                  <br />
                  <strong>The same possibility to grow.</strong>
                </div>
              </div>
              <span className="art-bottom-label">
                OPEN A PAGE. OPEN A POSSIBILITY.
              </span>
            </div>
          </section>
          <div className="principle-strip">
            <div className="wrap strip-inner">
              <span>
                <BookOpen size={17} /> Your material, made approachable
              </span>
              <span>
                <Headphones size={17} /> A voice when you need one
              </span>
              <span>
                <Accessibility size={18} /> Your pace. Your preferences.
              </span>
              <span className="strip-last">
                A little less friction. A lot more <em>possibility.</em>
              </span>
            </div>
          </div>
          <section className="try-section wrap" id="how-it-works">
            <div className="section-top">
              <div>
                <div className="eyebrow">
                  FROM “I DON'T GET IT” TO “OH, I SEE.”
                </div>
                <h2>
                  A page becomes
                  <br />a <em>possibility.</em>
                </h2>
              </div>
              <p>
                Take an ordinary textbook page.
                <br />
                Give it a voice, a little space, and a new perspective.
                <br />
                Here's what that can look like.
              </p>
            </div>
            <div className="transformation">
              <div className="original-preview">
                <div className="preview-label">
                  <span className="step-index">01</span> THE PAGE YOU START WITH
                </div>
                <img
                  src="/images/sample-page.png"
                  alt="Team-authored worksheet explaining equal parts, equivalent fractions, and addition"
                  loading="lazy"
                />
                <span className="paper-footer">
                  A familiar page. A fresh start.
                </span>
              </div>
              <div className="transform-arrow">
                <ArrowRight size={24} />
              </div>
              <div className="lesson-preview">
                <div className="preview-label">
                  <span className="step-index">02</span> A WAY THAT WORKS FOR
                  YOU
                </div>
                <div className="preview-mode">
                  <span>
                    <Eye size={14} /> Explore
                  </span>
                  <span>
                    <Volume2 size={14} /> Listen
                  </span>
                  <span>
                    <MousePointer2 size={14} /> Try it
                  </span>
                </div>
                <h3>
                  Different names.
                  <br />
                  <em>Same amount.</em>
                </h3>
                <p>
                  One half. Two quarters.
                  <br />
                  Let's see what stays the same.
                </p>
                <FractionVisual
                  small
                  scene={{
                    a: { n: 1, d: 2 },
                    b: { n: 2, d: 4 },
                    representation: "bars",
                  }}
                />
                <button className="text-btn" onClick={() => navigate("studio")}>
                  Explore this lesson <ArrowUpRight size={17} />
                </button>
              </div>
            </div>
          </section>
          <section className="ways-section wrap" id="made-for-you">
            <div className="section-top">
              <div>
                <div className="eyebrow">MORE THAN ONE WAY TO UNDERSTAND</div>
                <h2>
                  Make the idea
                  <br />
                  <em>your own.</em>
                </h2>
              </div>
              <p>
                Ask. Explore. Explain it back.
                <br />
                Learning is something you get to take part in.
              </p>
            </div>
            <div className="ways-grid">
              <article>
                <span className="feature-glyph glyph-green">
                  <Mic size={27} />
                </span>
                <span className="feature-no">01 / EXPLORE</span>
                <h3>Talk to the lesson.</h3>
                <p>
                  “Show me two quarters.” Change the example with your words and
                  watch the idea take shape.
                </p>
                <button
                  className="text-btn"
                  onClick={() => {
                    setDestination("explore");
                    navigate("studio");
                  }}
                >
                  See it in action <ArrowUpRight size={15} />
                </button>
              </article>
              <article>
                <span className="feature-glyph glyph-orange">
                  <MessageCircle size={27} />
                </span>
                <span className="feature-no">02 / EXPLAIN</span>
                <h3>Teach it back.</h3>
                <p>
                  Put the idea into your own words. Find out what you've
                  explained and what could use another look.
                </p>
                <button
                  className="text-btn"
                  onClick={() => {
                    setDestination("explain");
                    navigate("studio");
                  }}
                >
                  Find your words <ArrowUpRight size={15} />
                </button>
              </article>
              <article>
                <span className="feature-glyph glyph-yellow">
                  <RotateCcw size={27} />
                </span>
                <span className="feature-no">03 / UNDERSTAND</span>
                <h3>Let mistakes make sense.</h3>
                <p>
                  A different answer is a place to begin. See why it doesn't
                  fit, then give a fresh question a try.
                </p>
                <button
                  className="text-btn"
                  onClick={() => {
                    setConcept("addition");
                    setQuestionIndex(2);
                    setDestination("practice");
                    navigate("studio");
                  }}
                >
                  Try a question <ArrowUpRight size={15} />
                </button>
              </article>
            </div>
          </section>
          <section className="human-section wrap">
            <div className="human-photo">
              <img
                src="/images/learning-desk.webp"
                alt="Illustrative generated photograph of an adult learner writing beside an open textbook in a sunlit library"
                loading="lazy"
              />
              <span>ROOM FOR YOUR WAY OF LEARNING.</span>
            </div>
            <div className="human-copy">
              <div className="eyebrow">BUILT AROUND YOU</div>
              <h2>
                Learning doesn't
                <br />
                come in <em>one size.</em>
              </h2>
              <p>
                A little more space. A slower explanation. A voice alongside the
                words. StudyLens gives you choices, without asking you to fit a
                label.
              </p>
              <div className="preference-tags">
                <span>
                  <Type size={15} /> Readable text
                </span>
                <span>
                  <Volume2 size={15} /> Read aloud
                </span>
                <span>
                  <Globe size={15} /> Language choices
                </span>
                <span>
                  <SlidersHorizontal size={15} /> Less motion
                </span>
              </div>
              <button className="text-btn" onClick={() => setSettings(true)}>
                Make yourself comfortable <ArrowUpRight size={17} />
              </button>
            </div>
          </section>
          <section className="closing-section wrap">
            <span className="eyebrow">LET'S START WITH ONE PAGE</span>
            <h2>
              A small “I get it”
              <br />
              can open <em>a whole world.</em>
            </h2>
            <button className="btn" onClick={() => navigate("studio")}>
              Open your first lesson <ArrowUpRight size={18} />
            </button>
            <span className="closing-note">
              No account. No rush. Just a little curiosity.
            </span>
          </section>
        </main>
      )}

      {view === "studio" && !lesson.general && (
        <main id="main-content" className="studio-shell">
          <aside className={`lesson-sidebar ${menuOpen ? "open" : ""}`}>
            <button className="back-link" onClick={() => navigate("home")}>
              <ArrowLeft size={15} /> Back to your pages
            </button>
            <button className="btn sidebar-upload" onClick={() => navigate("import")}>
              <Upload size={18} /> Upload a new page
            </button>
            <div className="lesson-cover">
              <img src="/images/book-garden.webp" alt="" />
              <span>YOUR FIRST EXPLORATION</span>
              <h2>
                A whole new way
                <br />
                to see fractions.
              </h2>
            </div>
            <div className="outline-label">YOUR WAY THROUGH</div>
            <nav className="lesson-outline" aria-label="Lesson outline">
              {CONCEPTS.filter(
                (c) =>
                  lesson.sample ||
                  lesson.blocks.some((b) => b.concept === c.id),
              ).map((c, i) => (
                <button
                  key={c.id}
                  className={concept === c.id ? "active" : ""}
                  onClick={() => chooseConcept(c.id)}
                >
                  <span className="outline-num">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <strong>{c.label}</strong>
                    <small>{c.subtitle}</small>
                  </span>
                  {concept === c.id && <span className="outline-dot" />}
                </button>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <Leaf size={20} />
              <p>
                Take your time.
                <br />
                Understanding isn't a race.
              </p>
            </div>
          </aside>
          <section className="studio-main">
            <button className="btn mobile-upload" onClick={() => navigate("import")}><Upload size={18} /> Upload a new page</button>
            <div className="studio-topline">
              <span className="eyebrow">
                <span className="status-dot" />
                {lesson.sample
                  ? "SAMPLE LESSON"
                  : "YOUR SOURCE-LINKED LESSON"}
              </span>
              <button
                className="source-toggle text-btn"
                onClick={() => setSourceOpen(true)}
              >
                <FileText size={15} /> Original page <ArrowUpRight size={14} />
              </button>
            </div>
            <label className="mobile-concept-select">
              YOUR WAY THROUGH
              <select
                aria-label="Choose a lesson concept"
                value={concept}
                onChange={(e) => chooseConcept(e.target.value as Concept)}
              >
                {CONCEPTS.filter(
                  (c) =>
                    lesson.sample ||
                    lesson.blocks.some((b) => b.concept === c.id),
                ).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="studio-heading">
              <div>
                <span className="chapter-label">
                  CHAPTER{" "}
                  {String(
                    CONCEPTS.findIndex((c) => c.id === concept) + 1,
                  ).padStart(2, "0")}{" "}
                  · FRACTIONS
                </span>
                <h1>{translated?.title ?? activeBlock.title}</h1>
              </div>
              <button
                className="round-play"
                onClick={() => void speak()}
                aria-label={
                  audioPlaying
                    ? "Pause narration"
                    : "Read this explanation aloud"
                }
              >
                {audioPlaying ? <Pause size={20} /> : <Volume2 size={20} />}
              </button>
            </div>
            <div
              className="destination-tabs"
              role="tablist"
              aria-label="Learning activity"
            >
              {(["explore", "explain", "practice"] as const).map((d, i) => (
                <button
                  id={`tab-${d}`}
                  role="tab"
                  aria-controls={`panel-${d}`}
                  aria-selected={destination === d}
                  tabIndex={destination === d ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                      e.preventDefault();
                      const ds = ["explore", "explain", "practice"] as const;
                      const n = (i + (e.key === "ArrowRight" ? 1 : 2)) % 3;
                      setDestination(ds[n]);
                      document.getElementById(`tab-${ds[n]}`)?.focus();
                    }
                  }}
                  className={destination === d ? "active" : ""}
                  key={d}
                  onClick={() => {
                    if (d === "practice") openPractice();
                    else setDestination(d);
                    setError("");
                    stopAudio();
                  }}
                >
                  {i === 0 ? (
                    <MousePointer2 size={16} />
                  ) : i === 1 ? (
                    <MessageCircle size={16} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  <span>
                    {d === "explore"
                      ? "Explore the idea"
                      : d === "explain"
                        ? "Teach it back"
                        : "Give it a try"}
                  </span>
                </button>
              ))}
            </div>
            {language === "hi" && (
              <div className="inline-note">
                <Info size={16} /> Hindi authored sample preview · awaiting
                fluent language review.{" "}
                {lesson.sample
                  ? ""
                  : "This uploaded lesson currently stays in English."}
              </div>
            )}
            <div
              className="activity-panel"
              id={`panel-${destination}`}
              role="tabpanel"
              aria-labelledby={`tab-${destination}`}
            >
              {destination === "explore" && (
                <>
                  <div
                    className={`explanation lesson-reading ${mode === "focus" ? "focus-reading" : ""}`}
                    onMouseUp={() => {
                      const selection = window
                        .getSelection()
                        ?.toString()
                        .trim();
                      if (selection && activeBlock.text.includes(selection))
                        setSelectedText(selection);
                    }}
                  >
                    <div className="reading-toolbar">
                      <div className="mode-control">
                        {(["read", "focus", "listen"] as const).map((m) => (
                          <button
                            key={m}
                            className={mode === m ? "active" : ""}
                            onClick={() => {
                              setMode(m);
                              setFocusIndex(0);
                              if (m === "listen") void speak();
                              else stopAudio();
                            }}
                          >
                            {m === "read" ? (
                              <BookOpen size={14} />
                            ) : m === "focus" ? (
                              <Eye size={14} />
                            ) : (
                              <Headphones size={14} />
                            )}{" "}
                            {m[0].toUpperCase() + m.slice(1)}
                          </button>
                        ))}
                      </div>
                      <button
                        className="text-btn ask-trigger"
                        onClick={openAsk}
                      >
                        <MessageCircle size={14} /> Ask about this
                      </button>
                    </div>
                    <p>
                      {mode === "focus"
                        ? focusSentences[
                            Math.min(focusIndex, focusSentences.length - 1)
                          ]
                        : (translated?.text ?? activeBlock.text)}
                    </p>
                    {mode === "focus" && (
                      <div className="focus-steps">
                        <button
                          className="text-btn"
                          disabled={focusIndex === 0}
                          onClick={() =>
                            setFocusIndex((i) => Math.max(0, i - 1))
                          }
                        >
                          <ChevronLeft size={14} /> Previous
                        </button>
                        <span>
                          Step {focusIndex + 1} of {focusSentences.length}
                        </span>
                        <button
                          className="text-btn"
                          disabled={focusIndex >= focusSentences.length - 1}
                          onClick={() => setFocusIndex((i) => i + 1)}
                        >
                          Next <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                    {mode === "focus" && (
                      <button
                        className="text-btn"
                        onClick={() => {
                          setMode("read");
                          notify("The complete explanation is now visible.");
                        }}
                      >
                        Read the full explanation <ArrowRight size={14} />
                      </button>
                    )}
                    <button
                      className="source-citation"
                      onClick={() => {
                        setSourceQuote(activeBlock.source_quote ?? "");
                        setSourceOpen(true);
                      }}
                    >
                      <FileText size={12} /> From your page ·{" "}
                      {activeBlock.id.toUpperCase()} <ArrowUpRight size={11} />
                    </button>
                  </div>
                  <div className="scene-card">
                    <div className="scene-top">
                      <span className="eyebrow">
                        A LITTLE PICTURE OF THE IDEA
                      </span>
                      <div className="scene-buttons">
                        <button
                          className={
                            scene.representation === "bars" ? "active" : ""
                          }
                          onClick={() => {
                            sceneVersion.current++;
                            setScene((s) => ({ ...s, representation: "bars" }));
                          }}
                        >
                          Equal parts
                        </button>
                        <button
                          className={
                            scene.representation === "line" ? "active" : ""
                          }
                          onClick={() => {
                            sceneVersion.current++;
                            setScene((s) => ({ ...s, representation: "line" }));
                          }}
                        >
                          Number line
                        </button>
                      </div>
                    </div>
                    <FractionVisual scene={scene} />
                    <div className="scene-demonstration">
                      <p>See the same amount become smaller, equal pieces.</p>
                      <button
                        className="text-btn"
                        onClick={() => void applyCommand("split the parts")}
                        disabled={!!busy || scene.a.d > 6}
                      >
                        <Play size={14} /> Show the change
                      </button>
                    </div>
                    <div className="scene-live-caption" role="status">
                      {sceneMessage}
                    </div>
                    <div className="scene-caption">
                      <span>
                        <MousePointer2 size={13} /> Change the parts. See what
                        happens.
                      </span>
                      <button
                        className="text-btn"
                        disabled={!pastScene}
                        onClick={() => {
                          if (pastScene) {
                            sceneVersion.current++;
                            setScene(pastScene);
                            setPastScene(null);
                            setSceneMessage("Previous example restored.");
                            notify("Previous example restored.");
                          }
                        }}
                      >
                        <RotateCcw size={13} /> Undo
                      </button>
                    </div>
                    <div className="fraction-controls">
                      <span>Your first fraction</span>
                      <div>
                        <label>
                          Selected{" "}
                          <input
                            aria-label="Selected parts"
                            type="number"
                            min="0"
                            max={scene.a.d}
                            value={scene.a.n}
                            onChange={(e) => {
                              const n = +e.target.value;
                              if (validFraction({ ...scene.a, n }))
                                setScene((s) => ({ ...s, a: { ...s.a, n } }));
                            }}
                          />
                        </label>
                        <span>/</span>
                        <label>
                          Total parts{" "}
                          <input
                            aria-label="Total equal parts"
                            type="number"
                            min="1"
                            max="12"
                            value={scene.a.d}
                            onChange={(e) => {
                              const d = +e.target.value;
                              if (validFraction({ ...scene.a, d }))
                                setScene((s) => ({ ...s, a: { ...s.a, d } }));
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                  <form
                    className="command-box"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void applyCommand();
                    }}
                  >
                    <div className="command-input">
                      <span className="command-icon">
                        <MessageCircle size={20} />
                      </span>
                      <input
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        aria-label="Ask to change the example"
                        placeholder="Ask to change the example…"
                      />
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Speak a scene request"
                        onClick={() => void startRecording("command")}
                      >
                        <Mic size={18} />
                      </button>
                      <button
                        className="command-send"
                        aria-label="Apply scene request"
                        disabled={!!busy}
                      >
                        <ArrowRight size={19} />
                      </button>
                    </div>
                    <div className="command-suggestions">
                      <span>TRY</span>
                      {[
                        "Compare 1/2 and 2/4",
                        "Show 3/4",
                        "Split the parts",
                      ].map((t) => (
                        <button
                          type="button"
                          key={t}
                          onClick={() => void applyCommand(t)}
                        >
                          {t} <ArrowUpRight size={11} />
                        </button>
                      ))}
                    </div>
                  </form>
                  <div className="activity-next">
                    <span>Getting a feel for it?</span>
                    <button
                      className="btn btn-small"
                      onClick={() => {
                        setDestination("explain");
                        stopAudio();
                      }}
                    >
                      Put it in your words <ArrowRight size={16} />
                    </button>
                  </div>
                </>
              )}
              {destination === "explain" && (
                <div className="teach-panel">
                  <div className="activity-intro">
                    <span className="small-illustration">
                      <MessageCircle size={32} />
                    </span>
                    <h2>
                      Your words.
                      <br />
                      <em>Your understanding.</em>
                    </h2>
                    <p>
                      {teachPrompt.question}
                      <br />
                      Explain it as if you're telling a friend.
                    </p>
                  </div>
                  <label className="field-label" htmlFor="teach-text">
                    YOUR EXPLANATION
                  </label>
                  <textarea
                    id="teach-text"
                    placeholder="I think they're the same because…"
                    value={teachText}
                    onChange={(e) => {
                      setTeachText(e.target.value);
                      setRubric(null);
                    }}
                    maxLength={2000}
                  />
                  <div className="textarea-actions">
                    <button
                      className="text-btn"
                      onClick={() => void startRecording("teach")}
                    >
                      <Mic size={16} /> Say it instead
                    </button>
                    <span>No perfect words needed.</span>
                  </div>
                  <div className="teach-actions">
                    <button
                      className="btn"
                      disabled={!!busy}
                      onClick={() => void evaluateTeach()}
                    >
                      Look at my explanation <ArrowRight size={16} />
                    </button>
                    <button
                      className="text-btn"
                      onClick={() => {
                        setTeachText(teachPrompt.example);
                        setRubric(null);
                      }}
                    >
                      Use a sample explanation
                    </button>
                  </div>
                  {rubric && (
                    <section className="rubric-section">
                      <div className="eyebrow">LET'S LOOK AT THE IDEA</div>
                      <p className="engine-label">{rubricEngine}</p>
                      {rubric.map((r, i) => (
                        <div
                          className={`rubric-row ${r.status === "supported" ? "supported" : ""}`}
                          key={i}
                        >
                          {r.status === "supported" ? (
                            <CheckCircle2 size={21} />
                          ) : (
                            <MessageCircle size={21} />
                          )}
                          <div>
                            <strong>{r.criterion}</strong>
                            {r.quote && <blockquote>“{r.quote}”</blockquote>}
                            <p>
                              {r.status === "supported"
                                ? "You mentioned this in your explanation."
                                : r.status === "not_mentioned"
                                  ? "This was not mentioned yet."
                                  : "Let’s look more closely."}{" "}
                              {r.feedback}
                            </p>
                          </div>
                          <span className="rubric-status">
                            {r.status.replaceAll("_", " ")}
                          </span>
                        </div>
                      ))}
                      <button className="btn btn-small" onClick={openPractice}>
                        Try the idea on a fresh question{" "}
                        <ArrowRight size={15} />
                      </button>
                    </section>
                  )}
                </div>
              )}
              {destination === "practice" && (
                <div className="practice-panel">
                  <div className="practice-meta">
                    <span className="eyebrow">ONE IDEA. A FRESH TRY.</span>
                    <span>
                      {attempts.length}{" "}
                      {attempts.length === 1 ? "attempt" : "attempts"} so far
                    </span>
                  </div>
                  <h2>{question.question}</h2>
                  <fieldset
                    disabled={checked !== null}
                    className="answer-choices"
                  >
                    <legend className="sr-only">Choose an answer</legend>
                    {question.choices.map((a, i) => (
                      <label
                        className={`${answer === a ? "selected" : ""} ${checked !== null && a === question.answer ? "correct" : ""}`}
                        key={a}
                      >
                        <input
                          type="radio"
                          name="answer"
                          value={a}
                          checked={answer === a}
                          onChange={() => setAnswer(a)}
                        />
                        <span className="choice-letter">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <strong>{a}</strong>
                        {answer === a && <Check size={18} />}
                      </label>
                    ))}
                  </fieldset>
                  <div className="typed-answer">
                    <label htmlFor="typed-answer">Or write your answer</label>
                    <input
                      id="typed-answer"
                      disabled={checked !== null}
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="e.g. 2/4"
                    />
                    <button
                      className="icon-btn"
                      aria-label="Speak your answer"
                      disabled={checked !== null}
                      onClick={() => void startRecording("answer")}
                    >
                      <Mic size={17} />
                    </button>
                  </div>
                  {checked === null ? (
                    <div className="practice-actions">
                      <button
                        className="btn"
                        onClick={() => void checkAnswer()}
                      >
                        Check my answer <ArrowRight size={16} />
                      </button>
                      <button
                        className="text-btn"
                        onClick={() => {
                          setHint(true);
                          setSupportCount((s) => s + 1);
                        }}
                      >
                        A little hint?
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`answer-feedback ${checked ? "success" : "try-again"}`}
                    >
                      <div>
                        {checked ? (
                          <CheckCircle2 size={23} />
                        ) : (
                          <MessageCircle size={23} />
                        )}
                        <h3>
                          {checked
                            ? "That fits the idea."
                            : "Let's look at that another way."}
                        </h3>
                      </div>
                      <p>{question.explanation}</p>
                      {!checked && question.id === "q3" && (
                        <>
                          <p>
                            Were you adding both the top and bottom numbers?
                          </p>
                          <div className="reason-buttons">
                            <button
                              className="btn btn-small"
                              onClick={() => {
                                setReason("added_both");
                                setCounter(0);
                                setHint(true);
                                setSupportCount((s) => s + 1);
                              }}
                            >
                              Yes, show me why
                            </button>
                            <button
                              className="text-btn"
                              onClick={() => {
                                setReason("other");
                                setCounter(2);
                                setHint(true);
                              }}
                            >
                              Show a worked example
                            </button>
                          </div>
                        </>
                      )}
                      <button className="text-btn" onClick={nextQuestion}>
                        Try a fresh question <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                  {hint && checked === null && (
                    <div className="hint-box">
                      <Leaf size={19} />
                      <p>
                        Keep the whole the same. Think about the size of each
                        equal part before you count how many are selected.
                      </p>
                    </div>
                  )}
                  {counter !== null && (
                    <section className="counterexample">
                      <div className="eyebrow">
                        {reason === "added_both"
                          ? "WHY THAT ANSWER DOES NOT FIT"
                          : "A WORKED EXAMPLE"}{" "}
                        · STEP {counter + 1} OF 3
                      </div>
                      <h3>
                        {
                          [
                            "Start with two halves.",
                            "Put the halves together.",
                            "Compare a whole with two quarters.",
                          ][counter]
                        }
                      </h3>
                      <FractionVisual
                        scene={
                          counter === 0
                            ? {
                                a: { n: 1, d: 2 },
                                b: { n: 1, d: 2 },
                                representation: "bars",
                              }
                            : counter === 1
                              ? {
                                  a: { n: 2, d: 2 },
                                  b: null,
                                  representation: "bars",
                                }
                              : {
                                  a: { n: 2, d: 2 },
                                  b: { n: 2, d: 4 },
                                  representation: "bars",
                                }
                        }
                      />
                      <p>
                        {
                          [
                            "Each selected half comes from an equal-sized whole.",
                            "One half plus one half covers the whole: 2/2 = 1.",
                            "2/4 is only half. Adding denominators changed the piece size, so it does not name the sum.",
                          ][counter]
                        }
                      </p>
                      <div className="step-controls">
                        <button
                          className="text-btn"
                          disabled={counter === 0}
                          onClick={() =>
                            setCounter((c) => Math.max(0, (c ?? 0) - 1))
                          }
                        >
                          <ChevronLeft size={16} /> Previous
                        </button>
                        <button
                          className="text-btn"
                          onClick={() =>
                            counter < 2
                              ? setCounter(counter + 1)
                              : nextQuestion()
                          }
                        >
                          {counter < 2 ? "Next step" : "Fresh question"}{" "}
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
            <div className="narration-note">
              <Volume2 size={12} />
              {providers.gnani
                ? "AI-generated narration · Gnani"
                : "Optional device narration · voice depends on your browser"}
            </div>
            <div className="studio-footer">
              <span>
                <Leaf size={13} /> A little progress is still progress.
              </span>
              <span>
                {providers.gnani
                  ? "Gnani voice connected"
                  : "Device narration available"}{" "}
                ·{" "}
                {lesson.sample
                  ? "Local sample practice"
                  : "Source-linked AI lesson"}
              </span>
            </div>
          </section>
        </main>
      )}

      {lesson.general && (view === "studio" || view === "summary") && (
        <GeneralStudio
          key={lesson.id}
          lesson={lesson as unknown as GeneralLesson}
          sourceImage={lessonImage}
          recap={view === "summary"}
          providers={providers}
          onNavigate={navigate}
          onError={setError}
        />
      )}
      {view === "import" && (
        <main id="main-content" className="import-page wrap page-transition">
          <button className="back-link" onClick={() => navigate(lesson.sample ? "home" : "studio")}>
            <ArrowLeft size={15} /> {lesson.sample ? "Back to home" : "Back to your lesson"}
          </button>
          <div className="page-heading">
            <div className="eyebrow">LET'S START WITH YOUR MATERIAL</div>
            <h1>
              Your page. <em>A clearer explanation.</em>
            </h1>
            <p>
              Bring a textbook page from any subject: science, history,
              geography, mathematics, and more.
              <br />
              Upload an image or paste the text. Check it, then get explanations, a visual walkthrough, and practice.
            </p>
          </div>
          <ol className="import-steps" aria-label="Create your lesson">
            <li className={!sourceText ? "current" : "complete"}><span>1</span><div><strong>Add a page</strong><small>Upload an image or paste text</small></div></li>
            <li className={sourceText ? "current" : ""}><span>2</span><div><strong>Check the text</strong><small>Fix any names, terms or numbers</small></div></li>
            <li><span>3</span><div><strong>Explore your lesson</strong><small>Read, see, listen and practise</small></div></li>
          </ol>
          {error && <div className="import-feedback" role="note"><AlertCircle size={19} /><p>{error}</p></div>}
          <div className="import-grid">
            <div
              className={`upload-surface ${dragging ? "is-dragging" : ""}`}
              aria-busy={busy === "Reading your page"}
              onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (busy) return;
                if (e.dataTransfer.files.length > 1) { setError("Choose one page at a time. Drop a single JPG or PNG image."); return; }
                if (e.dataTransfer.files[0])
                  void upload(e.dataTransfer.files[0]);
              }}
            >
              {uploadPreview ? (
                <img src={uploadPreview} alt="Your uploaded source page" />
              ) : (
                <>
                  <div className="upload-art">
                    <FileText size={55} strokeWidth={1} />
                    <span>
                      <Plus size={20} />
                    </span>
                  </div>
                  <h3>Upload your textbook page</h3>
                  <p>Drag one image here, or choose a file below. We’ll read its text automatically.</p>
                </>
              )}
              <input
                ref={fileInput}
                className="sr-only"
                type="file"
                aria-label="Upload one textbook page image"
                aria-describedby="upload-help"
                disabled={!!busy}
                tabIndex={-1}
                accept="image/png,image/jpeg"
                onChange={(e) => {
                  if (e.target.files?.[0]) void upload(e.target.files[0]);
                  e.target.value = "";
                }}
              />
              <button
                className="btn"
                disabled={!!busy}
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={17} />{" "}
                {busy === "Reading your page" ? "Reading your image…" : uploadPreview ? "Replace page image" : "Choose a page image"}
              </button>
              {(pendingUploadName || uploadName) && <p className="selected-page-name">{pendingUploadName ? "Reading: " : "Selected: "}{pendingUploadName || uploadName}</p>}
              <span className="file-note" id="upload-help">
                JPG or PNG · One page · Up to 8 MB. For a PDF, screenshot one page.
              </span>
              <p className="image-quality-tip">Use a well-lit, straight-on photo with all the text visible.</p>
              <button className="text-btn paste-shortcut" disabled={!!busy} onClick={() => document.getElementById("source-text")?.focus()}>Prefer to paste text? <ArrowRight size={15} /></button>
              <p className="privacy-note">
                Your page is sent to OpenAI for understanding.
                <br />
                Please leave out names and personal information.
              </p>
            </div>
            <div className="source-review" id="source-review" aria-busy={!!busy}>
              <div className="eyebrow">
                {importStage === "review"
                  ? "STEP 2 · CHECK THE EXTRACTED TEXT"
                  : "OR PASTE YOUR PAGE TEXT"}
              </div>
              <h3>
                {importStage === "review" ? "Is this what your page says?" : "Already have the words?"}
              </h3>
              <label className="field-label" htmlFor="source-text">
                SOURCE TEXT
              </label>
              <textarea
                id="source-text"
                value={sourceText}
                disabled={!!busy}
                aria-describedby="source-text-help source-text-count"
                onChange={(e) => setSourceText(e.target.value)}
                maxLength={6000}
                placeholder="Paste your textbook text here, or upload a page from any subject…"
              />
              <p className="muted" id="source-text-help">
                Check names, dates, terms, and numbers. Corrections become the
                source for your lesson.
              </p>
              <p className="source-text-count" id="source-text-count">{sourceText.length.toLocaleString()} / 6,000 characters{sourceText.trim().length < 20 ? " · At least 20 needed" : " · Ready to build"}</p>
              {busy && <div className="import-progress" role="status"><LoaderCircle size={18} className="spin" /><div><strong>{busy}…</strong><p>{busy === "Reading your page" ? "Extracting the words. You’ll check them before continuing." : "Creating short explanations and practice from your confirmed text."}</p></div></div>}
              <button
                className="btn"
                disabled={!!busy || !!sourceTextError(sourceText)}
                onClick={() => void buildLesson()}
              >
                {busy === "Building your lesson" ? "Building your lesson…" : "Build my lesson"} <ArrowRight size={16} />
              </button>
              <div className="general-test-pages">
                <span className="eyebrow">NO PAGE HANDY? LOAD AN EXAMPLE</span>
                {["photosynthesis", "history", "geography", "algebra"].map(
                  (name) => (
                    <button
                      className="text-btn"
                      key={name}
                      disabled={!!busy}
                      onClick={() => void loadExample(name)}
                    >
                      {name[0].toUpperCase() + name.slice(1)}{" "}
                      <ArrowUpRight size={13} />
                    </button>
                  ),
                )}
              </div>
              <div className="sample-alternative">
                <img
                  src="/images/sample-page.png"
                  alt="Sample worksheet preview"
                />
                <div>
                  <strong>Just curious?</strong>
                  <p>Try our ready-to-explore sample.</p>
                  <button
                    className="text-btn"
                    disabled={!!busy}
                    onClick={() => {
                      setLesson(SAMPLE);
                      navigate("studio");
                    }}
                  >
                    Open the fractions lesson <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {view === "summary" && !lesson.general && (
        <main id="main-content" className="summary-page wrap page-transition">
          <button className="back-link" onClick={() => navigate("studio")}>
            <ArrowLeft size={15} /> Back to your lesson
          </button>
          <div className="summary-header">
            <div>
              <span className="eyebrow">YOUR LEARNING JOURNAL</span>
              <h1>
                A little more
                <br />
                <em>understanding.</em>
              </h1>
              <p>Here's what you actually worked through today.</p>
            </div>
            <img src="/images/book-garden.webp" alt="" />
          </div>
          <div className="recap-stats">
            <div>
              <span>{attempts.length}</span>
              <p>Questions attempted</p>
            </div>
            <div>
              <span>
                {countCorrect}
                <small> / {attempts.length}</small>
              </span>
              <p>Answers that fit</p>
            </div>
            <div>
              <span>{supportCount}</span>
              <p>Support requests</p>
            </div>
          </div>
          <section className="recap-section">
            <h2>Your trail through the ideas.</h2>
            {attempts.length === 0 ? (
              <div className="empty-recap">
                <BookOpen size={30} />
                <h3>Your first page is waiting.</h3>
                <p>Try a question and your actual work will appear here.</p>
                <button
                  className="btn btn-small"
                  onClick={() => {
                    navigate("studio");
                    openPractice();
                  }}
                >
                  Give it a try <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              attempts.map((a, i) => (
                <div className="attempt-row" key={a.id}>
                  <span className="attempt-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{a.question}</strong>
                    <p>
                      Your answer: {a.response} ·{" "}
                      {a.supported ? "With support" : "Independent attempt"}
                    </p>
                  </div>
                  <span
                    className={`result-label ${a.correct ? "positive" : ""}`}
                  >
                    {a.correct ? "Fits the idea" : "Worth another look"}
                  </span>
                </div>
              ))
            )}
          </section>
          {attempts.length > 0 && (
            <div className="next-practice">
              <Leaf size={25} />
              <div>
                <h3>One next step.</h3>
                <p>
                  {attempts.length < 2
                    ? "You have tried one question. Try another before drawing conclusions about this concept."
                    : attempts.some((a) => !a.correct)
                      ? "Revisit the visual example for a question you found difficult, then try a fresh item."
                      : "Try another example with different numbers to see whether the idea carries across."}
                </p>
              </div>
              <button
                className="btn btn-small"
                onClick={() => {
                  navigate("studio");
                  openPractice();
                }}
              >
                Keep exploring <ArrowRight size={15} />
              </button>
            </div>
          )}
          <button
            className="text-btn delete-session"
            onClick={() => {
              if (
                window.confirm(
                  "Delete your current learning session and its practice evidence?",
                )
              ) {
                setAttempts([]);
                setSupportCount(0);
                setTeachText("");
                setRubric(null);
                setSourceText("");
                setDocId("");
                setUploadPreview("");
                setImportStage("empty");
                setLesson(SAMPLE);
                chooseConcept("equivalence");
                void request("/session", undefined, "DELETE").catch(() => {});
                notify("Your current session has been cleared.");
              }
            }}
          >
            <Trash2 size={15} /> Delete this session
          </button>
          <p className="summary-disclosure">
            Practice evidence describes this session only. It is not a diagnosis
            or a validated mastery score.
          </p>
        </main>
      )}

      {error && (
        <div className="toast error-toast" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {notice && (
        <div className="toast notice-toast" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
          <button aria-label="Dismiss message" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {busy && (
        <div className="busy-indicator" role="status">
          <LoaderCircle size={17} className="spin" />
          {busy}…
        </div>
      )}
      {view === "home" && (
        <footer className="site-footer wrap">
          <Brand onClick={() => navigate("home")} />
          <span>More ways in. More possibilities ahead.</span>
          <button className="text-btn" onClick={() => setInfoOpen(true)}>
            About StudyLens <ArrowUpRight size={13} />
          </button>
        </footer>
      )}
      {(settings ||
        sourceOpen ||
        askOpen ||
        infoOpen ||
        recording ||
        transcript !== null) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!recording && transcript === null) {
              setSettings(false);
              setSourceOpen(false);
              setAskOpen(false);
              setInfoOpen(false);
            }
          }}
        >
          <Modal
            onClose={() => {
              if (recording) {
                recorder.current?.cancel();
                recorder.current = null;
                setRecording(false);
              }
              setSettings(false);
              setSourceOpen(false);
              setAskOpen(false);
              setInfoOpen(false);
              setTranscript(null);
            }}
            title={
              recording
                ? "Your words, your pace."
                : transcript !== null
                  ? "Here’s what we heard."
                  : settings
                    ? "Make yourself comfortable."
                    : sourceOpen
                      ? "The page behind the idea."
                      : askOpen
                        ? "A closer look at this part."
                        : "A different way into learning."
            }
          >
            {settings && !recording && transcript === null && (
              <div className="preferences">
                <p>
                  Choose what feels comfortable. You can change it any time.
                </p>
                <label className="range-label">
                  Text size <strong>{fontSize}px</strong>
                  <input
                    type="range"
                    min="18"
                    max="30"
                    value={fontSize}
                    onChange={(e) => setFontSize(+e.target.value)}
                  />
                </label>
                {[
                  {
                    text: "A little more breathing room",
                    detail: "Increase spacing between lines and letters.",
                    value: spacing,
                    set: setSpacing,
                  },
                  {
                    text: "Less motion",
                    detail: "Keep transitions and diagrams still.",
                    value: reduced,
                    set: setReduced,
                  },
                  {
                    text: "Stronger contrast",
                    detail: "Use darker text and clearer boundaries.",
                    value: contrast,
                    set: setContrast,
                  },
                ].map((s) => (
                  <label className="toggle-row" key={s.text}>
                    <span>
                      <strong>{s.text}</strong>
                      <small>{s.detail}</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={s.value}
                      onChange={(e) => s.set(e.target.checked)}
                    />
                  </label>
                ))}
                <div className="preference-preview" style={{ fontSize }}>
                  <span className="eyebrow">A LITTLE PREVIEW</span>
                  <p>Different paths can lead to the same understanding.</p>
                </div>
                <button className="btn" onClick={() => setSettings(false)}>
                  That feels good <Check size={16} />
                </button>
              </div>
            )}
            {sourceOpen && !recording && transcript === null && (
              <div className="source-content">
                <span className="source-tag">
                  {lesson.sample
                    ? "TEAM-AUTHORED SAMPLE · SOURCE V1"
                    : "YOUR CONFIRMED SOURCE"}
                </span>
                {(lesson.sample || uploadPreview) && (
                  <img
                    src={
                      lesson.sample ? "/images/sample-page.png" : uploadPreview
                    }
                    alt={
                      lesson.sample
                        ? "The original team-authored fractions worksheet"
                        : "Your uploaded source page"
                    }
                  />
                )}
                <div className="source-excerpt">
                  <span className="eyebrow">
                    THE PASSAGE BEHIND THIS EXPLANATION
                  </span>
                  <blockquote>
                    {sourceQuote ||
                      activeBlock.source_quote ||
                      activeBlock.text}
                  </blockquote>
                </div>
                <h3>The complete source</h3>
                <p>{lesson.source}</p>
                <div className="inline-note">
                  <Info size={16} /> Source links make explanations inspectable.
                  They do not independently prove that generated content is
                  correct.
                </div>
              </div>
            )}
            {askOpen && !recording && transcript === null && (
              <div className="ask-content">
                <div className="selected-passage">
                  <span className="eyebrow">THE PART WE'RE LOOKING AT</span>
                  <blockquote>{selectedText || activeBlock.text}</blockquote>
                  <span>
                    Source {activeBlock.id.toUpperCase()} ·{" "}
                    {lesson.sample ? "Sample v1" : "Confirmed source"}
                  </span>
                </div>
                <label className="field-label" htmlFor="ask-question">
                  WHAT WOULD YOU LIKE TO KNOW?
                </label>
                <div className="ask-input">
                  <input
                    id="ask-question"
                    value={askQuestion}
                    onChange={(e) => setAskQuestion(e.target.value)}
                    placeholder="Why are these amounts equal?"
                  />
                  <button
                    className="icon-btn"
                    aria-label="Speak your question"
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
                {askAnswer && (
                  <div className="context-answer">
                    <span className="eyebrow">
                      {providers.openai
                        ? "SOURCE-LINKED EXPLANATION"
                        : "AUTHORED SAMPLE EXPLANATION"}
                    </span>
                    <p>{askAnswer}</p>
                    <button
                      className="text-btn"
                      onClick={() => void speak(askAnswer)}
                    >
                      <Volume2 size={15} /> Listen to this
                    </button>
                    <button
                      className="source-citation"
                      onClick={() => {
                        setAskOpen(false);
                        setSourceOpen(true);
                      }}
                    >
                      View the original page <ArrowUpRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            )}
            {infoOpen && !recording && transcript === null && (
              <div className="about-content">
                <button
                  className="text-btn"
                  onClick={() =>
                    void refreshConnections().then((status) =>
                      notify(
                        status
                          ? "Connection settings refreshed. Configured keys still need a live verification."
                          : "The static preview has no Python service connected. Run locally to connect your keys.",
                      ),
                    )
                  }
                >
                  <RotateCcw size={14} /> Refresh connection settings
                </button>
                <p>
                  StudyLens began as PageAble, a Neural Storm 2026 prototype for
                  accessible adaptive learning.
                </p>
                <div className="connection-row">
                  <BookOpen size={20} />
                  <div>
                    <strong>Sample lesson</strong>
                    <p>
                      Ready now · authored content, exact diagrams, and local
                      practice.
                    </p>
                  </div>
                  <span className="connection-status">Ready</span>
                </div>
                <div className="connection-row">
                  <MessageCircle size={20} />
                  <div>
                    <strong>OpenAI page understanding</strong>
                    <p>
                      {providers.openai
                        ? "Key configured · verify model access with a live request."
                        : "Add OPENAI_API_KEY to the local .env file to enable."}
                    </p>
                  </div>
                  <span>
                    {providers.openai ? "Configured" : "Awaiting key"}
                  </span>
                </div>
                <div className="connection-row">
                  <Mic size={20} />
                  <div>
                    <strong>Gnani speech</strong>
                    <p>
                      {providers.gnani
                        ? "Key configured · verify voice and model access with a live request."
                        : "Add GNANI_API_KEY for speech recognition and AI narration."}
                    </p>
                  </div>
                  <span>{providers.gnani ? "Configured" : "Awaiting key"}</span>
                </div>
                <p className="muted">
                  Keys stay on the server. Device narration is an optional local
                  fallback. Sample rubric feedback uses visible phrase-matching
                  rules until OpenAI is connected.
                </p>
                <p className="muted">
                  The book artwork and editorial photograph are AI-generated
                  illustrations of the product's learning context; they do not
                  depict an actual pilot. No learning-effectiveness claim has
                  been established.
                </p>
                <button
                  className="btn btn-small"
                  onClick={() => {
                    setInfoOpen(false);
                    navigate("studio");
                  }}
                >
                  Explore the sample <ArrowRight size={15} />
                </button>
              </div>
            )}
            {recording && (
              <div className="recording-content">
                <div className="recording-mark">
                  <Mic size={34} />
                </div>
                <div className="recording-time">
                  {recordSeconds}s <span>/ 25s</span>
                </div>
                <p>
                  Speak when you're ready. You'll review the words before
                  anything is submitted.
                </p>
                <button className="btn" onClick={() => void stopRecording()}>
                  <Square size={15} /> Stop and review
                </button>
              </div>
            )}
            {transcript !== null && (
              <div>
                <p>
                  Change anything before using these words. This does not submit
                  your answer yet.
                </p>
                <textarea
                  aria-label="Review your transcript"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  maxLength={2000}
                />
                <button className="btn" onClick={confirmTranscript}>
                  Use these words <Check size={16} />
                </button>
              </div>
            )}
          </Modal>
        </div>
      )}
    </div>
  );
}
function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const els = dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === dialog.current)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal"
      onClick={(e) => e.stopPropagation()}
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabIndex={-1}
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button
          className="icon-btn"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={21} />
        </button>
      </div>
      {children}
    </div>
  );
}
export default App;
