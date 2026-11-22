# Aetheris

Read this file and PROGRESS.md before resuming. The game is a mobile-first Vite and TypeScript client with Three.js for rendering and HTML/CSS for the overlay. Keep the fixed-seed world, player simulation, combat, presentation, and versioned localStorage state separate. Store species, skills, type matchups, regions, items and quests as JSON under src/data. Use public/sprites/<id>.png for replaceable billboards.

Finish milestones in order. Run the production build once the milestone is ready, record verification and tick its box only after a successful build, and commit the milestone to Git. Avoid unrelated dependencies and edits.

## Règles d’économie

- Utiliser le modèle le plus puissant disponible. Effort élevé pour l’architecture, M2 et M4, moyen ou faible pour le reste.
- Lire AGENTS.md et PROGRESS.md au début de chaque session et les tenir à jour en quelques lignes. Ouvrir uniquement les fichiers nécessaires et limiter les modifications à leur objet.
- Écrire le code dans les fichiers. Résumer chaque jalon en cinq lignes maximum. Lancer le build une fois par jalon. Éviter les refactors et dépendances non demandés.
- Après « continue », reprendre au premier jalon non coché de PROGRESS.md.
