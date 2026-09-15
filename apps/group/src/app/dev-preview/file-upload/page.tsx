"use client";

import React, { useState } from "react";
import { FileUpload } from "@v7m/ui";

export default function FileUploadPreviewPage() {
  const [files, setFiles] = useState<File[]>([]);

  const handleFileUpload = (uploadedFiles: File[]) => {
    setFiles(uploadedFiles);
    console.log("Arquivos recebidos:", uploadedFiles);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Preview do Componente FileUpload</h1>
          <p className="text-sm text-slate-400">
            Primitiva compartilhada do pacote <code className="text-brand-blue-bright">@v7m/ui</code> com animações do Motion e drag & drop.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
          <FileUpload
            title="Envio de Documentos do Aluno"
            description="Arraste o RG/CNH ou clique para selecionar"
            multiple={true}
            onChange={handleFileUpload}
          />
        </div>

        {files.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-sm font-semibold text-slate-300">
              Arquivos no Estado Local ({files.length}):
            </h2>
            <ul className="mt-2 space-y-1 text-xs text-slate-400">
              {files.map((file, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>{file.name}</span>
                  <span className="font-mono text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
