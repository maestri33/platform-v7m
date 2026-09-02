"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getErrorMessage,
  type NotifyEventOut,
  type NotifyNotificationOut,
  type NotifyPreviewOut,
  type NotifyStatsOut,
  type NotifyTemplateOut,
  type NotifyTtsConfigOut,
  type NotifyTtsProbeOut,
  notifyAiAssist,
  notifyListEvents,
  notifyGetTemplate,
  notifyHistory,
  notifyPatchTemplate,
  notifyPreview,
  notifyRestoreSeed,
  notifyStats,
  notifyTest,
  notifyTtsConfig,
  notifyTtsProbe,
} from "@/lib/api";

/* ── helpers ── */

export const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
};

export const MEDIA_TYPES = [
  { value: "image", label: "Imagem" },
  { value: "video", label: "Vídeo" },
  { value: "audio", label: "Áudio" },
  { value: "document", label: "Documento" },
];

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function cleanChannels(channels: string): string {
  return channels
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c !== "tts" && c !== "")
    .join(",") || "whatsapp,email";
}

export interface TemplateFormState {
  title?: string | null;
  subject?: string | null;
  body_md?: string;
  channels?: string;
  is_tts?: boolean;
  media_url?: string | null;
  media_type?: string | null;
  mail_template?: string;
  notes?: string | null;
  [key: string]: unknown;
}

/* ── hook ── */

