const validRoomId = /^[A-Za-z0-9_-]{1,128}$/;

export function roomInvitationUrl(origin, roomId) {
  const url = new URL('/room', origin);
  url.searchParams.set('room', roomId);
  return url.href;
}

export function roomInvitationId({search, hash}) {
  const queryId = new URLSearchParams(search).get('room');
  const legacyId = new URLSearchParams(hash.slice(1)).get('room');
  return [queryId, legacyId].find(id => id && validRoomId.test(id)) ?? null;
}

export async function shareRoomInvitation(browser, invitation) {
  try {
    if (typeof browser.share !== 'function' ||
        (typeof browser.canShare === 'function' && !browser.canShare(invitation))) {
      return 'unavailable';
    }
    await browser.share(invitation);
    return 'shared';
  } catch (error) {
    return error?.name === 'AbortError' ? 'cancelled' : 'unavailable';
  }
}

export async function copyRoomInvitation(browser, doc, input, url) {
  try {
    if (typeof browser.clipboard?.writeText === 'function') {
      await browser.clipboard.writeText(url);
      return true;
    }
  } catch {
    // Pi Browser and other embedded browsers can expose a restricted clipboard.
  }
  try {
    input?.focus();
    input?.setSelectionRange(0, url.length);
    return !!input && doc.execCommand?.('copy') === true;
  } catch {
    return false;
  }
}
