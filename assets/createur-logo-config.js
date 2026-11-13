/* ============================================================================
 * Créateur de logo psychologique — Évolution PME
 * Fichier de configuration éditable. C'est CE fichier que la page Admin
 * (admin/createur-logo.html) permet de modifier, sans toucher au code.
 *
 * RÈGLE LOI 25 — AUCUNE CONSERVATION (courriel seulement) :
 * Ce fichier ne contient aucune donnée client. Le parcours du créateur est
 * 100 % local dans le navigateur du visiteur : aucune réponse, aucune
 * analyse et aucun lead ne sont envoyés ni conservés sur un serveur, pas
 * de base D1, pas de liste de leads. La seule transmission possible, c'est
 * le courriel vers info@evolutionpme.ca quand le client clique lui-même
 * « Fais-le peaufiner par un pro » (mailto, résumé en corps de courriel).
 * SEULE EXCEPTION, avec consentement explicite : garder le lead dans le CMS.
 * Si le client coche la case (décochée par défaut, jamais obligatoire),
 * le minimum utile est gardé dans le CMS (table cms_submissions, D1) :
 * nom de l'entreprise, courriel, archétype principal, date, et la mention
 * « Consentement : oui, le [date], source : Créateur de logo ».
 * Il n'y a PAS de liste de diffusion : Évolution PME n'en a pas.
 * Si la case n'est pas cochée, rien n'est gardé, courriel seulement.
 * Ne pas ajouter ici d'autre stockage sans un nouveau go explicite
 * de Daniel et une mise à jour de la politique de confidentialité.
 *
 * HONNÊTETÉ SCIENTIFIQUE (recherche du 13 novembre 2026) :
 * Les 12 archétypes sont le vocabulaire de Pearson (1991) et de Mark et
 * Pearson (2001), inspiré de Jung — pas un diagnostic de personnalité.
 * Le modèle mesuré est celui d'Aaker (1997), 5 dimensions. La couleur la
 * plus fiable, ce n'est pas la teinte seule, c'est la congruence, la
 * saturation et la luminosité. Les scores affichés sont des pistes de
 * travail à valider, jamais des vérités.
 * ========================================================================== */
