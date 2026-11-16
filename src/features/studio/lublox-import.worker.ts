import { decompress } from "fzstd";
import { decompressBlock } from "lz4js";
import { decode } from "./vendor/roblox-binary.js";
import { convertRobloxMap, type RobloxNode } from "./lublox-import";

function prepare(buffer: ArrayBuffer) {
  if (buffer.byteLength < 32) throw new Error("Incomplete binary map.");
  const view = new DataView(buffer), bytes = new Uint8Array(buffer);
  if (view.getUint16(14, true) !== 0 || view.getUint32(20, true) > 50000 || view.getUint32(16, true) > 5000) throw new Error("Unsupported or oversized binary map.");
  const chunks: Uint8Array[] = [bytes.slice(0, 32)];
  let offset = 32, total = 32, ended = false;
  while (offset + 16 <= buffer.byteLength) {
    const compressed = view.getUint32(offset + 4, true), expanded = view.getUint32(offset + 8, true), length = compressed || expanded;
    if (expanded > 16 * 1024 * 1024 || total + expanded > 64 * 1024 * 1024 || offset + 16 + length > buffer.byteLength) throw new Error("Map data is oversized or incomplete.");
    const header = bytes.slice(offset, offset + 16);
    let payload = bytes.slice(offset + 16, offset + 16 + length);
    if (compressed && payload[0] === 0x28 && payload[1] === 0xb5 && payload[2] === 0x2f && payload[3] === 0xfd) {
      payload = new Uint8Array(decompress(payload));
      if (payload.length !== expanded) throw new Error("Invalid compressed map data.");
      new DataView(header.buffer).setUint32(4, 0, true);
    } else if (compressed) {
      const decoded = new Uint8Array(expanded);
      if (decompressBlock(payload, decoded, 0, payload.length, 0) !== expanded) throw new Error("Invalid compressed map data.");
      payload = decoded;
      new DataView(header.buffer).setUint32(4, 0, true);
    }
    // The upstream reader consumes service flags even for non-service classes.
    // Supply absent zero flags without changing the actual Roblox file.
    if (header[0] === 73 && header[1] === 78 && header[2] === 83 && header[3] === 84) {
      const pv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
      const flagOffset = 8 + pv.getUint32(4, true);
      if (flagOffset + 5 > payload.length) throw new Error("Invalid map class data.");
      const count = pv.getUint32(flagOffset + 1, true);
      if (count > 50000) throw new Error("Too many map instances.");
      if (payload[flagOffset] === 0) {
        const padded = new Uint8Array(payload.length + count);
        padded.set(payload); payload = padded;
        new DataView(header.buffer).setUint32(8, payload.length, true);
      }
    }
    chunks.push(header, payload); total += 16 + expanded;
    offset += 16 + length;
    if (header[0] === 69 && header[1] === 78 && header[2] === 68 && header[3] === 0) { ended = true; break; }
  }
  if (!ended) throw new Error("Incomplete binary map.");
  const output = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0));
  let cursor = 0;
  for (const chunk of chunks) { output.set(chunk, cursor); cursor += chunk.length; }
  return output.buffer;
}
self.onmessage = ({ data }: MessageEvent<ArrayBuffer>) => {
  try { self.postMessage({ result: convertRobloxMap(decode(prepare(data)) as RobloxNode[]) }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? `${error.message} Try an XML .rbxlx export if needed.` : "Could not import this map." }); }
};