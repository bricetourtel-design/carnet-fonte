# Algorithme de progression – Gymon

Objectif : prise de masse musculaire (hypertrophie). Aucune IA : règles fixes, calculées dans le téléphone.

## Principes issus de la littérature
| Principe | Règle dans l'app | Source |
|---|---|---|
| L'hypertrophie est similaire de ~5 à 30 reps si l'effort est proche de l'échec, mais la force progresse mieux avec des charges lourdes, et le RIR s'estime mal au-delà de ~12–15 reps | Fourchettes v2, plus lourdes et plus étroites : 5–8 (gros polyarticulaires à la barre), 6–10 (autres polyarticulaires, haltères, machines), 8–12 (isolation), 10–15 (petits muscles : élévations, face pull, mollets, poignets), 12–20 (abdos). Modifiable par exercice | Schoenfeld et al. 2017, *J Strength Cond Res* 31(12) ; Schoenfeld et al. 2021, *Sports* 9(2):32 ; Zourdos et al. 2021 (précision du RIR) |
| Être proche de l'échec favorise un peu l'hypertrophie | Cible : 1 à 2 reps en réserve (RIR) sur chaque série | Robinson et al. 2024, *Sports Medicine* 54(9) |
| Le RIR s'estime bien (~1 rep près) quand on est à 0–3 RIR | Barre de ressenti à 5 niveaux après chaque exercice | Helms et al. 2016 (échelle RPE basée sur le RIR) |
| Progresser en reps ou en charge donne une hypertrophie similaire | Double progression : on ajoute des reps jusqu'au haut de la fourchette, puis on monte la charge | Plotkin et al. 2022, *PeerJ* 10:e14142 |
| Plus de volume hebdomadaire = plus d'hypertrophie, avec rendements décroissants | Suivi des séries par muscle sur 7 jours, cible 10–20 ; +1 série si < 10 et récupération correcte (max 4 par exercice) | Pelland et al., *Sports Medicine* 2025 (préprint 2024) |
| Décharge : période de stress réduit pour récupérer | -10 % de charge et -1 série après 3 séances « Dur/Trop dur » ou un 1RM estimé en baisse de plus de 5 % sur 3 séances, ces 3 séances tenant en moins de 6 semaines | Bell et al. 2023, *Sports Medicine – Open* (consensus Delphi) |

## Audit v2 (novembre 2026)
Simulation sur un historique réel de 43 exercices : l'ancien coach proposait de **baisser la charge sur 21 exercices** et de l'augmenter sur 1 seul, car les fourchettes d'isolation (10–15, 12–20) étaient au-dessus des habitudes et la moindre série sous la fourchette faisait baisser la charge. Après correction : 4 baisses (reps vraiment trop basses), 3 hausses de charge, 35 progressions en reps à charge égale. Les tractions sans ressenti noté ne restent plus bloquées en « Consolider ». La décharge ne se déclenche plus sur le bruit de séances espacées.

## Séances lourdes et séances volume (périodisation ondulante, v2.1)
Sur les polyarticulaires chargés (fourchettes 5–8 et 6–10, hors poids du corps et fourchettes choisies à la main), l'app alterne d'une séance à l'autre pour chaque exercice :

| Type | Barre (développé, squat, rowing…) | Autres polyarticulaires | Repos |
|---|---|---|---|
| **Lourd** : charge la plus haute possible | 4–6 reps | 5–7 reps | 3 min |
| **Volume** : plus de reps | 8–10 reps | 8–12 reps | 2 min |

- Le type suit la dernière séance de l'exercice : après une séance lourde (reps moyennes ≤ haut de la fourchette lourde + 1), une séance volume, et inversement.
- Charge calculée depuis la force la plus récente (1RM estimé de la dernière séance, corrigé par le ressenti) : lourd → bas de la fourchette lourde ; volume → bas de la fourchette volume + 2 reps, à 1–2 reps en réserve.
- Jamais de recul par rapport à la dernière séance du même type réussie (moins de 5 semaines) : même charge → +1 rep ; haut de fourchette atteint → +1 palier de charge.
- Isolation et petits muscles : pas d'alternance, double progression classique (8–12, 10–15, 12–20).
- Reprise après 3 semaines et décharge passent avant l'alternance.

