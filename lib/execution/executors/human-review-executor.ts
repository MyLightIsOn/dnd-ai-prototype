import { registerNodeExecutor } from '../node-executor';
import type { NodeExecutor, NodeExecutionInput, NodeExecutionResult } from '../node-executor';
import type { HumanReviewData, ReviewDecision } from '@/types/human-review';
import { evaluateApprovalRule, canDecideEarly } from '../approval-evaluator';

const humanReviewExecutor: NodeExecutor = {
  type: 'human-review',
  async execute(input: NodeExecutionInput): Promise<NodeExecutionResult> {
    const data = input.nodeData as unknown as HumanReviewData;
    const { context, inputs, nodeId } = input;
    const multi = data.multiReview;

    const reviewInput = inputs.join('\n\n');
    let finalContent = reviewInput;
    let finalDecision: 'approved' | 'rejected' = 'approved';

    if (multi?.enabled) {
      const decisions: ReviewDecision[] = [];

      for (let i = 0; i < multi.reviewerCount; i++) {
        if (context.reviewDecision) {
          context.reviewDecision.current = null;
        }

        context.emitter.emit({
          type: 'review:request',
          nodeId,
          request: {
            reviewerLabel: `Reviewer ${i + 1}`,
            nodeName: data.name,
            instructions: data.instructions,
            content: finalContent,
            mode: data.reviewMode,
          },
        });

        // Poll for decision
        while (context.reviewDecision && context.reviewDecision.current === null) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (context.executionControl.current === 'cancelled') break;
        }

        if (context.executionControl.current === 'cancelled') break;

        const { decision, editedContent } = context.reviewDecision!.current!;
        decisions.push({ reviewer: `Reviewer ${i + 1}`, decision, timestamp: Date.now() });
        if (editedContent) finalContent = editedContent;

        if (canDecideEarly(decisions, multi.approvalRule, multi.reviewerCount)) break;
      }

      if (context.executionControl.current !== 'cancelled') {
        finalDecision = evaluateApprovalRule(decisions, multi.approvalRule);
      }

      const dataPatch: Record<string, unknown> = {
        multiReview: { ...multi, decisions },
        lastDecision: finalDecision,
      };

      // Log to audit trail if not cancelled
      if (context.executionControl.current !== 'cancelled') {
        context.auditLog.log({
          nodeId,
          nodeName: data.name,
          type: 'human-review',
          decision: finalDecision,
          beforeContent: reviewInput.slice(0, 2000),
          afterContent: finalContent !== reviewInput ? finalContent.slice(0, 2000) : undefined,
          reviewer: `Multiple (${multi.reviewerCount ?? 1} reviewer(s))`,
          metadata: {
            reviewMode: data.reviewMode,
            multiReview: true,
          },
        });
      }

      if (finalDecision === 'rejected') {
        throw new Error('Content rejected by reviewer');
      }

      context.emitter.emit({
        type: 'log:append',
        message: `👤 ${data.name || 'Human Review'}: ${finalDecision}`,
      });

      return { output: finalContent, dataPatch };
    } else {
      // Single reviewer
      if (context.reviewDecision) {
        context.reviewDecision.current = null;
      }

      context.emitter.emit({
        type: 'review:request',
        nodeId,
        request: {
          reviewerLabel: 'Reviewer',
          nodeName: data.name,
          instructions: data.instructions,
          content: reviewInput,
          mode: data.reviewMode,
        },
      });

      while (context.reviewDecision && context.reviewDecision.current === null) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (context.executionControl.current === 'cancelled') break;
      }

      const dataPatch: Record<string, unknown> = {};

      if (context.executionControl.current !== 'cancelled' && context.reviewDecision?.current !== null) {
        const { decision, editedContent } = context.reviewDecision!.current!;
        if (editedContent) finalContent = editedContent;
        finalDecision = decision;
        dataPatch.lastDecision = finalDecision;
      }

      // Log to audit trail if not cancelled
      if (context.executionControl.current !== 'cancelled') {
        context.auditLog.log({
          nodeId,
          nodeName: data.name,
          type: 'human-review',
          decision: finalDecision,
          beforeContent: reviewInput.slice(0, 2000),
          afterContent: finalContent !== reviewInput ? finalContent.slice(0, 2000) : undefined,
          reviewer: 'Reviewer',
          metadata: {
            reviewMode: data.reviewMode,
            multiReview: false,
          },
        });
      }

      if (finalDecision === 'rejected') {
        throw new Error('Content rejected by reviewer');
      }

      context.emitter.emit({
        type: 'log:append',
        message: `👤 ${data.name || 'Human Review'}: ${finalDecision}`,
      });

      return { output: finalContent, dataPatch };
    }
  },
};

registerNodeExecutor(humanReviewExecutor);
