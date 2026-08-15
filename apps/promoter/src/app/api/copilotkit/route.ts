/**
 * "Porteiro" do CopilotKit (Copilot Runtime) — roda SÓ no servidor (route handler do Next).
 *
 * O front (CopilotKit) fala com esta rota; ela fala com o OmniRoute (gateway de IA do ecossistema,
 * OpenAI-compatible). A chave da IA NUNCA vai pro browser — fica aqui, server-side. Diferente das
 * outras rotas /api/me/* deste app (que proxiam pro Django via djangoFetch), esta fala DIRETO com o
 * OmniRoute — é o runtime do CopilotKit, não um proxy do backend.
 *
 * Env (server-side, do .env.local / ambiente do deploy):
 *   OMNIROUTE_BASE_URL   — ex.: http://10.1.30.35:80  (o mesmo do backend Django)
 *   OMNIROUTE_API_KEY    — a chave do gateway
 *   OMNIROUTE_MODEL      — opcional; default "auto/best-vision" (visão + tool_calling)
 */
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import OpenAI from "openai";
import { NextRequest } from "next/server";

const BASE_URL = process.env.OMNIROUTE_BASE_URL ?? "";
const API_KEY = process.env.OMNIROUTE_API_KEY ?? "";
// "auto/best-vision": alias do OmniRoute que resolve pro melhor modelo com visão + tool_calling.
const MODEL = process.env.OMNIROUTE_MODEL ?? "auto/best-vision";

const openai = new OpenAI({ baseURL: `${BASE_URL}/v1`, apiKey: API_KEY });
const serviceAdapter = new OpenAIAdapter({ openai, model: MODEL });

const runtime = new CopilotRuntime();

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });
  return handleRequest(req);
};
