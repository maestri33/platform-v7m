// A URL da API é configurável: em produção, aponta para o domínio canônico.
// Em Docker local, injete HUB_API_BASE pelo build (ou troque no .env).
const API = (typeof __HUB_API_BASE__ !== "undefined" ? __HUB_API_BASE__ : null)
  || "__HUB_API_BASE_DEFAULT__";
const KNOWN_ROUTES = new Set(["dashboard", "reviews", "students", "team"]);

const state = {
  phone: "",
  externalId: "",
  access: sessionStorage.getItem("hub.access") || "",
  refresh: sessionStorage.getItem("hub.refresh") || "",
  hub: JSON.parse(sessionStorage.getItem("hub.info") || "null"),
  data: { leads: [], enrollments: [], reviews: [], students: [], candidates: [], promoters: [] },
};

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const digits = (value) => String(value || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
const label = (item) =>
  item?.name || item?.user?.name || item?.customer?.name || item?.brand || item?.external_id || "Sem identificação";
const status = (item) => item?.status || item?.kind || item?.type || "—";
const listOf = (payload) => (Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : []);
const emptyFor = (section) => {
  const hints = {
    enrollments: "Novas matrículas aparecerão aqui conforme os leads forem convertidos.",
    reviews: "Quando houver documentos ou matrículas para revisar, elas aparecerão aqui.",
    students: "Alunos concluídos aparecerão aqui assim que finalizarem o processo.",
    candidates: "Quando candidatos solicitarem aprovação, eles aparecerão nesta lista.",
    promoters: "Promotores vinculados ao seu polo aparecerão aqui.",
  };
  return `<div class="empty-state"><p class="empty">📋 ${hints[section] || "Nenhum registro nesta fila."}</p></div>`;
};
const empty = '<p class="empty">Nenhum registro nesta fila.</p>';

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 3200);
}