Pourquoi : la périodisation fait mieux progresser la force que des séries toujours identiques (Williams et al. 2017, *Sports Medicine* 47(10) ; Moesgaard et al. 2022, *Sports Medicine* 52(7)), et la prise de muscle est au moins équivalente (Grgic et al. 2017, *PeerJ* 5:e3695). Plus de force = plus de charge sur les séances de volume, donc plus de tension mécanique à long terme.

## Séries d'échauffement (v2.2)
Ajoutées automatiquement (marquées « É ») seulement quand c'est utile :
- **Quand** : polyarticulaire chargé (pas les exercices d'isolation, ni le poids du corps, ni les haltères de moins de 20 kg), et seulement sur le **premier exercice de la séance pour ce muscle** : le 2ᵉ exercice pecs est déjà chaud.
- **Combien** : séance lourde (ou fourchette basse) → 2 séries, ~50 % × 8 puis ~75 % × 3 de la charge de travail ; sinon 1 série, ~60 % × 6. Barre vide (20 kg) au minimum.
- Elles ne comptent ni dans le volume, ni pour le coach, ni pour le Gymon, et ne lancent pas le minuteur. Toucher « É » la retransforme en série normale.
- Pourquoi : un échauffement spécifique et léger prépare la charge lourde sans fatiguer (les séries d'approche courtes, loin de l'échec, ne réduisent pas la performance des séries de travail). Ribeiro et al. 2020, *J Strength Cond Res* ; recommandations NSCA.

## Place de l'exercice dans la séance (fatigue, v2.3)
Un exercice fait après d'autres pour le même muscle donne moins de reps : ce n'est pas un recul.
- **Charge déjà encaissée** avant l'exercice : séries du même muscle (×1) + séries de polyarticulaires d'un muscle qui l'aide (×0,5, ex. développé → triceps).
- **Baisse de performance par série, propre à chaque utilisateur** : pour chaque exercice, on compare les séances à moins de 28 jours d'écart où il a été placé plus ou moins tard (au moins 2 séries d'écart), et on prend la pente médiane (1RM estimé). Elle est ramenée vers 1 % par série tant qu'il y a peu de mesures (8 mesures « fictives » à 1 %), et bornée entre 0,3 % et 2,5 % par série ; baisse totale plafonnée à −15 %.
- **Coach** : l'historique est d'abord ramené à un début de séance (« à frais »), les règles s'appliquent, puis l'objectif est adapté à la place du jour (moins de reps ; charge baissée seulement s'il manquerait plus d'1 rep pour atteindre le bas de la fourchette). « Pourquoi ? » l'explique et l'objectif affiche « fatigue −x % ».
- **Note de fin de séance** et **décharge** comparent les performances à frais : faire moins en fin de séance n'est pas compté comme un recul.

## Séance moins bonne : la raison (v2.4)
Quand la note de fin de séance est « Séance correcte » ou « En dessous de vos habitudes », l'app propose (facultatif) d'indiquer une ou plusieurs raisons. On peut aussi le faire plus tard depuis le détail d'une séance dans l'historique.

| Raison | Conséquence |
|---|---|
| 😴 Manque de sommeil, 🥱 fatigue générale, 🤒 malade, 🤕 douleur ou blessure, 🩸 règles (affiché avec la référence Femmes), 😣 stress, 🍽️ mal mangé ou mal hydraté, 🍻 lendemain de soirée, 🥵 chaleur, 🎯 travail technique | **Séance « hors forme »** : elle compte pour le Gymon, le volume et la récupération, mais le coach ne s'en sert pas pour les prochaines charges (ni baisse, ni décharge), ni pour mesurer la fatigue selon la place des exercices. Douleur : conseil de prudence. |
| 😶 Baisse de motivation, ⏱️ manque de temps, 🏋️ salle bondée | **Comptée normalement** (rien ne change). |

Ces informations (dont santé et cycle) restent dans le téléphone : jamais envoyées, jamais sur les images partagées.

