# Journal des modifications

**Français** · [English](CHANGELOG.en.md)

Toutes les modifications notables de `maisongr-typo`. Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), et chaque version ajoute 0.0.1 au numéro (1.0.1, 1.0.2, 1.0.3), quel que soit son contenu.

## [Non publié]

## [1.0.0] - 2026-11-25

### Ajouté

- `typeset()` et `check()` pour le texte français, le Markdown et le HTML, selon l’Office québécois de la langue française (`fr-CA`, par défaut) ou l’usage de la France (`fr-FR`) : aucune espace ou une espace fine insécable devant `;` `!` `?`, des espaces insécables devant `:` et à l’intérieur des « », les guillemets droits changés en « », les heures (`8 h 30`), les sommes et les symboles (`29 $`, `12 535 $`, `15 %`, `20 °C`), les tranches de chiffres, les ordinaux (`2e`, `1re`, `1er`), l’apostrophe typographique et les points de suspension.
- Les liens, les courriels, les noms de domaine, les entités, le code, les balises, la cible des liens et les graphies de l’utilisateur (`keep`) restent tels quels.
- L’outil en ligne de commande `maisongr-typo` : `check` (code de sortie 1 quand quelque chose est à corriger, pour la CI), `fix`, l’entrée standard, les fichiers de traduction JSON avec `--only-key`, et les rapports `--json`.
- Une Agent Skill et un `llms.txt`.
