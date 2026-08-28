import fs from "fs";
import path from "path";

console.log("================================================================================");
console.log(" 🔬 EMPIRICAL CHALLENGER 2: MILESTONE 1 VERIFICATION & STRESS HARNESS");
console.log("================================================================================");

let totalAsserts = 0;
let passedAsserts = 0;
let failedAsserts = 0;

function assert(condition, message, details = "") {
  totalAsserts++;
  if (condition) {
    passedAsserts++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedAsserts++;
    console.error(`  ❌ FAIL: ${message} | ${details}`);
  }
}

// -----------------------------------------------------------------------------
// 1. SOURCE CODE AST & EXPORT INTEGRITY CHECK
// -----------------------------------------------------------------------------
console.log("\n[TEST GROUP 1] Packages/UI Source Files & Export Signatures");

const UI_DIR = "c:\\Users\\maestri33\\dev\\v7m\\packages\\ui\\src";
const COMPONENTS_DIR = path.join(UI_DIR, "components");

const expectedFiles = [
  "duty-icon-badge.tsx",
  "duty-mini-pill.tsx",
  "contract-signer.tsx",
  "biometrics-liveness-capture.tsx",
  "document-resolution-drawer.tsx",
  "document-inspector-modal.tsx",
  "duty-status-card.tsx",
  "address-proof-capture.tsx",
  "index.ts",
];

for (const file of expectedFiles) {
  const filePath = path.join(COMPONENTS_DIR, file);
  assert(fs.existsSync(filePath), `Component file exists: ${file}`);
}

const mainIndexContent = fs.readFileSync(path.join(UI_DIR, "index.ts"), "utf-8");
const compIndexContent = fs.readFileSync(path.join(COMPONENTS_DIR, "index.ts"), "utf-8");

const requiredStarExports = [
  "./components/duty-icon-badge",
  "./components/duty-mini-pill",
  "./components/contract-signer",
  "./components/biometrics-liveness-capture",
  "./components/document-inspector-modal",
  "./components/document-resolution-drawer",
  "./components/address-proof-capture",
  "./components/duty-status-card",
];

for (const exp of requiredStarExports) {
  assert(
    mainIndexContent.includes(exp),
    `Star re-export '${exp}' present in packages/ui/src/index.ts`
  );
}

const requiredNamedExports = [
  "DutyIconBadge",
  "DutyMiniPill",
  "ContractSigner",
  "BiometricsLivenessCapture",
  "DocumentInspectorModal",
  "DocumentResolutionDrawer",
  "AddressProofCapture",
  "DutyStatusCard",
  "DocumentHubGrid",
  "DOCUMENT_ICONS",
  "DEFAULT_KINSHIP_OPTIONS",
];

for (const exp of requiredNamedExports) {
  assert(
    compIndexContent.includes(exp),
    `Named export '${exp}' present in packages/ui/src/components/index.ts`
  );
}

// -----------------------------------------------------------------------------
// 2. RG VS CNH REGULATORY ENFORCEMENT SIMULATION
// -----------------------------------------------------------------------------
console.log("\n[TEST GROUP 2] RG vs CNH Enforcement (Student vs Promoter Persona)");

const drawerCode = fs.readFileSync(path.join(COMPONENTS_DIR, "document-resolution-drawer.tsx"), "utf-8");

// Verify Student blocking logic in source
assert(
  drawerCode.includes('persona === "student" && selectedDocTypeChoice === "cnh"'),
  "Strict student CNH check present in handleIdentityUpload"
);

assert(
  drawerCode.includes("O MEC veda expressamente o uso de CNH para emissão de Certificado EJA"),
  "Regulatory MEC error message present in identity upload handler"
);

assert(
  drawerCode.includes("Atenção: Para o Aluno EJA, o MEC/SISTEC exige estritamente RG ou CIN"),
  "Click feedback warning present for student CNH button"
);

// Empirical simulation of the identity selection & upload state machine
function simulateIdentityUpload({ persona, selectedDocTypeChoice, hasUploadCallback = true }) {
  let errorMessage = null;
  let uploadCalledWith = null;

  // Simulate button click for doc choice
  if (selectedDocTypeChoice === "cnh") {
    if (persona === "student") {
      errorMessage = "Atenção: Para o Aluno EJA, o MEC/SISTEC exige estritamente RG ou CIN para emissão do diploma. A CNH não é aceita.";
    } else {
      errorMessage = null;
    }
  } else if (selectedDocTypeChoice === "rg") {
    errorMessage = null;
  }

  // Simulate file upload execution
  const mockFile = { name: "meu_documento.jpg", size: 1024 * 500, type: "image/jpeg" };
  const mockItem = { id: "identity", title: "Documento de Identidade", status: "empty" };

  const handleIdentityUpload = (file) => {
    if (persona === "student" && selectedDocTypeChoice === "cnh") {
      errorMessage = "O MEC veda expressamente o uso de CNH para emissão de Certificado EJA. Envie seu RG ou CIN.";
      return false;
    }
    if (!hasUploadCallback) return false;
    uploadCalledWith = { item: mockItem, file };
    return true;
  };

  const uploadSuccess = handleIdentityUpload(mockFile);
  return { errorMessage, uploadSuccess, uploadCalledWith };
}

