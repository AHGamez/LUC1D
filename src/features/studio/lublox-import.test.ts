import { describe, expect, it } from "vitest";
import { convertRobloxMap, readRobloxXml, importRobloxFile, MAX_MAP_BYTES, type RobloxNode } from "./lublox-import";
import { worldSchema } from "../lublox/lublox";
const part: RobloxNode = { ClassName: "Part", Size: { X: 8, Y: 2, Z: 6 }, Position: { X: 10, Y: 4, Z: -5 } };
export const XML_MAP = `<roblox version="4"><Item class="Workspace"><Item class="Part"><Properties><Vector3 name="size"><X>8</X><Y>2</Y><Z>6</Z></Vector3><CoordinateFrame name="CFrame"><X>10</X><Y>4</Y><Z>-5</Z><R00>0</R00><R01>0</R01><R02>1</R02><R10>0</R10><R11>1</R11><R12>0</R12><R20>-1</R20><R21>0</R21><R22>0</R22></CoordinateFrame></Properties></Item><Item class="Script"><Properties><ProtectedString name="Source">throw new Error('never run')</ProtectedString></Properties></Item></Item></roblox>`;
describe("Studio Roblox map import", () => {
  it("imports XML part dimensions and rotation while discarding scripts", () => {
    const result = convertRobloxMap(readRobloxXml(XML_MAP));
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]?.size).toEqual([8, 2, 6]);
    expect(result.blocks[0]?.rotation?.[1]).toBeCloseTo(Math.PI / 2);
    expect(result.skipped).toBe(1);
    expect(JSON.stringify(result.blocks)).not.toContain("Source");
  });
  it("imports nested map parts but not stored assets outside Workspace", () => {
    const result = convertRobloxMap([{ ClassName: "Workspace", Children: [{ ClassName: "Model", Children: [part] }] }, { ClassName: "ReplicatedStorage", Children: [part] }]);
    expect(result.blocks).toHaveLength(1);
  });
  it("rejects maps over the existing 200-part limit without silently truncating", () => {
    expect(() => convertRobloxMap(Array(201).fill(part))).toThrow("201 parts");
    expect(convertRobloxMap(Array(200).fill(part)).blocks).toHaveLength(200);
  });
  it("scales large maps into validated world limits", () => {
    const result = convertRobloxMap([part, { ...part, Position: { X: 10000, Y: 5000, Z: -4000 } }]);
    expect(result.scale).toBeLessThan(1);
    expect(worldSchema.safeParse(result.blocks).success).toBe(true);
  });
  it("rejects empty, malformed and entity-bearing XML maps", () => {
    expect(() => readRobloxXml("<roblox>")).toThrow("valid Roblox map");
    expect(() => readRobloxXml('<!DOCTYPE roblox><roblox/>')).toThrow("declarations");
    expect(() => convertRobloxMap(readRobloxXml('<roblox><Item class="Script"/></roblox>'))).toThrow("No supported map parts");
  });
  it("validates imported geometry and keeps legacy blocks compatible", () => {
    expect(worldSchema.safeParse([{ kind: "platform", x: 0, y: 0, z: 0 }]).success).toBe(true);
    expect(worldSchema.safeParse([{ kind: "platform", x: 0, y: 0, z: 0, size: [81, 1, 1] }]).success).toBe(false);
    expect(worldSchema.safeParse([{ kind: "platform", x: 0, y: 0, z: 0, rotation: [4, 0, 0] }]).success).toBe(false);
  });
  it("rejects oversized files before reading them", async () => {
    await expect(importRobloxFile({ name: "map.rblx", size: MAX_MAP_BYTES + 1 } as File)).rejects.toThrow("10 MB");
    await expect(importRobloxFile(new File(["map"], "map.exe"))).rejects.toThrow("Choose a Roblox map");
  });
});