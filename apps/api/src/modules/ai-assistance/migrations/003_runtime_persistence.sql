ALTER TABLE ai_runs ADD COLUMN retention_expires_at TIMESTAMPTZ;
UPDATE ai_runs SET retention_expires_at = created_at + INTERVAL '30 days'
WHERE retention_expires_at IS NULL;
ALTER TABLE ai_runs ALTER COLUMN retention_expires_at SET NOT NULL;

ALTER TABLE confirmed_figure_plans ADD COLUMN purpose TEXT NOT NULL DEFAULT '';
ALTER TABLE confirmed_figure_plans ADD COLUMN selected_sources JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE figure_plan_proposals ADD COLUMN limitations JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE figure_plan_proposals ADD COLUMN selected_sources JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE ai_audit_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL
);

CREATE TABLE ai_invalidations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  changed_target_id TEXT NOT NULL,
  affected_ai_run_ids JSONB NOT NULL,
  actor_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL
);

CREATE TABLE ai_dependencies (
  project_id TEXT NOT NULL,
  change_kind TEXT NOT NULL CHECK (
    change_kind IN ('source', 'scope', 'figure-plan', 'linked-revision')
  ),
  target_id TEXT NOT NULL,
  ai_run_id TEXT,
  reviewer_decision_id TEXT
);
CREATE UNIQUE INDEX ai_dependencies_run_unique
  ON ai_dependencies (project_id, change_kind, target_id, ai_run_id)
  WHERE ai_run_id IS NOT NULL;
CREATE UNIQUE INDEX ai_dependencies_decision_unique
  ON ai_dependencies (project_id, change_kind, target_id, reviewer_decision_id)
  WHERE reviewer_decision_id IS NOT NULL;

CREATE TABLE draft_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL,
  progress_percent INTEGER NOT NULL CHECK (progress_percent BETWEEN 0 AND 100),
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE canonical_figure_revisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  canonical_svg_hash TEXT NOT NULL,
  sanitized BOOLEAN NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  source_draft_asset_id TEXT
);

CREATE TABLE figure_plan_dispositions (
  proposal_id TEXT NOT NULL REFERENCES figure_plan_proposals(id) ON DELETE RESTRICT,
  proposal_element_id TEXT NOT NULL,
  disposition TEXT NOT NULL CHECK (
    disposition IN ('accepted', 'rejected', 'edited', 'open-question')
  ),
  edited_value TEXT,
  reason TEXT,
  actor_id TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (proposal_id, proposal_element_id),
  CHECK (disposition <> 'edited' OR edited_value IS NOT NULL),
  CHECK (disposition NOT IN ('rejected', 'open-question') OR reason IS NOT NULL)
);

CREATE TRIGGER figure_plan_dispositions_immutable
  BEFORE UPDATE OR DELETE ON figure_plan_dispositions
  FOR EACH ROW EXECUTE FUNCTION prevent_ai_provenance_mutation();

CREATE TABLE ai_retention_events (
  ai_run_id TEXT PRIMARY KEY REFERENCES ai_runs(id) ON DELETE RESTRICT,
  expired_at TIMESTAMPTZ NOT NULL
);
