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
        tree = ET.fromstring(xml)
        for node in tree.iter('node'):
            for key in ('text', 'content-desc'):
                value = node.get(key, '').strip()
                if value == label or value.startswith(label + ',') or value.startswith(label + ' '):
                    if bounds(node)[3] > bounds(node)[1]:
                        return node
        if label in ('تغيير اللغة', 'Change language'):
            screen = next((n for n in tree.iter('node') if n.get('scrollable') == 'true'), None)
            if screen is not None:
                left, top, right, bottom = bounds(screen)
                x, height = str((left + right) // 2), bottom - top
                adb('shell', 'input', 'swipe', x, str(top + height * 3 // 4),
                    x, str(top + height // 3), '380')
        time.sleep(0.6)
    raise RuntimeError(f'Expected control {label!r} on {PACKAGE}')


def bounds(node):
    return tuple(map(int, re.findall(r'-?\d+', node.attrib['bounds'])))


def tap(label):
    node = find_label(label)
    left, top, right, bottom = bounds(node)
    adb('shell', 'input', 'tap', str((left + right) // 2), str((top + bottom) // 2))


launch()
tap('تغيير اللغة')
# Move the centred Arabic row up by one full row, then save the highlighted English option.
left, top, right, bottom = bounds(find_label('العربية'))
x, y = str((left + right) // 2), (bottom + top) // 2
adb('shell', 'input', 'swipe', x, str(y), x, str(y - (bottom - top)), '650')
time.sleep(1)
tap('حفظ')
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
