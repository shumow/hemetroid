import assert from "node:assert/strict";
import { test } from "node:test";
import { areas, campaignCheckpoint, FIRST_AREA, isAreaUnlocked } from "../areas.mjs";
import { CHECKPOINT, rooms } from "../rooms.mjs";
import { arriveAtArea, campaignFromLegacy, createCampaign, hasCampaignAbility, roomDoors, validLocation } from "../campaign.mjs";
import { SAVE_KEY, createProfile, loadProfile, writeProfile } from "../save.mjs";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("manual saves retain a safe room entrance independently of the relay", () => {
  const storage = memoryStorage();
  const { status, profile } = loadProfile(storage);
  assert.equal(status, "empty");
  profile.runs[FIRST_AREA] = {
    checkpointActive: false, bossDefeated: false, doubleJump: false,
    resume: areas[FIRST_AREA].entry, source: "manual", savedAt: 1,
  };
  assert.equal(writeProfile(profile, storage), true);
  assert.deepEqual(loadProfile(storage), { status: "saved", profile });
  Object.assign(profile.runs[FIRST_AREA], {
    checkpointActive: true, bossDefeated: true, doubleJump: false,
    resume: { room: "boss", spawn: "junction" }, savedAt: 2,
  });
  assert.equal(writeProfile(profile, storage), true);
  assert.deepEqual(loadProfile(storage), { status: "saved", profile });
});

test("legacy saves retain checkpoint, boss state, and pickup progress", () => {
  const storage = memoryStorage();
  for (const legacy of [
    { version: 1, bossDefeated: true },
    { version: 2, bossDefeated: true, doubleJump: false },
    { version: 2, bossDefeated: true, doubleJump: true },
  ]) {
    storage.setItem(SAVE_KEY, JSON.stringify({ checkpoint: CHECKPOINT.id, ...legacy }));
    const { status, profile } = loadProfile(storage);
    assert.equal(status, "saved");
    assert.deepEqual(profile.runs[FIRST_AREA], {
      checkpointActive: true, bossDefeated: true, doubleJump: legacy.doubleJump ?? true,
      resume: { room: CHECKPOINT.room, spawn: CHECKPOINT.spawn }, source: "auto", savedAt: 0,
    });
    assert.equal(isAreaUnlocked(areas.pipeworks, profile), false);
  }
});

test("completion unlocks the next area independently of its predecessor's run", () => {
  const storage = memoryStorage();
  const { profile } = loadProfile(storage);
  assert.equal(isAreaUnlocked(areas[FIRST_AREA], profile), true);
  assert.equal(isAreaUnlocked(areas.pipeworks, profile), false);
  assert.equal(campaignCheckpoint(profile), null);
  profile.completed[FIRST_AREA] = true;
  assert.equal(writeProfile(profile, storage), true);
  const loaded = loadProfile(storage).profile;
  assert.equal(isAreaUnlocked(areas.pipeworks, loaded), true);
  assert.equal(isAreaUnlocked(areas["overflow-vault"], loaded), false);
  assert.equal(loaded.runs[FIRST_AREA], undefined);
  assert.equal(campaignCheckpoint(loaded), "pipeworks");
  loaded.completed.pipeworks = true;
  assert.equal(campaignCheckpoint(loaded), "overflow-vault");
  loaded.completed["overflow-vault"] = true;
  assert.equal(campaignCheckpoint(loaded), null);
});

test("Pipeworks saves Double Jump before defeating its own boss", () => {
  const storage = memoryStorage();
  const { profile } = loadProfile(storage);
  profile.completed[FIRST_AREA] = true;
  profile.runs.pipeworks = {
    checkpointActive: true, bossDefeated: false, doubleJump: true, flushDash: false,
    resume: { room: "pump-junction", spawn: "checkpoint" }, source: "auto", savedAt: 1,
  };
  assert.equal(writeProfile(profile, storage), true);
  assert.deepEqual(loadProfile(storage), { status: "saved", profile });
});

test("Overflow Vault saves both inherited abilities and the powered lift", () => {
  const storage = memoryStorage();
  const { profile } = loadProfile(storage);
  profile.completed = { [FIRST_AREA]: true, pipeworks: true };
  profile.runs["overflow-vault"] = {
    checkpointActive: true, bossDefeated: false, doubleJump: true, flushDash: true,
    liftPowered: true, resume: { room: "overflow-chamber", spawn: "shaft" }, source: "auto", savedAt: 1,
  };
  assert.equal(writeProfile(profile, storage), true);
  assert.deepEqual(loadProfile(storage), { status: "saved", profile });

  profile.runs["overflow-vault"].flushDash = false;
  assert.equal(writeProfile(profile, storage), true);
  assert.equal(loadProfile(storage).status, "invalid");
});

