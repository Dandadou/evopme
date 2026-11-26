# Cartes numériques dans Évolution ADMIN

La section est à `/admin/?page=cartes-numeriques`. Elle utilise la permission CMS existante `cms.content.edit`. « Essayer la démo » remplit un exemple fictif sans rien enregistrer. Téléverser au besoin le recto, le verso et un logo (PNG, JPG ou WebP). Le navigateur réduit les images avant l’enregistrement; les faces complètes gardent leur composition et ne sont pas recadrées.

Ajoute une ou plusieurs zones cliquables sur le recto ou le verso : choisis leur destination, place-les sur l’image ou rends toute une face cliquable. Glisse les zones directement sur l’image, ou utilise Tab et les touches fléchées. Le bouton de rotation reste accessible séparément. Les contours de repérage restent dans l’admin. Tu peux aussi masquer l’en-tête et/ou les boutons de contact pour ne pas répéter ce qui est imprimé.

L’éditeur permet aussi d’ajouter du texte, une icône ou un bouton sur la face affichée. Les blocs visibles ont une taille, une couleur et un alignement. Le texte et les icônes peuvent avoir un lien facultatif; les boutons et les zones invisibles en exigent un. Sans image, coche le fond vierge d’une face pour partir de zéro. Les anciens brouillons et liens invisibles restent compatibles.

La première sauvegarde est toujours un brouillon. « Publier la carte » rend le lien `/carte/identifiant` accessible à toute personne qui le possède, sans connexion. Ne publier que des visuels et coordonnées prévus pour le public. « Retirer du public » rend le même lien inaccessible sans effacer la carte. Le lien et le QR restent identiques après modification. Imprimer le QR seulement après avoir testé l’URL finale sur le bon domaine.

Dans la préversion de la branche, « Enregistrer le brouillon de test » conserve une seule carte dans ce navigateur. Elle ne part pas au serveur et ne peut pas être publiée. « Voir comme un visiteur » affiche la carte sans les contours des zones, avec les vrais liens.

## Mise en service

- Vérifier la branche sur un environnement Cloudflare séparé avec une base CMS de test et la politique Access correspondante. Appliquer `migrations/20261125-digital-business-cards.sql` à cette base. Le module n’exige pas de nouveau secret ni de service QR externe.
- Tester la démo et ses deux faces, puis la création, l’ouverture du lien sans connexion, le fichier contact et le retrait du public.
- Sur autorisation de publier, appliquer la migration additive à la base CMS de production, puis déployer la branche validée. Ni migration distante ni déploiement ne sont lancés par le module.
- Tests locaux : `node --test tests/digital-cards.test.mjs` (Node 22.13 ou plus récent).

« Partir d’un modèle » propose Minimal clair, Graphite et Signature. Choisis le modèle après avoir rempli les coordonnées pour générer les boutons de contact. Le nom, l’entreprise et la fonction restent liés aux champs tant que leur texte n’est pas remplacé dans l’élément. Une image déjà importée et ses éléments sont conservés.

« Liens rapides » place un lien Facebook, LinkedIn, Instagram, de rendez-vous, d’itinéraire ou un autre lien web sur la face affichée. Choisis entre icône, bouton et zone invisible, puis repositionne l’élément. Le lien invisible ne montre pas de texte ni de cadre dans la vue visiteur.

Le format horizontal (7:4), vertical (4:7) ou carré (1:1) et les coins droits ou arrondis sont indépendants. Les images importées restent entières si leurs proportions diffèrent, et les zones restent positionnées en pourcentages de la face.

Pour ajuster un lien invisible à une ligne imprimée, tire sa poignée dans le coin inférieur droit ou entre sa largeur et sa hauteur en pourcentages (minimum 3 %). Vérifie les petits liens sur téléphone avant de publier; la poignée n’apparaît jamais pour les visiteurs.

Dans un élément, choisis Site web, Courriel ou Téléphone, puis saisis seulement l’adresse ou le numéro. Le préfixe apparaît à côté du champ. Un lien complet déjà écrit avec son préfixe reste accepté.

Sous la carte, la vue visiteur affiche un petit rappel seulement lorsque la face courante contient un lien cliquable. Aucun repère n’est superposé au visuel.

L’habillage Archétype (logo et fond de la vitrine) s’affiche autour de la carte dans « Voir comme un visiteur » et sur la page client. L’administration et le recto-verso importé restent inchangés.
