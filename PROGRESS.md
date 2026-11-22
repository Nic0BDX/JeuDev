# Aetheris

- [x] M0 · Vite, architecture et données JSON
- [x] M1 · Interface, titre et réglages
- [x] M2 · Monde et déplacements
- [x] M3 · Créatures et compagnon
- [x] M4 · Combat et capture
- [x] M5 · Dex et collection
- [x] M6 · Carte et découverte
- [x] M7 · Quêtes et économie
- [ ] M8 · Sauvegarde et finition

M0 validé par [GitHub Actions](https://github.com/Nic0BDX/JeuDev/actions/runs/45011143807).

M1 validé par [GitHub Actions](https://github.com/Nic0BDX/JeuDev/actions/runs/45011257456).

M2 validé par [GitHub Actions](https://github.com/Nic0BDX/JeuDev/actions/runs/45011546290). Parcours WebGL et FPS à contrôler sur appareil.

M3 validé par [GitHub Actions](https://github.com/Nic0BDX/JeuDev/actions/runs/45011697916). Sprites de remplacement générés en Canvas.

M4 validé par [GitHub Actions](https://github.com/Nic0BDX/JeuDev/actions/runs/45011812804).

M5 validé par [GitHub Actions](https://github.com/Nic0BDX/JeuDev/actions/runs/45012020216).

M6 validé par [GitHub Actions](https://github.com/Nic0BDX/JeuDev/actions/runs/45014628519). [Carte](https://github.com/Nic0BDX/JeuDev/actions/runs/45014409308) et [minimap](https://github.com/Nic0BDX/JeuDev/actions/runs/45014628543) vérifiées en Chromium.

M7 validé par [GitHub Actions](https://github.com/Nic0BDX/JeuDev/actions/runs/45014759166). [Sac photographié en jeu](https://github.com/Nic0BDX/JeuDev/actions/runs/45014759152).

M8 : [build](https://github.com/Nic0BDX/JeuDev/actions/runs/45014907681) et [reprise après rechargement](https://github.com/Nic0BDX/JeuDev/actions/runs/45014907686) validés en Chromium. Mesure des FPS sur appareil réel à faire.

Mesure de référence sur GitHub Actions, Chromium headless et rendu logiciel SwiftShader, à Skyspire City pendant cinq secondes. Format desktop 1440 × 810 : 11,9 FPS, p95 100,1 ms et 66 appels de rendu. Format mobile émulé 390 × 844, qualité Auto basse : 57 FPS, p95 16,8 ms et 35 appels. Le compteur `?performance=1` est prêt pour la mesure sur appareil réel. [Build](https://github.com/Nic0BDX/JeuDev/actions/runs/45015522037) · [Mesures CI](https://github.com/Nic0BDX/JeuDev/actions/runs/45015521989).

M8 : résolution Auto adaptative, repères groupés, génération des chunks répartie entre images. En CI SwiftShader, 43,7 FPS en 16:9 et 57,6 FPS en portrait ; test de traversée réussi. [Build](https://github.com/Nic0BDX/JeuDev/actions/runs/45015954707) · [Parcours](https://github.com/Nic0BDX/JeuDev/actions/runs/45015954702).

Narration : six personnages et trame jouable en douze chapitres. La Forge du Cratère propose deux interactions successives sur le terrain, et l’épreuve de Zephowl utilise l’interface de dialogue et le Collecteur réemploie la simulation de combat. Les 14 cinématiques restent à produire.

Récit : [build](https://github.com/Nic0BDX/JeuDev/actions/runs/45045424057) et [contrôles Chromium](https://github.com/Nic0BDX/JeuDev/actions/runs/45045424076) réussis. Validation des 25 scènes, rencontre avec Elara et sauvegarde des deux fins via des états de test. À Skyspire, SwiftShader mesure 36,3 FPS en 16:9 et 57,6 FPS en portrait ; la mesure sur appareils réels reste ouverte.

Navigation narrative : repère 3D et losange de minimap. [Build](https://github.com/Nic0BDX/JeuDev/actions/runs/45045815365) et [parcours de sauvetage de Florix avec sauvegarde du nom](https://github.com/Nic0BDX/JeuDev/actions/runs/45045815306) validés en Chromium.
