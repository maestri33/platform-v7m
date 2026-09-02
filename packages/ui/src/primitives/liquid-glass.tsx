import React, { useId } from "react";
import { DISPLACEMENT_MAPS, type GlassMode } from "../lib/displacement-maps";

export interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  /** Elemento HTML raiz a ser renderizado (default: "div") */
  as?: React.ElementType;
  /** Intensidade do deslocamento de refração das bordas (default: 60) */
  displacementScale?: number;
  /** Nível de desfoque / frosting de 0 a 1 (default: 0.0625) */
  blurAmount?: number;
  /** Saturação de cor sob o vidro em porcentagem (default: 140) */
  saturation?: number;
  /** Intensidade da aberração cromática / separação RGB (default: 2) */
  aberrationIntensity?: number;
  /** Raio do arredondamento em pixels (default: 24) */
  cornerRadius?: number;
  /** Otimização de contraste para fundos claros */
  overLight?: boolean;
  /** Modo de refração ("standard" | "polar" | "prominent") */
  mode?: GlassMode;
  /** ID único explícito para o filtro SVG */
  id?: string;
  /** Espaçamento interno (padding) */
  padding?: string;
  /** Exibir as camadas de borda refratadas com gradiente e máscara */
  showBorders?: boolean;
  /** Exibir brilho especular suave no hover (CSS puro) */
  showHoverEffect?: boolean;
  /** Renderizar apenas a casca do vidro como overlay absoluto (útil para navbars/footers existentes) */
  surfaceOnly?: boolean;
}

/**
 * LiquidGlass — Primitiva óptica de vidro líquido 100% Server Component (Zero-JS).
 * Emite SVG filters com canais de cor divididos, feDisplacementMap, feGaussianBlur
 * e camadas de borda especulares com mask-composite: exclude sem enviar nenhum bundle JS ao cliente.
 */
