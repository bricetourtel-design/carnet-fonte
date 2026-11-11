# Migrer Gymon vers un autre compte Claude

Guide écrit le 11 novembre 2026. Cas visé : **changer de compte Claude uniquement**. Le compte GitHub, le dépôt, l'historique git, l'hébergement et l'URL de l'app ne changent pas. Pour les utilisateurs de l'app, rien ne bouge.

L'annexe, en fin de document, couvre le cas différent où un jour le dépôt ou l'URL devraient changer. Elle n'est pas à suivre pour la migration prévue.

---

## 1. Ce qui change et ce qui ne change pas

| Ne change pas | Change |
|---|---|
| Compte GitHub `bricetourtel-design` et dépôt `carnet-fonte` | Le compte Claude utilisé pour travailler sur le dépôt |
| Historique git complet, branches, fichiers | L'historique des conversations Claude (il reste sur l'ancien compte, il ne se transfère pas) |
| Hébergement, URL de l'app, service worker, données des testeurs sur leurs téléphones | L'environnement cloud Claude Code (dépôts autorisés, réglages) : à recréer sur le nouveau compte |
| GoatCounter, domaine éventuel | Les règles d'usage liées à l'ancien compte, s'il relevait d'une organisation |

Autrement dit : **tout ce qui a de la valeur est dans le dépôt GitHub**, et le dépôt ne bouge pas. La seule chose qui ne suit pas, ce sont les conversations. C'est pour ça que `CLAUDE.md`, `docs/CONTEXTE.md` et `docs/AUDIT-2026-11.md` existent : ils remplacent la mémoire des conversations.

## 2. Avant de changer de compte (depuis l'ancien compte)

1. **Fusionner la branche de documentation dans `main`.** Les fichiers `CLAUDE.md` et `docs/` sont sur la branche `claude/nice-gauss-e06uu4`. Tant qu'ils ne sont pas sur `main`, une nouvelle session partira sans eux. Ouvrir une pull request et la fusionner, ou fusionner localement :
   ```
   git fetch origin
   git checkout main
   git merge origin/claude/nice-gauss-e06uu4
   git push origin main
   ```
2. **Vider les conversations de ce qui n'est pas dans le dépôt.** Relire les conversations Gymon de l'ancien compte et noter dans `docs/CONTEXTE.md` (sections 6 « Décisions » et 10 « Pistes ») toute décision ou idée qui n'y figure pas encore. Dix lignes suffisent. Commit, push.
3. **Renseigner la section 11 de `docs/CONTEXTE.md`** : URL de production, hébergeur. Ces deux informations ne sont nulle part dans le dépôt et toute session future en aura besoin.
4. **Supprimer la branche obsolète** `claude/accueil-premier-lancement` sur GitHub (historique du 29 octobre, réécrit depuis), pour que le nouveau compte ne la prenne pas pour du travail en cours. Supprimer aussi `claude/nice-gauss-e06uu4` une fois fusionnée.
5. Vérifier que `main` est vert : `node tests/regression.js` et les cinq autres suites.

Rien de tout cela ne touche à l'app ni aux testeurs.

## 3. Sur le nouveau compte Claude

1. **Connecter GitHub** depuis le nouveau compte : https://claude.ai/connect-github. Se connecter avec le même compte GitHub `bricetourtel-design`. Si l'application GitHub « Claude » n'est pas déjà installée pour ce compte GitHub, l'installer depuis cette même page et y sélectionner le dépôt `carnet-fonte` (ou tous les dépôts).
2. **Ouvrir une première session Claude Code** avec le dépôt `bricetourtel-design/carnet-fonte` sélectionné. `CLAUDE.md` se charge automatiquement.
3. **Première demande** à faire dans cette session, mot pour mot ou presque : « Lis `CLAUDE.md`, `docs/CONTEXTE.md` et `docs/AUDIT-2026-11.md`, puis dis-moi en dix lignes ce que tu as compris du projet et ce que tu proposes de faire en premier. » Si la réponse est juste, la migration est réussie.
4. Si l'ancien compte relevait d'une organisation avec ses propres règles (charte, mentions obligatoires), vérifier ce qui reste applicable sur le nouveau compte. `CLAUDE.md` demande la mention « Assisté par IA » sur les documents : la garder, elle figure déjà dans l'app.