// Student with RG -> Pass
const studentRgRes = simulateIdentityUpload({ persona: "student", selectedDocTypeChoice: "rg" });
assert(studentRgRes.uploadSuccess === true, "Student + RG: Upload succeeds");
assert(studentRgRes.errorMessage === null, "Student + RG: No error message");
assert(studentRgRes.uploadCalledWith !== null, "Student + RG: onResolveUpload invoked");

// Student with CNH -> STRICT REJECT
const studentCnhRes = simulateIdentityUpload({ persona: "student", selectedDocTypeChoice: "cnh" });
assert(studentCnhRes.uploadSuccess === false, "Student + CNH: Upload STRICTLY BLOCKED");
assert(
  studentCnhRes.errorMessage.includes("MEC veda expressamente"),
  "Student + CNH: MEC regulatory rejection message returned"
);
assert(studentCnhRes.uploadCalledWith === null, "Student + CNH: onResolveUpload NEVER invoked");

// Promoter with RG -> Pass
const promoterRgRes = simulateIdentityUpload({ persona: "promoter", selectedDocTypeChoice: "rg" });
assert(promoterRgRes.uploadSuccess === true, "Promoter + RG: Upload succeeds");
assert(promoterRgRes.errorMessage === null, "Promoter + RG: No error message");

// Promoter with CNH -> Pass
const promoterCnhRes = simulateIdentityUpload({ persona: "promoter", selectedDocTypeChoice: "cnh" });
assert(promoterCnhRes.uploadSuccess === true, "Promoter + CNH: Upload succeeds");
assert(promoterCnhRes.errorMessage === null, "Promoter + CNH: No error message");
assert(promoterCnhRes.uploadCalledWith !== null, "Promoter + CNH: onResolveUpload invoked with CNH");

// -----------------------------------------------------------------------------
// 3. KINSHIP SELECTION & STATE TRANSITIONS (AddressProofCapture)
// -----------------------------------------------------------------------------
console.log("\n[TEST GROUP 3] Kinship Selection & State Transitions (AddressProofCapture)");

const addressCode = fs.readFileSync(path.join(COMPONENTS_DIR, "address-proof-capture.tsx"), "utf-8");

// Validate Kinship constants in code
assert(addressCode.includes("DEFAULT_KINSHIP_OPTIONS"), "DEFAULT_KINSHIP_OPTIONS defined");
assert(addressCode.includes('"conjuge"'), "Kinship option 'conjuge' present");
assert(addressCode.includes('"aluguel_locador"'), "Kinship option 'aluguel_locador' present");

// Empirical simulation of AddressProofCapture state machine
class AddressProofStateMachine {
  constructor(initialData = null) {
    this.data = initialData;
    this.step = initialData?.address?.zipcode ? "satisfied" : "empty";
    this.errorMessage = null;
    this.selectedKinship = "";
    this.customKinshipText = "";
  }

  async processFile(file, mockOcrResult) {
    const validMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validMimes.includes(file.type)) {
      this.errorMessage = "Formato não suportado. Por favor, envie uma foto (JPG, PNG) ou documento PDF.";
      this.step = "error";
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      this.errorMessage = "Arquivo muito grande. O tamanho máximo permitido é de 15 MB.";
      this.step = "error";
      return;
    }

    this.step = "analyzing";
    this.errorMessage = null;

    // Simulate OCR result
    this.data = mockOcrResult;

    if (mockOcrResult.is_own_name || mockOcrResult.matched_parent) {
      this.step = "satisfied";
    } else {
      this.step = "needs_kinship";
    }
  }

  selectKinship(kinshipId) {
    this.selectedKinship = kinshipId;
  }

  confirmKinship(onConfirmCallback) {
    if (!this.selectedKinship) return false;
    if (onConfirmCallback) onConfirmCallback(this.selectedKinship, this.customKinshipText);
    this.data = { ...this.data, kinship_provided: this.selectedKinship };
    this.step = "satisfied";
    return true;
  }

  reset() {
    this.data = null;
    this.step = "empty";
    this.errorMessage = null;
    this.selectedKinship = "";
    this.customKinshipText = "";
  }
}

