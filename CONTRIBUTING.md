# CSARCH2 Virtual Exhibit Guide
[![Node.js](https://img.shields.io/badge/Node.js%2026-6DA55F?logo=node.js&logoColor=white)](#) [![Astro](https://img.shields.io/badge/Astro%206-BC52EE?logo=astro&logoColor=fff)](#) [![MDX](https://img.shields.io/badge/MDX-1B1F24?logo=mdx&logoColor=fff)](#) [![React](https://img.shields.io/badge/React-%2320232a.svg?logo=react&logoColor=%2361DAFB)](#)


## Table of Contents

- [Setup Guide](#setup-guide)
  - [1. Template Overview](#1-template-overview)
  - [2. Getting Started](#2-getting-started)
  - [3. Project Structure](#3-project-structure)
  - [4. Adding Your Exhibit Page](#4-adding-your-exhibit-page)
  - [5. Adding Components](#5-adding-components)
- [Astro and MDX Guide](#astro-and-mdx-guide)
  - [6. What is Astro and MDX?](#6-what-is-astro-and-mdx)
  - [7. Writing an MDX File](#7-writing-an-mdx-file)
  - [8. Rendering Your MDX File](#8-rendering-your-mdx-file)

---

# Setup Guide

## 1. Template Overview

This document is a guide on how to set up the template and use MDX with Astro.

---

## 2. Getting Started
1. Fork the repository. In the top-right corner of the page, click the Fork button. Adjust your settings then create fork.

2. Clone your forked repository:
```
git clone https://github.com/jrgo7/your-forked-repository
```

3. Install the dependencies:
```
npm install
```

4. Run the dev server:
```
npm run dev
```

---

## 3. Project Structure

```
├── astro.config.mjs
├── package.json
├── package-lock.json
├── tsconfig.json
└── src/
    ├── components/
    │   ├── ReactComponent.jsx
    │   └── AstroComponent.astro
    ├── layouts/
    │   └── ExhibitLayout.astro
    └── pages/
        └── topic_name.mdx
```

| Path | Description |
|---|---|
| `src/pages/` | Place your `.mdx` files here. Astro creates automatic routing from filenames. |
| `src/components/` | Your custom React/Astro components. |
| `src/layouts/ExhibitLayout.astro` | Shared layout to be used. Don't restructure it. |
| `astro.config.mjs` | Already configured. Only modify if adding new integrations. |

---

## 4. Adding Your Exhibit Page

1. Create a `.mdx` file inside `src/pages/` named after your topic (e.g. `heartbleed-bug.mdx`).
2. Add [frontmatter](#frontmatter) at the top of the file.
3. Write your content in Markdown and import components as needed.

### Frontmatter

Add this at the very top of your `.mdx` file before any content:

```yaml
---
layout: ../layouts/ExhibitLayout.astro
title: "Your Title Here"
description: "A short description of your topic."
author: "Surname, Firstname; Surname2, Firstname2"
readingTime: "67 minutes"
---
```

The frontmatter block is not rendered as content. Astro reads it to know which layout to use and what to put in the page's metadata.



---

## 5. Adding Components

Astro components (`.astro`) are ideal for static content like section wrappers, info cards, and image galleries.

Create `src/components/InfoCard.astro`:
```astro
---
const { title, body } = Astro.props;
---

<div class="info-card">
  <h3>{title}</h3>
  <p>{body}</p>
</div>

<style>
  .info-card {
    border: 1px solid var(--border-color);
    padding: 1rem;
    border-radius: 8px;
  }
</style>
```

Then use it in your `.mdx`:
```mdx
import InfoCard from '../components/InfoCard.astro';

<InfoCard title="What is a buffer over-read?" body="It occurs when a program reads more data than was intended from a buffer." />
```

### 5.1 React Components

React components (`.jsx` or `.tsx`) are used for interactive elements like quizzes, simulations, and timelines. They run in the browser.

1. Create your component in `src/components/` with a default export:
```jsx
// src/components/MyComponent.jsx
export default function MyComponent() {
  return <div>Hello from React!</div>;
}
```

2. Import and use it in your `.mdx`:
```mdx
import MyComponent from '../components/MyComponent.jsx';

<MyComponent client:load />
```

> **Note on `client:` directives:** By default, Astro renders React components as static HTML. Add a `client:` directive to make them interactive in the browser.
>
> | Directive | When it hydrates |
> |---|---|
> | `client:load` | Immediately on page load |
> | `client:visible` | When the component scrolls into view |
> | `client:idle` | When the browser is idle |

---

# Astro and MDX Guide

## 6. What is Astro and MDX?

### Astro
- Astro is a modern web framework designed for building fast, content-focused websites.
- Astro defaults to zero client-side JavaScript, making pages render faster.
- Astro also supports multiple frameworks at once.
- For more information: https://docs.astro.build/en/getting-started/

### MDX
- MDX is a Markdown + JSX tool that lets you add interactive elements to your Markdown pages.
- You can import components, create charts and diagrams, and build interactive elements using Markdown.
- For more information: https://mdxjs.com/docs/

---

## 7. Writing an MDX File

Place your `.mdx` files inside `src/pages/`. Astro will handle routing automatically.

```
└── src/
    └── pages/
        └── topic_name.mdx  <--- your exhibit page
```

---

## 8. Rendering Your MDX File

Astro handles routing automatically once your `.mdx` file is in `src/pages/`.

1. Run the server:
```
npm run dev
```

2. Visit your page at `localhost:4321/virtual-exhibit-template/topic_name`.