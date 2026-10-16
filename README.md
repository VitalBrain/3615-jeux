# 3615 JEUX

Petits jeux de mémoire et de réflexes au style Minitel — **https://3615-jeux.com**

Jeux : 3615 MEMO, 3616 MOTS, 3617 SIMON, 3618 ANAGRAMME, 3619 RÉFLEXE.
Français / anglais, installable (PWA), jouable hors ligne, connexion Google (Firebase) pour sauvegarder les scores.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Tout le site (HTML, CSS, JavaScript) |
| `sw.js` | Service worker : installation et mode hors ligne |
| `manifest.webmanifest` + `icons/` | Nom, icônes et couleurs de l'application installée |
| `_headers` | En-têtes HTTP Netlify pour `sw.js` et le manifeste |
| `ads.txt` | Autorisation Google AdSense |
| `netlify.toml` | Réglages Netlify (site statique, pas de compilation) |

## Mettre à jour le site

Chaque modification envoyée sur la branche `main` est publiée automatiquement par Netlify.

- **Sur github.com** : ouvrir le fichier → ✏️ *Edit* → *Commit changes*.
- **En ligne de commande** : `git add -A && git commit -m "message" && git push`.

Si un fichier est ajouté ou renommé, augmenter `CACHE_VERSION` dans `sw.js`.

## Configuration externe (hors dépôt)

- **Firebase** (projet `matrice-d-eisenhower-aa8df`) : connexion Google activée, domaines autorisés
  (`3615-jeux.com`, `www.3615-jeux.com`, `3615-memo.netlify.app`), règles Firestore pour `jeux3615_users/{uid}`.
- **Netlify Forms** : formulaire « contact » (notifications par e-mail à régler dans Netlify).
- **AdSense** : client `ca-pub-6034299359163810`.
