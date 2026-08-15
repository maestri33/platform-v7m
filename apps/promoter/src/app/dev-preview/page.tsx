import { notFound } from "next/navigation";

import { SectionNav } from "@/components/dev/section-nav";
import { SECTIONS } from "@/components/dev/sections";
import { DevThemeControl } from "@/components/dev/theme-control";
import { Showcase } from "@/components/dev/showcase";
import { AuthSection } from "@/components/dev/showcase/auth-section";
import { mockSessions } from "@/lib/dev/mocks";
import { AuthShellDev } from "@/components/dev/auth-shell-dev";

// Preview dev-only: renderiza TODOS os estados do app sem backend, em layout
// próprio (NÃO usa AppShell — o FitViewport não aguenta 8000+px de showcase).
// 404 em produção — NÃO é rota de produto. Acesse
// /dev-preview?section=...&role=...&theme=...
//
// Seções (em `?section=`):
//   overview    índice + what's new (default)
//   components  primitivos de UI em todos os estados
//   forms       forms em todos os estados (visual only)
//   pages       mock de cada página real com mock data
//   states      loading/empty/error/success/404
//   auth        3 estágios do CheckFlow (AuthShell em vez do DevLayout)
export const dynamic = "force-dynamic";

export default async function DevPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; section?: string; theme?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { role = "promoter", section = "overview" } = await searchParams;
  const mock = mockSessions[role] ?? mockSessions.promoter;

  // Auth é o único caso que NÃO usa DevLayout — ele tem o próprio AuthShell
  // (fundo animado + header/footer próprios, em vez do fundo neutro do dev).
  if (section === "auth") {
    return (
      <>
        <AuthShellDev>
          <SectionNavBare role={role} />
          <div className="space-y-3 text-center">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-brand-gold-light">
              Dev preview · Auth
            </p>
            <h1 className="font-display text-[clamp(24px,6vw,28px)] font-extrabold tracking-[-0.01em] text-white">
              Promotor V7M
            </h1>
            <p className="text-[13.5px] text-[var(--muted-on-dark)]">
              CheckFlow estático · 3 estágios do login
            </p>
          </div>
          <AuthSection />
        </AuthShellDev>
        <DevThemeControl hidden={true} />
      </>
    );
  }

  return (
    <>
      <DevHeader role={role} name={mock.session.name ?? "Preview"} />
      <DevBody>
        <SectionNav current={section} role={role} />
        <Showcase section={section} role={role} />
      </DevBody>
      <DevThemeControl />
    </>
  );
}

// Header simples do dev (NÃO usa AppShell — precisa scrollar 8000+px de
// showcase). Sem aurora animada pra não embaçar a leitura.
function DevHeader({ role, name }: { role: string; name: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--surface-border)] bg-[var(--surface)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="V7M" className="h-5 w-auto" />
          <span className="text-brand-gold-ink font-display" aria-hidden="true">·</span>
          <span className="font-display text-sm text-[var(--surface-text-muted)]">
            Dev preview
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-[var(--surface-text-muted)] sm:inline">
            {name} · <span className="font-semibold">{role}</span>
          </span>
        </div>
      </div>
    </header>
  );
}

// Body com scroll nativo (sem FitViewport, sem overflow-hidden). O conteúdo
// é uma coluna com max-w-6xl e padding consistente.
function DevBody({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main"
      className="min-h-[calc(100dvh-58px-env(safe-area-inset-bottom))] bg-[var(--bg)]"
    >
      <div className="mx-auto max-w-6xl space-y-6 px-5 py-6">{children}</div>
    </main>
  );
}

/**
 * Nav simplificada pro caso `auth` (sem AppShell, fundo escuro). Reaproveita
 * o `SECTIONS` exportado pelo componente client.
 */
function SectionNavBare({ role }: { role: string }) {
  return (
    <nav
      aria-label="Seções do dev preview"
      className="mb-6 flex flex-wrap items-center gap-2"
    >
      {SECTIONS.map((s) => {
        const active = s.id === "auth";
        return (
          <a
            key={s.id}
            href={`/dev-preview?section=${s.id}&role=${role}`}
            aria-current={active ? "page" : undefined}
            className={
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors " +
              (active
                ? "border-brand-gold bg-[var(--gold-grad)] text-[var(--black)]"
                : "border-white/10 bg-white/5 text-[var(--muted-on-dark)] hover:border-brand-gold hover:text-white")
            }
          >
            {s.label}
          </a>
        );
      })}
    </nav>
  );
}
