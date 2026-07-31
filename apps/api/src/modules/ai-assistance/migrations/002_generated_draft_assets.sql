CREATE TABLE confirmed_figure_plans (
  id TEXT PRIMARY KEY REFERENCES figure_plan_proposals(id) ON DELETE RESTRICT,
  project_id TEXT NOT NULL,
  confirmed_by_actor_id TEXT NOT NULL,
  confirmed_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE generated_draft_assets (
  id TEXT PRIMARY KEY,
  ai_run_id TEXT NOT NULL REFERENCES ai_runs(id) ON DELETE RESTRICT,
  confirmed_plan_id TEXT NOT NULL REFERENCES confirmed_figure_plans(id) ON DELETE RESTRICT,
  blob_hash TEXT NOT NULL,
  limitation_label TEXT NOT NULL CHECK (limitation_label = 'non-authoritative-ai-draft'),
  selection_state TEXT NOT NULL CHECK (selection_state IN ('unselected', 'selected', 'rejected')),
  export_eligible BOOLEAN NOT NULL DEFAULT FALSE CHECK (export_eligible = FALSE),
  independent_figure_revision_id TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
