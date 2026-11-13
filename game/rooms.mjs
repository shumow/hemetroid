export const WIDTH = 640;
export const HEIGHT = 360;
export const FLOOR = 302;
export const CHECKPOINT = { id: "junction", room: "junction", spawn: "checkpoint", x: 132 };
export const PIPE_CHECKPOINT = { room: "pump-junction", spawn: "checkpoint", x: 132 };
export const VAULT_CHECKPOINT = { room: "split-shaft", spawn: "checkpoint", x: 124 };
const floor = { x: 0, y: FLOOR, w: WIDTH, h: HEIGHT - FLOOR };
const VAULT_DECK = 254;
const SPILLWAY_WEST = 205;
const SPILLWAY_BANK = 490;
const INTAKE_WIDTH = 1472;
const platform = (x, y, w, h) => ({ x, y, w, h });
const ledge = (x, y, w) => ({ ...platform(x, y, w, 16), oneWay: true });

export const rooms = {
  airlock: {
    number: "01", name: "The Airlock", accent: "#5a8591",
    platforms: [floor, platform(249, 257, 42, 45), platform(330, 223, 88, 14)],
    spawns: { entry: { x: 46, feet: FLOOR, facing: 1 } },
    doors: [
      { x: 24, feet: FLOOR, label: "ENTRY" },
      { x: 567, feet: FLOOR, label: "JUNCTION", to: "junction", spawn: "airlock", lock: "patrol" },
    ],
    enemies: [{ kind: "patrol", x: 465, left: 346, right: 515 }],
  },
  junction: {
    number: "02", name: "Relay Junction", accent: "#549793",
    platforms: [floor, ledge(316, 198, 218)],
    spawns: {
      airlock: { x: 91, feet: FLOOR, facing: 1 },
      checkpoint: { x: CHECKPOINT.x, feet: FLOOR, facing: 1 },
      boss: { x: 532, feet: FLOOR, facing: -1 },
      upper: { x: 413, feet: 198, facing: -1 },
      maintenance: { x: 286, feet: FLOOR, facing: 1 },
    },
    doors: [
      { x: 16, feet: FLOOR, label: "AIRLOCK" },
      { x: 567, feet: FLOOR, label: "BOSS WING", to: "boss", spawn: "junction" },
      { x: 459, feet: 198, label: "UPPER EXIT", to: "upper", spawn: "junction", lock: "doubleJump" },
    ],
    campaignDoors: [{ x: 210, feet: FLOOR, label: "MAINTENANCE", to: "maintenance", spawn: "junction", lock: "flushDash", interact: true }],
    enemies: [],
  },
  boss: {
    number: "03", name: "Containment Wing", accent: "#a5758d",
    platforms: [floor],
    spawns: { junction: { x: 85, feet: FLOOR, facing: 1 } },
    doors: [{ x: 16, feet: FLOOR, label: "JUNCTION", to: "junction", spawn: "boss" }],
    enemies: [
      { kind: "hopper", x: 222, left: 170, right: 290 },
      { kind: "boss", x: 500 },
    ],
    reward: { x: 524, y: FLOOR - 28, ability: "doubleJump", label: "DOUBLE JUMP" },
  },
  upper: {
    number: "04", name: "Upper Exit", accent: "#aa9e6b",
    platforms: [floor, ledge(172, 252, 74), ledge(331, 197, 309)],
    spawns: { junction: { x: 86, feet: FLOOR, facing: 1 }, intake: { x: 501, feet: 197, facing: -1 } },
    doors: [
      { x: 16, feet: FLOOR, label: "JUNCTION", to: "junction", spawn: "checkpoint" },
      { x: 550, feet: 197, label: "ESCAPE POD", finish: true,
        handoff: { label: "PIPEWORKS", area: "pipeworks", to: "intake", spawn: "entry", forward: true, lock: "doubleJump" } },
    ],
    enemies: [],
  },
  intake: {
    number: "01", name: "Intake", accent: "#57b4b1", pipeworks: true, width: INTAKE_WIDTH,
    platforms: [
      platform(0, FLOOR, INTAKE_WIDTH, HEIGHT - FLOOR),
      ledge(258, 212, 135), ledge(410, 166, 218), platform(632, 209, 76, 93),
      ledge(1060, 202, 395),
    ],
    spawns: { entry: { x: 85, feet: FLOOR, facing: 1 }, pump: { x: 1330, feet: 202, facing: -1 } },
    doors: [{ x: 1390, feet: 202, label: "PUMP JUNCTION", to: "pump-junction", spawn: "intake" }],
    campaignDoors: [
      { x: 16, feet: FLOOR, label: "DEEP FACILITY", area: "deep-facility", to: "upper", spawn: "intake", requiresArea: "deep-facility" },
    ],
    enemies: [
      { kind: "patrol", x: 211, left: 160, right: 239 },
      { kind: "hopper", x: 845, left: 758, right: 903 },
      { kind: "patrol", x: 981, left: 928, right: 1004 },
    ],
    signs: [
      { text: "↑ DOUBLE JUMP", x: 227, y: 238 },
      { text: "↑ OVER THE INTAKE BAFFLE", x: 552, y: 137 },
      { text: "↑ PUMP JUNCTION", x: 1021, y: 227 },
    ],
  },
  "pump-junction": {
    number: "02", name: "Pump Junction", accent: "#57b4b1", pipeworks: true,
    platforms: [floor, ledge(315, 206, 152)],
    spawns: {
      intake: { x: 91, feet: FLOOR, facing: 1 },
      checkpoint: { x: PIPE_CHECKPOINT.x, feet: FLOOR, facing: 1 },
      valve: { x: 532, feet: FLOOR, facing: -1 },
    },
    doors: [
      { x: 391, feet: 206, label: "SPILLWAY", to: "spillway", spawn: "junction", lock: "flushDash" },
      { x: 567, feet: FLOOR, label: "VALVE CHAMBER", to: "valve-chamber", spawn: "junction" },
    ],
    campaignDoors: [{ x: 16, feet: FLOOR, label: "INTAKE", to: "intake", spawn: "pump" }],
    enemies: [],
  },
  "valve-chamber": {
    number: "03", name: "Valve Chamber", accent: "#c49a60", pipeworks: true,
    platforms: [floor],
    spawns: { junction: { x: 85, feet: FLOOR, facing: 1 } },
    doors: [{ x: 16, feet: FLOOR, label: "JUNCTION", to: "pump-junction", spawn: "valve" }],
    enemies: [
      { kind: "hopper", x: 222, left: 170, right: 290 },
      { kind: "boss", x: 500, name: "SLUICE GUARD", sprite: "sluice-guard" },
    ],
    reward: { x: 524, y: FLOOR - 28, ability: "flushDash", label: "FLUSH DASH" },
  },
  spillway: {
    number: "04", name: "Spillway", accent: "#5bc0b1", pipeworks: true,
    platforms: [platform(0, FLOOR, SPILLWAY_WEST, HEIGHT - FLOOR), platform(SPILLWAY_BANK, FLOOR, WIDTH - SPILLWAY_BANK, HEIGHT - FLOOR)],
    spawns: { junction: { x: 71, feet: FLOOR, facing: 1 }, vault: { x: 529, feet: FLOOR, facing: -1 } },
    doors: [
      { x: 16, feet: FLOOR, label: "JUNCTION", to: "pump-junction", spawn: "checkpoint" },
      { x: 563, feet: FLOOR, label: "EXIT LIFT", finish: true,
        handoff: { label: "OVERFLOW VAULT", area: "overflow-vault", to: "lift-entry", spawn: "entry", forward: true, lock: "flushDash" } },
    ],
    enemies: [],
    signs: [
      { text: "JUMP · JUMP · DASH →", x: 137, y: 239 },
      { text: "← DASH BACK", x: 490, y: 239 },
    ],
    pit: { left: SPILLWAY_WEST, right: SPILLWAY_BANK, label: "WIDE GAP" },
  },
  "lift-entry": {
    number: "01", name: "Lift Entry", accent: "#c5a0dc", vault: true,
    platforms: [floor, platform(263, 216, 74, 86)],
    spawns: { entry: { x: 85, feet: FLOOR, facing: 1 }, shaft: { x: 518, feet: FLOOR, facing: -1 } },
    doors: [{ x: 565, feet: FLOOR, label: "SPLIT SHAFT", to: "split-shaft", spawn: "entry" }],
    campaignDoors: [
      { x: 16, feet: FLOOR, label: "PIPEWORKS", area: "pipeworks", to: "spillway", spawn: "vault", requiresArea: "pipeworks" },
    ],
    enemies: [{ kind: "patrol", x: 208, left: 154, right: 219 }],
    signs: [{ text: "↑ DOUBLE JUMP", x: 221, y: 186 }],
  },
  "split-shaft": {
    number: "02", name: "Split Shaft", accent: "#b995cd", vault: true,
    platforms: [floor, ledge(166, 214, 140), ledge(340, 118, 270)],
    spawns: {
      entry: { x: 81, feet: FLOOR, facing: 1 },
      checkpoint: { x: VAULT_CHECKPOINT.x, feet: FLOOR, facing: 1 },
      chamber: { x: 490, feet: 118, facing: -1 },
      lift: { x: 509, feet: FLOOR, facing: -1 },
    },
    doors: [
      { x: 548, feet: 118, label: "OVERFLOW CHAMBER", to: "overflow-chamber", spawn: "shaft" },
      { x: 562, feet: FLOOR, label: "ESCAPE LIFT", to: "escape-lift", spawn: "shaft", lock: "liftPowered" },
    ],
    campaignDoors: [{ x: 16, feet: FLOOR, label: "LIFT ENTRY", to: "lift-entry", spawn: "shaft" }],
    enemies: [],
    signs: [{ text: "↑ UPPER ROUTE", x: 210, y: 237 }],
  },
  "overflow-chamber": {
    number: "03", name: "Overflow Chamber", accent: "#d3a072", vault: true,
    platforms: [platform(0, FLOOR, 205, HEIGHT - FLOOR), platform(486, VAULT_DECK, 154, HEIGHT - VAULT_DECK)],
    spawns: { shaft: { x: 73, feet: FLOOR, facing: 1 } },
    doors: [{ x: 16, feet: FLOOR, label: "SPLIT SHAFT", to: "split-shaft", spawn: "chamber" }],
    enemies: [
      { kind: "patrol", x: 149, left: 138, right: 167 },
      { kind: "hopper", x: 544, left: 524, right: 570, feet: VAULT_DECK },
    ],
    liftSwitch: { x: 594, feet: VAULT_DECK },
    signs: [{ text: "JUMP · JUMP · DASH →", x: 150, y: 236 }],
    pit: { left: 205, right: 486, label: "OVERFLOW BASIN" },
  },
  "escape-lift": {
    number: "04", name: "Escape Lift", accent: "#a8d2ad", vault: true,
    platforms: [platform(0, FLOOR, 160, HEIGHT - FLOOR), ledge(343, 224, 85), ledge(542, 141, 98)],
    spawns: { shaft: { x: 72, feet: FLOOR, facing: 1 } },
    doors: [
      { x: 16, feet: FLOOR, label: "SPLIT SHAFT", to: "split-shaft", spawn: "lift" },
      { x: 581, feet: 141, label: "EXIT LIFT", finish: true },
    ],
    enemies: [],
    signs: [{ text: "JUMP · JUMP · DASH →", x: 110, y: 245 }],
    pit: { left: 160, right: WIDTH, label: "LIFT WELL" },
  },
  maintenance: {
    number: "05", name: "Maintenance Bay", accent: "#b9a86f",
    platforms: [platform(0, FLOOR, 180, HEIGHT - FLOOR), platform(474, FLOOR, 166, HEIGHT - FLOOR)],
    spawns: { junction: { x: 80, feet: FLOOR, facing: 1 } },
    doors: [{ x: 16, feet: FLOOR, label: "RELAY JUNCTION", to: "junction", spawn: "maintenance" }],
    enemies: [],
    suitPatch: { x: 551, y: FLOOR - 28, label: "SUIT PATCH" },
    pit: { left: 180, right: 474, label: "SERVICE TRENCH" },
    signs: [{ text: "JUMP · JUMP · DASH →", x: 137, y: 239 }],
  },
};
