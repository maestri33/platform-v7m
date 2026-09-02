"use client";

import React, { useState } from "react";
import { FileUpload } from "./ui/file-upload";

export default function FileUploadDemo() {
  const [, setFiles] = useState<File[]>([]);
  const handleFileUpload = (newFiles: File[]) => {
    setFiles(newFiles);
  };

  return (
    <div className="w-full max-w-4xl mx-auto min-h-96 border border-dashed bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
      <FileUpload onChange={handleFileUpload} />
    </div>
  );
}
