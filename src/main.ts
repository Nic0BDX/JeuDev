import "./style.css";
import { explore } from "./world";
import { readSave } from "./save";
import { openDex } from "./dex";
import { openMap } from "./map";
import { openCharacters } from "./characters";

export const GAME_NAME = "Aetheris";
document.title = GAME_NAME;

const app = document.querySelector<HTMLElement>("#app")!;
const key = "aetheris.settings.v1";
const defaults = { quality: "auto", volume: 60, language: "en", sensitivity: 55 };
let settings = { ...defaults };
try { settings = { ...defaults, ...JSON.parse(localStorage.getItem(key) ?? "{}") }; } catch { /* Retain defaults. */ }

const labels = {
  en: ["New Adventure", "Continue", "Creature Codex", "World Map", "Settings", "Back", "Quality", "Volume", "Language", "Camera sensitivity", "Controls"],
  fr: ["Nouvelle aventure", "Continuer", "Codex des créatures", "Carte du monde", "Réglages", "Retour", "Qualité", "Volume", "Langue", "Sensibilité caméra", "Commandes"]
};
type Page = "title" | "new" | "continue" | "codex" | "map" | "settings";
let page: Page = "title";
const buttons: Page[] = ["new", "continue", "codex", "map", "settings"];
const icons = ["✧", "◫", "◇", "⌖", "⚙"];

function render() {
  const words = labels[settings.language === "fr" ? "fr" : "en"];
  document.documentElement.lang = settings.language === "fr" ? "fr" : "en";
  const active = buttons.indexOf(page);
  app.innerHTML = `<div class="landscape" aria-hidden="true"><i class="planet"></i><i class="ridge far"></i><i class="ridge near"></i><i class="mist"></i></div>
    <section class="screen">
      <header><div class="crest" aria-hidden="true">✧</div><h1>${GAME_NAME}</h1></header>
      ${page === "title" ? `<nav>${buttons.map((name, i) => `<button data-page="${name}" ${name === "continue" && !readSave() ? "disabled" : ""}><span aria-hidden="true">${icons[i]}</span>${words[i]}<b aria-hidden="true">›</b></button>`).join("")}<button data-page="characters"><span aria-hidden="true">✦</span>${settings.language==="fr"?"Personnages":"Characters"}<b aria-hidden="true">›</b></button></nav>` :
      `<section class="panel"><h2>${words[active]}</h2>${page === "settings" ? `<form>
        <label>${words[6]} <select name="quality"><option value="auto">Auto</option><option value="low">Low</option><option value="high">High</option></select></label>
        <label>${words[7]} <input name="volume" type="range" min="0" max="100"></label>
        <label>${words[8]} <select name="language"><option value="en">English</option><option value="fr">Français</option></select></label>
        <label>${words[9]} <input name="sensitivity" type="range" min="1" max="100"></label>
        <p>${words[10]} · ZQSD / WASD · E · Shift · Space · M · Tab · I</p>
      </form>` : ""}<button data-page="title">${words[5]}</button></section>`}
    </section>`;
  const form = app.querySelector("form");
  if (!form) return;
  for (const [name, value] of Object.entries(settings)) {
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) field.value = String(value);
  }
}
app.addEventListener("click", event => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-page]");
  if (!target) return;
  if (target.dataset.page === "characters") { openCharacters(app, settings.language, ()=>{}); return; }
  if (target.dataset.page === "map") { openMap(app, undefined, render); return; }
  if (target.dataset.page === "codex") { openDex(app, undefined, render); return; }
  if (target.dataset.page === "new" || target.dataset.page === "continue") {
    const save=readSave();
    if(target.dataset.page==="continue"&&!save)return;
    if(target.dataset.page==="new"&&save&&!confirm(settings.language==="fr"?"Remplacer l’aventure sauvegardée ?":"Replace your saved adventure?"))return;
    try { explore(app, settings, render, target.dataset.page==="continue"?save:undefined); } catch { render(); alert("WebGL is unavailable."); }
    return;
  }
  page = target.dataset.page as Page;
  render();
});
app.addEventListener("change", event => {
  const field = event.target;
  if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) return;
  settings = { ...settings, [field.name]: field instanceof HTMLInputElement ? Number(field.value) : field.value };
  localStorage.setItem(key, JSON.stringify(settings));
  if (field.name === "language") render();
});
render();
