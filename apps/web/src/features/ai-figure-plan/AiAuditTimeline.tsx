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
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
