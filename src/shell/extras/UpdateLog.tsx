import { History } from "lucide-react";
import updateLog from "../../data/update-log.json";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** Recent site changes, newest first. Data comes from src/data/update-log.json. */
export default function UpdateLog() {
  const entries = updateLog.entries;
  const latest = entries[0];

  return (
    <section aria-labelledby="update-log-heading" className="surface-card w-full max-w-lg p-4 text-left">
      <div className="mb-3 flex items-center gap-2.5">
        <span aria-hidden className="grid size-7 place-items-center rounded-[10px] bg-primary/15 text-primary ring-1 ring-primary/25 [&_svg]:size-3.5">
          <History />
        </span>
        <h2 id="update-log-heading" className="text-body font-semibold text-foreground">
          Update log
        </h2>
        {latest && <span className="surface-control ml-auto rounded-full px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{latest.id}</span>}
      </div>

      <ol className="max-h-56 space-y-3.5 overflow-y-auto pr-2">
        {entries.map((entry, index) => (
          <li key={entry.id} className="border-l-2 border-border pl-3.5">
            <div className="flex flex-wrap items-center gap-2 text-caption">
              <span className={index === 0 ? "font-semibold text-primary" : "font-semibold text-foreground"}>
                {entry.title}
              </span>
              <time dateTime={entry.date} className="text-muted-foreground">
                {dateFormat.format(new Date(entry.date))}
              </time>
            </div>
            <ul className="mt-1.5 space-y-1 text-caption leading-relaxed text-muted-foreground">
              {entry.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
