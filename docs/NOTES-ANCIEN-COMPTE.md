# Notes de passation de l'ancien compte Claude (11 novembre 2026)

Relecture faite depuis la dernière session de l'**ancien** compte, après la migration. Ce fichier ne touche pas à l'app : seuls `index.html` et `sw.js` comptent pour les testeurs.

**À faire par la session du nouveau compte** : traiter les points ci-dessous, reporter ce qui doit l'être dans `docs/CONTEXTE.md`, `CLAUDE.md`, `docs/AUDIT-2026-11.md` ou `docs/MIGRATION.md`, puis supprimer ce fichier.

Chaque point dit s'il est **vérifié** (dans le code, le dépôt ou l'API GitHub) ou **déduit**.

## 1. Erreurs à corriger dans la documentation

1. **Le dépôt est public, pas privé** (vérifié : l'API GitHub renvoie `private: false`). `docs/AUDIT-2026-11.md` dit « Tant que le dépôt est privé… » et recommande de « garder le dépôt privé ». En réalité, `docs/CONTEXTE.md`, `docs/AUDIT-2026-11.md` (inventaire de la propriété intellectuelle, stratégie business), `.retours-utilisateurs.md` et tout le code sont lisibles par tous. Passer le dépôt en privé tout en gardant GitHub Pages demande a priori une offre GitHub payante (à vérifier) ; sinon, envisager de sortir les documents sensibles du dépôt. **Décision du propriétaire à prendre.** Le risque « propriété et droits » de l'audit est sous-estimé.
2. **`docs/CONTEXTE.md`, section 6** : « Un stade, une fidélité, un niveau ne se perdent jamais ». Faux depuis Gymon v2.0 : les niveaux de muscle **fondent** après 14 jours sans travail (vérifié, `CREATURE.md` et `muscleLevel`). Seuls le stade et la fidélité ne baissent jamais. La règle 3 de `CLAUDE.md` (« rien ne se perd *par une mise à jour* ») reste juste.
3. **Tutoiement / vouvoiement « cohérents par zone »** (`CLAUDE.md` règle 8, audit 4.4) : inexact sur la page Gymon. Les bulles tutoient (« Laisse-les souffler »), la phrase du jour juste en dessous (`GYM_QUOTES`) et la célébration vouvoient (« Votre futur vous dit merci »). Vérifié. À trancher par le propriétaire.
4. **Audit, section 5, « Données personnelles : aucune trouvée »** : vrai pour les fichiers, mais l'historique git public contient l'adresse e-mail professionnelle du propriétaire comme auteur des commits de l'ancien compte (vérifié). `CLAUDE.md` demande désormais l'adresse personnelle : cohérent pour l'avenir. Réécrire l'historique serait une décision à part (force push), non recommandée sans raison forte.

## 2. Inexactitudes mineures

5. GitHub Pages « depuis le 29 oct. » (`CONTEXTE.md`, section 6) : l'app y est hébergée depuis le 24–25 octobre, dès qu'elle est devenue autonome (déduit des conversations de l'ancien compte).
6. « 50 commits sur `main` » : 61 au 11 novembre (vérifié), ce fichier compris : 62.
7. `CONTEXTE.md`, section 11 : la ligne « hébergeur : ______ » est restée vide alors que la ligne au-dessus dit GitHub Pages.
8. `docs/MIGRATION.md` : la section 2 parle encore de fusionner la branche `claude/nice-gauss-e06uu4` (déjà faite) et la checklist n'est pas cochée. La migration est **terminée** (dit par le propriétaire le 11 novembre) : à marquer comme telle.

## 3. Manques dans `docs/CONTEXTE.md`

9. **Vérifier le contrat de travail du propriétaire** (clauses d'exclusivité, de non-concurrence ou de propriété intellectuelle) avant toute valorisation commerciale. Recommandé dans les conversations, absent des documents.
10. **Questions ouvertes** non notées : barre EZ ou droite par défaut pour « Barre au front » (aujourd'hui droite, 20 kg) ; afficher dans « pourquoi ? » le nombre de mesures de l'historique personnel utilisées pour la fatigue (« calculé sur 23 mesures » / « valeur par défaut »). Le détail des disques sur la barre figure déjà dans les pistes.
11. **Pied de commit** : l'ancien compte terminait chaque message par `Co-Authored-By: Claude …` et `Claude-Session: …`. Non mentionné ; au propriétaire de dire s'il garde cette pratique.

## 4. Comment travaillait l'ancien compte (pour reproduire les mises à jour)

- Claude Code dans le cloud (claude.ai/code), dépôt cloné dans le conteneur ; accès GitHub en écriture via le compte GitHub connecté à Claude (application GitHub de Claude), à travers le proxy de l'environnement ; aucun jeton manipulé.
- Travail directement sur `main` : `git fetch origin main`, puis `git push -u origin main` après chaque modification validée par le propriétaire (règle reprise dans `CLAUDE.md`, section « Hébergement et déploiement »).
- Étapes : modifier → `node tests/regression.js --update` seulement pour un changement de calcul voulu → six suites vertes → captures de contrôle au format iPhone dans un dossier temporaire (jamais dans le dépôt) → `APP_VERSION` et `CACHE` incrémentés → `WHATS_NEW` si nouveauté qui change l'usage → `ALGORITHME.md` / `CREATURE.md` → commit → push → `git ls-remote origin main` pour vérifier. GitHub Pages publie `main` ; les testeurs ferment et rouvrent l'app.
- L'API GitHub Pages et l'URL `github.io` n'étaient pas joignables depuis le conteneur : le déploiement lui-même n'a jamais pu être vérifié depuis la session, seulement l'arrivée du commit sur `main`.

## 5. Fin de l'ancien compte

Ce fichier est le **dernier envoi** de l'ancien compte. Conformément à `docs/MIGRATION.md` (section 4), aucune autre session de l'ancien compte ne poussera sur ce dépôt. `index.html` et `sw.js` n'ont pas été modifiés.

---
*Assisté par IA. Le collaborateur reste responsable et vérifie.*
