import { areas, campaignCheckpoint, FIRST_AREA } from "./areas.mjs";
import { rooms } from "./rooms.mjs";

const areaOrder = Object.keys(areas);
const abilityArea = { doubleJump: FIRST_AREA, flushDash: "pipeworks" };

export function newAreaProgress() {
  return {
    checkpointActive: false, bossDefeated: false, doubleJump: false, flushDash: false, liftPowered: false,
  };
}

export function createCampaign() {
  return {
    checkpoint: { area: FIRST_AREA, ...areas[FIRST_AREA].entry },
    areas: {}, visited: [], gates: [], relay: null, suitPatch: false,
  };
}

export function campaignFromLegacy(profile) {
  const campaign = createCampaign();
  for (const id of areaOrder) {
    const run = profile.runs[id];
    if (!run && !profile.completed[id]) continue;
    const state = newAreaProgress();
    for (const flag of Object.keys(state)) state[flag] = run?.[flag] === true;
    // Old playtest slots stored the abilities that each area started with.
    // A clear also proves the pickup was earned, even if that slot was replayed.
    state.doubleJump = id === FIRST_AREA && (state.doubleJump || profile.completed[id] === true);
    state.flushDash = id === "pipeworks" && (state.flushDash || profile.completed[id] === true);
    state.bossDefeated ||= state.doubleJump || state.flushDash;
    state.liftPowered ||= id === "overflow-vault" && profile.completed[id] === true;
    campaign.areas[id] = state;
    if (state.checkpointActive) {
      const { room, spawn } = areas[id].checkpoint;
      campaign.relay = { area: id, room, spawn };
      campaign.visited.push(room);
    }
  }
  const next = campaignCheckpoint(profile);
  if (next) {
    campaign.checkpoint = { area: next, ...areas[next].entry };
  } else if (profile.completed["overflow-vault"]) {
    campaign.checkpoint = { area: "overflow-vault", ...areas["overflow-vault"].entry };
  } else if (profile.runs[FIRST_AREA]) {
    campaign.checkpoint = { area: FIRST_AREA, ...profile.runs[FIRST_AREA].resume };
  }
  return campaign;
}

export function hasCampaignAbility(campaign, ability) {
  return campaign.areas[abilityArea[ability]]?.[ability] === true;
}

export function arriveAtArea(profile, from, door) {
  const { campaign } = profile;
  const destination = { area: door.area, room: door.to, spawn: door.spawn };
  if (door.forward) {
    profile.completed[from] = true;
    if (areaOrder.indexOf(destination.area) > areaOrder.indexOf(campaign.checkpoint.area)) {
      campaign.checkpoint = destination;
    }
  }
  return destination;
}

export function roomDoors(room, connected) {
  if (!connected) return room.doors;
  return [
    ...room.doors.map(door => door.handoff ? { ...door, ...door.handoff, finish: false } : door),
    ...(room.campaignDoors ?? []),
  ];
}

export function validLocation(location) {
  return Boolean(location && Object.hasOwn(areas, location.area) && areas[location.area].rooms.includes(location.room) &&
    Object.hasOwn(rooms[location.room].spawns, location.spawn));
}

export function gateKey(roomId, door) {
  return `${roomId}:${door.label}`;
}
