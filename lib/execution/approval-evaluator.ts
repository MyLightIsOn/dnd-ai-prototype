import { ApprovalRule, ReviewDecision } from '@/types/human-review';

export function evaluateApprovalRule(
  decisions: ReviewDecision[],
  rule: ApprovalRule,
): 'approved' | 'rejected' {
  const approvals = decisions.filter((d) => d.decision === 'approved').length;
  const rejections = decisions.filter((d) => d.decision === 'rejected').length;

  switch (rule.type) {
    case '1-of-n':
      return approvals >= 1 ? 'approved' : 'rejected';
    case 'all-required':
      return rejections === 0 ? 'approved' : 'rejected';
    case 'm-of-n':
      return approvals >= rule.m ? 'approved' : 'rejected';
    default:
      return 'rejected';
  }
}

export function canDecideEarly(
  decisions: ReviewDecision[],
  rule: ApprovalRule,
  totalReviewers: number,
): boolean {
  const approvals = decisions.filter((d) => d.decision === 'approved').length;
  const rejections = decisions.filter((d) => d.decision === 'rejected').length;
  const remaining = totalReviewers - decisions.length;

  switch (rule.type) {
    case '1-of-n':
      return approvals >= 1;
    case 'all-required':
      return rejections >= 1;
    case 'm-of-n':
      if (approvals >= rule.m) return true;
      if (approvals + remaining < rule.m) return true;
      return false;
    default:
      return false;
  }
}
