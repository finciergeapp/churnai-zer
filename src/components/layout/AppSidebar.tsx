import { 
  Users, 
  Code,
  Menu,
  X
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

// Minimal production navigation - only essential routes
const navigationItems = [
  { title: "Website Integration", url: "/integration", icon: Code },
  { title: "User Predictions", url: "/users", icon: Users },
];

export function AppSidebar() {
  const { open, isMobile } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path || (path !== "/" && currentPath.startsWith(path));

  return (
    <Sidebar
      className={`${!open && !isMobile ? "w-16" : "w-[280px]"} border-r border-sidebar-border bg-sidebar shadow-sm transition-all duration-300 h-screen`}
      collapsible="icon"
      variant={isMobile ? "sidebar" : "sidebar"}
    >
      <SidebarHeader className="border-b border-sidebar-border px-6 py-4">
        <div className="flex items-center space-x-2">
          <Logo className="h-8 w-8 shrink-0" />
          {(open || isMobile) && (
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-sidebar-primary truncate">Churnaizer</h2>
              <p className="text-sm text-sidebar-foreground/70 truncate">Churn Prevention</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 px-6 py-4 overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="rounded-lg h-12">
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => 
                        `flex items-center w-full transition-colors duration-200 px-6 py-3 ${
                          isActive 
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                        }`
                      }
                    >
                      <div className="flex items-center w-full">
                        <item.icon className={`h-5 w-5 ${(!open && !isMobile) ? "" : "mr-2"}`} />
                        {(open || isMobile) && <span className="font-medium text-sm truncate ml-2">{item.title}</span>}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-6 py-4">
        {user && (
          <div className={`flex items-center ${(!open && !isMobile) ? "justify-center" : "space-x-3 mb-3"}`}>
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {user.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {(open || isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-primary truncate">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </p>
                <p className="text-xs text-sidebar-foreground/70 truncate">
                  {user.email}
                </p>
              </div>
            )}
          </div>
        )}
        
        {(open || isMobile) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={signOut}
            className="w-full text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-10"
          >
            Sign Out
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}