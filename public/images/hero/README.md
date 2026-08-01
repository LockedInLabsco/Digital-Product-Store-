# Homepage hero slideshow images

Drop the six lifestyle photos in this folder using these exact filenames.
The homepage hero slider (`src/components/home/HeroImageSlider.tsx`) picks
them up automatically — no code change needed.

- `working-dark-room.webp` — focused work late at night in a dim room
- `studying.webp` — studying or writing in a notebook
- `workout.webp` — training alone in a gym
- `running-rain.webp` — running through heavy rain
- `building.webp` — building a business / coding
- `early-morning.webp` — waking up early, preparing before sunrise

Any file that isn't present yet is skipped automatically and the slider
falls back to the current Website Media hero image (or the placeholder
mark if none is set) until it's uploaded. Recommended: `.webp`, roughly
1200×900px (4:3), optimized for the web.

To add, remove, or reorder slides — or point a slide at a different
filename — edit the `HERO_SLIDES` array in
`src/components/home/heroSlides.ts`.
