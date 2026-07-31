import type {
  AuthorisedSource,
  FigurePlanProposal,
  FigurePlanRequest,
  FigurePlanResult,
} from '@patentdraw/contracts';

const FORBIDDEN_ASSERTION =
  /\b(technically correct|claim coverage|legal sufficien|rule pass|filing[- ]ready|submission|office acceptance)\b/i;

const MAX_REQUEST_BYTES = 16_384;
const MAX_SELECTED_SOURCES = 8;
const MAX_SCOPE_ITEMS = 20;

export function assertFigurePlanRequestSecurity(request: FigurePlanRequest): void {
  if (request.selectedSources.length > MAX_SELECTED_SOURCES) {
    throw new Error(
      `AI assistance supports at most ${MAX_SELECTED_SOURCES} selected sources per request.`,
    );
  }
  if (
    request.allowedScope.length > MAX_SCOPE_ITEMS ||
    request.allowedScope.some((item) => item.length > 160)
  ) {
    throw new Error('The requested source scope exceeds the permitted bounded assistance scope.');
  }
  if (Buffer.byteLength(JSON.stringify(request), 'utf8') > MAX_REQUEST_BYTES) {
    throw new Error('The AI assistance request exceeds the permitted size.');
  }
}

export function enforceFigurePlanPolicy(
  result: FigurePlanResult,
  selectedSources: readonly AuthorisedSource[],
): FigurePlanResult {
  if (result.status !== 'proposed') {
    return result;
  }

  const proposal = result.proposal;
  const forbiddenText = collectProposalText(proposal).find((value) =>
    FORBIDDEN_ASSERTION.test(value),
  );
  if (forbiddenText) {
    return manualReview(`Provider output contains a prohibited assertion: ${forbiddenText}`);
  }

  const selectedById = new Map(selectedSources.map((source) => [source.id, source.contentHash]));
  for (const mapping of proposal.sourceMappings) {
    if (selectedById.get(mapping.sourceAssetId) !== mapping.sourceAssetHash) {
      return manualReview(
        `Mapping ${mapping.proposalElementId} does not reference a selected source.`,
      );
    }
  }

  const mappedElements = new Set(
    proposal.sourceMappings.map((mapping) => mapping.proposalElementId),
  );
  const unmapped = factualElements(proposal).find((element) => !mappedElements.has(element));
  if (unmapped) {
    return manualReview(`Proposed element ${unmapped} has no selected-source mapping.`);
  }

  return result;
}

function factualElements(proposal: FigurePlanProposal): readonly string[] {
  return [...proposal.views, ...proposal.components, ...proposal.signs];
}

function collectProposalText(proposal: FigurePlanProposal): readonly string[] {
  return [
    proposal.purpose,
    ...proposal.views,
    ...proposal.components,
    ...proposal.signs,
    ...proposal.openQuestions,
    ...proposal.sourceMappings.flatMap((mapping) => [
      mapping.locationReference,
      mapping.limitation ?? '',
    ]),
  ];
}

function manualReview(reason: string): FigurePlanResult {
  return { status: 'manual-review-required', reason };
}
