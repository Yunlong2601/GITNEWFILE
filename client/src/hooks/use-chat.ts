import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateRoomRequest, type CreateMessageRequest } from "@shared/routes";

export function useChatRooms() {
  return useQuery({
    queryKey: [api.chat.rooms.list.path],
    queryFn: async () => {
      const res = await fetch(api.chat.rooms.list.path);
      if (!res.ok) throw new Error("Failed to fetch chat rooms");
      return api.chat.rooms.list.responses[200].parse(await res.json());
    },
    refetchInterval: 5000,
  });
}

export function useChatMessages(roomId: number) {
  return useQuery({
    queryKey: [api.chat.messages.list.path, roomId],
    queryFn: async () => {
      const url = buildUrl(api.chat.messages.list.path, { roomId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return api.chat.messages.list.responses[200].parse(await res.json());
    },
    enabled: !!roomId,
    refetchInterval: 3000,
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateRoomRequest) => {
      const res = await fetch(api.chat.rooms.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create room");
      return api.chat.rooms.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.chat.rooms.list.path] }),
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roomId, ...data }: { roomId: number } & CreateMessageRequest) => {
      const url = buildUrl(api.chat.messages.create.path, { roomId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return api.chat.messages.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: [api.chat.messages.list.path, roomId] });
    },
  });
}
