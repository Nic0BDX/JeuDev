import type {Member, Party} from "./combat";
import creatures from "./data/creatures.json";
import type {Exploration} from "./map";
import type {Journey} from "./quests";
import type {Chronicle} from "./story";

const KEY="aetheris.save";
const BACKUP=KEY+".backup";
const species=new Set(creatures.map(creature=>creature.id));
export type Save = {version:1;party:Party;exploration:Exploration;journey:Journey;chronicle?:Chronicle;position:[number,number,number];yaw:number;pitch:number;energy:number;time:number;vertical:number;glide:boolean;hp:number};
function parse(raw:string|null):unknown{
  if(raw===null)return undefined;
  try{return JSON.parse(raw);}catch{return undefined;}
}
const record=(value:unknown):value is Record<string,unknown>=>typeof value==="object"&&value!==null&&!Array.isArray(value);
const strings=(value:unknown):value is string[]=>Array.isArray(value)&&value.every(entry=>typeof entry==="string");
const finite=(value:unknown):value is number=>typeof value==="number"&&Number.isFinite(value);
const count=(value:unknown):value is number=>finite(value)&&Number.isInteger(value)&&value>=0;

function validMember(value:unknown):value is Member{
  return record(value)&&typeof value.id==="string"&&species.has(value.id)&&
    count(value.level)&&value.level>=1&&value.level<=40&&count(value.xp)&&
    count(value.hp)&&count(value.affinity)&&count(value.form)&&value.form<=2;
}
function validated(value:unknown):Save|undefined{
  if(!record(value)||value.version!==1||!record(value.party)||!record(value.journey)||!record(value.exploration))return;
  const {party,journey,exploration}=value;
  if(!Array.isArray(party.team)||party.team.length<1||party.team.length>6||!party.team.every(validMember)||
     !Array.isArray(party.storage)||!party.storage.every(validMember)||!strings(party.seen)||!strings(party.caught)||
     ![party.coins,party.berries,party.capsules,party.prism].every(count))return;
  if(!count(journey.step)||!count(journey.crystals)||![journey.accepted,journey.done,journey.looted,exploration.discovered].every(strings))return;
  if(!Array.isArray(value.position)||value.position.length!==3||!value.position.every(finite)||
     ![exploration.x,exploration.z,value.yaw,value.pitch,value.energy,value.time,value.vertical,value.hp].every(finite)||
     typeof value.glide!=="boolean")return;
  return value as unknown as Save;
}
export function readSave():Save|undefined{
  try{
    const current=parse(localStorage.getItem(KEY));
    if(record(current)&&finite(current.version)&&current.version>1)return;
    return validated(current)??validated(parse(localStorage.getItem(BACKUP)));
  }catch{ /* Storage may be disabled. */ }
}
export function writeSave(save:Save){
  try{
    const raw=localStorage.getItem(KEY);
    const current=parse(raw);
    if(record(current)&&finite(current.version)&&current.version>1)return false;
    if(raw!==null&&validated(current))localStorage.setItem(BACKUP,raw);
    localStorage.setItem(KEY,JSON.stringify(save));
    return true;
  }catch{return false;}
}
export function ambience(volume:number){
  if(volume<=0)return ()=>{};
  try{
    const audio=new AudioContext(),gain=audio.createGain();
    gain.gain.value=volume/100*.025;
    gain.connect(audio.destination);
    const notes=[130.81,196,261.63].map((frequency,i)=>{
      const note=audio.createOscillator();
      note.type=i===2?"sine":"triangle";
      note.frequency.value=frequency;
      note.detune.value=i-1;
      note.connect(gain);note.start();
      return note;
    });
    const pause=()=>{if(document.hidden)void audio.suspend();else void audio.resume().catch(()=>{});};
    document.addEventListener("visibilitychange",pause);
    void audio.resume().catch(()=>{});
    return ()=>{document.removeEventListener("visibilitychange",pause);notes.forEach(note=>note.stop());void audio.close();};
  }catch{return ()=>{};}
}
