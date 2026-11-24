const segmenter=typeof Intl!=='undefined'&&Intl.Segmenter?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
function lastCharacterStart(text){
  if(!text)return 0;
  if(segmenter){let start=0;for(const part of segmenter.segment(text))start=part.index;return start;}
  const points=Array.from(text);
  let i=points.length-1;
  const mark=c=>/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\ufe00-\ufe0f]/.test(c)||(c.codePointAt(0)>=0x1f3fb&&c.codePointAt(0)<=0x1f3ff);
  const regional=c=>c?.codePointAt(0)>=0x1f1e6&&c.codePointAt(0)<=0x1f1ff;
  while(i>0){
    if(mark(points[i])){i--;continue;}
    if(i>1&&points[i-1]==='\u200d'){i-=2;continue;}
    break;
  }
  if(i>0&&regional(points[i])&&regional(points[i-1])){let count=1;for(let j=i-1;j>=0&&regional(points[j]);j--)count++;if(count%2===0)i--;}
  return points.slice(0,i).join('').length;
}
export function editComment(text,range,insert,limit=450){
  let start=Math.max(0,Math.min(range?.start??text.length,text.length));
  const end=Math.max(start,Math.min(range?.end??start,text.length));
  if(insert===null&&start===end)start=lastCharacterStart(text.slice(0,start));
  const add=insert??'';
  if(text.length-(end-start)+add.length>limit)return {text,selection:{start,end}};
  const cursor=start+add.length;
  return {text:text.slice(0,start)+add+text.slice(end),selection:{start:cursor,end:cursor}};
}
