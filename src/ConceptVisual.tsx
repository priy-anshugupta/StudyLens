import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Cloud, Droplets, Globe, Hash, Leaf, Lightbulb, LoaderCircle, Pause, Play, RotateCcw, Sun, Users, Volume2, Zap } from "lucide-react";
import { request } from "./api";
import "./concept-visual.css";
import { diagramLabelLines } from "./diagram-label";

export type VisualPlan = {
  title: string;
  layout: "process" | "cycle" | "timeline" | "comparison" | "concept";
  nodes: { id: string; label: string; icon: keyof typeof icons }[];
  links: { start: string; end: string }[];
  steps: { title: string; explanation: string; node_ids: string[]; source_quote: string }[];
};
const icons = { sun: Sun, leaf: Leaf, water: Droplets, cloud: Cloud, book: BookOpen, people: Users, number: Hash, globe: Globe, idea: Lightbulb, energy: Zap };

export default function ConceptVisual({ lessonId, blockId, onSpeak, onStop, busy, speaking, cache }: {
  lessonId: string; blockId: string; onSpeak: (text: string) => void; onStop: () => void; busy: boolean; speaking: boolean; cache: Map<string, VisualPlan>;
}) {
  const [plan, setPlan] = useState<VisualPlan | null>(() => cache.get(blockId) ?? null);
  const [loading, setLoading] = useState(false), [error, setError] = useState("");
  const [step, setStep] = useState(0), [playing, setPlaying] = useState(false);
  const mounted = useRef(true), lock = useRef(false);
  const marker = useId().replace(/:/g, "");
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!playing || !plan) return;
    const timer = window.setTimeout(() => {
      if (document.hidden) { setPlaying(false); return; }
      if (step >= plan.steps.length - 1) setPlaying(false);
      else setStep(step + 1);
    }, Math.max(6500, plan.steps[step].explanation.split(/\s+/).length * 380));
    return () => clearTimeout(timer);
  }, [playing, step, plan]);
  async function build() {
    if (lock.current) return;
    lock.current = true; setLoading(true); setError("");
    try {
      const data = await request<VisualPlan>(`/lessons/${lessonId}/visual`, { block_id: blockId });
      cache.set(blockId, data);
      if (mounted.current) { setPlan(data); setStep(0); }
    } catch (e) { if (mounted.current) setError((e as Error).message); }
    finally { lock.current = false; if (mounted.current) setLoading(false); }
  }
  function select(i: number) { onStop(); setStep(i); setPlaying(false); }
  if (!plan) return <section className="concept-invite">
    <div className="concept-invite-icon"><Lightbulb size={30} /></div>
    <div><span className="eyebrow">ANOTHER WAY INTO THE IDEA</span><h2>Read it. See it. Make it click.</h2><p>Turn this section into a clickable diagram, with a written explanation at every step.</p></div>
    <button className="btn btn-small" disabled={loading || busy} onClick={() => void build()}>{loading ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />}{loading ? "Building the diagram…" : "View diagram"}</button>
    {error && <p className="concept-error" role="alert">{error} <button className="text-btn" onClick={() => void build()} disabled={loading}>Try again</button></p>}
    {loading && <p className="concept-wait" role="status">Reading the page and connecting the ideas. Your text stays available above.</p>}
  </section>;
  const current = plan.steps[step], active = new Set(current.node_ids);
  const positions = plan.nodes.map((_, i) => {
    const count = plan.nodes.length;
    if (plan.layout === "cycle") { const a = -Math.PI / 2 + i * Math.PI * 2 / count; return { x: 410 + Math.cos(a) * 245, y: 260 + Math.sin(a) * 170 }; }
    if (plan.layout === "concept") {
      if (!i) return { x: 410, y: 260 };
      const a = -Math.PI / 2 + (i - 1) * Math.PI * 2 / (count - 1);
      return { x: 410 + Math.cos(a) * 270, y: 260 + Math.sin(a) * 170 };
    }
    const cols = count <= 3 ? count : 3, rows = Math.ceil(count / cols);
    const row = Math.floor(i / cols), col = i % cols;
    return { x: 150 + col * (520 / Math.max(1, cols - 1)), y: rows === 1 ? 260 : 155 + row * 210 };
  });
  const directed = ["process", "cycle", "timeline"].includes(plan.layout);
  return <section className="concept-card" aria-label="Visual and written explanation">
    <div className="concept-heading"><div><span className="eyebrow">SEE THE CONNECTION · {plan.layout.toUpperCase()}</span><h2>{plan.title}</h2></div><button className="text-btn" onClick={() => select(0)}><RotateCcw size={15} /> Restart</button></div>
    <div className="concept-workspace">
      <div className="concept-drawing">
        <span className="concept-diagram-hint">Choose an element or a written step below</span>
        <span className="concept-swipe-hint">Swipe across the diagram to see every element</span>
        <div className="concept-canvas" tabIndex={0} role="region" aria-label="Scrollable concept diagram">
        <svg viewBox="0 0 820 520" role="group" aria-label={plan.title}>
          <defs><marker id={marker} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="none" stroke="currentColor" strokeWidth="1.5" /></marker></defs>
          {plan.links.map((link, i) => {
            const a = positions[plan.nodes.findIndex(n => n.id === link.start)], b = positions[plan.nodes.findIndex(n => n.id === link.end)];
            if (!a || !b) return null;
            const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
            const offset = Math.min(85, length * .36);
            return <path key={i} className={`concept-link ${active.has(link.start) && active.has(link.end) ? "is-lit" : ""}`} d={`M${a.x + dx / length * offset} ${a.y + dy / length * offset} L${b.x - dx / length * offset} ${b.y - dy / length * offset}`} markerEnd={directed ? `url(#${marker})` : undefined} />;
          })}
          {plan.nodes.map((node, i) => {
            const Icon = icons[node.icon] || Lightbulb;
            const { x, y } = positions[i];
            const lines = diagramLabelLines(node.label);
            const choose = () => select(plan.steps.findIndex(s => s.node_ids.includes(node.id)));
            return <g key={node.id} className={`concept-node ${active.has(node.id) ? "is-active" : ""}`} transform={`translate(${x},${y})`} role="button" tabIndex={0} aria-label={`Explain ${node.label}`} aria-pressed={active.has(node.id)} onClick={choose} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(); } }}>
              <title>{node.label}</title>
              <rect x="-83" y="-65" width="166" height="130" rx="24" />
              <Icon x={-16} y={-44} size={32} strokeWidth={1.5} />
              <text textAnchor="middle" y={0}>{lines.map((line, j) => <tspan key={j} x="0" dy={j ? 18 : 0}>{line}</tspan>)}</text>
              <g aria-hidden="true">
                <circle cx="-58" cy="-42" r="13" />
                <text className="concept-node-number" x="-58" y="-42" textAnchor="middle" dominantBaseline="central">{i + 1}</text>
              </g>
            </g>;
          })}
        </svg>
        </div>
        <div className="concept-playback"><button className="btn btn-small" aria-pressed={playing} onClick={() => { onStop(); if (!playing && step === plan.steps.length - 1) setStep(0); setPlaying(!playing); }}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? "Pause walkthrough" : "Play walkthrough"}</button><span>Move at your own pace</span></div>
      </div>
      <div className="concept-written">
        <span className="eyebrow">THE PICTURE, IN WORDS</span>
        <div className="concept-step-list" aria-label="Explanation steps">{plan.steps.map((s, i) => <button key={i} aria-pressed={i === step} onClick={() => select(i)}><span>{String(i + 1).padStart(2, "0")}</span>{s.title}</button>)}</div>
        <div className="concept-step-copy" aria-live={playing ? "off" : "polite"}><h3>{current.title}</h3><p>{current.explanation}</p></div>
        <button className="text-btn" disabled={busy} onClick={() => { setPlaying(false); onSpeak(current.explanation); }}>{speaking ? <Pause size={15} /> : <Volume2 size={15} />}{speaking ? "Stop narration" : "Listen to this step"}</button>
        <details className="concept-evidence"><summary>From your textbook</summary><blockquote>{current.source_quote}</blockquote></details>
        <div className="concept-navigation"><button className="text-btn" disabled={!step} onClick={() => select(step - 1)}><ArrowLeft size={15} /> Back</button><span>{step + 1} / {plan.steps.length}</span><button className="text-btn" disabled={step === plan.steps.length - 1} onClick={() => select(step + 1)}>Next <ArrowRight size={15} /></button></div>
      </div>
    </div>
    <p className="concept-footnote">Simplified explanation generated from your confirmed page. Check the supporting passages for the original wording.</p>
  </section>;
}
