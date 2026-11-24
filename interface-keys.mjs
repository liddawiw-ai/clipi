import {english,additionalCopy,videoActions} from './interface-copy.mjs';

export const languageNames = {
  ar:'arabic',en:'english',es:'spanish',fr:'french',de:'german',pt:'portuguese',it:'italian',
  tr:'turkish',ru:'russian',uk:'ukrainian',pl:'polish',nl:'dutch',fa:'persian',ur:'urdu',
  he:'hebrew',hi:'hindi',bn:'bengali',ta:'tamil',id:'indonesian',ms:'malay',fil:'tagalog',
  vi:'vietnamese',th:'thai',ja:'japanese',ko:'korean',sw:'swahili',el:'greek',ro:'romanian'
};
export function copyId(text){
  let hash=2166136261;
  for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);
  return (hash>>>0).toString(36);
}
export const sources=new Map();
for(const key of new Set([...Object.keys(english),...additionalCopy,...videoActions.ar])){
  const id=copyId(key);
  if(sources.has(id))throw new Error('Duplicate interface copy ID');
  sources.set(id,key);
}
