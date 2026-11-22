# Direction artistique d’Aetheris

## Palette et lumière

| Rôle | Couleur |
|---|---|
| Nuit et fond des panneaux | `#0B204D` |
| Verre bleu outremer | `#183F85` |
| Contours actifs et balises | `#79E9FF` |
| Texte et reflets | `#F5FAFF` |
| Quête, étoiles et emblème | `#FFD784` |
| Prairie, eau et ciel | `#82C46A`, `#45B8DD`, `#448CDA` |

Paysages low-poly aux formes facettées, ombres bleu-violet et lumière douce venant du haut à gauche. Grande planète claire derrière des reliefs bleuis par la distance. Les neuf couleurs de type du fichier `src/data/types.json` servent aux créatures et à leurs fiches. Les icônes et libellés identifient aussi les types.

## Typographie

Cinzel pour le logo et les grands titres, Source Sans 3 pour le HUD, les chiffres et les commandes. Georgia et system-ui comme polices de secours. Les panneaux en verre gardent un fond bleu dense derrière les informations. Bordure cyan plus lumineuse pour le focus, or pour les objectifs.

## Créatures

Billboards 2D originaux, vus de trois quarts, tête expressive et formes souples. Chaque type a une silhouette lisible à petite taille. Florix porte de grandes oreilles-feuilles et une queue en éventail, Pyrowl un bec court et des ailes en flammes anguleuses, Bubblit des nageoires rondes translucides. Ombre bleu nuit, lumière chaude en haut à gauche. PNG RGBA carré de 256 px, pieds alignés sur une ligne de base commune. Afficher les mêmes portraits dans le Dex et le monde quand ils sont disponibles.

## Vérification par écran

- Titre : panorama et silhouettes à gauche, logo et menu à droite sur desktop, navigation centrée et lisible en portrait.
- Compendium : neuf familles reconnaissables et quatre emplacements par ligne ou section, avec silhouette masquée pour les entrées verrouillées.
- Dex : grille compacte, portrait principal et fiche lisible. Sur mobile, accès direct à la fiche sélectionnée.
- Exploration : lieu et météo en haut, boussole et objectifs sur les bords, zone centrale dégagée, joystick et actions à portée des pouces.
- Carte : silhouette et couleurs des régions, légende séparée, repères lisibles au zoom, contraste du brouillard de découverte.
- Réglages : libellés, valeurs et focus lisibles sur le même verre bleu.

Pour chaque écran modifié, lancer Aetheris, capturer en portrait mobile et en 16:9, puis comparer composition, contraste, silhouettes et zones tactiles à la référence pertinente avant de passer au suivant. Respecter les zones sûres et la préférence de réduction des animations.
