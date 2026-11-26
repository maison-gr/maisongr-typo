# Journal des modifications

**Français** · [English](CHANGELOG.en.md)

Toutes les modifications notables de `maisongr-typo`. Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), et chaque version ajoute 0.0.1 au numéro (1.0.1, 1.0.2, 1.0.3), quel que soit son contenu.

## [Non publié]

## [1.0.5] - 2026-11-26

### Ajouté

- Une action GitHub (`uses: maison-gr/maisongr-typo@v1.0.5`) : chaque problème s’affiche sur sa ligne dans la demande de tirage.
- Des crochets pre-commit, `maisongr-typo` (vérification) et `maisongr-typo-fix`, pour les fichiers dont le chemin dit français par défaut.
- Une image de conteneur, `ghcr.io/maison-gr/maisongr-typo`, pour linux/amd64 et linux/arm64.
- `--github` : le rapport en annotations GitHub Actions.

## [1.0.4] - 2026-11-26

### Ajouté

- Les formats de traduction mobiles et les autres, fichiers français seulement : `Localizable.strings` d’iOS et de macOS et `.xcstrings` de Xcode (les localisations françaises seulement, pluriels compris), `strings.xml` d’Android (`<string>`, `<plurals>`, `<string-array>`), `.po` de gettext (les `msgstr` seulement), XLIFF (les `<target>` seulement), YAML (Rails, i18next), `.properties` de Java et `.arb` de Flutter. Un fichier est français par son chemin (`fr.lproj/`, `values-fr/`, `fr/LC_MESSAGES/`, `_fr`, `fr.yml`) ou par ce qu’il déclare. Les clés, les commentaires, les métadonnées et les échappements de chaque format restent tels quels.

## [1.0.3] - 2026-11-26

### Corrigé

- Une chaîne en espagnol, en italien, en portugais, en allemand, en néerlandais ou en arabe n’est plus lue comme du français : un fichier nommé pour une autre langue (`es.ts`, `locales/de/`) et une clé d’une autre langue (`es:`, `"pt-BR":`) ne le sont jamais, et une chaîne doit se lire en français plus qu’en chacune de ces langues. Trouvé dans Resistaa, en dix langues.
- Le code tenu dans une chaîne (du CSS dans un gabarit) n’est jamais corrigé, et une chaîne clairement dans une autre langue reste telle quelle, même sous une clé `fr`.
- Un fichier JSON corrigé garde chaque octet qui n’est pas un texte corrigé : sa mise en forme ne change plus. Les balises d’un message (`<link>`, `<b>`) restent telles quelles.
- Un gabarit écrit avec des `\n` les garde.
- Un chemin qui n’existe pas est signalé clairement.

## [1.0.2] - 2026-11-26

### Corrigé

- Un attribut écrit dans un texte (`type="text/css"`) reste tel quel : ses guillemets droits ne sont pas une citation.
- « on » et « son » ne comptent plus comme des mots français : ce sont aussi des mots anglais, et « 50 % on signing, 50 % on delivery » était lu comme du français.
- Un en-tête HTTP nommé dans un texte (`Sec-Fetch-Dest: document`, `Content-Type: text/html`) reste tel quel; un nom de lieu (« Saint-Jean-Baptiste : fête ») est toujours corrigé.

## [1.0.1] - 2026-11-25

### Ajouté

- JavaScript et TypeScript (`.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.mts`, `.cts`) : les chaînes françaises sont corrigées, le code reste identique octet pour octet. Une chaîne est française dans un fichier français (`fr.ts`, `fr-CA.js`, un dossier `fr/`), sous une clé `fr`, ou quand elle se lit en français. Les clés, les chemins d’import, les expressions `${…}` et les expressions régulières ne sont jamais touchés, et le HTML d’une chaîne est corrigé comme du HTML. Essayé sur trois vrais projets (près de 1 000 fichiers) : aucun ne perd sa syntaxe.
- `--code` lit tout le code d’un dossier; sans lui, un dossier ne fournit que ses fichiers français. Les fichiers de test ne sont jamais lus comme du code.

## [1.0.0] - 2026-11-25

### Ajouté

- `typeset()` et `check()` pour le texte français, le Markdown et le HTML, selon l’Office québécois de la langue française (`fr-CA`, par défaut) ou l’usage de la France (`fr-FR`) : aucune espace ou une espace fine insécable devant `;` `!` `?`, des espaces insécables devant `:` et à l’intérieur des « », les guillemets droits changés en « », les heures (`8 h 30`), les sommes et les symboles (`29 $`, `12 535 $`, `15 %`, `20 °C`), les tranches de chiffres, les ordinaux (`2e`, `1re`, `1er`), l’apostrophe typographique et les points de suspension.
- Les liens, les courriels, les noms de domaine, les entités, le code, les balises, la cible des liens et les graphies de l’utilisateur (`keep`) restent tels quels.
- L’outil en ligne de commande `maisongr-typo` : `check` (code de sortie 1 quand quelque chose est à corriger, pour la CI), `fix`, l’entrée standard, les fichiers de traduction JSON avec `--only-key`, et les rapports `--json`.
- Une Agent Skill et un `llms.txt`.
