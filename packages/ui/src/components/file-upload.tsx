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
        className="group/file relative block w-full cursor-pointer overflow-hidden rounded-xl border border-neutral-200/80 bg-white p-6 md:p-8 dark:border-neutral-800 dark:bg-neutral-950"
      >
        <input
          ref={fileInputRef}
          id="file-upload-handle"
          type="file"
          capture={capture}
          onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
          className="hidden"
        />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
          <GridPattern />
        </div>
        <div className="flex flex-col items-center justify-center">
          <p className="relative z-20 font-sans text-base font-bold text-neutral-700 dark:text-neutral-300">
            {displayTitle}
          </p>
          <p className="relative z-20 mt-1 text-center font-sans text-sm font-normal text-neutral-400 dark:text-neutral-400">
            {displayHint}
          </p>
          <div className="relative mx-auto mt-6 w-full max-w-xl">
            {files.length > 0 &&
              files.map((f, idx) => (
                <motion.div
                  key={"file" + idx}
                  layoutId={idx === 0 ? "file-upload" : "file-upload-" + idx}
                  className={cn(
                    "relative z-40 mx-auto mt-3 flex w-full flex-col items-start justify-start overflow-hidden rounded-lg bg-white p-4 shadow-sm md:h-24 dark:bg-neutral-900",
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-4">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="max-w-xs truncate text-base text-neutral-700 dark:text-neutral-300 font-medium"
                    >
                      {f.name}
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="w-fit shrink-0 rounded-lg bg-neutral-100 px-2 py-1 text-sm font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-white"
                    >
                      {(f.size / (1024 * 1024)).toFixed(2)} MB
                    </motion.p>
                  </div>

                  <div className="mt-2 flex w-full flex-col items-start justify-between text-xs text-neutral-500 md:flex-row md:items-center dark:text-neutral-400">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="rounded-md bg-gray-100 px-1.5 py-0.5 font-medium dark:bg-neutral-800"
                    >
                      {f.type || "document"}
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
                  "relative z-40 mx-auto mt-4 flex h-28 w-full max-w-[7.5rem] items-center justify-center rounded-xl bg-white group-hover/file:shadow-2xl dark:bg-neutral-900",
                  "shadow-[0px_10px_50px_rgba(0,0,0,0.1)]",
                )}
              >
                {isDragActive ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center text-xs font-semibold text-neutral-600"
                  >
                    Solte aqui
                    <IconUpload className="mt-1 h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                  </motion.p>
                ) : (
                  <IconUpload className="h-6 w-6 text-neutral-600 dark:text-neutral-300" />
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
