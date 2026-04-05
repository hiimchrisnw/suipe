import type { Swipe } from "@suipe/schemas"
import { useMutation, useQueryClient } from "@tanstack/react-query"

export function useUpdateSwipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, tags }: { id: string; tags: string[] }): Promise<Swipe> => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/swipes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      })
      if (!res.ok) throw new Error("Update failed")
      return res.json() as Promise<Swipe>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swipes"] })
      queryClient.invalidateQueries({ queryKey: ["tags"] })
    },
  })
}
