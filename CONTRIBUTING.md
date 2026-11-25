# Contribuer

**Français** · [English](CONTRIBUTING.en.md)

Merci de votre aide. Une phrase que le paquet traite mal, avec ce qu’elle devrait être et la source de cette règle, est ce qu’on peut nous envoyer de plus utile. Les demandes de fusion sont aussi les bienvenues.

## Mise en place

Le développement demande Node 22.12 ou plus récent (le paquet lui-même fonctionne à partir de Node 20.9).

```sh
npm ci
npm run typecheck
npm test
npm run build && node test/smoke.mjs
```

## Ce qu’une modification demande

- **Une source pour chaque règle.** Une règle cite la page de la [Banque de dépannage linguistique](https://vitrinelinguistique.oqlf.gouv.qc.ca/banque-de-depannage-linguistique) de l’Office québécois de la langue française qu’elle suit (pour `fr-FR`, un ouvrage de référence publié). Mettez-la dans le commentaire de la règle et dans le tableau du README. Un usage qui varie reste une option, désactivée par défaut.
- **Un test qui échoue sans elle.** Les tests écrivent les espaces en clair (`_` pour U+00A0, `~` pour U+202F), pour qu’un test ne puisse pas réussir par hasard. Ajoutez la phrase qui a révélé le problème.
- **Rien de réécrit qui ne soit pas de la typographie.** Une règle change les espaces et les signes voisins de ce qu’elle vise; elle ne change jamais de mots, et ne touche jamais à ce que protège `mask.ts` (liens, code, balises).
- **Idempotente.** `typeset(typeset(x)) === typeset(x)`, et `check()` ne trouve rien dans ce que `typeset()` a renvoyé. Les tests d’idempotence passent chaque exemple dans chaque locale.
- **Aucune nouvelle dépendance à l’exécution.**

## Commits et demandes de fusion

De petits commits, chacun faisant une seule chose, avec un message [conventionnel](https://www.conventionalcommits.org/fr/) : `feat: write 1er for 1ier`, `fix: leave .zip after a space alone`. Une demande de fusion porte sur un seul changement, et dit ce que vous avez vérifié. Les messages de commit et le code restent en anglais; les échanges peuvent se faire en français ou en anglais.

## Sécurité

N’ouvrez pas d’issue publique pour un problème de sécurité. Voir [SECURITY.md](SECURITY.md).
