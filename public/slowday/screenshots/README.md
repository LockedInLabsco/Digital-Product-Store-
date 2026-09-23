# SlowDay screenshots

Drop real app screenshots here using these exact filenames:

- `home.png`
- `focus.png`
- `slowday.png`
- `progress.png`

Then open `src/lib/waitlist/slowdayContent.ts` and set the `src` field on
each entry in `SLOWDAY_SCREENS`, e.g.:

```ts
export const SLOWDAY_SCREENS: { key: string; label: string; src?: string }[] = [
  { key: 'home', label: 'Home', src: '/slowday/screenshots/home.png' },
  { key: 'focus', label: 'Focus', src: '/slowday/screenshots/focus.png' },
  { key: 'slowday', label: 'SlowDay', src: '/slowday/screenshots/slowday.png' },
  { key: 'progress', label: 'Progress', src: '/slowday/screenshots/progress.png' },
]
```

That's the only code change needed — the hero (top 2 screens) and the
"A look inside SlowDay" preview section both read from this same list,
so setting `src` here updates both places at once. Any entry left
without a `src` keeps showing its calm placeholder frame instead.

Recommended: real portrait phone screenshots (e.g. ~1170×2532px, PNG),
under ~500KB each after compression.