test("invalid locations and unavailable storage are safe to recover from", () => {
  const storage = memoryStorage();
  for (const raw of ["{", "null", '{"version":3,"runs":[],"completed":{}}',
    '{"version":2,"checkpoint":"junction","bossDefeated":false,"doubleJump":true}',
    '{"version":1,"checkpoint":"missing","bossDefeated":true}',
    '{"version":1,"checkpoint":"junction","bossDefeated":"true"}']) {
    storage.setItem(SAVE_KEY, raw);
    assert.equal(loadProfile(storage).status, "invalid");
  }
  const profile = {
    runs: {
      [FIRST_AREA]: {
        checkpointActive: false, bossDefeated: false, doubleJump: false,
        resume: { room: "airlock", spawn: "missing" }, source: "manual", savedAt: 1,
      },
    },
    completed: { [FIRST_AREA]: true },
  };
  assert.equal(writeProfile(profile, storage), true);
  assert.deepEqual(loadProfile(storage), {
    status: "invalid", profile: { runs: {}, completed: { [FIRST_AREA]: true } },
  });
  function blocked() { throw new Error("storage is blocked"); }
  const unavailable = { getItem: blocked, setItem: blocked };
  assert.equal(loadProfile(unavailable).status, "unavailable");
  assert.equal(writeProfile(profile, unavailable), false);
});

test("every exit, entry, and checkpoint points to an existing room entrance", () => {
  assert.ok(rooms[CHECKPOINT.room].spawns[CHECKPOINT.spawn]);
  for (const area of Object.values(areas)) {
    if (area.entry) {
      assert.ok(area.rooms.includes(area.entry.room));
      assert.ok(rooms[area.entry.room]?.spawns[area.entry.spawn]);
      assert.ok(area.rooms.includes(area.checkpoint.room));
      assert.ok(rooms[area.checkpoint.room]?.spawns[area.checkpoint.spawn]);
    }
  }
  for (const [id, room] of Object.entries(rooms)) {
    for (const door of room.doors) {
      if (door.to) assert.ok(rooms[door.to]?.spawns[door.spawn], `${id}: ${door.label}`);
    }
  }
});

test("connected campaign checkpoints advance only on first forward handoffs", () => {
  const profile = createProfile();
  profile.campaign = createCampaign();
  const intake = roomDoors(rooms.upper, true).find(door => door.forward);
  const toVault = roomDoors(rooms.spillway, true).find(door => door.forward);
  const backToPipe = roomDoors(rooms["lift-entry"], true).find(door => door.area === "pipeworks");
  assert.equal(arriveAtArea(profile, FIRST_AREA, intake).room, "intake");
  assert.equal(profile.completed[FIRST_AREA], true);
  assert.equal(profile.campaign.checkpoint.area, "pipeworks");
  arriveAtArea(profile, "pipeworks", toVault);
  assert.equal(profile.completed.pipeworks, true);
  assert.equal(arriveAtArea(profile, "overflow-vault", backToPipe).room, "spillway");
  arriveAtArea(profile, FIRST_AREA, intake);
  assert.deepEqual(profile.campaign.checkpoint, { area: "overflow-vault", room: "lift-entry", spawn: "entry" });
});

test("connected saves preserve local boss and pickup state, visited gates, and Suit Patch", () => {
  const storage = memoryStorage();
  const profile = createProfile();
  profile.completed[FIRST_AREA] = true;
  profile.completed.pipeworks = true;
  profile.campaign = campaignFromLegacy(profile);
  assert(hasCampaignAbility(profile.campaign, "doubleJump"));
  assert(hasCampaignAbility(profile.campaign, "flushDash"));
  assert(profile.campaign.areas[FIRST_AREA].bossDefeated);
  profile.campaign.visited.push("junction", "maintenance");
  profile.campaign.gates.push("junction:MAINTENANCE");
  profile.campaign.suitPatch = true;
  assert(writeProfile(profile, storage));
  assert.deepEqual(loadProfile(storage), { status: "saved", profile });
});

test("all connected exits resolve to a valid arrival in the intended area", () => {
  const roomOwners = new Map(Object.entries(areas).flatMap(([id, area]) => area.rooms.map(room => [room, id])));
  for (const [id, room] of Object.entries(rooms)) {
    for (const door of roomDoors(room, true)) {
      if (!door.to) continue;
      assert(validLocation({ area: door.area ?? roomOwners.get(id), room: door.to, spawn: door.spawn }), door.label);
    }
  }
  assert(roomDoors(rooms.upper, false).some(door => door.finish));
  assert(!roomDoors(rooms.intake, false).some(door => door.area));
});
