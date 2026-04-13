# Kubernetes Day A Coruña

Landing page for the event "Kubernetes meets AI, con sentidiño", built with Astro, React, and Tailwind CSS.

## Stack

- Astro
- React
- Tailwind CSS 4
- GitHub Pages deployment via GitHub Actions

## Development

Install dependencies and start the local dev server:

```bash
pnpm install
pnpm dev
```

The app reads these public environment variables:

- `PUBLIC_BOOKING_URL`: RSVP submission webhook
- `PUBLIC_RSVP_COUNT_URL`: attendee count webhook

Create a local `.env` file or copy values from `.env.example`.

## Build

```bash
pnpm build
```

## Deploy

The repository includes a GitHub Actions workflow that builds and deploys the site to GitHub Pages on pushes to `main`.

For GitHub Pages, configure these repository variables:

- `PUBLIC_BOOKING_URL`
- `PUBLIC_RSVP_COUNT_URL`
