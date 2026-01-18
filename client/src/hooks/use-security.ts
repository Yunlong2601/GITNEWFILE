import { useMutation, useQuery } from "@tanstack/react-query";
import { api, type InsertDlpLog } from "@shared/routes";

export function useDlpLogs() {
  return useQuery({
    queryKey: [api.dlp.list.path],
    queryFn: async () => {
      const res = await fetch(api.dlp.list.path);
      if (!res.ok) throw new Error("Failed to fetch DLP logs");
      return api.dlp.list.responses[200].parse(await res.json());
    },
  });
}

export function useLogDlpEvent() {
  return useMutation({
    mutationFn: async (data: InsertDlpLog) => {
      const res = await fetch(api.dlp.log.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to log DLP event");
      return api.dlp.log.responses[201].parse(await res.json());
    },
  });
}

export function useSendDecryptionCode() {
  return useMutation({
    mutationFn: async (data: { email: string; fileId: number }) => {
      const res = await fetch(api.security.sendDecryptionCode.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send code");
      return api.security.sendDecryptionCode.responses[200].parse(await res.json());
    },
  });
}

export function useVerifyDecryptionCode() {
  return useMutation({
    mutationFn: async (data: { code: string; fileId: number }) => {
      const res = await fetch(api.security.verifyDecryptionCode.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to verify code");
      return api.security.verifyDecryptionCode.responses[200].parse(await res.json());
    },
  });
}
