# Migrer Gymon vers un autre compte

Guide écrit le 11 novembre 2026, à suivre le jour de la migration. Il couvre le dépôt GitHub, l'hébergement de l'app, les comptes annexes et surtout les données des testeurs, qui sont le point délicat.

À lire avant de commencer : la section 1, qui conditionne tout le reste.

---

## 1. Le point qui décide de tout : l'URL de l'app

Les données de chaque utilisateur (séances, Gymon, réglages) sont dans le `localStorage` de son téléphone, **lié à l'origine de l'app** (protocole + domaine + port). L'icône sur l'écran d'accueil pointe aussi vers cette URL.

Conséquences :
- **Si l'URL ne change pas**, la migration est invisible pour les utilisateurs. On change le dépôt, le compte, l'hébergeur derrière, personne ne s'en aperçoit.
- **Si l'URL change**, chaque utilisateur se retrouve avec une app vide à la nouvelle adresse, et son ancien Gymon reste à l'ancienne. Il n'existe aucun moyen automatique de déplacer un `localStorage` d'une origine à une autre.

Règle : **garder la même URL**. Deux façons :
1. Un **domaine à soi** (par exemple un nom de domaine pointé sur l'hébergeur). Il se transfère entre comptes et entre hébergeurs sans changer l'adresse vue par les utilisateurs. C'est la solution durable, à mettre en place avant la migration si ce n'est pas déjà fait.
2. Garder le **même hébergeur et le même site**, et seulement changer le compte propriétaire ou la source de déploiement (voir section 4).

Si changer d'URL est inévitable, voir la section 7 pour le parcours de secours.

## 2. Ce qui part avec le dépôt, ce qui ne part pas

| Part avec le dépôt (git) | Ne part pas, à refaire ou à transférer |
|---|---|
| Tout le code et l'historique des commits | Les conversations Claude et leur mémoire |
| `CLAUDE.md`, `docs/`, `ALGORITHME.md`, `CREATURE.md` | Les réglages de l'environnement Claude Code (dépôts autorisés, secrets, réseau) |
| Les tests et leurs valeurs de référence | Le compte GoatCounter (`gymon`) |
| Les photos et icônes | Le site chez l'hébergeur et son URL |
| `.retours-utilisateurs.md` | Le domaine, s'il y en a un |
| | Les issues, discussions et réglages GitHub, sauf transfert natif (section 3, option A) |
| | La liste des testeurs (hors dépôt, à garder privée) |

## 3. Le dépôt GitHub

Deux options.

### Option A : transfert natif (recommandée)
GitHub permet de transférer un dépôt vers un autre compte ou une organisation : Settings du dépôt → Danger Zone → « Transfer ownership ». Le nouveau compte doit accepter.
- Conserve commits, branches, issues, étoiles, et met en place une **redirection** de l'ancienne adresse vers la nouvelle (les clones existants continuent de fonctionner un temps).
- Si GitHub Pages est utilisé sur ce dépôt, le site est à reconfigurer sur le nouveau compte, et son URL change (elle contient le nom du compte). Voir section 4.
- Le nouveau propriétaire doit pouvoir créer un dépôt du même nom (pas de conflit).

### Option B : nouveau dépôt et miroir
Créer un dépôt vide sur le nouveau compte, puis depuis une copie locale :
```
git clone --mirror https://github.com/bricetourtel-design/carnet-fonte
cd carnet-fonte.git
git push --mirror https://github.com/<nouveau-compte>/carnet-fonte
```
Conserve tout l'historique et toutes les branches. Ne conserve ni issues ni réglages. Pas de redirection : prévenir toute personne qui a un clone.

Dans les deux cas, ensuite :
- Supprimer la branche obsolète `claude/accueil-premier-lancement` (historique du 29 octobre, réécrit depuis) si elle a été transférée.
- Mettre le dépôt en **privé** si ce n'est pas le cas, tant que la question de la licence n'est pas tranchée.
- Mettre à jour `docs/CONTEXTE.md`, section 1, avec la nouvelle adresse du dépôt.

## 4. L'hébergement de l'app

D'abord retrouver où l'app est réellement servie (l'URL n'est pas dans le dépôt). `LISEZMOI.txt` mentionne Netlify Drop ou GitHub Pages.

### Si Netlify
- Un site Netlify se transfère entre comptes (Site settings → « Transfer site ») ou se partage via une équipe. L'URL `*.netlify.app` est conservée.
- Si le site a été créé par glisser-déposer (Drop), il n'est lié à aucun dépôt : le déploiement reste manuel. L'occasion de le relier au nouveau dépôt pour déployer à chaque push sur `main` (Site settings → Build & deploy → Link repository ; pas de commande de build, dossier de publication `/`).
- Ajouter un domaine à soi si ce n'est pas déjà fait (section 1).

### Si GitHub Pages
- L'URL contient le nom du compte (`<compte>.github.io/carnet-fonte`) : elle **change** avec le compte. Seul un domaine à soi (fichier `CNAME` à la racine et réglage Pages) permet de garder l'adresse.
- Après transfert, réactiver Pages sur le nouveau dépôt (Settings → Pages → branche `main`, dossier `/`).

### Si un autre hébergeur ou un serveur
Même logique : garder l'URL, ou mettre un domaine devant.

### Vérifier après le déploiement
1. Ouvrir l'URL dans Safari sur un iPhone de test : l'app charge, le service worker s'installe (l'app fonctionne ensuite en mode avion).
2. Sur un iPhone déjà installé : revenir dans l'app, elle doit se mettre à jour sans perdre le Gymon (la vérification de mise à jour se fait au retour dans l'app).
3. `APP_VERSION` affichée en bas de l'onglet Exercices correspond à ce qui a été déployé.