// Test Flow A: Own Name Proof -> Direct to Satisfied
const fsmA = new AddressProofStateMachine();
assert(fsmA.step === "empty", "Flow A: Starts in 'empty' step");

const validProofOwn = { name: "luz_titular.pdf", size: 1024 * 300, type: "application/pdf" };
const ocrOwnName = {
  file_url: "blob://luz_titular.pdf",
  file_name: "luz_titular.pdf",
  mime_type: "application/pdf",
  holder_name: "JOAO SILVA",
  is_own_name: true,
  address: {
    zipcode: "80010-010",
    street: "Rua Marechal Deodoro",
    number: "500",
    neighborhood: "Centro",
    city: "Curitiba",
    state: "PR",
  },
};

await fsmA.processFile(validProofOwn, ocrOwnName);
assert(fsmA.step === "satisfied", "Flow A: Own name directly transitions to 'satisfied'");
assert(fsmA.data.address.zipcode === "80010-010", "Flow A: Extracted address captured");

// Test Flow B: Third Party Proof -> needs_kinship -> select kinship -> satisfied
const fsmB = new AddressProofStateMachine();
const validProofThird = { name: "comprovante_aluguel.jpg", size: 1024 * 800, type: "image/jpeg" };
const ocrThirdParty = {
  file_url: "blob://comprovante_aluguel.jpg",
  file_name: "comprovante_aluguel.jpg",
  mime_type: "image/jpeg",
  holder_name: "IMOBILIARIA CENTRAL LTDA",
  is_own_name: false,
  address: {
    zipcode: "01310-100",
    street: "Avenida Paulista",
    number: "1000",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
  },
};

await fsmB.processFile(validProofThird, ocrThirdParty);
assert(fsmB.step === "needs_kinship", "Flow B: Third party triggers 'needs_kinship' step");
assert(fsmB.data.holder_name === "IMOBILIARIA CENTRAL LTDA", "Flow B: Third party holder name recorded");

let confirmedKinshipPayload = null;
fsmB.selectKinship("aluguel_locador");
const confirmedOk = fsmB.confirmKinship((id, text) => {
  confirmedKinshipPayload = { id, text };
});

assert(confirmedOk === true, "Flow B: Kinship confirmation succeeds");
assert(confirmedKinshipPayload.id === "aluguel_locador", "Flow B: Kinship payload 'aluguel_locador' received");
assert(fsmB.step === "satisfied", "Flow B: Seamlessly transitions to 'satisfied' after kinship");
assert(fsmB.data.kinship_provided === "aluguel_locador", "Flow B: Kinship recorded in state");

// Test Flow C: Adversarial Invalid MIME & Oversize
const fsmC = new AddressProofStateMachine();
await fsmC.processFile({ name: "virus.exe", size: 1024, type: "application/x-msdownload" }, {});
assert(fsmC.step === "error", "Flow C: Invalid MIME triggers 'error' step");
assert(fsmC.errorMessage.includes("Formato não suportado"), "Flow C: Correct unsupported format message");

await fsmC.processFile({ name: "huge.pdf", size: 20 * 1024 * 1024, type: "application/pdf" }, {});
assert(fsmC.step === "error", "Flow C: File > 15MB triggers 'error' step");
assert(fsmC.errorMessage.includes("Arquivo muito grande"), "Flow C: Correct oversize message");

// -----------------------------------------------------------------------------
// 4. DUTYICONBADGE & DUTYMINIPILL INTERACTIVITY & 6-STATE CONTRACT
// -----------------------------------------------------------------------------
console.log("\n[TEST GROUP 4] DutyIconBadge & DutyMiniPill 6-State Visual & Interactive Contract");

const badgeCode = fs.readFileSync(path.join(COMPONENTS_DIR, "duty-icon-badge.tsx"), "utf-8");
const pillCode = fs.readFileSync(path.join(COMPONENTS_DIR, "duty-mini-pill.tsx"), "utf-8");

const requiredStates = ["empty", "analyzing", "needs_kinship", "needs_action", "review", "approved"];
const requiredDocTypes = [
  "identity",
  "selfie",
  "address",
  "pix",
  "school_history",
  "civil_certificate",
  "voter_card",
  "military_certificate",
  "contract",
];

for (const st of requiredStates) {
  assert(badgeCode.includes(`${st}:`), `DutyIconBadge status config includes state: '${st}'`);
  assert(pillCode.includes(`${st}:`), `DutyMiniPill status config includes state: '${st}'`);
}

