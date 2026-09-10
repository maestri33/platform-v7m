"use client";

import React, { useRef, useState } from "react";
import { motion } from "motion/react";
import { IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import { cn } from "../lib/utils";

const mainVariant = {
  initial: {
    x: 0,
    y: 0,
  },
  animate: {
    x: 20,
    y: -20,
    opacity: 0.9,
  },
};

const secondaryVariant = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
};

export interface FileUploadProps {
  label?: string;
  title?: string;
  hint?: string;
  description?: string;
  multiple?: boolean;
  accept?: Record<string, string[]>;
  capture?: "user" | "environment";
  file?: File | null;
  onChange?: ((files: File[]) => void) | ((file: File | null) => void);
  done?: boolean;
  className?: string;
}

export const FileUpload = ({
  label,
  title,
  hint,
  description,
  multiple = false,
  accept,
  capture,
  file,
  onChange,
  className,
}: FileUploadProps) => {
  const [internalFiles, setInternalFiles] = useState<File[]>(file ? [file] : []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const files = file !== undefined ? (file ? [file] : []) : internalFiles;

  const handleFileChange = (newFiles: File[]) => {
    setInternalFiles((prevFiles) => (multiple ? [...prevFiles, ...newFiles] : newFiles));
    if (onChange) {
      if (multiple) {
        (onChange as (files: File[]) => void)(newFiles);
      } else {
        const singleFile = newFiles[0] || null;
        // Support both single file and array callbacks
        try {
          (onChange as (files: File[]) => void)(newFiles);
        } catch {
          (onChange as (file: File | null) => void)(singleFile);
        }
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const { getRootProps, isDragActive } = useDropzone({
    multiple,
    noClick: true,
    accept,
    onDrop: handleFileChange,
    onDropRejected: (fileRejections) => {
      console.warn("Upload rejected:", fileRejections);
    },
  });

  const displayTitle = title || label || "Upload file";
  const displayHint =
    description || hint || "Drag or drop your files here or click to upload";

  return (
    <div className="w-full" {...getRootProps()}>
      <motion.div
        onClick={handleClick}
        whileHover="animate"
        className={cn(
          "group/file relative block w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 hover:border-brand-blue bg-slate-50/60 hover:bg-slate-50 p-6 md:p-8 transition-all shadow-xs",
          className
        )}
      >
        <input
          ref={fileInputRef}
          id="file-upload-handle"
          type="file"
          capture={capture}
          onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
          className="hidden"
        />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)] opacity-60">
          <GridPattern />
        </div>
        <div className="flex flex-col items-center justify-center text-center">
          <p className="relative z-20 font-sans text-base font-bold text-slate-800">
            {displayTitle}
          </p>
          <p className="relative z-20 mt-1 text-center font-sans text-xs font-normal text-slate-500">
            {displayHint}
          </p>
          <div className="relative mx-auto mt-4 w-full max-w-xl">
            {files.length > 0 &&
              files.map((f, idx) => (
                <motion.div
                  key={"file" + idx}
                  layoutId={idx === 0 ? "file-upload" : "file-upload-" + idx}
                  className={cn(
                    "relative z-40 mx-auto mt-3 flex w-full flex-col items-start justify-start overflow-hidden rounded-xl bg-white border border-slate-200 p-3 shadow-xs md:h-20",
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-4">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="max-w-xs truncate text-sm font-semibold text-slate-800"
                    >
                      {f.name}
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="w-fit shrink-0 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600"
                    >
                      {(f.size / (1024 * 1024)).toFixed(2)} MB
                    </motion.p>
                  </div>

                  <div className="mt-2 flex w-full flex-col items-start justify-between text-[11px] text-slate-500 md:flex-row md:items-center">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="rounded bg-slate-100 px-1.5 py-0.5 font-medium"
                    >
                      {f.type || "documento"}
                    </motion.p>

                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} layout>
                      {f.lastModified ? new Date(f.lastModified).toLocaleDateString() : ""}
                    </motion.p>
                  </div>
                </motion.div>
              ))}
            {!files.length && (
              <motion.div
                layoutId="file-upload"
                variants={mainVariant}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                className={cn(
                  "relative z-40 mx-auto mt-3 flex h-20 w-full max-w-[6.5rem] items-center justify-center rounded-xl bg-white border border-slate-200 shadow-xs group-hover/file:border-brand-blue group-hover/file:shadow-md transition-all",
                )}
              >
                {isDragActive ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center text-[11px] font-bold text-brand-blue"
                  >
                    Solte aqui
                    <IconUpload className="mt-0.5 h-4 w-4 text-brand-blue" />
                  </motion.p>
                ) : (
                  <IconUpload className="h-6 w-6 text-brand-blue group-hover/file:scale-110 transition-transform" />
                )}
              </motion.div>
            )}

            {!files.length && (
              <motion.div
                variants={secondaryVariant}
                className="absolute inset-0 z-30 mx-auto mt-4 flex h-28 w-full max-w-[7.5rem] items-center justify-center rounded-xl border border-dashed border-sky-400 bg-transparent opacity-0"
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export function GridPattern() {
  const columns = 41;
  const rows = 11;
  return (
    <div className="flex shrink-0 scale-105 flex-wrap items-center justify-center gap-x-px gap-y-px bg-gray-100 dark:bg-neutral-900">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return (
            <div
              key={`${col}-${row}`}
              className={`flex h-10 w-10 shrink-0 rounded-[2px] ${
                index % 2 === 0
                  ? "bg-gray-50 dark:bg-neutral-950"
                  : "bg-gray-50 shadow-[0px_0px_1px_3px_rgba(255,255,255,1)_inset] dark:bg-neutral-950 dark:shadow-[0px_0px_1px_3px_rgba(0,0,0,1)_inset]"
              }`}
            />
          );
        }),
      )}
    </div>
  );
}
