import {launchImageLibraryAsync} from 'expo-image-picker';
import {manipulateAsync,SaveFormat} from 'expo-image-manipulator';
export async function choosePhoto(max){
  const result=await launchImageLibraryAsync({mediaTypes:['images'],quality:0.9});
  if(result.canceled)return null;
  const asset=result.assets[0];
  const size=Math.min(max,Math.max(asset.width,asset.height));
  const resize=asset.width>=asset.height?{width:size}:{height:size};
  const image=await manipulateAsync(asset.uri,[{resize}],{format:SaveFormat.JPEG,compress:0.68,base64:true});
  if(!image.base64||image.base64.length>610000)throw Error('اختر صورة أصغر');
  return 'data:image/jpeg;base64,'+image.base64;
}
