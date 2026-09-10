"use client";

import { useEffect, useState } from "react";

import { Button } from "@v7m/ui";
import { Card } from "@v7m/ui";
import { ConfirmDialog } from "@v7m/ui";
import { ErrorBox } from "@v7m/ui";
import { SelectField } from "@v7m/ui";
import { Spinner, EmptyState } from "@v7m/ui";
import { StatusPill } from "@v7m/ui";
import { TextField } from "@v7m/ui";
import {
  getErrorMessage,
  notifyGetTemplate,
  notifyHistory,
  notifyListEvents,
  notifyListTemplates,
  notifyPatchTemplate,
  notifyPreview,
  notifyRestoreSeed,
  notifyStats,
  notifyTest,
  type NotifyEventOut,
  type NotifyNotificationOut,
  type NotifyPreviewOut,
  type NotifyStatsOut,
  type NotifyTemplateOut,
} from "@/lib/api";

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  tts: "Áudio (TTS)",
};

const COMMON_VARS = [
  { name: "{{nome}}", desc: "Primeiro nome do destinatário" },
  { name: "{{nome_completo}}", desc: "Nome completo do destinatário" },
  { name: "{{polo}}", desc: "Nome da marca/polo" },
  { name: "{{telefone}}", desc: "Telefone formatado" },
  { name: "{{link_pagamento}}", desc: "Link de checkout/pagamento" },
  { name: "{{plataforma_login}}", desc: "Login da plataforma de estudos" },
  { name: "{{plataforma_senha}}", desc: "Senha da plataforma de estudos" },
];

