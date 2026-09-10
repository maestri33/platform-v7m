"use client";

import { useEffect, useState } from "react";

import { Button } from "@v7m/ui";
import { DataTable, type Column } from "@/components/common/data-table";
import { ErrorBox } from "@v7m/ui";
import { PageShell } from "@v7m/ui";
import { StatusPill } from "@v7m/ui";
import { TextField } from "@v7m/ui";
import {
  getErrorMessage,
  listUsers,
  setStudentPlatformCredentials,
  setUserPhone,
  type PlatformUser,
} from "@/lib/api";
import { maskBrPhone, onlyDigits, isValidBrPhone } from "@/lib/phone";
import { maskCpf } from "@/lib/cpf";

const ROLE_FILTERS = [
  { value: "", label: "Todos" },
  { value: "lead", label: "Leads" },
  { value: "enrollment", label: "Matrícula" },
  { value: "student", label: "Alunos" },
  { value: "veteran", label: "Veteranos" },
  { value: "promoter", label: "Promotores" },
  { value: "coordinator", label: "Coordenadores" },
];

export default function UsuariosPage() {
  const [users, setUsers] = useState<PlatformUser[] | null>(null);
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phoneFor, setPhoneFor] = useState<PlatformUser | null>(null);
  const [credsFor, setCredsFor] = useState<PlatformUser | null>(null);

  function load() {
    setUsers(null);
    listUsers({ role: role || undefined, limit: 200 })
      .then(setUsers)
      .catch((e: unknown) => {
        setError(getErrorMessage(e));
        setUsers([]);
      });
  }

  useEffect(load, [role]);

  const columns: Column<PlatformUser>[] = [
    {
      header: "Nome",
      cell: (u) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold">{u.name || "—"}</span>
          {u.is_superuser ? <StatusPill status="staff" tone="blue" label="Staff" /> : null}
        </div>
      ),
    },
    { header: "CPF", cell: (u) => (u.cpf ? maskCpf(u.cpf) : "—"), className: "hidden sm:table-cell" },
    { header: "Telefone", cell: (u) => (u.phone ? maskBrPhone(u.phone) : "—") },
    {
      header: "Papéis",
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.length ? u.roles.map((r) => <StatusPill key={r} status={r} tone="neutral" label={r} />) : "—"}
        </div>
      ),
    },
    {
      header: "Ações",
      className: "text-right",
      cell: (u) => (
        <div className="flex justify-end gap-1.5">
          <SmallBtn onClick={() => setPhoneFor(u)}>Telefone</SmallBtn>
          {u.roles.includes("student") || u.roles.includes("veteran") ? (
            <SmallBtn onClick={() => setCredsFor(u)}>Credenciais</SmallBtn>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <PageShell title="Usuários" subtitle="Visão global dos usuários da plataforma e resgate de acesso.">
      <ErrorBox message={error} />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {ROLE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setRole(f.value)}
            className={`min-h-9 rounded-full px-3 py-1 text-[13px] font-bold transition ${
              role === f.value ? "bg-brand-blue text-white" : "bg-white/70 text-brand-muted ring-1 ring-brand-border hover:text-brand-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={users}
        rowKey={(u) => u.external_id}
        emptyLabel="Nenhum usuário com esse filtro."
      />

      {phoneFor ? (
        <PhoneDialog user={phoneFor} onClose={() => setPhoneFor(null)} onSaved={() => { setPhoneFor(null); load(); }} />
      ) : null}
      {credsFor ? (
        <CredsDialog user={credsFor} onClose={() => setCredsFor(null)} onSaved={() => setCredsFor(null)} />
      ) : null}
    </PageShell>
  );
}

/** Resgate de login: troca o telefone (canal do OTP). */
function PhoneDialog({ user, onClose, onSaved }: { user: PlatformUser; onClose: () => void; onSaved: () => void }) {
  const [phone, setPhone] = useState(user.phone ? maskBrPhone(user.phone) : "");
  const digits = onlyDigits(phone);
  const valid = isValidBrPhone(digits);
  const [error, setError] = useState<string | null>(null);

  return (
    <DialogShell title="Trocar telefone" onClose={onClose}>
      <p className="text-[14px] leading-relaxed text-brand-muted">
        Resgate de login: troca o número que recebe o OTP de <strong>{user.name || "este usuário"}</strong>.
        O backend valida formato, WhatsApp ativo e unicidade.
      </p>
      <TextField
        label="Novo WhatsApp (com DDD)"
        inputMode="numeric"
        placeholder="(00) 00000-0000"
        value={phone}
        invalid={phone.length > 0 && !valid}
        onChange={(e) => setPhone(maskBrPhone(e.target.value))}
      />
      <ErrorBox message={error} />
      <DialogConfirm
        label="Salvar telefone"
        disabled={!valid}
        onConfirm={async () => {
          setError(null);
          try {
            await setUserPhone(user.external_id, digits);
            onSaved();
          } catch (e: unknown) {
            setError(getErrorMessage(e));
          }
        }}
        onCancel={onClose}
      />
    </DialogShell>
  );
}

/** SÓ staff corrige login/senha da plataforma de um aluno concluído. */
function CredsDialog({ user, onClose, onSaved }: { user: PlatformUser; onClose: () => void; onSaved: () => void }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  return (
    <DialogShell title="Credenciais da plataforma" onClose={onClose}>
      <p className="text-[14px] leading-relaxed text-brand-muted">
        Login/senha da plataforma de estudos de <strong>{user.name || "este aluno"}</strong>. Login é único por matrícula.
      </p>
      <TextField label="Login" value={login} onChange={(e) => setLogin(e.target.value)} />
      <TextField label="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
      <TextField label="URL (opcional)" value={url} onChange={(e) => setUrl(e.target.value)} />
      <TextField label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <ErrorBox message={error} />
      <ErrorBox message={ok} success />
      <DialogConfirm
        label="Salvar credenciais"
        disabled={!login.trim() || !password.trim()}
        onConfirm={async () => {
          setError(null);
          setOk(null);
          try {
            await setStudentPlatformCredentials(user.external_id, {
              platform_login: login.trim(),
              platform_password: password.trim(),
              platform_url: url.trim() || null,
              platform_notes: notes.trim() || null,
            });
            setOk("Credenciais salvas.");
            setTimeout(onSaved, 800);
          } catch (e: unknown) {
            setError(getErrorMessage(e));
          }
        }}
        onCancel={onClose}
      />
    </DialogShell>
  );
}

/* ── pequenos shells de diálogo (reusam o visual do ConfirmDialog sem a ação async embutida) ── */

function DialogShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/45 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet-up flex w-full max-w-md flex-col gap-4 rounded-3xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-extrabold text-brand-ink">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function DialogConfirm({
  label,
  disabled,
  onConfirm,
  onCancel,
}: {
  label: string;
  disabled?: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-2 sm:flex-row-reverse">
      <Button
        className="sm:flex-1"
        loading={busy}
        disabled={disabled}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
          }
        }}
      >
        {label}
      </Button>
      <Button variant="secondary" className="sm:flex-1" disabled={busy} onClick={onCancel}>
        Cancelar
      </Button>
    </div>
  );
}

function SmallBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-9 rounded-lg bg-white/70 px-3 py-1 text-[13px] font-bold text-brand-blue ring-1 ring-brand-border transition hover:bg-brand-blue-bg"
    >
      {children}
    </button>
  );
}
