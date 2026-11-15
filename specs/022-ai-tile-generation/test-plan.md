# Plan de test du pipeline de génération de tilesets

**Feature**: 022-ai-tile-generation
**Objectif**: itérer vite sur le pipeline (prompt → modèle → post-traitement) et savoir, chiffres et images à l'appui, ce qui est mieux ou moins bien qu'avant.

## Principes

1. **Une variable à la fois.** Un résultat n'est comparable que si les cas (entrées) sont identiques et qu'une seule composante du pipeline change.
2. **Cas figés, variantes nommées.** Les cas et les variantes sont des données versionnées (`apps/editor/src/lib/generation/lab/definitions.ts`). Deux runs sont comparables dès qu'ils partagent les mêmes identifiants.
3. **Répéter.** Le modèle est non déterministe : 3 répétitions par cellule au minimum, jamais une image isolée.
4. **Séparer ce qui coûte de ce qui est gratuit.** Les variantes de *génération* coûtent un appel modèle ; les variantes de *post-traitement* sont rejouées gratuitement sur les images brutes déjà obtenues.
5. **Deux juges.** Des métriques objectives (elles guident) et une notation visuelle (elle tranche).
6. **Baseline figée.** `baseline` + `nearest-32` reproduit exactement la production actuelle. Tout écart se lit contre elle.

## Outils

### 1. Le debugger (`public/generation-debug/`, dev uniquement)

Chaque génération depuis l'éditeur écrit, en plus du brut, du post-traité et du prompt :

