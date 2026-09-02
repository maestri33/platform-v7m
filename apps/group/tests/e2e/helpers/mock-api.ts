import { Page } from "@playwright/test";

export const MOCK_STAFF_USER = {
  id: "usr-admin-1",
  external_id: "ext-admin-1",
  name: "Administrador Master",
  email: "admin@v7m.com.br",
  is_superuser: true,
};

export const MOCK_HUBS = [
  {
    id: "hub-1",
    external_id: "hub-ext-1",
    brand: "wyden",
    name: "Polo Central SP",
    city: "São Paulo",
    state: "SP",
    is_default: true,
    coordinator_external_id: "prom-1",
    coordinator_name: "Mariana Souza",
    address: {
      street: "Av. Paulista",
      number: "1000",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      cep: "01310-100",
    },
  },
  {
    id: "hub-2",
    external_id: "hub-ext-2",
    brand: "estacio",
    name: "Polo Rio de Janeiro",
    city: "Rio de Janeiro",
    state: "RJ",
    is_default: false,
    coordinator_external_id: null,
    coordinator_name: null,
    address: {
      street: "Av. Atlântica",
      number: "500",
      neighborhood: "Copacabana",
      city: "Rio de Janeiro",
      state: "RJ",
      cep: "22070-000",
    },
  },
];

export const MOCK_STUDENTS = [
  {
    id: "std-1",
    external_id: "std-1",
    name: "Carlos Eduardo Silva",
    student_name: "Carlos Eduardo Silva",
    email: "carlos.silva@example.com",
    phone: "11999998888",
    cpf: "123.456.789-00",
    status: "completed",
    hub_external_id: "hub-ext-1",
    hub_brand: "wyden",
    created_at: "2026-01-15T10:00:00Z",
  },
  {
    id: "std-2",
    external_id: "std-2",
    name: "Juliana Mendes",
    student_name: "Juliana Mendes",
    email: "juliana.mendes@example.com",
    phone: "21988887777",
    cpf: "987.654.321-11",
    status: "in_progress",
    hub_external_id: "hub-ext-2",
    hub_brand: "estacio",
    created_at: "2026-02-01T14:30:00Z",
  },
];

export const MOCK_ENROLLMENTS = [
  {
    id: "enr-1",
    external_id: "enr-1",
    student_id: "std-1",
    student_name: "Carlos Eduardo Silva",
    name: "Carlos Eduardo Silva",
    cpf: "123.456.789-00",
    course_name: "Gestão Comercial & Vendas V7M",
    status: "completed",
    hub_brand: "wyden",
    hub_external_id: "hub-ext-1",
    amount: 1200.0,
    created_at: "2026-01-15T10:00:00Z",
  },
  {
    id: "enr-2",
    external_id: "enr-2",
    student_id: "std-2",
    student_name: "Juliana Mendes",
    name: "Juliana Mendes",
    cpf: "987.654.321-11",
    course_name: "Liderança de Alta Performance",
    status: "active",
    hub_brand: "estacio",
    hub_external_id: "hub-ext-2",
    amount: 1500.0,
    created_at: "2026-02-01T14:30:00Z",
  },
];

export const MOCK_COORDINATORS = [
  {
    id: "coord-1",
    external_id: "coord-ext-1",
    name: "Mariana Souza",
    email: "mariana.souza@v7m.com.br",
    phone: "11977776666",
    cpf: "11122233344",
    hubs: [
      {
        external_id: "hub-ext-1",
        brand: "wyden",
        city: "São Paulo",
        state: "SP",
        is_default: true,
        promoters_count: 12,
        students_count: 42,
      },
    ],
    hubs_count: 1,
    promoters_count: 12,
    students_count: 42,
    total_commission: "1200.00",
    pending_commission: "300.00",
    active: true,
  },
];

export const MOCK_PROMOTERS = [
  {
    external_id: "prom-1",
    name: "Lucas Rocha",
    code: "LUCAS10",
    phone: "11966665555",
    active: true,
  },
];

export const MOCK_USERS = [
  {
    id: "usr-admin-1",
    external_id: "ext-admin-1",
    name: "Administrador Master",
    cpf: "12345678900",
    phone: "11999999999",
    is_superuser: true,
    roles: ["coordinator", "promoter"],
  },
  {
    id: "usr-coord-1",
    external_id: "coord-ext-1",
    name: "Mariana Souza",
    cpf: "11122233344",
    phone: "11977776666",
    is_superuser: false,
    roles: ["coordinator"],
  },
  {
    id: "usr-std-1",
    external_id: "std-1",
    name: "Carlos Eduardo Silva",
    cpf: "12345678900",
    phone: "11999998888",
    is_superuser: false,
    roles: ["student", "veteran"],
  },
  {
    id: "usr-prom-1",
    external_id: "prom-1",
    name: "Lucas Rocha",
    cpf: "33344455566",
    phone: "11966665555",
    is_superuser: false,
    roles: ["promoter"],
  },
];

export const MOCK_FINANCE_BALANCE = {
  total_revenue: 285400.0,
  available_balance: 94250.0,
  balance: 94250.0,
  pending_balance: 18500.0,
  month_revenue: 62400.0,
};

export const MOCK_FINANCE_SUMMARY = {
  gross_sales: 320000.0,
  net_revenue: 285400.0,
  commissions_paid: 34600.0,
  pending_payouts: 18500.0,
};

