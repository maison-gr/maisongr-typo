# Sécurité

**Français** · [English](SECURITY.en.md)

## Signaler un problème

Signalez les problèmes de sécurité en privé, par GitHub : **Security → Report a vulnerability** sur ce dépôt. N’ouvrez pas d’issue publique.

Dites ce que vous avez trouvé, comment le reproduire, et ce que cela permet de faire. Vous aurez une réponse dans la semaine, et un correctif ou un plan une fois le problème confirmé. Les signalements sont mentionnés dans les notes de version, sauf si vous préférez ne pas être nommé.

## Versions prises en charge

Les correctifs de sécurité vont dans la dernière version.

## Ce que fait le paquet, et qui compte ici

- **`typeset()` et `check()`** lisent la chaîne qu’on leur donne et en renvoient une nouvelle. Ils ne lisent aucun fichier, ne font aucune requête réseau et ne gardent rien d’un appel à l’autre. Les expressions sont écrites pour ne jamais revenir en arrière sans fin, et un test les passe sur de grandes entrées hostiles (`test/performance.test.ts`); une entrée qui en fait bloquer une est un problème de sécurité.
- **En HTML**, seul le texte entre les balises change : les balises, les attributs, les commentaires, les entités et le contenu de `<script>`, `<style>`, `<pre>` et `<code>` ressortent tels quels, donc la typographie ne transforme jamais du texte en balisage. Ce n’est pas un nettoyeur : appliquez-le à du HTML de confiance, ou nettoyez-le ensuite.
- **L’outil en ligne de commande** lit les fichiers et les dossiers qu’on lui donne. `fix` écrit ces fichiers-là, et aucun autre. Il n’envoie rien nulle part.
