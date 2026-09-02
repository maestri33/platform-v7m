"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiCollaborators } from "@/lib/api-collaborators";
import { PageShell } from "@/components/ui/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { User, KeyRound, Shield, CheckCircle2, Camera } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";

export default function MinhaContaPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [pixInput, setPixInput] = React.useState("");

  const { data: me } = useQuery({
    queryKey: ["promoter-me"],
    queryFn: () => apiCollaborators.getPromoterMe(),
  });

  React.useEffect(() => {
    if (me?.pix_key) {
      setPixInput(me.pix_key);
    }
  }, [me?.pix_key]);

  const updatePixMutation = useMutation({
    mutationFn: async (key: string) => apiCollaborators.updatePixKey(key),
    onSuccess: () => {
      toast.success("Chave PIX salva com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["promoter-me"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });

  return (
    <PageShell
      title="Minha Conta"
      description="Gerenciamento de dados cadastrais, foto de perfil, chaves de repasse e permissões da conta."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
          <User className="size-3.5" />
          <span>Perfil</span>
        </div>
      }
    >
      <div className="space-y-6 max-w-3xl">
        {/* Identidade com Foto de Perfil */}
        <Card className="shadow-2xs overflow-hidden">
          <div className="bg-gradient-to-r from-brand-blue/10 via-slate-50 to-emerald-500/10 p-6 border-b border-brand-border/60">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="relative group">
                <UserAvatar
                  name={user?.name || me?.name}
                  photoUrl={user?.photo_url || user?.avatar_url}
                  size="xl"
                  showStatus
                  status="online"
                  className="ring-4 ring-white shadow-md"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none">
                  <Camera className="size-6 text-white" />
                </div>
              </div>
              <div className="text-center sm:text-left space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl font-black text-brand-ink">
                    {user?.name || me?.name || "Usuário V7M"}
                  </h2>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                    Ativo
                  </span>
                </div>
                <p className="text-xs text-brand-muted font-medium">
                  {user?.isStaff ? "Administrador Master" : user?.isCoordinator ? "Coordenador Regional" : "Promotor Autorizado"}
                </p>
                <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <span className="text-[11px] font-mono text-slate-600 bg-white/80 px-2.5 py-0.5 rounded-md border border-slate-200">
                    ID: {user?.external_id || "—"}
                  </span>
                  <span className="text-[11px] font-semibold text-brand-blue bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200/60">
                    {me?.hub_brand || "V7M Matriz"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="size-4 text-brand-blue" />
              Dados do Usuário
            </CardTitle>
            <CardDescription>
              Informações sincronizadas com a base central e WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-brand-muted block font-medium">Nome Completo:</span>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-brand-border font-semibold text-brand-ink">
                  {user?.name || me?.name || "Não informado"}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-brand-muted block font-medium">Identificador Único (ID):</span>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-brand-border font-mono text-brand-ink">
                  {user?.external_id || "—"}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-brand-muted block font-medium">Telefone / WhatsApp:</span>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-brand-border font-semibold text-brand-ink">
                  {me?.phone || "Não informado"}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-brand-muted block font-medium">Polos / Marca Regional:</span>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-brand-border font-semibold text-brand-ink">
                  {me?.hub_brand || "V7M Matriz"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chave PIX */}
        <Card className="shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="size-4 text-emerald-600" />
              Chave PIX Cadastrada
            </CardTitle>
            <CardDescription>
              Utilizada para depósitos de comissões semanais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="CPF, E-mail, Telefone ou Chave Aleatória"
                value={pixInput}
                onChange={(e) => setPixInput(e.target.value)}
                className="bg-white"
              />
              <Button
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                onClick={() => updatePixMutation.mutate(pixInput)}
                disabled={!pixInput || updatePixMutation.isPending}
              >
                {updatePixMutation.isPending ? "Salvando..." : "Salvar PIX"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Papéis e Acessos */}
        <Card className="shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="size-4 text-brand-blue" />
              Papéis e Permissões no Portal
            </CardTitle>
            <CardDescription>
              Escopos habilitados para a sua conta na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {user?.roles.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/20 capitalize"
                >
                  <CheckCircle2 className="size-3" />
                  {r}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
