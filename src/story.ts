import creatures from "./data/creatures.json";
import regions from "./data/regions.json";
import narrative from "./data/story.json";
import cast from "./data/characters.json";
import {battle,createMember,maxHp,type Party} from "./combat";

type Ending="guardian"|"release";
export type Chronicle={next:number;hero:string;shards:string[];ending?:Ending};
type Scene={
  chapter:number;title:string;location:string;lines:string[][];
  name?:boolean;crystal?:boolean;shard?:string;gift?:string;travel?:string;ending?:boolean;
  puzzle?:{question:string;options:string[];answer:number};
  battle?:{id:string;level:number;owner?:string;alias?:string;acceptLoss?:boolean;mixed?:boolean};
};
const story:Scene[]=narrative.scenes;
const places=regions.flatMap<typeof regions[number]["locations"][number]>(r=>r.locations);
export const newChronicle=():Chronicle=>({next:0,hero:"",shards:[]});
export const chapter=(state:Chronicle)=>story[state.next];
export const destination=(state:Chronicle)=>places.find(place=>place.id===chapter(state)?.location);
export const siteLabel=(id:string,name:string)=>narrative.placeNames[id as keyof typeof narrative.placeNames]??name;

export function playScene(host:HTMLElement,state:Chronicle,party:Party,finish:(scene:Scene,advanced:boolean)=>void){
  const scene=chapter(state);
  if(!scene)return;
  const dialog=document.createElement("dialog");
  dialog.className="character-dialog panel story-dialog";
  dialog.setAttribute("aria-labelledby","story-heading");
  const heading=document.createElement("h2");
  heading.id="story-heading";
  heading.textContent="Chapitre "+scene.chapter+" · "+scene.title;
  const speaker=document.createElement("strong");
  const line=document.createElement("p");
  line.setAttribute("aria-live","polite");
  const actions=document.createElement("div");
  actions.className="atlas-tabs";
  dialog.append(heading,speaker,line,actions);
  host.append(dialog);
  let index=0, handoff=false;
  let input:HTMLInputElement|undefined;
  let newHero=state.hero;
  function button(label:string,action:()=>void){
    const b=document.createElement("button");
    b.type="button";b.textContent=label;b.addEventListener("click",action);actions.append(b);
  }
  function complete(ending?:Ending){
    if(scene.name)state.hero=newHero;
    if(scene.shard&&!state.shards.includes(scene.shard))state.shards.push(scene.shard);
    if(scene.gift){
      const gift=creatures.find(c=>c.id===scene.gift);
      if(gift&&!party.caught.includes(gift.id)){
        (party.team.length<6?party.team:party.storage).push(createMember(gift,9));
        party.caught.push(gift.id);
        if(!party.seen.includes(gift.id))party.seen.push(gift.id);
      }
    }
    if(ending)state.ending=ending;
    state.next++;
    if(dialog.open){handoff=true;dialog.close();}
    finish(scene,true);
  }
  function act(){
    if(input){newHero=input.value.trim();input.remove();input=undefined;}
    actions.replaceChildren();
    if(scene.puzzle){
      const puzzle=scene.puzzle;
      speaker.textContent="Épreuve";
      line.textContent=puzzle.question;
      puzzle.options.forEach((option,i)=>button(option,()=>{if(i===puzzle.answer)complete();else line.textContent="Essaie un autre enchaînement. "+puzzle.question;}));
      return;
    }
    if(scene.ending){
      speaker.textContent="Le Veilleur";
      line.textContent="Quelle voie choisis-tu ?";
      for(const [value,label] of [["guardian","Devenir le Gardien"],["release","Libérer l’Aether"]] as const){
        button(label,()=>{
          speaker.textContent=label;
          line.textContent=narrative.endings[value]+" "+narrative.epilogue;
          actions.replaceChildren();
          button("Terminer le récit",()=>complete(value));
        });
      }
      return;
    }
    if(scene.battle){
      const encounter=scene.battle;
      const enemy=creatures.find(c=>c.id===encounter.id);
      if(!enemy){dialog.close();return;}
      // Story encounters remain retryable even if the player arrived with a fainted party.
      if(party.team.every(member=>member.hp===0))party.team[0].hp=maxHp(party.team[0]);
      handoff=true;
      dialog.close();
      const started=battle(host,party,enemy,encounter.level,won=>{
        if(won||encounter.acceptLoss)complete();else finish(scene,false);
      },{noCapture:encounter.id!=="mossling",opponent:encounter.owner,alias:encounter.alias,mixed:encounter.mixed});
      if(!started)finish(scene,false);
      return;
    }
    complete();
  }
  function show(){
    const [id,words]=scene.lines[index];
    speaker.textContent=id==="hero"?(newHero||"Le Héros"):id==="narrator"?"":cast.find(c=>c.id===id)?.name.fr??(id==="florix"?"Florix":"Noctiri");
    line.textContent=words;
    actions.replaceChildren();
    if(scene.name&&index===0){
      input=document.createElement("input");
      input.maxLength=24;
      input.placeholder="Nom du héros (facultatif)";
      input.setAttribute("aria-label","Nom du héros");
      input.value=newHero;
      actions.append(input);
    }
    button(index===scene.lines.length-1?"Poursuivre":"Suivant",()=>{
      if(input){newHero=input.value.trim();input=undefined;}
      if(++index<scene.lines.length)show();else act();
    });
  }
  dialog.addEventListener("close",()=>{dialog.remove();if(!handoff)finish(scene,false);},{once:true});
  show();
  dialog.showModal();
}
