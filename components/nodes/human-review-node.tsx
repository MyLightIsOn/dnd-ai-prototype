"use client";

import React from "react";
import type { NodeProps } from "@xyflow/react";
import { Position, Handle } from "@xyflow/react";
import { User } from "lucide-react";
import type { HumanReviewData, ApprovalRule, ReviewDecision } from "@/types/human-review";

function formatApprovalRule(rule: ApprovalRule, reviewerCount: number): string {
  if (rule.type === '1-of-n') return 'Any';
  if (rule.type === 'all-required') return 'All';
  if (rule.type === 'm-of-n') return `${rule.m}-of-${reviewerCount}`;
  return '';
}

function ReviewerSlot({ index, decision }: { index: number; decision?: ReviewDecision }) {
  if (!decision) {
    return <span className="text-[13px]" title={`Reviewer ${index + 1}: Pending`}>⏳</span>;
  }
  if (decision.decision === 'approved') {
    return <span className="text-[13px]" title={`${decision.reviewer}: Approved`}>✅</span>;
  }
  return <span className="text-[13px]" title={`${decision.reviewer}: Rejected`}>❌</span>;
}

export const HumanReviewNode: React.FC<NodeProps> = ({ data }) => {
  const reviewData = data as unknown as HumanReviewData;
  const executionState = reviewData?.executionState || 'idle';

  const borderColor =
    executionState === 'executing' ? 'border-blue-500 border-2 animate-pulse' :
    executionState === 'completed' ? 'border-green-500 border-2' :
    executionState === 'error' ? 'border-red-500 border-2' :
    'border';

  const multi = reviewData.multiReview;
  const hasMultiReview = multi?.enabled && (multi.reviewerCount ?? 0) > 0;

  // Build reviewer slots
  const reviewerSlots: React.ReactNode[] = [];
  if (hasMultiReview && multi) {
    const count = multi.reviewerCount;
    const decisions = multi.decisions ?? [];
    for (let i = 0; i < count; i++) {
      reviewerSlots.push(
        <ReviewerSlot key={i} index={i} decision={decisions[i]} />
      );
    }
  }

  const approvalRuleLabel =
    hasMultiReview && multi
      ? formatApprovalRule(multi.approvalRule, multi.reviewerCount)
      : null;

  return (
    <div className={`bg-white/90 backdrop-blur rounded-2xl ${borderColor} shadow-sm min-w-[200px]`}>
      {/* Input handle at top */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{
          left: '50%',
          background: '#10b981',
          width: '12px',
          height: '12px',
          border: '2px solid white',
        }}
      />

      {/* Output handle at bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        style={{
          left: '50%',
          background: '#3b82f6',
          width: '12px',
          height: '12px',
          border: '2px solid white',
        }}
      />

      {/* Header */}
      <div className="px-3 py-2 rounded-t-2xl text-xs font-medium bg-violet-600 text-white flex items-center gap-2">
        <User className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">{reviewData.name || 'Human Review'}</span>
      </div>

      <div className="p-3 space-y-2">
        {/* Multi-review info */}
        {hasMultiReview && multi && (
          <div className="text-[11px] text-gray-600">
            <span className="font-medium">Reviewers: {multi.reviewerCount}</span>
            {approvalRuleLabel && (
              <span className="text-gray-400"> · {approvalRuleLabel}</span>
            )}
          </div>
        )}

        {/* Reviewer decision slots */}
        {reviewerSlots.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {reviewerSlots}
          </div>
        )}

        {/* Single-reviewer pending indicator when no multi-review */}
        {!hasMultiReview && !reviewData.lastDecision && (
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <span>⏳</span>
            <span>Awaiting review</span>
          </div>
        )}

        {/* Final decision badge */}
        {reviewData.lastDecision && (
          <div className={`text-[10px] font-bold px-2 py-0.5 rounded text-center ${
            reviewData.lastDecision === 'approved'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {reviewData.lastDecision === 'approved' ? 'APPROVED' : 'REJECTED'}
          </div>
        )}

        {/* Review mode label */}
        <div className="text-[9px] text-gray-400 capitalize">
          {reviewData.reviewMode === 'edit-and-approve' ? 'Edit & Approve' : 'Approve / Reject'}
        </div>
      </div>
    </div>
  );
};
