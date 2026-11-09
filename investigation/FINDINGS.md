# KAPLAY migration investigation

Investigated 2026-11-04. Recommendation: use KAPLAY 3001 for the initial migration. The starter is a useful small foundation, but needs ranged combat and more world/persistence systems for Hemetroid.

## Local experiment

- Source: https://github.com/JSLegendDev/JavaScript-Metroidvania
- Inspected commit: `5a2ef84de0978e790b0edf035cf5a5a1901fa44c`
- Original vendored library: Kaboom 3000.1.17.
- Downloaded KAPLAY 3001.0.19 to `javascript-metroidvania/lib/kaplay.mjs`.
- Changed only the library import in `src/kaboomLoader.js`; kept the original library for comparison.
- Preserved upstream MIT license and saved the KAPLAY repository license in `lib/KAPLAY-LICENSE`.
- No remote fork, publication, or Hemetroid implementation was created.

## Existing gameplay

13 JavaScript source files; two rooms with Tiled JSON collision/placement data and prerendered PNG scenery. Includes camera zones, room transitions, health pickups, flying enemies, a boss encounter, a double-jump reward, and an ending. Player attacks use a short-lived sword hitbox, not bullets. State persists between scenes only and resets on page reload.

## Migration assessment

The starter imports the engine through one file and uses ordinary Kaboom 3000 APIs. KAPLAY's official migration guide describes 3001 as a compatible continuation. A one-line library import replacement is the initial migration candidate; successful gameplay has NOT been verified.

Avoid targeting 4000 for this first experiment: its migration guide lists API changes including removal of `make()`, which the starter uses, and changes to component/tag behavior.

References:
- https://v4000.kaplayjs.com/docs/guides/migration-kaplay/
- https://kaplayjs.com/next/
- https://v4000.kaplayjs.com/docs/guides/migration-4000/

## Checks and remaining verification

Passed: downloaded KAPLAY module parses with Node; every relative source import resolves; both map JSON files parse and contain eight layers.

Not verified: browser rendering, audio, collisions, movement, attacking, boss defeat, double-jump unlock, room transitions, death/restart, or the ending. Browser-control connection failed and native browser connection timed out. Static checks do not establish runtime compatibility.

To preview from this directory:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory javascript-metroidvania
```

Visit http://127.0.0.1:8765 . Enter starts; arrows move; X jumps; Z attacks. A local HTTP server is needed for the module and JSON requests.

## Assets

The code has an MIT license. The art provider's current page lists CC BY 4.0 but also says assets may be used/modified in games and cannot be resold. Confirm the applicable asset terms before distributing source assets; use original or clearly licensed replacements for Hemetroid.

https://venoxxx.itch.io/pixxxelpunkkk-toolkit

The only bundled sound credit identifies `health.wav` by @Shades and a SoundCloud URL, without a permission/license grant. Font licensing and the remaining audio provenance are not established by the repository documentation. Replace or resolve these before distributing the game.

## Hemetroid work beyond migration

Add a blaster/projectiles and airborne firing; original enemy art and behaviors; saved progress/checkpoints; an expanded connected map with upgrade gates; and a minimap if desired. Clean up existing event lifecycles: `player.js` registers an animation-end callback inside each attack, so callbacks accumulate as attacks repeat.
