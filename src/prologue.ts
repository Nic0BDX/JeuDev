import "./prologue.css";

const shots = [
  { duration: 14000, fr: "Les îles d’Aetheris flottent au-dessus des nuages.", en: "The islands of Aetheris float above the clouds." },
  { duration: 16000, fr: "Mais l’une d’elles perd de l’altitude.", en: "But one of them is losing altitude." },
  { duration: 10000, fr: "Aetheris", en: "Aetheris" }
];

export function playPrologue(host: HTMLElement, language: string, finish: () => void) {
  const french = language === "fr";
  const dialog = document.createElement("dialog");
  dialog.className = "prologue";
  dialog.setAttribute("aria-label", french ? "Prologue d’Aetheris" : "Aetheris prologue");
  dialog.innerHTML = `
    <div class="prologue-sky" aria-hidden="true"><i></i><i></i><i></i></div>
    <p class="prologue-caption" aria-live="polite"></p>
    <button type="button" class="prologue-skip">${french ? "Passer" : "Skip"}</button>
  `;
  const caption = dialog.querySelector("p")!;
  const skip = dialog.querySelector("button")!;
  let index = 0;
  let timer: number;
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    window.clearTimeout(timer);
    dialog.close();
    dialog.remove();
    finish();
  }

  function showShot() {
    const shot = shots[index];
    dialog.dataset.shot = String(index);
    dialog.style.setProperty("--shot-duration", shot.duration + "ms");
    caption.textContent = french ? shot.fr : shot.en;
    timer = window.setTimeout(() => {
      index++;
      if (index === shots.length) close();
      else showShot();
    }, shot.duration);
  }

  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    close();
  });
  skip.addEventListener("click", close);
  host.append(dialog);
  dialog.showModal();
  showShot();
}
