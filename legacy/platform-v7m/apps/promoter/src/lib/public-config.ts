const legalBaseUrl = process.env.NEXT_PUBLIC_LEGAL_BASE_URL ?? "https://job.v7m.org";
const supportWhatsapp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "5511920062177";

export const LEGAL_TERMS_URL = `${legalBaseUrl.replace(/\/$/, "")}/termos/`;
export const LEGAL_PRIVACY_URL = `${legalBaseUrl.replace(/\/$/, "")}/privacidade/`;
export const SUPPORT_WHATSAPP_URL = `https://wa.me/${supportWhatsapp.replace(/\D/g, "")}`;