export function useNotificacoes() {
  const HISTORY_PAGE = 25;
  const [stats, setStats] = useState<NotifyStatsOut | null>(null);
  const [events, setEvents] = useState<NotifyEventOut[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [tpl, setTpl] = useState<NotifyTemplateOut | null>(null);
  const [form, setForm] = useState<TemplateFormState>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [preview, setPreview] = useState<NotifyPreviewOut | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [history, setHistory] = useState<NotifyNotificationOut[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmTest, setConfirmTest] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDiff, setAiDiff] = useState<{
    original: string;
    suggestion: string;
    action: string;
  } | null>(null);

  /* tts studio state */
  const [ttsConfig, setTtsConfig] = useState<NotifyTtsConfigOut | null>(null);
  const [ttsProbe, setTtsProbe] = useState<NotifyTtsProbeOut | null>(null);
  const [ttsBusy, setTtsBusy] = useState(false);
  const [ttsGender, setTtsGender] = useState<string>("default");

  /* load initial stats + events + history + tts config */
  const loadInitial = useCallback(async () => {
    try {
      const [s, evs, h, tc] = await Promise.all([
        notifyStats().catch(() => null),
        notifyListEvents().catch(() => []),
        notifyHistory(100).catch(() => []),
        notifyTtsConfig().catch(() => null),
      ]);
      if (s) setStats(s);
      if (evs) setEvents(evs);
      if (h) setHistory(h);
      if (tc) setTtsConfig(tc);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  /* load template on event select */
  useEffect(() => {
    if (!selectedEvent) {
      setTpl(null);
      setForm({});
      setDirty(false);
      return;
    }
    let cancelled = false;
    setLoadingTpl(true);
    setError(null);
    setOk(null);
    notifyGetTemplate(selectedEvent)
      .then((t) => {
        if (cancelled) return;
        setTpl(t);
        setForm({
          title: t.title ?? "",
          subject: t.subject ?? "",
          body_md: t.body_md,
          channels: cleanChannels(t.channels),
          is_tts: t.is_tts,
          media_url: t.media_url ?? "",
          media_type: t.media_type ?? "",
          mail_template: t.mail_template,
          notes: t.notes ?? "",
        });
        setDirty(false);
        setLoadingTpl(false);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
        if (!cancelled) setLoadingTpl(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedEvent]);

  /* form helpers */
  function updateField(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setOk(null);
  }

  function handleChannelToggle(channel: string) {
    const current = (form.channels as string) || "";
    const list = current
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c !== "tts" && c !== "");
    const set = new Set(list);
    if (set.has(channel)) set.delete(channel);
    else set.add(channel);
    updateField("channels", Array.from(set).join(","));
  }

  /* patch data for dirty tracking */
  const patchData = useMemo(() => {
    if (!tpl) return {};
    const d: Record<string, unknown> = {};
    if (form.title !== (tpl.title ?? "")) d.title = form.title || null;
    if (form.subject !== (tpl.subject ?? "")) d.subject = form.subject || null;
    if (form.body_md !== tpl.body_md) d.body_md = form.body_md;
    if (form.channels !== cleanChannels(tpl.channels)) d.channels = form.channels;
    if (form.is_tts !== tpl.is_tts) d.is_tts = form.is_tts;
    if (form.media_url !== (tpl.media_url ?? "")) d.media_url = form.media_url || null;
    if (form.media_type !== (tpl.media_type ?? "")) d.media_type = form.media_type || null;
    if (form.mail_template !== tpl.mail_template) d.mail_template = form.mail_template;
    if (form.notes !== (tpl.notes ?? "")) d.notes = form.notes || null;
    return d;
  }, [form, tpl]);

  /* save template */
  async function handleSave() {
    if (!selectedEvent || Object.keys(patchData).length === 0) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const updated = await notifyPatchTemplate(selectedEvent, patchData);
      setTpl(updated);
      setDirty(false);
      setOk("Template salvo com sucesso.");
      void loadInitial();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  /* ai assist */
  async function handleAiAssist(
    action: "improve" | "simplify" | "shorten" | "fix" | "persuade" | "custom" = "improve",
    customPrompt?: string,
  ) {
    const currentText = form.body_md ?? "";
    if (!currentText.trim()) return;
    setAiLoading(true);
    setError(null);
    try {
      const res = await notifyAiAssist({ text: currentText, action, custom_prompt: customPrompt });
      if (res.text) {
        setAiDiff({
          original: currentText,
          suggestion: res.text,
          action: res.action || action,
        });
      }
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setAiLoading(false);
    }
  }

  function handleApplyAiSuggestion() {
    if (!aiDiff) return;
    updateField("body_md", aiDiff.suggestion);
    setAiDiff(null);
    setOk("Texto atualizado com a sugestão da IA!");
  }

  function handleDiscardAiSuggestion() {
    setAiDiff(null);
  }

  /* preview */
  async function handlePreview(ctx?: Record<string, string>) {
    if (!selectedEvent) return;
    setPreviewBusy(true);
    setError(null);
    try {
      const p = await notifyPreview(selectedEvent, ctx);
      setPreview(p);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setPreviewBusy(false);
    }
  }

  /* test send */
  async function handleTest(ctx?: Record<string, string>) {
    if (!selectedEvent) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const activeChannels = typeof form.channels === "string"
        ? form.channels.split(",").map((c: string) => c.trim()).filter((c: string) => c !== "tts" && c !== "")
        : undefined;
      const res = await notifyTest(selectedEvent, activeChannels, ctx);
      setOk(`Disparo de teste enviado! ID: ${res.external_id}`);
      void loadInitial();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
      setConfirmTest(false);
    }
  }

  /* restore seed */
  async function handleRestore() {
    if (!selectedEvent) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const t = await notifyRestoreSeed(selectedEvent);
      setTpl(t);
      setForm({
        title: t.title ?? "",
        subject: t.subject ?? "",
        body_md: t.body_md,
        channels: cleanChannels(t.channels),
        is_tts: t.is_tts,
        media_url: t.media_url ?? "",
        media_type: t.media_type ?? "",
        mail_template: t.mail_template,
        notes: t.notes ?? "",
      });
      setDirty(false);
      setOk("Template restaurado do seed.");
      void loadInitial();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
      setConfirmRestore(false);
    }
  }

  /* confirm switch event */
  function handleSwitchConfirm() {
    setConfirmSwitch(false);
    setSelectedEvent(pendingEvent);
  }

  /* tts probe handler */
  async function handleTtsProbe(textOverride?: string) {
    const textToSynthesize =
      textOverride ||
      form.body_md ||
      "Olá Victor, esta é uma demonstração da síntese de voz natural do V7M via OmniRoute.";
    setTtsBusy(true);
    setError(null);
    try {
      const res = await notifyTtsProbe({
        text: textToSynthesize,
        gender: ttsGender === "default" ? null : ttsGender,
      });
      setTtsProbe(res);
      if (res.ok && res.audio_url) {
        setOk(`Áudio sintetizado com sucesso! (Voz: ${res.voice_used})`);
      } else {
        setError("Não foi possível sintetizar o áudio no OmniRoute.");
      }
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setTtsBusy(false);
    }
  }

  /* event dropdown options */
  const eventOptions = useMemo(
    () =>
      events.map((e) => ({
        value: e.event,
        label: `${e.event}${e.has_template ? "" : " (sem template)"}`,
      })),
    [events],
  );

  /* history visible slice */
  const historySlice = history.slice(0, historyPage * HISTORY_PAGE);
  const hasMoreHistory = history.length > historyPage * HISTORY_PAGE;

  return {
    /* data */
    stats,
    events,
    history,
    historySlice,
    hasMoreHistory,
    /* selection */
    selectedEvent,
    setSelectedEvent,
    tpl,
    /* form */
    form,
    updateField,
    dirty,
    patchData,
    /* ui */
    busy,
    loadingTpl,
    error,
    ok,
    setError,
    setOk,
    /* preview */
    preview,
    setPreview,
    previewBusy,
    /* confirm dialogs */
    confirmTest,
    setConfirmTest,
    confirmRestore,
    setConfirmRestore,
    confirmSwitch,
    setConfirmSwitch,
    pendingEvent,
    setPendingEvent,
    /* history */
    showHistory,
    setShowHistory,
    historyPage,
    setHistoryPage,
    HISTORY_PAGE,
    /* ai */
    aiLoading,
    aiDiff,
    setAiDiff,
    handleAiAssist,
    handleApplyAiSuggestion,
    handleDiscardAiSuggestion,
    handleChannelToggle,
    /* tts studio */
    ttsConfig,
    ttsProbe,
    ttsBusy,
    ttsGender,
    setTtsGender,
    handleTtsProbe,
    /* handlers */
    handleSave,
    handlePreview,
    handleTest,
    handleRestore,
    handleSwitchConfirm,
    /* options */
    eventOptions,
    /* reload */
    loadInitial,
  };
}
