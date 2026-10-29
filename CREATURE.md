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
| Stades | Œuf → Poussin → Poulet humanoïde → Dinosaure humanoïde, selon la fidélité (séances validées). Jamais perdus, jamais sautés. **Seuils tirés au hasard à la naissance, propres à chaque Gymon et jamais affichés** : l'évolution reste une surprise | `stageRange: [[0,0],[2,3],[8,13],[25,35]]` |
| Fidélité | +1 par séance validée, ne baisse jamais. Une séance n'est comptée qu'une fois (liste des séances déjà « mangées ») | – |
| Poids | Repas = volume soulevé. Gain = tonnes × coefficient du stade × facteur de régularité (0,7 à 1,3) | `foodPerTonne: [0.002, 0.03, 0.25, 1]`, `minWeight` |
| Taille | Liée à la maturité : progresse avec la fidélité à l'intérieur de chaque stade | `height` |
| Musculature | 5 niveaux par muscle. Niveau visé = score de force existant (0–5), ou séries faites depuis la naissance (abdos, pas de poids de corps). **Seuls les muscles réellement travaillés dans la séance (au moins une série validée) progressent, d'un niveau au plus par séance.** Ne baisse jamais | `levelThresholds`, `setsThresholds` |
| Régularité | Séances validées sur 14 jours, objectif 6 (3/semaine) | `freq` |
| Vitalité | 100 % jusqu'à 7 jours sans séance, puis −6 %/jour, minimum 20 %. Remonte à 100 % à la séance suivante. N'efface rien | `vitality` |

Le profil 1,90 m / 93 kg a servi à vérifier le rendu. Les seuils de musculature reposent sur le score de force existant (rapporté au poids de corps de l'utilisateur), pas sur des kilos fixes.

## Correctif V1.1
La première version recalculait tous les muscles à chaque séance à partir de l'historique de force : une séance pecs faisait grossir le dos ou les jambes. Corrigé ; la musculature des créatures existantes est recalculée une fois à partir des seules séances réellement faites.

## V1.2 : magie et mystère
- Le terme « créature » devient **Mon Gymon** (onglet « Gymon »).
- Page épurée : le Gymon en plein écran avec une aura et des étincelles, 4 petites infos en verre aux coins (poids, taille, vitalité, force), un indice mystérieux à la place du compte à rebours (« Quelque chose remue à l'intérieur… »). Le prochain stade n'est jamais nommé. Le détail des muscles s'ouvre en touchant le Gymon.
- Les Gymon existants reçoivent des seuils cachés cohérents avec le stade déjà atteint.

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
