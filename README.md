# Aetheris

Avec Node.js 22, lancer `npm install` puis `npm run dev`.

`npm run build` vérifie TypeScript et génère le site dans `dist/`.

Le suivi des jalons figure dans [PROGRESS.md](PROGRESS.md).

## Commandes

| Action | Ordinateur | Mobile |
|---|---|---|
| Marcher | ZQSD ou WASD | Joystick gauche |
| Caméra | Glisser le pointeur dans le monde | Glisser sur le décor |
| Interagir, combattre | E | Interact |
| Sprinter et sauter ou planer | Maj, Espace | Flèche, planeur |
| Carte, Dex, sac | M, Tab, I | Boussole, losange, Bag |
| Scanner, recentrer | B, R | Loupe, viseur |
| Utiliser une baie, sauvegarder | 1, P | Berry, Save |

La première quête commence à Skyspire City. Suivre le lieu indiqué dans le HUD, puis interagir avec son repère. Les villages proposent des articles et des quêtes de terrain. Les créatures agressives peuvent démarrer une rencontre à proximité.

La sauvegarde locale versionnée conserve la position, la caméra, l’heure, l’équipe, le sac, la découverte et les quêtes. Elle est écrite périodiquement, au retour au titre et via Save. Les combats en cours reprennent au dernier état enregistré. Effacer les données du site efface la partie.

Le [guide artistique](ART_DIRECTION.md) référence les captures Chromium et les images. Les tests en émulation de viewport mobile couvrent la disposition et le parcours de reprise. Les FPS sur appareil réel restent à mesurer.

## Mesurer les performances

Ajoute `?performance=1` à l’URL du jeu, puis ouvre une aventure. Le compteur affiche la moyenne des FPS, le 95e percentile du temps entre images et le nombre d’appels de rendu sur des fenêtres de cinq secondes. En qualité Auto, parcours Skyspire City puis traverse plusieurs limites de chunks. Relève le modèle d’appareil, le navigateur et plusieurs fenêtres de mesure pour comparer avec les objectifs de 60 FPS sur ordinateur et 30 FPS sur mobile.

## Histoire

Le récit débute à Verdant Cascade Valley. Suis le lieu indiqué dans le HUD, puis interagis pour lire la scène, relever son épreuve ou lancer le combat. Le nom du héros, le chapitre, les quatre Éclats et la fin choisie sont sauvegardés. [Données du récit et liste des cinématiques](src/data/story.json).