## Ressenti → reps en réserve
| Barre | Signification | RIR utilisé |
|---|---|---|
| Trop facile | 4+ reps en réserve | 4,5 |
| Facile | 3 en réserve | 3 |
| Idéal | 1–2 en réserve | 1,5 |
| Dur | 0–1 en réserve | 0,5 |
| Trop dur | échec / reps manquées | 0 |

Sans ressenti noté : « Idéal ».

## Proposition pour la séance suivante (même exercice)
1. On prend la charge la plus lourde de la dernière séance (W) et le minimum de reps à cette charge.
2. 1RM estimé = W × (1 + (reps + RIR) / 30) (Epley corrigé par le ressenti).
3. Règles :
   - 1 ou 2 reps sous la fourchette sans difficulté (Idéal ou plus facile) → **on garde la charge** et on vise le bas de la fourchette ; « Dur » à 1 rep près → on consolide ;
   - reps nettement sous la fourchette → on baisse la charge jusqu'à pouvoir faire le bas de la fourchette à 1–2 RIR (max -15 %) ;
   - **Trop dur** → même charge, 1 rep de moins ;
   - **Dur** → même charge, mêmes reps (consolider) ;
   - **Idéal** → +1 rep ; si toutes les séries ont atteint le haut de la fourchette → +1 palier de charge ;
   - **Facile** → +2 reps ; palier de charge dès le haut de fourchette − 1 ;
   - **Trop facile** → +2 paliers de charge.
   Après une hausse de charge, les reps visées sont recalculées depuis le 1RM estimé.
4. Paliers : barre 2,5 kg ; haltères 2 kg (1 kg sous 10 kg) ; machine/poulie 2,5 kg (1 kg sous 10 kg).
5. Exercices au poids du corps : progression en reps uniquement.
6. Reprise : plus de 3 semaines sans l'exercice → -10 % de charge, 3 séries max.
7. Repos automatique : 3 min (5–8 reps), 2 min 30 (6–10), 2 min (8–12), 1 min 30 (10–15 et 12–20). Des repos de 2 à 3 min favorisent l'hypertrophie sur les polyarticulaires (Schoenfeld et al. 2016, *J Strength Cond Res* 30(7)).

## Routine de la semaine (onglet Routine)
| Principe | Règle dans l'app | Source |
|---|---|---|
| Entraîner un muscle 2 fois/semaine fait mieux qu'1 fois | Organisations proposées pour 1 à 6 séances, la « conseillée » vise 2 passages par muscle ; note si un muscle n'est vu qu'une fois | Schoenfeld et al. 2016, *Sports Medicine* 46(11) |
| À volume égal, full body et haut/bas donnent une hypertrophie similaire | Plusieurs organisations au choix, aucune imposée | Études full body vs split à volume égal (ex. BMC Sports Sci Med Rehabil 2022) |
| ≥ 48 h entre deux séances d'un même muscle | Alerte rouge si un même muscle est travaillé deux jours d'affilée (abdos exclus), orange s'il a été sollicité indirectement la veille (ex. triceps après les pecs) | Recommandation ACSM (position stand 2009) |
| L'ordre des exercices ne change pas l'hypertrophie, mais la force progresse surtout sur les premiers, et un exercice placé tard donne moins de reps (Simão et al. 2012) | Polyarticulaires en tête, gros muscles avant petits, abdos à la fin : la progression en charge se fait là où on est le plus frais | Nunes et al. 2021, *Eur J Sport Sci* 21(2) |
| 10–20 séries par muscle et par semaine | Séries ajustées (2 à 4 par exercice) pour viser au moins 10 et au plus 20 | Pelland et al. 2025 |

Choix des exercices : pour chaque muscle, les exercices les plus pratiqués dans l'historique d'abord (un polyarticulaire en premier pour pecs, dos, jambes, épaules), en alternant d'une séance à l'autre. Une nouveauté au plus tous les 30 jours, à la place d'un exercice d'isolation. ↻ propose un autre exercice.

Duos proposés : Pecs + Triceps et Dos + Biceps (muscles synergiques), Pecs + Dos (antagonistes, séries alternées), Jambes + Abdos, Épaules + Bras, Push, Pull, Haut du corps, Full body.