## 5. Les comptes annexes

- **GoatCounter** (`gymon.goatcounter.com`) : compte lié à une adresse e-mail. Soit changer l'e-mail du compte, soit créer un nouveau compte et changer `GC_CODE` dans `index.html` (une ligne, puis incrémenter `APP_VERSION` et `CACHE`). L'historique des compteurs ne se transfère pas d'un code à l'autre.
- **Domaine** : transfert entre registrars ou changement de titulaire selon le registrar. Garder les enregistrements DNS identiques.
- **Claude Code** : sur le nouveau compte, connecter GitHub, autoriser le nouveau dépôt, créer l'environnement. `CLAUDE.md` se charge automatiquement à la première session ; la première chose à demander est de lire `docs/CONTEXTE.md` et `docs/AUDIT-2026-11.md`.

## 6. Checklist le jour J

Avant :
- [ ] URL de production identifiée, décision prise sur le domaine (section 1).
- [ ] Export de sauvegarde fait par le propriétaire sur son propre téléphone (Exercices → Exporter mes données), et gardé hors dépôt.
- [ ] Tests verts sur `main` (`node tests/*.js`).
- [ ] `docs/CONTEXTE.md` section 11 renseignée (URL, hébergeur, comptes).

Pendant :
- [ ] Dépôt transféré ou miroité (section 3).
- [ ] Hébergement transféré ou relié au nouveau dépôt (section 4).
- [ ] GoatCounter traité (section 5).
- [ ] Claude Code connecté au nouveau dépôt.

Après :
- [ ] Vérifications de la section 4 sur un iPhone déjà installé et sur un iPhone neuf.
- [ ] Ancienne adresse du dépôt et ancien compte : accès retirés ou dépôt archivé.
- [ ] `docs/CONTEXTE.md` section 1 mise à jour, commit « Migration du projet vers <compte> ».
- [ ] Testeurs prévenus seulement si quelque chose change pour eux.

## 7. Parcours de secours si l'URL doit changer

À n'utiliser que si la section 1 n'a pas pu être respectée. Il demande un développement avant la migration.

1. Déployer à l'**ancienne** URL une dernière version qui, à l'ouverture, affiche un écran « Gymon déménage » avec :
   - un bouton qui exporte les données en fichier (`gymon-sauvegarde.json`, via un lien de téléchargement, comme le fait déjà le partage d'image) ;
   - le lien vers la nouvelle URL et la consigne d'importer le fichier depuis Exercices → Importer, puis de réinstaller l'icône sur l'écran d'accueil.
2. Déployer à la **nouvelle** URL la version courante, avec l'import existant (il accepte déjà les exports et ignore les doublons).
3. Garder l'ancienne URL en ligne plusieurs semaines : les testeurs ne reviennent pas tous le même jour, et Safari ne conserve pas éternellement les données d'un site non installé.
4. Prévenir les testeurs par le canal habituel.

Ce qui sera perdu malgré tout : les utilisateurs qui ne font pas la manipulation. C'est pourquoi la section 1 passe avant.

## 8. Ce que la migration ne change pas

- Les règles, les textes, les identifiants d'exercices, la clé `localStorage`, le nom du cache : rien dans le code n'a à changer pour une migration de compte. Seule `GC_CODE` peut changer si le compte GoatCounter change.
- Les promesses aux utilisateurs : pas de serveur, pas de compte, données dans le téléphone.

---
*Assisté par IA. Le collaborateur reste responsable et vérifie. Les écrans et menus des services cités (GitHub, Netlify) évoluent : vérifier sur place le jour de la migration.*
