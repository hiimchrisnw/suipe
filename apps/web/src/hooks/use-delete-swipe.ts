import { useMutation, useQueryClient } from "@tanstack/react-query"

export function useDeleteSwipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/swipes/${id}`, {
        method: "DELETE",
      })
      if (!res.ok && res.status !== 204) throw new Error("Delete failed")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swipes"] })
    },
  })
}
