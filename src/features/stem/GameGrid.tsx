import { Fragment, useState, type ReactNode } from "react";
import { Button } from "../../components/ui/Button";

/** Only this many cards are shown at first. The rest load on "Show more". */
export const CARD_PAGE = 60;

/**
 * A paged grid of cards. Give it a `key` that changes with the filter, so paging resets with it.
 */
export function PagedGrid<T extends { id: string }>({ items, renderCard }: { items: T[]; renderCard: (item: T) => ReactNode }) {
  const [shown, setShown] = useState(CARD_PAGE);
  const visible = items.slice(0, shown);
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => (
          <Fragment key={item.id}>{renderCard(item)}</Fragment>
        ))}
      </div>
      {items.length > shown && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => setShown((s) => s + CARD_PAGE)}>
            Show more ({items.length - shown} left)
          </Button>
        </div>
      )}
    </>
  );
}