export const MOCK_CLOSING_HEALTH = {
  obrigacao_estimada: 12500.0,
  saldo: 45000.0,
  suficiente: true,
  deficit: "0.00",
  status: "healthy",
  divergences_count: 0,
  last_closing_date: "2026-08-01T00:00:00Z",
};

export const MOCK_LEADS = [
  {
    id: "lead-1",
    external_id: "lead-1",
    name: "Fernanda Costa",
    phone: "11955554444",
    email: "fernanda.costa@example.com",
    cpf: "555.666.777-88",
    status: "new",
    hub_external_id: "hub-ext-1",
    created_at: "2026-08-20T09:00:00Z",
  },
  {
    id: "lead-2",
    external_id: "lead-2",
    name: "Gabriel Santos",
    phone: "21944443333",
    email: "gabriel.santos@example.com",
    cpf: "444.333.222-11",
    status: "paid",
    hub_external_id: "hub-ext-2",
    created_at: "2026-08-21T11:00:00Z",
  },
];

export const MOCK_LOGS = [
  {
    id: "log-1",
    timestamp: "2026-08-24T12:00:00Z",
    level: "INFO",
    event: "STAFF_LOGIN",
    message: "Admin Master realizou login com sucesso",
  },
  {
    id: "log-2",
    timestamp: "2026-08-24T11:45:00Z",
    level: "INFO",
    event: "ENROLLMENT_COMPLETED",
    message: "Matrícula enr-1 concluída para Carlos Eduardo Silva",
  },
];

export const MOCK_PLATFORM_SETUP = {
  boss: {
    name: "Administrador Master",
    cpf: "12345678900",
    phone: "11999999999",
    email: "admin@v7m.com.br",
    pix_key: "admin@v7m.com.br",
    default_brand: "wyden",
    is_configured: true,
    external_id: "ext-boss-1",
  },
  pricing: {
    price_pix: "97",
    price_card_reais: "97.00",
    promo_price_pix: "47",
    promo_price_card_reais: "47.00",
    promoter_student_min_leads: 3,
    promoter_student_target_leads: 10,
    card_installments: 12,
    description: "Matrícula Supletivo V7M",
  },
  commissions: {
    commission_direct: "15",
    commission_bonus_flat: "5",
    commission_bonus_threshold: 5,
    commission_coordinator: "3",
    commission_closing_weekday: 4,
    commission_closing_hour: 18,
  },
  integrations: {
    asaas: { value: "configured", active: true },
    whatsapp: { value: "configured", active: true },
    notify: { value: "configured", active: true },
    ai: { value: "configured", active: true },
    cpf: { value: "configured", active: true },
    infinitepay: { value: "configured", active: true },
  },
};

export const MOCK_INTEGRATIONS = [
  { name: "asaas", active: true, status: "connected", healthy: true },
  { name: "whatsapp", active: true, status: "connected", healthy: true },
  { name: "notify", active: true, status: "connected", healthy: true },
];

export const MOCK_TRAINING_SUBMISSIONS = [
  {
    id: "sub-1",
    external_id: "sub-1",
    user_external_id: "usr-prom-1",
    user_name: "Lucas Rocha",
    user_phone: "11966665555",
    material_external_id: "mat-1",
    material_title: "Treinamento Inicial de Vendas V7M",
    material_question: "Como abordar um lead interessado em EAD?",
    answer: "Explico a flexibilidade do curso e o reconhecimento oficial.",
    audio_url: "https://v7m.org/audios/sample.mp3",
    status: "pending",
    grade: null,
    justification: "Resposta satisfatória gerada pelo assistente de IA.",
    created_at: "2026-08-24T14:00:00Z",
  },
];

export const MOCK_NOTIFY_TEMPLATES = [
  {
    event: "lead_created",
    external_id: "tpl-lead-1",
    title: "Boas-vindas ao V7M",
    subject: "Bem-vindo ao Supletivo V7M",
    body_md: "Olá {nome}, seu link de pagamento é {link} e seu código é {codigo}. Valor: R$ {valor}.",
    is_tts: true,
    channels: "whatsapp,email",
    media_url: null,
    media_type: null,
    mail_template: "default",
    notes: "Notificação inicial de lead",
    updated_at: "2026-08-26T12:00:00Z",
    trigger: {
      fires_on: "lead.created",
      source: "system",
      delay_minutes: 0,
      active: true,
    },
  },
  {
    event: "enrollment_confirmed",
    external_id: "tpl-enr-1",
    title: "Matrícula Confirmada",
    subject: "Sua matrícula foi confirmada",
    body_md: "Parabéns {nome}! Sua matrícula foi confirmada. Acesse {link} com o código {codigo}.",
    is_tts: false,
    channels: "whatsapp",
    media_url: null,
    media_type: null,
    mail_template: "default",
    notes: "Template de matrícula",
    updated_at: "2026-08-26T12:00:00Z",
    trigger: {
      fires_on: "enrollment.confirmed",
      source: "system",
      delay_minutes: 0,
      active: true,
    },
  },
  {
    event: "payment_pending",
    external_id: "tpl-pay-1",
    title: "Lembrete de Pagamento",
    subject: "Seu boleto/PIX está aguardando pagamento",
    body_md: "Olá {nome}, não perca sua vaga! Link: {link}, valor: R$ {valor}.",
    is_tts: true,
    channels: "whatsapp,email",
    media_url: null,
    media_type: null,
    mail_template: "default",
    notes: "Lembrete",
    updated_at: "2026-08-26T12:00:00Z",
    trigger: {
      fires_on: "payment.pending",
      source: "system",
      delay_minutes: 30,
      active: false,
    },
  },
];

