import { createServer } from "node:http";

const port = Number(process.env.MOCK_BACKEND_PORT ?? 8765);

function freshState() {
  return {
    status: "started",
    phase: "candidate",
    transitioned: false,
    pixValidated: false,
    educationPresent: false,
    addressProof: null,
    classifyIsDocument: true,
    classifyCompleteness: "front",
    classifyIsLegible: true,
    failNextClassify: false,
    failNextProof: false,
    /** Liga o novo endpoint unificado `/me` (desligado por default p/ não
     *  interferir com os testes legados — ligar via `?newMe=1` no /__stage). */
    useNewMe: false,
    address: {
      zipcode: null,
      street: null,
      number: null,
      complement: null,
      neighborhood: null,
      city: null,
      state: null,
      missing_fields: ["zipcode", "street", "number", "city", "state"],
    },
    document: {
      doc_type: null,
      analysis_status: null,
      analysis_reason: null,
      missing_fields: ["doc_type"],
      next_slot: null,
      photos: {},
    },
    selfie: {
      taken_at: null,
      analysis_status: "pending",
      analysis_reason: null,
      hub_whatsapp: "5511920062177",
    },
  };
}

let state = freshState();

function json(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function openAICompletion(response, content) {
  return json(response, 200, {
    id: "chatcmpl-education-e2e",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "e2e-education",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: JSON.stringify(content) },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
  });
}

function candidateMe() {
  return {
    status: state.status,
    profile: {
      name: "Promotor E2E V7M",
      birth_date: "1990-01-01",
      mother_name: "Maria E2E",
      father_name: "José E2E",
      birthplace: "São Paulo/SP",
      marital_status: "solteiro",
      nationality: "brasileira",
      education_level: state.educationPresent ? "medio" : null,
      // Ambos os campos: o back novo expõe `education_status` (string); o
      // legado tinha `education_completed` (boolean). O front (deriveEducation)
      // lê `education_status`, então o mock precisa alimentar esse.
      education_status: state.educationPresent ? "completed" : null,
      education_completed: state.educationPresent ? true : null,
    },
    address: state.address,
    address_proof: state.addressProof,
    documents: state.document.doc_type
      ? {
          [state.document.doc_type]: {
            // O front (deriveDocuments) lê `validation_status`. O legado
            // do back usava `analysis_status` — aliasamos para os dois
            // campos serem consistentes.
            validation_status: state.document.analysis_status,
            analysis_status: state.document.analysis_status,
            analysis_reason: state.document.analysis_reason,
            front_photo: state.document.front_photo,
            back_photo: state.document.back_photo,
            full_photo: state.document.full_photo,
          },
        }
      : {},
    selfie: state.selfie,
    pix_validated: state.pixValidated,
  };
}

function roles() {
  if (state.phase === "training") return ["training", "promoter"];
  if (state.phase === "promoter") return ["promoter"];
  return ["candidate"];
}

