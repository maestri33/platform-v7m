"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiCollaborators } from "@/lib/api-collaborators";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate-funnel";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { GraduationCap, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

type Level = "fundamental" | "medio" | "superior";
type EducationStatus = "completed" | "attending" | "stopped";

export function EscolaridadeForm() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [level, setLevel] = React.useState<Level>("medio");
  const [status, setStatus] = React.useState<EducationStatus>("completed");
  const [grade, setGrade] = React.useState<number>(3);
  const [year, setYear] = React.useState<string>(String(new Date().getFullYear() - 2));
  const [city, setCity] = React.useState<string>("");
  const [school, setSchool] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    const isCompleted = status === "completed";

    startTransition(async () => {
      try {
        await apiCollaborators.setCandidateEducation({
          level,
          completed: isCompleted,
          grade: Number(grade) || 3,
          last_completed_grade: isCompleted ? Number(grade) || 3 : Math.max(1, (Number(grade) || 3) - 1),
          education_status: status,
          year: year ? parseInt(year, 10) : undefined,
          city: city.trim() || undefined,
          school: school.trim() || undefined,
        });

        router.push(NEXT_STAGE.education);
      } catch (err: unknown) {
        const errObj = err as { code?: string; extra?: { expected_status?: string }; message?: string };
        const redirectTo = wrongStatusHref(errObj.code, errObj.extra?.expected_status, "/onboarding/escolaridade");
        if (redirectTo) {
          router.push(redirectTo);
          return;
        }
        setError(errObj.message || "Erro ao salvar escolaridade. Verifique os dados e tente novamente.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nível de Ensino */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-brand-muted">
          Qual seu nível de escolaridade?
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "fundamental", label: "Fundamental" },
            { id: "medio", label: "Ensino Médio" },
            { id: "superior", label: "Ensino Superior" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLevel(item.id as Level)}
              className={`rounded-xl border p-3 text-xs font-bold text-center transition ${
                level === item.id
                  ? "border-brand-blue bg-brand-blue/10 text-brand-blue ring-2 ring-brand-blue/20"
                  : "border-brand-border bg-white text-brand-ink hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Situação Atual */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-brand-muted">
          Situação
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "completed", label: "Concluído ✓" },
            { id: "attending", label: "Cursando 📖" },
            { id: "stopped", label: "Incompleto / Pausado ⏸️" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatus(item.id as EducationStatus)}
              className={`rounded-xl border p-3 text-xs font-bold text-center transition ${
                status === item.id
                  ? "border-brand-blue bg-brand-blue/10 text-brand-blue ring-2 ring-brand-blue/20"
                  : "border-brand-border bg-white text-brand-ink hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campos Complementares */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-brand-ink">
            Ano de Conclusão / Saída (Opcional)
          </label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Ex: 2022"
            min="1950"
            max={new Date().getFullYear()}
            className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-brand-ink">
            Cidade da Escola / Faculdade (Opcional)
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Campinas - SP"
            className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-brand-ink">
          Nome da Instituição de Ensino (Opcional)
        </label>
        <input
          type="text"
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          placeholder="Ex: Escola Estadual Rui Barbosa"
          className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-ink focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-700">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Spinner /> : "Salvar e Continuar"}
      </Button>

      <div className="pt-2 flex justify-between items-center text-xs">
        <Link
          href="/onboarding"
          className="text-brand-muted hover:text-brand-ink transition underline"
        >
          Voltar ao resumo
        </Link>
        <Link
          href="/vendas"
          className="text-brand-blue font-semibold hover:underline inline-flex items-center gap-1"
        >
          Ir ao Painel de Vendas <ArrowRight className="size-3" />
        </Link>
      </div>
    </form>
  );
}
