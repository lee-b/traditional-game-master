# Portrait provenance

Where the shipped stand-in character portraits come from, and what was done
to them. The monster and NPC tiles have their own provenance records (see
[token-readability.md](token-readability.md) and the JSON records beside
them); this file covers the plain adventurer plates the builder and rosters
fall back to.

## Default plates, 31 October 2026

Files:

- `public/assets/placeholders/character/masculine.webp`
- `public/assets/placeholders/character/feminine.webp`

Source: two cells of **"200 Free Lorestrome Portraits"** by Hyptosis, posted
to OpenGameArt.org on 7 May 2017 —
<https://opengameart.org/content/200-free-lorestrome-portraits> — collected
under **CC0 1.0** (the page lists `License(s): CC0`; OpenGameArt marks the
upload public-domain-dedicated). No attribution is required by the license;
this file records the source anyway.

Edits (recorded per file, in grid order, cell = 300px square in the source
sheet `portraits_1.png`):

- `masculine.webp`: row 20, column 1. Cropped from the source sheet, resized
  300x300 → 256x256 (LANCZOS) to match the plate set's existing size,
  encoded once to WebP quality 90. No other retouching.
- `feminine.webp`: row 0, column 1. Same crop, resize and encoding.

Both were reviewed as circular tokens at 96px and 40px on dark and light
surrounds per [token-readability.md](token-readability.md): the head fills
the circle, the background stays simple, and the silhouette reads at 40px.

## The previous plates, kept as alternatives

The plates these replaced — the previous `masculine.webp`, `feminine.webp`
and `neutral.webp` — are preserved unmodified at
`public/assets/character-plates/` under the same names. The builder's
portrait step offers them as the "Varied" pick (the default plates are
"Classic"); picking one saves it as the hero's own portrait, so a character
keeps that art everywhere the portrait shows. `neutral.webp` itself is
unchanged in the default set.

The previous plates were painted in-house by this project (see the visual
overhaul plan and placeholder job records); they keep whatever license the
project's own art carries.
