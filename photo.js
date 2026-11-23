import {Image} from 'react-native';
import {launchImageLibraryAsync,UIImagePickerPreferredAssetRepresentationMode} from 'expo-image-picker';
import {manipulateAsync,SaveFormat} from 'expo-image-manipulator';

export async function choosePhoto(max){
  const result=await launchImageLibraryAsync({mediaTypes:['images'],quality:0.85,
    preferredAssetRepresentationMode:UIImagePickerPreferredAssetRepresentationMode.Compatible});
  const asset=result.assets?.[0];
  if(result.canceled||!asset?.uri)return null;
  let {width,height}=asset;
  if(!(width>0&&height>0)){
    ({width,height}=await new Promise((resolve,reject)=>Image.getSize(asset.uri,(w,h)=>resolve({width:w,height:h}),reject)));
  }
  const size=Math.min(max,Math.max(width,height));
  const resize=width>=height?{width:size}:{height:size};
  const image=await manipulateAsync(asset.uri,[{resize}],{format:SaveFormat.JPEG,compress:0.68,base64:true});
  if(!image.base64||image.base64.length>610000)throw Error('تعذّرت معالجة الصورة. اختر صورة أخرى.');
  return 'data:image/jpeg;base64,'+image.base64;
}
