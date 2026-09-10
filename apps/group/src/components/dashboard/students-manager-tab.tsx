"use client";

import { useState } from "react";

import { Card } from "@v7m/ui";
import { Spinner, EmptyState } from "@v7m/ui";
import { StatusPill } from "@v7m/ui";
import { EditCredentialsModal } from "@/components/dashboard/edit-credentials-modal";
import type { EnrollmentRow, Hub, StudentRow } from "@/lib/api";

interface StudentsManagerTabProps {
  students: StudentRow[] | null;
  enrollments: EnrollmentRow[] | null;
  hubs: Hub[] | null;
  loading: boolean;
  onRefresh: () => void;
}

export function StudentsManagerTab({
  students,
  enrollments,
  hubs,
  loading,
  onRefresh,
}: StudentsManagerTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"students" | "enrollments">("students");
  const [search, setSearch] = useState("");
  const [selectedHub, setSelectedHub] = useState<string>("all");

  // Modal credenciais
  const [editingStudent, setEditingStudent] = useState<{ id: string; name: string } | null>(null);

  const hubMap = new Map((hubs ?? []).map((h) => [h.external_id, h.brand]));

  const filteredStudents = (students ?? []).filter((s) => {
    const hId = String(s.hub_external_id || s.hub_id || s.hub || "");
    if (selectedHub !== "all" && hId !== selectedHub) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = String(s.name || s.student_name || "").toLowerCase();
    const cpf = String(s.cpf || "").toLowerCase();
    const phone = String(s.phone || "").toLowerCase();
    const id = String(s.external_id || "").toLowerCase();
    return name.includes(q) || cpf.includes(q) || phone.includes(q) || id.includes(q);
  });

  const filteredEnrollments = (enrollments ?? []).filter((e) => {
    const hId = String(e.hub_external_id || e.hub_id || e.hub || "");
    if (selectedHub !== "all" && hId !== selectedHub) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = String(e.student_name || e.name || "").toLowerCase();
    const status = String(e.status || "").toLowerCase();
    const id = String(e.external_id || "").toLowerCase();
    return name.includes(q) || status.includes(q) || id.includes(q);
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Top stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-brand-border bg-white p-4">
          <span className="text-xs font-bold text-brand-muted">Total de Alunos Concluídos</span>
          <p className="text-2xl font-black text-brand-ink">{students?.length ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-brand-border bg-white p-4">
          <span className="text-xs font-bold text-brand-muted">Matrículas Ativas / Em Curso</span>
          <p className="text-2xl font-black text-brand-blue">{enrollments?.length ?? 0}</p>
        </div>
      </div>

      <Card className="flex flex-col gap-4">
        {/* Header & Subtabs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-brand-border/60 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-brand-ink">Gestão de Alunos e Matrículas</h2>
            <p className="text-xs text-brand-muted">
              Consulte dados acadêmicos, status do curso e gerencie as credenciais da plataforma.
            </p>
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveSubTab("students")}
              className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-bold transition ${
                activeSubTab === "students"
                  ? "bg-white text-brand-ink shadow-xs"
                  : "text-brand-muted hover:text-brand-ink"
              }`}
            >
              Alunos ({students?.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("enrollments")}
              className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-bold transition ${
                activeSubTab === "enrollments"
                  ? "bg-white text-brand-ink shadow-xs"
                  : "text-brand-muted hover:text-brand-ink"
              }`}
            >
              Matrículas ({enrollments?.length ?? 0})
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
          <div className="sm:col-span-8 relative">
            <input
              type="text"
              placeholder="Buscar por nome, CPF, telefone ou ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-brand-border bg-slate-50 px-3.5 py-2 pl-9 text-xs text-brand-ink transition placeholder:text-brand-muted focus:border-brand-blue focus:bg-white focus:outline-none"
            />
            <svg
              className="absolute left-3 top-2.5 size-4 text-brand-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <div className="sm:col-span-4">
            <select
              aria-label="Filtrar alunos por polo"
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
              className="w-full rounded-xl border border-brand-border bg-slate-50 px-3 py-2 text-xs font-bold text-brand-ink focus:border-brand-blue focus:bg-white focus:outline-none"
            >
              <option value="all">Todos os Polos</option>
              {(hubs ?? []).map((h) => (
                <option key={h.external_id} value={h.external_id}>
                  {h.brand}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : activeSubTab === "students" ? (
          filteredStudents.length === 0 ? (
            <EmptyState label="Nenhum aluno encontrado." />
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredStudents.map((st, idx) => {
                const extId = String(st.external_id || idx);
                const name = String(st.name || st.student_name || "Aluno");
                const phone = String(st.phone || "—");
                const cpf = String(st.cpf || "—");
                const status = String(st.status || "concluído");
                const hubId = String(st.hub_external_id || st.hub_id || st.hub || "");
                const hubBrand = hubMap.get(hubId) || "Padrão";

                return (
                  <div
                    key={extId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border bg-white p-4 shadow-xs transition hover:border-brand-blue/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-brand-ink">{name}</span>
                        <StatusPill status={status} />
                        <span className="rounded bg-brand-blue-bg px-2 py-0.5 text-[11px] font-extrabold text-brand-blue">
                          {hubBrand}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-brand-muted">
                        <span>CPF: <strong className="text-brand-ink">{cpf}</strong></span>
                        <span>· Tel: <strong className="text-brand-ink">{phone}</strong></span>
                        <span>· ID: <span className="font-mono">{extId.slice(0, 8)}…</span></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingStudent({ id: extId, name })}
                        className="cursor-pointer rounded-xl border border-brand-border bg-slate-50 px-3 py-1.5 text-xs font-bold text-brand-ink hover:bg-slate-100"
                      >
                        Credenciais Plataforma
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          filteredEnrollments.length === 0 ? (
            <EmptyState label="Nenhuma matrícula encontrada." />
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredEnrollments.map((en, idx) => {
                const extId = String(en.external_id || idx);
                const name = String(en.student_name || en.name || "Matrícula");
                const status = String(en.status || "ativa");
                const hubId = String(en.hub_external_id || en.hub_id || en.hub || "");
                const hubBrand = hubMap.get(hubId) || "Padrão";

                return (
                  <div
                    key={extId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border bg-white p-4 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-brand-ink">{name}</span>
                        <StatusPill status={status} />
                        <span className="rounded bg-brand-blue-bg px-2 py-0.5 text-[11px] font-extrabold text-brand-blue">
                          {hubBrand}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-brand-muted font-mono">
                        Matrícula #{extId.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </Card>

      {/* Modal de Credenciais */}
      <EditCredentialsModal
        open={editingStudent !== null}
        studentId={editingStudent?.id || null}
        studentName={editingStudent?.name || ""}
        onClose={() => setEditingStudent(null)}
        onSuccess={onRefresh}
      />
    </div>
  );
}
