import React from "react";
import styles from "./layout.module.css";
import { BrandLogo, type BrandVariant } from "./brand-logo";
import { BrandStamp, type StampVariant } from "./brand-stamp";
import { BrandRule } from "../brand-accents";
import { VersionBadge } from "../version-badge";
import { SiteFooter } from "../site-footer";

export interface FooterNavLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterNavGroup {
  title: string;
  links: FooterNavLink[];
}

export interface UnifiedFooterProps {
  brand?: BrandVariant;
  context?: "landing" | "portal";
  tagline?: React.ReactNode;
  navGroups?: FooterNavGroup[];
  legalNotice?: React.ReactNode;
  companyUrl?: string;
  careersUrl?: string;
  contactEmail?: string;
  contactWhatsApp?: string;
  legalName?: string;
  cnpj?: string;
  closingLabel?: string;
  showBackToTop?: boolean;
  showVersion?: boolean;
  showTricolorBorder?: boolean;
  className?: string;
}

const DEFAULT_LANDING_GROUPS: Record<BrandVariant, (urls: { companyUrl: string; careersUrl: string }) => FooterNavGroup[]> = {
  supletivo: ({ companyUrl, careersUrl }) => [
    {
      title: "Guias",
      links: [
        { label: "Supletivo Online", href: "/supletivo-online/" },
        { label: "EJA a Distância", href: "/eja-a-distancia/" },
        { label: "Terminar o Ensino Médio", href: "/terminar-ensino-medio/" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Termos de Uso", href: "/termos/" },
        { label: "Política de Privacidade", href: "/privacidade/" },
      ],
    },
    {
      title: "Empresa",
      links: [
        { label: "Sobre a V7M", href: companyUrl, external: true },
        { label: "Trabalhe conosco", href: careersUrl, external: true },
      ],
    },
  ],
  promotor: () => [
    {
      title: "O programa",
      links: [
        { label: "Como funciona", href: "#como-funciona" },
        { label: "Quanto dá pra ganhar", href: "#ganhos" },
        { label: "Como entrar", href: "#caminho" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Termos do Programa", href: "/termos/" },
        { label: "Política de Privacidade", href: "/privacidade/" },
      ],
    },
  ],
  group: ({ companyUrl }) => [
    {
      title: "Portais",
      links: [
        { label: "Supletivo Brasil", href: "https://supletivo.net.br", external: true },
        { label: "Programa de Promotores", href: "https://maestri.group", external: true },
      ],
    },
    {
      title: "Institucional",
      links: [
        { label: "Maestri Group", href: companyUrl, external: true },
        { label: "Termos de Uso", href: "/termos" },
        { label: "Privacidade", href: "/privacidade" },
      ],
    },
  ],
};

export function UnifiedFooter({
  brand = "supletivo",
  context = "landing",
  tagline,
  navGroups,
  legalNotice,
  companyUrl = "https://maestri.group",
  careersUrl = "https://maestri.group/carreiras",
  contactEmail,
  contactWhatsApp,
  legalName,
  cnpj,
  closingLabel = "às sextas",
  showBackToTop,
  showVersion = false,
  showTricolorBorder,
  className = "",
}: UnifiedFooterProps) {
  // If in portal context, delegate to our compact institutional SiteFooter component
  if (context === "portal") {
    return <SiteFooter showVersion={showVersion} />;
  }

  const year = new Date().getFullYear();
  const shouldShowBackToTop = showBackToTop ?? true;
  const shouldShowTricolor = showTricolorBorder ?? true;

  const resolvedEmail = contactEmail || (brand === "promotor" ? "contato@maestri.group" : "contato@supletivo.net.br");
  const resolvedCnpj = cnpj || "48.811.016/0001-00";
  const resolvedLegalName = legalName || (brand === "promotor" ? "V7M Promotores" : "Supletivo Brasil");

  const waHref = contactWhatsApp ? `https://wa.me/${contactWhatsApp}` : null;
  const waLabel = contactWhatsApp
    ? contactWhatsApp.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3")
    : null;

  const groups =
    navGroups ?? DEFAULT_LANDING_GROUPS[brand]({ companyUrl, careersUrl });

  const defaultStamp: StampVariant = brand === "promotor" ? "seal" : "flag";

  const renderDefaultTagline = () => {
    if (brand === "promotor") {
      return (
        <p className={styles.tagline}>
          Feito para quem quer mudar vidas{" "}
          <span className={styles.taglineAccent}>e ganhar por isso.</span>
        </p>
      );
    }
    return (
      <p className={styles.tagline}>
        Feito para quem decidiu{" "}
        <span className={styles.taglineAccent}>voltar a estudar.</span>
      </p>
    );
  };

  const renderDefaultLegal = () => {
    if (brand === "promotor") {
      return (
        <>
          <p className="font-semibold text-white/90">
            {resolvedLegalName} · Programa de Promotores
            {resolvedCnpj ? ` · CNPJ ${resolvedCnpj}` : null} ·{" "}
            <a href={`mailto:${resolvedEmail}`}>{resolvedEmail}</a>
            {waHref && waLabel ? (
              <>
                {" · "}
                <a href={waHref} rel="noopener noreferrer" target="_blank">
                  WhatsApp {waLabel}
                </a>
              </>
            ) : null}
          </p>
          <p>
            O Programa de Promotores remunera por{" "}
            <strong>indicação de matrículas pagas</strong>, com pagamento por
            Pix {closingLabel}. A participação é autônoma e voluntária:{" "}
            <strong>não há vínculo empregatício</strong>, exclusividade ou
            obrigação de meta. Os valores de comissão e bônus podem ser
            ajustados; valem sempre os exibidos no painel do promotor.
          </p>
          <p>
            Para receber, você cadastra uma chave Pix no seu próprio CPF,
            validada junto ao banco (DICT). Os dados informados no cadastro
            (CPF, contato, documento, selfie e chave Pix) são usados apenas
            para identificação, pagamento e prevenção a fraude, conforme a LGPD
            (Lei nº 13.709/2018).
          </p>
          <p className={styles.footerCopy}>
            © {year} V7M. Todos os direitos reservados.
          </p>
        </>
      );
    }

    return (
      <>
        <p className="font-semibold text-white/90">
          Supletivo Brasil · CNPJ {resolvedCnpj} ·{" "}
          <a href={`mailto:${resolvedEmail}`}>{resolvedEmail}</a>
        </p>
        <p>
          O Supletivo Brasil fornece o material didático e a preparação para a
          EJA. A certificação é emitida por instituição parceira credenciada ao
          MEC, com validade em todo o território nacional, nos termos da Lei nº
          9.394/96 (LDB).
        </p>
        <p>
          Respeitamos a sua privacidade: os dados informados na matrícula são
          usados apenas para a sua inscrição e comunicação sobre o curso,
          conforme a LGPD (Lei nº 13.709/2018).
        </p>
        <p className={styles.footerCopy}>
          © {year} Supletivo Brasil. Todos os direitos reservados.
        </p>
      </>
    );
  };

  return (
    <footer
      className={`${styles.footer} ${shouldShowTricolor ? styles.tricolorBorder : ""} ${className}`}
    >
      {!shouldShowTricolor && <BrandRule placement="top" />}
      <div className={styles.footerContainer}>
        {tagline ?? renderDefaultTagline()}

        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <BrandLogo brand={brand} variant="light" href="/" />
            <BrandStamp stamp={defaultStamp} />
          </div>

          <nav aria-label="Links institucionais e legais" className={styles.footerNav}>
            {groups.map((grp) => (
              <div key={grp.title} className={styles.footerNavGroup}>
                <p className={styles.footerNavTitle}>{grp.title}</p>
                {grp.links.map((lnk) => (
                  <a
                    key={lnk.href}
                    href={lnk.href}
                    className={styles.footerNavLink}
                    {...(lnk.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {lnk.label}
                    {lnk.external && <span className="sr-only"> (abre em nova aba)</span>}
                  </a>
                ))}
              </div>
            ))}
          </nav>

          {shouldShowBackToTop && (
            <a className={styles.toTop} href="#hero" aria-label="Voltar ao topo">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="w-5 h-5"
              >
                <path
                  d="M12 19V5m-6 6 6-6 6 6"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          )}
        </div>

        <div className={styles.footerLegal}>
          {legalNotice ?? renderDefaultLegal()}
          {showVersion && (
            <div className="mt-2">
              <VersionBadge />
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