window.EVOPME_LOGO_CONFIG = {
  enabled: true,
  contactEmail: "info@evolutionpme.ca",
  siteUrl: "https://evolutionpme.ca",

  conservation: {
    texte: "J'accepte qu'Évolution PME garde mes infos dans son CMS, au cas où, pour pouvoir me recontacter. Je peux demander la suppression en tout temps.",
    note: "Si cochée, le lead est gardé dans le CMS (table des soumissions, visible dans l'Admin). Si non cochée, rien n'est gardé. Pas de liste de diffusion : Évolution PME n'en a pas.",
    labelCourriel: "Ton courriel (seulement si tu coches la case ci-dessus)"
  },

  textes: {
    titre: "Créateur de logo psychologique",
    sousTitre: "Réponds à quelques questions, on te propose un logo qui raconte ta marque. Gratuit, sans compte, sans envoi de tes réponses.",
    avertissement: "Ton logo raconte une histoire, il ne te diagnostique pas. Les archétypes sont un vocabulaire pour aligner ton équipe, pas une mesure scientifique. Valide toujours le résultat auprès de vrais clients.",
    loi25: "Loi 25 : tes réponses restent dans ton navigateur. Rien n'est conservé sur nos serveurs. La seule chose qui part, c'est le courriel que TU choisis d'envoyer à info@evolutionpme.ca. Seule exception : si tu coches la case pour garder tes infos, ton entreprise, ton courriel et ton archétype sont gardés dans notre CMS, pour qu'on puisse te recontacter au cas où."
  },

  secteurs: [
    { id: "restauration", label: "Restauration et alimentation", exemple: "Ex. : un resto de quartier qui veut avoir l'air chaleureux." },
    { id: "construction", label: "Construction et rénovation", exemple: "Ex. : un entrepreneur qui veut inspirer confiance." },
    { id: "mecanique", label: "Mécanique et carrosserie", exemple: "Ex. : un garage de famille, fiable et direct." },
    { id: "sante", label: "Santé et bien-être", exemple: "Ex. : une clinique, un masso, une physio." },
    { id: "beaute", label: "Beauté et soins", exemple: "Ex. : un salon de coiffure, de l'esthétique." },
    { id: "services-pro", label: "Services professionnels", exemple: "Ex. : comptable, notaire, consultant." },
    { id: "immobilier", label: "Immobilier", exemple: "Ex. : courtier, gestion locative." },
    { id: "detail", label: "Commerce de détail", exemple: "Ex. : une boutique de quartier." },
    { id: "mode", label: "Mode et vêtements", exemple: "Ex. : une marque locale, des vêtements corporatifs." },
    { id: "agro", label: "Agriculture et agroalimentaire", exemple: "Ex. : une ferme, des produits du terroir." },
    { id: "education", label: "Éducation et formation", exemple: "Ex. : une école, un formateur indépendant." },
    { id: "arts", label: "Arts, culture et divertissement", exemple: "Ex. : un artiste, une salle de spectacle." },
    { id: "techno", label: "Technologie et numérique", exemple: "Ex. : une startup, un développeur." },
    { id: "finance", label: "Finance et assurance", exemple: "Ex. : un conseiller, un courtier." },
    { id: "tourisme", label: "Hôtellerie et tourisme", exemple: "Ex. : un gîte, une auberge." },
    { id: "domicile", label: "Services à domicile", exemple: "Ex. : ménage, entretien, paysagement." },
    { id: "animaux", label: "Animaux", exemple: "Ex. : toilettage, pension, vétérinaire." },
    { id: "sport", label: "Sport et plein air", exemple: "Ex. : un gym, un coach, du plein air." },
    { id: "evenementiel", label: "Événementiel", exemple: "Ex. : mariages, DJ, organisation d'événements." },
    { id: "obnl", label: "Organismes et OBNL", exemple: "Ex. : une fondation, une coopérative." },
    { id: "transport", label: "Transport et logistique", exemple: "Ex. : camionnage, livraison." },
    { id: "autre", label: "Autre", exemple: "Ex. : ton secteur n'est pas dans la liste, décris-le." }
  ],

  clientele: ["Particuliers", "Entreprises", "Les deux"],
  typesLogo: [
    { id: "symbole", label: "Symbole", description: "Un dessin + le nom de ton entreprise." },
    { id: "texte", label: "Texte seulement", description: "Juste le nom, avec une police qui a du caractère." },
    { id: "monogramme", label: "Monogramme", description: "Tes initiales, comme les blasons d'époque." }
  ],
  styles: [
    { id: "retro", label: "Rétro", boost: ["innocent", "homme-ordinaire"] },
    { id: "moderne", label: "Moderne", boost: ["createur", "explorateur"] },
    { id: "futuriste", label: "Futuriste", boost: ["magicien", "explorateur"] },
    { id: "avant-garde", label: "Avant-garde", boost: ["rebelle", "createur"] },
    { id: "classique", label: "Classique", boost: ["souverain", "sage"] },
    { id: "minimaliste", label: "Minimaliste", boost: ["innocent", "sage"] },
    { id: "art-deco", label: "Art déco", boost: ["souverain", "amoureux"] },
    { id: "boheme", label: "Bohème", boost: ["explorateur", "amoureux"] },
    { id: "industriel", label: "Industriel", boost: ["heros", "homme-ordinaire"] },
    { id: "ludique", label: "Ludique", boost: ["bouffon", "amoureux"] },
    { id: "autre", label: "Autre", boost: [] }
  ],

  questionsOuvertes: [
    { id: "fierte", texte: "Qu'est-ce qui te rend le plus fier dans ton travail ?", indice: "Une réalisation, un moment, un commentaire de client..." },
    { id: "refus", texte: "Qu'est-ce que tu refuses de faire, peu importe le prix ?", indice: "Ça dit beaucoup sur tes valeurs." },
    { id: "soiree", texte: "Si ton entreprise était une personne dans une soirée, qu'est-ce qu'elle ferait ?", indice: "Elle jase dans un coin ? Elle anime la place ? Elle écoute ?" },
    { id: "ressenti", texte: "Qu'est-ce que tu veux que les gens ressentent après avoir fait affaire avec toi ?", indice: "En un ou deux mots, si tu peux." },
    { id: "defi", texte: "C'est quoi le plus gros défi que ton entreprise t'a fait surmonter ?", indice: "Raconte-le comme tu le raconterais à un ami." },
    { id: "dix-ans", texte: "Dans dix ans, qu'est-ce que tu veux qu'on dise de toi ?", indice: "Ta réputation, dans tes mots." },
    { id: "animal", texte: "Si tu étais un animal, lequel serais-tu ? Et pourquoi cet animal ?", indice: "Le pourquoi compte autant que l'animal." },
    { id: "moment", texte: "C'est quoi ton moment préféré de la journée ?", indice: "Le matin, le midi, le soir, la nuit... et pourquoi ?" },
    { id: "endroit", texte: "Quel endroit te fait te sentir le mieux ?", indice: "Une forêt, la mer, ton atelier, ta cuisine..." }
  ],

  dimensionsAaker: [
    { id: "sincerite", label: "Sincérité", description: "Terre-à-terre, honnête, authentique." },
    { id: "excitation", label: "Excitation", description: "Audacieuse, vive, imaginative." },
    { id: "competence", label: "Compétence", description: "Fiable, intelligente, performante." },
    { id: "sophistication", label: "Sophistication", description: "Classe, charmante, raffinée." },
    { id: "robustesse", label: "Robustesse", description: "Solide, plein air, qui dure." }
  ],

  archetypes: [
    { id: "innocent", nom: "Innocent", promesse: "La simplicité, l'optimisme, la pureté.", ombre: "Le déni : tout voir en rose, même quand ça ne va pas.", couleurs: ["#f4efe7", "#7fb3d5", "#f7dc6f"], formes: ["cercle", "goutte", "vague"], polices: ["Ronde et aérée", "Sans-serif légère", "Manuscrite douce"], motsCles: ["simple", "simplicite", "pur", "purete", "optimiste", "optimisme", "heureux", "bonheur", "calme", "paisible", "doux", "douceur", "honnete", "sincere", "authentique", "famille", "enfant"] },
    { id: "sage", nom: "Sage", promesse: "Le savoir, la vérité, la rigueur.", ombre: "L'analyse sans fin : ne jamais décider.", couleurs: ["#1b2a4a", "#5d6d7e", "#7d3c98"], formes: ["losange", "hexagone", "cercle"], polices: ["Serif classique", "Serif structurée", "Sans-serif nette"], motsCles: ["savoir", "apprendre", "comprendre", "verite", "rigueur", "precis", "precision", "expert", "expertise", "analyse", "recherche", "etude", "enseigner", "formation", "connaissance"] },
    { id: "explorateur", nom: "Explorateur", promesse: "La liberté, la découverte, l'horizon.", ombre: "Ne jamais s'installer : toujours repartir.", couleurs: ["#1abc9c", "#2471a3", "#2e86c1"], formes: ["fleche", "vague", "cercle"], polices: ["Sans-serif dynamique", "Sans-serif espacée", "Manuscrite libre"], motsCles: ["liberte", "libre", "decouvrir", "decouverte", "voyage", "aventure", "horizon", "explorer", "nature", "plein air", "route", "nouveau", "ailleurs", "dauphin", "loup", "aigle"] },
    { id: "rebelle", nom: "Rebelle", promesse: "La rupture, le courage de faire autrement.", ombre: "La disruption gratuite : choquer pour choquer.", couleurs: ["#111111", "#c0392b", "#5d6d7e"], formes: ["losange", "fleche", "etoile"], polices: ["Condensée audacieuse", "Sans-serif massive", "Majuscules fortes"], motsCles: ["autrement", "different", "rupture", "briser", "regles", "jamais comme", "contre", "revolution", "changer", "defier", "audace", "franchir", "non conventionnel"] },
    { id: "magicien", nom: "Magicien", promesse: "La transformation, le rêve qui devient réel.", ombre: "Promettre des miracles : vendre du rêve vide.", couleurs: ["#6c3483", "#1a5276", "#f1c40f"], formes: ["etoile", "goutte", "cercle"], polices: ["Élégante fine", "Serif avec empattements fins", "Script léger"], motsCles: ["transformer", "transformation", "reve", "magie", "miracle", "possible", "impossible", "vision", "creer", "inventer", "surprendre", "renard", "chat"] },
    { id: "heros", nom: "Héros", promesse: "Le courage, le dépassement, la victoire.", ombre: "Voir des ennemis partout : tout devient un combat.", couleurs: ["#c0392b", "#1a5276", "#f1c40f"], formes: ["bouclier", "fleche", "etoile"], polices: ["Bold majuscules", "Sans-serif impact", "Condensée forte"], motsCles: ["courage", "depasser", "depassement", "victoire", "gagner", "defi", "surmonter", "fort", "force", "combat", "reussir", "effort", "determination", "lion", "cheval"] },
    { id: "amoureux", nom: "Amoureux", promesse: "La passion, la beauté, le lien.", ombre: "Vouloir plaire à tout le monde, tout le temps.", couleurs: ["#922b21", "#f1948a", "#f1c40f"], formes: ["goutte", "cercle", "vague"], polices: ["Serif élégante", "Script raffiné", "Sans-serif douce"], motsCles: ["passion", "beau", "beaute", "aimer", "amour", "plaisir", "desir", "lien", "relation", "proche", "attention", "soin", "elegant", "raffine"] },
    { id: "bouffon", nom: "Bouffon", promesse: "Le plaisir, l'humour, la légèreté.", ombre: "Ne jamais être pris au sérieux.", couleurs: ["#f39c12", "#e74c3c", "#af7ac5"], formes: ["etoile", "cercle", "vague"], polices: ["Ronde décalée", "Sans-serif joyeuse", "Manuscrite rigolote"], motsCles: ["rire", "plaisir", "fun", "humour", "amusant", "fete", "leger", "legerete", "jouer", "jeu", "surprendre", "fou", "rire"] },
    { id: "homme-ordinaire", nom: "Homme ordinaire", promesse: "L'appartenance, l'authenticité, le concret.", ombre: "Se fondre dans la masse : ne plus se distinguer.", couleurs: ["#2e86c1", "#d5c6a5", "#7b241c"], formes: ["cercle", "hexagone", "bouclier"], polices: ["Simple lisible", "Sans-serif franche", "Serif terre-à-terre"], motsCles: ["simple", "concret", "vrai", "authentique", "quotidien", "gens", "communaute", "voisin", "famille", "ordinaire", "accessible", "chien", "terroir"] },
    { id: "protecteur", nom: "Protecteur", promesse: "Le soin, la sécurité, le service.", ombre: "Le martyre : s'épuiser à aider les autres.", couleurs: ["#2e86c1", "#7fb069", "#f4efe7"], formes: ["bouclier", "cercle", "goutte"], polices: ["Ronde rassurante", "Sans-serif chaleureuse", "Serif douce"], motsCles: ["aider", "aide", "soin", "prendre soin", "securite", "proteger", "ecouter", "ecoute", "service", "client", "accompagner", "soutenir", "bienveillance", "chat", "doux", "rassurer"] },
    { id: "souverain", nom: "Souverain", promesse: "Le prestige, le contrôle, l'excellence.", ombre: "La domination : décider pour tout le monde.", couleurs: ["#111111", "#b7950b", "#1b2a4a"], formes: ["bouclier", "losange", "hexagone"], polices: ["Serif majestueuse", "Capitales élégantes", "Sans-serif prestige"], motsCles: ["excellence", "prestige", "qualite", "leader", "diriger", "controle", "ordre", "structure", "haut de gamme", "premium", "reference", "meilleur", "lion", "roi"] },
    { id: "createur", nom: "Créateur", promesse: "L'imagination, l'originalité, le fait main.", ombre: "Le perfectionnisme : ne jamais finir.", couleurs: ["#e67e22", "#6c3483", "#1abc9c"], formes: ["etoile", "hexagone", "vague"], polices: ["Originale moderne", "Sans-serif créative", "Manuscrite d'atelier"], motsCles: ["creer", "creation", "imaginer", "imagination", "original", "inventer", "design", "art", "atelier", "fabriquer", "fait main", "idee", "nouveau"] }
  ],

  palettes: [
    { id: "p1", nom: "Palette 1", couleurs: [] },
    { id: "p2", nom: "Palette 2", couleurs: [] },
    { id: "p3", nom: "Palette 3", couleurs: [] }
  ],

  formes: [
    { id: "cercle", label: "Cercle", description: "Rond, doux, accueillant." },
    { id: "bouclier", label: "Bouclier", description: "Solide, protecteur, fiable." },
    { id: "losange", label: "Losange", description: "Précis, structuré, qui tranche." },
    { id: "vague", label: "Vague", description: "Fluide, libre, en mouvement." },
    { id: "etoile", label: "Étoile", description: "Qui brille, qui se remarque." },
    { id: "hexagone", label: "Hexagone", description: "Stable, construit, technique." },
    { id: "fleche", label: "Flèche", description: "En avant, direct, ambitieux." },
    { id: "goutte", label: "Goutte", description: "Humaine, douce, proche." }
  ],

  polices: [
    { id: "georgia", label: "Serif classique", stack: "Georgia, 'Times New Roman', serif" },
    { id: "arial", label: "Sans-serif nette", stack: "Arial, Helvetica, sans-serif" },
    { id: "arial-black", label: "Sans-serif forte", stack: "'Arial Black', Arial, sans-serif" },
    { id: "trebuchet", label: "Sans-serif chaleureuse", stack: "'Trebuchet MS', Verdana, sans-serif" },
    { id: "courier", label: "Machine à écrire", stack: "'Courier New', Courier, monospace" },
    { id: "comic", label: "Manuscrite légère", stack: "'Comic Sans MS', 'Segoe Print', cursive" }
  ],

  animalMap: [
    { mots: ["chat"], arch: ["protecteur", "innocent"], note: "Le chat doux pointe souvent vers le Protecteur ou l'Innocent, mais c'est une piste, pas une preuve : le pourquoi de la réponse compte plus que l'animal." },
    { mots: ["dauphin"], arch: ["explorateur"], note: "Le dauphin libre pointe vers l'Explorateur." },
    { mots: ["lion"], arch: ["souverain", "heros"], note: "Le lion pointe vers le Souverain ou le Héros." },
    { mots: ["loup"], arch: ["rebelle", "explorateur"], note: "Le loup pointe vers le Rebelle ou l'Explorateur." },
    { mots: ["chien"], arch: ["protecteur", "homme-ordinaire"], note: "Le chien pointe vers le Protecteur ou l'Homme ordinaire." },
    { mots: ["hibou", "chouette"], arch: ["sage"], note: "Le hibou pointe vers le Sage." },
    { mots: ["renard"], arch: ["magicien"], note: "Le renard pointe vers le Magicien." },
    { mots: ["cheval"], arch: ["heros", "explorateur"], note: "Le cheval pointe vers le Héros ou l'Explorateur." },
    { mots: ["ours"], arch: ["protecteur", "homme-ordinaire"], note: "L'ours pointe vers le Protecteur ou l'Homme ordinaire." },
    { mots: ["aigle"], arch: ["explorateur", "heros"], note: "L'aigle pointe vers l'Explorateur ou le Héros." }
  ],
  momentMap: [
    { mots: ["matin", "aube", "lever"], couleurs: ["#f7dc6f", "#f39c12"], note: "Le matin, c'est le jaune et l'orange clair : frais, optimiste, qui commence." },
    { mots: ["midi", "apres-midi", "apres midi"], couleurs: ["#f1c40f", "#f48a08"], note: "Le midi, c'est le jaune vif : énergique, en pleine action." },
    { mots: ["soir", "coucher", "fin de journee", "crepuscule"], couleurs: ["#e67e22", "#922b21"], note: "La fin de journée, c'est l'orange et le bordeaux : chaleureux, qui rassemble." },
    { mots: ["nuit"], couleurs: ["#1b2a4a", "#6c3483"], note: "La nuit, c'est le bleu nuit et le violet : calme, profond, réfléchi." }
  ],
  lieuMap: [
    { mots: ["foret", "bois", "arbre"], couleurs: ["#2e7d32", "#7fb069"], note: "La forêt, c'est le vert : vivant, ancré, qui respire." },
    { mots: ["mer", "plage", "ocean", "lac", "riviere"], couleurs: ["#2471a3", "#1abc9c"], note: "La mer, c'est le bleu et le turquoise : libre, fluide, apaisant." },
    { mots: ["montagne"], couleurs: ["#5d6d7e", "#2471a3"], note: "La montagne, c'est le gris et le bleu : solide, qui dure." },
    { mots: ["maison", "chez moi", "cuisine", "salon"], couleurs: ["#d5c6a5", "#7b241c"], note: "La maison, c'est le beige et le brun chaud : proche, rassurant." },
    { mots: ["atelier", "garage", "boutique"], couleurs: ["#e67e22", "#111111"], note: "L'atelier, c'est l'orange et le noir : on fabrique, on fait." },
    { mots: ["ville"], couleurs: ["#5d6d7e", "#111111", "#b7950b"], note: "La ville, c'est le gris, le noir et l'or : dense, qui bouge." }
  ],

  mythes: [
    { mythe: "62 à 90 % des gens jugent un produit sur sa couleur.", realite: "Chiffre sans source vérifiable. La couleur compte, mais le contexte et la congruence comptent plus." },
    { mythe: "Le rouge fait vendre, le bleu inspire confiance, point final.", realite: "La même couleur change de sens selon le secteur et le contexte. Un bleu marine saturé et un bleu ciel pastel ne sont pas le même bleu." },
    { mythe: "Jung a identifié 12 archétypes.", realite: "Faux. C'est Pearson qui a fixé le nombre à 12 (1991), puis Mark et Pearson qui les ont appliqués aux marques (2001)." },
    { mythe: "Un logo archétypal vend mieux, c'est prouvé.", realite: "Aucune étude contrôlée ne le montre. L'archétype aide à être cohérent, pas à vendre plus." },
    { mythe: "On peut diagnostiquer ta personnalité avec 9 questions.", realite: "Non. C'est un déclencheur de conversation. L'effet Barnum fait croire que n'importe quelle description vague, c'est tellement toi." }
  ],

  idees: [
    { titre: "Le crash-test client", texte: "Tester le logo auprès de vrais clients cibles, en 1 seconde, avant de payer le solde." },
    { titre: "Le double portrait", texte: "Comparer le fondateur et sa clientèle, et afficher l'écart au lieu de le cacher." },
    { titre: "Le score en 3 chiffres", texte: "Mémorabilité, confiance, distinctivité, séparés, avec la méthode affichée." },
    { titre: "L'histoire d'une page", texte: "Chaque trait du logo relié à une phrase du fondateur, en 30 secondes." },
    { titre: "L'identité vivante à une variable", texte: "Un noyau fixe, une seule variable (saison, service, canal)." },
    { titre: "La distinctivité locale", texte: "Comparer le logo aux 5 à 10 concurrents de ta rue avant de le lancer." }
  ]
};
