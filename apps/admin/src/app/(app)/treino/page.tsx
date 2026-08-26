"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBox } from "@/components/ui/error-box";
import { PageShell } from "@/components/ui/page-shell";
import { SelectField } from "@/components/ui/select-field";
import { Spinner, EmptyState } from "@/components/ui/spinner";
import { StatusPill } from "@/components/ui/status-pill";
import { TextField } from "@/components/ui/text-field";
import {
  createMaterial,
  deleteMaterial,
  getErrorMessage,
  getTrainingSubmissions,
  listMaterials,
  mediaUrl,
  overrideSubmissionGrade,
  publishMaterial,
  TrainingSubmissionItem,
  unlockPromoterTraining,
  updateMaterial,
  uploadMaterialVideo,
  type Material,
  type MaterialIn,
} from "@/lib/api";

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[15px] font-bold text-brand-ink">{label}</span>
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border-2 border-brand-border bg-white/55 px-4 py-3 text-[16px] text-brand-ink outline-none backdrop-blur-md transition placeholder:text-brand-muted/70 focus:border-brand-blue-bright focus:ring-4 focus:ring-brand-blue-bright/25"
      />
    </div>
  );
}

const KIND_OPTIONS = [
  { value: "fixed", label: "Fixa (todo promotor novo recebe)" },
  { value: "transitory", label: "Transitória (publicar pros existentes)" },
];

