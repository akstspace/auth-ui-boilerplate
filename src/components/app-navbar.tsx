"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings, Shield, Undo2 } from "lucide-react";
import { OrgSwitcher } from "@/components/org-switcher";
import { TeamSwitcher } from "@/components/team-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/lib/auth-error";
import { cn } from "@/lib/utils";
import { isImpersonating, isPlatformAdmin } from "@/lib/platform-admin";

export function AppNavbar({
  hideNavigationActions = false,
  isSidebarOpen = false,
  onToggleSidebar,
  sidebarLabel = "Sidebar",
}: {
  hideNavigationActions?: boolean;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  sidebarLabel?: string;
}) {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const [adminError, setAdminError] = React.useState("");
  const [isStoppingImpersonation, setIsStoppingImpersonation] =
    React.useState(false);

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error) {
      console.error(
        "Sign out failed:",
        getAuthErrorMessage(error, "Sign out failed."),
      );
      return;
    }

    window.location.href = "/login";
  };

  const handleStopImpersonating = async () => {
    setIsStoppingImpersonation(true);
    setAdminError("");

    try {
      const { error } = await authClient.admin.stopImpersonating();
      if (error) {
        setAdminError(
          getAuthErrorMessage(error, "Could not restore the admin session."),
        );
        return;
      }

      window.location.href = "/admin";
    } catch (error) {
      setAdminError(
        getAuthErrorMessage(error, "Could not restore the admin session."),
      );
    } finally {
      setIsStoppingImpersonation(false);
    }
  };

  const canAccessAdmin = isPlatformAdmin(session?.user?.role);
  const impersonating = isImpersonating(session);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {onToggleSidebar ? (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                aria-label={`${isSidebarOpen ? "Close" : "Open"} ${sidebarLabel}`}
                aria-pressed={isSidebarOpen}
              >
                <Menu className="size-4 lg:hidden" aria-hidden="true" />
                {isSidebarOpen ? (
                  <PanelLeftClose className="hidden size-4 lg:block" aria-hidden="true" />
                ) : (
                  <PanelLeftOpen className="hidden size-4 lg:block" aria-hidden="true" />
                )}
              </button>
            ) : null}
            <Link href="/org" className="flex items-center gap-2.5">
              <Lock className="size-5 text-foreground" aria-hidden="true" />
              <span className="hidden text-sm font-semibold text-foreground sm:inline">
                Auth UI
              </span>
            </Link>
            <span className="hidden text-border/60 sm:inline">/</span>
            <OrgSwitcher />
            <TeamSwitcher />
          </div>

          {!hideNavigationActions ? (
            <div className="flex items-center gap-2 sm:gap-3">
            {canAccessAdmin && (
              <Link
                href="/admin"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
                aria-label="Platform Admin"
              >
                <Shield className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Platform Admin</span>
              </Link>
            )}

            {impersonating && (
              <button
                type="button"
                onClick={handleStopImpersonating}
                disabled={isStoppingImpersonation}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={
                  isStoppingImpersonation
                    ? "Restoring admin session"
                    : "Stop impersonating"
                }
              >
                <Undo2 className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">
                  {isStoppingImpersonation
                    ? "Restoring admin"
                    : "Stop impersonating"}
                </span>
              </button>
            )}

            <Link
              href="/settings/profile"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                pathname.startsWith("/settings")
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
              aria-label="Settings"
            >
              <Settings className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Settings</span>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </button>

            <ThemeToggle />
          </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              {impersonating ? (
                <span className="hidden rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 sm:inline-flex">
                  Impersonating
                </span>
              ) : null}

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                aria-label="Sign out"
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </button>

              <ThemeToggle />
            </div>
          )}
        </div>
      </nav>

      {adminError ? (
        <div className="border-b border-border/40 bg-destructive/5">
          <div className="mx-auto max-w-7xl px-4 py-2 text-sm text-destructive sm:px-6">
            {adminError}
          </div>
        </div>
      ) : null}
    </>
  );
}
