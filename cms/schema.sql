-- Évolution CMS + Portail — schéma initial
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cms_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'text',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cms_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_type TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  service TEXT,
  message TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cms_submissions_created_at ON cms_submissions(created_at DESC);

-- Une organisation peut être Évolution PME ou un client.
CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'client' CHECK(type IN ('internal','client')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','invited','disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  organization_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, organization_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS organization_modules (
  organization_id INTEGER NOT NULL,
  module TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  settings TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (organization_id, module),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships(organization_id);

INSERT OR IGNORE INTO organizations (slug,name,type) VALUES ('evolution-pme','Évolution PME','internal');

INSERT OR IGNORE INTO roles (slug,name,description) VALUES
('super_admin','Super administrateur','Accès complet à la plateforme'),
('staff','Équipe Évolution PME','Accès interne selon les permissions'),
('client_admin','Administrateur client','Gestion des modules autorisés de son organisation'),
('client_member','Membre client','Accès limité au portail de son organisation');

INSERT OR IGNORE INTO permissions (slug,name,description) VALUES
('cms.content.view','Voir le contenu CMS','Lecture du contenu administrable'),
('cms.content.edit','Modifier le contenu CMS','Modification des champs autorisés'),
('cms.media.upload','Téléverser des médias','Ajout et remplacement des médias autorisés'),
('submissions.view','Voir les demandes','Lecture des contacts et soumissions'),
('projects.view','Voir les projets','Lecture des projets autorisés'),
('projects.manage','Gérer les projets','Gestion des projets autorisés'),
('quotes.view','Voir les soumissions','Lecture des soumissions commerciales'),
('quotes.approve','Approuver les soumissions','Approbation côté client'),
('users.manage','Gérer les utilisateurs','Gestion des membres de l’organisation'),
('modules.manage','Gérer les modules','Activation des modules de l’organisation');

INSERT OR IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.slug='super_admin';

INSERT OR IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.slug IN ('cms.content.view','cms.content.edit','cms.media.upload','submissions.view','projects.view','projects.manage','quotes.view','users.manage')
WHERE r.slug='staff';

INSERT OR IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.slug IN ('cms.content.view','cms.content.edit','cms.media.upload','projects.view','quotes.view','quotes.approve','users.manage')
WHERE r.slug='client_admin';

INSERT OR IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.slug IN ('projects.view','quotes.view','quotes.approve')
WHERE r.slug='client_member';

INSERT OR IGNORE INTO organization_modules (organization_id,module,enabled)
SELECT id,'cms',1 FROM organizations WHERE slug='evolution-pme';
INSERT OR IGNORE INTO organization_modules (organization_id,module,enabled)
SELECT id,'submissions',1 FROM organizations WHERE slug='evolution-pme';
INSERT OR IGNORE INTO organization_modules (organization_id,module,enabled)
SELECT id,'portal',1 FROM organizations WHERE slug='evolution-pme';