export default function TreinoPage() {
  const [activeTab, setActiveTab] = useState<"materials" | "submissions" | "unlock">("materials");
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [submissions, setSubmissions] = useState<TrainingSubmissionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Material | null>(null);

  // Desbloqueio
  const [unlockId, setUnlockId] = useState("");
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [unlockResult, setUnlockResult] = useState<string | null>(null);

  function loadMaterials() {
    listMaterials()
      .then(setMaterials)
      .catch((e: unknown) => {
        setError(getErrorMessage(e));
        setMaterials([]);
      });
  }

  function loadSubmissions() {
    getTrainingSubmissions()
      .then(setSubmissions)
      .catch((e: unknown) => {
        setError(getErrorMessage(e));
        setSubmissions([]);
      });
  }

  useEffect(() => {
    loadMaterials();
    loadSubmissions();
  }, []);

  async function handleUnlock() {
    if (!unlockId.trim()) return;
    setUnlockBusy(true);
    setUnlockResult(null);
    try {
      const res = await unlockPromoterTraining(unlockId.trim());
      setUnlockResult(res.detail);
      setUnlockId("");
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setUnlockBusy(false);
    }
  }

  return (
    <PageShell title="Treino LMS" subtitle="Autoria de matérias, auditoria de gravações de voz e gestão de bloqueios.">
      {/* Abas Superiores */}
      <div className="flex gap-2 border-b border-brand-border pb-3">
        <button
          onClick={() => setActiveTab("materials")}
          className={`rounded-xl px-4 py-2 text-sm font-black transition ${
            activeTab === "materials"
              ? "bg-brand-blue text-white shadow-sm"
              : "bg-white text-brand-muted hover:bg-slate-50"
          }`}
        >
          Matérias & Autoria
        </button>
        <button
          onClick={() => {
            setActiveTab("submissions");
            loadSubmissions();
          }}
          className={`rounded-xl px-4 py-2 text-sm font-black transition ${
            activeTab === "submissions"
              ? "bg-brand-blue text-white shadow-sm"
              : "bg-white text-brand-muted hover:bg-slate-50"
          }`}
        >
          Submissões & Áudios ({submissions?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab("unlock")}
          className={`rounded-xl px-4 py-2 text-sm font-black transition ${
            activeTab === "unlock"
              ? "bg-brand-blue text-white shadow-sm"
              : "bg-white text-brand-muted hover:bg-slate-50"
          }`}
        >
          Desbloqueio de Promotores
        </button>
      </div>

      <ErrorBox message={error} />

      {/* ABA 1: MATÉRIAS */}
      {activeTab === "materials" && (
        <div className="space-y-6">
          <MaterialForm
            key={editing?.external_id ?? "new"}
            material={editing}
            onDone={() => {
              setEditing(null);
              loadMaterials();
            }}
            onCancelEdit={() => setEditing(null)}
          />

          <div className="mt-6 flex flex-col gap-3">
            <h2 className="text-lg font-extrabold text-brand-ink">Matérias Cadastradas</h2>
            {materials === null ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : materials.length === 0 ? (
              <EmptyState label="Nenhuma matéria criada ainda." />
            ) : (
              materials.map((m) => (
                <MaterialCard key={m.external_id} m={m} onEdit={() => setEditing(m)} onChanged={loadMaterials} />
              ))
            )}
          </div>
        </div>
      )}

      {/* ABA 2: SUBMISSÕES COM PLAYER DE ÁUDIO */}
      {activeTab === "submissions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-brand-ink">Auditoria de Respostas dos Promotores</h2>
            <SmallBtn onClick={loadSubmissions}>
              Atualizar Lista
            </SmallBtn>
          </div>

          {submissions === null ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : submissions.length === 0 ? (
            <EmptyState label="Nenhuma submissão enviada ainda." />
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <SubmissionCard key={sub.external_id} sub={sub} onChanged={loadSubmissions} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: DESBLOQUEIO DE PROMOTORES */}
      {activeTab === "unlock" && (
        <Card className="max-w-2xl space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-brand-ink">Desbloqueio Administrativo de Treinamento</h2>
            <p className="text-xs text-brand-muted">
              Aprova todas as matérias obrigatórias pendentes do promotor de uma só vez e remove a trava de painel.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-brand-ink">External ID ou ID do Promotor</label>
            <input
              type="text"
              placeholder="Cole o external_id do promotor (ex: a1b2c3d4-...)"
              value={unlockId}
              onChange={(e) => setUnlockId(e.target.value)}
              className="w-full rounded-xl border border-brand-border bg-white px-4 py-2.5 text-sm text-brand-ink focus:border-brand-blue focus:outline-none"
            />
          </div>

          {unlockResult && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
              {unlockResult}
            </div>
          )}

          <Button onClick={handleUnlock} loading={unlockBusy} disabled={!unlockId.trim()}>
            Liberar Promotor Imediatamente
          </Button>
        </Card>
      )}
    </PageShell>
  );
}

function SubmissionCard({ sub, onChanged }: { sub: TrainingSubmissionItem; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [evalModal, setEvalModal] = useState<{ approve: boolean; grade: string } | null>(null);

  async function handleConfirmOverride() {
    if (!evalModal) return;
    const g = parseFloat(evalModal.grade);
    if (isNaN(g) || g < 0 || g > 10) {
      throw new Error("Informe uma nota válida entre 0.0 e 10.0.");
    }
    setBusy(true);
    try {
      await overrideSubmissionGrade(sub.external_id, evalModal.grade, evalModal.approve);
      toast.success(evalModal.approve ? "Resposta aprovada com sucesso!" : "Resposta reprovada com sucesso.");
      setEvalModal(null);
      onChanged();
    } catch (err) {
      toast.error("Erro ao avaliar: " + getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-brand-ink">{sub.user_name}</span>
            <span className="text-xs text-brand-muted">{sub.user_phone || sub.user_external_id.slice(0, 8)}</span>
          </div>
          <p className="mt-0.5 text-xs font-bold text-brand-blue">{sub.material_title}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              sub.status === "approved"
                ? "bg-emerald-50 text-emerald-700"
                : sub.status === "rejected"
                ? "bg-rose-50 text-rose-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {sub.status.toUpperCase()}
          </span>
          {sub.grade !== null && (
            <span className="font-mono text-sm font-black text-brand-ink">
              Nota: {sub.grade}/10
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div>
          <span className="font-bold text-brand-muted">Pergunta:</span>
          <p className="font-medium text-brand-ink">{sub.material_question}</p>
        </div>

        {sub.audio_url ? (
          <div className="rounded-xl border border-brand-border bg-slate-50 p-3">
            <span className="block font-bold text-brand-muted mb-1.5">Áudio Gravado pelo Promotor:</span>
            <audio controls src={sub.audio_url} className="w-full h-10" />
            {sub.answer && (
              <p className="mt-2 text-xs italic text-brand-muted">
                Transcrição: &ldquo;{sub.answer}&rdquo;
              </p>
            )}
          </div>
        ) : (
          <div>
            <span className="font-bold text-brand-muted">Resposta por Texto:</span>
            <p className="rounded-lg bg-slate-50 p-2 text-brand-ink">{sub.answer || "—"}</p>
          </div>
        )}

        {sub.justification && (
          <div className="rounded-lg bg-blue-50/70 p-2.5 border border-blue-100">
            <span className="font-bold text-brand-blue block">Parecer da IA / Justificativa:</span>
            <p className="text-brand-ink">{sub.justification}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <SmallBtn danger onClick={() => setEvalModal({ approve: false, grade: "0.0" })}>
          {busy ? "Salvando…" : "Reprovar Resposta"}
        </SmallBtn>
        <SmallBtn onClick={() => setEvalModal({ approve: true, grade: "10.0" })}>
          {busy ? "Salvando…" : "Aprovar Resposta"}
        </SmallBtn>
      </div>

      <ConfirmDialog
        open={evalModal !== null}
        title={evalModal?.approve ? "Aprovar Resposta do Promotor" : "Reprovar Resposta do Promotor"}
        tone={evalModal?.approve ? "primary" : "danger"}
        confirmLabel={evalModal?.approve ? "Confirmar Aprovação" : "Confirmar Reprovação"}
        onCancel={() => setEvalModal(null)}
        onConfirm={handleConfirmOverride}
        body={
          <div className="space-y-3 pt-1">
            <p className="text-xs text-brand-muted">
              Defina a nota de 0 a 10 atribuída para a resposta de <strong>{sub.user_name}</strong>:
            </p>
            <TextField
              label="Nota (0.0 a 10.0)"
              type="number"
              value={evalModal?.grade ?? ""}
              onChange={(e) =>
                setEvalModal((prev) => (prev ? { ...prev, grade: e.target.value } : null))
              }
            />
          </div>
        }
      />
    </Card>
  );
}

function MaterialForm({
  material,
  onDone,
  onCancelEdit,
}: {
  material: Material | null;
  onDone: () => void;
  onCancelEdit: () => void;
}) {
  const isEdit = !!material;
  const [title, setTitle] = useState(String(material?.title ?? ""));
  const [question, setQuestion] = useState(String(material?.question ?? ""));
  const [answer, setAnswer] = useState(String(material?.expected_answer ?? ""));
  const [text, setText] = useState(String(material?.text_content ?? ""));
  const [order, setOrder] = useState(String(material?.order ?? 0));
  const [kind, setKind] = useState(String(material?.kind ?? "fixed"));
  const [blocking, setBlocking] = useState(material?.blocking ?? true);
  const [ephemeral, setEphemeral] = useState(material?.ephemeral ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setOk(null);
    if (!title.trim() || !question.trim() || !answer.trim()) {
      setError("Título, questão e gabarito são obrigatórios.");
      return;
    }
    setBusy(true);
    try {
      if (isEdit && material) {
        await updateMaterial(material.external_id, {
          title: title.trim(),
          question: question.trim(),
          expected_answer: answer.trim(),
          text_content: text,
          order: Number(order) || 0,
          blocking,
        });
        setOk("Matéria atualizada.");
      } else {
        const payload: MaterialIn = {
          title: title.trim(),
          question: question.trim(),
          expected_answer: answer.trim(),
          text_content: text,
          order: Number(order) || 0,
          kind,
          blocking,
          ephemeral,
        };
        await createMaterial(payload);
        setOk("Matéria criada.");
      }
      onDone();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-brand-ink">
          {isEdit ? `Editar: ${material?.title}` : "Nova matéria"}
        </h2>
        {isEdit ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className="min-h-9 text-sm font-bold text-brand-muted hover:text-brand-blue"
          >
            Cancelar edição
          </button>
        ) : null}
      </div>

      <TextField label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
      <TextArea label="Conteúdo (texto)" value={text} onChange={setText} rows={5} />
      <TextArea label="Questão" value={question} onChange={setQuestion} rows={2} />
      <TextField label="Gabarito (resposta esperada)" value={answer} onChange={(e) => setAnswer(e.target.value)} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="Ordem" type="number" inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value)} />
        {!isEdit ? (
          <SelectField label="Tipo" value={kind} onChange={(e) => setKind(e.target.value)} options={KIND_OPTIONS} placeholder="" />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-[15px] font-semibold text-brand-ink">
          <input type="checkbox" checked={blocking} onChange={(e) => setBlocking(e.target.checked)} className="size-5 accent-brand-blue" />
          Obrigatória (trava o painel)
        </label>
        {!isEdit ? (
          <label className="flex items-center gap-2 text-[15px] font-semibold text-brand-ink">
            <input type="checkbox" checked={ephemeral} onChange={(e) => setEphemeral(e.target.checked)} className="size-5 accent-brand-blue" />
            Efêmera (descartável)
          </label>
        ) : null}
      </div>

      <ErrorBox message={error} />
      <ErrorBox message={ok} success />
      <Button onClick={submit} loading={busy}>
        {isEdit ? "Salvar alterações" : "Criar matéria"}
      </Button>
    </Card>
  );
}

function MaterialCard({ m, onEdit, onChanged }: { m: Material; onEdit: () => void; onChanged: () => void }) {
  const [confirm, setConfirm] = useState<"none" | "remove" | "publish">("none");
  const [videoBusy, setVideoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEphemeral = m.ephemeral ?? false;
  const isTransitory = m.kind === "transitory";
  const active = m.active ?? true;
  const videoHref = mediaUrl(m.video ?? null);

  async function onVideo(file: File | null) {
    if (!file) return;
    setError(null);
    setVideoBusy(true);
    try {
      await uploadMaterialVideo(m.external_id, file);
      onChanged();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setVideoBusy(false);
    }
  }

  return (
    <Card className="card-in flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-extrabold text-brand-ink">{String(m.title)}</h3>
            <StatusPill status={isTransitory ? "transitory" : "fixed"} tone="blue" label={isTransitory ? "Transitória" : "Fixa"} />
            {!active ? <StatusPill status="inactive" tone="neutral" label="Inativa" /> : null}
            {m.blocking ? <StatusPill status="blocking" tone="amber" label="Obrigatória" /> : null}
            {isEphemeral ? <StatusPill status="ephemeral" tone="neutral" label="Efêmera" /> : null}
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] text-brand-muted">{String(m.question ?? "")}</p>
          {videoHref ? (
            <a href={videoHref} target="_blank" rel="noopener" className="mt-1 inline-block text-[13px] font-bold text-brand-blue underline underline-offset-2">
              Ver vídeo
            </a>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <SmallBtn onClick={onEdit}>Editar</SmallBtn>
          <label className="min-h-9 cursor-pointer rounded-lg bg-white/70 px-3 py-1 text-[13px] font-bold text-brand-blue ring-1 ring-brand-border transition hover:bg-brand-blue-bg">
            {videoBusy ? "Enviando…" : m.video ? "Trocar vídeo" : "Vídeo"}
            <input type="file" accept="video/*" className="sr-only" disabled={videoBusy} onChange={(e) => onVideo(e.target.files?.[0] ?? null)} />
          </label>
          {isTransitory && active ? <SmallBtn onClick={() => setConfirm("publish")}>Publicar</SmallBtn> : null}
          <SmallBtn danger onClick={() => setConfirm("remove")}>
            {isEphemeral ? "Excluir" : "Desativar"}
          </SmallBtn>
        </div>
      </div>

      <ErrorBox message={error} />

      <ConfirmDialog
        open={confirm === "publish"}
        title="Publicar matéria transitória?"
        confirmLabel="Publicar"
        onCancel={() => setConfirm("none")}
        onConfirm={async () => {
          await publishMaterial(m.external_id);
          setConfirm("none");
          onChanged();
        }}
        body={<>Atribui esta matéria aos promotores que JÁ existem, re-trava o painel deles e notifica.</>}
      />

      <ConfirmDialog
        open={confirm === "remove"}
        title={isEphemeral ? "Excluir matéria efêmera?" : "Desativar matéria?"}
        tone="danger"
        confirmLabel={isEphemeral ? "Excluir" : "Desativar"}
        onCancel={() => setConfirm("none")}
        onConfirm={async () => {
          if (isEphemeral) {
            await deleteMaterial(m.external_id);
          } else {
            await updateMaterial(m.external_id, { active: false });
          }
          setConfirm("none");
          onChanged();
        }}
        body={
          isEphemeral ? (
            <>Esta matéria efêmera será removida de vez.</>
          ) : (
            <>Matérias não-efêmeras não são apagadas — esta será <strong>desativada</strong> (some do painel dos promotores).</>
          )
        }
      />
    </Card>
  );
}

function SmallBtn({ children, onClick, danger = false }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-9 rounded-lg px-3 py-1 text-[13px] font-bold ring-1 transition ${
        danger
          ? "bg-white/70 text-brand-danger ring-brand-border hover:bg-brand-danger-bg"
          : "bg-white/70 text-brand-blue ring-brand-border hover:bg-brand-blue-bg"
      }`}
    >
      {children}
    </button>
  );
}
