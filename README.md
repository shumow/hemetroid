# Hemetroid

Hemetroid is a work-in-progress browser Metroidvania. The first playtest covers 12 rooms across Deep Facility, Pipeworks, and Overflow Vault.

- [Download the WIP build](releases/hemetroid-0.1.0-wip.1.zip)
- [Launch instructions, controls, and developer settings](game/README.md)
- [Development plan](DEVELOPMENT_PLAN.md)
- [Third-party notices](game/THIRD_PARTY_NOTICES.md)

To run the source checkout, serve `game/` with a local HTTP server and open it in a desktop browser with WebGL.

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory game
```

Open [the local game](http://127.0.0.1:8765/). Run the save and room-link checks with `node --test game/tests/*.test.mjs`.
