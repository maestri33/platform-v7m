export interface MarqueeLogo {
  name: string;
  src: string;
  alt: string;
  gradient: {
    from: string;
    to: string;
    style?: React.CSSProperties;
  };
}

export interface ModernHeroSectionProps {
  headline?: React.ReactNode;
  subheadline?: string;
  contactButtonText?: string;
  contactButtonHref?: string;
  videoSrc?: string;
  logos?: MarqueeLogo[];
  onContactClick?: () => void;
  onProductsClick?: () => void;
  onDocsClick?: () => void;
  className?: string;
}
