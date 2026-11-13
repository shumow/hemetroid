import { areas } from "./areas.mjs";
import { gateKey, hasCampaignAbility, roomDoors } from "./campaign.mjs";
import { rooms } from "./rooms.mjs";

// Each discovered room adds its own piece of the side-view schematic.
const shapes = {
  airlock: { x: 122, y: 68, path: "M84 102V52Q84 38 98 38H161V102Z" },
  boss: { x: 204, y: 68, path: "M161 38H231Q245 38 245 52V102H161Z", label: ["Containment", "Wing"] },
  junction: { x: 122, y: 124, path: "M84 102H161V166H106Q84 166 84 144Z", label: ["Relay", "Junction"] },
  upper: { x: 204, y: 124, path: "M161 102H245V166H161Z" },
  maintenance: { x: 48, y: 124, path: "M84 104V144H25Q12 144 12 131V117Q12 104 25 104Z", label: ["Maintenance", "Bay"] },
  intake: { x: 312, y: 151, path: "M245 134H380V171H245Z" },
  "pump-junction": { x: 449, y: 151, path: "M380 134H509Q522 134 522 147V158Q522 171 509 171H380Z" },
  spillway: { x: 273, y: 194, path: "M187 171H382V217H209Q195 196 187 171Z" },
  "valve-chamber": { x: 444, y: 194, path: "M382 171H509Q502 196 487 217H382Z" },
  "lift-entry": { x: 272, y: 238, path: "M209 217H329V259H265Q232 243 209 217Z" },
  "split-shaft": { x: 402, y: 238, path: "M329 217H487Q464 246 424 259H329Z" },
  "overflow-chamber": { x: 350, y: 276, path: "M265 259H424Q405 270 400 297H293Q290 270 265 259Z" },
  "escape-lift": { x: 350, y: 316, path: "M293 297H400L424 325Q431 338 414 338H269Q252 338 262 326Z" },
};
const gateNames = { doubleJump: "Double Jump", flushDash: "Flush Dash", liftPowered: "lift switch power" };
const bends = {
  "pump-junction:spillway": "H355Q333 151 327 174T273 194",
  "escape-lift:split-shaft": "H385Q400 316 404 300L425 256Q432 238 402 238",
};
const svgNamespace = "http://www.w3.org/2000/svg";

function svgElement(tag, attributes) {
  const node = document.createElementNS(svgNamespace, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

function note(text, className) {
  const node = document.createElement("p");
  node.textContent = text;
  node.className = className;
  return node;
}

function appendLabel(svg, room, shape, here, relay) {
  const label = svgElement("text", { x: shape.x, y: shape.y, class: "map-label", "aria-hidden": "true" });
  const lines = shape.label ?? [room.name];
  for (const [index, line] of lines.entries()) {
    const span = svgElement("tspan", { x: shape.x, dy: index ? 11 : (lines.length > 1 ? -4 : 4) });
    span.textContent = line;
    label.append(span);
  }
  if (here || relay) {
    const status = svgElement("tspan", { x: shape.x, dy: 11, class: "map-status" });
    status.textContent = here && relay ? "HERE · RELAY" : here ? "YOU ARE HERE" : "LAST RELAY";
    label.append(status);
  }
  svg.append(label);
}

export function renderMap(container, campaign, current) {
  const diagram = svgElement("svg", {
    viewBox: "0 21 540 326", class: "map-diagram", role: "group", "aria-label": "Explored facility rooms",
  });
  const labels = [];
  const gates = [];
  const transfers = [];
  const edges = new Set();
  const visible = new Set(campaign.visited);

  for (const [areaId, area] of Object.entries(areas)) {
    for (const id of area.rooms) {
      if (!visible.has(id)) continue;
      const room = rooms[id];
      const shape = shapes[id];
      const here = id === current;
      const relay = id === campaign.relay?.room;
      const marker = svgElement("path", {
        d: shape.path, class: `map-room map-${areaId}`, role: "img",
        "aria-label": [room.name, area.name, here && "You are here", relay && "Last relay"].filter(Boolean).join(" · "),
      });
      if (here) marker.setAttribute("aria-current", "location");
      diagram.append(marker);
      labels.push({ room, shape, here, relay });

      for (const door of roomDoors(room, true)) {
        if (visible.has(door.to)) {
          edges.add([id, door.to].sort().join(":"));
          if (door.forward) transfers.push(`${room.name} ↔ ${rooms[door.to].name}`);
        }
        if (!campaign.gates.includes(gateKey(id, door))) continue;
        const unlocked = door.lock === "liftPowered" ? campaign.areas[areaId]?.liftPowered
          : hasCampaignAbility(campaign, door.lock);
        if (!unlocked) gates.push(note(`${room.name}: ${door.label} requires ${gateNames[door.lock]}.`, "map-gate"));
      }
    }
  }

  for (const edge of edges) {
    const [a, b] = edge.split(":").map(id => shapes[id]);
    const path = `M${a.x} ${a.y}${bends[edge] ?? `L${b.x} ${b.y}`}`;
    diagram.append(svgElement("path", { d: path, class: "map-route", "aria-hidden": "true" }));
  }

  for (const { room, shape, here, relay } of labels) appendLabel(diagram, room, shape, here, relay);
  const details = [...gates];
  if (transfers.length) details.push(note("Transfers · " + transfers.join(" · "), "map-transfer"));
  container.replaceChildren(diagram, ...details);
}
