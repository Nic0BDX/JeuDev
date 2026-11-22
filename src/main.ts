export const GAME_NAME = "Aetheris";

document.title = GAME_NAME;
const heading = document.createElement("h1");
heading.textContent = GAME_NAME;
document.querySelector("#app")?.append(heading);
