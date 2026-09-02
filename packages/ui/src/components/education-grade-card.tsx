"use client";

export interface EducationGradeCardProps {
  gradeShort: string;
  gradeOld: string;
  gradeNow: string;
  onClick: () => void;
  disabled?: boolean;
}

export function EducationGradeCard({
  gradeShort,
  gradeOld,
  gradeNow,
  onClick,
  disabled = false,
}: EducationGradeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative flex w-full cursor-pointer items-center gap-3.5 rounded-[18px] border border-brand-border bg-white/80 p-3.5 text-left shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-blue-bright/70 hover:bg-brand-blue-bg/40 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {/* Medalha com versão curta do ano */}
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-blue-bg font-extrabold text-brand-blue ring-2 ring-brand-blue-bright/30 transition-transform duration-200 group-hover:scale-105 group-hover:bg-brand-blue group-hover:text-white">
        <span className="text-sm">{gradeShort}</span>
      </div>

      <div className="flex flex-1 flex-col">
        <span className="text-base font-extrabold text-brand-ink">
          {gradeOld}
        </span>
        <span className="text-xs font-semibold text-brand-muted">
          {gradeNow}
        </span>
      </div>

      <svg
        className="size-4 shrink-0 text-brand-muted/70 transition-colors group-hover:text-brand-blue-bright"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}
