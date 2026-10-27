# Logo assets

The source logo is [images/logo.png](images/logo.png). It was created with the built-in image generation tool for this project, with transparency preserved. Browser icons are committed in `extension/icons/` at 16, 32, 48, and 128 pixels. Builds copy those PNGs directly without an image-generation service or browser dependency.

The popup uses the same logo as the browser icon. When protection is off for the current page, the logo and interface become grayscale while preserving the user's light/dark preference.

To resize the source logo again, set `CHROMIUM_PATH` to your test browser and run `node scripts/prepare-icons.mjs` after installing development dependencies.

## Generation prompt

Use case: logo-brand. Asset type: production logo and browser-extension icon for AdBlocker, an existing Persian-interface ad and tracker blocker. Create one original, minimal, bold geometric shield emblem with a clear integrated checkmark and subtle blocked-ad negative space. Flat vector-like graphic rendered as a high-quality raster, crisp edges, large simple forms legible at 16 pixels. Use the existing app palette: vivid mint/emerald (#2dd4a3) with deep ink/navy (#101722); no additional colors. Centered square composition, emblem fills about 84% of the canvas with even transparent margins. Genuinely transparent background and transparent outside the shield, solid opaque interior shapes. No letters, no words, no gradients, no shadows, no 3D, no mockup, no watermark, no border around the canvas. One logo only, suitable for both light and dark UI.
