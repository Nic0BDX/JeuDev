# Spécification visuelle d’Aetheris

Les quatre vues paysage font 1672 × 941. Le Compendium est une affiche portrait.
Les valeurs ci-dessous sont des plages estimées à partir des PNG, exprimées en
pourcentage de la largeur (x) et de la hauteur (y). La marque affichée dans le
jeu reste **Aetheris**. Les textes, valeurs, objectifs et marqueurs actifs
proviennent de l’état du jeu.

| Référence | Zones et placement |
|---|---|
| 01 · Titre | Logo x 41–88, y 0–28. Menu x 60–94, y 30–77, cinq boutons espacés verticalement. Premier bouton plus large et lumineux. Arbre et bannière x 0–20, y 0–43, cité x 43–61, y 24–52, îles à droite. Florix et Bubblit au premier plan sous y 39, Pyrowl au-dessus sur le rocher. Ornement de pied x 54–94, y 91–98. |
| 02 · Dex | En-tête y 0–9, titre à gauche, quatre onglets x 39–84, compteur x 88–98. Panneau gauche x 1–34, y 14–78, catégories x 2–14, grille de trois colonnes x 15–33, recherche et filtre au-dessus. Illustration centrale x 34–61, y 10–68, halo doré, rocher et carrousel en pied x 34–62, y 69–91. Fiche x 62–99, y 10–88, identité et XP en haut, statistiques et compétences côte à côte, évolution et affinité en bas. Retour x 1–12, y 91–97. |
| 03 · Carte | En-tête y 0–9, onglets à droite. Objectif x 1–19, y 11–23, légende x 1–11, y 32–75, boussole et zoom x 94–99, y 10–47. Cité centrale vers x 52, y 42. Neige au nord-ouest, volcan au nord-est, îles à l’extrême nord-est, forêt à l’ouest, lac à l’est, côte au sud-ouest, plaines au sud-est. Les bannières se superposent aux lieux et aux chemins pointillés. Progression x 0–27, y 83–99 et carrousel x 28–100, y 82–99. |
| 04 · Compendium | Logo centré x 31–68, y 0–8. Sous-titre sur cartouche x 26–73, y 8–11, légende x 77–98, y 1–11. Neuf rangées de y 14 à 85. Chaque rangée commence par le bandeau de type et son paysage x 3–28, puis quatre créatures aux centres x 36, 53, 70 et 88. Les noms et badges sont au bas des rangées. Panorama et trois mascottes en pied y 85–100. |
| 05 · HUD | Logo et lieu en haut à gauche x 2–37, y 1–10. Heure et raccourcis x 63–87, y 1–7, minimap x 86–99, y 1–24. Quête à droite x 78–99, y 25–47. Marqueur de destination vers x 61, y 38–44. Joueur x 36–48, y 36–74, Florix à sa gauche. Équipe x 1–28, y 75–95. Bandeau de quête centré x 35–65, y 74–85, vitalité et inventaire x 31–79, y 86–96. Actions x 82–99, y 68–95. |

## Styles communs

- Paysages anime peints, ciel cobalt, verts lumineux, éclats cyan et ombres indigo.
  Les décors, créatures et emblèmes sont des bitmaps.
- Panneaux bleu nuit proches de #0B204D, remplissage translucide, biseau cyan pâle
  proche de #A5EDFF. Liserés dorés proches de #FFD784, reflets actifs lavande.
  Les captures montrent des halos localisés et des ornements aux angles.
- Les titres utilisent une serif contrastée. Cinzel ou Marcellus convient au
  titrage, Nunito au texte courant. La police exacte n’est pas identifiable à
  partir du seul bitmap. La marque utilise le logo fourni.
- Les types associent symbole et couleur. Nature vert, Fire orange, Water bleu,
  Wind turquoise, Earth ocre, Light or, Shadow violet, Crystal magenta, Sky cyan.
- En portrait, mettre les grilles et fiches en séquence et conserver les accès.
  Les cibles tactiles et zones sûres priment sur le placement paysage.

## Relevé du rendu existant

Le titre a déjà un panorama bitmap, mais le logo se compose dans l’interface.
Le Dex possède les trois zones principales, mais partage de petits sprites
entre la galerie et la fiche. Le Compendium reste un onglet du Dex. La carte
superpose des repères interactifs à un atlas bitmap. Le HUD présente un monde 3D
jouable, dont l’éclairage et les silhouettes diffèrent de la référence peinte.
Ces écarts sont structurels. Les scores seront renseignés après captures
Playwright à 1672 × 941 et 390 × 844 et comparaison des PNG.
