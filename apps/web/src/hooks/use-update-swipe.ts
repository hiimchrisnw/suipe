import type { Swipe } from "@suipe/schemas"
import { useMutation, useQueryClient } from "@tanstack/react-query"

interface UpdateSwipeParams {
  id: string
  tags?: string[]
  focalX?: number | null
  focalY?: number | null
}

export function useUpdateSwipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateSwipeParams): Promise<Swipe> => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/swipes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
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
