-- Immutable provenance for source-bounded FigurePlan assistance. IDs are supplied by the API so
-- this migration has no database-extension dependency.
CREATE TABLE ai_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  request_input_hash TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  model_version TEXT NOT NULL,
  instruction_version TEXT NOT NULL,
  selected_source_hashes JSONB NOT NULL,
  consent_record_id TEXT NOT NULL,
  output_hash TEXT,
  status TEXT NOT NULL CHECK (
    status IN ('proposed', 'abstained', 'refused', 'manual-review-required', 'invalidated')
  ),
  limitation_state TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CHECK (jsonb_typeof(selected_source_hashes) = 'array')
);

CREATE TABLE figure_plan_proposals (
  id TEXT PRIMARY KEY,
  ai_run_id TEXT NOT NULL REFERENCES ai_runs(id) ON DELETE RESTRICT,
  purpose TEXT NOT NULL,
  views JSONB NOT NULL,
  components JSONB NOT NULL,
  signs JSONB NOT NULL,
  open_questions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CHECK (jsonb_typeof(views) = 'array'),
  CHECK (jsonb_typeof(components) = 'array'),
  CHECK (jsonb_typeof(signs) = 'array'),
  CHECK (jsonb_typeof(open_questions) = 'array')
);

CREATE TABLE figure_plan_source_mappings (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES figure_plan_proposals(id) ON DELETE RESTRICT,
  proposal_element_id TEXT NOT NULL,
  source_asset_id TEXT NOT NULL,
  source_asset_hash TEXT NOT NULL,
  location_reference TEXT NOT NULL,
  limitation TEXT,
  UNIQUE (proposal_id, proposal_element_id)
);

CREATE FUNCTION prevent_ai_provenance_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AI provenance is immutable; create an invalidation event instead';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_runs_immutable
  BEFORE UPDATE OR DELETE ON ai_runs
  FOR EACH ROW EXECUTE FUNCTION prevent_ai_provenance_mutation();

CREATE TRIGGER figure_plan_proposals_immutable
  BEFORE UPDATE OR DELETE ON figure_plan_proposals
  FOR EACH ROW EXECUTE FUNCTION prevent_ai_provenance_mutation();

CREATE TRIGGER figure_plan_source_mappings_immutable
  BEFORE UPDATE OR DELETE ON figure_plan_source_mappings
  FOR EACH ROW EXECUTE FUNCTION prevent_ai_provenance_mutation();
