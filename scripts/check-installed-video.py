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
    raise AssertionError('Expected viewer control did not appear')


def label(text):
    return lambda n: any(text in n.get(k, '') for k in ('text', 'content-desc', 'hint'))


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
    # The preceding installed-language check leaves the app in Arabic.
    control(lambda n:n.get('class')=='android.widget.EditText' and label('البريد الإلكتروني')(n))
    type_field('البريد الإلكتروني',email)
    type_field('كلمة المرور',password)
    tap(control(label('أوافق على الشروط'),True))
    tap(control(label('تسجيل الدخول بالبريد'),True))
    first=frame()
    time.sleep(6)
    first=frame()  # The feed may replace its offline starter when the catalog arrives.
    pid=adb('shell','pidof',PACKAGE)
    x1,y1,x2,y2=bounds(first)
    if (x2-x1)<80 or (y2-y1)<120:
        raise AssertionError('First decoded frame did not cover the video surface')
    x, h=str((x1+x2)//2),y2-y1
    adb('shell','input','swipe',x,str(y1+3*h//4),x,str(y1+h//4),'350')
    second=frame(first.get('resource-id'))
    assert second is not None and pid and adb('shell','pidof',PACKAGE)==pid
    print('Signed APK decoded first and next video frames through the viewer flow.')


if __name__=='__main__':
    email='clipi-qa-'+secrets.token_hex(10)+'@example.invalid'
    password=secrets.token_hex(18)
    fixture=account('signUp',{'email':email,'password':password,'returnSecureToken':True})
    try:
        login_and_play(email,password)
    finally:
        account('delete',{'idToken':fixture['idToken']})