| Fichier | Contenu |
| --- | --- |
| `<prefix>-input.json` (+ `latest-input.json`) | Corps de requête, valeurs résolues (stage, catégorie, mode, modèle), style projet, contrat de sortie, config du fournisseur (modèle d'image, ratio), options de prompt, mode de référence, options de post-traitement, durées, prompt et sections, qualification, **métriques** |
| `<prefix>-ref-N.png` (+ `latest-ref-N.png`) | Les images de référence réellement envoyées au modèle, avec taille et empreinte SHA-256 dans le JSON |
| `index.html` | Brut / post-traité côte à côte, tableau de métriques, paramètres d'entrée, références, prompt |

`input.json` est lisible par le lab : n'importe quel essai fait dans l'éditeur peut être rejoué et comparé (voir `from-dump`).

### 2. Le lab (`npm run lab` dans `apps/editor`)

Il appelle les mêmes fonctions que la route (`promptBuilder`, client Gemini, `postProcessGeneratedImage`) sans base de données ni UI.

```bash
npm run lab -- list                                  # presets, cas, variantes
npm run lab -- run --preset smoke                    # ~2 appels : vérifie la plomberie
npm run lab -- run --preset water                    # le cas qui échoue, toutes variantes, ×3
npm run lab -- run --cases water-ref256 --variants baseline,ref-scrambled --repeats 3 --label essai-ref
npm run lab -- from-dump <préfixe-debugger> --repeats 2     # rejoue un essai de l'éditeur
npm run lab -- from-dump <préfixe-debugger> --no-model      # post-traitement seul, gratuit
npm run lab -- replay --raw a.png,b.png --reference ref.png # post-traitement seul sur des bruts existants
npm run lab -- compare <run-a> <run-b>               # delta des métriques, variante par variante
```

Sortie : `apps/editor/.generation-lab/runs/<run>/` (ignoré par git) avec `report.html`, `results.json` et, pour chaque cellule, `raw.png`, `prompt.txt`, `input.json`, `post-<variante>.png` et son rendu 3×3.

Prérequis : `GEMINI_API_KEY` dans `apps/editor/.env.local`. `GEMINI_IMAGE_MODEL` change le modèle d'image pour comparer deux modèles (deux runs, puis `compare`).

## Matrice

### Cas (entrées fixes)

| id | Demande | Référence envoyée |
| --- | --- | --- |
| `water-ref256` | eau (texte exact du test initial) | `ground-gen1` en 256 px (tuile héritée de l'ancien contrat) |
| `water-ref32` | idem | `ground-gen1` en 32 px (ce que stockerait le nouveau contrat) |
| `grass-ref256` | herbe courte et dense | `ground-gen1` 256 px |
| `sand-ref256` | sable de plage fin | `ground-gen1` 256 px |
| `dirt-base` | terre brune tassée | aucune (première famille) |
| `gravel-base` | gravier gris fin | aucune (première famille) |

Les cas couvrent la suite minimale de `pipeline.md` (terre, gravier, herbe, eau) et les deux situations : famille avec référence, première famille.

### Variantes de génération (changent ce qui est envoyé au modèle)

| id | Ce qui change |
| --- | --- |
| `baseline` | Prompt de production, référence envoyée telle quelle |
| `scale-aware` | + éléments dimensionnés pour rester lisibles à la taille de tuile |
| `pixel-grid` | + grille de pixels visibles de la taille de la tuile |
| `single-motif` | + interdiction de répéter un motif en mosaïque |
| `contrast-ref` | + la référence est nommée et explicitement exclue du contenu |
| `ref-gray` | référence en niveaux de gris (couleurs non copiables) |
| `ref-scrambled` | référence en niveaux de gris et mélangée par blocs (ni couleurs ni disposition) |
| `ref-none` | aucune image : le style ne passe que par le texte |
| `combo` | `scale-aware` + `single-motif` + `contrast-ref` + `ref-scrambled` |

Les variantes qui ne concernent que la référence sont ignorées pour les cas sans référence.

### Variantes de post-traitement (gratuites, rejouées sur chaque brut)

| id | Ce qui change |
| --- | --- |
| `nearest-32` | **Production** : échantillonnage au plus proche voisin, palette sharp |
| `nearest-mc16` | même échantillonnage, palette exacte à 16 couleurs |
| `lanczos-mc16` | rééchantillonnage lissé, 16 couleurs |
| `block-mc32` | couleur dominante de chaque bloc source, 32 couleurs exactes |
| `block-mc16` | idem, 16 couleurs |
| `block-mc16-crop50` | moitié centrale du brut avant réduction |
| `block-mc16-crop25` | quart central du brut avant réduction |

### Presets

| preset | Appels modèle | Usage |
| --- | --- | --- |
| `smoke` | 2 | Vérifier clé API, plomberie, rapport |
| `water` | 2 cas × 9 variantes × 3 = 54 | Le cas signalé |
| `full` | ≈ 140 | Validation finale avant promotion |

## Métriques objectives

Calculées pour le brut, chaque post-traité et par rapport à la référence. Elles n'acceptent ni ne rejettent : elles orientent la lecture.

| Métrique | Sens | Lecture |
| --- | --- | --- |
| `copy vs ref` (`copyScore`) | ↓ | Corrélation de luminance maximale avec la référence, sur tous les décalages cycliques et à des échelles 1×, 2×, 4×. ≈ 1 : la disposition est une copie (même recolorée). < 0,3 : structure sans rapport |
| `raw copy vs ref` | ↓ | Même mesure sur le brut : isole le défaut du modèle de celui du post-traitement |
| `isolated px` | ↓ | Part des pixels sans voisin de même couleur (bruit de pixels), après réduction à 16 couleurs pour rester comparable |
| `mean region px` | ↑ | Aire moyenne des aplats de couleur ; bas = bouillie, haut = formes lisibles |
| `seam ratio` | → 1 | Saut de couleur au raccord divisé par le saut moyen entre voisins ordinaires. ≈ 1 : raccord invisible ; > 1,5 : couture visible |
| `internal repeat` | ↓ | Corrélation avec soi-même décalé d'au moins un quart (cyclique). Élevé : un motif se répète dans l'image (mosaïque 4×4) |
| `raw internal repeat` | ↓ | Idem sur le brut |
| `colours` | ↓ | Couleurs distinctes réelles |
| `review pass` | ↑ | Part des cellules qui passent le seuil actuel 0,92 de `verifySelfTiling` (voir H6 : peu discriminant) |

Les seuils ci-dessous sont **provisoires**, à confirmer à l'étape 0 : `copy` ≥ 0,8 = copie ; ≤ 0,5 = distinct.

## Notation visuelle

Dans `report.html`, chaque image est notée de 0 à 3 (sauvegardé dans le navigateur, export `ratings.json`, synthèse par variante en haut de page).

| Critère | Porte sur | 0 | 3 |
| --- | --- | --- | --- |
| R1 Matériau | brut | ne ressemble pas à la demande | reconnaissable sans hésiter |
| R2 Indépendance | brut | copie recolorée de la référence | rien de repris de la référence |
| R3 Lisibilité | post | bouillie de pixels | formes nettes à la taille de jeu |
| R4 Raccord | post (rendu 3×3) | coutures ou motif répété saillant | invisible |
| R5 Cohérence de style | post | n'appartient pas à la famille | même pixel, contour et lumière |

Noter à l'aveugle quand c'est possible (masquer le nom de la variante en n'ouvrant que les images), et toujours dans l'ordre des cellules.

## Protocole

### Étape 0 : calibrer (gratuit)

1. `lab replay` sur les bruts déjà obtenus (voir [test-runs/2026-11-14-baseline-water.md](./test-runs/2026-11-14-baseline-water.md)).
2. Noter à la main 5 images connues bonnes et 5 connues mauvaises. Vérifier que `copy`, `isolated px`, `mean region px` les séparent ; sinon ajuster la métrique, pas le jugement.

### Étape 1 : choisir le post-traitement (gratuit)

Rejouer toutes les variantes de post-traitement sur tous les bruts disponibles (`replay` ou `from-dump --no-model`). Retenir le meilleur compromis R3 / R4 / `isolated px` / `mean region px`. Un post-traitement qui améliore la lisibilité en lissant (voir `lanczos`) est rejeté si R3 ou le raccord se dégrade visuellement.

### Étape 2 : choisir la génération

Fixer le post-traitement retenu. `run --preset water`, noter R1 et R2 sur les bruts. Chaque variante est comparée à `baseline` ; toute amélioration doit se retrouver sur `water-ref256` **et** `water-ref32`.

### Étape 3 : généraliser

Les 2 ou 3 meilleures variantes sur tous les cas : `run --preset full` restreint avec `--variants`. Une variante qui ne tient que sur l'eau n'est pas retenue.

### Étape 4 : comparer les modèles (optionnel)

Rejouer le preset retenu avec `GEMINI_IMAGE_MODEL=<autre>` et `--label modele-x`, puis `compare`.

### Étape 5 : valider dans l'éditeur

Porter la configuration retenue dans la route (voir « Promotion »), générer le cas de départ depuis l'UI, vérifier dans le debugger que `input.json` reflète la nouvelle configuration, puis passer la scène-test 8×8 de `pipeline.md`.

## Règle de décision

Une variante remplace la baseline si, sur au moins deux familles de cas :

- R1 et R2 moyens gagnent au moins 1 point sans que R3, R4 ou R5 perde plus de 0,3 ;
- `raw copy vs ref` passe sous 0,6 pour les cas avec référence (provisoire) ;
- aucune régression de `seam ratio` (> 1,5) ni de couleurs distinctes (> 32) ;
- le résultat est stable : au moins 2 répétitions sur 3 satisfont les critères.

En cas de doute, la notation visuelle l'emporte sur les métriques. Une variante rejetée reste dans `definitions.ts` avec sa fiche de run : on ne rejoue pas deux fois la même hypothèse.

## Promotion

- Post-traitement : changer `BASELINE_POST_PROCESS` dans `postProcessor.ts`. Garder une variante `baseline` équivalente à l'ancien comportement dans le lab pour les comparaisons futures.
- Prompt : changer `PRODUCTION_PROMPT_OPTIONS` dans la route.
- Références : appliquer `prepareReferenceImages(images, mode)` dans la route avant `client.generate`, et enregistrer le mode dans `input.json` (`referenceMode`).
- Mettre à jour `contracts/prompt-builder.md` et `contracts/post-processor.md`.

## Enregistrer un run

Pour chaque série, créer `test-runs/AAAA-MM-JJ-<label>.md` avec : identifiant du run, commande exacte, modèle (et `GEMINI_IMAGE_MODEL`), tableau de synthèse copié de `report.html`, notes R1–R5, décision et hypothèse suivante. Les artefacts (`.generation-lab/`) ne sont pas versionnés ; la fiche l'est.

## Hypothèses issues du premier test

Test : famille `water-gen1`, référence `ground-gen1`, mode « Another family ». Mesures détaillées dans [test-runs/2026-11-14-baseline-water.md](./test-runs/2026-11-14-baseline-water.md).

| # | Étage | Hypothèse | Indices | À tester avec |
| --- | --- | --- | --- | --- |
| H1 | Brut | L'image de référence est recopiée et recolorée ; la consigne « style seulement » ne suffit pas | `raw copy` 0,91 à 0,97, mêmes pierres aux mêmes positions | `ref-scrambled`, `ref-gray`, `ref-none`, `contrast-ref` |
| H2 | Brut | Le modèle obtient le « seamless » en répétant un motif 4×4 (même sans référence) | `raw internal repeat` 0,97 ; 0,96 pour le brut de `ground-gen1` sans référence | `single-motif`, `block-mc16-crop25` |
| H3 | Post | Réduire 1024 → 32 par plus proche voisin garde 1 pixel sur 1024 par pixel final et écrase 16 motifs en 32 px | `isolated px` 0,77 ; `mean region px` 1,1 | `block-*`, `crop*` |
| H4 | Post | La palette « 32 couleurs » n'en limite aucune : sharp n'honore `colours` qu'à 16 ou 256 | `colours` mesuré : 255 | `*-mc16`, `block-mc32` |
| H5 | Contrat | Les éléments (pierre de ≈ 40 px sur 1024) sont incompatibles avec 32 px, et la référence est une tuile 256 px de l'ancien contrat | une pierre = 1 à 1,5 px à 32 px | `scale-aware`, `pixel-grid`, cas `*-ref32` |
| H6 | Qualification | Le seuil 0,92 sur la similarité des bords ne distingue ni bouillie ni image lisible | `lanczos-mc16` passe à 100 % en floutant avec un raccord à 1,75 | `seam ratio` plutôt que `review pass` |
