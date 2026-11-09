import kaplay from "./lib/kaplay.mjs";
import { areas, campaignCheckpoint, FIRST_AREA, isAreaUnlocked } from "./areas.mjs";
import { FLOOR, HEIGHT, WIDTH, rooms } from "./rooms.mjs";
import { createProfile, loadProfile, writeProfile } from "./save.mjs";
import { createRoomLabels, drawRoom } from "./scenery.mjs";
import { createSound } from "./sound.mjs";

const canvas = document.querySelector("#game");
const roomLabels = createRoomLabels(document.querySelector("#room-labels"));
const overlay = document.querySelector("#overlay");
const actions = document.querySelector("#actions");
const areaList = document.querySelector("#area-list");
const pauseButton = document.querySelector("#pause");
const soundButton = document.querySelector("#sound-toggle");
const soundState = document.querySelector("#sound-state");
const developerSettings = document.querySelector("#developer-settings");
const developerManualSave = document.querySelector("#developer-manual-save");
const objective = document.querySelector("#objective");
const healthDisplay = document.querySelector("#health");
const upgrade = document.querySelector("#upgrade");
const dashUpgrade = document.querySelector("#dash-upgrade");
const dashControl = document.querySelector("#dash-control");
const MAX_HEALTH = 3;
const PLAYER = { w: 28, h: 36, speed: 174, jump: 365 };
const ENEMIES = {
  patrol: { w: 36, h: 28, speed: 70, hp: 2 },
  hopper: { w: 34, h: 36, speed: 60, hp: 2 },
  boss: { w: 74, h: 56, hp: 8 },
};
const SHOT = { w: 9, h: 3, speed: 495, range: 245, cooldown: 0.21 };
const WAVE = { w: 21, h: 13, speed: 225 };
const ROLL = { w: 27, h: 24 };
const DASH = { speed: 620, time: 0.28 };

let k;
try {
  k = kaplay({ canvas, width: WIDTH, height: HEIGHT, global: false, debug: false, crisp: true, background: "#101c2a" });
} catch (error) {
  document.querySelector("#message-body").textContent = "The game could not start. Check that your browser supports WebGL.";
  objective.textContent = "DISPLAY OFFLINE";
  throw error;
}

const sound = createSound(k.audioCtx);
function updateSoundButton() {
  soundButton.setAttribute("aria-pressed", String(sound.muted));
  soundState.textContent = sound.muted ? "Sound off" : "Sound on";
}

function toggleSound() {
  sound.setMuted(!sound.muted);
  updateSoundButton();
  if (mode === "playing") canvas.focus({ preventScroll: true });
}

updateSoundButton();
soundButton.disabled = false;
soundButton.addEventListener("click", toggleSound);

for (const sprite of ["ranger", "poop", "toilet-paper", "sluice-guard", ...Object.keys(ENEMIES)]) {
  k.loadSprite(sprite, "./art/" + sprite + ".svg");
}
k.setGravity(1040);

const keys = {
  left: ["arrowleft", "a"],
  right: ["arrowright", "d"],
  jump: [" ", "x"],
  fire: ["z", "j"],
  dash: ["c"],
};
const gameKeys = new Set(Object.values(keys).flat());
const heldKeys = new Set();
let jumpRequested = false;
let dashRequested = false;
let { status: storageStatus, profile } = loadProfile();
let areaId = FIRST_AREA;
let location = areas[FIRST_AREA].entry;
let progress;
let preserveRun = false;
let health = MAX_HEALTH;
let mode = "menu";
let resumeAfterDeveloperSettings = false;
developerManualSave.checked = false;

function clearInput() {
  heldKeys.clear();
  jumpRequested = false;
  dashRequested = false;
}

