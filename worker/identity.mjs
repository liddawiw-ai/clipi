export const offers=['1234567','7777777','121212','345678','12221','12345','8888','1234','777','909','1122334','456789','67890','5656','787'];
export function price(id){
  const lengthPrice={7:50,6:200,5:1000,4:5000,3:20000}[id.length];
  const rare=new Set(id).size===1?5:new Set(id).size<=2?3:'01234567890'.includes(id)?2:1;
  return lengthPrice*rare;
}
export const spend='(SELECT COALESCE(SUM(cost),0) FROM support_gift WHERE sender=?) + (SELECT COALESCE(SUM(cost),0) FROM diamond_gift WHERE sender=?) + (SELECT COALESCE(SUM(cost),0) FROM public_numbers WHERE uid=?)';
export async function account(q,uid,input,allowance,json){
  let normal=await q('SELECT number FROM public_numbers WHERE uid=? AND cost=0',uid).first();
  for(let i=0;!normal&&i<32;i++){
    const n=String(1000000+crypto.getRandomValues(new Uint32Array(1))[0]%9000000);
    if(offers.includes(n))continue;
    await q('INSERT OR IGNORE INTO public_numbers(number,uid,cost) VALUES(?,?,0)',n,uid).run();
    normal=await q('SELECT number FROM public_numbers WHERE uid=? AND cost=0',uid).first();
  }
  if(!normal)return json({error:'تعذّر تخصيص رقم الآن'},503);
  if(input.op==='buy'){
    const id=input.number;
    if(!offers.includes(id))return json({error:'رقم غير متاح'},400);
    await q(`INSERT OR IGNORE INTO public_numbers(uid,number,cost) SELECT ?,?,? WHERE ? >= ? + ${spend}`,uid,id,price(id),allowance,price(id),uid,uid,uid).run();
    const bought=await q('SELECT uid FROM public_numbers WHERE number=?',id).first();
    if(bought?.uid!==uid)return json({error:bought?'هذا الرقم مباع':'رصيد الماس غير كافٍ'},409);
  }
  if(input.op==='buy'||input.op==='equip'){
    const owned=await q('SELECT number FROM public_numbers WHERE uid=? AND number=?',uid,input.number).first();
    if(!owned)return json({error:'الرقم غير مملوك للحساب'},403);
    await q('INSERT INTO selected_number(uid,number) VALUES(?,?) ON CONFLICT(uid) DO UPDATE SET number=excluded.number',uid,input.number).run();
  }
  const active=await q('SELECT number FROM selected_number WHERE uid=?',uid).first();
  const owned=(await q('SELECT number FROM public_numbers WHERE uid=?',uid).all()).results.map(r=>r.number);
  const available=(await q('SELECT number FROM public_numbers WHERE cost>0').all()).results.map(r=>r.number);
  const balance=await q(`SELECT ? - (${spend}) AS balance`,allowance,uid,uid,uid).first();
  return json({number:active?.number||normal.number,owned,balance:balance.balance,offers:offers.filter(n=>!available.includes(n)).map(number=>({number,cost:price(number)}))});
}
