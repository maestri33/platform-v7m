"use client";

import { useEffect, useRef, useState } from "react";

import {
  Button,
  CameraCapture,
  ErrorBox,
  FileUpload,
  InlineSpinner,
  SelectField,
  TextField,
  FeedbackModal,
} from "@v7m/ui";
import {
  ApiError,
  type AddressOut,
  type AddressProofSection,
  type EnrollmentMe,
  getEnrollmentAddress,
  getEnrollmentMe,
  getErrorMessage,
  isAddressProofSettled,
  patchEnrollmentAddress,
  postEnrollmentCep,
  submitAddressProofKinship,
  uploadEnrollmentAddressProof,
  classifyDocument,
} from "@/lib/api";
import { isValidCep, maskCep } from "@/lib/cep";
import { fetchCities, fetchUfs, type UfOption } from "@/lib/ibge";
import { compressImage } from "@/lib/image-compression";
import { onlyDigits } from "@/lib/phone";
import { ackPoll, pollUntil } from "@/lib/poll";

import {
  ClassifyResult,
  proofVerdict,
  type ClassifyVerdict,
} from "./doc-classify";
import { KinshipChat } from "./kinship-chat";
import { StepProps, handleStepError } from "./step-types";
/* ========================== Seção 2 — Endereço ===================== */

const ADDR_ALWAYS_EDITABLE = new Set(["number", "complement"]);

/**
 * Passo 2 — COMPROVANTE-primeiro (Victor 2026-07-28): a foto/arquivo da conta entra ANTES de
 * qualquer digitação — a IA valida, extrai e POPULA o endereço; o formulário vira confirmação
 * (número/complemento/o que o comprovante não trouxe). As duas telas compartilham
 * status="address" no backend; ele só avança pra "education" com endereço completo E
 * comprovante aprovado. Se a extração completar tudo, o form nem aparece (o status já pulou).
 */
export function StepAddress(props: StepProps) {
  const [phase, setPhase] = useState<"proof" | "form">("proof");
  if (phase === "form") return <StepAddressForm {...props} onComplete={() => props.onDone()} />;
  return <StepAddressProof {...props} onApproved={() => setPhase("form")} />;
}

