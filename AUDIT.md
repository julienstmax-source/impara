# Audit d'Impara! — 10 novembre 2026

Audit de la version 3.2 (commit `d12d755`) et contenu de la version 4 qui la remplace, déployée le 10 novembre 2026.

## En bref

- **Le risque principal était la perte de progression.** Un enregistrement illisible était remplacé par un état vide sans prévenir, il n'existait ni copie de sécurité ni export, et un échec d'écriture passait inaperçu. Corrigé.
- **La répétition espacée se contournait.** Rejouer une carte plusieurs fois le même jour la rendait « acquise » pour 14 jours. Corrigé : une carte ne monte que si elle était due.
- **Le contenu de grammaire contenait une réponse de quiz fausse** (leçon 20) et 24 questions où deux réponses se défendaient vraiment. Corrigé. Les conjugaisons (3 648 formes) sont sans erreur.
- **Le design avait trois défauts mesurables** : texte secondaire sous le contraste AA, actions principales au milieu de l'écran avec la moitié basse vide, et un accueil sans action principale. Repris dans la version 4.
- **Performance : aucun problème réel**, mais le démarrage gagne 24 % et un rendu est 2 à 4 fois plus léger.
- **Trois volets restent à faire** : relecture des 865 mots et phrases, audit du serveur Supabase (projet sur un autre compte), essai sur ton iPhone.

## Ce qui a été examiné

