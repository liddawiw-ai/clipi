"""Use a disposable email account to exercise the signed APK's normal viewer login and video decoder."""
import json
import re
import secrets
import subprocess
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

PACKAGE = 'com.walid.clipi'
config = json.loads(Path('google-services.json').read_text())
api_key = next(c['api_key'][0]['current_key'] for c in config['client']
               if c['client_info']['android_client_info']['package_name'] == PACKAGE)


def account(operation, data):
    endpoint = 'https://identitytoolkit.googleapis.com/v1/accounts:' + operation + '?key=' + api_key
    request = urllib.request.Request(endpoint, json.dumps(data).encode(), {'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=25) as response:
        return json.load(response)


def adb(*args):
    return subprocess.check_output(['adb', *args], text=True, timeout=20).strip()


def nodes():
    adb('shell', 'uiautomator', 'dump', '/sdcard/clipi-video-ui.xml')
    return list(ET.fromstring(adb('shell', 'cat', '/sdcard/clipi-video-ui.xml')).iter('node'))


def bounds(node):
    return tuple(map(int, re.findall(r'-?\d+', node.attrib['bounds'])))


def control(predicate, scroll=False, timeout=55):
    until = time.monotonic() + timeout
    while time.monotonic() < until:
        tree = nodes()
        launcher_dialog=any("Pixel Launcher isn't responding" in n.get('text','') for n in tree)
        if launcher_dialog:
            close=next((n for n in tree if n.get('resource-id')=='android:id/aerr_close'),None)
            if close is not None:
                tap(close)
                adb('shell','am','start','-W','-n',PACKAGE+'/.MainActivity')
                continue
        for node in tree:
            if predicate(node) and bounds(node)[3] > bounds(node)[1]:
                return node
        if scroll:
            view = next((n for n in tree if n.get('scrollable') == 'true'), None)
            if view is not None:
                x1, y1, x2, y2 = bounds(view)
                x, h = str((x1+x2)//2), y2-y1
                adb('shell','input','swipe',x,str(y1+3*h//4),x,str(y1+h//3),'350')
        time.sleep(.3)
    print('Visible packages and view IDs:',sorted({(n.get('package',''),n.get('resource-id','')) for n in tree if n.get('package')}),flush=True)
    print('Process:',adb('shell','pidof',PACKAGE),flush=True)
    logs=adb('logcat','-d','-s','AndroidRuntime:E','MediaCodec:E','ExoPlayerImplInternal:E','ReactNativeJS:E')
    print('Player/system errors:',re.sub(r'https?://\S+','[URL]',logs[-5500:]),flush=True)
    raise AssertionError('Expected viewer control did not appear')


def label(text):
    choices=text if isinstance(text, tuple) else (text,)
    return lambda n: any(value.lower() in n.get(k,'').lower() for value in choices for k in ('text','content-desc','hint'))


def tap(node):
    x1,y1,x2,y2=bounds(node)
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))


def type_field(label_text, value):
    field=control(lambda n:n.get('class')=='android.widget.EditText' and label(label_text)(n))
    tap(field)
    adb('shell','input','text',value)
    adb('shell','input','keyevent','KEYCODE_BACK')


def frame(exclude=None):
    def rendered(n):
        name=n.get('resource-id','')
        return 'short-frame-' in name and name != exclude
    return control(rendered,timeout=90)


def login_and_play(email, password):
    adb('shell','am','force-stop',PACKAGE)
    adb('shell','am','start','-W','-n',PACKAGE+'/.MainActivity')
    control(lambda n:n.get('class')=='android.widget.EditText' and label(('البريد الإلكتروني','Email'))(n))
    type_field(('البريد الإلكتروني','Email'),email)
    type_field(('كلمة المرور','password'),password)
    tap(control(label(('أوافق على الشروط','I accept the terms')),True))
    tap(control(label(('تسجيل الدخول بالبريد','Sign in with email','Log in with email')),True))
    first=frame()
    print('Decoded first visible frame',first.get('resource-id'),bounds(first),flush=True)
    time.sleep(6)
    first=frame()  # The feed may replace its offline starter when the catalog arrives.
    pid=adb('shell','pidof',PACKAGE)
    x1,y1,x2,y2=bounds(first)
    if (x2-x1)<80 or (y2-y1)<120:
        raise AssertionError('First decoded frame did not cover the video surface')
    seen={first.get('resource-id')}
    for _ in range(2):
        x,h=str((x1+x2)//2),y2-y1
        adb('shell','input','swipe',x,str(y1+4*h//5),x,str(y1+h//5),'325')
        current=control(lambda n:'short-frame-' in n.get('resource-id','') and n.get('resource-id') not in seen,timeout=75)
        seen.add(current.get('resource-id'))
        print('Decoded new clip after swipe',current.get('resource-id'),bounds(current),flush=True)
        assert pid and adb('shell','pidof',PACKAGE)==pid
        x1,y1,x2,y2=bounds(current)
        time.sleep(2)
    assert len(seen)==3
    print('Signed APK decoded first and next two video frames through the viewer flow in the same process.')



if __name__=='__main__':
    email='clipi-qa-'+secrets.token_hex(10)+'@example.invalid'
    password=secrets.token_hex(18)
    fixture=account('signUp',{'email':email,'password':password,'returnSecureToken':True})
    try:
        login_and_play(email,password)
    finally:
        account('delete',{'idToken':fixture['idToken']})
