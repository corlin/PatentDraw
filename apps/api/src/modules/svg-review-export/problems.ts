import type { BlockingGate, WorkflowProblem, WorkflowSnapshot } from '@patentdraw/contracts';

export class WorkflowCommandError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
    readonly unmetGates: readonly BlockingGate[] = [],
    readonly current?: WorkflowSnapshot,
  ) {
    super(message);
    this.name = 'WorkflowCommandError';
  }
}

export function toWorkflowProblem(error: WorkflowCommandError, instance?: string): WorkflowProblem {
  const problem: WorkflowProblem = {
    type: `urn:patentdraw:problem:${error.code}`,
    title: error.status === 409 ? 'Workflow command rejected' : 'Workflow request denied',
    status: error.status,
    code: error.code,
    detail: error.message,
  };
  if (instance) problem.instance = instance;
  if (error.unmetGates.length > 0) problem.unmetGates = [...error.unmetGates];
  if (error.current) {
    const current: NonNullable<WorkflowProblem['current']> = {
      workflowVersion: error.current.version,
      state: error.current.state,
    };
    if (error.current.current.revisionId) current.revisionId = error.current.current.revisionId;
    if (error.current.current.ruleRunId) current.ruleRunId = error.current.current.ruleRunId;
    if (error.current.current.candidateId) current.candidateId = error.current.current.candidateId;
    problem.current = current;
  }
  return problem;
}