async function request(path, options = {}, retry = true) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (state.access) headers.Authorization = `Bearer ${state.access}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  if (response.status === 401 && retry && state.refresh) {
    const refreshed = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: state.refresh }),
    });
    if (refreshed.ok) {
      saveTokens(await refreshed.json());
      return request(path, options, false);
    }
    logout();
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || body.message || "Não foi possível concluir a operação.");
  return body;
}

function saveTokens(tokens) {
  state.access = tokens.access_token;
  state.refresh = tokens.refresh_token;
  sessionStorage.setItem("hub.access", state.access);
  sessionStorage.setItem("hub.refresh", state.refresh);
}

function logout() {
  sessionStorage.removeItem("hub.access");
  sessionStorage.removeItem("hub.refresh");
  sessionStorage.removeItem("hub.info");
  state.access = "";
  $("#app-view").hidden = true;
  $("#login-view").hidden = false;
  $("#otp-form").hidden = true;
  $("#phone-form").hidden = false;
}

function showError(message) {
  const el = $("#login-error");
  el.textContent = message;
  el.hidden = false;
}

$("#phone").addEventListener("input", (event) => {
  const raw = digits(event.target.value).slice(0, 11);
  event.target.value =
    raw.length > 10
      ? raw.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3")
      : raw.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
});

$("#phone-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("#login-error").hidden = true;
  state.phone = digits($("#phone").value);
  if (state.phone.length < 10) return showError("Informe um telefone válido com DDD.");
  const button = event.submitter;
  button.disabled = true;
  try {
    const result = await request("/auth/check", {
      method: "POST",
      body: JSON.stringify({ phone: state.phone }),
    });
    if (!result.found) throw new Error("Telefone não encontrado.");
    if (!result.is_coordinator) throw new Error(result.detail || "Este acesso é exclusivo para coordenadores.");
    state.externalId = result.external_id;
    state.hub = result.hub || null;
    sessionStorage.setItem("hub.info", JSON.stringify(state.hub));
    $("#phone-form").hidden = true;
    $("#otp-form").hidden = false;
    $("#otp").focus();
    toast(result.otp_wait ? `Código já enviado. Aguarde ${result.otp_wait}s.` : "Código enviado pelo WhatsApp.");
  } catch (error) {
    showError(error.message);
  } finally {
    button.disabled = false;
  }
});

$("#otp").addEventListener("input", (event) => {
  event.target.value = digits(event.target.value).slice(0, 6);
});

$("#otp-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("#login-error").hidden = true;
  const otp = digits($("#otp").value);
  if (otp.length !== 6) return showError("Digite os 6 dígitos do código.");
  const button = event.submitter;
  button.disabled = true;
  try {
    const tokens = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ external_id: state.externalId, otp }),
    });
    saveTokens(tokens);
    await enterApp();
  } catch (error) {
    showError(error.message);
  } finally {
    button.disabled = false;
  }
});

$("#change-phone").addEventListener("click", () => {
  $("#otp-form").hidden = true;
  $("#phone-form").hidden = false;
  $("#login-error").hidden = true;
});
$("#logout").addEventListener("click", logout);

function flattenReviews(payload) {
  if (Array.isArray(payload)) return payload;
  return Object.entries(payload || {}).flatMap(([bucket, items]) =>
    (Array.isArray(items) ? items : []).map((item) => ({ ...item, bucket })),
  );
}

async function loadAll() {
  const calls = {
    leads: request("/leads"),
    enrollments: request("/enrollments"),
    reviews: request("/reviews"),
    students: request("/students"),
    candidates: request("/candidates"),
    promoters: request("/promoters"),
  };
  const errors = [];
  const entries = await Promise.all(
    Object.entries(calls).map(async ([key, promise]) => {
      try {
        return [key, await promise];
      } catch (error) {
        errors.push(key);
        return [key, key === "reviews" ? {} : []];
      }
    }),
  );
  // Agregar erros em um único toast em vez de disparar um por fila
  if (errors.length > 0) {
    toast(`Falha ao carregar: ${errors.join(", ")}`);
  }
  for (const [key, value] of entries) {
    state.data[key] = key === "reviews" ? flattenReviews(value) : listOf(value);
  }
  render();
}

function row(item, actions = "") {
  return `<div class="row"><div><strong>${escapeHtml(label(item))}</strong><small>${escapeHtml(status(item))}</small></div>${actions ? `<div class="row-actions">${actions}</div>` : ""}</div>`;
}

function render() {
  const d = state.data;
  $("#stats").innerHTML = [
    ["Leads", d.leads.length],
    ["Matrículas", d.enrollments.length],
    ["Revisões", d.reviews.length],
    ["Alunos", d.students.length],
  ].map(([name, value]) => `<article class="stat"><strong>${value}</strong><span>${name}</span></article>`).join("");

  const enrollmentRows = d.enrollments.map((item) => row(item)).join("") || emptyFor("enrollments");
  const reviewRows = d.reviews.map((item) => row(item)).join("") || emptyFor("reviews");
  $("#enrollments-preview").innerHTML = d.enrollments.slice(0, 5).map((item) => row(item)).join("") || emptyFor("enrollments");
  $("#reviews-preview").innerHTML = d.reviews.slice(0, 5).map((item) => row(item)).join("") || emptyFor("reviews");
  $("#enrollments-list").innerHTML = enrollmentRows;
  $("#reviews-list").innerHTML = reviewRows;
  $("#students-list").innerHTML = d.students.map((item) => row(item)).join("") || emptyFor("students");
  $("#candidates-list").innerHTML =
    d.candidates.map((item) => {
      if (!item.external_id) return row(item);
      return row(
        item,
        `<button data-action="candidate-approve" data-id="${escapeHtml(item.external_id)}">Aprovar</button>
         <button class="danger" data-action="candidate-reject" data-id="${escapeHtml(item.external_id)}">Rejeitar</button>`,
      );
    }).join("") || emptyFor("candidates");
  $("#promoters-list").innerHTML =
    d.promoters.map((item) => {
      if (!item.external_id) return row(item);
      const suspended = item.status === "suspended";
      return row(
        item,
        `<button class="${suspended ? "" : "danger"}" data-action="${suspended ? "promoter-reactivate" : "promoter-suspend"}" data-id="${escapeHtml(item.external_id)}">${suspended ? "Reativar" : "Suspender"}</button>`,
      );
    }).join("") || emptyFor("promoters");
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const id = button.dataset.id;
  if (!id) return; // Guarda contra ID ausente
  const action = button.dataset.action;
  let path;
  let body;
  if (action === "candidate-approve") {
    if (!confirm("Aprovar este candidato como promotor?")) return;
    path = `/candidates/${id}/approve`;
  } else if (action === "candidate-reject") {
    const reason = prompt("Informe o motivo da rejeição:");
    if (!reason) return;
    path = `/candidates/${id}/reject`;
    body = JSON.stringify({ reason });
  } else {
    const verb = action === "promoter-reactivate" ? "reactivate" : "suspend";
    if (!confirm(`${verb === "suspend" ? "Suspender" : "Reativar"} este promotor?`)) return;
    path = `/promoters/${id}/${verb}`;
  }
  button.disabled = true;
  try {
    await request(path, { method: "POST", body });
    toast("Operação concluída.");
    await loadAll();
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
  }
});

async function enterApp() {
  $("#login-view").hidden = true;
  $("#app-view").hidden = false;
  $("#hub-brand").textContent = state.hub?.brand || "Polo";
  route();
  await loadAll();
}

function route() {
  const raw = location.hash.slice(1) || "dashboard";
  // Se a rota não existe, redireciona para o dashboard em vez de mostrar tela vazia
  const current = KNOWN_ROUTES.has(raw) ? raw : "dashboard";
  if (raw !== current) location.hash = `#${current}`;
  document.querySelectorAll("[data-route]").forEach((section) => (section.hidden = section.id !== current));
  document.querySelectorAll("nav a").forEach((link) => link.classList.toggle("active", link.hash === `#${current}`));
}
window.addEventListener("hashchange", route);
document.querySelectorAll("[data-refresh]").forEach((button) => button.addEventListener("click", loadAll));

if (state.access) enterApp();