Le jour J, la séance prévue apparaît en premier sur l'onglet Séance (« Aujourd'hui »), puis les suivantes dans l'ordre ; un jour sans séance affiche la prochaine.

## Minuteur de repos
Un bip et un bandeau bleu en haut de l'écran avec compte à rebours à 10 s de la fin (il ne bloque pas l'écran : on peut saisir sa charge), puis 3 bips et l'écran plein écran « GO · C'est reparti ! » à la fin (5 s, toucher pour fermer). Le son se mêle à la musique dans les écouteurs (iOS 17+). Sur iPhone, le son ne sort que si l'app est ouverte et l'écran allumé.

## Points forts / points faibles (Progrès)
Niveau par exercice = 1RM estimé ÷ poids de corps, comparé à des repères de force usuels (niveau « intermédiaire » homme ; ×0,6 pour le haut et ×0,75 pour le bas en référence femmes), sur 5 niveaux de débutant à élite. Exercices au poids du corps : nombre de répétitions. Machines à disques ou guidées exclues (résistance trop variable d'un modèle à l'autre). Niveau du muscle = moyenne de ses 3 exercices les plus pratiqués (120 derniers jours si possible). Point fort / faible = au moins un demi-niveau au-dessus / en dessous de votre propre moyenne. Évolution = meilleur 1RM des 6 dernières semaines de pratique vs les 6 précédentes. Repères indicatifs, pas une norme scientifique.

## Temps par séance (Routine)
Durée estimée = 5 min d'échauffement + par exercice : séries × (40 s d'effort + repos conseillé) + 1 min 30 de transition. Le nombre d'exercices est fixé par le temps disponible (≈ 9,5 min par exercice), puis on retire des séries d'isolation et, si besoin, des exercices d'isolation jusqu'à tenir dans le temps.

## Note de fin de séance
Comparaison avec votre historique : 1RM estimé de chaque exercice vs la dernière fois (progrès > +1 %, recul < −2 %), volume vs la moyenne de vos 5 dernières séances, records battus. 😄 Excellente, 🙂 Bonne, 😐 Correcte, 😕 En dessous de vos habitudes ; 💪 Reprise réussie après plus de 3 semaines sans les exercices.

## Séance du jour (onglet Séance, jour J)
1. **Choix de la séance** : l'app compare la séance prévue, les autres séances de la semaine encore à faire et des séances par duo de muscles (Pecs + Triceps, Dos + Biceps, Jambes + Abdos…).
   Score = récupération moyenne des muscles de la séance (pondérée par leur taille) − 40 par muscle sous 50 % − 12 par muscle entre 50 et 90 % + 8 par point faible récupéré + bonus routine (15 pour la séance prévue, 6 pour une autre séance de la semaine).
   La séance prévue est gardée sauf si une autre fait au moins 10 points de mieux. Si c'est une autre séance de la semaine, les deux sont **échangées** (la séance prévue passe à son jour).
2. **Ajustements** sur la séance choisie : muscle sous 50 % → exercice retiré ; 50–90 % → allégé ; point faible récupéré → une série de plus, en tête ; exercices retirés remplacés par des muscles récupérés.
3. **Vous gardez la main** : « Autres options du jour » permet de garder la séance prévue, de choisir une autre option, ou de revenir au choix automatique.

Les propositions sont une aide : la décision finale reste celle de l'utilisateur.

*Assisté par IA*

## Statistiques anonymes (MVP)
Deux chiffres seulement, via GoatCounter (gratuit, sans cookie) : **installations** sur l'écran d'accueil (une fois par téléphone, au premier lancement depuis l'icône) et **ouvertures** de l'app (`ouverture-ecran-accueil` ou `ouverture-navigateur`, une de plus si on revient après 30 min). Aucune séance, aucun nom, aucune donnée du Gymon n'est envoyée. Désactivable dans Exercices → Réglages. Inactif tant que `GC_CODE` (code du compte GoatCounter) est vide ; jamais envoyé pendant les tests ni en local.
