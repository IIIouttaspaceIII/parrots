// One-time data generation script: pulls the "List of parrots" wikitext from
// Wikipedia and turns it into a static JSON file (src/data/parrots.json) that
// ships with the site. Run with: node scripts/fetch-parrots.mjs
//
// Image URLs use Wikipedia's Special:FilePath redirect, which resolves a
// "File:Name.jpg" reference (taken directly from the article's wikitext) to
// the real, current file on Wikimedia Commons/Wikipedia. This avoids
// hand-typing or guessing image URLs.

import fs from "node:fs";
import path from "node:path";

const WIKITEXT_URL =
  "https://en.wikipedia.org/w/index.php?title=List_of_parrots&action=raw";

const PHOTO_ALT_RE =
  /(parrot|lory|lorikeet|lovebird|cockatoo|macaw|parakeet|kakapo|kea|kaka|budgerigar|cockatiel|rosella)/i;
const MAP_HINT_RE =
  /(range|distribution|map|area\.(png|jpg|gif)|dist\.|area2?\.gif)/i;

function filePathUrl(fileName) {
  const cleaned = fileName.trim().replace(/ /g, "_");
  return `https://en.wikipedia.org/wiki/Special:FilePath/${encodeURIComponent(
    cleaned
  ).replace(/%2F/g, "/")}`;
}

function stripWikiLinks(text) {
  if (!text) return "";
  return text
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/** Extract [[File:...]] links with their alt text (if present). */
function extractFileLinks(cellText) {
  const results = [];
  const re = /\[\[File:([^|\]]+)((?:\|[^\]]*)*)\]\]/g;
  let m;
  while ((m = re.exec(cellText))) {
    const fileName = m[1];
    const rest = m[2] || "";
    const altMatch = rest.match(/\|alt=([^|\]]*)/);
    results.push({ fileName, alt: altMatch ? altMatch[1] : "" });
  }
  return results;
}

