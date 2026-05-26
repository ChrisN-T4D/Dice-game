-- Zone finger units (FU), contact extent, modality contact pad & placement accuracy

ALTER TABLE zone_topology ADD COLUMN contact_extent TEXT;
ALTER TABLE zone_topology ADD COLUMN typical_contact_fu REAL;
ALTER TABLE zone_topology ADD COLUMN max_contact_fu REAL;

ALTER TABLE modality_types ADD COLUMN contact_pad_fu REAL;
ALTER TABLE modality_types ADD COLUMN placement_accuracy TEXT;
