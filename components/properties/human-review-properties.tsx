'use client';

import React from "react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import type { HumanReviewData, ApprovalRule, MultiReviewConfig } from "@/types/human-review";

interface HumanReviewPropertiesProps {
  data: HumanReviewData;
  onChange: (patch: Partial<HumanReviewData>) => void;
}

export function HumanReviewProperties({ data, onChange }: HumanReviewPropertiesProps) {
  const multiReview = data.multiReview ?? {
    enabled: false,
    reviewerCount: 2,
    approvalRule: { type: '1-of-n' } as ApprovalRule,
  };

  const reviewerCount = multiReview.reviewerCount ?? 2;
  const approvalRule = multiReview.approvalRule ?? { type: '1-of-n' };

  const updateMultiReview = (patch: Partial<MultiReviewConfig>) => {
    onChange({ multiReview: { ...multiReview, ...patch } });
  };

  const handleApprovalRuleChange = (ruleType: string) => {
    if (ruleType === '1-of-n') {
      updateMultiReview({ approvalRule: { type: '1-of-n' } });
    } else if (ruleType === 'all-required') {
      updateMultiReview({ approvalRule: { type: 'all-required' } });
    } else if (ruleType === 'm-of-n') {
      updateMultiReview({ approvalRule: { type: 'm-of-n', m: 1 } });
    }
  };

  const handleMChange = (value: number) => {
    const clampedM = Math.max(1, Math.min(reviewerCount, value));
    updateMultiReview({ approvalRule: { type: 'm-of-n', m: clampedM } });
  };

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Instructions</label>
        <Textarea
          rows={3}
          placeholder="What should the reviewer check?"
          value={data.instructions ?? ''}
          onChange={(e) => onChange({ instructions: e.target.value })}
          className="text-sm"
        />
      </div>

      {/* Review Mode */}
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Review Mode</label>
        <select
          className="px-3 py-2 border rounded-md text-sm"
          value={data.reviewMode ?? 'approve-reject'}
          onChange={(e) => onChange({ reviewMode: e.target.value as HumanReviewData['reviewMode'] })}
        >
          <option value="approve-reject">Approve / Reject</option>
          <option value="edit-and-approve">Edit &amp; Approve</option>
        </select>
        <div className="text-[11px] text-gray-500">
          {data.reviewMode === 'edit-and-approve'
            ? 'Reviewer can edit content before approving'
            : 'Reviewer approves or rejects content as-is'}
        </div>
      </div>

      {/* Multi-Reviewer Section */}
      <div className="border rounded-lg p-3 space-y-3">
        <div className="text-xs font-medium text-gray-700">Multi-Reviewer</div>

        {/* Enable toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={multiReview.enabled}
            onChange={(e) => updateMultiReview({ enabled: e.target.checked })}
            className="w-4 h-4 cursor-pointer"
          />
          <span className="text-xs text-gray-600">Enable Multi-Reviewer</span>
        </label>

        {multiReview.enabled && (
          <div className="space-y-3 pt-1">
            {/* Number of Reviewers */}
            <div className="grid gap-2">
              <label className="text-xs text-gray-600">Number of Reviewers</label>
              <Input
                type="number"
                min="2"
                max="10"
                value={reviewerCount}
                onChange={(e) => {
                  const value = Math.max(2, Math.min(10, parseInt(e.target.value) || 2));
                  // Clamp m if the m-of-n rule's m exceeds the new reviewerCount
                  const newMultiReview: Partial<MultiReviewConfig> = { reviewerCount: value };
                  if (approvalRule.type === 'm-of-n' && approvalRule.m > value) {
                    newMultiReview.approvalRule = { type: 'm-of-n', m: value };
                  }
                  updateMultiReview(newMultiReview);
                }}
                className="text-sm"
              />
            </div>

            {/* Approval Rule */}
            <div className="grid gap-2">
              <label className="text-xs text-gray-600">Approval Rule</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="approvalRule"
                    value="1-of-n"
                    checked={approvalRule.type === '1-of-n'}
                    onChange={() => handleApprovalRuleChange('1-of-n')}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm">Any one approval (1-of-N)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="approvalRule"
                    value="all-required"
                    checked={approvalRule.type === 'all-required'}
                    onChange={() => handleApprovalRuleChange('all-required')}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm">All must approve</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="approvalRule"
                    value="m-of-n"
                    checked={approvalRule.type === 'm-of-n'}
                    onChange={() => handleApprovalRuleChange('m-of-n')}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm">At least M of N</span>
                </label>
              </div>
            </div>

            {/* M input for m-of-n */}
            {approvalRule.type === 'm-of-n' && (
              <div className="grid gap-2">
                <label className="text-xs text-gray-600">
                  Required approvals (M) — max {reviewerCount}
                </label>
                <Input
                  type="number"
                  min="1"
                  max={reviewerCount}
                  value={approvalRule.m}
                  onChange={(e) => handleMChange(parseInt(e.target.value) || 1)}
                  className="text-sm"
                />
                {approvalRule.m > reviewerCount && (
                  <div className="text-[11px] text-red-500">
                    M cannot exceed the number of reviewers ({reviewerCount})
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Last Decision display */}
      {data.lastDecision && (
        <div className={`border rounded-lg p-3 text-xs font-medium ${
          data.lastDecision === 'approved'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          Last decision: {data.lastDecision === 'approved' ? 'Approved' : 'Rejected'}
        </div>
      )}
    </div>
  );
}
