"""Generate browser-compatible playback files for published clips, never replacing originals."""
import json, os, pathlib, subprocess, tempfile, time
from urllib.request import Request, urlopen
from urllib.error import HTTPError

origin = 'https://clipi-mainnet.liddawiw.workers.dev'
api = origin + '/internal/browser-renditions'
def authorized(url, method='GET', body=None):
    token_url = os.environ['ACTIONS_ID_TOKEN_REQUEST_URL'] + '&audience=clipi-pi-mainnet-video-renditions'
    with urlopen(Request(token_url, headers={'Authorization':'Bearer '+os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']}),timeout=30) as reply:
        token=json.load(reply)['value']
    headers={'Authorization':'Bearer '+token, 'Content-Type':'video/mp4'}
    with urlopen(Request(url,method=method,data=body,headers=headers),timeout=120) as reply:
        return json.load(reply)

def process(clip, folder):
    original, browser=folder/'original.mp4',folder/'browser.mp4'
    with urlopen(origin+'/shorts/media/'+clip,timeout=90) as reply, original.open('wb') as dest:
        while chunk:=reply.read(1024*1024):dest.write(chunk)
    info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',original]))
    video=next(s for s in info['streams'] if s['codec_type']=='video')
    audio=next((s for s in info['streams'] if s['codec_type']=='audio'),None)
    target=api+'?id='+clip
    if video['codec_name']=='h264' and video.get('pix_fmt')=='yuv420p' and (not audio or audio['codec_name']=='aac') and int(video.get('bit_rate') or 0)<=2800000:
        authorized(target,'POST',b'')
        return
    subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-i',original,'-map','0:v:0','-map','0:a:0?',
        '-vf',"scale=w='min(1280,iw)':h=-2,format=yuv420p",'-c:v','libx264','-preset','fast','-crf','24','-maxrate','1800k','-bufsize','1800k',
        '-force_key_frames','expr:gte(t,n_forced*1.2)','-c:a','aac','-b:a','96k','-movflags','+faststart',browser],check=True)
    authorized(target,'PUT',browser.read_bytes())

if __name__=='__main__':
    after=''
    for attempt in range(30):
        try:
            page=authorized(api)
            break
        except HTTPError as error:
            if error.code not in (404,405,502,503) or attempt==29:raise
            time.sleep(15)
    with tempfile.TemporaryDirectory() as temp:
        while page['clips']:
            for clip in page['clips']:
                try:process(clip,pathlib.Path(temp))
                except HTTPError as error:
                    if error.code!=404:raise
                after=clip
            page=authorized(api+'?after='+after)
    print('Browser versions checked.')
