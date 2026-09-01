import { chromium } from "playwright";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUTPUT_DIR = "/root/platform-v7m/docs/audit/screenshots/student-wizard";
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const TARGET_URL = "https://app.supletivo.net.br";

function updateBackendEnrollmentStatus(status) {
  const pyScript = `
import json, uuid
from django.contrib.auth import get_user_model
from users.roles import interface as roles
from users.roles.enrollment.models import Enrollment
from users.roles.enrollment import service as enrollment_svc
from users.documents import service as documents_iface
from users.address import service as address_iface
from users.auth.jwt.service import issue
from hub.models import Hub

User = get_user_model()
hub = Hub.objects.first()
promoter_user = User.objects.filter(roles__role="promoter").first()

user = User.objects.filter(profile__phone="554399887766").first()
if not user:
    user = User.objects.create_user(external_id=uuid.uuid4())
    from users.profiles.models import Profile
    Profile.objects.create(user=user, phone="554399887766", name="Aluno Teste Visual E2E")

try:
    _ = user.document
except Exception:
    documents_iface.create_empty(user)

if not user.profile.address:
    user.profile.address = address_iface.create_empty()
    user.profile.save()

if "enrollment" not in roles.active_roles(user):
    if "lead" not in roles.active_roles(user):
        roles.assign(user, "lead")
    roles.promote(user, "enrollment")

enr = Enrollment.objects.filter(user=user).first()
if not enr:
    enr = enrollment_svc.create_from_lead(user=user, promoter=promoter_user, hub=hub)

enr.status = '${status}'
if '${status}' == 'address':
    user.profile.name = 'Carlos Eduardo da Silva'
    user.profile.save()
elif '${status}' == 'education':
    addr = user.profile.address
    addr.zipcode = '86010000'
    addr.street = 'Avenida Higienopolis'
    addr.number = '100'
    addr.neighborhood = 'Centro'
    addr.city = 'Londrina'
    addr.state = 'PR'
    addr.save()
elif '${status}' == 'selfie':
    enr.education_level = 'fundamental'
    enr.education_last_grade = '8_ano'
elif '${status}' == 'awaiting_release':
    enr.selfie_verified = True
    enr.consent_accepted = True

enr.save()

tok = issue(user.external_id, roles.active_roles(user))
print("JWT_TOKEN_JSON:" + json.dumps({
    "access_token": tok["access_token"],
    "refresh_token": tok["refresh_token"],
    "token_type": "bearer",
    "roles": roles.active_roles(user),
    "external_id": str(user.external_id),
    "phone": user.profile.phone,
    "enrollment_status": enr.status
}))
`;
  const b64 = Buffer.from(pyScript).toString("base64");
  const cmd = `ssh root@10.0.1.50 "docker exec v7m-backend-web python manage.py shell -c \\"import base64; exec(base64.b64decode('${b64}').decode())\\""`;
  const out = execSync(cmd).toString();
  const match = out.match(/JWT_TOKEN_JSON:(\{.*\})/);
  if (!match) throw new Error("Failed to get token from backend: " + out);
  return JSON.parse(match[1]);
}