| Volet | Méthode | État |
|---|---|---|
| Code de l'app (`app.js`, `sw.js`, CSS) | Lecture complète + revue indépendante, bugs reproduits sous navigateur automatisé | Fait : 26 constats |
| Grammaire (40 leçons, 160 questions, 343 étapes d'animation, 3 648 formes verbales) | Relecture complète + conjugueur de contrôle | Fait : 15 corrections, 34 questions ambiguës |
| Design, ergonomie, accessibilité | Captures de tous les écrans (clair, sombre, ordinateur), contrastes calculés, cibles tactiles mesurées | Fait par moi ; la critique indépendante s'est arrêtée (limite d'usage) |
| Mots et phrases (865 cartes) | Relecture complète prévue | **Non fait** (limite d'usage) |
| Serveur Supabase (sécurité, cron, tables, journaux) | Alertes de sécurité, requêtes | **Non fait** : le projet est sur un autre compte que celui du connecteur |
| Vrai iPhone (clavier, glissement, push, mise à jour) | — | **Non vérifiable d'ici** |

## Constats et corrections

Gravité : **critique** = perte de données ; **majeur** = fonction faussée ou bloquée ; **mineur** = gêne ou cas rare.

### Données et robustesse

| # | Constat (version en ligne) | Gravité | Version 4 |
|---|---|---|---|
| 1 | État illisible → remplacé par un état vide, progression et identifiant d'appareil perdus sans message | Critique | L'original est mis de côté, la copie de sécurité de la veille est reprise, un bandeau le signale |
| 2 | Aucun export, aucune sauvegarde | Majeur | Réglages → Sauvegarde : exporter, importer avec aperçu avant remplacement ; copie de sécurité quotidienne automatique |
| 3 | Échec d'écriture (stockage plein ou bloqué) silencieux | Majeur | Message à l'écran |
| 4 | État mal formé (`progress: null`) → page blanche | Majeur | État validé à la lecture ; un écran qui plante affiche un message au lieu de tout emporter |
| 5 | Deux fenêtres ouvertes : la dernière qui écrit efface l'autre | Majeur | Chaque fenêtre reprend l'état de l'autre |
| 6 | Changement de jour traité seulement au chargement : série remise à 1, menu de la veille | Majeur | Traité au retour au premier plan et avant chaque action |
| 7 | Données du serveur insérées sans contrôle dans la page | Majeur | Nombres bornés, dates validées, textes échappés |
| 8 | Appels réseau sans délai maximal : « Chargement… » bloqué | Majeur | Délai de 12 s, messages lisibles (« Serveur injoignable », « Hors ligne ») |
| 9 | Réglages changés hors ligne écrasés au lancement suivant | Mineur | Ils sont conservés puis renvoyés |
| 10 | Heure d'été : graphiques 14 / 30 jours décalés certaines heures | Mineur | Calcul par jours calendaires |
| 11 | Champs écrits mais jamais relus (37 % de l'état enregistré) et clés laissées par l'ancienne connexion par e-mail | Mineur | Supprimés à la lecture |

### Apprentissage

| # | Constat | Gravité | Version 4 |
|---|---|---|---|
| 12 | 60 « Lo so » en une séance → 15 cartes « acquises », revues dans 14 jours | Majeur | Une carte ne monte que si elle était due (ou nouvelle) |
| 13 | « Da rivedere » ne se vidait jamais | Majeur | Une carte en sort une fois consolidée |
| 14 | 46 % des QCM de mots proposaient une forme inventée (`comunqui`, `quinde`) ; `tra` / `fra`, `molto` / `tanto` comptés faux | Majeur | Mots seuls : seulement l'article et la consonne double ; synonymes retirés |
| 15 | Leçon 20 : « Ci porti i documenti? » attendait « Ce li » au lieu de « Ve li » (quiz et animation) | Majeur | Corrigé |
| 16 | 14 règles ou légendes inexactes (futur des verbes en -ire, « andò » classé irrégulier, pluriels en gli / le…) | Mineur | Corrigé |
| 17 | 34 questions où deux réponses se défendent (g13 et g29 en entier) | Majeur | Les 24 cas nets réécrits ; 10 cas légers laissés tels quels |
| 18 | Quiz de leçon jamais mélangés : bonne réponse en dernière position 4 fois sur 160 | Mineur | Options mélangées à chaque quiz |
| 19 | Passato prossimo : un seul auxiliaire accepté pour les verbes qui prennent les deux (finire, passare, cambiare…) | Mineur | Les deux acceptés pour 13 verbes |
| 20 | Échéance à l'heure près : carte notée à 22 h 30 pas due le lendemain à 19 h | Mineur | Due dès le début du jour visé |
| 21 | Menù del giorno : remis à 0 / 5 en changeant de parcours, Contorno coché par n'importe quel jeu, plat impossible à cocher, premier jour bloqué sur l'Antipasto | Mineur | Corrigé (sauf session à cheval sur minuit) |
| 22 | Étape « leçon » d'un parcours non cochée si la leçon était déjà validée | Mineur | Cochée d'office |
| 22 bis | 21 cartes et 2 leçons citaient un prénom, un employeur, un client et une ville personnels, visibles par quiconque ouvre l'app | Majeur | Prénom et entreprise inventés (Jonas, Deltamec), lieux et client rendus neutres |

### Design, ergonomie, accessibilité

| # | Constat (mesuré) | Version 4 |
|---|---|---|
| 23 | Texte secondaire : contraste 3,95:1 sur blanc, 3,46:1 sur le fond (seuil AA : 4,5:1) | 5,43:1 et 4,76:1 |
| 24 | Thème sombre : le mot italien de la carte et les liens à 2,89:1 | 6,86:1 (encre de texte séparée de la couleur des aplats) |
| 25 | Vert et rouge de correction : 3,69:1 et 3,89:1 | 5,64:1 et 5,39:1 |
| 26 | Bordure des champs de saisie : 1,49:1 (seuil 3:1) | 3,04:1 |
| 27 | Zoom par pincement bloqué (`maximum-scale=1`) | Autorisé ; champs à 16 px pour éviter le zoom automatique d'iOS |
| 28 | Boutons sous 44 px : retour, actualiser, haut-parleur, fréquence | 40 à 46 px, ou zone tactile agrandie |
| 29 | Textes de 9,5 à 11 px ; 23 tailles de police différentes | Plus rien sous 11 px, 15 tailles, demi-tailles supprimées |
| 30 | Cartes et quiz : boutons au milieu, moitié basse de l'écran vide | Actions ancrées en bas, la carte occupe la hauteur ; glissement droite / gauche ; raccourcis clavier sur ordinateur |
| 31 | Animation de retournement de la carte jamais jouée (page reconstruite à chaque action) | Jouée : la page est mise à jour sur place |
| 32 | Oggi : quatre tuiles de couleurs sans hiérarchie, aucune action principale | Menù del giorno en carte de trattoria avec un seul bouton (le prochain plat) ; compteurs en un bandeau calme |
| 33 | Ordinateur : moitié droite de l'écran vide | Contenu centré, Oggi sur deux colonnes |
| 34 | Icône de l'app (noir, rouge, jaune) et couleurs du manifeste restées de la première version | Icône bordeaux, manifeste aligné |
| 35 | En-tête écrasé quand le contenu dépasse l'écran (le titre débordait de sa barre) | Corrigé |

Autres ajouts de la version 4 : thème clair / sombre au choix, panneau « Nouveautés » à la première ouverture, date du jour en italien, synthèse vocale balisée en italien (`lang="it"`) pour VoiceOver.

### Notifications et service worker

| # | Constat | Version 4 |
|---|---|---|
| 36 | Ouverture « réseau d'abord » : sur réseau lent, l'app attend avant d'utiliser le cache | Cache d'abord, comparaison en arrière-plan, bandeau « Une mise à jour est prête » |
| 37 | `index.html` indisponible hors ligne tant qu'il n'a pas été visité | Disponible |
| 38 | App gardée en mémoire plusieurs jours : jamais mise à jour | Vérification toutes les 6 h au retour au premier plan |
| 39 | Envoi au serveur à chaque mise en arrière-plan, même sans changement | Seulement si l'état a changé, avec `keepalive` |
| 40 | Abonnement push expiré non détecté ; appareil inconnu du serveur toujours affiché « abonné » | Vérifié au lancement ; l'activation est reproposée |
| 41 | Notification touchée en pleine session : session abandonnée | La session continue, un message signale la notification |

### Code

- **Structure** : les sources étaient dans un dossier temporaire et ont été perdues une fois ; elles ont dû être reconstituées à partir de la page en ligne. Version 4 : `src/` (coque, contenu, app), `tools/` (assemblage, simulateur, icônes, tests) prêts à entrer dans le dépôt. Le déploiement reste un fichier unique `index.html`.
- **Tests** : 65 contrôles automatiques (`node tools/checks.js`) couvrent tous les constats corrigés ci-dessus.
- **Code mort retiré** : `UI.bars` et son CSS, 2 icônes, une douzaine de règles CSS, variables du simulateur, `Store.markState`, champs `updated` / `lastOk`.
- **Non retenu** : politique de sécurité du contenu (CSP) — utile mais impossible à valider sans Safari ; tolérance aux fautes de frappe dans les réponses écrites — accepter une faute apprend la faute.

## Mesures avant / après

Navigateur automatisé, processeur ralenti ×4 (ordre de grandeur d'un téléphone), médiane de 5 passes.

| | En ligne | Version 4 |
|---|---|---|
| Démarrage (lecture du contenu + premier affichage) | 174 ms | 132 ms |
| Rendu d'Oggi | 6,3 ms | 2,7 ms |
| Rendu de Studia | 9,9 ms | 2,5 ms |
| Rendu de Progressi | 17,2 ms | 4,1 ms |
| Page, compressée | 162 Ko | 172 Ko (nouvelles fonctions) |
| État enregistré pour 865 cartes | 95 Ko | environ 60 Ko |

## Reste à faire

1. **Recharger 21 éléments de notification sur le serveur** : l'app n'affiche plus de prénom, d'employeur ni de ville personnels, mais la table `items` du serveur contient encore les anciennes phrases (`tools/build-items.js` régénère `items.json`).
2. **Relire les 571 mots et 294 phrases** (non fait).
3. **Auditer le serveur** : nécessite de brancher le connecteur Supabase sur le compte du projet `impara-italiano`. À vérifier : alertes de sécurité (RLS), tables restées de la connexion par e-mail (`profiles`, `progress`, `state`, `activity`), croissance de la table `sent`, journaux du cron. Mettre aussi les sources des deux fonctions et le schéma dans le dépôt.
4. **Essayer sur l'iPhone** : glissement des cartes, clavier pendant les réponses écrites, bandeau de mise à jour, export par la feuille de partage.
5. **Doutes de grammaire laissés ouverts** : 10 questions légèrement ambiguës, variantes correctes refusées (`siederò`, `debbo`, `perduto`), légendes trop absolues (g21, g26).
6. `items.json` (886 Ko) est publié avec le site alors que l'app ne le lit pas ; il sert à recharger la base. À déplacer lors de l'audit serveur.
