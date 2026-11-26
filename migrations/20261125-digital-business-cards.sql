-- Apply to a local or staging CMS_DB first. The branch does not deploy it.
CREATE TABLE IF NOT EXISTS digital_business_cards (
 slug TEXT PRIMARY KEY NOT NULL,
 organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 name TEXT NOT NULL,
 company TEXT NOT NULL DEFAULT '',
 payload TEXT NOT NULL,
 published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_digital_business_cards_org ON digital_business_cards(organization_id,updated_at DESC);
