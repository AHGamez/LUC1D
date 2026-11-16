import { Euler, Matrix4 } from "three";
import { worldSchema, type Block } from "../lublox/lublox";

export const MAX_MAP_BYTES = 10 * 1024 * 1024;
type Vector = { X: number; Y: number; Z: number };
export type RobloxNode = {
  ClassName?: string;
  Name?: string;
  Children?: RobloxNode[];
  Size?: Vector;
  Position?: Vector;
  CFrame?: { Position: Vector; Components?: number[] };
};
const parts = new Set(["Part", "SpawnLocation", "WedgePart", "CornerWedgePart", "MeshPart", "UnionOperation", "TrussPart"]);
export function convertRobloxMap(roots: RobloxNode[]) {
  const found: { node: RobloxNode; position: Vector; size: Vector; rotation: [number, number, number] }[] = [];
  let skipped = 0, approximated = 0, visited = 0;
  const queue = roots.filter(Boolean).map((node) => ({ node, inMap: !roots.some((n) => n?.ClassName === "Workspace") }));
  while (queue.length) {
    const item = queue.pop();
    if (!item) break;
    if (++visited > 50000) throw new Error("This map contains too many objects.");
    const { node } = item;
    const inMap = item.inMap || node.ClassName === "Workspace";
    if (node.Children) queue.push(...node.Children.filter(Boolean).map((child) => ({ node: child, inMap })));
    if (!inMap) continue;
    if (!parts.has(node.ClassName ?? "")) {
      if (!["Workspace", "Model", "Folder"].includes(node.ClassName ?? "")) skipped++;
      continue;
    }
    const position = node.CFrame?.Position ?? node.Position;
    const size = node.Size;
    if (!position || !size || ![position.X, position.Y, position.Z, size.X, size.Y, size.Z].every(Number.isFinite) || Math.min(size.X, size.Y, size.Z) <= 0) { skipped++; continue; }
    let rotation: [number, number, number] = [0, 0, 0];
    const c = node.CFrame?.Components;
    if (c?.length === 12 && c.every(Number.isFinite)) {
      const e = new Euler().setFromRotationMatrix(new Matrix4().set(c[3] ?? 1, c[4] ?? 0, c[5] ?? 0, 0, c[6] ?? 0, c[7] ?? 1, c[8] ?? 0, 0, c[9] ?? 0, c[10] ?? 0, c[11] ?? 1, 0, 0, 0, 0, 1));
      rotation = [e.x, e.y, e.z];
    }
    if (!["Part", "SpawnLocation"].includes(node.ClassName ?? "")) approximated++;
    found.push({ node, position, size, rotation });
  }
  if (!found.length) throw new Error("No supported map parts were found. Scripts and terrain cannot be imported.");
  if (found.length > 200) throw new Error(`This map has ${found.length} parts. Import a selection of 200 parts or fewer.`);
  // Bounding spheres include rotated geometry, keeping the entire imported map inside the world.
  const bounds = found.map(({ position: p, size: s }) => ({ p, radius: Math.hypot(s.X, s.Y, s.Z) / 2 }));
  const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const { p, radius } of bounds) for (const i of [0, 1, 2] as const) {
    const v = [p.X, p.Y, p.Z][i] ?? 0;
    min[i] = Math.min(min[i], v - radius); max[i] = Math.max(max[i], v + radius);
  }
  const scale = Math.min(1, 76 / (max[0] - min[0]), 28 / (max[1] - min[1]), 76 / (max[2] - min[2]));
  const blocks: Block[] = found.map(({ position: p, size: s, rotation }) => ({
    kind: "platform",
    x: (p.X - (min[0] + max[0]) / 2) * scale,
    y: (p.Y - min[1]) * scale,
    z: (p.Z - (min[2] + max[2]) / 2) * scale,
    size: [Math.max(0.05, s.X * scale), Math.max(0.05, s.Y * scale), Math.max(0.05, s.Z * scale)],
    rotation,
  }));
  return { blocks: worldSchema.parse(blocks), skipped, approximated, scale };
}

export function readRobloxXml(text: string): RobloxNode[] {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error("This map contains unsupported XML declarations.");
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror") || doc.documentElement.tagName !== "roblox") throw new Error("This is not a valid Roblox map.");
  if (doc.querySelectorAll("Item").length > 50000) throw new Error("This map contains too many objects.");
  const read = (item: Element, depth = 0): RobloxNode => {
    if (depth > 100) throw new Error("This map has too many nested objects.");
    const node: RobloxNode = { ClassName: item.getAttribute("class") ?? "", Children: [] };
    const props = Array.from(item.children).find((p) => p.tagName === "Properties");
    for (const p of Array.from(props?.children ?? [])) {
      const name = p.getAttribute("name")?.toLowerCase();
      const number = (key: string) => Number(Array.from(p.children).find((c) => c.tagName === key)?.textContent ?? NaN);
      if (name === "name") node.Name = p.textContent ?? "";
      if (name === "size" || name === "position") node[name === "size" ? "Size" : "Position"] = { X: number("X"), Y: number("Y"), Z: number("Z") };
      if (name === "cframe") node.CFrame = { Position: { X: number("X"), Y: number("Y"), Z: number("Z") }, Components: [number("X"), number("Y"), number("Z"), ...["R00", "R01", "R02", "R10", "R11", "R12", "R20", "R21", "R22"].map(number)] };
    }
    node.Children = Array.from(item.children).filter((c) => c.tagName === "Item").map((c) => read(c, depth + 1));
    return node;
  };
  return Array.from(doc.documentElement.children).filter((c) => c.tagName === "Item").map((c) => read(c));
}

export async function importRobloxFile(file: File) {
  if (!/\.(rblx|rbxl|rbxlx|rbxm|rbxmx)$/i.test(file.name)) throw new Error("Choose a Roblox map (.rbxl, .rbxlx, .rblx, .rbxm or .rbxmx).");
  if (!file.size || file.size > MAX_MAP_BYTES) throw new Error("Choose a non-empty map under 10 MB.");
  const buffer = await file.arrayBuffer();
  if (new TextDecoder().decode(buffer.slice(0, 8)) === "<roblox!") {
    const worker = new Worker(new URL("./lublox-import.worker.ts", import.meta.url), { type: "module" });
    return new Promise<ReturnType<typeof convertRobloxMap>>((resolve, reject) => {
      const timeout = setTimeout(() => { worker.terminate(); reject(new Error("Map import took too long. Try a smaller map.")); }, 15000);
      const cleanup = () => { clearTimeout(timeout); worker.terminate(); };
      worker.onmessage = ({ data }) => { cleanup(); data.error ? reject(new Error(data.error)) : resolve(data.result); };
      worker.onerror = () => { cleanup(); reject(new Error("Could not read this binary map. Try saving it as .rbxlx in Roblox Studio.")); };
      worker.postMessage(buffer, [buffer]);
    });
  }
  return convertRobloxMap(readRobloxXml(new TextDecoder().decode(buffer)));
}