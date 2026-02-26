'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface HumanReviewModalProps {
  open: boolean;
  reviewerLabel: string;
  nodeName: string;
  instructions?: string;
  content: string;
  mode: 'approve-reject' | 'edit-and-approve';
  onDecision: (decision: 'approved' | 'rejected', editedContent?: string) => void;
}

export function HumanReviewModal({
  open,
  reviewerLabel,
  nodeName,
  instructions,
  content,
  mode,
  onDecision,
}: HumanReviewModalProps) {
  const [editedContent, setEditedContent] = useState(content);

  // Keep editedContent in sync when content prop changes (new review sessions)
  React.useEffect(() => {
    setEditedContent(content);
  }, [content]);

  const handleApprove = () => {
    if (mode === 'edit-and-approve') {
      onDecision('approved', editedContent);
    } else {
      onDecision('approved');
    }
  };

  const handleReject = () => {
    onDecision('rejected');
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* modal requires explicit decision */ }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {reviewerLabel} — {nodeName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          {instructions && instructions.trim().length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <span className="font-medium">Instructions: </span>
              {instructions}
            </div>
          )}

          {/* Content area */}
          <div className="grid gap-2">
            <label className="text-xs text-gray-600 font-medium">
              Content to Review
            </label>
            {mode === 'edit-and-approve' ? (
              <textarea
                className="w-full min-h-[200px] max-h-[400px] p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="Content will appear here..."
              />
            ) : (
              <div className="w-full min-h-[200px] max-h-[400px] overflow-y-auto p-3 border rounded-lg text-sm font-mono bg-gray-50 whitespace-pre-wrap">
                {content || <span className="text-gray-400">(No content)</span>}
              </div>
            )}
            {mode === 'edit-and-approve' && (
              <div className="text-[11px] text-gray-500">
                You may edit the content above before approving.
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleReject}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
            >
              Reject
            </button>
            <button
              onClick={handleApprove}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
            >
              Approve
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
