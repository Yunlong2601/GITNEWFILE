import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from "@/components/ui/sidebar";
import { HardDrive, MessageSquare, ShieldAlert, Settings, LogOut, Star, Trash2, Clock } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { icon: HardDrive, label: "My Files", path: "/" },
  { icon: Clock, label: "Recent", path: "/?view=recent" },
  { icon: Star, label: "Starred", path: "/?view=starred" },
  { icon: Trash2, label: "Trash", path: "/?view=trash" },
  { icon: MessageSquare, label: "Secure Chat", path: "/chat" },
];

const adminItems = [
  { icon: ShieldAlert, label: "DLP Logs", path: "/admin/dlp" },
  { icon: Settings, label: "System Settings", path: "/admin/settings" },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  return (
    <Sidebar variant="sidebar">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2 font-bold text-xl">
          <div className="p-1 bg-primary text-primary-foreground rounded">
            <ShieldAlert size={20} />
          </div>
          <span>FortiFile</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Storage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={location === item.path}>
                    <Link href={item.path} className="flex items-center gap-2">
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={location === item.path}>
                      <Link href={item.path} className="flex items-center gap-2">
                        <item.icon size={18} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <div className="mt-auto p-4 border-t space-y-2">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold uppercase">
            {user?.username.slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0 text-sm">
            <p className="font-medium truncate">{user?.username}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        <SidebarMenuButton 
          onClick={() => logoutMutation.mutate()} 
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </SidebarMenuButton>
      </div>
    </Sidebar>
  );
}