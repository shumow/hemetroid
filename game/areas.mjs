import { CHECKPOINT, PIPE_CHECKPOINT, VAULT_CHECKPOINT } from "./rooms.mjs";

export const FIRST_AREA = "deep-facility";

export const areas = {
  [FIRST_AREA]: {
    number: "01",
    name: "Deep Facility",
    description: "Blast the patrols and find Double Jump.",
    entry: { room: "airlock", spawn: "entry" },
    checkpoint: CHECKPOINT,
    rooms: ["airlock", "junction", "boss", "upper", "maintenance"],
    reward: "doubleJump",
  },
  pipeworks: {
    number: "02",
    name: "Pipeworks",
    description: "A four-room test of Double Jump and Flush Dash.",
    entry: { room: "intake", spawn: "entry" },
    checkpoint: PIPE_CHECKPOINT,
    rooms: ["intake", "pump-junction", "valve-chamber", "spillway"],
    startingDoubleJump: true,
    requires: { area: FIRST_AREA, ability: "Double Jump" },
    reward: "flushDash",
  },
  "overflow-vault": {
    number: "03",
    name: "Overflow Vault",
    description: "A four-room test that combines both abilities.",
    requires: { area: "pipeworks", ability: "Flush Dash" },
    entry: { room: "lift-entry", spawn: "entry" },
    checkpoint: VAULT_CHECKPOINT,
    rooms: ["lift-entry", "split-shaft", "overflow-chamber", "escape-lift"],
    startingDoubleJump: true,
    startingFlushDash: true,
    reward: "liftPowered",
  },
};

export function isAreaUnlocked(area, profile) {
  return !area.requires || profile.completed[area.requires.area] === true;
}

// Completion records are the durable campaign checkpoint. Room entrances are
// resolved from the current area definitions, including for older saves.
export function campaignCheckpoint(profile) {
  if (!profile.completed[FIRST_AREA]) return null;
  const next = Object.entries(areas).find(([id, area]) =>
    area.requires && isAreaUnlocked(area, profile) && !profile.completed[id]);
  return next?.[0] ?? null;
}