function showOverlay(label, title, description, choices) {
  document.querySelector("#message-label").textContent = label;
  document.querySelector("#message-title").textContent = title;
  document.querySelector("#message-body").textContent = description;
  areaList.hidden = true;
  actions.replaceChildren(...choices.map(({ label, run, developerOnly }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    if (developerOnly) {
      button.dataset.developerOnly = "";
      button.hidden = !developerManualSave.checked;
    }
    button.addEventListener("click", run);
    return button;
  }));
  overlay.hidden = false;
  actions.firstElementChild.focus({ preventScroll: true });
}

function showSaveStatus(message) {
  const status = document.querySelector("#save-status");
  status.textContent = message;
  status.hidden = !message;
}

function refreshHealth() {
  healthDisplay.textContent = Array.from({ length: MAX_HEALTH }, (_, i) => i < health ? "◆" : "◇").join(" ");
  healthDisplay.setAttribute("aria-label", `${health} of ${MAX_HEALTH} health`);
}

function refreshUpgrades() {
  upgrade.hidden = !progress.doubleJump;
  dashUpgrade.hidden = !progress.flushDash;
  dashControl.hidden = !progress.flushDash;
}

function setRoomLabel(room) {
  document.querySelector("#room-number").textContent = room.number;
  document.querySelector("#room-name").textContent = room.name.toUpperCase();
}

function persistProfile() {
  const saved = writeProfile(profile);
  storageStatus = saved ? "saved" : "unavailable";
  showSaveStatus(saved ? "" : "Saving is unavailable. Progress is kept for this session only.");
  return saved;
}

function saveProgress(source = "auto", resume = location) {
  if (source === "auto" && preserveRun) return true;
  profile.runs[areaId] = { ...progress, resume, source, savedAt: Date.now() };
  return persistProfile();
}

function goToRoom(room, spawn) {
  sound.silence();
  location = { room, spawn };
  jumpRequested = false;
  dashRequested = false;
  k.go("room", room, spawn);
}

function loadRunAt({ room, spawn }) {
  health = MAX_HEALTH;
  clearInput();
  k.debug.paused = false;
  sound.setPaused(false);
  sound.unlock();
  overlay.hidden = true;
  mode = "playing";
  pauseButton.hidden = false;
  canvas.focus({ preventScroll: true });
  goToRoom(room, spawn);
}

function resumeFromCheckpoint() {
  const area = areas[areaId];
  loadRunAt(progress.checkpointActive ? area.checkpoint : area.entry);
}

function startArea(id) {
  areaId = id;
  preserveRun = Boolean(profile.runs[id]);
  progress = {
    checkpointActive: false,
    bossDefeated: false,
    doubleJump: Boolean(areas[id].startingDoubleJump),
    flushDash: Boolean(areas[id].startingFlushDash),
    liftPowered: false,
  };
  resumeFromCheckpoint();
}

function continueGame(id, fromEntry = false) {
  areaId = id;
  const run = profile.runs[id];
  if (!run) {
    startArea(id);
    return;
  }
  preserveRun = false;
  const { checkpointActive, bossDefeated, doubleJump, flushDash = false, liftPowered = false, resume } = run;
  progress = { checkpointActive, bossDefeated, doubleJump, flushDash, liftPowered };
  loadRunAt(fromEntry ? areas[id].entry : resume);
}

function showTitle() {
  mode = "menu";
  clearInput();
  pauseButton.hidden = true;
  if (storageStatus === "invalid") showSaveStatus("Some saved progress could not be read. You can start a fresh run.");
  if (storageStatus === "unavailable") showSaveStatus("Saving is unavailable. Progress is kept for this session only.");
  const choices = [{ label: "New Game", run: () => showAreaMenu("new") }];
  if (hasProgress()) choices.push({ label: "Replay Areas", run: () => showAreaMenu("replay") });
  if (Object.keys(profile.runs).length) {
    choices.unshift({ label: "Continue", run: () => showAreaMenu("continue") });
  }
  const checkpoint = campaignCheckpoint(profile);
  if (areas[checkpoint]?.entry) {
    choices.unshift({ label: "Continue Campaign", run: () => continueGame(checkpoint, true) });
  }
  const description = checkpoint ? `Campaign checkpoint · ${areas[checkpoint].name}`
    : campaignComplete() ? "Campaign complete · All three areas cleared." : "Choose a four-room test in the facility.";
  showOverlay("AREA PLAYTESTS", "Something got loose.", description, choices);
}

