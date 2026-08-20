chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'SCAN_VISIBLE') return;
  const blocked = new Set(['accounts', 'direct', 'explore', 'reels', 'stories', 'about', 'developer', 'legal']);
  const profiles = [];
  const seen = new Set();
  for (const anchor of document.querySelectorAll('a[href^="/"]')) {
    const match = anchor.getAttribute('href')?.match(/^\/([A-Za-z0-9._]+)\/?(?:\?.*)?$/);
    if (!match || blocked.has(match[1]) || seen.has(match[1])) continue;
    seen.add(match[1]);
    const image = anchor.querySelector('img');
    profiles.push({ username: match[1], name: image?.alt?.replace(/Foto do perfil de |profile picture of /i, '') || match[1], avatar: image?.src || '' });
  }
  sendResponse({ profiles: profiles.slice(0, 100) });
});
