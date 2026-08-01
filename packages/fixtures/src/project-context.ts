import type { ProjectRelationship, ProjectRole } from '@patentdraw/contracts';

export interface ProjectContextFixture {
  projectId: string;
  actorId: string;
  activeRole: ProjectRole;
  roles: readonly ProjectRole[];
  relationships: readonly ProjectRelationship[];
  authorisedSources: readonly {
    id: string;
    contentHash: string;
    aiUseAuthorised: boolean;
    revokedAt?: string;
  }[];
}

export const authorisedProjectContext: ProjectContextFixture = {
  projectId: 'project-fixture-pump',
  actorId: 'drafter-fixture-01',
  activeRole: 'drafter',
  roles: ['drafter'],
  relationships: ['inventor', 'contributor'],
  authorisedSources: [
    {
      id: 'source-fixture-disclosure-01',
      contentHash: 'sha256:fixture-disclosure-01',
      aiUseAuthorised: true,
    },
  ],
};

export const unauthorisedProjectContext: ProjectContextFixture = {
  ...authorisedProjectContext,
  authorisedSources: [
    {
      id: 'source-fixture-without-consent',
      contentHash: 'sha256:fixture-without-consent',
      aiUseAuthorised: false,
    },
  ],
};
