# Samih Personal Website

A React + Vite powered portfolio site designed for easy deployment to GitHub Pages and super-simple project management.

## ✨ Features

- Animated intro splash that smoothly transitions into the main page
- Filterable project grid (Web / ML / Robotics) with smooth navigation
- Dedicated details page for every project
- Framer-motion powered transitions
- Project data lives in a single TypeScript file (`src/data/projects.ts`) so adding new work is as easy as **adding one object**.

## 🚀 Getting started

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build for production
npm run build

# Preview local production build
npm run preview
```

## 📦 Deploying to GitHub Pages

1. Push this repo to `github.com/<your-user>/<your-repo>` (for example `samih/personal-website`).
2. (Optional) In `vite.config.ts` adjust the `base` constant to your repo name **with leading/trailing slashes** if you see broken assets. Because the app uses `HashRouter`, navigation works out-of-the-box.

3. Commit & push the change.
4. Run:

```bash
npm run deploy
```

> This creates the production bundle in `dist/` and pushes it to the `gh-pages` branch which GitHub Pages will serve automatically.

## 🛠 Adding a new project

1. Open `src/data/projects.ts`.
2. Append a new object to the `projects` array:

```ts
{
  slug: 'cool-thing',           // must be unique
  title: 'Cool Thing',
  category: 'Web',              // 'Web' | 'ML' | 'Robotics'
  summary: 'One-line teaser',
  description: 'Longer markdown-ish paragraph…',
  thumbnail: 'https://via.placeholder.com/300x200', // or /assets/image.png
  images: ['https://…'],        // optional extra images
  link: 'https://github.com/…', // optional external link
}
```

3. Save, commit, push, and redeploy (`npm run deploy`). The card appears automatically and the details page is routed at `/project/cool-thing`.

---

MIT © Samih
