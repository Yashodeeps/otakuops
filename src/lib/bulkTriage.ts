// Bulk triage shortcuts: apply one status/tier to a whole selection at once.
// Writes route through the collection service so it stays the only layer that
// touches collection rows.
import { updateItem, type ItemUpdate, type CollectionRow } from "@/lib/collection";

export const BULK_MAX = 100;

export type BulkResult = { updated: CollectionRow[]; missing: string[] };

/** Apply the same update to many of the caller's items; ids they don't own land in `missing`. */
export async function bulkTriage(
  userId: string,
  ids: string[],
  update: ItemUpdate,
): Promise<BulkResult> {
  const updated: CollectionRow[] = [];
  const missing: string[] = [];
  // One call per id because updateItem derives episodesWatched from that row's
  // anime - a single updateMany can't do that.
  // ponytail: sequential round-trips; batch by derived episode count if a
  // hundred-item selection ever feels slow.
  for (const id of [...new Set(ids)]) {
    const row = await updateItem(userId, id, update);
    if (row) updated.push(row);
    else missing.push(id);
  }
  return { updated, missing };
}
