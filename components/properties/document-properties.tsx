import React, { useState } from "react";
import type { DocumentData } from "@/types";
import { extractTextFromPDF, determineFileType } from "@/lib/document/pdf-parser";

interface DocumentPropertiesProps {
  data: DocumentData;
  onChange: (patch: Partial<DocumentData>) => void;
}

export function DocumentProperties({ data, onChange }: DocumentPropertiesProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      let content = '';
      const fileType = determineFileType(file.name);

      if (fileType === 'pdf') {
        content = await extractTextFromPDF(file);
      } else {
        content = await file.text();
      }

      onChange({
        fileName: file.name,
        fileType,
        content,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
      console.error('File upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Upload File</label>
        <input
          type="file"
          accept=".pdf,.txt,.md,.js,.ts,.py,.jsx,.tsx,.json,.csv"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
      </div>

      {isUploading && (
        <div className="text-xs text-gray-500">Processing file...</div>
      )}

      {data.fileName && !isUploading && (
        <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
          <div className="text-xs text-gray-600 font-medium">File Info</div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-500">Name:</span>
              <span className="text-gray-700 font-medium truncate max-w-[150px]">
                {data.fileName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type:</span>
              <span className="text-gray-700 font-medium uppercase">
                {data.fileType}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Size:</span>
              <span className="text-gray-700 font-medium">
                {data.size ? (data.size / 1024).toFixed(1) : '0.0'} KB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Characters:</span>
              <span className="text-gray-700 font-medium">
                {data.content?.length || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {data.content && (
        <div className="grid gap-2">
          <label className="text-xs text-gray-600">Preview</label>
          <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
            <div className="text-[11px] text-gray-700 whitespace-pre-wrap max-h-60 overflow-auto font-mono">
              {data.content.slice(0, 1000)}
              {data.content.length > 1000 && '...'}
            </div>
            <div className="text-xs text-gray-500 flex gap-4 pt-2 border-t">
              <span>{data.content.length} characters</span>
              <span>•</span>
              <span>{data.content.split(/\s+/).filter(w => w.length > 0).length} words</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
