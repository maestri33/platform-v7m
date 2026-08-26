"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  decideDocumentStaff,
  DocumentReviewItem,
  getErrorMessage,
  getGlobalDocumentReviews,
  getUserDossier,
  UserDossier,
} from "@/lib/api";

export default function DocumentosPage() {
  const [reviews, setReviews] = useState<DocumentReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  // Dossiê Modal State
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [dossier, setDossier] = useState<UserDossier | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activePhotoTab, setActivePhotoTab] = useState<"front" | "back" | "full" | "selfie" | "proof">("front");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);

  useEffect(() => {
    loadReviews();
  }, []);

  // Keyboard Shortcuts for Rapid Review
  useEffect(() => {
    if (!selectedUser) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger hotkeys if user is actively typing in an input
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") {
        if (e.key === "Escape") {
          target.blur();
        }
        return;
      }

      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        handleDecision("rg", true);
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleDecision("selfie", true);
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        setShowRejectBox(true);
        const input = document.getElementById("rejection-input");
        input?.focus();
      } else if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        setRotation((r) => (r + 90) % 360);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoomLevel((z) => Math.min(3, z + 0.25));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoomLevel((z) => Math.max(0.5, z - 0.25));
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSelectedUser(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedUser, rejectionReason]);

  async function loadReviews() {
    setLoading(true);
    setError(null);
    try {
      const data = await getGlobalDocumentReviews();
      setReviews(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function openDossier(userExternalId: string) {
    setSelectedUser(userExternalId);
    setDossierLoading(true);
    setZoomLevel(1);
    setRotation(0);
    setShowRejectBox(false);
    setRejectionReason("");
    try {
      const data = await getUserDossier(userExternalId);
      setDossier(data);
      if (data.media.front_photo) setActivePhotoTab("front");
      else if (data.media.full_photo) setActivePhotoTab("full");
      else if (data.media.selfie_photo) setActivePhotoTab("selfie");
    } catch (err) {
      toast.error("Erro ao carregar dossiê: " + getErrorMessage(err));
      setSelectedUser(null);
    } finally {
      setDossierLoading(false);
    }
  }

  async function handleDecision(kind: string, approve: boolean) {
    if (!selectedUser) return;
    if (!approve && !rejectionReason.trim()) {
      setShowRejectBox(true);
      return;
    }
    setActionLoading(true);
    try {
      await decideDocumentStaff(selectedUser, {
        kind,
        approve,
        reason: rejectionReason.trim() || undefined,
      });
      toast.success(approve ? "Documento Aprovado com sucesso!" : "Documento Reprovado.");
      setSelectedUser(null);
      setDossier(null);
      loadReviews();
    } catch (err) {
      toast.error("Erro ao registrar decisão: " + getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  const filtered = reviews.filter((r) => {
    if (filterType === "all") return true;
    return r.kind === filterType || r.type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-brand-ink">
            Mesa de Conferência de Documentos & Biometria
          </h1>
          <p className="text-sm text-brand-muted">
            Auditoria visual lado a lado, verificação biométrica cosseno (InsightFace) e liberação administrativa.
          </p>
        </div>
        <button
          onClick={loadReviews}
          className="inline-flex items-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-2 text-sm font-bold text-brand-ink shadow-sm transition hover:bg-slate-50"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Atualizar Fila
        </button>
      </div>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: `Todos (${reviews.length})` },
          { id: "rg", label: `Documentos RG/CNH (${reviews.filter((r) => r.kind === "rg").length})` },
          { id: "selfie", label: `Selfies Biométricas (${reviews.filter((r) => r.kind === "selfie").length})` },
          { id: "enrollment", label: `Matrículas (${reviews.filter((r) => r.type === "enrollment").length})` },
          { id: "candidate", label: `Candidatos (${reviews.filter((r) => r.type === "candidate").length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              filterType === tab.id
                ? "bg-brand-ink text-white"
                : "border border-brand-border bg-white text-brand-muted hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabela de Revisões */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-brand-border bg-white p-8">
          <div className="flex items-center gap-3 text-sm font-bold text-brand-muted">
            <div className="size-5 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
            Carregando documentos em revisão...
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-brand-border bg-white p-8 text-center">
          <p className="font-bold text-brand-ink">Fila de conferência limpa 🎉</p>
          <p className="text-xs text-brand-muted">Nenhum documento retido em revisão no momento.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-brand-border bg-slate-50 text-[11px] font-bold text-brand-muted uppercase">
              <tr>
                <th className="px-4 py-3">Candidato / Aluno</th>
                <th className="px-4 py-3">Polo</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Motivo / Alerta</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filtered.map((item) => (
                <tr key={`${item.type}-${item.external_id}-${item.kind}`} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3">
                    <p className="font-bold text-brand-ink">{item.name}</p>
                    <p className="text-xs text-brand-muted">
                      {item.phone || item.cpf || item.user_external_id.slice(0, 8)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-brand-ink uppercase">
                      {item.hub_name || "Geral"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-brand-blue-bg px-2.5 py-1 text-xs font-bold text-brand-blue">
                      {item.kind.toUpperCase()} ({item.type})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-amber-800 font-medium">
                    {item.reason}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openDossier(item.user_external_id)}
                      className="rounded-xl bg-brand-blue px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-blue/90"
                    >
                      Abrir Mesa Dual-View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL MESA DUAL-VIEW COM PAN/ZOOM & DOSSIÊ COMPLETO */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-brand-border bg-white shadow-2xl">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-brand-border bg-slate-50 px-6 py-4">
              <div>
                <h3 className="text-lg font-black text-brand-ink">
                  Mesa de Conferência Documental: {dossier?.profile.name || "Carregando..."}
                </h3>
                <p className="text-xs text-brand-muted">
                  CPF: {dossier?.profile.cpf || "Não informado"} · Telefone: {dossier?.profile.phone || "Não informado"}
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-xl border border-brand-border bg-white p-2 text-brand-muted hover:bg-slate-100"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Corpo Split Screen */}
            {dossierLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="flex items-center gap-3 text-sm font-bold text-brand-muted">
                  <div className="size-6 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
                  Carregando imagens e histórico biométrico...
                </div>
              </div>
            ) : dossier ? (
              <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
                {/* Painel Esquerdo: Visualizador de Imagem com Pan/Zoom (7 colunas) */}
                <div className="flex flex-col border-b border-brand-border bg-slate-950 p-4 lg:col-span-7 lg:border-b-0 lg:border-r">
                  {/* Abas de Fotos */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {dossier.media.front_photo && (
                      <button
                        onClick={() => setActivePhotoTab("front")}
                        className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                          activePhotoTab === "front" ? "bg-brand-blue text-white" : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        Doc Frente
                      </button>
                    )}
                    {dossier.media.back_photo && (
                      <button
                        onClick={() => setActivePhotoTab("back")}
                        className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                          activePhotoTab === "back" ? "bg-brand-blue text-white" : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        Doc Verso
                      </button>
                    )}
                    {dossier.media.full_photo && (
                      <button
                        onClick={() => setActivePhotoTab("full")}
                        className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                          activePhotoTab === "full" ? "bg-brand-blue text-white" : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        Doc Aberto Inteiro
                      </button>
                    )}
                    {dossier.media.selfie_photo && (
                      <button
                        onClick={() => setActivePhotoTab("selfie")}
                        className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                          activePhotoTab === "selfie" ? "bg-brand-blue text-white" : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        Selfie ao Vivo
                      </button>
                    )}
                    {dossier.media.address_photo && (
                      <button
                        onClick={() => setActivePhotoTab("proof")}
                        className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                          activePhotoTab === "proof" ? "bg-brand-blue text-white" : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        Comprovante Residência
                      </button>
                    )}
                  </div>

                  {/* Controles de Zoom / Rotação */}
                  <div className="my-2 flex items-center justify-between border-y border-slate-800 py-1.5 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                        className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700 text-white"
                      >
                        - Zoom
                      </button>
                      <span className="text-white font-mono">{Math.round(zoomLevel * 100)}%</span>
                      <button
                        onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                        className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700 text-white"
                      >
                        + Zoom
                      </button>
                      <button
                        onClick={() => setZoomLevel(1)}
                        className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700 text-slate-300"
                      >
                        Reset
                      </button>
                    </div>
                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700 text-white"
                    >
                      ↻ Girar 90°
                    </button>
                  </div>

                  {/* Canvas Visualizador */}
                  <div className="flex flex-1 items-center justify-center overflow-auto rounded-xl bg-slate-900 p-2">
                    {activePhotoTab === "front" && dossier.media.front_photo && (
                      <img
                        src={dossier.media.front_photo}
                        alt="Frente"
                        style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)` }}
                        className="max-h-[50vh] object-contain transition-transform duration-150"
                      />
                    )}
                    {activePhotoTab === "back" && dossier.media.back_photo && (
                      <img
                        src={dossier.media.back_photo}
                        alt="Verso"
                        style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)` }}
                        className="max-h-[50vh] object-contain transition-transform duration-150"
                      />
                    )}
                    {activePhotoTab === "full" && dossier.media.full_photo && (
                      <img
                        src={dossier.media.full_photo}
                        alt="Inteiro"
                        style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)` }}
                        className="max-h-[50vh] object-contain transition-transform duration-150"
                      />
                    )}
                    {activePhotoTab === "selfie" && dossier.media.selfie_photo && (
                      <img
                        src={dossier.media.selfie_photo}
                        alt="Selfie"
                        style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)` }}
                        className="max-h-[50vh] object-contain transition-transform duration-150"
                      />
                    )}
                    {activePhotoTab === "proof" && dossier.media.address_photo && (
                      <img
                        src={dossier.media.address_photo}
                        alt="Comprovante"
                        style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)` }}
                        className="max-h-[50vh] object-contain transition-transform duration-150"
                      />
                    )}
                  </div>
                </div>

                {/* Painel Direito: Comparador Biométrico & Extração OCR (5 colunas) */}
                <div className="flex flex-col justify-between overflow-y-auto p-6 lg:col-span-5">
                  <div className="space-y-4">
                    {/* Gauge Biométrico InsightFace */}
                    <div className="rounded-2xl border border-brand-border bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase text-brand-muted tracking-wide">
                        Verificação Facial ArcFace (buffalo_l)
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-brand-muted">Status da Selfie:</p>
                          <p className="font-black text-sm text-brand-ink uppercase">
                            {dossier.biometrics.selfie_status || "PENDENTE"}
                          </p>
                        </div>
                        {dossier.biometrics.verifications.length > 0 && (
                          <div className="text-right">
                            <p className="text-xs text-brand-muted">Score Cosseno:</p>
                            <p className="font-mono text-lg font-black text-brand-blue">
                              {Number(dossier.biometrics.verifications[0].score).toFixed(3)}
                            </p>
                          </div>
                        )}
                      </div>
                      {dossier.biometrics.selfie_reason && (
                        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs font-medium text-amber-800">
                          {dossier.biometrics.selfie_reason}
                        </p>
                      )}
                    </div>

                    {/* Dados Extraídos pelo OCR */}
                    <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm">
                      <p className="text-xs font-black uppercase text-brand-muted tracking-wide">
                        Conferência de Dados (OCR vs Cadastro)
                      </p>
                      <div className="mt-3 space-y-2 text-xs">
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-brand-muted">Nome:</span>
                          <span className="font-bold text-brand-ink">{dossier.profile.name || "—"}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-brand-muted">Documento Nº:</span>
                          <span className="font-bold text-brand-ink">{dossier.document_data.number || "—"}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-brand-muted">Nome da Mãe:</span>
                          <span className="font-bold text-brand-ink">{dossier.profile.mother_name || "—"}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-brand-muted">Nascimento:</span>
                          <span className="font-bold text-brand-ink">{dossier.profile.birth_date || "—"}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-brand-muted">Cidade/UF:</span>
                          <span className="font-bold text-brand-ink">
                            {dossier.address.city ? `${dossier.address.city}/${dossier.address.state}` : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Caixa de Justificativa de Reprovação */}
                    {showRejectBox && (
                      <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
                        <p className="text-xs font-bold text-rose-900">Motivo da Reprovação:</p>
                        <input
                          id="rejection-input"
                          type="text"
                          placeholder="Ex: Foto cortada, falta verso, documento ilegível..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs text-brand-ink focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Barra de Ações Rápidas */}
                  <div className="mt-6 flex gap-3 border-t border-brand-border pt-4">
                    <button
                      disabled={actionLoading}
                      onClick={() => handleDecision("rg", true)}
                      className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Aprovar RG [A]
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleDecision("selfie", true)}
                      className="flex-1 rounded-xl bg-brand-blue px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-blue/90 disabled:opacity-50"
                    >
                      Aprovar Selfie
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleDecision("rg", false)}
                      className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      Reprovar [R]
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
