// kb.js - loads the two knowledge bases (plain JSON files in data/).
// They are fetched once and kept; the service worker saves them for offline use.

let cache = null;

export async function loadKB(base = new URL("../data/", import.meta.url)) {
  if (cache) return cache;
  const get = async (name) => {
    const r = await fetch(new URL(name, base));
    if (!r.ok) throw new Error(`${name}: ${r.status}`);
    return r.json();
  };
  const [palm, astro] = await Promise.all([get("palmistry_knowledge.json"), get("astrology_knowledge.json")]);
  cache = { palm, astro };
  return cache;
}
