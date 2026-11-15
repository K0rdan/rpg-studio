# Run 2026-11-14 : baseline `water-gen1` (post-traitement seul)

**Objectif**: mesurer le premier test signalé (eau depuis `ground-gen1`) et comparer les variantes de post-traitement sans nouvel appel modèle.

- Commande : `npm run lab -- replay --raw <3 bruts water-gen1> --reference scripts/generation-lab/fixtures/ground-gen1-256.png --label water-baseline`
- Bruts : les 3 générations `family-water-gen1-gemini` des 13 et 14 novembre (1024×1024), même prompt, même référence.
- Modèle d'image : `gemini-3.1-flash-lite-image`.
- Génération : aucune (bruts existants). Seul le post-traitement varie.
- Pas de notation visuelle R1 à R5 pour ce run ; les images sont dans `report.html` du run (non versionné).

## Brut (indépendant du post-traitement)

| Métrique | Valeur | Lecture |
| --- | --- | --- |
| `raw copy vs ref` | 0,95 | La disposition de `ground-gen1` est reprise (copie recolorée) |
| `raw internal repeat` | 0,97 | Un motif se répète dans l'image (période d'un quart) |

Même mesure sur le brut de `ground-gen1` généré sans référence : `raw internal repeat` 0,96. Le modèle répète donc un motif de lui-même, indépendamment de la référence.

## Post-traitement (moyenne des 3 bruts)

| Variante | copy | isolated px ↓ | mean region px ↑ | seam ratio → 1 | internal repeat ↓ | colours | review pass |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `nearest-32` (production) | 0,49 | 0,76 | 1,15 | 1,13 | 0,98 | **256** | 0 % |
| `nearest-mc16` | 0,49 | 0,77 | 1,14 | 1,13 | 0,97 | 16 | 0 % |
| `lanczos-mc16` | 0,94 | 0,64 | 1,28 | 1,75 | 0,95 | 16 | 100 % |
| `block-mc32` | 0,58 | 0,47 | 1,55 | 1,35 | 0,70 | 30 | 0 % |
| `block-mc16` | 0,58 | 0,49 | 1,50 | 1,35 | 0,69 | 16 | 0 % |
| `block-mc16-crop50` | 0,73 | 0,51 | 1,44 | 1,07 | 0,75 | 16 | 0 % |
| `block-mc16-crop25` | 0,80 | 0,42 | 1,62 | 0,92 | 0,15 | 16 | 67 % |

## Constats

1. **Le post-traité de production est une bouillie mesurable** : 76 % de pixels isolés, aplats de 1,15 px, 256 couleurs. Le « 32 colours » annoncé n'existe pas (H4).
2. **La copie est masquée par le bruit dans la production** : `copy` vaut 0,49 sur `nearest-32` mais 0,80 dès que l'image est lisible (`crop25`) et 0,95 sur le brut. Un post-traitement lisible rend la copie visible ; il ne la corrige pas (H1).
3. **Réduire par couleur dominante par bloc** (`block-*`) divise par 1,6 les pixels isolés et double la taille des aplats, sans flou. Le raccord reste à 1,35 tant qu'on réduit l'image entière.
4. **Recadrer le quart central** donne l'image la plus lisible, un raccord à 0,92 et supprime la mosaïque (0,15), parce que le brut est périodique. Mais on y reconnaît directement les pavés de `ground-gen1` en bleu : le défaut du brut reste entier (H1, H2).
5. **`lanczos` fait passer le contrôle actuel à 100 % en floutant** : bandes lissées, raccord à 1,75. Le seuil 0,92 ne mesure pas la qualité (H6).
6. Même la meilleure variante garde 42 % de pixels isolés : une pierre de la référence fait 1 à 1,5 px à 32 px. La correction ne peut pas venir du seul post-traitement (H5).

## Décision

- Post-traitement : candidat `block-mc16` (réduction par bloc, 16 couleurs exactes) ; `crop25` à départager avec des bruts non copiés, car il masque aussi la mosaïque.
- À lancer ensuite : `npm run lab -- run --preset water --post block-mc16,block-mc16-crop25,nearest-32 --label water-gen` pour départager les variantes de génération (H1, H2, H5). Les résultats de ce run se lisent contre cette fiche.
