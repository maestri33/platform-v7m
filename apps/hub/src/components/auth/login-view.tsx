"use client";

import * as React from "react";
import { apiLeadership } from "@/lib/api-leadership";
import { sessionStore } from "@/lib/session";
import { formatPhoneBR, digitsOnly, isValidPhoneBR } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, ShieldCheck, ArrowRight, ArrowLeft, Phone, Lock, AlertCircle } from "lucide-react";

export function LoginView() {
  const [step, setStep] = React.useState<"phone" | "otp">("phone");
  const [phone, setPhone] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [externalId, setExternalId] = React.useState("");
  const [hubInfo, setHubInfo] = React.useState<{ external_id: string; brand: string } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [otpWait, setOtpWait] = React.useState<number>(0);

  // Contador de reenvio de OTP
  React.useEffect(() => {
    if (otpWait <= 0) return;
    const timer = setInterval(() => {
      setOtpWait((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpWait]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const clean = digitsOnly(phone).replace(/^55(?=\d{10,11}$)/, "");
    if (!isValidPhoneBR(clean)) {
      setErrorMsg("Informe um telefone válido com DDD.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiLeadership.checkPhone(clean);

      if (!res.found) {
        throw new Error("Telefone não encontrado no cadastro.");
      }

      if (!res.is_coordinator) {
        throw new Error(res.detail || "Este acesso é exclusivo para coordenadores.");
      }

      if (!res.external_id) {
        throw new Error("Identificador de coordenador inválido.");
      }

      setExternalId(res.external_id);
      setHubInfo(res.hub || null);

      if (res.otp_wait) {
        setOtpWait(res.otp_wait);
      }

      setStep("otp");
      toast.success(
        res.otp_wait
          ? `Código já enviado. Aguarde ${res.otp_wait}s.`
          : "Código enviado pelo WhatsApp.",
      );
    } catch (err: any) {
      const message = err.detail || err.message || "Não foi possível verificar o telefone.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanOtp = digitsOnly(otp);
    if (cleanOtp.length !== 6) {
      setErrorMsg("Digite os 6 dígitos do código.");
      return;
    }

    setLoading(true);
    try {
      const tokens = await apiLeadership.login(externalId, cleanOtp);
      sessionStore.saveSession(tokens, hubInfo);
    } catch (err: any) {
      const message = err.detail || err.message || "Código incorreto ou expirado.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-view" className="min-h-screen flex items-center justify-center p-4 hub-bg">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue text-white shadow-md font-bold text-xl mb-1">
            V7
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-ink">
            Hub do Polo
          </h1>
          <p className="text-sm text-brand-muted">
            Acesso restrito para coordenadores de polo
          </p>
        </div>

        <Card className="shadow-lg border-brand-border/80">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-blue" />
              {step === "phone" ? "Identificação" : "Verificação de Segurança"}
            </CardTitle>
            <CardDescription>
              {step === "phone"
                ? "Informe seu número de WhatsApp cadastrado no polo."
                : `Digite o código de 6 dígitos enviado para ${formatPhoneBR(phone)}`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {errorMsg && (
              <div
                id="login-error"
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-brand-danger/30 bg-brand-danger-bg p-3 text-xs text-brand-danger font-medium"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form
              id="phone-form"
              onSubmit={handlePhoneSubmit}
              className="space-y-4"
              hidden={step !== "phone"}
            >
              <div className="space-y-1.5">
                <label htmlFor="phone" className="text-xs font-semibold text-brand-ink flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-brand-blue" />
                  Telefone/WhatsApp
                </label>
                <Input
                  id="phone"
                  aria-label="Telefone/WhatsApp"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                  error={Boolean(errorMsg)}
                  autoFocus
                  disabled={loading}
                  className="h-11 text-base tracking-wide"
                />
              </div>

              <Button
                type="submit"
                variant="default"
                className="w-full h-11 text-base font-semibold"
                disabled={loading || phone.length < 14}
              >
                {loading ? "Verificando..." : "Enviar código"}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </form>

            <form
              id="otp-form"
              onSubmit={handleOtpSubmit}
              className="space-y-5"
              hidden={step !== "otp"}
            >
              {hubInfo && (
                <div className="flex items-center gap-2 rounded-lg bg-brand-blue-bg/60 p-2.5 text-xs text-brand-blue font-medium border border-brand-blue/20">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>Polo vinculado: <strong>{hubInfo.brand}</strong></span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="otp" className="text-xs font-semibold text-brand-ink text-center block">
                  Código de 6 dígitos
                </label>
                <Input
                  id="otp"
                  aria-label="Código de 6 dígitos"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(digitsOnly(e.target.value).slice(0, 6))}
                  disabled={loading}
                  error={Boolean(errorMsg)}
                  className="h-13 text-center text-2xl font-bold tracking-[0.4em] bg-white"
                  autoFocus
                />
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  type="submit"
                  variant="action"
                  className="w-full h-11 text-base font-semibold"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? "Autenticando..." : "Entrar no polo"}
                  <Lock className="h-4 w-4 ml-1" />
                </Button>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    id="change-phone"
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStep("phone");
                      setOtp("");
                      setErrorMsg(null);
                    }}
                    disabled={loading}
                    className="text-xs text-brand-muted hover:text-brand-ink"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Trocar telefone
                  </Button>

                  {otpWait > 0 ? (
                    <span className="text-xs text-brand-muted">
                      Reenviar em {otpWait}s
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={handlePhoneSubmit}
                      disabled={loading}
                      className="text-xs text-brand-blue"
                    >
                      Reenviar código
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security Footer Notice */}
        <div className="text-center text-xs text-brand-muted flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-brand-green-dark" />
          <span>Ambiente seguro e auditado — V7M Educação</span>
        </div>
      </div>
    </div>
  );
}
