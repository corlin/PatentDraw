import type {
  AuthorisedSource,
  ConsentRecord,
  ProjectRelationship,
  ProjectRole,
} from '@patentdraw/contracts';

export interface ProjectContext {
  projectId: string;
  actorId: string;
  activeRole: ProjectRole;
  roles: readonly ProjectRole[];
  relationships: readonly ProjectRelationship[];
  authorisedSources: readonly SourceAuthority[];
}

export interface SourceAuthority extends AuthorisedSource {
  aiUseAuthorised: boolean;
  revokedAt?: string;
}

export class SourceAuthorisationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceAuthorisationError';
  }
}

const AI_REQUESTER_ROLES: readonly ProjectRole[] = ['drafter', 'attorney-agent', 'administrator'];

export function assertAuthorisedSourceSelection(input: {
  context: ProjectContext;
  selectedSources: readonly AuthorisedSource[];
  consent: ConsentRecord;
}): void {
  if (!input.context.roles.some((role) => AI_REQUESTER_ROLES.includes(role))) {
    throw new SourceAuthorisationError(
      'The actor does not have a role permitted to request AI assistance.',
    );
  }

  if (!input.consent.allowsProviderProcessing || input.consent.allowsTraining) {
    throw new SourceAuthorisationError(
      'Recorded consent must allow provider processing and forbid training use.',
    );
  }

  if (input.selectedSources.length === 0) {
    throw new SourceAuthorisationError('At least one authorised source must be selected.');
  }

  const selectedIds = new Set<string>();
  for (const selected of input.selectedSources) {
    if (selectedIds.has(selected.id)) {
      throw new SourceAuthorisationError('A source may be selected only once.');
    }
    selectedIds.add(selected.id);

    const authority = input.context.authorisedSources.find((source) => source.id === selected.id);
    if (
      !authority ||
      authority.contentHash !== selected.contentHash ||
      !authority.aiUseAuthorised ||
      authority.revokedAt
    ) {
      throw new SourceAuthorisationError(
        `Source ${selected.id} is not authorised for this AI request.`,
      );
    }
  }
}
