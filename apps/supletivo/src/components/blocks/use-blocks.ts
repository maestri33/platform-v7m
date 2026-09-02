"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BlockOut } from "./types";
import { getAccessToken } from "@/lib/session";

const BLOCKS_QUERY_KEY = ["clients", "me", "blocks"];

async function fetchBlocks(): Promise<BlockOut[]> {
  const token = getAccessToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch("/api/v1/clients/me/blocks", { headers });

  if (!res.ok) {
    if (res.status === 401 || res.status === 404) return [];
    throw new Error(`Erro ao carregar bloqueios: ${res.status}`);
  }

  return (await res.json()) as BlockOut[];
}

async function resolveBlockRequest(blockId: string | number): Promise<BlockOut> {
  const token = getAccessToken();
  if (!token) throw new Error("Sessão não autenticada.");

  const res = await fetch(`/api/v1/clients/me/blocks/${blockId}/resolve`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Erro ao resolver bloqueio: ${res.status}`);
  }

  return (await res.json()) as BlockOut;
}

export function useStudentBlocks(options?: { refetchInterval?: number | false }) {
  return useQuery<BlockOut[]>({
    queryKey: BLOCKS_QUERY_KEY,
    queryFn: fetchBlocks,
    refetchInterval: options?.refetchInterval ?? 12_000,
    staleTime: 5_000,
  });
}

export function useResolveBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blockId: string | number) => resolveBlockRequest(blockId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOCKS_QUERY_KEY });
    },
  });
}
