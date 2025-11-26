# Kittys API Consuming

Simple HTML, CSS, and JavaScript project that consumes public endpoints from [TheCatAPI](https://thecatapi.com/) to:

- Show random cats.
- Save/remove favorites.
- Upload images with `FormData`.

## Structure

```
├── about.html           # About page
├── index.html           # Main entry point
├── header.html          # Reusable header fragment
├── footer.html          # Reusable footer fragment
├── css/
│   ├── main.css         # Base + section styles
│   ├── header.css       # Header-only styles
│   └── footer.css       # Footer-only styles
└── js/
    └── main.js         # API consumption + event handlers
```

## Requirements

- Modern browser with `fetch` and ES module support.
- Free API key from TheCatAPI (set inside `js/main.js`).

> **Heads up:** `header.html` and `footer.html` are fetched at runtime, so run the site behind a local HTTP server. Opening files via `file://` will block those requests due to CORS.

## Run locally

1. Clone the repository.
2. Start a static server from the project root, e.g.:
   ```bash
   npx serve
   # or
   python -m http.server 4173
   ```
3. Visit `http://localhost:<port>` in your browser.

## Main flow

1. `Random cats`: fetches four new images and lets you save them as favorites.
2. `Favorite cats`: lists stored favorites and allows removing them.
3. `Upload a cat photo`: uploads a local image to TheCatAPI.

## Accessibility & good practices

- Semantic layout (`header`, `main`, `footer`).
- Labeled inputs, `alt` text, and correct button `type`.
- Loading states + status messages via `#error` and `aria-live`.
- Scripts loaded with `defer` to avoid blocking render.

## Suggested next steps

- Use environment variables for the API key.
- Add unit tests for render helpers.
- Automate linting/formatting if needed.
