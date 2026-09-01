"use client";

import { useState } from "react";

import {
  BackLink,
  BackgroundGradient,
  BrandDots,
  Button,
  CameraCapture,
  Card,
  DiplomaFlag,
  ErrorBox,
  FileUpload,
  IconBadge,
  OtpInput,
  SelectField,
  SiteFooter,
  Stepper,
  TextField,
  WisprText,
} from "@v7m/ui";

/* ── theme toggle ─────────────────────────────────────────────────── */

function useTheme() {
  const [theme, setTheme] = useState<"supletivo" | "staff">("supletivo");
  function toggle() {
    setTheme((t) => {
      const next = t === "supletivo" ? "staff" : "supletivo";
      document.documentElement.setAttribute("data-theme", next === "staff" ? "staff" : "");
      return next;
    });
  }
  return { theme, toggle } as const;
}

/* ── section wrapper ──────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-brand-border bg-white/60 p-4">
      <h2 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.1em] text-brand-blue/80">
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function TokenSwatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="size-10 shrink-0 rounded-lg border border-brand-border shadow-sm"
        style={{ backgroundColor: value }}
      />
      <div className="min-w-0">
        <p className="truncate text-[13px] font-bold text-brand-ink">{name}</p>
        <p className="text-[11px] font-mono text-brand-muted">{value}</p>
      </div>
    </div>
  );
}

/* ── theme color tokens ──────────────────────────────────────────── */

const PALETTE = [
  { name: "--color-green", value: "#009c3b" },
  { name: "--color-green-dark", value: "#00802f" },
  { name: "--color-green-light", value: "#38d178" },
  { name: "--color-yellow", value: "#ffdf00" },
  { name: "--color-blue", value: "#012169" },
  { name: "--color-blue-bright", value: "#1e6fe0" },
  { name: "--color-ink", value: "#0b1b3b" },
  { name: "--color-muted", value: "#5b647a" },
  { name: "--color-bg", value: "#f4f6fb" },
  { name: "--color-surface", value: "#ffffff" },
  { name: "--color-border", value: "#d6dbe6" },
  { name: "--color-danger", value: "#c62828" },
];

const STEPS = ["Identificação", "Documentos", "Escolaridade", "Confirmação"];

/* ── page ─────────────────────────────────────────────────────────── */

