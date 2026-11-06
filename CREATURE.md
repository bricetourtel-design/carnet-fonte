# Mon Gymon (créature évolutive) – MVP V1.2

Hypothèse testée : une créature qui grandit avec les entraînements améliore la motivation et la régularité.

## Intégration (non invasive)
- **Code isolé** : bloc « Créature (MVP) » dans `index.html` (`CREATURE_CFG`, `creatureState`, `creatureFeed`, `creatureSVG`, `viewCreature`).
- **Données** : `S.profile.creature`, dans le stockage existant du téléphone. Les séances ne sont jamais modifiées.
- **Lecture seule** de l'existant : `wVolume` (volume = charge × reps, séries de travail), `strengthByMuscle` (1RM estimé d'Epley rapporté au poids de corps → score 0–5 par muscle), `workSets`, associations exercice → muscle (`EX`, `GRAVL`).
- **Seules modifications de l'existant** :
  - navigation : onglet Créature en premier, ouvert au démarrage ; Historique déplacé dans Progrès (Progression / Historique) pour rester à 5 onglets ;
  - fin de séance : un appel `creatureFeed(w)` et une ligne « votre créature a mangé » dans le résumé.
- **Départ à zéro** : l'œuf naît à la première ouverture de cette version. Les séances antérieures (dont l'import Gravl) ne la nourrissent pas.

## Règles (réglables dans `CREATURE_CFG`)
| Élément | Règle | Paramètres |
|---|---|---|
| Stades | 13 formes : Œuf → Œuf fêlé → Poussin → Poussin ado → Jeune poule → Poule adulte → Poule en mutation → Jeune dinosaure → Dinosaure ado → Dinosaure → Dinosaure en mutation → Dragonnet → Dragon, selon la fidélité (séances validées). Jamais perdues, jamais sautées. **Seuils tirés au hasard à la naissance, propres à chaque Gymon et jamais affichés** (dragon vers 71 à 85 séances, soit 6 à 7 mois à 3 séances par semaine) | `stageRange`, `stageAt` |
| Fidélité | +1 par séance validée, ne baisse jamais. Une séance n'est comptée qu'une fois (liste des séances déjà « mangées ») | – |
| Poids | Repas = volume soulevé. Gain = tonnes × coefficient du stade × facteur de régularité (0,7 à 1,3) | `foodPerTonne: [0.002, 0.03, 0.25, 1]`, `minWeight` |
| Taille | Liée à la maturité : progresse avec la fidélité à l'intérieur de chaque stade | `height` |
| Musculature | 5 niveaux par muscle. Niveau visé = score de force existant (0–5), ou séries faites depuis la naissance (abdos, pas de poids de corps). **Seuls les muscles réellement travaillés dans la séance (au moins une série validée) progressent, d'un niveau au plus par séance.** Ne baisse jamais | `levelThresholds`, `setsThresholds` |
| Régularité | Séances validées sur 14 jours, objectif 6 (3/semaine) | `freq` |
| Vitalité | Toujours en proportion de la vitalité actuelle : ×0,8 au 2ᵉ jour sans séance, puis ×0,9 par jour. Chaque séance : ×1,2, ou ×1,5 sous 30 % (max 100 %) ; une séance 3 jours de suite = retour à 100 %. Depuis 100 %, il meurt au bout de 22 jours sans séance | `vitality` |
| Mort | Quand la vitalité passe sous 10 %. Alertes avant : « il s'affaiblit » (≤ 70 %), « malade » (≤ 50 %), « mourant, plus que N jours » (≤ 30 %), pastille rouge sur l'onglet et alerte sur l'accueil. Mort : **Ressusciter** (garde stade, muscles, fidélité ; poids × 0,7 ; les séances faites pendant sa mort sont mangées) ou **Nouvel œuf** (l'ancien reste en souvenir, l'historique des séances n'est pas touché) | `vitality.deathBelow`, `resurrectWeightKeep` |

