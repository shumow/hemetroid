import { WIDTH, HEIGHT, FLOOR } from "./rooms.mjs";

// Use browser text at the final screen size. KAPLAY's text atlas is rasterized
// at game resolution and then enlarged along with the pixel art.
export function createRoomLabels(layer) {
  const labels = [];
  let count = 0;
  let cameraLeft = 0;
  return {
    begin(left = 0) {
      count = 0;
      cameraLeft = left;
    },
    label(text, x, y, color, kind = "") {
      x -= cameraLeft;
      if (x < -180 || x > WIDTH + 100) return;
      const index = count++;
      if (!labels[index]) {
        const node = document.createElement("span");
        layer.append(node);
        labels[index] = { node };
      }
      const entry = labels[index];
      const key = [text, x, y, color, kind].join("|");
      if (entry.key === key) return;
      entry.key = key;
      entry.node.textContent = text;
      entry.node.className = kind ? "room-label " + kind : "room-label";
      entry.node.style.left = (x / WIDTH * 100) + "%";
      entry.node.style.top = (y / HEIGHT * 100) + "%";
      entry.node.style.color = color;
    },
    end() {
      while (labels.length > count) labels.pop().node.remove();
    },
  };
}

export function drawRoom(k, label, room, doorOpen, checkpointActive, checkpoint, liftPowered) {
  const panel = (x, y, width, height, color) => {
    k.drawRect({ pos: k.vec2(x, y), width, height, color: k.Color.fromHex(color) });
  };
  const width = room.width ?? WIDTH;
  const background = room.vault ? "#252039" : room.pipeworks ? "#112a32" : "#111e30";
  panel(0, 0, width, HEIGHT, background);
  panel(0, 0, width, 48, "#0a1421");
  panel(0, 46, width, 3, room.accent);

  for (let x = 26; x < width; x += 86) {
    panel(x, 56, 69, 230, "#192a3c");
    panel(x + 3, 60, 63, 157, "#142438");
    panel(x + 9, 70, 51, 3, "#233d50");
    panel(x + 9, 86, 51, 1, "#263b50");
    panel(x + 5, 236, 4, 39, "#273e51");
    panel(x + 60, 236, 4, 39, "#273e51");
  }

  panel(0, 145, width, 31, "#0e1a29");
  panel(0, 145, width, 2, "#213b4c");
  for (let x = 8; x < width; x += 16) panel(x, 151, 2, 19, "#1a2c3f");
  panel(0, 285, width, 4, "#0c1724");
  if (room.pipeworks) {
    panel(0, 121, width, 14, "#193e49");
    panel(0, 122, width, 3, "#345d66");
    for (let x = 39; x < width; x += 100) panel(x, 119, 5, 19, "#4c7174");
  }
  if (room.vault) {
    for (const x of [111, 306, 494]) {
      panel(x, 49, 10, FLOOR - 49, "#312c47");
      panel(x + 2, 49, 2, FLOOR - 49, "#685580");
    }
  }
  if (room.pit) {
    const { left, right, label: pitLabel } = room.pit;
    panel(left, FLOOR, right - left, HEIGHT - FLOOR, "#0a1724");
    panel(left, 342, right - left, 18, room.vault ? "#383051" : "#164451");
    label(pitLabel, (left + right) / 2 - pitLabel.length * 3, 316, "#a1bdbd");
  }

  for (const { x, y, w, h } of room.platforms) {
    panel(x, y, w, h, "#213345");
    panel(x, y, w, 3, room.accent);
    panel(x, y + 4, w, 2, "#334f65");
    for (let offset = 7; offset + 4 <= w; offset += 17) {
      panel(x + offset, y + 8, 4, 3, "#0c1b27");
    }
  }

  for (const door of room.doors) {
    const { x, feet } = door;
    const open = doorOpen(door);
    const lamp = open ? "#79f8be" : "#ff9878";
    panel(x, feet - 74, 54, 74, "#4d687d");
    panel(x + 4, feet - 70, 46, 70, "#0a1724");
    panel(x + 9, feet - 65, 36, 4, lamp);
    panel(x + 9, feet - 56, 16, 51, open ? "#133b3c" : "#283749");
    panel(x + 29, feet - 56, 16, 51, open ? "#133b3c" : "#283749");
    label(door.label, Math.min(x, width - door.label.length * 7 - 6), feet - 90, lamp);
    if (!open && door.lock) {
      const requirement = { doubleJump: "DOUBLE JUMP", flushDash: "FLUSH DASH", liftPowered: "NO POWER" }[door.lock] ?? "LOCKED";
      label(requirement, x, feet - 102, "#ff9878");
    }
  }

  label(room.number + " / " + room.name.toUpperCase(), 18, 20, "#b0c5d4");
  if (room.name === "The Airlock") {
    label("JUMP ↑", 244, 239, "#abc7c8");
    label("PATROL ZONE", 432, 198, "#809caf");
  }
  if (checkpoint) {
    const lamp = checkpointActive ? "#79f8be" : "#9ca9be";
    panel(checkpoint.x + 2, FLOOR - 38, 22, 38, "#304c60");
    panel(checkpoint.x + 6, FLOOR - 34, 14, 15, lamp);
    panel(checkpoint.x + 9, FLOOR - 11, 8, 3, "#11272a");
    label(checkpointActive ? "RELAY ACTIVE" : "RELAY CHECKPOINT", 102, FLOOR - 53, lamp);
    label("↑ HIGH ROUTE", 292, 231, "#abc7c8");
  }
  if (room.name === "Upper Exit") label("↑ DOUBLE JUMP", 248, 234, "#abc7c8");
  if (room.liftSwitch) {
    const { x, feet } = room.liftSwitch;
    const light = liftPowered ? "#79f8be" : "#ffae71";
    panel(x, feet - 35, 22, 35, "#4d4964");
    panel(x + 4, feet - 31, 14, 12, light);
    panel(x + 8, feet - 12, 6, 4, "#1c1c30");
    label(liftPowered ? "LIFT POWERED" : "LIFT SWITCH", x - 47, feet - 51, light);
  }
  for (const sign of room.signs ?? []) label(sign.text, sign.x, sign.y, "#b9d9d7");
}