function campaignComplete() {
  return Object.keys(areas).every((id) => profile.completed[id]);
}

function hasProgress() {
  return Object.keys(profile.runs).length > 0 || Object.keys(profile.completed).length > 0;
}

function showAreaMenu(kind) {
  const continuing = kind === "continue";
  const fresh = kind === "new";
  const menuProfile = fresh ? createProfile() : profile;
  const title = { continue: "Continue a run", new: "New campaign", replay: "Replay an area" }[kind];
  const description = {
    continue: "Select a saved run.",
    new: hasProgress() ? "Starting Deep Facility replaces your campaign progress and area saves."
      : "Start with Deep Facility and complete it to unlock Pipeworks.",
    replay: "Replay unlocked areas without resetting your campaign.",
  }[kind];
  showOverlay("AREA PLAYTESTS", title, description, [{ label: "Back", run: showTitle }]);
  const entries = Object.entries(areas);
  const listed = continuing ? entries.filter(([id]) => profile.runs[id])
    .sort(([a], [b]) => profile.runs[b].savedAt - profile.runs[a].savedAt) : entries;

  areaList.replaceChildren(...listed.map(([id, area]) => {
    const run = menuProfile.runs[id];
    const unlocked = isAreaUnlocked(area, menuProfile);
    const row = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "area-option";
    button.disabled = !unlocked || !area.entry;
    button.setAttribute("aria-label", area.name);
    const name = document.createElement("strong");
    name.textContent = area.number + " / " + area.name;
    const details = document.createElement("small");
    details.id = "area-details-" + id;
    button.setAttribute("aria-describedby", details.id);
    if (!unlocked) {
      details.textContent = `Locked · Finish ${areas[area.requires.area].name} and collect ${area.requires.ability}`;
    } else if (!area.entry) {
      details.textContent = "Unlocked · Coming soon";
    } else if (continuing) {
      details.textContent = `${run.source === "manual" ? "Manual save" : "Autosave"} · ${rooms[run.resume.room].name}`;
    } else {
      details.textContent = (menuProfile.completed[id] ? "Completed · " : "") +
        (run ? "Replay · Saved run stays available" : "Start · " + area.description);
    }
    button.append(name, details);
    row.append(button);
    button.addEventListener("click", () => {
      if (continuing) return continueGame(id);
      if (fresh) {
        profile = menuProfile;
        persistProfile();
      }
      startArea(id);
    });
    return row;
  }));
  areaList.hidden = false;
  areaList.querySelector("button:not(:disabled)")?.focus({ preventScroll: true });
}

function returnToTitle() {
  sound.silence();
  k.debug.paused = false;
  k.go("standby");
  showTitle();
}

function resumePlay() {
  clearInput();
  k.debug.paused = false;
  sound.setPaused(false);
  sound.unlock();
  overlay.hidden = true;
  mode = "playing";
  pauseButton.hidden = false;
  canvas.focus({ preventScroll: true });
}

function showPause(message = preserveRun ? "This replay keeps your existing save." : "Progress saves automatically at checkpoints.") {
  clearInput();
  k.debug.paused = true;
  sound.setPaused(true);
  mode = "paused";
  pauseButton.hidden = true;
  showOverlay("RUN PAUSED", "Paused", message, [
    { label: "Resume", run: resumePlay },
    { label: "Save Game", run: confirmManualSave, developerOnly: true },
    { label: "Return to Title", run: returnToTitle },
  ]);
}

function toggleDeveloperSettings() {
  if (developerSettings.open) {
    developerSettings.close();
    return;
  }
  clearInput();
  resumeAfterDeveloperSettings = mode === "playing";
  if (resumeAfterDeveloperSettings) {
    k.debug.paused = true;
    sound.setPaused(true);
  }
  developerSettings.showModal();
}