Le profil 1,90 m / 93 kg a servi à vérifier le rendu. Les seuils de musculature reposent sur le score de force existant (rapporté au poids de corps de l'utilisateur), pas sur des kilos fixes.

## Correctif V1.1
La première version recalculait tous les muscles à chaque séance à partir de l'historique de force : une séance pecs faisait grossir le dos ou les jambes. Corrigé ; la musculature des créatures existantes est recalculée une fois à partir des seules séances réellement faites.

## V1.2 : magie et mystère
- Le terme « créature » devient **Mon Gymon** (onglet « Gymon »).
- Page épurée : le Gymon en plein écran avec une aura et des étincelles, 4 petites infos en verre aux coins (poids, taille, vitalité, force), un indice mystérieux à la place du compte à rebours (« Quelque chose remue à l'intérieur… »). Le prochain stade n'est jamais nommé. Le détail des muscles s'ouvre en touchant le Gymon.
- Les Gymon existants reçoivent des seuils cachés cohérents avec le stade déjà atteint.

## V1.3 : tuto et mort
- Tuto en 5 écrans après l'écran de bienvenue (une fois aussi pour les utilisateurs existants), « Passer » sur chaque écran, « ? » sur la page Mon Gymon pour le revoir. Les illustrations montrent toujours l'œuf : les formes suivantes restent une surprise.
- Mort quand la vitalité passe sous 10 %, avec résurrection possible (voir Règles).

## V1.4 : 13 formes
- Œuf fêlé et dragonnet ajoutés comme formes intermédiaires pour ralentir les transitions.
- Mutations progressives : écailles, queue et griffes qui apparaissent sur la poule, cornes, ailes naissantes et yeux de reptile sur le dinosaure, puis ailes, queue en pique et souffle de feu pour le dragon.
- Les Gymon existants gardent la forme la plus proche (poussin → poussin, poulet → poule adulte, dinosaure → dinosaure) et reçoivent de nouveaux seuils cachés cohérents.

## V1.5 : style chibi et muscles exagérés
- Style « chibi » plus attachant : grosse tête, grands yeux brillants qui clignent, joues roses, modelé doux en dégradé, contours de la même teinte.
- Musculature exagérée : niveau 0 = membres en fil de fer, niveau 4 = muscles énormes. Un retard devient visible et comique (ex. jambes en allumettes sous un torse de bodybuilder).
- Croissance progressive : chaque séance qui travaille un muscle le fait grossir de +0,15 à +0,5 (selon le nombre de séries), jusqu'au niveau de force + 0,5. Une petite évolution se voit presque à chaque séance.

## V1.6 : corps humain détaillé, tête mascotte
- Toutes les formes (sauf l'œuf) ont un **corps humain musclé et détaillé** en pose double biceps : formes, ombres, reflets. Seule la tête est animale, sans muscles.
- Tête « mascotte » : grands yeux brillants à iris orangé, sourcils épais, bec ouvert souriant (poussin, poules), crête rouge en lobes et barbillons (poules), museau souriant à petits crocs (dinos, dragons). Les plumes de la tête sont une teinte claire de la couleur du corps, pour que tête et corps restent assortis.
- Chaque muscle a sa propre épaisseur selon son niveau (0 = allumette, 4,5 = bodybuilder) : pecs, dorsaux et trapèzes, deltoïdes, biceps, triceps, avant-bras, abdos, cuisses et mollets.
- Récompenses visuelles : **veines** quand bras ou abdos sont très développés, **brillance de transpiration** quand la moyenne est élevée.
- Deux ambiances au choix dans la fiche du Gymon : **Aesthetic** (par défaut, short noir) et **Compétition** (clin d'œil, short violet). Réglage `S.profile.gymonStyle`.

- **Vue de dos** (bouton « ↻ Dos » à côté du nom du stade, à partir du poussin) : pose double biceps de dos. Dos → trapèzes, sus-épineux, grand V des dorsaux, lombaires ; Jambes → fessiers (dessinés dans le short moulant), ischios, mollets ; Triceps en fer à cheval ; deltoïdes arrière. Ailes et queue passent du bon côté, la tête montre la nuque (plumes ou épines).

## V1.7 : nouvelle vitalité
- Toujours en proportion de la vitalité actuelle : -20 % au 2ᵉ jour sans séance, puis -10 % par jour ; mort sous 10 % (22 jours sans séance depuis 100 %).
- Chaque séance l'augmente de 20 % (ex. 50 % → 60 %), de 50 % s'il est sous 30 % (ex. 20 % → 30 %) ; une séance 3 jours de suite = retour à 100 %.
- Mise à jour : un Gymon existant repart avec au moins 60 % (personne ne meurt à cause de la mise à jour).

## V1.8 : phrase du jour
- 50 phrases motivantes (`GYM_QUOTES`) : une par jour, différente chaque jour, toutes vues avant de revenir. Les alertes de santé, l'œuf et l'évolution proche gardent leurs messages.
- Phrase écrite plus petite (15 px). Tuto simplifié sur la vitalité (le détail des règles reste dans ce document).

## V1.9 : un Gymon unique, qui parle et qui se partage
- **Couleur et short tirés à la naissance**, gardés à toutes les évolutions : 20 couleurs (`GYM_COLORS`), dont 3 rares (Or, Argent, Obsidienne, 2 % chacune, avec des éclats scintillants) et 10 couleurs de short (`GYM_SHORTS`). Les taches de l'œuf annoncent sa couleur. Les Gymon d'avant la v1.9 reçoivent leur couleur à la mise à jour.
- **Nom** : à l'éclosion (dans la célébration), ou en touchant « Donner un nom » sur la page ; 🎲 propose un nom au hasard.
- **Bulles de dialogue** (phrases écrites, choisies selon les données) : repas et record du jour, séries en plus vs la dernière fois, muscle en retard, muscle oublié depuis 10 jours, muscle qui chauffe, petit creux, humeur. Toucher la bulle : phrase suivante.
- **Effets sur les muscles** : rouge pendant 24 h sur les muscles qui viennent de grossir ; fumée animée sur les muscles en récupération (< 90 %).
- **Célébration de fin de séance** : plein écran, confettis, Gymon qui saute, muscles gagnés (+0,2…), records, boutons Partager / Continuer.
- **Évolution en plein écran** : silhouettes blanches qui alternent de plus en plus vite, flash, révélation avec rayons, « X est devenu … ! ».
- **Partage** : carte image 1080×1350 (Gymon, nom, stade, couleur rare, stats de la semaine ou de la séance, 3 meilleures séries), créée dans le téléphone et envoyée par le partage de l'iPhone. Aucun serveur.
- L'ambiance (Aesthetic / Compétition) ne règle plus que l'expression (clin d'œil en Compétition).

## Visuel
Dessin vectoriel (SVG) généré dans la page, sans bibliothèque : œuf qui se fissure, poussin, poulet puis dinosaure humanoïdes.
- **Dos** : largeur du torse et dorsaux. **Pectoraux** : taille des pecs. **Épaules** : deltoïdes. **Biceps / triceps** : bras. **Jambes** : cuisses et mollets. **Abdos** : tablettes.
- **Poids** : ventre. **Vitalité** : couleurs et yeux mi-clos quand elle est basse. Respiration lente (désactivée si « réduire les animations »).

## Tests
- `node tests/regression.js` : non-régression (bibliothèque, associations exercice → muscle, 1RM, coach, force, récupération, routine, import Gravl, carnet et persistance), comparés aux valeurs enregistrées **avant** la créature (`tests/golden.json`).
- `node tests/creature.js` : départ œuf, volume (1 330 kg pour 70×10 + 70×9), pas de double comptage, persistance, stades sans saut ni perte, musculature sans régression, règles de vitalité en proportion (80 % à 2 j, 72 % à 3 j, mort à 22 j), pause de 5 jours (58 %, rien perdu), reprise (×1,2), 3 jours de suite (100 %).
- Prérequis : Node et Playwright (Chromium). Non testé sur Safari iOS réel.

## Hors MVP / pistes
Animations pendant les séries, nom et personnalisation, réactions à chaque record, seuils calibrés sur les premiers retours, mesure de l'effet (fréquence avant / après).

*Assisté par IA*
