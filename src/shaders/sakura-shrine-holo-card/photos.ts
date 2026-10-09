export type CosplayPhoto = {
  /** Image URL. A missing file falls back to placeholder art. */
  src?: string;
  /** Character name, shown in Japanese on the card */
  character: string;
  /** Romanized / Thai subtitle */
  subtitle: string;
  /** Series / work the character comes from */
  series: string;
  /** Cosplayer handle */
  cosplayer: string;
  /** Photographer credit (optional) */
  photographer?: string;
  /** Accent colour used for placeholder art and the card ribbon */
  accent: string;
};

/** Placeholder line-up shown until real photos are added to src/cosplay/. */
const samplePhotos: CosplayPhoto[] = [
  { character: "桜の巫女", subtitle: "Sakura no Miko", series: "Shrine Maiden", cosplayer: "@your_name", accent: "#e8436a" },
  { character: "狐の嫁入り", subtitle: "Kitsune Bride", series: "Yokai Tales", cosplayer: "@your_name", accent: "#f08a3c" },
  { character: "夜桜の剣士", subtitle: "Yozakura Swordsman", series: "Blade of Spring", cosplayer: "@your_name", accent: "#7c5cff" },
  { character: "鬼姫", subtitle: "Oni Hime", series: "Crimson Shrine", cosplayer: "@your_name", accent: "#d6334a" },
  { character: "月詠", subtitle: "Tsukuyomi", series: "Moonlit Gods", cosplayer: "@your_name", accent: "#5b8cff" },
  { character: "花魁", subtitle: "Oiran", series: "Edo Night", cosplayer: "@your_name", accent: "#c2367f" },
  { character: "雪女", subtitle: "Yuki-onna", series: "Winter Spirits", cosplayer: "@your_name", accent: "#7fd3e8" },
  { character: "天狗", subtitle: "Tengu", series: "Mountain Shrine", cosplayer: "@your_name", accent: "#e0573a" },
  { character: "桜餅ちゃん", subtitle: "Sakura Mochi-chan", series: "Wagashi Girls", cosplayer: "@your_name", accent: "#ff9ec0" },
  { character: "陰陽師", subtitle: "Onmyoji", series: "Heian Spells", cosplayer: "@your_name", accent: "#3fb58c" },
  { character: "舞妓", subtitle: "Maiko", series: "Gion Spring", cosplayer: "@your_name", accent: "#ff6f91" },
  { character: "風神", subtitle: "Fujin", series: "Storm Gods", cosplayer: "@your_name", accent: "#4fc3a1" },
];

const ACCENTS = ["#e8436a", "#f08a3c", "#7c5cff", "#d6334a", "#5b8cff", "#c2367f", "#7fd3e8", "#3fb58c"];

// Every image dropped into src/cosplay/ (any file name) is picked up automatically, sorted by name.
const found = import.meta.glob("/src/cosplay/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

/** Optional per-file captions: key = file name in src/cosplay/. */
export const captions: Record<string, Partial<CosplayPhoto>> = {
  // Edit these to match each photo (key = file name in src/cosplay/).
  "01.jpg": { character: "小南", subtitle: "Konan", series: "Naruto · Akatsuki" },
  "02.jpg": { character: "小南", subtitle: "Konan", series: "Naruto · Akatsuki" },
  "03.jpg": { character: "小南", subtitle: "Konan", series: "Naruto · Akatsuki" },
  "04.jpg": { character: "暁", subtitle: "Akatsuki", series: "Naruto · Akatsuki" },
  "05.jpg": { character: "小南", subtitle: "Konan", series: "Naruto · Akatsuki" },
};

const userPhotos: CosplayPhoto[] = Object.keys(found)
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  .map((path, i) => {
    const file = path.split("/").pop()!;
    const sample = samplePhotos[i % samplePhotos.length];
    return {
      src: found[path],
      character: sample.character,
      subtitle: file.replace(/\.[^.]+$/, ""),
      series: "Sakura Shrine",
      cosplayer: "@cosplayer",
      accent: ACCENTS[i % ACCENTS.length],
      ...captions[file],
    };
  });

export const cosplayPhotos: CosplayPhoto[] = userPhotos.length ? userPhotos : samplePhotos;
