import { Button } from "@/components/ui/button";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-[var(--gutter)] py-10">
      <div className="app-bg grain" aria-hidden />
      <PageShell width="narrow">
        <CompactHeader
          kicker="V7M · 404"
          title="Página não encontrada"
          subtitle="O link que você abriu não existe ou mudou de endereço. Tente voltar pro início."
        />
        <Button href="/" size="xl" className="w-full">
          Voltar pro início
        </Button>
      </PageShell>
    </div>
  );
}
