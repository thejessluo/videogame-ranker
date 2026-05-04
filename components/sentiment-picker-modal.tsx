"use client";

import type { BroadRating } from "@/lib/ranking/beli";
import { SENTIMENT_OPTIONS } from "@/lib/ranking/sentiment-options";

type Props = {
  open: boolean;
  gameName: string;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSelect: (rating: BroadRating) => void | Promise<void>;
};

export function SentimentPickerModal({
  open,
  gameName,
  submitting,
  error,
  onClose,
  onSelect,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sentiment-modal-title"
      aria-describedby="sentiment-modal-desc"
    >
      <div className="panel relative w-full max-w-lg overflow-hidden p-6 shadow-2xl shadow-black/40 sm:p-8">
        <button
          type="button"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none text-white/55 transition hover:bg-white/10 hover:text-white/90"
          onClick={onClose}
          aria-label="Close sentiment modal"
        >
          ×
        </button>
        <div className="pr-8">
          <p id="sentiment-modal-desc" className="text-sm font-medium text-white/65">
            How was it?
          </p>
          <h3
            id="sentiment-modal-title"
            className="mt-1 font-serif text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]"
          >
            {gameName}
          </h3>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-6 sm:gap-8">
          {SENTIMENT_OPTIONS.map((opt) => (
            <button
              key={opt.rating}
              type="button"
              disabled={submitting}
              className="group flex w-[6.25rem] shrink-0 flex-col items-center gap-2 rounded-2xl p-2 pb-1 transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-45 sm:w-[6.75rem]"
              onClick={() => void onSelect(opt.rating)}
            >
              <span
                className={`relative h-[4.25rem] w-[4.25rem] rounded-full ring-2 ring-black/25 transition duration-200 group-hover:scale-[1.06] group-hover:ring-white/25 group-active:scale-[0.97] sm:h-[4.75rem] sm:w-[4.75rem] ${opt.swatch}`}
                aria-hidden
              />
              <span className="text-center text-[13px] font-semibold leading-tight text-white">{opt.label}</span>
              <span className="text-center text-[11px] leading-snug text-white/45">{opt.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
