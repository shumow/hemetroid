# Hemetroid development plan

Build Hemetroid as a desktop browser game in JavaScript using KAPLAY 3001.0.19 and the MIT-licensed JSLegend Metroidvania starter. First verify that the starter actually works on KAPLAY. Then build one room that makes running, jumping, and blasting cartoon butt monsters feel good. Expand it into a short adventure only after that room is fun to replay.

## Implementation status

The starter passed a side-by-side Chromium check on both Kaboom and KAPLAY. The check used keyboard input for movement and melee attacks, then set positions and applied damage to exercise respawn, the boss reward, both directions of travel, and the ending. The original and migrated copies are still available in the investigation folder.

The four-room playtest lives in [game](game/README.md). It adapts the starter’s scene and collider patterns with original level geometry, sprites, and ranged combat. The user verified the Airlock replay fix before the map expansion.

All three four-room tests are playable and launch directly from the area menu. Chromium playthroughs verified both campaign handoffs and the required abilities. Overflow Vault starts with Double Jump and Flush Dash, saves the lift switch state, and records campaign completion at the exit. Replaying an earlier test preserves the campaign checkpoint and the existing saved runs. Manual Save Game remains available.

The sound pass added original synthesized effects, a saved mute setting, and silence while paused. Chromium checks measured browser audio output and verified cue timing in all three areas. The Spillway landing has more room for dash timing, and a double jump alone still cannot cross it.

The user confirmed that the revised room labels are readable in Safari and reported a successful Safari campaign handoff after reloading. Targeted Firefox tests verified both area handoffs, inherited abilities, final campaign completion after reload, audio startup, and mute persistence. Manual Save Game is now hidden by default, with a session-only toggle in Developer Settings.

## What we’re building

The first shareable build is a set of short side-scrolling adventures, with a target of 5–10 minutes per four-room test. Each test prototypes a future area of the connected maze. The first teaches movement, combat, and the value of returning to an earlier obstacle with a new powerup. Later tests explore distinct hazards and build on the abilities earned in earlier areas.

| Area | First release |
| --- | --- |
| Platform | Desktop browser, keyboard controls, static hosting, plain JavaScript modules and a pinned copy of KAPLAY. |
| Movement | Run and jump from the start. Double Jump and a proposed horizontal dash unlock through labeled toilet paper pickups. Arrows or A/D to move, X or Space to jump, Z or J to fire. |
| Combat | One forward-firing blaster, usable in the air; two enemy behaviors; one miniboss. |
| World | Three selectable four-room tests. Each has a small loop or return route that can become part of the later maze. |
| Progress | Area selection launches play directly. Relays handle recovery within an area. Completing an area saves campaign progress, carries forward abilities, and unlocks the next area. Keep manual Save Game available during playtesting. |
| Presentation | Original or clearly licensed art and audio, health display, control prompts, pause and mute. |

For the first WIP, defer touch controls, gamepads, aiming in multiple directions, inventory, maps, alternate routes, additional weapons, procedural levels, and a larger campaign.

## 0. Verify the migration before committing to the fork

**Starting point:** The [investigation](investigation/FINDINGS.md) pinned upstream commit `5a2ef84` and prepared a local copy with a one-line swap from Kaboom 3000.1.17 to KAPLAY 3001.0.19. Imports and map files passed static checks. Browser gameplay remains unverified.

