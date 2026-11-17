-- Migration : Tableau design — notes et image par carte.
-- Appliquer avec :
--   wrangler d1 execute evolution-cms --file=migrations/20261116-design-board-notes-images.sql
-- (ou appliquer cms/schema.sql au complet sur une base neuve, qui contient
-- déjà la nouvelle structure.)
-- Prérequis : migrations/20261116-design-board-cards.sql et
-- migrations/20261117-design-board-soumission.sql déjà appliquées.
-- On reconstruit design_board_cards pour ajouter image_url (SQLite/D1 ne
-- permet pas d'ajouter une colonne avec ALTER TABLE de façon idempotente),
-- en préservant les lignes existantes. Puis on crée design_board_notes.
-- Idempotente : on peut la relancer sans rien perdre (INSERT OR IGNORE,
-- la table est recréée à chaque passage puis renommée).

CREATE TABLE IF NOT EXISTS design_board_cards_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL,
  client TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  order_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Soumission' CHECK(status IN ('Soumission','projet','Non débuté','En impression','En conception','En livraison')),
  position INTEGER NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO design_board_cards_new
  (id, organization_id, client, email, phone, description, order_date, status, position, image_url, created_at, updated_at)
SELECT id, organization_id, client, email, phone, description, order_date, status, position, '', created_at, updated_at
FROM design_board_cards;

DROP TABLE design_board_cards;

ALTER TABLE design_board_cards_new RENAME TO design_board_cards;

CREATE INDEX IF NOT EXISTS idx_design_board_cards_org_status
ON design_board_cards(organization_id,status,position);

CREATE TABLE IF NOT EXISTS design_board_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL,
  organization_id INTEGER NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES design_board_cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_design_board_notes_card
ON design_board_notes(card_id,created_at);
