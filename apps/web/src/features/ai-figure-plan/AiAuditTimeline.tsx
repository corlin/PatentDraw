import type { AiAuditEvent } from '@patentdraw/contracts';

export function AiAuditTimeline({ events }: { events: readonly AiAuditEvent[] }) {
  return (
    <section aria-labelledby="ai-audit-heading">
      <h2 id="ai-audit-heading">AI provenance and invalidation timeline</h2>
      {events.length === 0 ? (
        <p>No AI audit events are available for this project.</p>
      ) : (
        <ol>
          {events.map((event) => (
            <li key={event.id}>
              <strong>{event.eventType}</strong> — {event.reason}
              <br />
              Actor: {event.actorId}; time: {event.occurredAt}; targets:{' '}
              {event.targetIds.join(', ')}
              {event.provenance ? (
                <dl>
                  <dt>Provider and model</dt>
                  <dd>
                    {event.provenance.provider} / {event.provenance.model} /{' '}
                    {event.provenance.modelVersion}
                  </dd>
                  <dt>Instruction</dt>
                  <dd>{event.provenance.instructionVersion}</dd>
                  <dt>Selected source hashes</dt>
                  <dd>{event.provenance.selectedSourceHashes.join(', ')}</dd>
                  <dt>Consent</dt>
                  <dd>{event.provenance.consentRecordId}</dd>
                  <dt>Input and output hashes</dt>
                  <dd>
                    {event.provenance.requestInputHash} / {event.provenance.outputHash}
                  </dd>
                  <dt>Limitations</dt>
                  <dd>{event.provenance.limitationState}</dd>
                  <dt>Retention expiry</dt>
                  <dd>{event.provenance.retentionExpiresAt}</dd>
                </dl>
              ) : (
                <p>Non-model event: run provenance is not applicable.</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
