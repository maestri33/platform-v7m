// Helper dev (manual §8.2: monta a URL dentro do script, fora do shell).
// Dispara o /api/auth/check do dev local pra testar o fluxo de login OTP de
// ponta a ponta (Next route handler → backend vivo → OTP no WhatsApp).
// uso: node scripts/check.mjs <porta> <phone>
const [port, phone] = process.argv.slice(2);
if (!port || !phone) {
  console.error("uso: node scripts/check.mjs <porta> <phone>");
  process.exit(2);
}

const url = `http://localhost:${port}/api/auth/check`;
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ phone: String(phone).replace(/\D/g, "") }),
});

let body;
try {
  body = await res.json();
} catch {
  body = await res.text();
}

console.log(JSON.stringify({ status: res.status, body }, null, 2));