## 4. Après la migration (depuis l'ancien compte)

1. Ne plus ouvrir de session sur le dépôt depuis l'ancien compte, pour éviter deux branches qui divergent sur `index.html`.
2. Si l'ancien compte doit perdre l'accès au dépôt : dans les réglages GitHub, Settings → Applications → Claude → Configure, retirer `carnet-fonte` de la liste, ou désinstaller l'application si elle n'a plus d'usage. Attention : c'est la même application GitHub qui sert au nouveau compte Claude si les deux utilisent le même compte GitHub. Dans ce cas, ne rien retirer ; c'est le compte Claude qui n'a plus de session, pas GitHub.
3. Les conversations de l'ancien compte peuvent être supprimées une fois l'étape 2 de la section 2 faite.

## 5. Checklist

- [ ] Branche de documentation fusionnée dans `main`
- [ ] Décisions et idées des anciennes conversations reportées dans `docs/CONTEXTE.md`
- [ ] Section 11 de `docs/CONTEXTE.md` renseignée (URL, hébergeur)
- [ ] Branches obsolètes supprimées sur GitHub
- [ ] Tests verts sur `main`
- [ ] GitHub connecté sur le nouveau compte Claude, dépôt autorisé
- [ ] Première session : lecture des trois documents, résumé correct
- [ ] Plus de session depuis l'ancien compte

Durée estimée : une heure, dont l'essentiel pour relire les anciennes conversations.

## 6. Ce qu'il ne faut surtout pas faire

- Transférer ou recréer le dépôt GitHub : inutile ici, et cela changerait l'adresse de GitHub Pages si l'app y est hébergée.
- Changer l'URL de l'app. Les données de chaque testeur sont dans le `localStorage` de son téléphone, lié à cette URL. Changer d'adresse les effacerait pour tout le monde.
- Redéployer l'app « pour marquer la migration ». Aucun fichier de l'app ne change, aucun déploiement n'est nécessaire.

---

## Annexe : si un jour le dépôt ou l'URL devaient changer

Ce n'est pas le cas prévu. Conservé pour mémoire.

### Changer de compte GitHub
- Transfert natif : Settings du dépôt → Danger Zone → « Transfer ownership ». Conserve commits, branches, issues ; GitHub redirige l'ancienne adresse. Si GitHub Pages est utilisé sur ce dépôt, son URL change avec le nom du compte.
- Miroir : `git clone --mirror` puis `git push --mirror` vers un dépôt vide. Conserve l'historique, pas les issues ni la redirection.

### Changer d'URL d'app
Il n'existe aucun moyen automatique de déplacer un `localStorage` d'une origine à une autre. La seule protection durable est un **domaine à soi** posé devant l'hébergeur : il se transfère sans changer l'adresse vue par les utilisateurs.

Parcours de secours si le changement est inévitable :
1. Déployer à l'ancienne URL une dernière version qui affiche « Gymon déménage », avec un bouton d'export en fichier et le lien vers la nouvelle adresse.
2. Déployer la version courante à la nouvelle URL ; l'import existant accepte les exports et ignore les doublons.
3. Garder l'ancienne URL en ligne plusieurs semaines et prévenir les testeurs.
Les utilisateurs qui ne font pas la manipulation perdent leur Gymon.

### Comptes annexes
- GoatCounter : changer l'e-mail du compte, ou créer un compte et changer `GC_CODE` dans `index.html` (puis incrémenter `APP_VERSION` et `CACHE`).
- Netlify : un site se transfère entre comptes (Site settings → Transfer site) en gardant son URL. Un site déployé par glisser-déposer n'est lié à aucun dépôt ; le relier au dépôt permet de déployer à chaque push.
- GitHub Pages : réactiver sur le nouveau dépôt (Settings → Pages). L'URL contient le nom du compte, sauf domaine à soi.

---
*Assisté par IA. Le collaborateur reste responsable et vérifie. Les écrans et menus des services cités évoluent : vérifier sur place le jour de la migration.*