developerSettings.addEventListener("close", () => {
  if (resumeAfterDeveloperSettings) resumePlay();
  resumeAfterDeveloperSettings = false;
});
developerManualSave.addEventListener("change", () => {
  const manualSave = actions.querySelector("[data-developer-only]");
  if (manualSave) manualSave.hidden = !developerManualSave.checked;
});

function confirmManualSave() {
  const save = () => {
    preserveRun = false;
    const saved = saveProgress("manual");
    showPause(saved ? `Saved in ${rooms[location.room].name}.` : "Could not save to this browser.");
  };
  if (!preserveRun) {
    save();
    return;
  }
  showOverlay("SAVE GAME", "Replace saved run?", "This replaces the saved run for this area. Campaign progress is kept.",
    [{ label: "Replace Save", run: save }, { label: "Cancel", run: () => showPause() }]);
}

pauseButton.addEventListener("click", () => {
  if (mode === "playing") showPause();
});
document.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.code === "KeyD" && event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    toggleDeveloperSettings();
    return;
  }
  if (developerSettings.open) return;
  if (event.code === "KeyM" && !event.metaKey && !event.ctrlKey && !event.altKey) {
    toggleSound();
  }
  if (event.code === "Escape" && (mode === "playing" || mode === "paused")) {
    event.preventDefault();
    if (mode === "playing") showPause();
    else resumePlay();
  }
  if (event.code === "KeyR" && (mode === "playing" || mode === "retry")) resumeFromCheckpoint();
});
canvas.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const key = event.key.toLowerCase();
  if (gameKeys.has(key) || key === "arrowup" || key === "arrowdown") event.preventDefault();
  if (event.repeat || !gameKeys.has(key)) return;
  heldKeys.add(key);
  if (keys.jump.includes(key)) jumpRequested = true;
  if (keys.dash.includes(key)) dashRequested = true;
});
document.addEventListener("keyup", (event) => heldKeys.delete(event.key.toLowerCase()));
canvas.addEventListener("blur", clearInput);
window.addEventListener("blur", () => {
  if (mode === "playing" && !developerSettings.open) showPause();
});

function targetDistance(projectile, target, travel) {
  if (projectile.pos.y + projectile.h <= target.y || projectile.pos.y >= target.y + target.h) return Infinity;
  const left = projectile.pos.x;
  const right = left + projectile.w;
  if (left < target.x + target.w && right > target.x) return 0;
  const gap = projectile.direction > 0 ? target.x - right : left - target.x - target.w;
  return gap >= 0 && gap <= travel ? gap : Infinity;
}

function boxAt(actor, { w, h }, inset) {
  return { x: actor.pos.x + inset, y: actor.pos.y + inset, w: w - 2 * inset, h: h - inset };
}

function nearDoor(player, door) {
  const center = player.pos.x + PLAYER.w / 2;
  return center >= door.x + 9 && center <= door.x + 45 &&
    Math.abs(player.pos.y + PLAYER.h - door.feet) <= 10;
}

function spawnEnemy(spec) {
  const stats = ENEMIES[spec.kind];
  const feet = spec.feet ?? FLOOR;
  const actor = k.add([
    k.sprite(spec.sprite ?? spec.kind), k.pos(spec.x, feet - stats.h),
    k.area({ shape: new k.Rect(k.vec2(2, 2), stats.w - 4, stats.h - 2) }),
    k.opacity(), spec.kind, "enemy",
  ]);
  return {
    ...spec, ...stats, actor, feet, direction: -1, elapsed: 0, flash: 0,
    phase: "idle", timer: 0,
  };
}

