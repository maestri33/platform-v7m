"use client";

import * as React from "react";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarStatus = "online" | "offline" | "idle" | "busy";

export interface UserAvatarProps {
  name?: string | null;
  photoUrl?: string | null;
  size?: AvatarSize;
  showStatus?: boolean;
  status?: AvatarStatus;
  className?: string;
  onClick?: () => void;
}

const SIZE_MAP: Record<AvatarSize, { container: string; text: string; icon: string; dot: string }> = {
  xs: { container: "size-6", text: "text-[10px]", icon: "size-3", dot: "size-1.5" },
  sm: { container: "size-8", text: "text-xs", icon: "size-4", dot: "size-2" },
  md: { container: "size-10", text: "text-sm", icon: "size-5", dot: "size-2.5" },
  lg: { container: "size-14", text: "text-lg", icon: "size-7", dot: "size-3.5" },
  xl: { container: "size-20", text: "text-2xl", icon: "size-10", dot: "size-4" },
};

const GRADIENTS = [
  "from-blue-600 to-indigo-600 text-white",
  "from-emerald-600 to-teal-700 text-white",
  "from-amber-500 to-orange-600 text-white",
  "from-sky-500 to-blue-700 text-white",
  "from-indigo-600 to-purple-700 text-white",
  "from-teal-500 to-emerald-700 text-white",
];

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGradient(name?: string | null): string {
  if (!name) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[idx];
}

export function UserAvatar({
  name,
  photoUrl,
  size = "md",
  showStatus = false,
  status = "online",
  className = "",
  onClick,
}: UserAvatarProps) {
  const [prevPhotoUrl, setPrevPhotoUrl] = React.useState(photoUrl);
  const [imageError, setImageError] = React.useState(false);

  if (prevPhotoUrl !== photoUrl) {
    setPrevPhotoUrl(photoUrl);
    setImageError(false);
  }

  const initials = getInitials(name);
  const gradient = getGradient(name);
  const sizeConfig = SIZE_MAP[size];

  const hasPhoto = Boolean(photoUrl && !imageError);

  const statusColor =
    status === "online"
      ? "bg-emerald-500 ring-white"
      : status === "busy"
      ? "bg-rose-500 ring-white"
      : status === "idle"
      ? "bg-amber-400 ring-white"
      : "bg-slate-400 ring-white";

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center select-none ${sizeConfig.container} ${className}`}
      onClick={onClick}
    >
      <div
        className={`relative flex size-full items-center justify-center overflow-hidden rounded-full font-bold shadow-xs transition-transform duration-200 ${
          hasPhoto ? "bg-slate-100 ring-1 ring-black/5" : `bg-gradient-to-br ${gradient} ring-1 ring-white/20`
        } ${onClick ? "cursor-pointer hover:scale-105" : ""}`}
      >
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={photoUrl}
            src={photoUrl!}
            alt={name ? `Foto de perfil de ${name}` : "Foto de perfil do usuário"}
            className="size-full object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <span className={`font-black tracking-tight ${sizeConfig.text}`}>
            {initials}
          </span>
        )}
      </div>

      {/* Indicador de Status */}
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-2 ${sizeConfig.dot} ${statusColor}`}
          aria-label={`Status: ${status}`}
        >
          {status === "online" && (
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />
          )}
        </span>
      )}
    </div>
  );
}