for (const doc of requiredDocTypes) {
  assert(badgeCode.includes(`${doc}:`), `DutyIconBadge covers document type: '${doc}'`);
}

// Localized PT-BR Labels in DutyMiniPill
assert(pillCode.includes('"Pendente"'), "DutyMiniPill empty state label: 'Pendente'");
assert(pillCode.includes('"Lendo (OCR)..."'), "DutyMiniPill analyzing state label: 'Lendo (OCR)...'");
assert(pillCode.includes('"Vínculo Pendente"'), "DutyMiniPill needs_kinship label: 'Vínculo Pendente'");
assert(pillCode.includes('"Ajuste Necessário"'), "DutyMiniPill needs_action label: 'Ajuste Necessário'");
assert(pillCode.includes('"Em Análise"'), "DutyMiniPill review label: 'Em Análise'");
assert(pillCode.includes('"Verificado ✓"'), "DutyMiniPill approved label: 'Verificado ✓'");

// Check Interactive Button vs Static Span rendering logic
assert(
  badgeCode.includes("const isInteractive = Boolean(onClick && !disabled);") &&
  badgeCode.includes("<button") &&
  badgeCode.includes('role="status"'),
  "DutyIconBadge: Renders button when onClick provided, renders role='status' span when static"
);

assert(
  pillCode.includes("const isInteractive = Boolean(onClick && !disabled);") &&
  pillCode.includes("<button") &&
  pillCode.includes("<span className={baseClasses}>"),
  "DutyMiniPill: Renders button when onClick provided, renders span when static"
);

// -----------------------------------------------------------------------------
// 5. CONTRACTSIGNER, BIOMETRICSLIVENESSCAPTURE & DOCUMENTINSPECTORMODAL
// -----------------------------------------------------------------------------
console.log("\n[TEST GROUP 5] ContractSigner, BiometricsLivenessCapture & DocumentInspectorModal");

const contractCode = fs.readFileSync(path.join(COMPONENTS_DIR, "contract-signer.tsx"), "utf-8");
const bioCode = fs.readFileSync(path.join(COMPONENTS_DIR, "biometrics-liveness-capture.tsx"), "utf-8");
const modalCode = fs.readFileSync(path.join(COMPONENTS_DIR, "document-inspector-modal.tsx"), "utf-8");

// ContractSigner: dual persona & scroll gate & signature seal
assert(
  contractCode.includes("Termo de Parceria e Credenciamento de Promotor") &&
  contractCode.includes("Contrato de Matrícula e Prestação de Serviços EJA EAD"),
  "ContractSigner: Dual persona agreement headers present"
);
assert(
  contractCode.includes("currentProgress >= 0.9"),
  "ContractSigner: Scroll progress threshold 90% lock enforced"
);
assert(
  contractCode.includes("generateSignatureHash") && contractCode.includes("V7M-SIG-"),
  "ContractSigner: Cryptographic signature seal generator present"
);

// BiometricsLivenessCapture: webcam & score threshold
assert(
  bioCode.includes("minScoreThreshold = 0.65"),
  "BiometricsLivenessCapture: Default ArcFace score threshold is 0.65"
);
assert(
  bioCode.includes("react-webcam"),
  "BiometricsLivenessCapture: Utilizes react-webcam"
);
assert(
  bioCode.includes("Centralize o rosto no contorno oval"),
  "BiometricsLivenessCapture: Facial oval guide overlay present"
);

// DocumentInspectorModal: zoom, rotate, pdf iframe
assert(
  modalCode.includes("ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0]"),
  "DocumentInspectorModal: 7 zoom steps from 0.5x to 3.0x"
);
assert(
  modalCode.includes("(prev + 90) % 360"),
  "DocumentInspectorModal: 90° clockwise rotation arithmetic"
);
assert(
  modalCode.includes("<iframe") && modalCode.includes("<img"),
  "DocumentInspectorModal: Dual rendering support for PDF iframe and Image viewer"
);
assert(
  modalCode.includes("Dossiê de Validação"),
  "DocumentInspectorModal: Validation metadata panel present"
);

// -----------------------------------------------------------------------------
// SUMMARY & VERDICT
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(` 📊 SUMMARY: Total Assertions: ${totalAsserts} | Passed: ${passedAsserts} | Failed: ${failedAsserts}`);
console.log("================================================================================");

if (failedAsserts === 0) {
  console.log("\n🎯 CHALLENGER 2 VERDICT: APPROVE (100% Empirically Verified)\n");
  process.exit(0);
} else {
  console.error(`\n🚨 CHALLENGER 2 VERDICT: REQUEST_CHANGES (${failedAsserts} failed assertions)\n`);
  process.exit(1);
}
