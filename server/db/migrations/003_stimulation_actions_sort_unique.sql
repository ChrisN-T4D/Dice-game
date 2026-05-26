-- Recreate stimulation_actions so UNIQUE includes sort_order (allows multiple
-- actions with the same technique + modality on one zone).

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS stimulation_actions;

CREATE TABLE stimulation_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  instruction TEXT NOT NULL,
  technique_id INTEGER NOT NULL REFERENCES techniques(id),
  modality_id INTEGER NOT NULL REFERENCES modality_types(id),
  stimulation TEXT NOT NULL,
  intensity INTEGER NOT NULL DEFAULT 50 CHECK (intensity >= 10 AND intensity <= 100),
  erogenous_weight INTEGER NOT NULL DEFAULT 50 CHECK (erogenous_weight >= 0 AND erogenous_weight <= 100),
  meta TEXT,
  display_name TEXT,
  UNIQUE (zone_id, technique_id, modality_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_stimulation_actions_zone ON stimulation_actions(zone_id);
CREATE INDEX IF NOT EXISTS idx_stimulation_actions_zone_sort ON stimulation_actions(zone_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_stimulation_actions_technique ON stimulation_actions(technique_id);
CREATE INDEX IF NOT EXISTS idx_stimulation_actions_modality ON stimulation_actions(modality_id);
CREATE INDEX IF NOT EXISTS idx_stimulation_actions_erogenous ON stimulation_actions(erogenous_weight);

PRAGMA foreign_keys = ON;
