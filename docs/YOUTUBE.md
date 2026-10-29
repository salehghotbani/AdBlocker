# YouTube in-player ad handling

**English** | [فارسی](YOUTUBE.fa.md)

Version 1.7.0 adds an isolated content script for desktop `www.youtube.com/watch` and standard YouTube/YouTube No-Cookie embeds. It handles native client-side ad states, including pre-roll and mid-roll, when the player exposes recognizable ad UI. This is targeted, best-effort support, not a guarantee for every account, region, player experiment or server-inserted advertisement.

## Behavior

- Require the player's native `ad-showing` state and visible ad-specific UI. A class name alone is insufficient. Ambiguous states and player errors leave normal playback visible.
- Conceal the ad video/overlay and mute its media while confirmed. Keep normal playback controls and the native Skip control usable. Click only a presented, enabled native Skip button, including the nested button in the newer component.
- For a stable short ad media source (finite duration up to 180 seconds), attempt bounded playback acceleration up to 16×. Never seek, assign the content's `currentTime`, call `play()`, replace a stream or block all of `googlevideo.com`. Long/unsupported media may retain a wait until the site's skip/end condition.
- Stop acceleration when the source/duration changes. Restore properties only while they still equal the extension's own applied values, preserving later user/site changes. Restore on ad completion, protection exceptions, navigation and page exit. A paused player stays paused.
- Global, site and exact-URL controls apply to this separate early script too. The existing placement counter covers cosmetic placements; it is not a lifetime count of skipped video ads.

The script does not rewrite player responses, patch browser/page prototypes, inject into the page's main world, request extra permissions, or transmit browsing/player data. Its local media identity is temporary and is never stored or logged by the extension. YouTube still runs its own scripts/networking and can observe DOM/media changes. Companion cards, creator sponsorship segments, mobile layouts and server-side stitched ads are outside this implementation.

## Validation status

Local tests use a **clearly synthetic** player and a self-generated WebM file with real browser decoding. They cover pre/mid-roll, modern/legacy native Skip controls, natural content completion, position/rate/mute restoration, source handoff with lingering ad UI, paused media, user overrides, SPA changes and global/site/URL exceptions. The packaged script runs in the actual isolated extension world in Chromium and Firefox. These fixtures are not proof of a live ad auction.

A real Chrome 156.0.8078.48 session displayed an actual in-player advertisement with protection OFF. Protection was enabled **during that same advertisement**, rather than inferring success from a different ad auction. Ad frames were concealed/muted and the native player returned to visible content at ordinary rate and unmuted state. The content then progressed normally through the observed post-ad interval. The [sanitized live report](YOUTUBE-LIVE-2026-10-29.json) records the measured bounds and final build/source identity where available.

**Real mid-roll validation remains incomplete.** A native progress-bar seek intended to reach a mid-roll opportunity encountered HTTP 403 responses from the media CDN and stalled. Separate OFF/no-extension checks also encountered playback failure around 45–47 seconds in this environment. The user reports normal playback in their Chrome, so this environment is not an equivalent long-play control. Do not present the seek as a passed mid-roll test, the no-inventory user-provided video as a successful blocking test, or the short post-ad observation as proof of full-video reliability.

Earlier long-ad trials remained concealed/muted without automatic return during the observation window. Native Skip acceptance/availability varies; this implementation may leave a wait, especially after source handoff. No universal blocking percentage is inferred.

## Reproduce

Run `npm run package:stores` first. For live observation in an isolated installed Chrome profile:

```powershell
$env:CHROMIUM_PATH='C:/Program Files/Google/Chrome/Application/chrome.exe'
$env:ADBLOCK_LIVE_YOUTUBE='1'
$env:ADBLOCK_YT_TOGGLE_ON_AD='1'
$env:ADBLOCK_YT_VIDEOS='eFeDpUVEy48,_gCXmKjDecU'
$env:ADBLOCK_YT_SECONDS='180'
npm run test:youtube-live
```

The harness uses the browser's extension-debugging protocol in its **own project-local profile**, with browser audio output muted. It never connects to a personal profile, fabricates an ad, injects a player response, signs in, clicks an advertiser, or bypasses an access challenge. Only an explicit cookie-refusal button is used if present. `ADBLOCK_YT_SEEK=1` additionally attempts an ordinary progress-bar seek after content resumes; this action is logged and is not extension behavior. `ADBLOCK_YT_NO_EXTENSION=1` with `ADBLOCK_YT_PHASE=off` provides a no-add-on control. Live tests remain opt-in outside CI.

`npm run test:youtube` runs deterministic fixtures; `npm run test:firefox` includes actual Firefox media integration. Raw logs/screenshots/test cookies remain in ignored `artifacts/` and `.cache/`. The public report excludes cookies, account data, signed media URLs and IP addresses. [Full validation](TESTING.md).
