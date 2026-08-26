import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatDateBR(dateStr: string | null | undefined, pattern: string = "dd/MM/yyyy HH:mm"): string {
  if (!dateStr) return "—";
  try {
    const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
    if (!isValid(date)) return String(dateStr);
    return format(date, pattern, { locale: ptBR });
  } catch {
    return String(dateStr);
  }
}

export function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
    if (!isValid(date)) return String(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "agora";
    if (diffMins < 60) return `há ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `há ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `há ${diffDays} d`;
  } catch {
    return String(dateStr);
  }
}
