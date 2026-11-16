import { Search } from "lucide-react";
import { GAME_SOURCES, type GameSource } from "./games";

/** Title, count and search box shared by the store and the downloads library. */
export function LibraryToolbar({
  title,
  count,
  query,
  onQuery,
  placeholder,
}: {
  title: string;
  count: string;
  query: string;
  onQuery: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <h2 className="text-display font-bold leading-none tracking-tight text-foreground">{title}</h2>
      <span className="rounded-full bg-secondary/70 px-2.5 py-1 text-caption font-medium text-muted-foreground">{count}</span>
      <label className="surface-control ml-auto flex min-w-0 items-center gap-2 px-3 py-1.5 transition-shadow focus-within:ring-2 focus-within:ring-ring">
        <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-40 min-w-0 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground sm:w-56 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button type="button" onClick={() => onQuery("")} className="shrink-0 rounded-full px-2 py-0.5 text-caption text-muted-foreground hover:bg-accent hover:text-foreground">
            Clear
          </button>
        )}
      </label>
    </div>
  );
}

/** Source tabs (55gms, GN Math, FivePlay). Each tab can show a count. */
export function SourceTabs({
  label,
  value,
  counts,
  onChange,
}: {
  label: string;
  value: GameSource;
  counts?: Record<GameSource, number>;
  onChange: (source: GameSource) => void;
}) {
  return (
    <div role="tablist" aria-label={label} className="surface-control flex flex-wrap gap-1 self-start p-1">
      {GAME_SOURCES.map((source) => {
        const selected = source.id === value;
        return (
          <button
            key={source.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(source.id)}
            className={`press rounded-[9px] px-3 py-1.5 text-caption font-semibold transition-colors ${
              selected ? "surface-tab-selected" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {source.name}
            {counts && <span className="ml-1 tabular-nums opacity-70">({counts[source.id]})</span>}
          </button>
        );
      })}
    </div>
  );
}