export function NotificationsEditorTab() {
  const [events, setEvents] = useState<NotifyEventOut[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [tpl, setTpl] = useState<NotifyTemplateOut | null>(null);
  const [stats, setStats] = useState<NotifyStatsOut | null>(null);
  const [history, setHistory] = useState<NotifyNotificationOut[]>([]);

  // Form states
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyMd, setBodyMd] = useState("");
  const [mediaType, setMediaType] = useState("text");
  const [mediaUrl, setMediaUrl] = useState("");
  const [isTts, setIsTts] = useState(false);
  const [channels, setChannels] = useState<string[]>(["whatsapp"]);
  const [dirty, setDirty] = useState(false);

  // Preview and Test
  const [preview, setPreview] = useState<NotifyPreviewOut | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // Operation states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  async function loadInitial() {
    setLoading(true);
    setError(null);
    try {
      const [evs, st, hist, tpls] = await Promise.all([
        notifyListEvents(),
        notifyStats(),
        notifyHistory(50),
        notifyListTemplates(),
      ]);
      setEvents(evs);
      setStats(st);
      setHistory(hist);
      if (tpls && tpls.length > 0 && !selectedEvent) {
        setSelectedEvent(tpls[0].event);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitial();
  }, []);

  // Load specific template details
  useEffect(() => {
    if (!selectedEvent) return;
    let cancelled = false;

    notifyGetTemplate(selectedEvent)
      .then((data) => {
        if (cancelled) return;
        setTpl(data);
        setTitle(data.title || "");
        setSubject(data.subject || "");
        setBodyMd(data.body_md || "");
        setIsTts(data.is_tts || false);
        setChannels(data.channels ? data.channels.split(",").map((c) => c.trim()) : ["whatsapp"]);
        setDirty(false);
        // Gera preview automático
        notifyPreview(selectedEvent).then((p) => {
          if (!cancelled) setPreview(p);
        }).catch(() => {});
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, [selectedEvent]);

  async function handleSave() {
    if (!selectedEvent) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await notifyPatchTemplate(selectedEvent, {
        title: title.trim() || null,
        subject: subject.trim() || null,
        body_md: bodyMd,
        is_tts: isTts,
        channels: channels.join(","),
      });
      setTpl(updated);
      setDirty(false);
      setSuccess("Template de mensagem atualizado com sucesso!");
      // Atualiza preview
      const p = await notifyPreview(selectedEvent);
      setPreview(p);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSend() {
    if (!selectedEvent) return;
    setTesting(true);
    setError(null);
    setSuccess(null);
    try {
      const ctx: Record<string, string> = {};
      if (testPhone.trim()) ctx.phone = testPhone.trim();
      if (testEmail.trim()) ctx.email = testEmail.trim();

      await notifyTest(selectedEvent, channels, ctx);
      setSuccess("Disparo de teste executado! Verifique o WhatsApp ou e-mail de destino.");
      // Recarrega histórico
      const hist = await notifyHistory(20);
      setHistory(hist);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setTesting(false);
    }
  }

  async function handleRestoreSeed() {
    if (!selectedEvent) return;
    setConfirmRestore(false);
    setSaving(true);
    setError(null);
    try {
      const restored = await notifyRestoreSeed(selectedEvent);
      setTpl(restored);
      setTitle(restored.title || "");
      setSubject(restored.subject || "");
      setBodyMd(restored.body_md || "");
      setIsTts(restored.is_tts || false);
      setChannels(restored.channels ? restored.channels.split(",").map((c) => c.trim()) : ["whatsapp"]);
      setDirty(false);
      setSuccess("Template restaurado para a versão padrão de fábrica (seed).");
      const p = await notifyPreview(selectedEvent);
      setPreview(p);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function handleInsertVar(variable: string) {
    setBodyMd((prev) => prev + " " + variable);
    setDirty(true);
  }

  function toggleChannel(ch: string) {
    setChannels((prev) => {
      const next = prev.includes(ch) ? prev.filter((x) => x !== ch) : [...prev, ch];
      return next.length > 0 ? next : ["whatsapp"];
    });
    setDirty(true);
  }

  const eventOptions = events.map((e) => ({
    value: e.event,
    label: `${e.event} ${e.has_template ? "✓" : "(sem template)"}`,
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-brand-border bg-white p-4">
            <span className="text-xs font-bold text-brand-muted">Total de Templates</span>
            <p className="text-2xl font-black text-brand-ink">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-brand-border bg-white p-4">
            <span className="text-xs font-bold text-brand-muted">Templates Ativos</span>
            <p className="text-2xl font-black text-brand-green-dark">{stats.active}</p>
          </div>
          <div className="rounded-2xl border border-brand-border bg-white p-4">
            <span className="text-xs font-bold text-brand-muted">Envios com Áudio TTS</span>
            <p className="text-2xl font-black text-brand-amber">{stats.with_tts}</p>
          </div>
          <div className="rounded-2xl border border-brand-border bg-white p-4">
            <span className="text-xs font-bold text-brand-muted">Com Mídia</span>
            <p className="text-2xl font-black text-brand-blue">{stats.with_media}</p>
          </div>
        </div>
      )}

      {/* Main Editor & Live Preview Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Event Selector & Editor (7 cols) */}
        <Card className="flex flex-col gap-4 lg:col-span-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-brand-border/60 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-brand-ink">Editor de Mensagens e Notificações</h2>
              <p className="text-xs text-brand-muted">
                Edite os textos disparados automaticamente pelo sistema e pelo bot de WhatsApp.
              </p>
            </div>
            {dirty && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                Alterações não salvas
              </span>
            )}
          </div>

          <ErrorBox message={error} />
          <ErrorBox message={success} success />

          {/* Event Picker */}
          <div>
            <SelectField
              label="Evento de Notificação"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              options={eventOptions}
              placeholder="Selecione o evento..."
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : !tpl ? (
            <EmptyState label="Selecione um evento para carregar e editar o template." />
          ) : (
            <div className="flex flex-col gap-4">
              {/* Canais de Envio */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-brand-ink">Canais de Envio Ativos</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CHANNEL_LABELS).map(([chKey, chLabel]) => {
                    const isSelected = channels.includes(chKey);
                    return (
                      <button
                        key={chKey}
                        type="button"
                        onClick={() => toggleChannel(chKey)}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                          isSelected
                            ? "border-brand-blue bg-brand-blue text-white shadow-xs"
                            : "border-brand-border bg-slate-50 text-brand-muted hover:bg-slate-100"
                        }`}
                      >
                        <span>{chLabel}</span>
                        {isSelected && <span className="size-1.5 rounded-full bg-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Título e Assunto */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  label="Título Interno / Cabeçalho"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="ex: Confirmação de Matrícula"
                />
                <TextField
                  label="Assunto (para e-mail)"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="ex: Sua vaga foi garantida!"
                />
              </div>

              {/* Corpo da Mensagem (Markdown / WhatsApp) */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-bold text-brand-ink">
                    Corpo da Mensagem (WhatsApp / E-mail Markdown)
                  </label>
                  <span className="text-[11px] text-brand-muted font-mono">
                    {bodyMd.length} caracteres
                  </span>
                </div>

                <textarea
                  rows={8}
                  value={bodyMd}
                  onChange={(e) => {
                    setBodyMd(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Digite o texto da mensagem... Use *negrito*, _itálico_ e variáveis dinâmicas."
                  className="w-full rounded-2xl border border-brand-border bg-slate-50/70 p-3.5 text-xs text-brand-ink transition focus:border-brand-blue focus:bg-white focus:outline-none font-mono"
                />

                {/* Variáveis Rápidas */}
                <div className="mt-2">
                  <span className="text-[11px] font-bold text-brand-muted">Inserir Variável Dinâmica:</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {COMMON_VARS.map((v) => (
                      <button
                        key={v.name}
                        type="button"
                        onClick={() => handleInsertVar(v.name)}
                        title={v.desc}
                        className="cursor-pointer rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-brand-blue hover:bg-brand-blue hover:text-white"
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Toggles Avançados (TTS) */}
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-brand-border bg-slate-50/80 p-3 text-xs">
                <label className="flex cursor-pointer items-center gap-2 font-bold text-brand-ink">
                  <input
                    type="checkbox"
                    checked={isTts}
                    onChange={(e) => {
                      setIsTts(e.target.checked);
                      setDirty(true);
                    }}
                    className="size-4 rounded border-brand-border text-brand-blue"
                  />
                  <span>Gerar Áudio de Voz (TTS)</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-brand-border/60 pt-3">
                <button
                  type="button"
                  onClick={() => setConfirmRestore(true)}
                  className="cursor-pointer text-xs font-bold text-brand-danger hover:underline"
                >
                  Restaurar Padrão
                </button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleSave}
                    loading={saving}
                    className="bg-brand-green hover:bg-brand-green-dark"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Right Column: Live Preview & Disparo de Teste (5 cols) */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          {/* Live Preview Card */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-extrabold text-brand-ink">Pré-visualização (WhatsApp)</h3>
              </div>
              <span className="text-[11px] font-mono text-brand-muted">Simulação ao vivo</span>
            </div>

            <div className="rounded-2xl border border-emerald-700/20 bg-[#efeae2] p-4 text-xs shadow-inner">
              {/* WhatsApp Balloon */}
              <div className="relative rounded-2xl rounded-tl-xs bg-white p-3.5 shadow-xs">
                {title && <p className="mb-1 font-extrabold text-emerald-800">{title}</p>}
                <p className="whitespace-pre-wrap font-sans text-slate-800">
                  {preview?.rendered || bodyMd || "Texto da mensagem..."}
                </p>
                <div className="mt-1 flex justify-end">
                  <span className="text-[10px] text-slate-400">10:30 ✓✓</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Test Dispatch Card */}
          <Card className="flex flex-col gap-3">
            <div className="border-b border-brand-border/60 pb-2">
              <h3 className="text-sm font-extrabold text-brand-ink">Testar Envio Real</h3>
              <p className="text-xs text-brand-muted">
                Dispare este template para um número ou e-mail de teste.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <TextField
                label="WhatsApp de Teste"
                placeholder="(11) 99999-9999"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
              <TextField
                label="E-mail de Teste (Opcional)"
                placeholder="seuemail@exemplo.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />

              <Button
                type="button"
                onClick={handleTestSend}
                loading={testing}
                variant="secondary"
                className="w-full text-xs font-bold"
              >
                Enviar Mensagem de Teste
              </Button>
            </div>
          </Card>

          {/* Recent Delivery History Card */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-2">
              <h3 className="text-sm font-extrabold text-brand-ink">Últimos Envios</h3>
              <span className="text-xs font-bold text-brand-muted">{history.length}</span>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-brand-muted">Nenhum envio recente registrado.</p>
            ) : (
              <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
                {history.slice(0, 8).map((h) => (
                  <div
                    key={h.external_id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-brand-ink">
                        {h.title || h.recipient_phone || "Notificação"}
                      </p>
                      <p className="text-[11px] text-brand-muted font-mono">{h.created_at?.slice(0, 16)}</p>
                    </div>
                    <StatusPill
                      status={h.whatsapp_status || "sent"}
                      tone={h.whatsapp_error ? "danger" : "green"}
                      label={h.whatsapp_status || "Enviado"}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Confirm Restore Dialog */}
      <ConfirmDialog
        open={confirmRestore}
        title="Restaurar template original?"
        confirmLabel="Restaurar para o Padrão"
        onCancel={() => setConfirmRestore(false)}
        onConfirm={handleRestoreSeed}
        body="Esta ação substituirá o texto atual pelo template de fábrica original do sistema."
      />
    </div>
  );
}
