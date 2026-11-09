import { areas, FIRST_AREA } from "./areas.mjs";
import { CHECKPOINT, rooms } from "./rooms.mjs";

export const SAVE_KEY = "hemetroid.progress";
const VERSION = 3;

export function createProfile() {
  return { runs: {}, completed: {} };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readLegacyRun(save) {
  if (save.checkpoint !== CHECKPOINT.id || typeof save.bossDefeated !== "boolean") return null;
  // Version 1 awarded Double Jump on boss defeat. Version 2 added the pickup.
  const doubleJump = save.version === 1 ? save.bossDefeated : save.doubleJump;
  if (typeof doubleJump !== "boolean" || (doubleJump && !save.bossDefeated)) return null;
  return {
    checkpointActive: true,
    bossDefeated: save.bossDefeated,
    doubleJump,
    resume: { room: CHECKPOINT.room, spawn: CHECKPOINT.spawn },
    source: "auto",
    savedAt: 0,
  };
}

function validRun(run, area) {
  const location = run?.resume;
  return area.rooms?.includes(location?.room) && Object.hasOwn(rooms[location.room].spawns, location.spawn) &&
    typeof run.checkpointActive === "boolean" && typeof run.bossDefeated === "boolean" &&
    typeof run.doubleJump === "boolean" &&
    (area.startingDoubleJump ? run.doubleJump : !run.doubleJump || run.bossDefeated) &&
    (area.startingFlushDash ? run.flushDash === true :
      run.flushDash === undefined || (typeof run.flushDash === "boolean" &&
        (!run.flushDash || (area.reward === "flushDash" && run.bossDefeated)))) &&
    (run.liftPowered === undefined || (typeof run.liftPowered === "boolean" &&
      (!run.liftPowered || area.reward === "liftPowered"))) &&
    (run.source === "auto" || run.source === "manual") && Number.isFinite(run.savedAt) && run.savedAt >= 0;
}

export function loadProfile(storage) {
  const profile = createProfile();
  let raw;
  try {
    raw = (storage ?? globalThis.localStorage).getItem(SAVE_KEY);
  } catch {
    return { status: "unavailable", profile };
  }
  if (raw === null) return { status: "empty", profile };

  try {
    const save = JSON.parse(raw);
    if (save?.version === 1 || save?.version === 2) {
      const run = readLegacyRun(save);
      if (!run) return { status: "invalid", profile };
      profile.runs[FIRST_AREA] = run;
      return { status: "saved", profile };
    }
    if (save?.version === VERSION && isRecord(save.runs) && isRecord(save.completed)) {
      let status = "saved";
      for (const [id, area] of Object.entries(areas)) {
        if (Object.hasOwn(save.runs, id)) {
          if (validRun(save.runs[id], area)) profile.runs[id] = save.runs[id];
          else status = "invalid";
        }
        if (save.completed[id] === true) profile.completed[id] = true;
      }
      return { status, profile };
    }
  } catch {
    // Unreadable storage starts with an empty profile.
  }
  return { status: "invalid", profile };
}

export function writeProfile(profile, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(SAVE_KEY, JSON.stringify({ version: VERSION, ...profile }));
    return true;
  } catch {
    return false;
  }
}
