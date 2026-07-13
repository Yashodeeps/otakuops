import {
  Check,
  Play,
  Hourglass,
  Bookmark,
  Trash2,
  CircleDashed,
  type LucideIcon,
} from "lucide-react";
import type { Status } from "@/lib/enums";

export const STATUS_ICON: Record<Status, LucideIcon> = {
  untriaged: CircleDashed,
  watched: Check,
  watching: Play,
  half_finished: Hourglass,
  watchlist: Bookmark,
  dropped: Trash2,
};

export function tierColor(tier: string): string {
  switch (tier) {
    case "S":
      return "var(--tier-s)";
    case "A":
      return "var(--tier-a)";
    case "B":
      return "var(--tier-b)";
    case "C":
      return "var(--tier-c)";
    case "D":
      return "var(--tier-d)";
    default:
      return "var(--faint)";
  }
}
