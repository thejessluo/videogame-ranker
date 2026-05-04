import type { BroadRating } from "./beli";

/** Three tiers + traffic-light swatches (Beli-style). Used by add flow and bookmarks rank. */
export const SENTIMENT_OPTIONS: {
  rating: BroadRating;
  label: string;
  hint: string;
  swatch: string;
}[] = [
  {
    rating: "liked_it",
    label: "I liked it!",
    hint: "I'm locked in",
    swatch:
      "bg-[linear-gradient(145deg,#34d399_0%,#059669_100%)] shadow-[inset_0_2px_0_rgba(255,255,255,0.25)]",
  },
  {
    rating: "fine",
    label: "It was fine",
    hint: "mid af",
    swatch:
      "bg-[linear-gradient(145deg,#fcd34d_0%,#ca8a04_95%)] shadow-[inset_0_2px_0_rgba(255,255,255,0.28)]",
  },
  {
    rating: "didnt_like",
    label: "I didn't like it",
    hint: "brb uninstalling",
    swatch:
      "bg-[linear-gradient(145deg,#fda4af_0%,#e11d48_95%)] shadow-[inset_0_2px_0_rgba(255,255,255,0.22)]",
  },
];
