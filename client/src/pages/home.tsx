import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useFiles } from "@/hooks/use-files";
import { FileIcon, Shield, HardDrive, Star, Trash2, Clock } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const { data: files } = useFiles();
  const { data: stats } = useFiles(); // Assuming a separate call or same data structure

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {user?.username}</h1>
        <Button>Upload File</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats as any)?.totalSizeFormatted || "0 B"}</div>
            <p className="text-xs text-muted-foreground">across {(stats as any)?.fileCount || 0} files</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">in the last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Recent Files</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(files as any[])?.slice(0, 6).map((file: any) => (
            <Card key={file.id} className="hover-elevate cursor-pointer bg-card">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileIcon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-foreground">{file.fileName}</p>
                  <p className="text-xs text-muted-foreground">{file.securityLevel} Security</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!files || (files as any[]).length === 0) && (
            <p className="text-sm text-muted-foreground italic">No files uploaded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}