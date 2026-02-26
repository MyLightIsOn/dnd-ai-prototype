/**
 * Human Review Node Type
 *
 * Pauses workflow execution to allow one or more human reviewers
 * to approve or reject content before proceeding.
 */

export type ApprovalRule =
  | { type: '1-of-n' }
  | { type: 'all-required' }
  | { type: 'm-of-n'; m: number };

export interface ReviewDecision {
  reviewer: string;
  decision: 'approved' | 'rejected';
  timestamp: number;
  notes?: string;
}

export interface MultiReviewConfig {
  enabled: boolean;
  reviewerCount: number;
  approvalRule: ApprovalRule;
  decisions?: ReviewDecision[];
}

export type ReviewMode = 'approve-reject' | 'edit-and-approve';

export interface HumanReviewData {
  name: string;
  instructions?: string;
  reviewMode: ReviewMode;
  multiReview?: MultiReviewConfig;
  lastDecision?: 'approved' | 'rejected';
  executionState?: 'idle' | 'executing' | 'completed' | 'error';
  executionError?: string;
}