export const MOCK_NOTIFY_STATS = {
  total: 3,
  active: 2,
  inactive: 1,
  with_tts: 2,
  with_media: 0,
  by_channel: {
    whatsapp: 3,
    email: 2,
  },
};

export const MOCK_NOTIFY_EVENTS = [
  { event: "lead_created", has_template: true, has_in_memory: true, active: true },
  { event: "enrollment_confirmed", has_template: true, has_in_memory: true, active: true },
  { event: "payment_pending", has_template: true, has_in_memory: true, active: false },
  { event: "otp_requested", has_template: false, has_in_memory: true, active: null },
];

export const MOCK_NOTIFY_TTS_CONFIG = {
  omniroute_url: "http://10.0.1.35",
  chain: [
    {
      model: "minimax/speech-01-hd",
      voice_female: "Portuguese_SereneWoman",
      voice_male: "Portuguese_GentleTeacher",
    },
    {
      model: "openai/tts-1",
      voice_female: "nova",
      voice_male: "onyx",
    },
    {
      model: "deepgram/aura-2-thalia-en",
      voice_female: "aura-2-thalia-en",
      voice_male: "aura-2-orion-en",
    },
  ],
  cross_gender_rule: "Homem ➔ Voz Feminina | Mulher ➔ Voz Masculina",
};

export const MOCK_NOTIFY_HISTORY = [
  {
    external_id: "notif-hist-1",
    caller: "lead_webhook",
    recipient_phone: "11999998888",
    recipient_email: "carlos.silva@example.com",
    title: "Boas-vindas ao V7M",
    subject: "Bem-vindo ao Supletivo V7M",
    text: "Olá Carlos, seu link de pagamento é https://checkout.v7m.org/...",
    want_whatsapp: true,
    want_email: true,
    want_tts: true,
    whatsapp_status: "delivered",
    email_status: "delivered",
    tts_status: "sent",
    whatsapp_error: null,
    email_error: null,
    tts_error: null,
    attempts: 1,
    created_at: "2026-08-26T14:30:00Z",
  },
  {
    external_id: "notif-hist-2",
    caller: "system",
    recipient_phone: "21988887777",
    recipient_email: "juliana.mendes@example.com",
    title: "Matrícula Confirmada",
    subject: "Sua matrícula foi confirmada",
    text: "Parabéns Juliana! Sua matrícula foi confirmada.",
    want_whatsapp: true,
    want_email: false,
    want_tts: false,
    whatsapp_status: "sent",
    email_status: null,
    tts_status: null,
    whatsapp_error: null,
    email_error: null,
    tts_error: null,
    attempts: 1,
    created_at: "2026-08-26T14:00:00Z",
  },
];

export const MOCK_CLOSING_SIMULATION = {
  week_of: "2026-08-18",
  friday: "2026-08-22",
  bonus_threshold: 5,
  bonus_amount: "5.00",
  total_obligation: 12500.0,
  awaiting_pix_count: 0,
  commissions_count: 14,
  bonuses_count: 3,
  beneficiaries_count: 5,
  beneficiaries: [
    {
      user_external_id: "usr-1",
      name: "Lucas Rocha",
      phone: "11966665555",
      cpf: "333.444.555-66",
      role: "promoter",
      leads_count: 6,
      bonus_earned: true,
      has_pix: true,
      pix_key: "11966665555",
      amount: 150.0,
    },
    {
      user_external_id: "usr-2",
      name: "Mariana Souza",
      phone: "11977776666",
      cpf: "111.222.333-44",
      role: "coordinator",
      leads_count: 18,
      bonus_earned: false,
      has_pix: true,
      pix_key: "111.222.333-44",
      amount: 540.0,
    },
  ],
};

/**
 * Injects authenticated staff session into localStorage.
 */
export async function injectStaffSession(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "staff.session",
      JSON.stringify({
        phone: "11999999999",
        externalId: "ext-admin-1",
      }),
    );
    window.localStorage.setItem(
      "staff.login",
      JSON.stringify({
        access_token: "mock.eyJleHRlcm5hbF9pZCI6ImV4dC1hZG1pbi0xIiwicm9sZXMiOlsic3VwZXJ1c2VyIiwic3RhZmYiLCJjb29yZGluYXRvciIsInByb21vdGVyIl19.superuser",
        refresh_token: "mock-jwt-refresh-token",
        roles: ["superuser", "staff", "coordinator", "promoter"],
        user: {
          id: "usr-admin-1",
          name: "Administrador Master",
          is_superuser: true,
        },
      }),
    );
  });
}

export async function injectCoordinatorSession(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "staff.session",
      JSON.stringify({
        phone: "11977776666",
        externalId: "coord-ext-1",
      }),
    );
    window.localStorage.setItem(
      "staff.login",
      JSON.stringify({
        access_token: "mock.eyJleHRlcm5hbF9pZCI6ImNvb3JkLWV4dC0xIiwicm9sZXMiOlsiY29vcmRpbmF0b3IiLCJwcm9tb3RlciJdfQ.coordinator",
        refresh_token: "mock-jwt-refresh-token",
        roles: ["coordinator", "promoter"],
        user: {
          id: "usr-coord-1",
          name: "Mariana Souza",
          is_superuser: false,
        },
      }),
    );
  });
}

