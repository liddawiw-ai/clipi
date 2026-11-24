import React from 'react';
import {createRoot} from 'react-dom/client';
import {ShortVideoHome} from '../../ShortVideoHome';
import {accountLabels} from '../../AccountLabels';
import {configureInterface} from '../../interface-language.mjs';

const params=new URLSearchParams(location.search);
const locale=params.get('lang'),uid=params.get('role');
configureInterface('',locale,null,accountLabels);
const clip={id:'fixture',owner:'host',title:'حفظ',canDelete:uid==='host'};
async function request(path,input){
  switch(input.op){
    case 'shortList': return {clips:[clip]};
    case 'shortState': return {owner:'host',authorName:'إغلاق',canDelete:clip.canDelete,social:true,commentCount:1};
    case 'shortComments': return {comments:[{id:'1',uid:'guest',name:'مشاركة',body:'حفظ',created:Date.now()}],social:true};
    default: throw Error('Unexpected test request: '+input.op);
  }
}
createRoot(document.getElementById('app')).render(
  <ShortVideoHome viewer={{uid}} request={request} endpoint={location.origin} roomLabels={accountLabels[locale]}
    onReport={()=>{}} gifts={[]}/>
);