1. Run the original and migrated copies on a local HTTP server and check both in the same desktop browser. Use the existing test copy for this comparison; treat its bundled assets as evaluation material.
2. Play through the intro, movement, sword attack, damage, death, boss defeat, double-jump unlock, room transitions in both directions, and ending. Watch for loading errors, input that stops working after a transition, and duplicate events after re-entering a room. Check that sound works after a keypress.
3. Reproduce any failure on the original. Fix only migration differences at this stage and record the browser and results. Keep KAPLAY pinned to the verified version. Its [3001 migration guide](https://v4000.kaplayjs.com/docs/guides/migration-kaplay/) is the baseline; [4000 changes APIs the starter uses](https://v4000.kaplayjs.com/docs/guides/migration-4000/).

**Done when:** The KAPLAY build completes the same gameplay loop as the original, or we’ve documented the specific blockers. If the starter needs changes across several core systems just to match the original, spend a short spike building movement and shooting in a clean KAPLAY scene. Choose the smaller foundation based on the results before producing levels or art.

## 1. Make one room playable

1. Set up the Hemetroid working project separate from the investigation. Preserve applicable upstream and KAPLAY notices. Start with simple original shapes, a system font, and silence or original sound placeholders. Leave the starter’s assets out of the new project unless their terms are verified.
2. Adapt the existing movement, collision, and camera code. Put movement speed, jump force, shot speed, cooldown, and invulnerability duration in one place so they’re easy to tune. Register input and animation callbacks once per player instance and clean them up on scene exit; fix the starter’s pattern of adding another animation callback on each attack.
3. Replace the sword hitbox with a projectile. A shot travels in the facing direction, damages one enemy once, disappears on walls or at the end of its range, and can be fired while jumping. Keep the projectile’s hit detection reliable at its chosen speed; verify thin walls and fast shots before tuning further.
4. Add a ground enemy that patrols, turns at walls or ledges, and hurts on contact. Give the player a short invulnerability window after damage and clear feedback for hits and defeats. Add a health display, instant room restart, and prompts for the basic controls.
5. Playtest several short runs. Tune how quickly the player stops, how forgiving the jumps are, and how easily a shot can be read against the room. Make the opening enemy teach shooting without requiring the player to take a hit.

**Done when:** A first-time player can enter, move, jump, shoot on the ground and in the air, defeat the enemy, and finish the room without coaching. Repeated restart doesn’t multiply shots, inputs, or damage. This is the first build worth sharing for feedback.

## 2. Build the exploration loop

```text
Airlock → Junction ↔ Boss wing
             │           └─ Boss awards double jump
             └─ High ledge → Upper exit
```

| Room | Job |
| --- | --- |
| Airlock | Teach movement and shooting with a safe jump and a ground enemy. |
| Junction | Show a high ledge that a normal jump cannot reach. Put the checkpoint and boss-wing route where players can find them. |
| Boss wing | Introduce a hopping enemy and a miniboss with a visible windup, dodgeable poop projectiles, and a recovery window. On defeat, drop a labeled toilet paper roll that grants double jump when touched. |
| Upper exit | Reward the return trip with a short platforming section that uses double jump and ends at the escape door. |

Adapt the starter’s room transitions and collision loading. Use stable room, entrance, and checkpoint IDs; keep room data separate from gameplay code. If we keep Tiled JSON, read layers by name so reordering them won’t break collision or spawn data. Use one transition path that clears projectiles and room-specific callbacks and puts the player clear of the destination doorway.

Respawn at the last checkpoint with full health. Ordinary enemies reset on room entry. Save a versioned record in browser storage at checkpoint activation, boss defeat, and pickup collection. If the boss is defeated and the roll is unclaimed, show it again on re-entry. If storage is unavailable or the save is unreadable, allow a fresh run and make it clear whether progress can be saved.

**Done when:** A new player sees the blocked route, defeats the boss, touches the Double Jump roll, returns to the junction, reaches the high ledge, and escapes. A reload before pickup preserves the unclaimed roll. A reload after pickup preserves the ability and boss defeat. Dying and returning to rooms repeatedly cannot trap the player or remove an earned ability.

## 3. Streamline area selection and save progress at area boundaries

**Area menu.** Make the start or resume choice before area selection. **New Game** shows a fresh campaign with only Deep Facility available. Warn that starting Deep Facility replaces the current campaign and area saves. Back leaves the existing save intact. **Replay Areas** shows the current unlocks and starts the selected area without resetting the campaign. **Continue** shows saved runs and resumes the selected one. Every area selection launches directly. Ask about replacing an existing area save only if the player explicitly uses Save Game during a replay.

**Within an area.** Relays are local recovery points. Defeat and **R** return to the last relay with full health, or to the area entrance before the first relay. Track local boss defeats and collected pickups so a retry or revisit preserves that area’s progress. Ordinary enemies and active fights reset. Developers can opt into pause-menu **Save Game** for the current session. It saves a safe room entrance for the current run.

**Across areas.** Completing an area is the campaign equivalent of reaching a relay. At the exit, automatically record the completed area, earned abilities, newly unlocked routes, and the next safe area entrance in one save. In the connected maze, campaign **Continue** will resume at that area checkpoint. Returning to an earlier area should preserve the player’s earned abilities and that area’s boss and pickup state. Starting an isolated replay from the playtest menu should preserve the campaign checkpoint and later unlocks.

**Migration and retirement.** Keep stable area, room, and entrance IDs. Read existing manual and automatic saves, including the relay checkpoint, boss state, and Double Jump status. Earlier saves without a completion record can finish Deep Facility to create the first campaign checkpoint. Hide the manual Save Game action by default and keep it available through Developer Settings for testing. Preserve compatibility with existing manual saves.

**Done when** selecting an area launches or resumes it in one click. Save Game still works in the current build. Defeat retries within the area. Completing an area saves campaign progress and opens the next route. Reloading at the boundary, revisiting an earlier area, and replaying a test preserve earned abilities and unlocks.

## 4. Build the four-room area tests

| Test | Four rooms | What it tests | Entry requirement |
| --- | --- | --- | --- |
| 01 · Deep Facility | Airlock → Relay Junction ↔ Containment Wing → Upper Exit via the junction | Shooting, boss timing, the Double Jump roll, and the first return to a visible gate. | Available from the start. |
| 02 · Pipeworks | Intake → Pump Junction ↔ Valve Chamber → Spillway via the junction | Start with Double Jump. Earn a proposed **Flush Dash** pickup in the Valve Chamber and use it to clear a wide gap on the way out. | Finish Deep Facility and collect Double Jump. |
| 03 · Overflow Vault | Lift Entry → Split Shaft ↔ Overflow Chamber → Escape Lift via the shaft | Start with Double Jump and Flush Dash. Climb the shaft, cross a guarded basin to power the lift, then combine both moves to reach the exit. | Finish Pipeworks and collect Flush Dash. |

Show all three tests in the menu from the start. Locked entries explain the requirement, such as “Finish Deep Facility and collect Double Jump.” An upgrade collected before the exit unlocks its in-area route. Reaching that exit saves campaign progress and unlocks the next menu entry if the required pickup was collected. Use the completion screen to test that handoff before the areas are physically connected.

Use the same room format, collision rules, pickup system, and checkpoint logic across all tests. Give each test its own room IDs and mark possible future connections, such as a service door or lift. During development, use test saves to exercise later areas and combinations directly. The player-facing menu follows the normal unlock rules.

**Done when** a fresh profile can play the tests in order, each area starts with the abilities its rooms require, and replaying an earlier test leaves later tests accessible. Each four-room test has an identifiable traversal idea worth carrying into the connected maze.

## 5. Give the game its own identity

Replace placeholders with an original player, facility tiles, and cartoon butt enemies. Keep the ground enemy, hopper, and boss visually distinct even in silhouette. Prioritize a readable shot, impact flash, jump and landing cues, and a clearly telegraphed boss attack. Add a compact title screen, a brief unlock message, and a distinct escape screen. Add sound effects after the animation timing feels right.

Maintain `THIRD_PARTY_NOTICES.md` with each retained code or asset source, creator, license, and required attribution. Keep the JSLegend and KAPLAY MIT notices. The [starter’s art pack page](https://venoxxx.itch.io/pixxxelpunkkk-toolkit) lists CC BY 4.0 and separate reuse language; the starter’s font and sound permissions are incomplete. Prefer original replacements and confirm terms for anything we keep. Check that the release contains no GPLv3 material and no Nintendo sprites, music, or level maps.

**Done when:** Players can read hazards, projectiles, and the boss windup at normal speed. The game still communicates hits and danger with sound muted. Every included asset has a known source and documented terms.

## 6. Verify and package the first release

Run a full clean playthrough in desktop Chrome, Firefox, and Safari. Check window resizing and letterboxing, pause on focus loss, audio starting after input, keyboard focus and page scrolling, and reload before and after a pickup. Verify direct area launch, relay retry, manual-save compatibility, and a reload immediately after completing each area. Confirm campaign Continue resumes at the newly reached area boundary and that replaying an older test preserves the campaign checkpoint. Test a missing or malformed save and an environment where storage is unavailable. Add focused automated checks for save migration, valid room links, and the unlock sequence.

Give the build to a few first-time players. Ask them to play without instructions beyond what’s on screen. Watch for three things: can they fire and jump without confusion, do they understand where to go after the boss, and do they want to replay the fight? Fix confusing controls, missed gates, and stalls before adding content.

Package the game as a static folder with an `index.html`, local JavaScript and assets, license notices, and a README covering controls and local preview. Check the packaged build on an HTTP server under a subpath so broken asset URLs show up before hosting. Keep a local playtest build available for review.

**Release bar:** A first-time player can finish the game in the target time range; save and recovery work; combat and transitions stay stable through repeated attempts; supported browsers show no gameplay-blocking errors; and every distributed asset has a known license.

## Effort and decision points

These are rough focused developer days for one person, assuming placeholder art for the early playtests. Original art and sound can expand the estimate substantially.

| Milestone | Estimate | Decision it enables |
| --- | --- | --- |
| Migration verification | 0.5–1 day | Keep the starter or use a clean KAPLAY project. |
| One playable room | 2–3 days | Decide whether movement and shooting feel good enough to expand. |
| First four-room loop and checkpoint saves | Built | Confirm the boss, backtracking, and upgrade are satisfying. |
| Manual save and initial area menu | Built | Validated saves, safe resume points, and the first unlock in Deep Facility. |
| Direct area launch and campaign checkpoints | Built | Verified the menu and automatic saving from Deep Facility into Pipeworks. |
| Pipeworks | Built | Verified inherited Double Jump, Flush Dash collection, and the Spillway gap. |
| Overflow Vault | Built | Verified the second campaign handoff, the persistent lift switch, and traversal with both abilities. |
| Original art and sound cues | Built | Verified gameplay cues, mute persistence, and pause in Chromium. |
| Playtests, browser fixes, and packaging | 1–2 days | Decide whether the build is ready to share. |

**WIP release** The [0.1.0-wip.1 archive](releases/hemetroid-0.1.0-wip.1.zip) contains the static three-area game, launch instructions, release notes, and third-party notices. The extracted archive passed subfolder smoke tests in Chromium, Firefox, and WebKit. These checks covered asset loading, a fresh start, save restoration, and both campaign entrances.

## 7. Next WIP release: connect the facility

**Carry forward from the roadmap.** Run first-time player sessions on the existing WIP. Watch for unclear controls, missed doors or pickups, and boss attacks that are hard to read. Fix the stalls that show up in those sessions. The original roadmap also called for turning the three area tests into parts of a connected facility.

**Proposed 0.2 scope.** Link the existing rooms through physical exits and return routes. Make campaign traversal preserve earned abilities and the state of the areas already visited. Keep Replay Areas as a way to practice individual sections with their original starting gear. Keep Overflow Vault boss-free.

1. **Connect Deep Facility and Pipeworks first.** Use the Upper Exit and Intake as the first pair of connectors. Give each end a clear destination label and a safe arrival point. Unlock the return route after the first forward crossing. The first successful crossing records Deep Facility completion and the Pipeworks arrival checkpoint together. Returning to an earlier area keeps the most advanced campaign checkpoint.
2. **Apply the same rules at the Spillway and Lift Entry.** Keep earned Double Jump and Flush Dash when traveling back. Preserve boss defeats, collected rolls, and the Vault lift switch on revisits. Version the campaign save if needed and load existing 0.1 saves with their current unlocks and safe resume points. A standalone replay can retain its own run without rolling back campaign progress.
3. **Pilot a larger scrolling room.** Once both area connections work in both directions and survive a reload, expand Intake to roughly two or three screens wide. Keep the entrance and return door easy to spot. Use the extra space for distinct encounters and a route that makes Double Jump useful. Check camera tracking, signs, enemy visibility, and safe arrivals from either direction before choosing which other rooms to expand.
4. **Add a simple area map.** Show visited rooms, the current room, and the last relay. Mark a blocked route once the player sees it and show the required ability when the player has learned what the gate needs. Keep the map usable from the pause screen. Build it from the same room links that drive travel. Use the larger Intake playtest to decide how much detail players need inside each room.
5. **Add one optional return trip.** Put a visible Flush Dash gate in Deep Facility that leads to a small maintenance room. After earning Dash in Pipeworks, players can return for a labeled toilet paper pickup that adds one permanent suit-health pip. Use this detour to test whether backtracking is rewarding before adding a fourth major area.

### Release checks

- A fresh player can travel through all three areas using in-world exits. A return trip never drops earned abilities, resets a defeated boss, or repeats a collected pickup.
- Reloading immediately after either forward crossing resumes at the new area checkpoint. Returning to an earlier area, retrying at a relay, and replaying an area all preserve the furthest campaign handoff.
- An existing 0.1 save still loads. The optional suit upgrade stays collected through retry, travel, and reload.
- The larger Intake reads clearly while scrolling. Players can locate both exits, and camera movement keeps threats and signs visible in time to react.
- First-time players can find the next route and tell a blocked gate from an unexplored one. The static package passes the existing browser and subfolder checks.

**0.2 WIP candidate.** Both transfers, scrolling Intake, the pause map, and Maintenance Bay are in the [0.2.0-wip.1 archive](releases/hemetroid-0.2.0-wip.1.zip). The extracted build passed subfolder smoke checks in Chromium, Firefox, and WebKit. Those checks covered a fresh start, the map, automatic campaign resume, and both arrival checkpoints from older saves. First-time player sessions are still pending, especially for door and gate readability and the longer Intake.

## 8. Reveal the toilet through exploration

Set the connected facility in the plumbing beneath one enormous toilet. Arrange the pause map as a side view. Deep Facility forms the tank, Pipeworks traces the rim and bowl, and Overflow Vault curls down through the trap and pedestal. The optional Maintenance Bay sticks out from the tank as the flush handle.

Reveal rooms as the player visits them and draw connecting passages once both rooms are known. Keep the room names, current location, last relay, and discovered ability gates readable as the map fills in. The first few rooms should look like an ordinary facility schematic. The toilet shape should come together by the time the player reaches the Escape Lift, with the handle as a bonus for players who make the maintenance detour.

**Done when** a first-time player can navigate from the map and recognize the finished shape without a hint. Check that the early map gives away only explored rooms and that the main route makes a recognizable silhouette even when the player skips Maintenance Bay.

**Playtest status.** The local build reveals the map room by room. A fresh campaign playthrough reached Escape Lift with all 12 main-route rooms visible and the flush handle still hidden. Chromium, Firefox, and WebKit checks covered the completed map and its Back button. First-time player feedback on the reveal is pending.
