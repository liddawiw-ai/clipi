const bundle='com.walid.clipi';
const play='https://play.google.com/store/apps/details?id='+bundle;

export async function deviceInstall(request,platform,lookup=fetch){
  const country=/^[A-Z]{2}$/.test(request.cf?.country||'')?request.cf.country:'US';
  let destination;
  try {
    const options={signal:AbortSignal.timeout(4500),cf:{cacheTtlByStatus:{'200-299':600,'404':120}}};
    if(platform==='android'){
      const storePage=await lookup(play+'&gl='+country,options);
      if(storePage.ok)destination=play+'&gl='+country;
      await storePage.body?.cancel();
    }else if(platform==='ios'){
      const storePage=await lookup('https://itunes.apple.com/lookup?bundleId='+bundle+'&country='+country,options);
      if(storePage.ok){
        const app=(await storePage.json()).results?.find(item=>item.bundleId===bundle&&Number.isSafeInteger(item.trackId)&&item.trackId>0);
        if(app)destination='https://apps.apple.com/'+country.toLowerCase()+'/app/id'+app.trackId;
      }
    }
  }catch{}
  return new Response(null,{status:302,headers:{Location:destination||new URL('/room?deviceStore=unavailable',request.url).href,'Cache-Control':'no-store'}});
}
