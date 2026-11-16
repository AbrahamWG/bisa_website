# BISA website

Static site for the Berkeley Indonesian Student Association. No build step and no dependencies.

## Run it

Open `index.html` through any local server, for example:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Update content

Everything that changes often lives in `assets/js/content.js`:

- `links`: intake form, Discord, Instagram, and the rest
- `events`: newest first, add a new one at the top
- `team`: officers, roles, and photo names
- `departments`, `faq`

Photos go in `assets/img` as `.webp`. In `content.js` use the file name without the extension.

## Files

- `index.html`: home page, the island hero
- `about.html`, `nusantara.html`, `events.html`, `team.html`, `faq.html`, `join.html`: one page per navbar item
- `assets/js/layout.js`: the shared navbar and footer, edit them here once
- `assets/css/site.css`: all styles, color and type tokens are at the top
- `assets/js/site.js`: animations and interactions
- `assets/data/shapes.js`: the 18,307 points for the island map and the logo
- `assets/fonts`: Bricolage Grotesque, Fraunces, DM Mono (all open source, SIL OFL)

## Deploy

It is plain static files, so any static host works. Upload the whole folder as is.
