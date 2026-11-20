import json
import re
import secrets
import subprocess
import time
import urllib.request
import xml.etree.ElementTree as ET

key = json.load(open('google-services.json'))['client'][0]['api_key'][0]['current_key']
email = 'clipi-android-check-' + secrets.token_hex(8) + '@example.invalid'
password = 'Clipi9' + secrets.token_hex(14)

def auth(operation, data):
    request = urllib.request.Request(
        'https://identitytoolkit.googleapis.com/v1/accounts:' + operation + '?key=' + key,
        data=json.dumps(data).encode(),
        headers={'Content-Type': 'application/json',
                 'X-Android-Package': 'com.walid.clipi',
                 'X-Android-Cert': 'F048F0663F27FBF59A28B2441451D5269C2C09D9'},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)

def adb(*args):
    return subprocess.check_output(['adb', *args], text=True, stderr=subprocess.DEVNULL)

def locate(label, attempts=15, editable=False):
    for _ in range(attempts):
        try:
            adb('shell', 'uiautomator', 'dump', '/sdcard/clipi-test-view.xml')
            root = ET.fromstring(adb('shell', 'cat', '/sdcard/clipi-test-view.xml').strip())
            for node in root.iter('node'):
                if editable and node.get('class') != 'android.widget.EditText':
                    continue
                if any(label in node.get(attr, '') for attr in ('text', 'content-desc')):
                    x1,y1,x2,y2 = map(int,re.findall(r'\d+',node.get('bounds','')))
                    return str((x1+x2)//2),str((y1+y2)//2)
        except (subprocess.SubprocessError, ET.ParseError):
            pass
        time.sleep(1)
    raise RuntimeError('Expected label missing: ' + label)

def tap(label):
    adb('shell','input','tap',*locate(label))

def fill(label,value):
    adb('shell','input','tap',*locate(label, editable=True))
    adb('shell','input','text',value)
    adb('shell','input','keyevent','KEYCODE_BACK')

account = auth('signUp', {'email':email,'password':password,'returnSecureToken':True})
try:
    adb('install','clipi.apk')
    adb('shell','am','start','-W','-n','com.walid.clipi/.MainActivity')
    locate('الدخول بالبريد الإلكتروني')
    fill('البريد الإلكتروني',email)
    fill('كلمة المرور',password)
    tap('أوافق على الشروط')
    tap('تسجيل الدخول بالبريد')
    locate('استعراض الغرف')
    print('PASS APK installed, real email sign-in completed, and Clipi home was visible.')
finally:
    auth('delete', {'idToken':account['idToken']})
    print('Temporary Firebase account removed.')