export async function injectPromoterSession(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "staff.session",
      JSON.stringify({
        phone: "11966665555",
        externalId: "prom-1",
      }),
    );
    window.localStorage.setItem(
      "staff.login",
      JSON.stringify({
        access_token: "mock.eyJleHRlcm5hbF9pZCI6InByb20tMSIsInJvbGVzIjpbInByb21vdGVyIl19.promoter",
        refresh_token: "mock-jwt-refresh-token",
        roles: ["promoter"],
        user: {
          id: "usr-prom-1",
          name: "Lucas Rocha",
          is_superuser: false,
        },
      }),
    );
  });
}

export async function injectCandidateSession(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "staff.session",
      JSON.stringify({
        phone: "11955554444",
        externalId: "cand-ext-1",
      }),
    );
    window.localStorage.setItem(
      "staff.login",
      JSON.stringify({
        access_token: "mock.eyJleHRlcm5hbF9pZCI6ImNhbmQtZXh0LTEiLCJyb2xlcyI6WyJjYW5kaWRhdGUiXX0.candidate",
        refresh_token: "mock-jwt-refresh-token",
        roles: ["candidate"],
        user: {
          id: "usr-cand-1",
          name: "Candidato Inicial",
          is_superuser: false,
        },
      }),
    );
  });
}

/**
 * Intercepts and mocks all backend API calls for deterministic testing.
 */
