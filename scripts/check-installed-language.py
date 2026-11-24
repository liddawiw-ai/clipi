"""Exercise the packaged Android login screen through the accessibility tree."""
import re
import subprocess
import time
import xml.etree.ElementTree as ET

PACKAGE = 'com.walid.clipi'


def adb(*args):
    return subprocess.check_output(['adb', *args], text=True, timeout=20).strip()


def launch():
    adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')


def find_label(label, timeout=45):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        adb('shell', 'uiautomator', 'dump', '/sdcard/clipi-ui.xml')
        xml = adb('shell', 'cat', '/sdcard/clipi-ui.xml')
        for node in ET.fromstring(xml).iter('node'):
            for key in ('text', 'content-desc'):
                value = node.get(key, '').strip()
                if value == label or value.startswith(label + ',') or value.startswith(label + ' '):
                    return node
        time.sleep(0.6)
    raise RuntimeError(f'Expected control {label!r} on {PACKAGE}')


def tap(label):
    node = find_label(label)
    left, top, right, bottom = map(int, re.findall(r'\d+', node.attrib['bounds']))
    adb('shell', 'input', 'tap', str((left + right) // 2), str((top + bottom) // 2))


launch()
tap('تغيير اللغة')
tap('English')
find_label('Change language')
adb('shell', 'am', 'force-stop', PACKAGE)
launch()
tap('Change language')
tap('العربية')
find_label('تغيير اللغة')
pid = adb('shell', 'pidof', PACKAGE)
time.sleep(65)
assert pid and adb('shell', 'pidof', PACKAGE) == pid, 'App restarted during the one-minute check'
find_label('تغيير اللغة')
print('Signed APK opened, restored English after restart, switched to Arabic, and remained open for 65 seconds.')
