# Cartes numériques dans Évolution ADMIN

La section est à `/admin/?page=cartes-numeriques`. Elle utilise la permission CMS existante `cms.content.edit`. « Essayer la démo » remplit un exemple fictif sans rien enregistrer. Téléverser au besoin le recto, le verso et un logo (PNG, JPG ou WebP). Le navigateur réduit les images avant l’enregistrement; les faces complètes gardent leur composition et ne sont pas recadrées.

Ajoute une ou plusieurs zones cliquables sur le recto ou le verso : choisis leur destination, place-les sur l’image ou rends toute une face cliquable. Le bouton de rotation reste accessible séparément. Les contours de repérage restent dans l’admin. Tu peux aussi masquer l’en-tête et/ou les boutons de contact pour ne pas répéter ce qui est imprimé.

La première sauvegarde est toujours un brouillon. « Publier la carte » rend le lien `/carte/identifiant` accessible à toute personne qui le possède, sans connexion. Ne publier que des visuels et coordonnées prévus pour le public. « Retirer du public » rend le même lien inaccessible sans effacer la carte. Le lien et le QR restent identiques après modification. Imprimer le QR seulement après avoir testé l’URL finale sur le bon domaine.

## Mise en service

- Vérifier la branche sur un environnement Cloudflare séparé avec une base CMS de test et la politique Access correspondante. Appliquer `migrations/20261125-digital-business-cards.sql` à cette base. Le module n’exige pas de nouveau secret ni de service QR externe.
- Tester la démo et ses deux faces, puis la création, l’ouverture du lien sans connexion, le fichier contact et le retrait du public.
- Sur autorisation de publier, appliquer la migration additive à la base CMS de production, puis déployer la branche validée. Ni migration distante ni déploiement ne sont lancés par le module.
- Tests locaux : `node --test tests/digital-cards.test.mjs` (Node 22.13 ou plus récent).
