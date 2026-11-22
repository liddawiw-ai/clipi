import {copyRoomInvitation, shareRoomInvitation} from './room-invitations.mjs';

const input = document.querySelector('#page-link');
const status = document.querySelector('#link-status');
const url = new URL(input.dataset.path, location.origin).href;
input.value = url;
input.addEventListener('focus', () => input.select());

document.querySelector('#copy-link').addEventListener('click', async () => {
  const copied = await copyRoomInvitation(navigator, document, input, url);
  status.textContent = copied ? 'تم نسخ الرابط.' : 'اضغط مطوّلًا على الرابط واختر «نسخ».';
});

document.querySelector('#share-link').addEventListener('click', async () => {
  const result = await shareRoomInvitation(navigator, {title: document.title, url});
  status.textContent = result === 'unavailable' ? 'انسخ الرابط وأرسله من تطبيق المحادثة.' : '';
});
