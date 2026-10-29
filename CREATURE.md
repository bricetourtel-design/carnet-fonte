# Créature évolutive – MVP V1

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
| Stades | Œuf → Poussin → Poulet humanoïde → Dinosaure humanoïde, selon la fidélité (séances validées). Jamais perdus, jamais sautés | `stageAt: [0, 2, 10, 30]` |
| Fidélité | +1 par séance validée, ne baisse jamais. Une séance n'est comptée qu'une fois (liste des séances déjà « mangées ») | – |
| Poids | Repas = volume soulevé. Gain = tonnes × coefficient du stade × facteur de régularité (0,7 à 1,3) | `foodPerTonne: [0.002, 0.03, 0.25, 1]`, `minWeight` |
| Taille | Liée à la maturité : progresse avec la fidélité à l'intérieur de chaque stade | `height` |
| Musculature | 5 niveaux par muscle, depuis le score de force existant (0–5) ; sans score (abdos, pas de poids de corps), depuis le nombre de séries. Ne baisse jamais | `levelThresholds`, `setsThresholds` |
| Régularité | Séances validées sur 14 jours, objectif 6 (3/semaine) | `freq` |
| Vitalité | 100 % jusqu'à 7 jours sans séance, puis −6 %/jour, minimum 20 %. Remonte à 100 % à la séance suivante. N'efface rien | `vitality` |

Le profil 1,90 m / 93 kg a servi à vérifier le rendu. Les seuils de musculature reposent sur le score de force existant (rapporté au poids de corps de l'utilisateur), pas sur des kilos fixes.

## Visuel
Dessin vectoriel (SVG) généré dans la page, sans bibliothèque : œuf qui se fissure, poussin, poulet puis dinosaure humanoïdes.
- **Dos** : largeur du torse et dorsaux. **Pectoraux** : taille des pecs. **Épaules** : deltoïdes. **Biceps / triceps** : bras. **Jambes** : cuisses et mollets. **Abdos** : tablettes.
- **Poids** : ventre. **Vitalité** : couleurs et yeux mi-clos quand elle est basse. Respiration lente (désactivée si « réduire les animations »).

## Tests
- `node tests/regression.js` : non-régression (bibliothèque, associations exercice → muscle, 1RM, coach, force, récupération, routine, import Gravl, carnet et persistance), comparés aux valeurs enregistrées **avant** la créature (`tests/golden.json`).
- `node tests/creature.js` : départ œuf, volume (1 330 kg pour 70×10 + 70×9), pas de double comptage, persistance, stades sans saut ni perte, musculature sans régression, pause de 20 jours (vitalité 22 %, rien perdu), reprise.
- Prérequis : Node et Playwright (Chromium). Non testé sur Safari iOS réel.

## Hors MVP / pistes
Animations pendant les séries, nom et personnalisation, réactions à chaque record, seuils calibrés sur les premiers retours, mesure de l'effet (fréquence avant / après).

*Assisté par IA*
