// Testnet-only wallet ownership preflight. Never returns the seed or a signature.
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function decode(value,version){
  if(typeof value!=='string'||value.length!==56||!/^[A-Z2-7]+$/.test(value))throw Error('Invalid key format');
  const out=[];let n=0,bits=0;
  for(const char of value){n=(n<<5)|alphabet.indexOf(char);bits+=5;if(bits>=8){bits-=8;out.push((n>>>bits)&255)}}
  if(out.length!==35||out[0]!==version)throw Error('Invalid key type');
  let crc=0;for(const byte of out.slice(0,33)){crc^=byte<<8;for(let j=0;j<8;j++)crc=((crc<<1)^((crc&0x8000)?0x1021:0))&65535}
  if(out[33]!== (crc&255)||out[34]!== (crc>>>8))throw Error('Invalid key checksum');
  return Uint8Array.from(out.slice(1,33));
}
export async function walletMatches(seed,address){
  const raw=decode(seed,144),publicKey=decode(address,48);
  const prefix=Uint8Array.from([48,46,2,1,0,48,5,6,3,43,101,112,4,34,4,32]);
  const pkcs8=new Uint8Array(48);pkcs8.set(prefix);pkcs8.set(raw,16);
  try{
    const key=await crypto.subtle.importKey('pkcs8',pkcs8,'Ed25519',false,['sign']);
    const pub=await crypto.subtle.importKey('raw',publicKey,'Ed25519',false,['verify']);
    const challenge=crypto.getRandomValues(new Uint8Array(32));
    const sig=await crypto.subtle.sign('Ed25519',key,challenge);
    return await crypto.subtle.verify('Ed25519',pub,sig,challenge);
  }finally{raw.fill(0);pkcs8.fill(0)}
}
export async function testWalletStatus(request,env){
  const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
  if(env.PI_GIFTS_TESTNET!=='1'||env.PI_GIFTS_NETWORK==='mainnet'||new URL(request.url).hostname!=='clipi-pi-testnet.liddawiw.workers.dev')return json({error:'Not found'},404);
  if(request.method!=='GET')return json({error:'Method not allowed'},405);
  // Only compare against an operator-configured public address, not arbitrary caller input.
  if(!env.PI_TEST_WALLET_ADDRESS||!env.PI_WALLET_PRIVATE_SEED)return json({configured:false,network:'Testnet'},503);
  try{
    const matches=await walletMatches(env.PI_WALLET_PRIVATE_SEED.trim(),env.PI_TEST_WALLET_ADDRESS.trim());
    return json({configured:true,matches,network:'Testnet'},matches?200:409);
  }catch{return json({configured:true,matches:false,network:'Testnet'},409)}
}
