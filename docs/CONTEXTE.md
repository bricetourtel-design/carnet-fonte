# Gymon — contexte complet du projet (archive)

Document d'archivage rédigé le 11 novembre 2026 pour qu'une personne ou une session de travail qui découvre le projet retrouve tout ce qu'il faut savoir, y compris après une migration vers un autre compte. Il complète `CLAUDE.md` (règles de travail), `ALGORITHME.md` (coach) et `CREATURE.md` (Gymon), qu'il ne répète pas en détail.

Aucune donnée personnelle ne figure ici. Les testeurs sont anonymes.

---

## 1. Identité du projet

| | |
|---|---|
| Nom | **Gymon** (nom de l'app depuis le 29 octobre 2026) |
| Ancien nom | Carnet de Fonte (du 24 au 29 octobre 2026). Le nom reste dans le dépôt (`carnet-fonte`), la clé de stockage (`carnet-fonte.v1`), le cache (`carnet-fonte-vN`) et le champ `app` des exports |
| Promesse | Carnet de musculation avec une créature qui grandit à chaque séance |
| Public | Pratiquants de musculation en salle, débutants à intermédiaires, orientés prise de muscle, sur iPhone |
| Plateforme | PWA (web installable), testée sur iPhone, compatible Android via Chrome |
| Langue | Français uniquement |
| Dépôt | `github.com/bricetourtel-design/carnet-fonte`, branche `main` |
| Hébergement | **GitHub Pages**, depuis ce dépôt (confirmé par le propriétaire le 11 novembre 2026). URL de production : `https://bricetourtel-design.github.io/carnet-fonte/` (confirmée). Conséquence : **tout push sur `main` est déployé** chez les testeurs |
| Modèle économique | Gratuit pour l'utilisateur. Pistes B2B et abonnement en section 10 |
| Statistiques | GoatCounter, compte `gymon` (`gymon.goatcounter.com`), deux événements seulement |
| Licence | Aucun fichier de licence dans le dépôt. Par défaut, tous droits réservés au propriétaire |

## 2. Vision et thèse produit

**Hypothèse de départ** (CREATURE.md) : une créature qui grandit avec les entraînements améliore la motivation et la régularité.

**Ce que les retours ont montré** (6 novembre 2026) : la gamification façon Tamagotchi plaît de façon quasi unanime. C'est la vraie valeur ajoutée, à renforcer en priorité. Le carnet et le coach sont le socle qui rend la créature crédible : elle ne grossit que de ce qu'on a vraiment soulevé.

**Positionnement implicite** :
- Pas d'IA, pas de compte, pas de serveur : promesse de simplicité et de confidentialité, affichée dans l'app.
- Un coach qui s'explique (bouton « pourquoi ? » sur chaque proposition) et qui cite la littérature.
- Une créature mystérieuse : on ne sait jamais quand elle évolue, ni quelle forme vient ensuite.

**Ce qui sera valorisé commercialement** (indication du propriétaire, novembre 2026) : les fonctionnalités et la logique de développement du MVP. Concrètement, la propriété intellectuelle est dans :
1. Les règles du coach et leur justification scientifique (`ALGORITHME.md`, fonctions `coach*`, `fatigueK`, `generatePlan`, `chooseToday`, `adaptToday`, `recovery`, `strengthByMuscle`).
2. Le modèle de la créature : stades cachés tirés au hasard, vitalité proportionnelle, mort et résurrection, musculature par muscle avec croissance et fonte, dessin SVG paramétrique par muscle (`CREATURE_CFG`, `creatureFeed`, `growMuscles`, `creatureSVG`, `gymonBack`, `gymonHead`).
3. La mécanique d'engagement : bulles de dialogue pilotées par les données, célébrations, évolution plein écran, avant/après, partage d'image, phrase du jour.
4. Les choix d'ergonomie iPhone (rendu jamais sous le doigt, minuteur sans reconstruction, sélection au focus) et le corpus de tests.
5. Les tutos, les textes, le ton.

## 3. Chronologie

Reconstituée depuis l'historique git (50 commits sur `main`).

| Date | Étape |
|---|---|
| 24 oct. 2026 | Naissance de « Carnet de Fonte » : app autonome hors ligne, design iOS natif, photos d'exercices |
| 25 oct. | Import de l'historique Gravl (CSV), coach de progression orienté hypertrophie, 44 exercices Gravl avec photos |
| 26 oct. | Sélecteur d'exercices iPhone, mises à jour fiables, onglet Routine (semaine), récupération des muscles, minuteur sonore, points forts, note de séance, séance du jour adaptée à la récupération |
| 29 oct. | Tests de non-régression (référence avant la créature), **MVP créature évolutive**, accueil au premier lancement, import sécurisé. **L'app devient Gymon**, nouvelle icône (œuf qui éclot, puis haltère qui casse l'œuf), design « Liquid Glass » |
| 2 nov. | Boîte à idées, tuto du Gymon, mort après 30 jours avec résurrection, guide de l'app (7 écrans) |
| 3 nov. | 13 formes de l'œuf au dragon, style chibi, muscles exagérés |
| 4 nov. | Corps humain détaillé et tête mascotte, vue de dos, prototype 3D (à part), nouvelle vitalité (proportionnelle), 50 phrases du jour |
| 6 nov. | Coach v2 (plus lourd, fourchettes étroites), v2.1 (lourd/volume en alternance), échauffement automatique, touchers fiables, minuteur en bandeau puis plein écran, **retours utilisateurs du MVP**, **Gymon v1.9** (couleur et short uniques, nom, bulles, célébration, évolution plein écran, partage d'image) |
| 9 nov. | Statistiques anonymes GoatCounter |
| 11 nov. | **Gymon v2.0** (croissance sans plafond, fonte après 14 jours, dessin contrasté, avant/après), coach v2.3 (fatigue selon la place dans la séance), v2.4 (raison d'une séance moins bonne, 6 catégories, « Règles » pour les femmes), fenêtre « Quoi de neuf », sélection au toucher des cases, charge par côté de la barre |

Version courante : `APP_VERSION = "2026-11-11 i"`, cache `carnet-fonte-v49`.

Retours testeurs antérieurs au 6 novembre : tuto manquant (fait), clics parfois à refaire (corrigé le 6 novembre).

## 4. Fonctionnalités du MVP (inventaire)

Chaque ligne est une fonctionnalité livrée et testée, à préserver.

### 4.1 Carnet de séance (onglet Séance)
- Séance libre ou depuis un programme ; ajout d'exercices par sélecteur avec recherche et filtre par muscle ; création d'exercice personnalisé.
- Par série : charge, reps, validation ✓ ; valeurs grises = proposition du coach, validée telle quelle par ✓ ; pré-remplissage de la série suivante ; « Précédent » affiché.
- Séries d'échauffement « É » automatiques quand utiles, convertibles en série normale ; bouton « + Échauffement ».
- Charge par côté de la barre (barre 20 kg, EZ 10 kg, réglables).
- Ressenti par exercice sur 5 niveaux (Trop facile → Trop dur), converti en reps en réserve.
- Minuteur de repos automatique selon l'exercice (1 min 30 à 3 min), +15 / −15 / Passer, bip et bandeau à 10 s, 3 bips et plein écran « GO » à la fin, son mêlé à la musique (iOS 17+), écran maintenu allumé (wake lock).
- Fin de séance : records détectés (1RM estimé ou charge max), note (😄 🙂 😐 😕 💪) avec explications, tuiles durée/volume/séries/records, repas du Gymon, célébration.
- Raison d'une séance moins bonne (6 catégories), modifiable plus tard depuis l'historique ; les séances « hors forme » n'influencent pas les prochaines charges.
- Abandon avec confirmation ; terminer avec séries non validées demande confirmation.

### 4.2 Coach (règles détaillées dans `ALGORITHME.md`)
- Double progression (reps puis charge) dans une fourchette par exercice (5–8, 6–10, 8–12, 10–15, 12–20), modifiable par exercice.
- 1RM estimé d'Epley corrigé par le ressenti.
- Périodisation lourd/volume en alternance sur les polyarticulaires chargés.
- Décharge sur 3 séances rapprochées trop dures ou en baisse de plus de 5 %, reprise à −10 % après 3 semaines.
- Volume hebdomadaire par muscle (cible 10–20 séries) : série ajoutée si sous 10.
- Fatigue selon la place de l'exercice dans la séance, calibrée sur l'historique de l'utilisateur (médiane des pentes, prior bayésien vers 1 % par série, bornes 0,3–2,5 %, plancher −15 %).
- Chaque proposition s'explique (« pourquoi ? »).

### 4.3 Routine de la semaine (onglet Routine)
- 1 à 6 séances, jours choisis, temps disponible par jour (30 min à 2 h).
- Organisations proposées par nombre de séances (Full body, Haut/Bas, Push/Pull/Legs, duos), une « conseillée » visant 2 passages par muscle.
- Duos conseillés avec justification (Pecs + Triceps, Dos + Biceps, Pecs + Dos…).
- Génération des exercices depuis l'historique (les plus pratiqués d'abord, polyarticulaire en tête pour les gros muscles), alternance d'une séance à l'autre, ↻ pour changer, une nouveauté par mois au plus.
- Séries ajustées pour 10 à 20 par muscle et par semaine, puis réduites pour tenir dans le temps disponible.
- Alertes 48 h (même muscle deux jours de suite) et récupération partielle (synergistes).
- Validation : les séances deviennent des programmes datés, affichés sur l'onglet Séance.

### 4.4 Séance du jour
- Récupération estimée par muscle (48–72 h de base, ajustée séries, ressenti, travail indirect).
- Choix automatique parmi la séance prévue, les autres de la semaine et des duos, par score ; échange de deux séances de la semaine si nettement mieux ; l'utilisateur peut garder la séance prévue, choisir une autre option, ou revenir à l'automatique.
- Ajustements : muscle sous 50 % retiré, 50–90 % allégé, point faible récupéré renforcé et placé en tête, remplacement par des muscles récupérés.

### 4.5 Progrès et historique
- Points forts / faibles par muscle (silhouette face et dos), niveau débutant → élite, référence homme ou femme, évolution sur 6 semaines.
- Volume par semaine (8 semaines), 1RM estimé et charge max par exercice (courbe, tuiles, tableau).
- Historique par mois, détail d'une séance, refaire, enregistrer comme programme, supprimer.

### 4.6 Mon Gymon (onglet par défaut, détails dans `CREATURE.md`)
- 13 formes de l'œuf au dragon, seuils cachés tirés à la naissance.
- Vitalité proportionnelle, maladie, mort sous 10 %, résurrection (garde tout, perd 30 % du poids, mange les séances en attente) ou nouvel œuf (l'ancien reste en souvenir).
- Poids (volume soulevé × coefficient de stade × régularité), taille, force.
- Musculature par muscle 0–4,5 : croissance par séries, bonus record, fonte après 14 jours (plancher 40 % du maximum), dessin exagéré.
- Couleur (20, dont 3 rares à 2 %) et short tirés à la naissance ; nom ; ambiance Aesthetic / Compétition ; vue de dos.
- Bulles de dialogue selon les données (repas, record, séries en plus, muscle en retard, fonte, récupération, creux, humeur) ; phrase du jour (50).
- Effets : muscles rouges 24 h après croissance, fumée sur les muscles en récupération, étincelles pour les couleurs rares, respiration.
- Avant / après tous les 15 à 30 jours.
- Célébration de fin de séance (confettis, muscles gagnés, records) et évolution plein écran ; nom demandé à l'éclosion.
- Partage : carte PNG 1080×1350 créée dans le téléphone, envoyée par le partage iOS.
- Tuto en 5 écrans (l'œuf seulement, le reste est une surprise).

### 4.7 Transverse
- Accueil au premier lancement (poids, taille, homme/femme), guide de l'app en 7 écrans au premier passage sur Séance, « Quoi de neuf » depuis la dernière visite.
- Boîte à idées (ampoule en haut) : message préparé et envoyé par le partage iOS ou copié.
- Export / import JSON (texte à copier), import nettoyé (`cleanImport`, identifiants sûrs) ; import Gravl CSV avec table de correspondance de 69 noms Gravl.
- Réglages : repos par défaut, poids, taille, barres, sexe, statistiques anonymes, revoir les tutos et les nouveautés.
- Hors ligne complet, mise à jour automatique au retour dans l'app, rappel d'installation sur l'écran d'accueil, demande de stockage persistant.
- Mode sombre automatique, accessibilité (aria, focus visible, réduction des animations).

## 5. Modèle de données

Clé `localStorage` : `carnet-fonte.v1`. Contenu `{profile, workouts}`.

```
profile
  version 2, rest (-1 = auto), ranges {exId: [lo,hi]}, custom [exercices perso], active (séance en cours ou null)
  routines [{id, name, items:[{exId, sets}], plan?, dow?}], plan {tpl, created, days:[{dow, muscles, off, min}]}, novelty, swaps, todayPick
  bw, height, sex ("h"|"f"), bar, barEz, noStats, installHintOff
  onboarded, tutoDone, tutoAppDone, wnSeen (date ISO), gymonStyle
  creature  v, at [13 seuils], born, fed [ids], fidelity, food, weight, stage, levels {muscle: 0..4.5},
            lastWorked {muscle: ts}, peak {muscle}, last, lastMeal, vit, dead {ts, since} | null, pending [ids],
            resurrections, graves [], look {col, shorts}, name, ref (avant/après), mv (version musculature)
workouts [ {id, name, start, end, routineId, prs:[exId], rating {e, label, why}, off {reasons, ignore} | null, source?,
            exercises:[{exId, feel 0..5, sets:[{w:"80", r:"8", done:true, warm:false}]}]} ]
```

Autres clés : `gymon.idea` (brouillon de la boîte à idées), `gymon.installCounted` (statistique d'installation).

Identifiants d'exercices : 41 de la bibliothèque (`EX`), 44 importés de Gravl (`gx-…`, photos dans `EXTRA_IMG`), exercices perso (`x…`). Ils ne doivent jamais changer.

Export : `{app:"carnet-fonte", exported, profile (sans active), workouts}`. L'import fusionne sans doublon par `id`.

## 6. Décisions de conception et leurs raisons

| Décision | Raison | Depuis |
|---|---|---|
| Un seul fichier HTML, aucune dépendance | Déployable en glisser-déposer, lisible d'un bloc, pas de chaîne de build à maintenir pour un MVP solo | 24 oct. |
| Pas de serveur ni de compte | Confidentialité, coût nul, promesse simple ; les données de santé et de cycle ne quittent jamais le téléphone | 24 oct. |
| Créature en module isolé, lecture seule de l'existant | Pouvoir la retirer ou la refondre sans toucher au carnet ; les séances ne sont jamais modifiées | 29 oct. |
| Départ à zéro de la créature (les séances importées ne la nourrissent pas) | L'engagement commence à l'installation ; évite un dragon instantané pour un ancien de Gravl | 29 oct. |
| Seuils d'évolution tirés au hasard et jamais affichés | Mystère et surprise ; impossible de « calculer » son Gymon | 29 oct. (V1.2) |
| Les démos des tutos ne montrent que l'œuf | Les formes suivantes restent une surprise | 2 nov. |
| Un stade, une fidélité, un niveau ne se perdent jamais | Jamais punir une mise à jour ou une pause ; la seule sanction est la vitalité | 29 oct. |
| Vitalité en proportion de la valeur actuelle | Courbe douce, mort à 22 jours depuis 100 %, résurrection toujours possible | 4 nov. (V1.7) |
| Mort possible | Retenu après retours : l'enjeu plaît ; prévenu dans le tuto | 2 nov. |
| Coach v2 plus lourd | Audit sur un historique réel : l'ancien coach proposait 21 baisses de charge sur 43 exercices | 6 nov. |
| Lourd / volume en alternance | Périodisation ondulante, sourcée | 6 nov. |
| Fatigue calibrée sur l'utilisateur | Un exercice en fin de séance n'est pas un recul ; prior vers 1 % par série tant qu'il y a peu de mesures | 11 nov. |
| Raisons de séance moins bonne, « Règles » pour les femmes | Ne pas baisser les charges sur une mauvaise journée ; donnée sensible, jamais envoyée | 11 nov. |
| Statistiques limitées à installations et ouvertures | Mesurer l'adoption sans cookie ni donnée de séance | 9 nov. |
| « Quoi de neuf » marqué vu à la fermeture | Un rechargement de mise à jour ne doit pas faire disparaître la fenêtre | 11 nov. |
| Tests Playwright sur Chromium, valeurs de référence figées | Détecter toute dérive de calcul ; Safari iOS réel non couvert | 29 oct. |
| Gymon en 2D détaillée plutôt qu'en 3D | Le rendu 3D essayé donnait un effet « ballon » ; la 2D permet des muscles lisibles et un style affirmé | 4 nov. |
| App gratuite, hébergée sur GitHub Pages | Coût nul, déploiement par simple push | 29 oct. |
| Algorithmes basés sur l'historique de chaque utilisateur | L'historique Gravl du propriétaire n'a servi qu'aux simulations ; aucune valeur personnelle codée en dur | 25 oct. |
| Ambiances Aesthetic / Compétition : expression du Gymon seulement | Le corps et les muscles restent ceux gagnés par l'entraînement ; la tête de mascotte suit le modèle d'image fourni par le propriétaire | 4 nov. |
| Planche visuelle avant tout changement de dessin | Le dessin du Gymon est l'actif le plus visible ; le propriétaire valide sur captures avant intégration | 3 nov. |
| Aucune donnée personnelle commitée (CSV Gravl, poids, captures) | Une capture contenant le poids du propriétaire a dû être retirée par réécriture d'historique | 29 oct. |
| Déploiement direct par Claude après demande ou validation | Rythme d'itération rapide ; exceptions listées dans `CLAUDE.md` (règles du jeu, données, dessin, force push) | 11 nov. (écrit) |

### Choix refusés (à ne pas re-proposer sans nouvel élément)
- Une app qui dépend de Claude ou d'une IA à l'exécution.
- La 3D pour le Gymon (le prototype `proto-3d/` reste une exploration).
- Les outils payants pour les statistiques (Plausible, par exemple) : GoatCounter gratuit suffit.
- Les achats pour gagner (« pay to win »), la publicité, les classements publics de charges.
- Les retouches mineures dans « Quoi de neuf ? » : réservé aux nouveautés qui changent l'usage.

## 7. Logique de développement (comment le projet avance)

- Itérations courtes, une fonctionnalité par commit, message en français décrivant ce que voit l'utilisateur.
- Travail dans Claude Code cloud (claude.ai/code). Du 24 octobre au 11 novembre 2026, Claude poussait directement sur `main` (déploiement chez les testeurs) dès que la fonctionnalité était demandée ou validée, sans pull request. Sur le nouveau compte, les sessions peuvent imposer une branche `claude/…` : le déploiement passe alors par une pull request fusionnée dans `main`. Règle complète dans `CLAUDE.md`, section « Hébergement et déploiement ».
- Contrôle visuel par capture Playwright au format iPhone (serveur local), captures gardées hors du dépôt.
- Chaque règle métier a sa justification écrite (`ALGORITHME.md` avec sources, `CREATURE.md` avec versions) : la documentation fait partie du produit.
- Audit par simulation sur historique réel avant de changer le coach (novembre 2026).
- Tests de non-régression figés **avant** une modification volontaire (`--update`), puis comparés.
- Retours testeurs collectés via la boîte à idées intégrée et notés anonymement dans `.retours-utilisateurs.md`.
- Versionnage manuel : `APP_VERSION` (date + lettre) et `CACHE` du service worker ; `WHATS_NEW` pour les nouveautés visibles.
- Prototypes à part quand c'est exploratoire (`proto-3d/` avec three.js) : l'app n'en dépend pas.
- Mention « Assisté par IA » sur les documents et dans l'app ; aucune IA à l'exécution.

## 8. Tests

| Suite | Couvre |
|---|---|
| `tests/regression.js` | Bibliothèque, correspondances Gravl, 1RM, historique, volumes, coach sur 8 exercices, force, récupération, génération de routine, durée estimée, import Gravl ; parcours UI (accueil, onglets, séance, persistance). Référence : `tests/golden.json` |
| `tests/coach.js` | Fourchettes v2, pas de baisse pour 1–2 reps, lourd/volume, décharge sur bruit vs réelle, repos, échauffement, fatigue calibrée, raisons de séance |
| `tests/creature.js` | Tuto, départ œuf, seuils cachés, repas et fidélité, pas de double comptage, persistance, montée jusqu'au dragon sans saut, vitalité, pause, streak, croissance v2, fonte, migration 4 → 13 formes, mort, résurrection, nouvel œuf, dessin, couleurs rares, effets, nom, bulles, partage, célébration, vue de dos, avant/après |
| `tests/guide.js` | Guide de l'app, tutos, « Quoi de neuf » |
| `tests/idees.js` | Boîte à idées : brouillon, envoi par partage, copie |
| `tests/taps.js` | Touchers iPhone, minuteur, rendu différé, bandeau et plein écran, sélection au focus, charge par côté, statistiques désactivables |

Le 11 novembre 2026, les six suites passent dans l'environnement de cette session (Chromium, Playwright préinstallé).

## 9. Glossaire

- **1RM estimé** : charge maximale théorique sur une répétition, Epley : `W × (1 + reps/30)`, corrigé par les reps en réserve.
- **RIR** : reps en réserve, déduites du ressenti.
- **Double progression** : plus de reps jusqu'au haut de la fourchette, puis plus de charge.
- **Lourd / Volume** : les deux types de séance alternés sur les polyarticulaires.
- **Décharge** : −10 % et une série de moins pour récupérer.
- **Hors forme** : séance dont la raison (fatigue, santé, règles…) la fait ignorer par le coach.
- **Fidélité** : nombre de séances validées depuis la naissance du Gymon ; ne baisse jamais.
- **Vitalité** : santé du Gymon, de 0 à 100 %.
- **Fonte** : baisse lente d'un muscle du Gymon non travaillé depuis 14 jours.
- **Stade** : l'une des 13 formes.
- **Gravl** : application tierce dont on importe l'historique CSV.
- **É** : série d'échauffement.

## 10. Pistes (non livrées, non décidées)

Issues de `CREATURE.md`, des retours et du brainstorming du 6 novembre :
- Animations pendant les séries, réactions à chaque record.
- Calibrage des seuils de stade sur les premiers retours.
- Mesure de l'effet de la créature (fréquence avant / après).
- Gymon en 3D (prototype existant dans `proto-3d/`, non intégré).
- Intégration continue (aucun workflow GitHub Actions aujourd'hui).
- Sauvegarde plus simple que le copier-coller de texte (fichier, iCloud…) sans serveur.
- Version Android testée sur appareil réel.

Idées retenues lors des conversations de conception (novembre 2026), non planifiées :
- **Clans de salle** : choisir sa salle de sport, puis un « clan de salle ». Piste business B2B envisagée : de l'ordre de 20 salles à 50 € par mois pour viser 1 000 € par mois. À valider avec des salles.
- **Gymon+** : abonnement avec sauvegarde cloud et cosmétiques. Nécessiterait un serveur : contraire à la promesse actuelle, donc décision produit à part entière, pas une fonctionnalité de plus.
- **Duels de Gymon** par code entre amis.
- **Bilan du mois** façon « Wrapped ».
- **Branches d'évolution** selon le style d'entraînement.
- **Détail des disques** à mettre sur la barre (prolongement de la charge par côté).
- **Comptage des utilisateurs par salle** (option étudiée pour les clans) : recherche de salle via OpenStreetMap, consentement explicite, politique de confidentialité, hébergement en Europe. Demande un serveur : même réserve que Gymon+.
- **Suivi du cycle menstruel**, à traiter avec précaution : donnée de santé, à garder dans le téléphone, jamais partagée ni envoyée. La raison « Règles » de séance en est le premier pas.

Objectif business indiqué par le propriétaire : un revenu complémentaire de l'ordre de 1 000 € par mois au bout d'un an. Scepticisme sur le modèle grand public ; la piste des salles de sport était recommandée.

Questions ouvertes (à trancher par le propriétaire) :
- Barre EZ ou barre droite par défaut pour « Barre au front » ?
- Afficher dans « pourquoi ? » le nombre de mesures de l'historique personnel sur lesquelles repose la proposition ?
- Détail des disques à mettre sur la barre : forme et place dans l'interface.

## 11. Points à renseigner lors de la migration

À compléter par le propriétaire, ils ne sont pas dans le dépôt :
- Hébergeur et URL : GitHub Pages depuis ce dépôt, `https://bricetourtel-design.github.io/carnet-fonte/` (renseignés et confirmés le 11 novembre 2026). Pas de domaine à soi : l'adresse dépend du nom du compte GitHub, qui ne doit donc pas changer.
- Comptes liés (sans identifiants ni mots de passe, juste « lequel ») : GoatCounter `gymon`, hébergeur : ____________________
- Liste des testeurs : hors dépôt, à garder dans un espace privé.
- Décisions prises à l'oral ou dans d'autres conversations Claude et non reflétées dans la section 6 : à reporter avant de changer de compte Claude (voir `docs/MIGRATION.md`, section 2).

Migration prévue (novembre 2026) : changement de compte Claude seulement. Dépôt GitHub, URL de l'app et hébergement inchangés.

---
*Assisté par IA. Le collaborateur reste responsable et vérifie.*