/** Extract a {{Multiple image ...}} template's image1/image2/alt1/alt2/footer. */
function extractMultipleImage(cellText) {
  const trimmed = cellText.trim();
  if (!/^\{\{Multiple image/i.test(trimmed)) return null;
  const body = trimmed.replace(/^\{\{Multiple image/i, "").replace(/\}\}$/, "");
  const get = (key) => {
    const r = new RegExp(key + "\\s*=\\s*(\\{\\{[^}]*\\}\\}|[^|]*)");
    const mm = body.match(r);
    return mm ? mm[1].trim() : "";
  };
  const image1 = get("image1");
  const image2 = get("image2");
  const alt1 = get("alt1");
  const alt2 = get("alt2");
  let footer = get("footer");
  const footerTemplateMatch = footer.match(/\{\{align\|[^|]*\|([^}]*)\}\}/i);
  if (footerTemplateMatch) footer = footerTemplateMatch[1];
  if (!image1 || !image2) return null;
  return { image1, image2, alt1, alt2, footer };
}

function detectGenderOrder(multi) {
  // Returns ["male","female"] or ["female","male"] describing image1/image2 order.
  // Uses \b so "female" (which contains "male" as a substring) isn't misread as "male".
  const footer = stripWikiLinks(multi.footer).toLowerCase();
  const alt1 = multi.alt1.toLowerCase();
  const alt2 = multi.alt2.toLowerCase();
  if (/\bfemale left\b/.test(footer)) return ["female", "male"];
  if (/\bmale left\b/.test(footer)) return ["male", "female"];
  if (/\bfemale right\b/.test(footer)) return ["male", "female"];
  if (/\bmale right\b/.test(footer)) return ["female", "male"];
  if (/\bfemale\b/.test(alt1) && /\bmale\b/.test(alt2)) return ["female", "male"];
  if (/\bmale\b/.test(alt1) && /\bfemale\b/.test(alt2)) return ["male", "female"];
  return null;
}

function pickPhotoFromFileLinks(links) {
  // Prefer a link whose alt text looks like a bird description (not a range map).
  const good = links.filter(
    (l) => PHOTO_ALT_RE.test(l.alt) && !MAP_HINT_RE.test(l.fileName)
  );
  if (good.length) return good[good.length - 1];
  const nonMap = links.filter((l) => !MAP_HINT_RE.test(l.fileName));
  if (nonMap.length) return nonMap[nonMap.length - 1];
  return links.length ? links[links.length - 1] : null;
}

function parseRows(wikitext) {
  const startIdx = wikitext.indexOf("==New Zealand parrots==");
  const endIdx = wikitext.indexOf("==See also==");
  const body = wikitext.slice(startIdx, endIdx);

  const tableRe = /\{\|class="wikitable"[\s\S]*?\n\|\}/g;
  const species = [];
  let tableMatch;
  let idCounter = 0;

  while ((tableMatch = tableRe.exec(body))) {
    const table = tableMatch[0];
    const rows = table.split(/\n\|-/).slice(1);

    for (const rawRow of rows) {
      let row = rawRow.trim();
      row = row.replace(/\|\}$/, "").trim();
      if (!row || row.startsWith("}")) continue;

      // Split into cells: a header cell "!scope=..." then "|" cells.
      const cellRe = /(?:^|\n)(!|\|)(?:scope="[^"]*"\|)?/g;
      const cells = [];
      let lastIdx = -1;
      let lastPrefixLen = 0;
      let m2;
      const indices = [];
      while ((m2 = cellRe.exec(row))) {
        indices.push({ start: m2.index, end: cellRe.lastIndex });
      }
      for (let i = 0; i < indices.length; i++) {
        const start = indices[i].end;
        const end = i + 1 < indices.length ? indices[i + 1].start : row.length;
        cells.push(row.slice(start, end).trim());
      }
      if (cells.length < 2) continue;

      const commonNameCellRaw = cells[0];
      const commonLinkMatch = commonNameCellRaw.match(
        /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/
      );
      if (!commonLinkMatch) continue;
      const commonName = stripWikiLinks(
        commonLinkMatch[2] || commonLinkMatch[1]
      );
      const wikiTitle = commonLinkMatch[1];
      const extinct = /†/.test(row);

      const sciCell = cells[1] || "";
      const sciMatch = sciCell.match(/''\s*†?\s*([^']+?)\s*''/);
      const scientificName = sciMatch ? sciMatch[1].trim() : "";

      const pictureCell = cells[cells.length - 1] || "";

      const multi = extractMultipleImage(pictureCell);
      let imageUrl = null;
      let dimorphism = null;

      if (multi) {
        const order = detectGenderOrder(multi);
        if (order) {
          const [firstGender, secondGender] = order;
          const maleFile = firstGender === "male" ? multi.image1 : multi.image2;
          const femaleFile =
            firstGender === "female" ? multi.image1 : multi.image2;
          dimorphism = {
            male: filePathUrl(maleFile),
            female: filePathUrl(femaleFile),
          };
          imageUrl = dimorphism.male;
        } else {
          imageUrl = filePathUrl(multi.image1);
        }
      } else {
        const links = extractFileLinks(pictureCell);
        const chosen = pickPhotoFromFileLinks(links);
        if (chosen) imageUrl = filePathUrl(chosen.fileName);
      }

      if (!imageUrl || !commonName || !scientificName) continue;

      idCounter += 1;
      species.push({
        id: `${idCounter}-${commonName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        commonName,
        scientificName,
        wikiTitle,
        extinct,
        imageUrl,
        dimorphism,
      });
    }
  }

  return species;
}

async function main() {
  console.log("Fetching wikitext from Wikipedia...");
  const res = await fetch(WIKITEXT_URL, {
    headers: { "User-Agent": "parrot-guessing-game-data-fetch/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch wikitext: ${res.status}`);
  }
  const wikitext = await res.text();

  const species = parseRows(wikitext);

  const withImages = species.filter((s) => s.imageUrl);
  const withDimorphism = species.filter((s) => s.dimorphism);

  console.log(`Parsed ${species.length} species with usable photos.`);
  console.log(`Of which ${withDimorphism.length} have male/female images.`);

  const outDir = path.resolve(process.cwd(), "src", "data");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "parrots.json");
  fs.writeFileSync(outPath, JSON.stringify(withImages, null, 2));
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
