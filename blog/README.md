# Homo Digital Blog

Markdown-based blog system for homodigital.io. Zero dependencies, zero build step.

## Structure

```
blog/
├── index.html          ← Blog listing page (posts registry inline)
├── post.html           ← Single post viewer (renders .md via marked.js)
└── posts/
    └── when-ai-dreams.md   ← First post (and any future .md files)
```

## How to deploy

1. Copy the entire `blog/` folder into your homodigital.io root directory
2. Your blog will be available at `homodigital.io/blog/`
3. Individual posts at `homodigital.io/blog/post.html?slug=when-ai-dreams`

## How to add a new post

1. Write a new `.md` file and save it in `blog/posts/` (e.g. `my-new-post.md`)
2. Add an entry to the `POSTS` array in **both** `index.html` and `post.html`:

```js
{
  slug: "my-new-post",
  title: "My New Post Title",
  date: "2026-03-01",
  tags: ["tag1", "tag2"],
  excerpt: "A short description for the listing page."
}
```

3. Done. No build, no deploy, no framework.

## Notes

- `marked.js` is loaded from CDN (jsdelivr) — no local dependencies
- Posts registry is inline in HTML (no fetch/CORS issues — works locally and on server)
- The first `# heading` in the .md file is hidden in post view (title comes from POSTS array)
- Dark theme matches homodigital.io aesthetic
- Responsive — works on mobile
- OG meta tags are set dynamically for social sharing
- To link from main site, add: `<a href="blog/">Blog</a>` to your nav
