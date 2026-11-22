# Système visuel d’Aetheris

La [direction artistique et les références](ART_DIRECTION.md) guident les décisions de composition. Fantasy lumineuse, volumes facettés et panneaux en verre bleu.

| Rôle | Valeur |
|---|---|
| Fond profond | `#0B204D` |
| Verre outremer | `#183F85` |
| Focus et interaction | `#79E9FF` |
| Texte | `#F5FAFF` |
| Objectif et succès | `#FFD784` |
| Vie et nature | `#82C46A` |
| Énergie et eau | `#45B8DD` |

Cinzel pour le titre et les en-têtes, Source Sans 3 pour les informations et contrôles. Georgia et system-ui en secours. Corps courant 16 px, métadonnées 14 px minimum quand l’espace le permet.

Échelle d’espacement 4 / 8 / 12 / 16 / 24 / 32 px. Rayon 8 px pour les éléments compacts, 12–16 px pour les panneaux et cercle pour portraits et commandes de terrain. Cibles tactiles de 44 px minimum. Anneau de focus cyan de 2 px avec décalage de 3 px. Les états désactivés gardent un libellé lisible. Des panneaux bleu dense préservent la lecture sur les fonds illustrés.

Lueur légère et ombre bleu nuit réservées aux panneaux actifs. Réponse des commandes en 120–180 ms, apparition en 180–240 ms avec opacité et translation courte. Respecter `prefers-reduced-motion`. Protéger les bords par les zones sûres et privilégier le défilement interne des listes. Sur les portraits, exploiter la taille et la silhouette autant que la couleur.