export function KitClient() {
  const { theme, toggle } = useTheme();

  const themeLabel = theme === "supletivo" ? "Supletivo (padrão)" : "Staff";
  const themeFlag = theme === "supletivo" ? "🇧🇷" : "🛠️";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-6">
      {/* header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-ink">🎨 Kit de Componentes</h1>
          <p className="text-sm text-brand-muted">
            Todos os componentes do design system — tema atual: <strong>{themeLabel}</strong>
          </p>
        </div>
        <button
          onClick={toggle}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border-2 border-brand-blue px-4 text-sm font-bold text-brand-blue transition hover:bg-brand-blue/5"
        >
          {themeFlag} Alternar tema
        </button>
      </div>

      <p className="rounded-xl border border-brand-border bg-brand-bg p-3 text-[13px] leading-relaxed text-brand-muted">
        Tema atual: <strong className="text-brand-ink">{themeLabel}</strong>. As cores,
        sombras e blur mudam via CSS variables — os componentes não são alterados.
      </p>

      {/* ── color tokens ─────────────────────────────────────────── */}
      <Section title="🎨 Paleta de cores">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PALETTE.map((c) => (
            <TokenSwatch key={c.name} name={c.name} value={c.value} />
          ))}
        </div>
      </Section>

      {/* ── typography ────────────────────────────────────────────── */}
      <Section title="🔤 Tipografia">
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold text-brand-muted">11px · stepper labels</p>
          <p className="text-[12px] font-bold text-brand-muted">12px · badges</p>
          <p className="text-[13px] font-semibold text-brand-muted">13px · hints, info text</p>
          <p className="text-[15px] font-bold text-brand-ink">15px · form labels</p>
          <p className="text-lg font-bold text-brand-ink">18px · select</p>
          <p className="text-xl font-bold text-brand-ink">20px · input text</p>
          <p className="text-2xl font-extrabold text-brand-ink">24px · OTP digits</p>
        </div>
      </Section>

      {/* ── buttons ───────────────────────────────────────────────── */}
      <Section title="🔘 Button">
        <div className="flex flex-wrap items-end gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button as="a" href="#" variant="secondary">
            Link Button
          </Button>
        </div>
      </Section>

      {/* ── card ──────────────────────────────────────────────────── */}
      <Section title="🃏 Card">
        <div className="flex gap-3">
          <Card pad="sm">
            <p className="text-sm font-semibold text-brand-ink">Card sm</p>
            <p className="text-[12px] text-brand-muted">p-5</p>
          </Card>
          <Card pad="md">
            <p className="text-sm font-semibold text-brand-ink">Card md</p>
            <p className="text-[12px] text-brand-muted">p-6</p>
          </Card>
          <Card pad="lg">
            <p className="text-sm font-semibold text-brand-ink">Card lg</p>
            <p className="text-[12px] text-brand-muted">p-7</p>
          </Card>
        </div>
      </Section>

      {/* ── text field ────────────────────────────────────────────── */}
      <Section title="📝 TextField">
        <TextField label="Nome completo" placeholder="Digite seu nome" />
        <TextField label="E-mail" hint="Use seu melhor e-mail" placeholder="email@exemplo.com" />
        <TextField
          label="Campo inválido"
          invalid
          hint="Este campo tem um erro"
          defaultValue="valor errado"
        />
        <TextField label="Desabilitado" disabled defaultValue="não editável" />
      </Section>

      {/* ── select ────────────────────────────────────────────────── */}
      <Section title="📋 SelectField">
        <SelectField
          label="Escolaridade"
          options={[
            { value: "fundamental", label: "Ensino Fundamental" },
            { value: "medio", label: "Ensino Médio" },
          ]}
        />
      </Section>

      {/* ── stepper ───────────────────────────────────────────────── */}
      <Section title="📶 Stepper">
        <Stepper current={1} labels={STEPS} />
        <Stepper current={3} labels={STEPS} />
        <Stepper current={4} labels={STEPS} />
      </Section>

      {/* ── OTP input ─────────────────────────────────────────────── */}
      <Section title="🔢 OtpInput">
        <OtpInput length={6} value="12" onChange={() => {}} />
        <OtpInput length={6} value="123456" onChange={() => {}} />
        <OtpInput length={6} value="123" onChange={() => {}} invalid />
      </Section>

      {/* ── file upload ───────────────────────────────────────────── */}
      <Section title="📎 FileUpload">
        <div className="max-w-sm">
          <FileUpload label="RG (frente)" file={null} onChange={() => {}} />
          <FileUpload label="RG (frente)" file={null} onChange={() => {}} done />
        </div>
      </Section>

      {/* ── error box ─────────────────────────────────────────────── */}
      <Section title="⚠️ ErrorBox">
        <ErrorBox message="Este é um erro — algo deu errado no servidor." />
        <ErrorBox message="Deu certo! Seus documentos foram enviados." success />
        <ErrorBox
          tone="neutral"
          message="Informação: seu cadastro está em análise. Isso pode levar até 48h."
        />
      </Section>

      {/* ── camera capture ────────────────────────────────────────── */}
      <Section title="📸 CameraCapture (placeholder)">
        <p className="text-[13px] text-brand-muted">
          O CameraCapture exige HTTPS e permissão de câmera.
        </p>
        <div className="max-w-sm">
          <CameraCapture file={null} onCapture={() => {}} />
        </div>
      </Section>

      {/* ── icon badge ────────────────────────────────────────────── */}
      <Section title="🏷️ IconBadge">
        <IconBadge>
          <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l9 4.5v7L12 18l-9-4.5v-7z" />
          </svg>
        </IconBadge>
      </Section>

      {/* ── brand dots ────────────────────────────────────────────── */}
      <Section title="🟢🟡🔵 BrandDots">
        <BrandDots size="sm" center />
        <BrandDots size="md" center />
      </Section>

      {/* ── back link ─────────────────────────────────────────────── */}
      <Section title="← BackLink">
        <BackLink tone="onLight" href="#">
          Voltar
        </BackLink>
        <div className="rounded-xl bg-brand-ink p-3">
          <BackLink tone="onDark" href="#">
            Painel
          </BackLink>
        </div>
      </Section>

      {/* ── diploma flag ──────────────────────────────────────────── */}
      <Section title="🏁 DiplomaFlag">
        <div className="w-44">
          <DiplomaFlag />
        </div>
        <div className="w-44">
          <DiplomaFlag name="Maria Silva" />
        </div>
      </Section>

      {/* ── wispr text ────────────────────────────────────────────── */}
      <Section title="✨ WisprText">
        <WisprText
          text="Conclua seus estudos com a Supletivo Brasil"
          className="text-xl font-extrabold text-brand-ink"
        />
      </Section>

      {/* ── background gradient ───────────────────────────────────── */}
      <Section title="🌈 BackgroundGradient">
        <BackgroundGradient containerClassName="max-w-xs">
          <div className="rounded-[22px] bg-brand-ink p-4 text-center text-sm font-semibold text-white">
            Conteúdo com borda animada
          </div>
        </BackgroundGradient>
      </Section>

      {/* ── site footer ───────────────────────────────────────────── */}
      <Section title="📄 SiteFooter">
        <SiteFooter />
      </Section>

      {/* ── design tokens quick ref ────────────────────────────────── */}
      <Section title="📐 Design Tokens (referência)">
        <div className="grid grid-cols-2 gap-3 text-[12px]">
          <div>
            <h3 className="mb-1 font-bold text-brand-ink">Radius</h3>
            <p className="text-brand-muted">
              sm: 6px · md: 8px · lg: 12px · xl: 16px · 2xl: 28px · full
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-bold text-brand-ink">Spacing</h3>
            <p className="text-brand-muted">
              4px grid: 1(4) · 2(8) · 3(12) · 4(16) · 5(20) · 6(24) · 7(28)
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-bold text-brand-ink">Shadows</h3>
            <p className="text-brand-muted">card · button · button-hover · text · face-cutout</p>
          </div>
          <div>
            <h3 className="mb-1 font-bold text-brand-ink">Blur</h3>
            <p className="text-brand-muted">sm: 4px · md: 12px · xl: 24px</p>
          </div>
          <div>
            <h3 className="mb-1 font-bold text-brand-ink">Durations</h3>
            <p className="text-brand-muted">
              instant: 80ms · fast: 150ms · normal: 220ms · slow: 280ms · glacial: 400ms
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
