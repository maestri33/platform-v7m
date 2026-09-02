# Sistema de Iconografia Vetorial (SVG) — V7M Design System

Este documento define os padrões, estilos e catálogo canônico de ícones SVG para as aplicações do ecossistema **V7M** (`@v7m/ui`, `landing-promotor`, `landing-supletivo`, `admin`, `app-promotor`, `app-supletivo` e `hub`).

---

## 🎨 1. Diretrizes de Estilo & Geometria

- **Grid Base**: `24x24px` com viewBox `0 0 24 24`.
- **Stroke Width**: `1.75px` ou `2px` com `stroke-linecap="round"` e `stroke-linejoin="round"`.
- **Renderização de Cor**: Uso de `currentColor` para herdar contextualmente a paleta do tema ativo (`dark-luxury`, `emerald-institutional` ou `monochrome-minimal`).
- **Acessibilidade (a11y)**: Ícones puramente decorativos devem conter `aria-hidden="true"`. Ícones acionáveis ou informativos devem conter `role="img"` e `<title>` descritivo.

---

## 📂 2. Catálogo de Ícones do Ecossistema

### A. Ícones Financeiros & Recompensas (Promotores & Comissões)

#### 1. `PixInstant` (PIX / Transferência Instantânea)
```html
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="v7m-icon">
  <path d="M7.5 4.5L12 9l4.5-4.5M4.5 7.5L9 12l-4.5 4.5M19.5 7.5L15 12l4.5 4.5M7.5 19.5L12 15l4.5 4.5" />
</svg>
```

#### 2. `CommissionWallet` (Carteira / Saldo Disponível)
```html
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="v7m-icon">
  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
  <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
</svg>
```

#### 3. `GrowthChart` (Projeção / Gráfico de Desempenho)
```html
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="v7m-icon">
  <path d="M3 3v18h18" />
  <path d="m19 9-5 5-4-4-3 3" />
</svg>
```

---

### B. Ícones Educacionais & Matrícula (Supletivo & Aluno)

#### 4. `GraduationCap` (Conclusão / Diploma)
```html
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="v7m-icon">
  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
  <path d="M6 12v5c3 3 9 3 12 0v-5" />
</svg>
```

#### 5. `CertificateSeal` (Certificação MEC / Validação)
```html
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="v7m-icon">
  <circle cx="12" cy="8" r="6" />
  <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
</svg>
```

#### 6. `DocumentBiometric` (Validação Facial / KYC)
```html
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="v7m-icon">
  <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
  <path d="M5 19.5C6.8 21 9.3 22 12 22a10 10 0 0 0 10-10" />
  <path d="M8 12a4 4 0 0 1 8 0" />
  <path d="M12 12v3" />
</svg>
```

---

### C. Ícones de Navegação & Cockpit Admin

#### 7. `ShieldVerified` (Segurança & Antifraude)
```html
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="v7m-icon">
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  <path d="m9 12 2 2 4-4" />
</svg>
```

#### 8. `SpeedClock` (Conclusão Expressa / 30 Dias)
```html
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="v7m-icon">
  <circle cx="12" cy="12" r="10" />
  <polyline points="12 6 12 12 16 14" />
</svg>
```

---

## ⚙️ 3. Biblioteca Canônica de Ícones: `@tabler/icons-react`

A partir da versão atual, o ecossistema V7M padroniza **`@tabler/icons-react`** como a biblioteca canônica oficial de ícones para todos os portais e componentes (`@v7m/ui`, `supletivo`, `group`).

### Padrão de Nomenclatura & Consumo
- Todos os ícones do Tabler iniciam com o prefixo `Icon` (ex: `IconAward`, `IconWallet`, `IconShieldCheck`, `IconZap`, `IconAppWindow`, `IconCircleCheck`).
- Stroke padrão: `stroke={1.75}` ou `stroke={2}`.
- Tamanho padronizado via Tailwind utilities: `className="size-4"` (16px), `className="size-5"` (20px) ou `className="size-6"` (24px).

```tsx
import { IconAward, IconWallet, IconShieldCheck, IconZap } from '@tabler/icons-react';

export function FeatureBadge({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-accent)] bg-[var(--bg-surface-glass)] text-[var(--accent-gold)]">
      <IconZap className="size-4 text-[var(--accent-gold)] animate-pulse" />
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}
```

### 🗺️ Roteiro de Migração Incremental
1. **Fase 1 (Concluída)**: Instalação de `@tabler/icons-react` nos workspaces `@v7m/ui`, `@v7m/supletivo` e `@v7m/group`.
2. **Fase 2 (Concluída)**: Migração dos componentes centrais de mídia (`MediaStageCard`, `ChromaticImage`, `FileUploadDropzone`, `BackgroundGradientDemo`).
3. **Fase 3 (Em andamento)**: Substituição gradual de instâncias de `lucide-react` em formulários, navegações e cockpits.

