import type {Party} from "./combat";
import type {Exploration} from "./map";
import type {Journey} from "./quests";
import type {Chronicle} from "./story";

const KEY="aetheris.save";
export type Save = {version:1;party:Party;exploration:Exploration;journey:Journey;chronicle?:Chronicle;position:[number,number,number];yaw:number;pitch:number;energy:number;time:number;vertical:number;glide:boolean;hp:number};
export function readSave():Save|undefined{
  try{
    const value=JSON.parse(localStorage.getItem(KEY)??"null");
    if(value?.version===1&&value.party?.team?.length&&value.position?.length===3&&value.position.every(Number.isFinite)&&value.journey&&value.exploration)return value;
  }catch{ /* Treat malformed or unavailable storage as an empty slot. */ }
}
export function writeSave(save:Save){
  try{localStorage.setItem(KEY,JSON.stringify(save));return true;}
  catch{return false;}
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
