"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardContainer,
  CardBody,
  CardItem,
  Button,
} from "@v7m/ui";
import { ArrowLeft, Sparkles, GraduationCap, ShieldCheck, Zap } from "lucide-react";

export default function ThreeDCardPreviewPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl flex items-center justify-between mb-8">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Dashboard
        </Link>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          Aceternity 3D Card Engine @v7m/ui
        </span>
      </div>

      <div className="text-center max-w-2xl mb-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Demonstração do Card 3D
        </h1>
        <p className="text-slate-400 text-sm">
          Passe o cursor sobre os cards abaixo para visualizar a inclinação 3D dinâmica,
          perspectiva de 1000px e a elevação dos elementos internos no eixo Z.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-5xl items-center justify-center">
        {/* Card 1: Usando o Card genérico com a prop `tilt` */}
        <div className="flex flex-col items-center">
          <span className="text-xs uppercase tracking-wider font-semibold text-amber-400 mb-3">
            1. Card Genérico com prop `tilt`
          </span>
          <Card
            tilt
            tiltFactor={14}
            variant="dark"
            className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-7 shadow-2xl group-hover/card:shadow-amber-500/[0.15]"
          >
            <CardHeader className="p-0 mb-5">
              <CardItem translateZ={50} className="w-full">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3 border border-amber-500/30 shadow-inner">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl font-bold text-white tracking-tight">
                  Certificação EJA Acelerada
                </CardTitle>
                <CardDescription className="text-slate-400 text-sm mt-1.5 leading-relaxed">
                  Ensino Médio completo reconhecido pelo MEC com validade nacional e publicação em Diário Oficial.
                </CardDescription>
              </CardItem>
            </CardHeader>

            <CardContent className="p-0 mb-6">
              <CardItem translateZ={90} className="w-full">
                <div className="h-48 w-full rounded-2xl bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-amber-500/20 border border-slate-700/60 flex flex-col justify-end p-5 relative overflow-hidden shadow-xl">
                  <div className="absolute top-3.5 right-3.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-amber-400 text-slate-950 shadow-md">
                    MEC OFICIAL
                  </div>
                  <div className="text-xs font-semibold text-amber-300/90 uppercase tracking-wide">Plataforma Homologada</div>
                  <div className="text-xl font-black text-white mt-1">V7M Supletivo Digital</div>
                </div>
              </CardItem>
            </CardContent>

            <CardFooter className="p-0 flex items-center justify-between">
              <CardItem translateZ={40}>
                <span className="text-xs font-medium text-slate-400">100% Online • Conclusão Rápida</span>
              </CardItem>
              <CardItem translateZ={70}>
                <Button size="sm" variant="cta" className="gap-2 font-bold px-5 py-2.5 rounded-xl shadow-lg">
                  <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
                  Matricular
                </Button>
              </CardItem>
            </CardFooter>
          </Card>
        </div>

        {/* Card 2: Sintaxe canônica Aceternity CardContainer + CardBody */}
        <div className="flex flex-col items-center">
          <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400 mb-3">
            2. Sintaxe Canônica Aceternity (`CardContainer` + `CardBody`)
          </span>
          <CardContainer tiltFactor={14} className="w-full max-w-md">
            <CardBody className="bg-slate-900/90 border border-slate-800 w-full rounded-3xl p-7 shadow-2xl group-hover/card:shadow-emerald-500/[0.15]">
              <CardItem translateZ={60} className="text-2xl font-bold text-white tracking-tight mb-1">
                Soberania Operacional
              </CardItem>
              <CardItem as="p" translateZ={70} className="text-slate-400 text-sm mb-5 leading-relaxed">
                Infraestrutura distribuída com cluster de IA local e auditoria contínua de integridade.
              </CardItem>

              <CardItem translateZ={100} className="w-full mb-6">
                <div className="h-48 w-full rounded-2xl bg-gradient-to-tr from-emerald-600/30 via-cyan-600/20 to-transparent border border-emerald-500/30 flex flex-col justify-end p-5 shadow-xl">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1.5 uppercase tracking-wide">
                    <ShieldCheck className="w-4 h-4" />
                    Alta Disponibilidade Ativa
                  </div>
                  <div className="text-sm font-mono text-slate-200">Cluster 10.0.1.99 • Proxmox LXC</div>
                </div>
              </CardItem>

              <div className="flex items-center justify-between">
                <CardItem translateZ={50}>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                    STATUS: HEALTHY
                  </span>
                </CardItem>
                <CardItem translateZ={80}>
                  <Button size="sm" variant="primary" className="font-bold px-5 py-2.5 rounded-xl shadow-lg">
                    Acessar Cluster
                  </Button>
                </CardItem>
              </div>
            </CardBody>
          </CardContainer>
        </div>
      </div>
    </div>
  );
}
