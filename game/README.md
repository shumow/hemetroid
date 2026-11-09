# Hemetroid · Deep Facility

Choose **New Game → Deep Facility** to start the first four-room playtest. Clear the Airlock, defeat the Bulwark, and touch the Double Jump roll. Use it to reach the escape pod and unlock **Pipeworks**. In Pipeworks, defeat the Sluice Guard, collect Flush Dash, and cross the Spillway. In **Overflow Vault**, use both abilities to climb the Split Shaft, power the lift, and escape.

From this folder, run a local server:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open [the local game](http://127.0.0.1:8765/) in a desktop browser with WebGL.

| Action | Keys |
| --- | --- |
| Move | Left/Right arrows or A/D |
| Jump | Space or X. Press again in midair after unlocking double jump. |
| Fire | Z or J (hold to keep firing) |
| Flush Dash | C, after collecting it |
| Pause or resume | Esc |
| Toggle sound | M or the Sound button |
| Retry from checkpoint | R |

Progress saves automatically at checkpoints and campaign handoffs. **Continue** loads the latest save for the selected area and starts at a safe entrance with earned upgrades intact. Retry starts at the last checkpoint, or the first room if you have yet to reach it. Saves are local to the browser and preview address.

**New Game** shows a fresh campaign with only Deep Facility available. Starting that area replaces your current campaign and area saves. **Back** lets you leave the menu before replacing anything. Use **Replay Areas** to start an unlocked area while keeping your campaign and saved runs. Selecting an area launches it directly.

Completing an area records a campaign checkpoint. **Continue Campaign** resumes at the next area with its inherited abilities. **Continue** loads an individual area save, including after completing all three tests.

Sound starts after you enter a game. Pause silences the effects, and your mute setting is saved separately from your progress.

## Development

Press **Option + Shift + D** on Mac or **Alt + Shift + D** elsewhere to open Developer Settings. **Show Save Game in the pause menu** restores manual saving for the current page session. Reloading hides the button again. Existing manual saves still load through **Continue**.

The game runs as static HTML, CSS, and JavaScript with a local copy of KAPLAY 3001.0.19. It builds on the starter's KAPLAY scene and collider patterns with new gameplay and original art. See [third-party notices](THIRD_PARTY_NOTICES.md).

Run the save and room-link checks with `node --test tests/progress.test.mjs`.
