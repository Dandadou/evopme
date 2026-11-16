-- Migration : Tableau design — suivi des commandes clients (Kanban).
-- Appliquer avec :
--   wrangler d1 execute evolution-cms --file=migrations/20261116-design-board-cards.sql
-- (ou appliquer cms/schema.sql au complet, qui contient la même table.)
-- Idempotente : CREATE TABLE / CREATE INDEX IF NOT EXISTS.
-- Sans cette table, le panneau « Tableau design » de l'admin affiche un
-- message clair au lieu de casser (la route renvoie 503 migration_required).

CREATE TABLE IF NOT EXISTS design_board_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL,
  client TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  order_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'projet' CHECK(status IN ('projet','Non débuté','En impression','En conception','En livraison')),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_design_board_cards_org_status
ON design_board_cards(organization_id,status,position);
