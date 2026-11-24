import {ui as appText} from './interface-language.mjs';
import {Platform} from 'react-native';
let queue=Promise.resolve();
export function storeBilling({request,uid,productId,buy,isCurrentUser}){
 const run=async()=>{
  if(!isCurrentUser(uid))throw Error(appText('أعد فتح المتجر بحسابك الحالي'));
  const store=Platform.OS==='android'?'PLAY_STORE':'APP_STORE';
  const account=await request('/account-number',{op:'externalStoreAccount',store});
  const embedded=Platform.OS==='android'?process.env.EXPO_PUBLIC_RC_GOOGLE_KEY:process.env.EXPO_PUBLIC_RC_APPLE_KEY;
  const apiKey=account.publicKey||embedded, id=account.id;
  if(!apiKey||!id)throw Error(appText('لم يُفعّل الشراء من المتجر لهذا الإصدار بعد.'));
  if(!isCurrentUser(uid))throw Error(appText('أعد فتح المتجر بحسابك الحالي'));
  const {default:Purchases,PRODUCT_CATEGORY}=require('react-native-purchases');
  if(!await Purchases.isConfigured())Purchases.configure({apiKey,appUserID:id});
  else if(await Purchases.getAppUserID()!==id)await Purchases.logIn(id);
  const [product]=await Purchases.getProducts([productId],PRODUCT_CATEGORY.NON_SUBSCRIPTION);
  if(!product||!isCurrentUser(uid))throw Error(appText('الباقة غير متاحة لهذا الحساب في المتجر.'));
  if(buy)await Purchases.purchaseStoreProduct(product);
  return product.priceString;
 };
 const result=queue.then(run,run);queue=result.catch(()=>{});return result;
}