k.scene("room", (roomId, entrance) => {
  const room = rooms[roomId];
  const area = areas[areaId];
  const checkpoint = area.checkpoint;
  const spawn = room.spawns[entrance];
  let invulnerability = 0;
  let cooldown = 0;
  let facing = spawn.facing;
  let usedAirJump = false;
  let usedDash = false;
  let dashRemaining = 0;
  let dashDirection = 1;
  let ended = false;
  let enemies = [];
  let rewardPickup;

  setRoomLabel(room);
  refreshHealth();
  refreshUpgrades();

  function doorOpen(door) {
    if (door.lock === "patrol") return enemies.every((enemy) => enemy.hp <= 0);
    if (door.lock) return progress[door.lock];
    return Boolean(door.to || door.finish);
  }

  k.add([{ draw: () => {
    roomLabels.begin();
    drawRoom(k, roomLabels.label, room, doorOpen, progress.checkpointActive,
      roomId === checkpoint.room ? checkpoint : undefined, progress.liftPowered);
    drawBossStatus();
    if (rewardPickup) {
      roomLabels.label(room.reward.label, rewardPickup.pos.x + ROLL.w / 2,
        rewardPickup.pos.y - 24, "#a1ffbb", "pickup");
    }
    roomLabels.end();
  } }]);
  for (const { x, y, w, h, oneWay } of room.platforms) {
    const platform = k.add([k.pos(x, y), k.area({ shape: new k.Rect(k.vec2(0), w, h) }), k.body({ isStatic: true })]);
    if (oneWay) platform.tag("ledge");
  }

  const player = k.add([
    k.sprite("ranger"), k.pos(spawn.x, spawn.feet - PLAYER.h),
    k.area({ shape: new k.Rect(k.vec2(4, 1), PLAYER.w - 8, PLAYER.h - 1) }),
    k.body({ jumpForce: PLAYER.jump }), k.opacity(), "player",
  ]);
  player.flipX = facing < 0;
  player.onBeforePhysicsResolve((collision) => {
    if (!collision.target.is("ledge")) return;
    const penetration = player.pos.y + PLAYER.h - collision.target.pos.y;
    if (!collision.isBottom() || player.isJumping() || penetration > 8) {
      collision.preventResolution();
    }
  });
  enemies = room.enemies.filter((spec) => spec.kind !== "boss" || !progress.bossDefeated).map(spawnEnemy);

  function updateObjective() {
    if (roomId === "airlock") {
      objective.textContent = doorOpen(room.doors[1]) ? "PROCEED TO THE JUNCTION" : "CLEAR THE PATROL";
      return;
    }
    if (room.reward) {
      const { ability, label } = room.reward;
      const bossName = room.enemies.find(({ kind }) => kind === "boss").name ?? "BULWARK";
      objective.textContent = progress[ability] ? "← RETURN TO THE JUNCTION"
        : progress.bossDefeated ? `TOUCH THE ROLL TO COLLECT ${label}` : `DEFEAT THE ${bossName}`;
      return;
    }
    objective.textContent = {
      junction: progress.doubleJump ? "DOUBLE JUMP TO THE UPPER EXIT" : "FIND THE UPGRADE IN THE BOSS WING →",
      upper: "REACH THE ESCAPE POD",
      intake: "DOUBLE JUMP TO THE PUMP JUNCTION",
      "pump-junction": progress.flushDash ? "DOUBLE JUMP TO THE SPILLWAY" : "FIND FLUSH DASH IN THE VALVE CHAMBER →",
      spillway: "DOUBLE JUMP, THEN DASH ACROSS THE GAP",
      "lift-entry": "CROSS THE BARRIER TO REACH THE SPLIT SHAFT",
      "split-shaft": progress.liftPowered ? "LIFT POWERED · TAKE THE LOWER DOOR" : "CLIMB TO THE OVERFLOW CHAMBER",
      "overflow-chamber": progress.liftPowered ? "← RETURN TO THE SPLIT SHAFT" : "CROSS THE BASIN AND TOUCH THE LIFT SWITCH",
      "escape-lift": "DOUBLE JUMP AND DASH TO THE EXIT LIFT",
    }[roomId];
  }
  updateObjective();
  if (room.reward && progress.bossDefeated && !progress[room.reward.ability]) spawnReward();

  function spawnReward() {
    const { x, y, ability } = room.reward;
    const pickup = k.add([
      k.pos(x, y),
      k.area({ shape: new k.Rect(k.vec2(0), ROLL.w, ROLL.h) }),
      "powerup",
    ]);
    rewardPickup = pickup;
    pickup.add([k.pos(-14, 0), k.sprite("toilet-paper")]);
    pickup.onCollide("player", () => {
      if (ended || mode !== "playing" || progress[ability]) return;
      progress[ability] = true;
      refreshUpgrades();
      k.destroy(pickup);
      rewardPickup = undefined;
      sound.play("pickup");
      saveProgress();
      objective.textContent = ability === "flushDash" ? "FLUSH DASH ONLINE · PRESS C TO DASH"
        : "DOUBLE JUMP ONLINE · PRESS JUMP AGAIN IN MIDAIR";
    });
  }

  function finish(won) {
    ended = true;
    player.paused = true;
    clearInput();
    pauseButton.hidden = true;
    sound.play(won ? "clear" : "offline");
    if (won) {
      mode = "menu";
      const reward = area.reward;
      if (!reward || progress[reward]) profile.completed[areaId] = true;
      const saved = preserveRun ? persistProfile() : saveProgress();
      const next = campaignCheckpoint(profile);
      const choices = [
        { label: "Area Menu", run: () => showAreaMenu("replay") },
        { label: "Return to Title", run: returnToTitle },
      ];
      if (areas[next]?.entry) choices.unshift({
        label: `Continue to ${areas[next].name}`, run: () => continueGame(next, true),
      });
      objective.textContent = "FACILITY ESCAPED";
      const message = saved ? "Campaign progress saved." : "Progress is available for this session only.";
      const result = campaignComplete() ? "All three areas cleared." : `${area.name} cleared.`;
      showOverlay("MISSION COMPLETE", "You made it out.", `${result} ${message}`, choices);
    } else {
      mode = "retry";
      objective.textContent = "SUIT OFFLINE";
      const retryRoom = rooms[progress.checkpointActive ? checkpoint.room : area.entry.room].name;
      showOverlay("SUIT OFFLINE", "Suit offline.", `Retry from ${retryRoom}.`,
        [{ label: "Retry", run: resumeFromCheckpoint }]);
    }
  }

  function hurtPlayer() {
    if (ended || mode !== "playing" || invulnerability > 0) return;
    health -= 1;
    refreshHealth();
    invulnerability = 0.95;
    if (health === 0) finish(false);
    else sound.play("hurt");
  }
  for (const enemy of enemies) enemy.actor.onCollide("player", hurtPlayer);

  function hurtEnemy(enemy) {
    enemy.flash = 0.12;
    if (enemy.kind === "boss" && enemy.phase !== "recover") {
      sound.play("shield");
      return;
    }
    enemy.hp -= 1;
    if (enemy.hp > 0) {
      sound.play("hit");
      return;
    }
    sound.play("defeat");
    k.destroy(enemy.actor);
    if (enemy.kind === "boss") {
      progress.bossDefeated = true;
      k.destroyAll("wave");
      spawnReward();
      saveProgress();
      updateObjective();
    } else {
      updateObjective();
    }
  }

  function fire() {
    sound.play("shot");
    const x = player.pos.x + (facing > 0 ? PLAYER.w - 2 : -7);
    const shot = k.add([
      k.pos(x, player.pos.y + 20), k.rect(SHOT.w, SHOT.h), k.color("#9fffcd"), "shot",
      { w: SHOT.w, h: SHOT.h, direction: facing, remaining: SHOT.range },
    ]);
    shot.onUpdate(() => {
      if (ended || mode !== "playing") return;
      const travel = Math.min(shot.remaining, SHOT.speed * k.dt());
      let closest = Infinity;
      for (const platform of room.platforms) {
        closest = Math.min(closest, targetDistance(shot, platform, travel));
      }
      let target;
      for (const enemy of enemies) {
        if (enemy.hp <= 0) continue;
        const hit = targetDistance(shot, boxAt(enemy.actor, enemy, 2), travel);
        if (hit < closest) {
          closest = hit;
          target = enemy;
        }
      }
      if (target) hurtEnemy(target);
      if (closest !== Infinity || shot.remaining <= travel) {
        k.destroy(shot);
        return;
      }
      shot.pos.x += shot.direction * travel;
      shot.remaining -= travel;
    });
  }

  function launchWave(enemy) {
    sound.play("wave");
    const direction = player.pos.x < enemy.actor.pos.x ? -1 : 1;
    const x = enemy.actor.pos.x + (direction < 0 ? -WAVE.w : enemy.w);
    const wave = k.add([
      k.pos(x, FLOOR - WAVE.h), "wave",
      { w: WAVE.w, h: WAVE.h, direction },
    ]);
    // The emoji extends above the original ground-level hitbox.
    wave.add([k.pos(-1, -7), k.sprite("poop")]);
    wave.onUpdate(() => {
      if (ended || mode !== "playing") return;
      const travel = WAVE.speed * k.dt();
      if (targetDistance(wave, boxAt(player, PLAYER, 4), travel) !== Infinity) {
        k.destroy(wave);
        hurtPlayer();
        return;
      }
      wave.pos.x += direction * travel;
      if (wave.pos.x > WIDTH || wave.pos.x < -WAVE.w) k.destroy(wave);
    });
  }

  function updateBoss(enemy, dt) {
    enemy.timer -= dt;
    if (enemy.timer > 0) return;
    if (enemy.phase === "windup") {
      launchWave(enemy);
      enemy.phase = "recover";
      enemy.timer = 1.05;
    } else if (player.pos.x > 276) {
      enemy.phase = "windup";
      enemy.timer = 0.9;
      sound.play("windup");
    } else {
      enemy.phase = "idle";
    }
  }

  function checkLiftSwitch() {
    const { x, feet } = room.liftSwitch;
    const center = player.pos.x + PLAYER.w / 2;
    if (center < x - 4 || center > x + 26 || Math.abs(player.pos.y + PLAYER.h - feet) > 12) return;
    progress.liftPowered = true;
    sound.play("relay");
    saveProgress();
    updateObjective();
  }

  const boss = enemies.find((enemy) => enemy.kind === "boss");
  function drawBossStatus() {
    if (!boss || boss.hp <= 0) return;
    const [text, color] = {
      idle: [`${boss.name ?? "BULWARK"} · SHIELDED`, "#a3bad4"],
      windup: ["GROUND PULSE · JUMP!", "#ffae71"],
      recover: ["EXPOSED · FIRE!", "#a1ffbb"],
    }[boss.phase];
    roomLabels.label(text, 447, 72, color);
    k.drawRect({ pos: k.vec2(447, 87), width: 146, height: 5, color: k.Color.fromHex("#304252") });
    k.drawRect({ pos: k.vec2(447, 87), width: 146 * boss.hp / ENEMIES.boss.hp, height: 5, color: k.Color.fromHex(color) });
    if (boss.phase === "windup") {
      k.drawRect({ pos: k.vec2(boss.actor.pos.x + 8, FLOOR - 2), width: 56, height: 2, color: k.Color.fromHex("#ff9860") });
    }
  }

  k.onDraw(() => {
    if (dashRemaining <= 0) return;
    k.drawRect({
      pos: k.vec2(player.pos.x + (dashDirection > 0 ? -24 : PLAYER.w), player.pos.y + 23),
      width: 24, height: 3, color: k.Color.fromHex("#6de6dc"),
    });
  });

  k.onUpdate(() => {
    if (ended || mode !== "playing") return;
    const dt = k.dt();
    cooldown = Math.max(0, cooldown - dt);
    invulnerability = Math.max(0, invulnerability - dt);
    player.opacity = invulnerability > 0 && Math.floor(invulnerability * 14) % 2 ? 0.38 : 1;

    const grounded = player.isGrounded();
    if (grounded) {
      usedAirJump = false;
      if (dashRemaining <= 0) usedDash = false;
    }
    if (jumpRequested) {
      jumpRequested = false;
      if (dashRemaining <= 0 && (grounded || (progress.doubleJump && !usedAirJump))) {
        usedAirJump = !grounded;
        player.jump();
        sound.play(grounded ? "jump" : "doubleJump");
      }
    }

    const direction = Number(keys.right.some((key) => heldKeys.has(key))) -
      Number(keys.left.some((key) => heldKeys.has(key)));
    if (direction !== 0) {
      facing = direction;
      player.flipX = facing < 0;
    }
    if (dashRequested) {
      dashRequested = false;
      if (progress.flushDash && !usedDash) {
        usedDash = true;
        dashDirection = facing;
        dashRemaining = DASH.time;
        player.vel.y = 0;
        sound.play("dash");
      }
    }
    if (dashRemaining > 0) {
      player.gravityScale = 0;
      const activeTime = Math.min(dt, dashRemaining);
      player.pos.x += dashDirection * DASH.speed * activeTime;
      dashRemaining -= activeTime;
    } else {
      player.gravityScale = 1;
      if (direction !== 0) player.move(direction * PLAYER.speed, 0);
    }
    player.pos.x = Math.max(5, Math.min(WIDTH - PLAYER.w - 5, player.pos.x));

    if (keys.fire.some((key) => heldKeys.has(key)) && cooldown === 0) {
      fire();
      cooldown = SHOT.cooldown;
    }

    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;
      enemy.elapsed += dt;
      enemy.flash = Math.max(0, enemy.flash - dt);
      enemy.actor.opacity = enemy.flash > 0 ? 0.48 : 1;
      if (enemy.kind === "boss") {
        updateBoss(enemy, dt);
        continue;
      }
      enemy.actor.pos.x += enemy.direction * enemy.speed * dt;
      if (enemy.actor.pos.x <= enemy.left || enemy.actor.pos.x >= enemy.right) {
        enemy.direction = -enemy.direction;
        enemy.actor.pos.x = Math.max(enemy.left, Math.min(enemy.right, enemy.actor.pos.x));
      }
      if (enemy.kind === "hopper") {
        const cycle = enemy.elapsed % 1.6;
        const hop = Math.min(cycle / 0.75, 1);
        enemy.actor.pos.y = enemy.feet - enemy.h - 47 * 4 * hop * (1 - hop);
      }
    }

    if (player.pos.y > HEIGHT + PLAYER.h) {
      health = 0;
      refreshHealth();
      finish(false);
      return;
    }

    if (roomId === checkpoint.room && !progress.checkpointActive && player.pos.x >= checkpoint.x - 22) {
      progress.checkpointActive = true;
      health = MAX_HEALTH;
      refreshHealth();
      sound.play("relay");
      saveProgress("auto", { room: checkpoint.room, spawn: checkpoint.spawn });
    }

    if (room.liftSwitch && !progress.liftPowered) checkLiftSwitch();
    const door = room.doors.find((exit) => doorOpen(exit) && nearDoor(player, exit));
    if (door) {
      ended = true;
      if (door.finish) finish(true);
      else goToRoom(door.to, door.spawn);
    }
  });
});

k.scene("standby", () => {
  setRoomLabel(rooms.airlock);
  health = MAX_HEALTH;
  refreshHealth();
  upgrade.hidden = true;
  dashUpgrade.hidden = true;
  dashControl.hidden = true;
  objective.textContent = "STANDING BY";
  k.add([{ draw: () => {
    roomLabels.begin();
    drawRoom(k, roomLabels.label, rooms.airlock, () => false, false);
    roomLabels.end();
  } }]);
});
k.onLoad(() => {
  k.go("standby");
  showTitle();
});
