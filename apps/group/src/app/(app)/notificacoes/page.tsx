"use client";

import { Button } from "@v7m/ui";
import { ConfirmDialog } from "@v7m/ui";
import { ErrorBox } from "@v7m/ui";
import { PageShell } from "@v7m/ui";
import { SelectField } from "@v7m/ui";
import { StatCard } from "@v7m/ui";
import { StatusPill } from "@v7m/ui";
import { TextField } from "@v7m/ui";

import {
  CHANNEL_LABELS,
  formatDate,
  MEDIA_TYPES,
  useNotificacoes,
} from "./use-notificacoes";

export default function NotificacoesPage() {
  const ctx = useNotificacoes();

  return (
    <PageShell
      title="Notificações"
      subtitle="Gerencie templates, triggers e envios de notificações."
    >
      {/* Stats */}
      {ctx.stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total" value={ctx.stats.total} />
          <StatCard label="Ativos" value={ctx.stats.active} tone="green" />
          <StatCard label="Inativos" value={ctx.stats.inactive} tone="amber" />
          <StatCard label="Com mídia" value={ctx.stats.with_media} tone="blue" />
        </div>
      )}

      {ctx.stats && (
        <div className="mb-6 flex flex-wrap gap-2">
          {Object.entries(ctx.stats.by_channel)
            .filter(([ch]) => ch !== "tts")
            .map(([ch, count]) => (
              <span
                key={ch}
                className="rounded-full bg-brand-bg px-3 py-1 text-[13px] font-bold text-brand-muted"
              >
                {CHANNEL_LABELS[ch] ?? ch}: {count}
              </span>
            ))}
          {ctx.stats.with_tts > 0 && (
            <span className="rounded-full bg-brand-amber-bg px-3 py-1 text-[13px] font-bold text-brand-amber">
              TTS: {ctx.stats.with_tts}
            </span>
          )}
        </div>
      )}

      {/* Event selector */}
      <div className="mb-6 max-w-md">
        <SelectField
          label="Evento"
          placeholder="Selecione um evento…"
          options={ctx.eventOptions}
          value={ctx.selectedEvent}
          onChange={(e) => {
            const next = e.target.value;
            if (ctx.dirty && ctx.selectedEvent) {
              ctx.setPendingEvent(next);
              ctx.setConfirmSwitch(true);
            } else {
              ctx.setSelectedEvent(next);
            }
          }}
        />
      </div>

      <ErrorBox message={ctx.error} />
      {ctx.ok && <ErrorBox message={ctx.ok} success />}

      {/* ── Loading skeleton ── */}
      {ctx.loadingTpl && (
        <div className="mb-8 animate-pulse rounded-2xl border border-brand-border bg-white/50 p-5">
          <div className="mb-4 h-6 w-48 rounded-lg bg-brand-border/50" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-10 rounded-xl bg-brand-border/30" />
            <div className="h-10 rounded-xl bg-brand-border/30" />
          </div>
          <div className="mt-4 h-24 rounded-xl bg-brand-border/30" />
          <div className="mt-4 flex gap-3">
            <div className="h-8 w-20 rounded-full bg-brand-border/30" />
            <div className="h-8 w-20 rounded-full bg-brand-border/30" />
          </div>
        </div>
      )}

      {/* ── Template editor ── */}
      {!ctx.loadingTpl && ctx.tpl && (
        <div className="mb-8 rounded-2xl border border-brand-border bg-white/70 p-5 shadow-sm backdrop-blur-md">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-extrabold text-brand-ink">
              {ctx.tpl.event}
            </h2>
            {ctx.tpl.trigger ? (
              <StatusPill
                status={ctx.tpl.trigger.active ? "active" : "inactive"}
                label={ctx.tpl.trigger.active ? "Trigger ativo" : "Trigger inativo"}
              />
            ) : (
              <StatusPill status="neutral" label="Sem trigger" />
            )}
            <span className="text-[13px] text-brand-muted">
              Atualizado: {formatDate(ctx.tpl.updated_at)}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Título"
              placeholder="Título da notificação"
              value={String(ctx.form.title ?? "")}
              onChange={(e) => ctx.updateField("title", e.target.value)}
            />
            <TextField
              label="Assunto"
              placeholder="Assunto do e-mail"
              value={String(ctx.form.subject ?? "")}
              onChange={(e) => ctx.updateField("subject", e.target.value)}
            />
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="body_md" className="text-[15px] font-bold text-brand-ink">
                Corpo (Markdown)
              </label>

              {/* AI Assistant Actions */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[12px] font-bold text-brand-purple">✨ Assistente IA:</span>
                <button
                  type="button"
                  disabled={ctx.aiLoading || !String(ctx.form.body_md ?? "").trim()}
                  onClick={() => ctx.handleAiAssist("improve")}
                  className="rounded-lg border border-brand-purple/40 bg-brand-purple-bg px-2.5 py-1 text-[12px] font-bold text-brand-purple transition hover:bg-brand-purple hover:text-white disabled:opacity-50"
                  title="Melhorar clareza, tom e fluidez preservando variáveis"
                >
                  {ctx.aiLoading ? "..." : "Melhorar"}
                </button>
                <button
                  type="button"
                  disabled={ctx.aiLoading || !String(ctx.form.body_md ?? "").trim()}
                  onClick={() => ctx.handleAiAssist("simplify")}
                  className="rounded-lg border border-brand-blue/40 bg-brand-blue-bg px-2.5 py-1 text-[12px] font-bold text-brand-blue transition hover:bg-brand-blue hover:text-white disabled:opacity-50"
                  title="Tornar mais direto e simples de entender"
                >
                  Simplificar
                </button>
                <button
                  type="button"
                  disabled={ctx.aiLoading || !String(ctx.form.body_md ?? "").trim()}
                  onClick={() => ctx.handleAiAssist("shorten")}
                  className="rounded-lg border border-brand-border bg-brand-bg px-2.5 py-1 text-[12px] font-bold text-brand-ink transition hover:border-brand-blue-bright hover:bg-brand-blue-bright/10 disabled:opacity-50"
                  title="Encurtar a mensagem mantendo o essencial"
                >
                  Encurtar
                </button>
                <button
                  type="button"
                  disabled={ctx.aiLoading || !String(ctx.form.body_md ?? "").trim()}
                  onClick={() => ctx.handleAiAssist("fix")}
                  className="rounded-lg border border-brand-green/40 bg-brand-green-bg px-2.5 py-1 text-[12px] font-bold text-brand-green-dark transition hover:bg-brand-green-dark hover:text-white disabled:opacity-50"
                  title="Corrigir gramática e pontuação em português"
                >
                  Corrigir
                </button>
                <button
                  type="button"
                  disabled={ctx.aiLoading || !String(ctx.form.body_md ?? "").trim()}
                  onClick={() => ctx.handleAiAssist("persuade")}
                  className="rounded-lg border border-brand-amber/40 bg-brand-amber-bg px-2.5 py-1 text-[12px] font-bold text-brand-amber transition hover:bg-brand-amber hover:text-white disabled:opacity-50"
                  title="Tornar mais persuasivo e motivador"
                >
                  Persuadir
                </button>
              </div>
            </div>

            <textarea
              id="body_md"
              rows={6}
              className="mt-2 w-full rounded-xl border-2 border-brand-border bg-white/55 px-4 py-3 text-[15px] text-brand-ink outline-none backdrop-blur-md transition placeholder:text-brand-muted/70 focus:border-brand-blue-bright focus:ring-4 focus:ring-brand-blue-bright/25"
              value={String(ctx.form.body_md ?? "")}
              onChange={(e) => ctx.updateField("body_md", e.target.value)}
            />
            {ctx.aiLoading && (
              <div className="mt-1 flex items-center gap-2 text-[12px] font-medium text-brand-purple animate-pulse">
                <span>✨ A inteligência artificial está refinando a mensagem mantendo as variáveis...</span>
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-brand-muted">
              <span className="font-semibold text-brand-ink">Variáveis disponíveis:</span>
              {[
                "{nome}",
                "{nome_completo}",
                "{codigo}",
                "{ttl_minutos}",
                "{link}",
                "{payment_link}",
                "{valor}",
                "{login}",
                "{senha}",
                "{data}",
                "{hora}",
                "{numero}",
                "{aluno_nome}",
              ].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    const cur = String(ctx.form.body_md ?? "");
                    ctx.updateField("body_md", cur ? `${cur} ${v}` : v);
                  }}
                  className="rounded-md border border-brand-border/80 bg-brand-bg px-2 py-0.5 font-mono text-[11px] text-brand-ink transition hover:border-brand-blue-bright hover:bg-brand-blue-bright/10"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <fieldset className="mt-4">
            <legend className="text-[15px] font-bold text-brand-ink">Canais</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {(["whatsapp", "email"] as const).map((ch) => {
                const channels = String(ctx.form.channels ?? "");
                const checked = channels.split(",").includes(ch);
                return (
                  <label key={ch} className="flex items-center gap-2 text-[14px]">
                    <input
                      type="checkbox"
                      className="size-4 accent-brand-green-dark"
                      checked={checked}
                      onChange={() => {
                        const parts = channels
                          .split(",")
                          .map((c) => c.trim())
                          .filter(Boolean);
                        const next = checked
                          ? parts.filter((c) => c !== ch)
                          : [...parts, ch];
                        ctx.updateField("channels", next.join(","));
                      }}
                    />
                    {CHANNEL_LABELS[ch] ?? ch}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-[14px]">
              <input
                type="checkbox"
                className="size-4 accent-brand-green-dark"
                checked={!!ctx.form.is_tts}
                onChange={() => ctx.updateField("is_tts", !ctx.form.is_tts)}
              />
              <span>
                <span className="font-bold">TTS (Áudio)</span>
                <span className="ml-1.5 text-brand-muted">
                  — síntese de voz 100% no backend (OmniRoute 10.0.1.35) e envio como áudio WhatsApp
                </span>
              </span>
            </label>
          </div>

          {/* ── Studio de Voz & Teste de TTS ── */}
          {!!ctx.form.is_tts && (
            <div className="mt-4 rounded-2xl border border-brand-amber-bd bg-brand-amber-bg/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-2 rounded-full bg-brand-amber animate-pulse" />
                  <h4 className="text-[13px] font-extrabold uppercase tracking-wider text-brand-amber-dark">
                    Estúdio de Voz & Teste TTS (OmniRoute)
                  </h4>
                </div>
                <span className="text-[12px] font-medium text-brand-muted">
                  Regra cruzada ativa: Homem ➔ Voz Feminina | Mulher ➔ Voz Masculina
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-[12px] font-bold text-brand-ink">Destinatário Simulado:</label>
                  <select
                    className="rounded-lg border border-brand-border bg-white px-2.5 py-1.5 text-[13px] font-medium text-brand-ink outline-none focus:border-brand-green"
                    value={ctx.ttsGender}
                    onChange={(e) => ctx.setTtsGender(e.target.value)}
                  >
                    <option value="default">Padrão / Desconhecido (Voz Feminina)</option>
                    <option value="M">Homem (M) ➔ Voz Feminina</option>
                    <option value="F">Mulher (F) ➔ Voz Masculina</option>
                  </select>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => ctx.handleTtsProbe()}
                  loading={ctx.ttsBusy}
                >
                  🎙️ Ouvir Síntese do Texto
                </Button>
              </div>

              {ctx.ttsProbe && ctx.ttsProbe.audio_url && (
                <div className="mt-3.5 flex flex-col gap-2 rounded-xl border border-brand-green-bd bg-white p-3">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-bold text-brand-green-dark">
                      ✓ Áudio gerado com sucesso ({ctx.ttsProbe.voice_used})
                    </span>
                    <span className="text-brand-muted">OmniRoute: {ctx.ttsProbe.omniroute_url}</span>
                  </div>
                  <audio
                    controls
                    autoPlay
                    src={ctx.ttsProbe.audio_url}
                    className="h-9 w-full"
                  />
                </div>
              )}

              {ctx.ttsConfig && ctx.ttsConfig.chain && ctx.ttsConfig.chain.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-brand-muted">
                  <span className="font-bold">Cadeia de Fallback:</span>
                  {ctx.ttsConfig.chain.map((c, idx) => (
                    <span key={c.model} className="rounded bg-white px-2 py-0.5 border border-brand-border font-mono">
                      {idx + 1}. {c.model} ({c.voice_female} / {c.voice_male})
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField
              label="URL de mídia"
              placeholder="https://..."
              value={String(ctx.form.media_url ?? "")}
              onChange={(e) => ctx.updateField("media_url", e.target.value)}
            />
            <SelectField
              label="Tipo de mídia"
              options={MEDIA_TYPES}
              placeholder="Nenhum"
              value={String(ctx.form.media_type ?? "")}
              onChange={(e) => ctx.updateField("media_type", e.target.value)}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField
              label="Template de e-mail"
              placeholder="default"
              value={String(ctx.form.mail_template ?? "")}
              onChange={(e) => ctx.updateField("mail_template", e.target.value)}
            />
            <TextField
              label="Notas"
              placeholder="Notas internas (não visíveis ao usuário)"
              value={String(ctx.form.notes ?? "")}
              onChange={(e) => ctx.updateField("notes", e.target.value)}
            />
          </div>

          
          {ctx.tpl.trigger && (
            <div className="mt-5 rounded-xl border border-brand-border bg-brand-bg/50 p-4">
              <h3 className="mb-2 text-[13px] font-extrabold uppercase tracking-wider text-brand-muted">
                Trigger
              </h3>
              <div className="grid gap-2 text-[14px] sm:grid-cols-3">
                <div>
                  <span className="font-bold text-brand-ink">Disparo: </span>
                  <span className="text-brand-muted">
                    {ctx.tpl.trigger.fires_on || "—"}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-brand-ink">Fonte: </span>
                  <span className="text-brand-muted">
                    {ctx.tpl.trigger.source || "—"}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-brand-ink">Atraso: </span>
                  <span className="text-brand-muted">
                    {ctx.tpl.trigger.delay_minutes} min
                  </span>
                </div>
              </div>
            </div>
          )}

          
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              onClick={ctx.handleSave}
              loading={ctx.busy}
              disabled={!ctx.dirty || !ctx.patchData}
            >
              Salvar
            </Button>
            <Button variant="secondary" onClick={() => ctx.handlePreview()} loading={ctx.previewBusy}>
              Preview
            </Button>
            <Button
              variant="secondary"
              onClick={() => ctx.setConfirmTest(true)}
              disabled={ctx.busy}
            >
              Testar
            </Button>
            <Button
              variant="secondary"
              onClick={() => ctx.setConfirmRestore(true)}
              disabled={ctx.busy}
              className="text-brand-danger"
            >
              Restaurar seed
            </Button>
          </div>
        </div>
      )}

      {/* ── Preview modal ── */}
      {ctx.preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Preview da notificação"
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/45 p-5 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) ctx.setPreview(null);
          }}
        >
          <div className="sheet-up flex w-full max-w-lg flex-col gap-4 rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-extrabold text-brand-ink">
              Preview: {ctx.preview.event}
            </h2>
            <div className="flex flex-wrap gap-2">
              {ctx.preview.channels
                .filter((ch) => ch !== "tts")
                .map((ch) => (
                  <span
                    key={ch}
                    className="rounded-full bg-brand-blue-bg px-2.5 py-0.5 text-[12px] font-bold text-brand-blue"
                  >
                    {CHANNEL_LABELS[ch] ?? ch}
                  </span>
                ))}
              {ctx.preview.is_tts && (
                <span className="rounded-full bg-brand-amber-bg px-2.5 py-0.5 text-[12px] font-bold text-brand-amber">
                  TTS
                </span>
              )}
            </div>
            <div>
              <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-brand-muted">
                Original (Markdown)
              </h3>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-brand-bg p-3 text-[13px] text-brand-muted">
                {ctx.preview.body_md}
              </pre>
            </div>
            <div>
              <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-brand-muted">
                Renderizado
              </h3>
              <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded-xl bg-brand-green-bg p-3 text-[14px] text-brand-ink">
                {ctx.preview.rendered}
              </pre>
            </div>
            <Button variant="secondary" onClick={() => ctx.setPreview(null)}>
              Fechar
            </Button>
          </div>
        </div>
      )}

      {/* ── AI Diff Modal ── */}
      {ctx.aiDiff && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sugestão do Assistente de IA"
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/45 p-5 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) ctx.handleDiscardAiSuggestion();
          }}
        >
          <div className="sheet-up flex w-full max-w-2xl flex-col gap-4 rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-3 rounded-full bg-brand-purple animate-pulse" />
                <h2 className="text-lg font-extrabold text-brand-ink">
                  ✨ Sugestão do Assistente de IA ({ctx.aiDiff.action})
                </h2>
              </div>
              <button
                type="button"
                onClick={ctx.handleDiscardAiSuggestion}
                className="text-brand-muted hover:text-brand-ink"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-brand-muted">
              Compare o texto original com a versão refinada pela IA. As variáveis foram mantidas intactas.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-brand-muted">
                  Texto Original
                </span>
                <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-xl border border-brand-border bg-slate-50 p-3.5 text-[13px] text-brand-muted font-mono">
                  {ctx.aiDiff.original}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-brand-purple">
                  Sugestão da IA
                </span>
                <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-xl border border-brand-purple/40 bg-brand-purple-bg/30 p-3.5 text-[13px] text-brand-ink font-mono font-medium">
                  {ctx.aiDiff.suggestion}
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-end gap-3 border-t border-brand-border pt-4">
              <Button
                variant="secondary"
                onClick={ctx.handleDiscardAiSuggestion}
              >
                Descartar
              </Button>
              <Button
                onClick={ctx.handleApplyAiSuggestion}
                className="bg-brand-purple hover:bg-brand-purple-dark text-white font-bold"
              >
                ✨ Substituir no Editor
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm switch event ── */}
      <ConfirmDialog
        open={ctx.confirmSwitch}
        title="Alterações não salvas"
        body={
          <>
            Você tem edições não salvas no template{" "}
            <strong>{ctx.selectedEvent}</strong>. Deseja descartar e trocar para{" "}
            <strong>{ctx.pendingEvent}</strong>?
          </>
        }
        confirmLabel="Descartar e trocar"
        tone="danger"
        onCancel={() => ctx.setConfirmSwitch(false)}
        onConfirm={ctx.handleSwitchConfirm}
      />

      {/* ── Confirm test ── */}
      <ConfirmDialog
        open={ctx.confirmTest}
        title="Enviar teste?"
        body={
          <>
            A notificação do evento <strong>{ctx.selectedEvent}</strong> será enviada
            para VOCÊ (staff logado) nos canais configurados no template.
          </>
        }
        confirmLabel="Enviar teste"
        onCancel={() => ctx.setConfirmTest(false)}
        onConfirm={() => ctx.handleTest()}
      />

      {/* ── Confirm restore ── */}
      <ConfirmDialog
        open={ctx.confirmRestore}
        title="Restaurar do seed?"
        body={
          <>
            O template do evento <strong>{ctx.selectedEvent}</strong> será
            sobrescrevido com o conteúdo original do seed. Suas edições serão
            perdidas.
          </>
        }
        confirmLabel="Restaurar"
        tone="danger"
        onCancel={() => ctx.setConfirmRestore(false)}
        onConfirm={ctx.handleRestore}
      />

      {/* ── History ── */}
      <div className="mt-8">
        <button
          type="button"
          onClick={() => {
            ctx.setShowHistory((v: boolean) => !v);
            ctx.setHistoryPage(1);
          }}
          className="mb-3 flex items-center gap-2 text-[15px] font-bold text-brand-ink"
        >
          <svg
            aria-hidden
            className={`size-4 transition ${ctx.showHistory ? "rotate-90" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
          Histórico de envios ({ctx.history.length})
        </button>

        {ctx.showHistory && ctx.historySlice.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-brand-border bg-white/70 shadow-sm backdrop-blur-md">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-brand-border bg-brand-bg/50">
                  <th className="px-3 py-2.5 font-extrabold text-brand-muted">Data</th>
                  <th className="px-3 py-2.5 font-extrabold text-brand-muted">Caller</th>
                  <th className="px-3 py-2.5 font-extrabold text-brand-muted">Destinatário</th>
                  <th className="px-3 py-2.5 font-extrabold text-brand-muted">Canais</th>
                  <th className="px-3 py-2.5 font-extrabold text-brand-muted">Texto</th>
                </tr>
              </thead>
              <tbody>
                {ctx.historySlice.map((n) => (
                  <tr
                    key={n.external_id}
                    className="border-b border-brand-border/50 last:border-0"
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-brand-muted">
                      {formatDate(n.created_at)}
                    </td>
                    <td className="max-w-[160px] truncate px-3 py-2 text-brand-muted">
                      {n.caller ?? "—"}
                    </td>
                    <td className="max-w-[160px] truncate px-3 py-2 text-brand-muted">
                      {n.recipient_phone || n.recipient_email || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {n.want_whatsapp && (
                          <StatusPill status={n.whatsapp_status} label="WA" />
                        )}
                        {n.want_email && (
                          <StatusPill status={n.email_status} label="Email" />
                        )}
                        {n.want_tts && (
                          <StatusPill status={n.tts_status} label="TTS" />
                        )}
                      </div>
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-brand-muted">
                      {n.text}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ctx.showHistory && ctx.hasMoreHistory && (
          <div className="mt-3 text-center">
            <Button
              variant="secondary"
              onClick={() => ctx.setHistoryPage((p) => p + 1)}
            >
              Carregar mais ({ctx.history.length - ctx.historyPage * ctx.HISTORY_PAGE} restantes)
            </Button>
          </div>
        )}

        {ctx.showHistory && ctx.history.length === 0 && (
          <p className="text-[14px] text-brand-muted">
            Nenhuma notificação enviada ainda.
          </p>
        )}
      </div>
    </PageShell>
  );
}