export function LiquidGlass({
  children,
  as: Component = "div",
  displacementScale = 60,
  blurAmount = 0.0625,
  saturation = 140,
  aberrationIntensity = 2,
  cornerRadius = 24,
  overLight = false,
  mode = "standard",
  id: customId,
  padding,
  showBorders = true,
  showHoverEffect = true,
  surfaceOnly = false,
  className = "",
  style = {},
  ...props
}: LiquidGlassProps) {
  const autoId = useId();
  const cleanId = autoId.replace(/[^a-zA-Z0-9_-]/g, "");
  const filterId = customId || ("lg-" + cleanId);
  const mapUri = DISPLACEMENT_MAPS[mode] || DISPLACEMENT_MAPS.standard;

  const calculatedBlur = Math.round((overLight ? 12 : 6) + blurAmount * 32);

  const filterDefinition = (
    <svg
      className="pointer-events-none absolute h-0 w-0 overflow-hidden"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter
          id={filterId}
          x="-35%"
          y="-35%"
          width="170%"
          height="170%"
          colorInterpolationFilters="sRGB"
        >
          {/* Mapa de Deslocamento Embutido */}
          <feImage
            id={filterId + "-feimage"}
            x="0"
            y="0"
            width="100%"
            height="100%"
            result="DISPLACEMENT_MAP"
            href={mapUri}
            preserveAspectRatio="xMidYMid slice"
          />

          {/* Isolamento das bordas para refração */}
          <feColorMatrix
            in="DISPLACEMENT_MAP"
            type="matrix"
            values="0.3 0.3 0.3 0 0 0.3 0.3 0.3 0 0 0.3 0.3 0.3 0 0 0 0 0 1 0"
            result="EDGE_INTENSITY"
          />
          <feComponentTransfer in="EDGE_INTENSITY" result="EDGE_MASK">
            <feFuncA
              type="discrete"
              tableValues={"0 " + (aberrationIntensity * 0.05) + " 1"}
            />
          </feComponentTransfer>

          <feOffset in="SourceGraphic" dx="0" dy="0" result="CENTER_ORIGINAL" />

          {/* Canal Vermelho com Aberração Cromática */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="DISPLACEMENT_MAP"
            scale={-displacementScale}
            xChannelSelector="R"
            yChannelSelector="B"
            result="RED_DISPLACED"
          />
          <feColorMatrix
            in="RED_DISPLACED"
            type="matrix"
            values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"
            result="RED_CHANNEL"
          />

          {/* Canal Verde */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="DISPLACEMENT_MAP"
            scale={-displacementScale * (1 - aberrationIntensity * 0.05)}
            xChannelSelector="R"
            yChannelSelector="B"
            result="GREEN_DISPLACED"
          />
          <feColorMatrix
            in="GREEN_DISPLACED"
            type="matrix"
            values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0"
            result="GREEN_CHANNEL"
          />

          {/* Canal Azul */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="DISPLACEMENT_MAP"
            scale={-displacementScale * (1 - aberrationIntensity * 0.1)}
            xChannelSelector="R"
            yChannelSelector="B"
            result="BLUE_DISPLACED"
          />
          <feColorMatrix
            in="BLUE_DISPLACED"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0"
            result="BLUE_CHANNEL"
          />

          {/* Mistura de canais com blend screen */}
          <feBlend in="GREEN_CHANNEL" in2="BLUE_CHANNEL" mode="screen" result="GB_COMBINED" />
          <feBlend in="RED_CHANNEL" in2="GB_COMBINED" mode="screen" result="RGB_COMBINED" />
          <feGaussianBlur
            in="RGB_COMBINED"
            stdDeviation={Math.max(0.1, 0.5 - aberrationIntensity * 0.1)}
            result="ABERRATED_BLURRED"
          />

          {/* Composição: Borda refratada + Centro limpo */}
          <feComposite in="ABERRATED_BLURRED" in2="EDGE_MASK" operator="in" result="EDGE_ABERRATION" />
          <feComponentTransfer in="EDGE_MASK" result="INVERTED_MASK">
            <feFuncA type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feComposite in="CENTER_ORIGINAL" in2="INVERTED_MASK" operator="in" result="CENTER_CLEAN" />
          <feComposite in="EDGE_ABERRATION" in2="CENTER_CLEAN" operator="over" />
        </filter>
      </defs>
    </svg>
  );

  const radiusStyle = cornerRadius > 0 ? { borderRadius: cornerRadius + "px" } : {};

  // Se usado puramente como camada de superfície (surfaceOnly)
  if (surfaceOnly) {
    return (
      <>
        {filterDefinition}
        <div
          className={"pointer-events-none absolute inset-0 overflow-hidden " + className}
          style={{ ...radiusStyle, ...style }}
          aria-hidden="true"
        >
          {overLight && (
            <div className="absolute inset-0 bg-black/20" style={radiusStyle} />
          )}
          <span
            className="absolute inset-0"
            style={{
              ...radiusStyle,
              filter: "url(#" + filterId + ")",
              backdropFilter: "blur(" + calculatedBlur + "px) saturate(" + saturation + "%)",
              WebkitBackdropFilter: "blur(" + calculatedBlur + "px) saturate(" + saturation + "%)",
            }}
          />
          {showBorders && (
            <span
              className="absolute inset-0"
              style={{
                ...radiusStyle,
                mixBlendMode: "screen",
                opacity: 0.25,
                padding: "1px",
                WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
                boxShadow: "0 0 0 0.5px rgba(255, 255, 255, 0.4) inset",
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%)",
              }}
            />
          )}
        </div>
      </>
    );
  }

  return (
    <Component
      className={"group relative transition-all duration-200 " + className}
      style={{
        ...radiusStyle,
        ...style,
      }}
      {...props}
    >
      {filterDefinition}

      {/* Camadas de Contraste para overLight */}
      {overLight && (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-black/20 transition-opacity duration-150"
            style={radiusStyle}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-black/40 mix-blend-overlay transition-opacity duration-150"
            style={radiusStyle}
            aria-hidden="true"
          />
        </>
      )}

      {/* Camada do Vidro (Backdrop Filter + SVG Filter) */}
      <span
        className="pointer-events-none absolute inset-0 transition-all duration-200"
        style={{
          ...radiusStyle,
          filter: "url(#" + filterId + ")",
          backdropFilter: "blur(" + calculatedBlur + "px) saturate(" + saturation + "%)",
          WebkitBackdropFilter: "blur(" + calculatedBlur + "px) saturate(" + saturation + "%)",
          boxShadow: overLight
            ? "0px 16px 70px rgba(0, 0, 0, 0.75)"
            : "0px 12px 40px rgba(0, 0, 0, 0.25)",
        }}
        aria-hidden="true"
      />

      {/* Camada de Borda 1 (Screen) */}
      {showBorders && (
        <>
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              ...radiusStyle,
              mixBlendMode: "screen",
              opacity: 0.25,
              padding: "1.5px",
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              boxShadow:
                "0 0 0 0.5px rgba(255, 255, 255, 0.5) inset, 0 1px 3px rgba(255, 255, 255, 0.25) inset, 0 1px 4px rgba(0, 0, 0, 0.35)",
              background:
                "linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.18) 33%, rgba(255,255,255,0.5) 66%, rgba(255,255,255,0) 100%)",
            }}
            aria-hidden="true"
          />

          {/* Camada de Borda 2 (Overlay) */}
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              ...radiusStyle,
              mixBlendMode: "overlay",
              padding: "1.5px",
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              boxShadow:
                "0 0 0 0.5px rgba(255, 255, 255, 0.5) inset, 0 1px 3px rgba(255, 255, 255, 0.25) inset, 0 1px 4px rgba(0, 0, 0, 0.35)",
              background:
                "linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 33%, rgba(255,255,255,0.7) 66%, rgba(255,255,255,0) 100%)",
            }}
            aria-hidden="true"
          />
        </>
      )}

      {/* Reflexo Especular de Hover */}
      {showHoverEffect && (
        <span
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-40"
          style={{
            ...radiusStyle,
            backgroundImage:
              "radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0) 70%)",
            mixBlendMode: "overlay",
          }}
          aria-hidden="true"
        />
      )}

      {/* Conteúdo Nítido do Usuário */}
      <div
        className="relative z-10 w-full"
        style={{
          padding,
          textShadow: overLight
            ? "0px 2px 12px rgba(0, 0, 0, 0)"
            : "0px 2px 12px rgba(0, 0, 0, 0.4)",
        }}
      >
        {children}
      </div>
    </Component>
  );
}

export default LiquidGlass;