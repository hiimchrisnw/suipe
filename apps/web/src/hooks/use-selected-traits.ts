import { MAX_TRAITS } from "@suipe/schemas"
import { useSearchParamArray } from "../lib/router"

// A hand-edited URL can carry more traits than a recipe allows; only the first few count.
export function useSelectedTraits(): string[] {
  return useSearchParamArray("emotions").slice(0, MAX_TRAITS)
}
