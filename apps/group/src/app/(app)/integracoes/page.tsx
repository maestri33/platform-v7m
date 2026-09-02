"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorBox } from "@/components/ui/error-box";
import { PageShell } from "@/components/ui/page-shell";
import { Spinner, EmptyState } from "@/components/ui/spinner";
import { StatusPill } from "@/components/ui/status-pill";
import {
  getErrorMessage,
  listIntegrations,
  setupIntegration,
  testIntegration,
  type Integration,
} from "@/lib/api";

function name(i: Integration): string {
  return typeof i.name === "string" ? i.name : "integração";
}

/** Tenta achar um booleano de "saúde/ok" no shape solto da integração. */
function healthy(i: Integration): boolean | null {
  for (const k of ["healthy", "ok", "configured", "ready", "env_present"]) {
    const v = i[k];
    if (typeof v === "boolean") return v;
  }
  return null;
}

function prettify(key: string): string {
  return key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Renderiza o detalhe solto de uma integração como lista chave→valor (sem dump cru). */
function Detail({ data }: { data: Integration }) {
  const entries = Object.entries(data).filter(([k]) => k !== "name");
  if (entries.length === 0) return null;
  return (
    <dl className="mt-1 flex flex-col gap-1 rounded-xl border border-brand-border bg-white/50 p-3 text-[13px]">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-3">
          <dt className="text-brand-muted">{prettify(k)}</dt>
          <dd className="max-w-[60%] break-words text-right font-semibold text-brand-ink">
            {typeof v === "boolean" ? (v ? "sim" : "não") : v == null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function IntegracoesPage() {
  const [list, setList] = useState<Integration[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    listIntegrations()
      .then(setList)
      .catch((e: unknown) => {
        setError(getErrorMessage(e));
        setList([]);
      });
  }

  useEffect(load, []);

  return (
    <PageShell title="Integrações" subtitle="Saúde e configuração dos serviços externos (Asaas, IA, etc.).">
      <ErrorBox message={error} />
      {list === null ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : list.length === 0 ? (
        <EmptyState label="Nenhuma integração reportada." />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {list.map((it) => (
            <IntegrationCard key={name(it)} integration={it} onChanged={load} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function IntegrationCard({ integration, onChanged }: { integration: Integration; onChanged: () => void }) {
  const [data, setData] = useState<Integration>(integration);
  const [busy, setBusy] = useState<"setup" | "test" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const h = healthy(data);
  const n = name(data);

  async function run(action: "setup" | "test") {
    setError(null);
    setBusy(action);
    try {
      const res = action === "setup" ? await setupIntegration(n) : await testIntegration(n);
      setData(res ?? data);
      onChanged();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="card-in flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-extrabold capitalize text-brand-ink">{n}</h3>
        {h === null ? (
          <StatusPill status="unknown" tone="neutral" label="Sem leitura" />
        ) : (
          <StatusPill status={h ? "ok" : "failed"} label={h ? "Saudável" : "Atenção"} />
        )}
      </div>

      {open ? <Detail data={data} /> : null}

      <ErrorBox message={error} />

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" className="min-h-11 flex-1 px-4 text-base" loading={busy === "test"} onClick={() => run("test")}>
          Testar
        </Button>
        <Button variant="secondary" className="min-h-11 flex-1 px-4 text-base" loading={busy === "setup"} onClick={() => run("setup")}>
          Configurar
        </Button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="min-h-11 shrink-0 px-3 text-sm font-bold text-brand-muted hover:text-brand-blue"
        >
          {open ? "Ocultar" : "Detalhes"}
        </button>
      </div>
    </Card>
  );
}