export async function setupApiMocks(page: Page, options: { bootstrapped?: boolean } = {}) {
  const isBootstrapped = options.bootstrapped !== undefined ? options.bootstrapped : true;

  // Intercept ViaCEP calls
  await page.route(/viacep\.com\.br/, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        cep: "01310-100",
        logradouro: "Avenida Paulista",
        complemento: "lado ímpar",
        bairro: "Bela Vista",
        localidade: "São Paulo",
        uf: "SP",
      }),
    });
  });

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Bootstrap status
    if (url.includes("/staff/bootstrap/status") || url.includes("/system/bootstrap")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          bootstrapped: isBootstrapped,
          setup_required: !isBootstrapped,
        }),
      });
    }

    // Bootstrap init (POST /staff/bootstrap/init)
    if (url.includes("/staff/bootstrap/init")) {
      if (isBootstrapped) {
        return route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            code: "ALREADY_BOOTSTRAPPED",
            detail: "A plataforma já foi inicializada.",
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          access_token: "mock-jwt-access-token",
          refresh_token: "mock-jwt-refresh-token",
          token_type: "bearer",
          user_external_id: "ext-boss-1",
        }),
      });
    }

    // System status / health
    if (url.includes("/staff/system") || url.includes("/healthz")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          db_ok: true,
          migrations_pending: [],
          qcluster_alive: true,
          qcluster_count: 1,
          queued_tasks: 0,
          debug: false,
          external_url: "http://127.0.0.1:8005",
        }),
      });
    }

    // Auth check endpoint (Collaborators & Staff)
    if (url.includes("/collaborators/auth/check") || url.includes("/staff/auth/check")) {
      const postData = route.request().postDataJSON() || {};
      const phone = postData.phone || "";
      if (phone.includes("000000000")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ found: false }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          found: true,
          external_id: "ext-admin-1",
          otp_sent: true,
          otp_wait: 30,
        }),
      });
    }

    // Candidate registration endpoint
    if (url.includes("/collaborators/auth/register")) {
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "cand-ext-1",
          user_external_id: "ext-admin-1",
          status: "started",
        }),
      });
    }

    // Auth login password endpoint (contingency)
    if (url.includes("/staff/auth/login-password")) {
      const postData = route.request().postDataJSON() || {};
      const identifier = String(postData.identifier || "");
      const password = String(postData.password || "");
      if (password === "wrong" || identifier.includes("000000")) {
        return route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            code: "INVALID_CREDENTIALS",
            detail: "Credenciais inválidas.",
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "mock.eyJleHRlcm5hbF9pZCI6ImV4dC1hZG1pbi0xIiwicm9sZXMiOlsic3VwZXJ1c2VyIiwic3RhZmYiLCJjb29yZGluYXRvciIsInByb21vdGVyIl19.signature",
          refresh_token: "mock-jwt-refresh-token",
          user: MOCK_STAFF_USER,
        }),
      });
    }

    // Auth login endpoint (Collaborators & Staff)
    if (url.includes("/collaborators/auth/login") || url.includes("/staff/auth/login")) {
      const postData = route.request().postDataJSON() || {};
      const code = String(postData.otp || postData.code || "");
      if (code === "000000") {
        return route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            code: "NOT_STAFF",
            detail: "Esse acesso é restrito ao staff. Sua conta não tem permissão de administrador.",
          }),
        });
      }
      if (code === "999999") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            // payload: {"external_id":"ext-cand-1","roles":["candidate"]}
            access_token: "mock.eyJleHRlcm5hbF9pZCI6ImV4dC1jYW5kLTEiLCJyb2xlcyI6WyJjYW5kaWRhdGUiXX0.signature",
            refresh_token: "mock-jwt-refresh-token",
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "mock.eyJleHRlcm5hbF9pZCI6ImV4dC1hZG1pbi0xIiwicm9sZXMiOlsic3VwZXJ1c2VyIiwic3RhZmYiLCJjb29yZGluYXRvciIsInByb21vdGVyIl19.signature",
          refresh_token: "mock-jwt-refresh-token",
          user: MOCK_STAFF_USER,
        }),
      });
    }

    if (url.includes("/auth/refresh")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "mock.eyJleHRlcm5hbF9pZCI6ImNhbmQtZXh0LTEiLCJyb2xlcyI6WyJjYW5kaWRhdGUiXX0.candidate",
          refresh_token: "mock-jwt-refresh-token",
        }),
      });
    }

    if (url.includes("/staff/whoami") || url.includes("/whoami")) {
      const authHeader = route.request().headers()["authorization"] || "";
      if (authHeader.includes("candidate")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "usr-cand-1",
            external_id: "cand-ext-1",
            name: "Candidato Inicial",
            roles: ["candidate"],
            is_superuser: false,
          }),
        });
      }
      if (authHeader.includes("promoter")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "usr-prom-1",
            external_id: "prom-1",
            name: "Lucas Rocha",
            roles: ["promoter"],
            is_superuser: false,
          }),
        });
      }
      if (authHeader.includes("coordinator")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "usr-coord-1",
            external_id: "coord-ext-1",
            name: "Mariana Souza",
            roles: ["coordinator", "promoter"],
            is_superuser: false,
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "usr-admin-1",
          external_id: "ext-admin-1",
          name: "Administrador Master",
          roles: ["superuser", "staff", "coordinator", "promoter"],
          is_superuser: true,
        }),
      });
    }

    // Collaborators - Candidate KYC
    if (url.includes("/collaborators/candidate/me")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "started",
          profile: { name: "Candidato Teste", birth_date: "1995-05-10" },
          address: null,
          address_proof: null,
          documents: null,
          selfie: null,
          pix_validated: false,
          blocks: [],
        }),
      });
    }

    if (url.includes("/collaborators/candidate/document")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          doc_type: "rg",
          has_front: false,
          has_back: false,
          analysis_status: "pending",
        }),
      });
    }

    if (url.includes("/collaborators/candidate/documents/classify")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          is_document: true,
          doc_type: "rg",
          completeness: "full",
          is_legible: true,
        }),
      });
    }

    if (url.includes("/collaborators/candidate/documents/photo")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, detail: "Foto enviada com sucesso" }),
      });
    }

    if (url.includes("/collaborators/candidate/documents/address-proof")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "address",
          address_proof: { exists: true, status: "pending", needs_kinship: false },
        }),
      });
    }

    if (url.includes("/collaborators/candidate/pix")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "pix", pix_validated: true }),
      });
    }

    if (url.includes("/collaborators/candidate/education")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "education" }),
      });
    }

    if (url.includes("/collaborators/candidate/selfie")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, detail: "Selfie validada com sucesso" }),
      });
    }

    // Collaborators - Promoter
    if (url.includes("/collaborators/promoter/me")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "prom-1",
          name: "Lucas Rocha",
          phone: "11966665555",
          code: "LUCAS10",
          referral_url: "https://supletivo.net.br/?ref=prom-1",
          active: true,
          total_sales: 8,
          total_commissions_cents: 80000,
          available_commissions_cents: 50000,
          pending_commissions_cents: 30000,
          hub_brand: "wyden",
          pix_key: "11966665555",
        }),
      });
    }

    if (url.includes("/collaborators/promoter/leads")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            external_id: "lead-prom-1",
            name: "Bruna Lima",
            phone: "11988881111",
            created_at: "2026-08-25T10:00:00Z",
            status: "enrolled",
          },
        ]),
      });
    }

    if (url.includes("/collaborators/promoter/commissions")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            external_id: "comm-1",
            amount_cents: 10000,
            amount_formatted: "R$ 100,00",
            status: "paid",
            created_at: "2026-08-22T18:00:00Z",
            released_at: "2026-08-22T18:00:00Z",
            student_name: "Bruna Lima",
          },
        ]),
      });
    }

    if (url.includes("/collaborators/training/materials")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            external_id: "mat-1",
            title: "Trilha 1: Como Vender EAD no WhatsApp",
            question: "Qual o foco da primeira mensagem com o lead?",
            text_content: "Entender a necessidade e o tempo disponível do estudante.",
            video: "https://v7m.org/videos/ead.mp4",
            blocking: false,
            active: true,
            passed: true,
          },
        ]),
      });
    }

    // Leadership (Hub)
    if (url.includes("/leadership/candidates")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            external_id: "cand-lead-1",
            name: "Felipe Nogueira",
            phone: "11944445555",
            cpf: "44455566677",
            status: "completed",
            created_at: "2026-08-26T10:00:00Z",
            risk_level: "low",
          },
        ]),
      });
    }

    if (url.includes("/leadership/promoters")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            external_id: "prom-lead-1",
            name: "Lucas Rocha",
            phone: "11966665555",
            sales_count: 8,
            active: true,
          },
        ]),
      });
    }

    if (url.includes("/leadership/enrollments")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ENROLLMENTS),
      });
    }

    if (url.includes("/leadership/inbox")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "alert-1",
            title: "Novo candidato aguardando aprovação",
            message: "Felipe Nogueira concluiu o envio de documentos.",
            severity: "info",
            created_at: "2026-08-26T11:00:00Z",
          },
        ]),
      });
    }

    // Platform Credentials update for students
    if (url.includes("/platform-credentials")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "std-1",
          status: "credentials_updated",
        }),
      });
    }

    // Users & User Phone update
    if (url.includes("/staff/users")) {
      if (url.includes("/phone") && (method === "PUT" || method === "POST")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      }
      const parsedUrl = new URL(url);
      const role = parsedUrl.searchParams.get("role");
      let filtered = MOCK_USERS;
      if (role) {
        filtered = MOCK_USERS.filter((u) => u.roles.includes(role));
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(filtered),
      });
    }

    // Hubs / Polos operations
    if (url.includes("/staff/hubs") || url.includes("/staff/polos")) {
      if (url.includes("/default") && method === "PUT") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...MOCK_HUBS[0], is_default: true }),
        });
      }
      if (url.includes("/coordinator") && method === "PUT") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...MOCK_HUBS[0], coordinator_external_id: "prom-1" }),
        });
      }
      if (url.includes("/address") && (method === "PATCH" || method === "PUT")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_HUBS[0]),
        });
      }
      if (method === "POST") {
        const body = route.request().postDataJSON() || {};
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: `hub-${Date.now()}`,
            external_id: `hub-ext-${Date.now()}`,
            brand: body.brand || "wyden",
            name: body.brand || "Novo Polo",
            city: body.city || "São Paulo",
            state: body.state || "SP",
            is_default: false,
            coordinator_external_id: body.coordinator_external_id || null,
            address: {
              street: body.street || "Av. Paulista",
              number: body.number || "1000",
              neighborhood: body.neighborhood || "Bela Vista",
              city: body.city || "São Paulo",
              state: body.state || "SP",
              cep: body.cep || "01310-100",
            },
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_HUBS),
      });
    }

    // Students / Alunos
    if (url.includes("/staff/students") || url.includes("/staff/alunos")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_STUDENTS),
      });
    }

    // Enrollments / Matrículas
    if (url.includes("/staff/enrollments") || url.includes("/staff/matriculas")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ENROLLMENTS),
      });
    }

    // Coordinators
    if (url.includes("/staff/coordinators") || url.includes("/staff/coordenadores")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_COORDINATORS),
      });
    }

    // Promoters
    if (url.includes("/staff/promoters")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PROMOTERS),
      });
    }

    // Leads & Lead Payment Confirmation
    if (url.includes("/staff/leads")) {
      if (url.includes("/mark-paid") || (method === "POST" && url.includes("/paid"))) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Lead marcado como pago com sucesso." }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_LEADS),
      });
    }

    // Finance endpoints
    if (url.includes("/staff/finance/balance") || url.includes("/staff/financeiro/balance")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_FINANCE_BALANCE),
      });
    }

    if (url.includes("/staff/finance/summary") || url.includes("/staff/financeiro/summary")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_FINANCE_SUMMARY),
      });
    }

    if (url.includes("/staff/finance/closing/simulation")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CLOSING_SIMULATION),
      });
    }

    if (url.includes("/staff/finance/closing/run") || (url.includes("/closing") && method === "POST")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: 5, total_paid: 12500.0, ok: true }),
      });
    }

    if (url.includes("/staff/finance/manual-payments") || (url.includes("/manual-payment") && method === "POST")) {
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "pay-12345678",
          method: "PIX",
          status: "PENDING",
        }),
      });
    }

    if (url.includes("/staff/finance/commissions")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    if (url.includes("/staff/finance/payouts")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    if (url.includes("/staff/finance/closing/health") || url.includes("/staff/financeiro/fechamento")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CLOSING_HEALTH),
      });
    }

    if (url.includes("/staff/finance/cashflow")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          pending_payouts_queue: "3500.00",
          unclosed_commissions_liability: "12000.00",
          month_unexpected_expenses: "1250.00",
          open_disputes_at_risk: "497.00",
          month_accumulated_revenue: "85400.00",
          total_obligations_due: "15500.00",
          timestamp: new Date().toISOString(),
        }),
      });
    }

    if (url.includes("/staff/finance/ledger")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            external_id: "led-entry-1",
            transaction_external_id: "tx-mat-001",
            account_code: "ASSET_ASAAS",
            account_name: "Conta Caixa Asaas",
            entry_type: "debit",
            amount: "497.00",
            balance_after: "85400.00",
            created_at: new Date().toISOString(),
          },
          {
            external_id: "led-entry-2",
            transaction_external_id: "tx-mat-001",
            account_code: "REVENUE_ENROLLMENT",
            account_name: "Receita de Matrículas",
            entry_type: "credit",
            amount: "497.00",
            balance_after: null,
            created_at: new Date().toISOString(),
          },
        ]),
      });
    }

    if (url.includes("/staff/finance/transactions")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            external_id: "tx-mat-001",
            kind: "payment_received",
            amount: "497.00",
            status: "settled",
            description: "Matrícula de Aluno - EJA Completo",
            source_type: "lead_payment",
            source_external_id: "lead-001",
            idempotency_key: "seed_tx_001",
            created_at: new Date().toISOString(),
            settled_at: new Date().toISOString(),
          },
        ]),
      });
    }

    if (url.includes("/staff/finance/adjustments") && method === "POST") {
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "adj-tx-999",
          kind: "manual_adjustment",
          amount: "500.00",
          status: "settled",
          description: "Ajuste manual de saldo",
          source_type: "manual_adjustment",
          source_external_id: null,
          idempotency_key: "adj_mock_key",
          created_at: new Date().toISOString(),
          settled_at: new Date().toISOString(),
        }),
      });
    }

    if (url.includes("/staff/finance/expenses/unexpected") && method === "POST") {
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "unexp-001",
          transaction_external_id: "tx-unexp-001",
          payment_request_external_id: "pay-unexp-001",
          category: "infrastructure",
          amount: "350.00",
          description: "Upgrade emergencial de cluster",
          justification: "Alta demanda no fechamento",
          supplier_name: "Hetzner Cloud",
          receipt: null,
          created_at: new Date().toISOString(),
        }),
      });
    }

    if (url.includes("/staff/finance/disputes") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            external_id: "disp-rec-001",
            external_dispute_id: "dsp_asaas_8877",
            amount: "497.00",
            status: "open",
            reason: "Contestação de Titularidade de Cartão",
            resolution: null,
            justification: null,
            resolved_at: null,
            created_at: new Date().toISOString(),
          },
        ]),
      });
    }

    if (url.includes("/staff/finance/disputes") && method === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "disp-rec-001",
          external_dispute_id: "dsp_asaas_8877",
          amount: "497.00",
          status: "resolved",
          reason: "Contestação de Titularidade de Cartão",
          resolution: "absorb_loss",
          justification: "Documentação analisada",
          resolved_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }),
      });
    }

    if (url.includes("/staff/finance/audit")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            external_id: "aud-001",
            actor_external_id: "ext-admin-1",
            action: "MANUAL_ADJUSTMENT",
            target_model: "FinancialTransaction",
            target_external_id: "adj-tx-999",
            justification: "Ajuste de conciliação bancária",
            snapshot_before: null,
            snapshot_after: null,
            created_at: new Date().toISOString(),
          },
        ]),
      });
    }

    // Platform config setup & seeds & integration tests
    if (url.includes("/staff/config/bootstrap/seed") || url.includes("/staff/config/seed")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          output: "Seed executado com sucesso: Boss criado e polo padrão vinculado.",
          config: MOCK_PLATFORM_SETUP,
        }),
      });
    }

    if (url.includes("/staff/config/integrations/") && url.includes("/test")) {
      const name = url.split("/")[url.split("/").length - 2];
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          name: name || "asaas",
          success: true,
          latency_ms: 32,
          details: { status: "operational" },
        }),
      });
    }

    if (url.includes("/staff/config/setup")) {
      if (method === "PUT" || method === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_PLATFORM_SETUP),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PLATFORM_SETUP),
      });
    }

    // Integrations list
    if (url.includes("/staff/integrations")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_INTEGRATIONS),
      });
    }

    // Logs
    if (url.includes("/staff/logs")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_LOGS),
      });
    }

    // Documents / Dossier / Decisions
    if (url.includes("/decide") && method === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          detail: "Documento processado com sucesso.",
          status: "APPROVED",
        }),
      });
    }

    if (url.includes("/staff/documents/reviews") || url.includes("/staff/documentos/reviews")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "rev-1",
            external_id: "rev-1",
            user_external_id: "usr-doc-1",
            user_name: "Mariana Silva",
            name: "Mariana Silva",
            cpf: "111.222.333-44",
            phone: "(11) 98888-7777",
            hub_name: "Polo Central SP",
            type: "rg",
            kind: "rg",
            reason: "Divergência facial na validação biométrica",
            created_at: "2026-08-24T10:00:00Z",
          },
        ]),
      });
    }

    if (url.includes("/dossier")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user_external_id: "usr-doc-1",
          profile: {
            name: "Mariana Silva",
            cpf: "111.222.333-44",
            phone: "(11) 98888-7777",
            email: "mariana.silva@example.com",
            birth_date: "1995-05-10",
            mother_name: "Ana Silva",
            father_name: "Carlos Silva",
            pix_key: "111.222.333-44",
          },
          media: {
            front_photo: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23ddd'/></svg>",
            back_photo: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23ddd'/></svg>",
            full_photo: null,
            selfie_photo: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23ddd'/></svg>",
            address_photo: null,
          },
          biometrics: {
            selfie_status: "APROVADO",
            selfie_reason: null,
            verifications: [
              { score: 0.945 }
            ],
          },
          document_data: {
            number: "MG-12.345.678",
          },
          address: {
            city: "São Paulo",
            state: "SP",
            zipcode: "01310-100",
          },
        }),
      });
    }

    // Network Tree
    if (url.includes("/staff/network/tree") || url.includes("/staff/rede/tree")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            hub_external_id: "hub-ext-1",
            brand: "wyden",
            is_default: true,
            coordinator: {
              external_id: "coord-1",
              name: "Mariana Souza",
              phone: "11977776666",
            },
            metrics: {
              total_promoters: 12,
              total_leads: 85,
              total_paid: 42,
              conversion_rate: 49.4,
            },
            promoters: [
              {
                external_id: "prom-1",
                name: "Lucas Rocha",
                code: "LUCAS10",
                phone: "11966665555",
                status: "active",
                leads_count: 24,
                paid_count: 14,
                conversion_rate: 58.3,
              },
            ],
          },
        ]),
      });
    }

    // Training / Treinamento
    if (url.includes("/staff/training/unlock") || (url.includes("/unlock") && method === "POST")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Promotor liberado imediatamente de todas as travas." }),
      });
    }

    if (url.includes("/staff/training/submissions") && (url.includes("/override") || method === "POST")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, detail: "Avaliação registrada com sucesso." }),
      });
    }

    if (url.includes("/staff/training/submissions")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TRAINING_SUBMISSIONS),
      });
    }

    if (url.includes("/materials")) {
      if (url.includes("/video") && method === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      }
      if (method === "POST") {
        const body = route.request().postDataJSON() || {};
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: `mat-${Date.now()}`,
            external_id: `mat-ext-${Date.now()}`,
            title: body.title || "Nova Matéria de Treino",
            description: body.description || "",
            question: body.question || "Questão",
            expected_answer: body.expected_answer || "Gabarito",
            text_content: body.text_content || "",
            kind: body.kind || "fixed",
            status: "published",
            created_at: new Date().toISOString(),
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "mat-1",
            external_id: "mat-1",
            title: "Treinamento Inicial de Vendas V7M",
            description: "Aprenda a abordagem de captação de alunos e metas de comissão.",
            question: "Qual o principal diferencial da plataforma?",
            expected_answer: "Flexibilidade total de estudo e certificação oficial.",
            kind: "fixed",
            status: "published",
            video_url: "https://v7m.org/videos/intro.mp4",
            created_at: "2026-08-01T10:00:00Z",
          },
        ]),
      });
    }

    // Notify / Notificações & AI Assist & TTS Studio
    if (url.includes("/staff/notify/tts/config")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_NOTIFY_TTS_CONFIG),
      });
    }

    if (url.includes("/staff/notify/tts/probe") && method === "POST") {
      const body = route.request().postDataJSON() || {};
      const gender = body.gender || "default";
      const voice =
        gender === "M"
          ? "Portuguese_SereneWoman"
          : gender === "F"
          ? "Portuguese_GentleTeacher"
          : "Portuguese_SereneWoman";

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          audio_url: "https://v7m.org/audios/sample-tts-probe.mp3",
          gender_target: gender,
          voice_used: voice,
          omniroute_url: "http://10.0.1.35",
          chain_results: [
            {
              model: "minimax/speech-01-hd",
              voice,
              gender_target: gender,
              ok: true,
              bytes: 28400,
            },
          ],
        }),
      });
    }

    if (url.includes("/staff/notify/templates/ai-assist") && method === "POST") {
      const body = route.request().postDataJSON() || {};
      const action = body.action || "improve";
      let refinedText = body.text || "";

      if (action === "improve") {
        refinedText = `Olá {nome}, seu link exclusivo é {link} com o código {codigo}. O valor especial é R$ {valor}!`;
      } else if (action === "simplify") {
        refinedText = `{nome}, acesse {link} com código {codigo}. Valor: R$ {valor}.`;
      } else if (action === "shorten") {
        refinedText = `Link: {link} | Código: {codigo} | {nome} | {valor}`;
      } else if (action === "fix") {
        refinedText = `Olá {nome}, seu link é {link} e seu código é {codigo}. Valor: R$ {valor}.`;
      } else if (action === "persuade") {
        refinedText = `Não perca esta oportunidade incrível {nome}! Acesse agora {link} usando o código {codigo} por apenas R$ {valor}.`;
      } else if (action === "custom" && body.custom_prompt) {
        refinedText = `${body.custom_prompt}: ${body.text}`;
      }

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          text: refinedText,
          action,
        }),
      });
    }

    if (url.includes("/staff/notify/templates/stats")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_NOTIFY_STATS),
      });
    }

    if (url.includes("/staff/notify/events")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_NOTIFY_EVENTS),
      });
    }

    if (url.includes("/staff/notify/history")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_NOTIFY_HISTORY),
      });
    }

    if (url.includes("/staff/notify/templates")) {
      if (url.includes("/preview") && method === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            event: "lead_created",
            body_md: "Olá {nome}, seu link é {link} e seu código é {codigo}. Valor: R$ {valor}.",
            rendered: "Olá Carlos Eduardo, seu link é https://checkout.v7m.org/carlos e seu código é V7M123. Valor: R$ 97,00.",
            is_tts: true,
            channels: ["whatsapp", "email"],
          }),
        });
      }

      if (url.includes("/test") && method === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ external_id: `notif-test-${Date.now()}` }),
        });
      }

      if (url.includes("/restore-seed") && method === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_NOTIFY_TEMPLATES[0]),
        });
      }

      if (method === "PATCH") {
        const body = route.request().postDataJSON() || {};
        const eventName = decodeURIComponent(url.split("/staff/notify/templates/")[1] || "").split("/")[0];
        const existing = MOCK_NOTIFY_TEMPLATES.find((t) => t.event === eventName) || MOCK_NOTIFY_TEMPLATES[0];
        const updated = {
          ...existing,
          ...body,
          updated_at: new Date().toISOString(),
        };
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(updated),
        });
      }

      // Single template GET
      const parts = url.split("/staff/notify/templates/");
      if (parts.length > 1 && parts[1]) {
        const eventName = decodeURIComponent(parts[1].split("?")[0].split("/")[0]);
        const found = MOCK_NOTIFY_TEMPLATES.find((t) => t.event === eventName);
        if (found) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(found),
          });
        }
      }

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_NOTIFY_TEMPLATES),
      });
    }

    // Default fallback
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
}
