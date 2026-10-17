/**
 * Link builders for social profiles and WhatsApp — shared by server & browser.
 */

/** Build the list of social links from settings (blank handles are skipped). */
export function socialLinks(social) {
  const map = [
    ['instagram', 'Instagram', (h) => `https://www.instagram.com/${h}`],
    ['tiktok', 'TikTok', (h) => `https://www.tiktok.com/@${h}`],
    ['youtube', 'YouTube', (h) => `https://www.youtube.com/@${h}`],
    ['facebook', 'Facebook', (h) => `https://www.facebook.com/${h}`],
  ];
  return map
    .filter(([key]) => social?.[key])
    .map(([key, label, url]) => ({ key, label, href: url(String(social[key]).replace(/^@/, '')) }));
}

/** WhatsApp click-to-chat URL with an optional pre-filled message. */
export function whatsappUrl(contact, message = contact.whatsappMessage) {
  const number = String(contact.whatsapp || '').replace(/\D/g, '');
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}
