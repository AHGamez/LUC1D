import type { GameSource } from "./games";

// Runs before the game's own scripts. The frame is sandboxed without same-origin access, so the real
// browser storage throws there. This gives the game in-memory storage for the life of the frame.
const STORAGE_SHIM = `<script>(function(){function S(){var d={};return{getItem:function(k){return k in d?d[k]:null},setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}["localStorage","sessionStorage"].forEach(function(n){try{window[n].length}catch(e){try{Object.defineProperty(window,n,{value:S(),configurable:true})}catch(_){}}});try{indexedDB.open("_luc1d")}catch(e){try{Object.defineProperty(window,"indexedDB",{value:undefined,configurable:true})}catch(_){}}})();</script>`;

/** The static file path without its query string. */
export function framePath(embedUrl: string): string {
  return embedUrl.split("?")[0] ?? embedUrl;
}

const escapeAttr = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Prepares a locally hosted game page for a srcdoc frame: sets the base URL to the file's folder,
 * adds the storage shim, and removes crossorigin attributes, which fail without CORS headers.
 * GN Math pages link back to their original relay, so those links are pointed at the local copies.
 */
export function prepareLocalGame(html: string, path: string, source: GameSource): string {
  const base = path.slice(0, path.lastIndexOf("/") + 1);
  const relinked = source === "gn-math" ? html.replaceAll("https://gn-math.dev/s/", "/game-files/gn-math/") : html;
  const cleaned = relinked.replace(/\scrossorigin(=["'][^"']*["'])?/gi, "");
  const injected = `<base href="${escapeAttr(base)}">${STORAGE_SHIM}`;
  return /<head[^>]*>/i.test(cleaned)
    ? cleaned.replace(/<head[^>]*>/i, (tag) => tag + injected)
    : injected + cleaned;
}
