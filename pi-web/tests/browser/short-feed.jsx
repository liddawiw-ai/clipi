import React from 'react';
import {createRoot} from 'react-dom/client';
import ProfileShorts from '../../ProfileShorts';
import {ShortVideoHome} from '../../ShortVideoHome';
import {accountLabels} from '../../AccountLabels';
import {configureInterface} from '../../interface-language.mjs';

const params=new URLSearchParams(location.search);
const locale=params.get('lang'),uid=params.get('role');
configureInterface('',locale,null,accountLabels);
const clip={id:'fixture',owner:'host',title:'حفظ',canDelete:uid==='host'};
async function request(path,input){
  switch(input.op){
    case 'shortProfileList':
      if(input.owner!=='host'||uid!=='user') throw Error('Expected a visitor viewing the host');
      return {clips:['one','two','three'].map(id=>({...clip,id,title:id})),canDelete:false,nextCursor:null};
    case 'shortList': return {clips:params.has('pair')?[clip,{...clip,id:'two'}]:[clip]};
    case 'shortLike': return {liked:input.liked,likes:Number(input.liked)};
    case 'shortState': return {owner:'host',authorName:'إغلاق',canDelete:clip.canDelete,social:true,commentCount:1};
    case 'shortComments': return {comments:[{id:'1',uid:'guest',name:'مشاركة',body:'حفظ',created:Date.now()}],social:true};
    default: throw Error('Unexpected test request: '+input.op);
  }
}
createRoot(document.getElementById('app')).render(
  params.has('profile') ? <ProfileShorts authorUid="host" request={request} endpoint={location.origin}
    playerProps={{viewer:{uid},roomLabels:accountLabels[locale],gifts:[]}}/> : <ShortVideoHome viewer={{uid}} request={request} endpoint={location.origin} roomLabels={accountLabels[locale]}
    onReport={()=>{}} gifts={[]}/>
);