/** Passo 2a — CEP via ViaCEP; `missing_fields` decide o que o cliente preenche. */
function StepAddressForm({
  onComplete,
  onWrongStatus,
  setBusy,
  busy,
  setFooter,
}: StepProps & { onComplete: () => void }) {
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState<AddressOut | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEnrollmentAddress()
      .then((addr) => {
        if (cancelled || !(addr.cep || addr.zipcode)) return;
        setAddress(addr);
        setCep(maskCep(addr.cep ?? addr.zipcode ?? ""));
        setMissing(addr.missing_fields ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function locked(field: keyof AddressOut): boolean {
    if (ADDR_ALWAYS_EDITABLE.has(field)) return false;
    return !missing.includes(field) && !!address?.[field];
  }

  function set(field: keyof AddressOut, value: string) {
    setAddress((a) => (a ? { ...a, [field]: value } : a));
  }

  async function lookupCep() {
    setError(null);
    setBusy(true, "Buscando seu CEP…");
    try {
      const addr = await postEnrollmentCep(onlyDigits(cep));
      setAddress(addr);
      setMissing(addr.missing_fields ?? []);
    } catch (e: unknown) {
      handleStepError(e, onWrongStatus, setError);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!address) return;
    setError(null);
    setBusy(true, "Salvando seu endereço…");
    try {
      const addr = await patchEnrollmentAddress({
        street: address.street || null,
        number: address.number || null,
        complement: address.complement || null,
        neighborhood: address.neighborhood || null,
        city: address.city || null,
        state: address.state || null,
      });
      setAddress(addr);
      setMissing(addr.missing_fields ?? []);
      if ((addr.missing_fields ?? []).length === 0) {
        onComplete(); // endereço confirmado — comprovante já aprovado veio ANTES (fluxo 2026-07-28)
        return;
      }
      setError(`Ainda falta preencher: ${addr.missing_fields.map(addrLabel).join(", ")}.`);
    } catch (e: unknown) {
      handleStepError(e, onWrongStatus, setError);
    } finally {
      setBusy(false);
    }
  }

  // Sem footer botões manuais — fluxo 100% in-card

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <TextField
            label="CEP"
            placeholder="00000-000"
            inputMode="numeric"
            maxLength={9}
            value={cep}
            onChange={(e) => setCep(maskCep(e.target.value))}
          />
        </div>
        <Button onClick={lookupCep} loading={busy} disabled={!isValidCep(cep) || busy}>
          Buscar
        </Button>
      </div>

      {address ? (
        <>
          <TextField
            label="Rua"
            value={address.street ?? ""}
            disabled={locked("street")}
            onChange={(e) => set("street", e.target.value)}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="Número"
              inputMode="numeric"
              value={address.number ?? ""}
              onChange={(e) => set("number", e.target.value)}
            />
            <TextField
              label="Complemento"
              placeholder="Apto, bloco…"
              value={address.complement ?? ""}
              onChange={(e) => set("complement", e.target.value)}
            />
          </div>
          <TextField
            label="Bairro"
            value={address.neighborhood ?? ""}
            disabled={locked("neighborhood")}
            onChange={(e) => set("neighborhood", e.target.value)}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="Cidade"
              value={address.city ?? ""}
              disabled={locked("city")}
              onChange={(e) => set("city", e.target.value)}
            />
            <TextField
              label="UF"
              maxLength={2}
              value={address.state ?? ""}
              disabled={locked("state")}
              onChange={(e) => set("state", e.target.value.toUpperCase())}
            />
          </div>
        </>
      ) : null}

      <ErrorBox message={error} />

      {address ? (
        <Button
          onClick={submit}
          loading={busy}
          disabled={!address.number || busy}
          className="mt-2 w-full"
        >
          Salvar e continuar
        </Button>
      ) : null}
    </div>
  );
}

const ADDR_LABEL: Record<string, string> = {
  street: "rua",
  number: "número",
  neighborhood: "bairro",
  city: "cidade",
  state: "UF",
};
function addrLabel(field: string): string {
  return ADDR_LABEL[field] ?? field;
}

/* ---- Passo 2b — Comprovante de endereço (obrigatório, validado por IA) ---- */

type ProofPhase =
  | "loading"
  | "capture"
  | "analyzing"
  | "rejected"
  | "review"
  | "needs_kinship"
  | "timeout";

function proofPhaseFrom(status?: string | null): ProofPhase {
  if (status === "rejected") return "rejected";
  if (status === "review") return "review";
  if (status === "needs_kinship") return "needs_kinship";
  if (status === "pending") return "analyzing";
  return "capture"; // sem foto ainda / status desconhecido → capturar
}

/**
 * Comprovante de residência: foto/PDF → IA valida (endereço + titular). Mesmo padrão do RG:
 * o POST responde na hora e fazemos polling no /me até a IA decidir. `approved` avança o wizard;
 * `needs_kinship` pede o parentesco do titular da conta.
 */
function StepAddressProof({
  onDone,
  onWrongStatus,
  setBusy,
  busy,
  setFooter,
  onApproved,
}: StepProps & {
  /** Comprovante aprovado mas o endereço ainda tem lacuna → confirma no formulário. */
  onApproved: () => void;
}) {
  const [phase, setPhase] = useState<ProofPhase>("loading");
  const [proof, setProof] = useState<AddressProofSection | null>(null);
  const [file, setFile] = useState<File | null>(null);
  // Classificação RÁPIDA antes do envio (Victor 2026-07-28): a IA só confere se é MESMO um
  // comprovante — identidade/não-documento pedem outra foto; a validação de verdade é a async.
  const [verdict, setVerdict] = useState<ClassifyVerdict | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [relation, setRelation] = useState("");
  // `error` (rede/status) abre MODAL; `fieldError` (validação do parentesco) fica inline.
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  // Reprovação da IA em MODAL (uma vez por decisão; fechar = pronto pra reenviar).
  const [rejectedNotice, setRejectedNotice] = useState<string | null>(null);

  // Já avançou de "address" → onDone (extração completou tudo). Aprovado mas AINDA em
  // "address" → falta campo no endereço: vai pro formulário confirmar. Senão segue na tela.
  function resolveFrom(me: EnrollmentMe): boolean {
    if (me.status !== "address") {
      onDone(me.status);
      return true;
    }
    if (me.address_proof?.status === "approved" || me.address_proof?.status === "review") {
      onApproved();
      return true;
    }
    setProof(me.address_proof ?? null);
    return false;
  }

  useEffect(() => {
    let cancelled = false;
    getEnrollmentMe()
      .then((me) => {
        if (cancelled) return;
        if (resolveFrom(me)) return;
        const st = me.address_proof?.status;
        setPhase(proofPhaseFrom(st));
        if (st === "rejected") {
          setRejectedNotice(
            me.address_proof?.reason ??
              "O comprovante não passou na validação. Envie uma conta recente, nítida e com o endereço legível.",
          );
        }
      })
      .catch(() => {
        if (!cancelled) setPhase("capture");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Depois de enviar (foto ou parentesco): avança se decidido, senão faz polling até a IA decidir.
  async function settle(me: EnrollmentMe) {
    if (resolveFrom(me)) return;
    setPhase("analyzing");
    const last = await pollUntil(getEnrollmentMe, (m) =>
      isAddressProofSettled(m.address_proof?.status),
    );
    if (resolveFrom(last)) return;
    const st = last.address_proof?.status;
    setPhase(isAddressProofSettled(st) ? proofPhaseFrom(st) : "timeout");
    if (st === "rejected") {
      setRejectedNotice(
        last.address_proof?.reason ??
          "O comprovante não passou na validação. Envie uma conta recente, nítida e com o endereço legível.",
      );
    }
    setFile(null);
  }

  // Auto-upload when file is selected
  async function onPickProofFile(f: File | null) {
    setFile(f);
    setVerdict(null);
    setError(null);
    if (!f) return;
    setClassifying(true);
    let v: ClassifyVerdict = { kind: "confirm" };
    try {
      v = proofVerdict(await classifyDocument(f));
      setVerdict(v);
    } catch {
      v = { kind: "confirm" };
      setVerdict(v);
    } finally {
      setClassifying(false);
    }

    if (v.kind === "wrong_kind" || v.kind === "not_document") {
      return;
    }

    // Auto-trigger upload
    setError(null);
    setBusy(true, "Validando seu comprovante…");
    setPhase("analyzing");
    try {
      const compressed = await compressImage(f);
      await settle(await uploadEnrollmentAddressProof(compressed));
      setVerdict(null);
    } catch (e: unknown) {
      setPhase("capture");
      handleStepError(e, onWrongStatus, setError);
    } finally {
      setBusy(false);
    }
  }

  const canSubmitProof =
    verdict != null && verdict.kind !== "wrong_kind" && verdict.kind !== "not_document";

  async function uploadAndAnalyze() {
    if (!file || !canSubmitProof) return;
    setError(null);
    setBusy(true, "Validando seu comprovante…");
    setPhase("analyzing");
    try {
      const compressed = await compressImage(file);
      await settle(await uploadEnrollmentAddressProof(compressed));
      setVerdict(null);
    } catch (e: unknown) {
      setPhase("capture");
      handleStepError(e, onWrongStatus, setError);
    } finally {
      setBusy(false);
    }
  }

  async function submitKinship() {
    if (!relation.trim()) {
      setFieldError("Diga quem é o titular da conta e o parentesco.");
      return;
    }
    setFieldError(null);
    setError(null);
    setBusy(true, "Registrando o titular…");
    try {
      await settle(await submitAddressProofKinship(relation.trim()));
    } catch (e: unknown) {
      handleStepError(e, onWrongStatus, setError);
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true, "Atualizando a situação…");
    setError(null);
    try {
      await settle(await getEnrollmentMe());
    } catch (e: unknown) {
      handleStepError(e, onWrongStatus, setError);
    } finally {
      setBusy(false);
    }
  }

  if (phase === "loading" || phase === "analyzing") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <InlineSpinner className="size-9" />
        <p className="text-base font-semibold text-brand-ink">
          {phase === "loading" ? "Carregando…" : "Conferindo seu comprovante…"}
        </p>
        {phase === "analyzing" ? (
          <p className="text-sm leading-relaxed text-brand-muted">
            Estamos validando o endereço e o titular. Leva alguns segundos.
          </p>
        ) : null}
      </div>
    );
  }

  if (phase === "needs_kinship") {
    // Diálogo conduzido por IA (CopilotKit): a IA conversa e chama `registrarParentesco`, que
    // submete via submitAddressProofKinship. O backend (evaluate_kinship) avalia o fundamento e
    // corrige o português no servidor. `relation` é mantido pro fallback do botão do footer.
    return (
      <div className="flex flex-col gap-[18px]">
        <KinshipChat
          busy={busy}
          kind={proof?.kinship_kind === "confirm" ? "confirm" : "justify"}
          onSubmit={async (rel) => {
            setRelation(rel);
            await settle(await submitAddressProofKinship(rel));
          }}
        />
        <ErrorBox message={fieldError} />
        {error ? (
          <FeedbackModal
            title="Ops, não deu certo"
            description={error}
            variant="danger"
            primaryAction={{
              label: "Entendi",
              onClick: () => setError(null),
            }}
            onClose={() => setError(null)}
          />
        ) : null}
      </div>
    );
  }

  // capture | rejected
  return (
    <div className="flex flex-col gap-[18px]">
      <p className="text-base leading-relaxed text-brand-muted">
        {phase === "rejected"
          ? // O motivo público do servidor cobre também o `needs_new_proof` ("de preferência
            // no SEU nome") — a orientação certa vem dele, não daqui.
            (proof?.reason ??
            "O último comprovante não passou — envie outro, recente e com o endereço legível.")
          : "Envie um comprovante de residência — conta de luz, água, internet ou telefone dos últimos 3 meses, com o endereço legível."}
      </p>

      <FileUpload
        label="Comprovante de endereço"
        hint="Foto, imagem ou PDF — conta de luz, água, internet ou telefone."
        file={file}
        onChange={onPickProofFile}
      />

      {classifying ? (
        <p className="text-[14px] font-semibold text-brand-muted">Reconhecendo o documento…</p>
      ) : verdict && verdict.kind !== "wrong_kind" && verdict.kind !== "not_document" ? (
        <ClassifyResult
          verdict={verdict}
          onAccept={uploadAndAnalyze}
          onRetry={() => onPickProofFile(null)}
          busy={busy}
        />
      ) : null}

      {verdict && (verdict.kind === "wrong_kind" || verdict.kind === "not_document") ? (
        <FeedbackModal
          title={
            verdict.kind === "wrong_kind"
              ? "Isso parece um documento de identidade"
              : "Não achei um comprovante aí"
          }
          description={
            verdict.kind === "wrong_kind"
              ? "Aqui é a vez do comprovante de residência — conta de luz, água, internet ou telefone com o seu endereço. O RG você já enviou. 😉"
              : "Não reconhecemos um comprovante nessa foto. Envie uma conta recente, nítida e com o endereço aparecendo."
          }
          variant="warning"
          primaryAction={{
            label: "Enviar outra foto",
            onClick: () => onPickProofFile(null),
          }}
          onClose={() => onPickProofFile(null)}
        />
      ) : null}

      {/* Erros em MODAL (fechar = componente pronto pra reenviar): */}
      {rejectedNotice ? (
        <FeedbackModal
          title="O comprovante não passou 😕"
          description={rejectedNotice}
          variant="warning"
          primaryAction={{
            label: "Enviar novo comprovante",
            onClick: () => setRejectedNotice(null),
          }}
          onClose={() => setRejectedNotice(null)}
        />
      ) : error ? (
        <FeedbackModal
          title="Ops, não deu certo"
          description={error}
          variant="danger"
          primaryAction={{
            label: "Entendi",
            onClick: () => setError(null),
          }}
          onClose={() => setError(null)}
        />
      ) : null}
    </div>
  );
}
