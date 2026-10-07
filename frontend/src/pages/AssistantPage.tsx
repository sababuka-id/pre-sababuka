import { Bot, Send, ShieldCheck, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, jsonBody } from "../api";
import { Notice } from "../components";

interface Session { id: string; title: string | null; status: string; started_at: string }
interface Citation { publication_item_id: string; label: string; indicator: string; period: string; organization: string; source: string }
interface Answer { message_id: string; answer: string; citations: Citation[]; sufficiency: "sufficient" | "partial" | "insufficient" }
interface ChatMessage { role: "user" | "assistant"; content: string; answer?: Answer }

export function AssistantPage() {
  const [session, setSession] = useState<Session | null>(null); const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); const question = message.trim(); if (!question) return; setBusy(true); setError(""); setMessage("");
    setMessages((current) => [...current, { role: "user", content: question }]);
    try {
      const active = session ?? await api<Session>("/assistant/sessions", { method: "POST", mutation: true, body: jsonBody({ title: "Konsultasi pimpinan" }) });
      if (!session) setSession(active);
      const answer = await api<Answer>(`/assistant/sessions/${active.id}/messages`, { method: "POST", mutation: true, body: jsonBody({ message: question }) });
      setMessages((current) => [...current, { role: "assistant", content: answer.answer, answer }]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Asisten belum dapat menjawab."); }
    finally { setBusy(false); }
  };
  return <div className="assistant-workspace">
    <Notice tone="warning">Asisten hanya membaca publikasi aktif. Jawaban tanpa sumber resmi akan ditolak dan tidak dibuat berdasarkan perkiraan.</Notice>
    <section className="panel assistant-panel"><header><span className="assistant-avatar"><Bot /></span><div><h2>Asisten Data Pimpinan</h2><p><ShieldCheck /> Retrieval lokal · publikasi aktif saja</p></div></header>
      <div className="chat-stream">{!messages.length && <div className="assistant-welcome"><Bot /><h3>Apa yang ingin Anda ketahui?</h3><p>Contoh: “Berapa nilai IKP tahun 2025?” atau “Tampilkan ringkasan capaian terbaru.”</p></div>}{messages.map((item, index) => <article key={index} className={`chat-message ${item.role}`}><span>{item.role === "assistant" ? <Bot /> : <UserRound />}</span><div><p>{item.content}</p>{item.answer && <><BadgeSufficiency value={item.answer.sufficiency} />{item.answer.citations.length > 0 && <div className="citation-list">{item.answer.citations.map((citation) => <div key={citation.publication_item_id}><strong>{citation.label}</strong><small>{citation.organization} · {citation.source}</small></div>)}</div>}</>}</div></article>)}</div>
      {error && <Notice tone="error">{error}</Notice>}
      <form className="chat-composer" onSubmit={submit}><textarea aria-label="Pertanyaan untuk Asisten Data" rows={2} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tanyakan indikator, periode, atau OPD…" maxLength={4000} /><button className="button primary" disabled={busy || !message.trim()}>{busy ? "Mencari sumber…" : <><Send />Kirim</>}</button></form>
    </section>
  </div>;
}

function BadgeSufficiency({ value }: { value: Answer["sufficiency"] }) {
  const label = value === "sufficient" ? "Data memadai" : value === "partial" ? "Data sebagian" : "Data belum cukup";
  return <span className={`sufficiency ${value}`}>{label}</span>;
}
