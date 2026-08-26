import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const port = Number(process.env.MOCK_BACKEND_PORT ?? 8765);

/** PNG real servido em /media/* — o proxy de mídia precisa de bytes de verdade. */
const PNG_BYTES = Buffer.from(
  readFileSync(new URL("../fixtures/identity.png.base64", import.meta.url), "utf8").trim(),
  "base64",
);

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
    // Próximo POST de selfie responde 409 WRONG_STATUS com este expected_status.
    wrongStatusOnSelfie: null,
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
    blocks: [],
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
      education_completed: state.educationPresent ? true : null,
    },
    address: state.address,
    address_proof: state.addressProof,
    documents: state.document.doc_type
      ? { [state.document.doc_type]: state.document }
      : {},
    selfie: state.selfie,
    pix_validated: state.pixValidated,
    blocks: state.blocks,
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
  if (path === "/__promote" && request.method === "POST") {
    state.phase = "promoter";
    state.status = "approved";
    state.pixValidated = true;
    state.educationPresent = true;
    state.document = {
      doc_type: "rg",
      validation_status: "approved",
      analysis_status: "approved",
      missing_fields: [],
      front_photo: "/media/front.jpg",
      back_photo: "/media/back.jpg",
      photos: {
        rg_front: { status: "approved" },
        rg_back: { status: "approved" },
      },
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
      taken_at: "2026-07-21T12:00:00Z",
      analysis_status: "approved",
      photo: "/media/selfie.png",
      hub_whatsapp: "5511920062177",
    };
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
  if (path === "/__fail-next-proof" && request.method === "POST") {
    state.failNextProof = true;
    return json(response, 200, { ok: true });
  }
  if (path === "/__blocks" && request.method === "POST") {
    state.blocks = [
      {
        external_id: "blk-1",
        source_type: "rg",
        title: "Foto do RG ilegível",
        description: "A foto do verso do seu RG ficou cortada. Por favor, envie uma nova foto nítida.",
        action_label: "Reenviar RG",
        action_route: "/documento",
        created_at: new Date().toISOString(),
      },
    ];
    return json(response, 200, { ok: true });
  }
  if (path === "/__wrong-status-selfie" && request.method === "POST") {
    state.wrongStatusOnSelfie = url.searchParams.get("expected") ?? "pix";
    return json(response, 200, { ok: true });
  }
  // Mídia autenticada do backend (foto de aula, selfie, documento). Só responde
  // com Authorization — é o que o proxy /api/me/media precisa provar que faz.
  if (path.startsWith("/media/")) {
    if (!request.headers.authorization) {
      return json(response, 401, { detail: "Sem sessão.", code: "UNAUTHORIZED" });
    }
    response.writeHead(200, { "Content-Type": "image/png" });
    response.end(PNG_BYTES);
    return;
  }
  if (path === "/__stage" && request.method === "POST") {
    state.status = url.searchParams.get("status") ?? state.status;
    state.pixValidated = url.searchParams.get("pix") === "1";
    state.educationPresent = url.searchParams.get("education") === "1";
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
      if (state.wrongStatusOnSelfie) {
        const expected = state.wrongStatusOnSelfie;
        state.wrongStatusOnSelfie = null;
        return json(response, 409, {
          detail: "Etapa fora de ordem.",
          code: "WRONG_STATUS",
          expected_status: expected,
        });
      }
      state.selfie = {
        taken_at: "2026-07-21T12:00:00Z",
        analysis_status: "approved",
        analysis_reason: "Aprovada pelo adapter KYC sintético.",
        photo: "/media/selfie.png",
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
        photo: "/media/lesson.png",
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
      ref_url: "https://supletivo.net.br/?ref=e2e",
    });
  }
  if (path === "/api/v1/collaborators/promoter/me/commissions") {
    return json(response, 200, [
      {
        external_id: "comm-1",
        amount: "100.00",
        status: "paid",
        source: "lead",
        created_at: "2026-07-18T10:00:00Z",
        paid_at: "2026-07-20T18:00:00Z",
      },
      {
        external_id: "comm-2",
        amount: "100.00",
        status: "pending",
        source: "lead",
        created_at: "2026-07-22T15:00:00Z",
      },
    ]);
  }
  if (path === "/api/v1/collaborators/promoter/me/leads") {
    return json(response, 200, [
      {
        external_id: "lead-1",
        name: "Carlos Aluno",
        phone: "11987654321",
        status: "paid",
        created_at: "2026-07-22T14:00:00Z",
      },
      {
        external_id: "lead-2",
        name: "Mariana Teste",
        phone: "11999998888",
        status: "waiting",
        created_at: "2026-07-23T11:00:00Z",
      },
    ]);
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
