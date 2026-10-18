# /data — default content

These JSON files are the **starting content** for the site. The owner normally edits everything in the admin panel (`/admin`). A section saved there is stored in `DATA_DIR/content.json` and takes priority over the file here.

Placeholders to replace before launch (JSON can't hold comments, so they're listed here):

- `settings.json → contact` (email, phone, WhatsApp number, address)
- `settings.json → social` (Instagram, TikTok and other handles)
- `settings.json → commerce.currencies` (exchange rates are illustrative)
- `products.json` (prices, lengths and stock are examples; `images: []` shows generated placeholder art)
- `shipping.json` (example shipping & returns policy)

See the main README, sections 3 and 4.
