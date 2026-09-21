import { palettes, type Palette } from "./flower";
export interface Artwork {
  seed: number;
  palette: Palette;
  v: 1;
}
export function readState(search: string): Artwork {
  const params = new URLSearchParams(search);
  const raw = params.get("seed") ?? "";
  const seed =
    /^\d{1,10}$/.test(raw) && Number(raw) <= 4294967295 ? Number(raw) : 104729;
  const name = params.get("palette") ?? "";
  if (params.has("v") && params.get("v") !== "1")
    return { seed: 104729, palette: "rose", v: 1 };
  return {
    seed,
    palette: Object.hasOwn(palettes, name) ? (name as Palette) : "rose",
    v: 1,
  };
}
export function stateQuery(state: Artwork) {
  return new URLSearchParams({
    v: "1",
    seed: String(state.seed),
    palette: state.palette,
  }).toString();
}
