-- Anatomy matrix schema (SQLite)
-- Run via scripts/db-migrate.mjs

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sensitivity_levels (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scale_values (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS techniques (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS regions (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sub_regions (
  id TEXT PRIMARY KEY,
  region_id TEXT NOT NULL REFERENCES regions(id),
  display_name TEXT NOT NULL,
  definition TEXT
);

CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  parent_id TEXT REFERENCES zones(id),
  region_id TEXT NOT NULL REFERENCES regions(id),
  sub_region_id TEXT REFERENCES sub_regions(id),
  sensitivity_level_id INTEGER NOT NULL REFERENCES sensitivity_levels(id),
  sensitivity_score INTEGER NOT NULL DEFAULT 50 CHECK (sensitivity_score >= 0 AND sensitivity_score <= 100),
  body_region_type TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS zone_orientations (
  zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  orientation TEXT NOT NULL CHECK (orientation IN ('male', 'female')),
  PRIMARY KEY (zone_id, orientation)
);

CREATE TABLE IF NOT EXISTS zone_topology (
  zone_id TEXT PRIMARY KEY REFERENCES zones(id) ON DELETE CASCADE,
  surface_area TEXT,
  curvature TEXT,
  flexibility TEXT,
  depth TEXT,
  shape TEXT
);

CREATE TABLE IF NOT EXISTS zone_stimulation (
  zone_id TEXT PRIMARY KEY REFERENCES zones(id) ON DELETE CASCADE,
  erogenous_priority INTEGER NOT NULL DEFAULT 50,
  sensitivity_to_pressure TEXT,
  sensitivity_to_friction TEXT,
  sensitivity_to_teeth TEXT,
  sensitivity_to_mouth TEXT,
  sensitivity_to_hand TEXT
);

CREATE TABLE IF NOT EXISTS zone_stimulation_techniques (
  zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  technique_id INTEGER NOT NULL REFERENCES techniques(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (zone_id, technique_id)
);

CREATE TABLE IF NOT EXISTS zone_musculoskeletal (
  zone_id TEXT PRIMARY KEY REFERENCES zones(id) ON DELETE CASCADE,
  muscle_massagability TEXT,
  muscle_tension_level TEXT,
  skin_texture TEXT,
  fat_density TEXT,
  bone_proximity TEXT,
  skin_thickness TEXT
);

CREATE TABLE IF NOT EXISTS zone_tickle (
  zone_id TEXT PRIMARY KEY REFERENCES zones(id) ON DELETE CASCADE,
  tickle_sensitivity TEXT,
  tickle_preference TEXT,
  tickle_zone_type TEXT,
  tickle_texture TEXT,
  tickle_response TEXT
);

CREATE TABLE IF NOT EXISTS positions (
  position_number INTEGER PRIMARY KEY CHECK (position_number >= 1 AND position_number <= 999),
  intensity TEXT,
  anal INTEGER NOT NULL DEFAULT 0,
  focus_code TEXT,
  group_code TEXT,
  group_display TEXT,
  variation_label TEXT
);

CREATE TABLE IF NOT EXISTS position_zones (
  position_number INTEGER NOT NULL REFERENCES positions(position_number) ON DELETE CASCADE,
  zone_id TEXT NOT NULL REFERENCES zones(id),
  role TEXT NOT NULL DEFAULT 'primary',
  PRIMARY KEY (position_number, zone_id, role)
);

CREATE TABLE IF NOT EXISTS phase12_location_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phase INTEGER NOT NULL CHECK (phase IN (1, 2)),
  roll_label TEXT NOT NULL,
  zone_id TEXT NOT NULL REFERENCES zones(id),
  UNIQUE (phase, roll_label, zone_id)
);

CREATE INDEX IF NOT EXISTS idx_zones_region ON zones(region_id);
CREATE INDEX IF NOT EXISTS idx_zones_parent ON zones(parent_id);
CREATE INDEX IF NOT EXISTS idx_zone_orientations_orientation ON zone_orientations(orientation, zone_id);
CREATE INDEX IF NOT EXISTS idx_position_zones_zone ON position_zones(zone_id);
