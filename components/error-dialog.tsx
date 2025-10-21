'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';

interface ErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeName: string;
  errorMessage: string;
  onRetry: () => void;
  onSkip: () => void;
  onAbort: () => void;
}

export function ErrorDialog({
  open,
  onOpenChange,
  nodeName,
  errorMessage,
  onRetry,
  onSkip,
  onAbort,
}: ErrorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="size-5" />
            <DialogTitle>Execution Error</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Node:</div>
            <div className="text-sm text-gray-900">{nodeName}</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Error:</div>
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
              {errorMessage}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onRetry}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Retry
            </button>
            <button
              onClick={onSkip}
              className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
            >
              Skip
            </button>
            <button
              onClick={onAbort}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Abort
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