async function runVisualAudit() {
  console.log("🚀 Iniciando Auditoria Visual do Wizard do Aluno...");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });

  // 1. Landing / Lead Check
  console.log("📸 [1/6] Capturando Tela Inicial / Lead Check...");
  const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const page1 = await ctx1.newPage();
  await page1.goto(`${TARGET_URL}/`, { waitUntil: "networkidle" });
  await page1.screenshot({ path: path.join(OUTPUT_DIR, "01_lead_check.png"), fullPage: true });
  await ctx1.close();

  // 2. Wizard Step: RG
  console.log("📸 [2/6] Capturando Wizard Step: RG...");
  const authDataRg = updateBackendEnrollmentStatus("rg");
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const page2 = await ctx2.newPage();
  await page2.addInitScript((data) => {
    window.localStorage.setItem("supletivo.login", JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: "bearer",
      roles: data.roles
    }));
    window.localStorage.setItem("supletivo.session", JSON.stringify({
      phone: data.phone,
      externalId: data.external_id
    }));
  }, authDataRg);
  await page2.goto(`${TARGET_URL}/matricula`, { waitUntil: "networkidle" });
  await page2.waitForTimeout(2000);
  await page2.screenshot({ path: path.join(OUTPUT_DIR, "02_wizard_rg.png"), fullPage: true });
  await ctx2.close();

  // 3. Wizard Step: Endereço
  console.log("📸 [3/6] Capturando Wizard Step: Endereço...");
  const authDataAddr = updateBackendEnrollmentStatus("address");
  const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const page3 = await ctx3.newPage();
  await page3.addInitScript((data) => {
    window.localStorage.setItem("supletivo.login", JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: "bearer",
      roles: data.roles
    }));
    window.localStorage.setItem("supletivo.session", JSON.stringify({
      phone: data.phone,
      externalId: data.external_id
    }));
  }, authDataAddr);
  await page3.goto(`${TARGET_URL}/matricula`, { waitUntil: "networkidle" });
  await page3.waitForTimeout(2000);
  await page3.screenshot({ path: path.join(OUTPUT_DIR, "03_wizard_address.png"), fullPage: true });
  await ctx3.close();

  // 4. Wizard Step: Escolaridade / Estudos
  console.log("📸 [4/6] Capturando Wizard Step: Estudos / Escolaridade...");
  const authDataEdu = updateBackendEnrollmentStatus("education");
  const ctx4 = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const page4 = await ctx4.newPage();
  await page4.addInitScript((data) => {
    window.localStorage.setItem("supletivo.login", JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: "bearer",
      roles: data.roles
    }));
    window.localStorage.setItem("supletivo.session", JSON.stringify({
      phone: data.phone,
      externalId: data.external_id
    }));
  }, authDataEdu);
  await page4.goto(`${TARGET_URL}/matricula`, { waitUntil: "networkidle" });
  await page4.waitForTimeout(2000);
  await page4.screenshot({ path: path.join(OUTPUT_DIR, "04_wizard_education.png"), fullPage: true });
  await ctx4.close();

  // 5. Wizard Step: Selfie & Assinatura de Contrato
  console.log("📸 [5/6] Capturando Wizard Step: Selfie & Assinatura...");
  const authDataSelfie = updateBackendEnrollmentStatus("selfie");
  const ctx5 = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const page5 = await ctx5.newPage();
  await page5.addInitScript((data) => {
    window.localStorage.setItem("supletivo.login", JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: "bearer",
      roles: data.roles
    }));
    window.localStorage.setItem("supletivo.session", JSON.stringify({
      phone: data.phone,
      externalId: data.external_id
    }));
  }, authDataSelfie);
  await page5.goto(`${TARGET_URL}/matricula`, { waitUntil: "networkidle" });
  await page5.waitForTimeout(2000);
  await page5.screenshot({ path: path.join(OUTPUT_DIR, "05_wizard_selfie.png"), fullPage: true });
  await ctx5.close();

  // 6. Wizard Step: Aguardando Liberação
  console.log("📸 [6/6] Capturando Wizard Step: Aguardando Liberação...");
  const authDataAwaiting = updateBackendEnrollmentStatus("awaiting_release");
  const ctx6 = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const page6 = await ctx6.newPage();
  await page6.addInitScript((data) => {
    window.localStorage.setItem("supletivo.login", JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: "bearer",
      roles: data.roles
    }));
    window.localStorage.setItem("supletivo.session", JSON.stringify({
      phone: data.phone,
      externalId: data.external_id
    }));
  }, authDataAwaiting);
  await page6.goto(`${TARGET_URL}/matricula`, { waitUntil: "networkidle" });
  await page6.waitForTimeout(2000);
  await page6.screenshot({ path: path.join(OUTPUT_DIR, "06_wizard_awaiting_release.png"), fullPage: true });
  await ctx6.close();

  await browser.close();
  console.log(`✅ Auditoria Visual Concluída com Sucesso! Todas as capturas salvas em: ${OUTPUT_DIR}`);
}

runVisualAudit().catch((err) => {
  console.error("❌ Erro na auditoria visual:", err);
  process.exit(1);
});
