import cast from "./data/characters.json";

export type Character = typeof cast[number];
export const characterAt = new Map(cast.filter(c=>c.location).map(c=>[c.location,c]));
export const language = (value: string) => value==="fr" ? "fr" : "en";
const source = import.meta.env.BASE_URL+"characters/aetheris-cast.png";

export function portrait(character:Character){
  const {x,y}=character.portrait;
  return `<span class="character-portrait" aria-hidden="true" style="background-image:url('${source}');background-position:${(x-75)/1386*100}% ${(y-75)/874*100}%"></span>`;
}

export function openCharacters(host:HTMLElement, locale:string, close:()=>void, encounter?:Character, proceed?:()=>void){
  const lang=language(locale);
  const french=lang==="fr";
  const dialog=document.createElement("dialog");
  dialog.className="character-dialog panel";
  const title=encounter?.name[lang]??(french?"Personnages":"Characters");
  const cards=encounter?[encounter]:cast;
  dialog.setAttribute("aria-labelledby","cast-title");
  dialog.innerHTML=`<header class="atlas-header"><h2 id="cast-title">${title}</h2><button data-cast-close aria-label="${french?"Fermer":"Close"}">×</button></header>
    <div class="character-cards">${cards.map(c=>`<article>${portrait(c)}<div>${encounter?"":`<h3>${c.name[lang]}</h3>`}<p>${c.bio[lang]}</p></div></article>`).join("")}</div>
    ${proceed?`<button data-cast-proceed>${french?"Poursuivre":"Proceed"}</button>`:""}`;
  host.append(dialog);
  let advance=false;
  dialog.querySelector("button[data-cast-close]")?.addEventListener("click",()=>dialog.close());
  dialog.querySelector("button[data-cast-proceed]")?.addEventListener("click",()=>{advance=true;dialog.close();});
  dialog.addEventListener("close",()=>{
    dialog.remove();
    if(advance)proceed?.();
    else close();
  },{once:true});
  dialog.showModal();
}
