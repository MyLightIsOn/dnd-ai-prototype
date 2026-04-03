'use client';
import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

interface ImportButtonProps {
  onImported: () => void;
}

export function ImportButton({ onImported }: ImportButtonProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    let payload: unknown;
    try {
      payload = JSON.parse(await file.text());
    } catch {
      setError('Invalid JSON file');
      return;
    }

    const res = await fetch('/api/runs/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 409) {
      setError('A run with this ID already exists');
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? 'Import failed');
      return;
    }

    onImported();
    // reset file input so same file can be imported again
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="flex items-center gap-2">
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile} />
      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"
      >
        <Upload size={14} /> Import Run
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
