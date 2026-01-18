import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateFileRequest, type UpdateFileRequest } from "@shared/routes";

export function useFiles(view?: 'all' | 'recent' | 'starred' | 'trash', search?: string) {
  return useQuery({
    queryKey: [api.files.list.path, view, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (view) params.append('view', view);
      if (search) params.append('search', search);
      
      const url = `${api.files.list.path}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch files");
      
      return api.files.list.responses[200].parse(await res.json());
    },
  });
}

export function useStorageStats() {
  return useQuery({
    queryKey: [api.files.stats.path],
    queryFn: async () => {
      const res = await fetch(api.files.stats.path);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return api.files.stats.responses[200].parse(await res.json());
    },
  });
}

export function useCreateFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateFileRequest) => {
      const res = await fetch(api.files.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create file record");
      return api.files.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.files.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.files.stats.path] });
    },
  });
}

export function useUpdateFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateFileRequest) => {
      const url = buildUrl(api.files.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update file");
      return api.files.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.files.list.path] }),
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.files.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete file");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.files.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.files.stats.path] });
    },
  });
}
