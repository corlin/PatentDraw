-- Authoritative, append-only evidence for the SVG review and export workflow.
CREATE TABLE svg_projects (
  id TEXT PRIMARY KEY
);

CREATE TABLE svg_figures (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES svg_projects(id) ON DELETE RESTRICT,
  UNIQUE (project_id, id)
);

CREATE TABLE svg_sanitization_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  figure_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (project_id, figure_id) REFERENCES svg_figures(project_id, id) ON DELETE RESTRICT
);

CREATE TABLE svg_figure_revisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  figure_id TEXT NOT NULL,
  parent_revision_id TEXT REFERENCES svg_figure_revisions(id) ON DELETE RESTRICT,
  sanitization_run_id TEXT NOT NULL REFERENCES svg_sanitization_runs(id) ON DELETE RESTRICT,
  revision_fingerprint TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (project_id, figure_id) REFERENCES svg_figures(project_id, id) ON DELETE RESTRICT
);

CREATE TABLE svg_rule_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  figure_id TEXT NOT NULL,
  revision_id TEXT NOT NULL REFERENCES svg_figure_revisions(id) ON DELETE RESTRICT,
  input_fingerprint TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (project_id, figure_id) REFERENCES svg_figures(project_id, id) ON DELETE RESTRICT
);

CREATE TABLE svg_export_candidates (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  figure_id TEXT NOT NULL,
  revision_id TEXT NOT NULL REFERENCES svg_figure_revisions(id) ON DELETE RESTRICT,
  rule_run_id TEXT NOT NULL REFERENCES svg_rule_runs(id) ON DELETE RESTRICT,
  candidate_fingerprint TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (project_id, figure_id) REFERENCES svg_figures(project_id, id) ON DELETE RESTRICT
);

CREATE TABLE svg_technical_review_decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES svg_projects(id) ON DELETE RESTRICT,
  candidate_id TEXT NOT NULL REFERENCES svg_export_candidates(id) ON DELETE RESTRICT,
  payload JSONB NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE svg_attorney_approval_decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES svg_projects(id) ON DELETE RESTRICT,
  candidate_id TEXT NOT NULL REFERENCES svg_export_candidates(id) ON DELETE RESTRICT,
  technical_decision_id TEXT NOT NULL REFERENCES svg_technical_review_decisions(id) ON DELETE RESTRICT,
  payload JSONB NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE svg_workflow_invalidations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  figure_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (project_id, figure_id) REFERENCES svg_figures(project_id, id) ON DELETE RESTRICT
);

CREATE TABLE svg_cnipa_efiling_evidence (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES svg_projects(id) ON DELETE RESTRICT,
  payload JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE svg_export_packages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  figure_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL REFERENCES svg_export_candidates(id) ON DELETE RESTRICT,
  attorney_decision_id TEXT NOT NULL REFERENCES svg_attorney_approval_decisions(id) ON DELETE RESTRICT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (project_id, figure_id) REFERENCES svg_figures(project_id, id) ON DELETE RESTRICT
);

CREATE TABLE svg_export_package_supersessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  figure_id TEXT NOT NULL,
  superseded_package_id TEXT NOT NULL REFERENCES svg_export_packages(id) ON DELETE RESTRICT,
  replacement_package_id TEXT NOT NULL REFERENCES svg_export_packages(id) ON DELETE RESTRICT,
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (project_id, figure_id) REFERENCES svg_figures(project_id, id) ON DELETE RESTRICT,
  CHECK (superseded_package_id <> replacement_package_id)
);

CREATE TABLE svg_workflow_audit_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES svg_projects(id) ON DELETE RESTRICT,
  figure_id TEXT,
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL
);

-- The projection is the only mutable workflow table. Version implements optimistic concurrency;
-- adapters must lock this row while selecting or replacing the current export candidate.
CREATE TABLE svg_workflow_projections (
  project_id TEXT NOT NULL,
  figure_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 0),
  current_revision_id TEXT REFERENCES svg_figure_revisions(id) ON DELETE RESTRICT,
  current_rule_run_id TEXT REFERENCES svg_rule_runs(id) ON DELETE RESTRICT,
  current_candidate_id TEXT REFERENCES svg_export_candidates(id) ON DELETE RESTRICT,
  current_technical_decision_id TEXT REFERENCES svg_technical_review_decisions(id) ON DELETE RESTRICT,
  current_attorney_decision_id TEXT REFERENCES svg_attorney_approval_decisions(id) ON DELETE RESTRICT,
  current_export_package_id TEXT REFERENCES svg_export_packages(id) ON DELETE RESTRICT,
  current_invalidation_id TEXT REFERENCES svg_workflow_invalidations(id) ON DELETE RESTRICT,
  PRIMARY KEY (project_id, figure_id),
  FOREIGN KEY (project_id, figure_id) REFERENCES svg_figures(project_id, id) ON DELETE RESTRICT
);

CREATE TABLE svg_idempotency_keys (
  project_id TEXT NOT NULL REFERENCES svg_projects(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (project_id, idempotency_key)
);

CREATE FUNCTION prevent_svg_workflow_evidence_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'SVG workflow evidence is append-only; create a supersession or invalidation';
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  evidence_table TEXT;
BEGIN
  FOREACH evidence_table IN ARRAY ARRAY[
    'svg_sanitization_runs', 'svg_figure_revisions', 'svg_rule_runs',
    'svg_export_candidates', 'svg_technical_review_decisions',
    'svg_attorney_approval_decisions', 'svg_workflow_invalidations',
    'svg_cnipa_efiling_evidence', 'svg_export_packages',
    'svg_export_package_supersessions', 'svg_workflow_audit_events'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_immutable BEFORE UPDATE OR DELETE ON %I '
      'FOR EACH ROW EXECUTE FUNCTION prevent_svg_workflow_evidence_mutation()',
      evidence_table,
      evidence_table
    );
  END LOOP;
END;
$$;