function handle(request, response) {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const path = url.pathname;

  if (path === "/health") return json(response, 200, { ok: true });
  if (path === "/v1/chat/completions" && request.method === "POST") {
    request.resume();
    return openAICompletion(response, {
      reply: "Resposta deliberadamente inconsistente para testar a normalização.",
      level: null,
      grade: 9,
      education_status: null,
      year: null,
      city: "Curitiba",
      school: "",
    });
  }
  if (path === "/__reset" && request.method === "POST") {
    state = freshState();
    return json(response, 200, { ok: true });
  }
  if (path === "/__approve" && request.method === "POST") {
    state.phase = "training";
    return json(response, 200, { ok: true });
  }
  if (path === "/__classify" && request.method === "POST") {
    state.classifyIsDocument = url.searchParams.get("document") !== "0";
    state.classifyCompleteness = url.searchParams.get("completeness") ?? "front";
    state.classifyIsLegible = url.searchParams.get("legible") !== "0";
    return json(response, 200, { ok: true });
  }
  if (path === "/__fail-next-classify" && request.method === "POST") {
    state.failNextClassify = true;
    return json(response, 200, { ok: true });
  }
  // Marca o onboarding como 100% completo (preenche os blocos que o /me
  // checa: documents.rg=approved, address_proof=approved, pix_validated,
  // education_level+status, selfie=approved). Usado pelos testes que
  // precisam ver o estado "aguardando polo".
  if (path === "/__onboarding-complete" && request.method === "POST") {
    state.status = "completed";
    state.pixValidated = true;
    state.educationPresent = true;
    state.document = {
      doc_type: "rg",
      analysis_status: "approved",
      analysis_reason: null,
      missing_fields: [],
      next_slot: null,
      photos: { rg_front: { status: "approved" }, rg_back: { status: "approved" } },
      front_photo: "/media/front.jpg",
      back_photo: "/media/back.jpg",
    };
    state.addressProof = {
      exists: true,
      photo: "/media/address-proof.jpg",
      status: "approved",
      reason: null,
      needs_kinship: false,
      kinship_relation: null,
    };
    state.selfie = {
      taken_at: "2026-08-01T10:00:00-03:00",
      analysis_status: "approved",
      analysis_reason: null,
      hub_whatsapp: "5511920062177",
    };
    return json(response, 200, { ok: true });
  }
  if (path === "/__fail-next-proof" && request.method === "POST") {
    state.failNextProof = true;
    return json(response, 200, { ok: true });
  }
  if (path === "/__stage" && request.method === "POST") {
    // Só atualiza o campo se a query param estiver presente — assim o
    // helper `?newMe=1` não zera pix/education configurados antes.
    const statusParam = url.searchParams.get("status");
    if (statusParam !== null) state.status = statusParam;
    if (url.searchParams.has("pix")) state.pixValidated = url.searchParams.get("pix") === "1";
    if (url.searchParams.has("education")) state.educationPresent = url.searchParams.get("education") === "1";
    if (url.searchParams.get("newMe") === "1") state.useNewMe = true;
    if (url.searchParams.get("newMe") === "0") state.useNewMe = false;
    if (["address", "documents", "pix", "education", "selfie"].includes(state.status)) {
      state.address = {
        zipcode: "01310100",
        street: "Avenida Paulista",
        number: "1000",
        complement: "",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
        missing_fields: [],
      };
    }
    if (["pix", "education", "selfie"].includes(state.status)) {
      state.document = {
        doc_type: "rg",
        analysis_status: "pending",
        analysis_reason: null,
        missing_fields: [],
        front_photo: "/media/front.jpg",
        back_photo: "/media/back.jpg",
        next_slot: null,
        photos: {
          rg_front: { status: "pending" },
          rg_back: { status: "pending" },
        },
      };
      state.addressProof = {
        exists: true,
        photo: "/media/address-proof.jpg",
        status: "pending",
        reason: null,
        needs_kinship: false,
        kinship_relation: null,
      };
    }
    return json(response, 200, { ok: true });
  }

  if (path === "/api/v1/collaborators/auth/check" && request.method === "POST") {
    return json(response, 200, {
      found: true,
      external_id: "candidate-e2e",
      otp_sent: true,
      otp_wait: 1,
    });
  }
  if (path === "/api/v1/collaborators/auth/login" && request.method === "POST") {
    return json(response, 200, {
      access_token: "access-e2e",
      refresh_token: "refresh-e2e",
      token_type: "bearer",
    });
  }
  if (path === "/api/v1/collaborators/auth/join" && request.method === "POST") {
    return json(response, 200, {
      access_token: "access-e2e",
      refresh_token: "refresh-e2e",
      token_type: "bearer",
    });
  }
  if (path === "/api/v1/collaborators/auth/refresh" && request.method === "POST") {
    state.transitioned = true;
    return json(response, 200, {
      access_token: "access-promoted-e2e",
      refresh_token: "refresh-promoted-e2e",
    });
  }
  if (path === "/api/v1/collaborators/whoami") {
    return json(response, 200, {
      external_id: "candidate-e2e",
      roles: roles(),
      name: "Promotor E2E V7M",
    });
  }
  if (path === "/api/v1/collaborators/candidate/me") {
    return json(response, 200, candidateMe());
  }
  if (path === "/api/v1/collaborators/candidate/profile" && request.method === "POST") {
    state.status = "profile";
    return json(response, 200, candidateMe());
  }
  if (path === "/api/v1/collaborators/candidate/address") {
    if (request.method === "GET") return json(response, 200, state.address);
    if (request.method === "POST") {
      state.address = {
        zipcode: "01310100",
        street: "Avenida Paulista",
        number: null,
        complement: "",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
        missing_fields: ["number"],
      };
      return json(response, 200, candidateMe());
    }
    if (request.method === "PATCH") {
      state.address.number = "1000";
      state.address.missing_fields = [];
      state.status = "address";
      return json(response, 200, candidateMe());
    }
  }
  if (path === "/api/v1/collaborators/candidate/document") {
    return json(response, 200, state.document);
  }
  if (
    path === "/api/v1/collaborators/candidate/documents/classify" &&
    request.method === "POST"
  ) {
    if (state.failNextClassify) {
      state.failNextClassify = false;
      return json(response, 503, {
        detail: "Classificador temporariamente indisponível.",
        code: "CLASSIFIER_UNAVAILABLE",
      });
    }
    return json(response, 200, {
      is_document: state.classifyIsDocument,
      doc_type: state.classifyIsDocument ? "rg" : null,
      completeness: state.classifyCompleteness,
      is_legible: state.classifyIsLegible,
      reason: state.classifyIsLegible
        ? "Documento legível."
        : "A imagem está desfocada e não dá para ler o documento.",
    });
  }
  if (
    path.startsWith("/api/v1/collaborators/candidate/documents/photo/") &&
    request.method === "POST"
  ) {
    const slot = path.split("/").at(-1);
    state.document.doc_type = slot.startsWith("cnh_") ? "cnh" : "rg";
    state.document.analysis_status = "pending";
    state.document.missing_fields = [];
    state.document.photos[slot] = { status: "pending" };
    if (slot.endsWith("_front")) state.document.front_photo = "/media/front.jpg";
    if (slot.endsWith("_back")) state.document.back_photo = "/media/back.jpg";
    if (slot.endsWith("_full")) state.document.full_photo = "/media/full.jpg";
    state.status = "documents";
    return json(response, 200, { accepted: true, poll_after_ms: 10 });
  }
  if (
    path === "/api/v1/collaborators/candidate/documents/address-proof" &&
    request.method === "POST"
  ) {
    if (state.failNextProof) {
      state.failNextProof = false;
      return json(response, 503, {
        detail: "Falha temporária ao armazenar o comprovante.",
        code: "UPLOAD_TEMPORARY_FAILURE",
      });
    }
    state.addressProof = {
      exists: true,
      photo: "/media/address-proof.jpg",
      status: "pending",
      reason: null,
      needs_kinship: false,
      kinship_relation: null,
    };
    return json(response, 200, candidateMe());
  }
  if (path === "/api/v1/collaborators/candidate/pix" && request.method === "POST") {
    state.pixValidated = true;
    state.status = "pix";
    return json(response, 200, candidateMe());
  }
  if (
    path === "/api/v1/collaborators/candidate/education" &&
    request.method === "POST"
  ) {
    state.educationPresent = true;
    state.status = "education";
    return json(response, 200, candidateMe());
  }
  if (path === "/api/v1/collaborators/candidate/selfie") {
    if (request.method === "GET") {
      if (state.phase === "training") {
        return json(
          response,
          state.transitioned ? 403 : 401,
          state.transitioned
            ? { detail: "Acesso negado para o seu papel.", code: "FORBIDDEN_ROLE" }
            : { detail: "Token desatualizado.", code: "UNAUTHORIZED" },
        );
      }
      return json(response, 200, state.selfie);
    }
    if (request.method === "POST") {
      state.selfie = {
        taken_at: "2026-07-21T12:00:00Z",
        analysis_status: "approved",
        analysis_reason: "Aprovada pelo adapter KYC sintético.",
        hub_whatsapp: "5511920062177",
      };
      state.status = "approved";
      state.phase = "training";
      state.transitioned = false;
      return json(response, 200, { accepted: true, poll_after_ms: 10 });
    }
  }
  if (path === "/api/v1/collaborators/training/materials") {
    return json(response, 200, [
      {
        material_external_id: "material-e2e",
        title: "Como indicar com clareza",
        blocking: true,
        kind: "text",
        question: "Como você explicaria a proposta para uma pessoa interessada?",
        text_content: "Explique o curso sem prometer aprovação ou emprego.",
        submission_status: state.phase === "promoter" ? "approved" : null,
      },
    ]);
  }
  if (
    path === "/api/v1/collaborators/training/submissions" &&
    request.method === "POST"
  ) {
    state.phase = "promoter";
    return json(response, 200, { accepted: true });
  }
  if (path === "/api/v1/collaborators/promoter/me") {
    return json(response, 200, {
      external_id: "promoter-e2e",
      hub_external_id: "hub-e2e",
      status: "active",
      ref_url: "https://job.v7m.org/?ref=e2e",
    });
  }
  if (path === "/api/v1/collaborators/promoter/me/summary") {
    return json(response, 200, {
      week_goal: 5,
      week_paid_leads: 1,
      week_commission_total: "100.00",
      bonus_amount: "500.00",
      goal_reached: false,
      next_closing_at: "2026-07-25T21:00:00Z",
      lifetime: { total_received: "100.00", total_students: 1, goals_hit: 0 },
    });
  }

  // ── NOVO: endpoint unificado `/me` (modelo "tudo-async-até-receber") ──
  // Default: 404 (forçando fallback p/ os 3 endpoints legados). Liga via
  // `?newMe=1` no /__stage p/ testar o caminho novo.
  if (path === "/api/v1/collaborators/me") {
    if (!state.useNewMe) {
      return json(response, 404, {
        detail: "Endpoint /me não habilitado neste mock.",
        code: "NOT_FOUND",
      });
    }
    const c = candidateMe();
    const docs = c.documents ?? {};
    const docSlot = docs.rg ?? docs.cnh ?? null;
    const addressProof = c.address_proof;
    const selfie = c.selfie;

    // Deriva `steps` na mesma regra que o front usa no fallback (re-aplica
    // a lógica de `me-derive` no mock, pra refletir o que o back faria).
    const docDone = docSlot?.validation_status === "approved";
    const addrDone = addressProof?.status === "approved";
    const pixDone = c.pix_validated === true;
    const eduDone = Boolean(c.profile?.education_level) && Boolean(c.profile?.education_status);
    const selfieDone = selfie?.taken_at && selfie.analysis_status === "approved";

    const onboarding_complete = docDone && addrDone && pixDone && eduDone && selfieDone;

    let payoutReason = "none";
    if (state.phase === "candidate" || state.phase === "training") {
      payoutReason = onboarding_complete ? "pending_polo_approval" : "onboarding_incomplete";
    }

    const isPromoterPhase = state.phase === "promoter";
    return json(response, 200, {
      external_id: "u-e2e",
      name: "Promotor E2E V7M",
      roles: roles(),
      candidate: {
        status: c.status,
        approved_at: isPromoterPhase ? "2026-07-25T18:00:00Z" : null,
        rejected_at: null,
        rejection_reason: null,
        onboarding_complete,
        steps: {
          documents: {
            done: docDone,
            status: docSlot?.validation_status ?? null,
            reason: docSlot?.analysis_reason ?? null,
          },
          address: {
            done: addrDone,
            status: addressProof?.status ?? null,
            reason: addressProof?.reason ?? null,
          },
          pix: { done: pixDone, status: pixDone ? "approved" : null, reason: null },
          education: { done: eduDone, status: eduDone ? "approved" : null, reason: null },
          selfie: {
            done: Boolean(selfieDone),
            status: selfie?.analysis_status ?? null,
            reason: selfie?.analysis_reason ?? null,
          },
        },
      },
      promoter: {
        external_id: "p-e2e",
        hub_external_id: "hub-e2e",
        status: "active",
        ref_url: "https://job.v7m.org/?ref=e2e",
        pre_matriculado: false,
        summary: {
          week_goal: 5,
          week_paid_leads: 1,
          week_commission_total: "100.00",
          bonus_amount: "500.00",
          goal_reached: false,
          next_closing_at: "2026-07-25T21:00:00Z",
          lifetime: { total_received: "100.00", total_students: 1, goals_hit: 0 },
          payout_hold: {
            held: payoutReason !== "none",
            reason: payoutReason,
            amount_held: payoutReason !== "none" ? "100.00" : "0.00",
            next_payout_at: payoutReason !== "none" ? "2026-08-01T21:00:00Z" : null,
          },
        },
      },
    });
  }

  return json(response, 404, { detail: `Mock sem rota: ${path}`, code: "NOT_FOUND" });
}

const server = createServer((request, response) => {
  request.on("error", () => response.destroy());
  request.on("data", () => {});
  request.on("end", () => handle(request, response));
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`mock backend listening on http://127.0.0.1:${port}\n`);
});
