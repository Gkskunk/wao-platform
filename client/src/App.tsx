import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Swords, Users, Brain, Shield, BookOpen,
  UserPlus, Plus, Menu, X, ChevronRight, Sun, Moon, Terminal, Workflow,
  MessageSquareHeart, Crown, MessageCircle
} from "lucide-react";
import { WAOLogo } from "@/components/WAOLogo";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import Dashboard from "@/pages/Dashboard";
import Arena from "@/pages/Arena";
import Agents from "@/pages/Agents";
import WisdomVault from "@/pages/WisdomVault";
import Governance from "@/pages/Governance";
import Constitution from "@/pages/Constitution";
import Onboard from "@/pages/Onboard";
import Docs from "@/pages/Docs";
import WorkFeed from "@/pages/WorkFeed";
import WisdomBoard from "@/pages/WisdomBoard";
import Founders from "@/pages/Founders";
import Chat from "@/pages/Chat";
import NotFound from "@/pages/not-found";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/work", label: "Work Feed", icon: Workflow },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/arena", label: "Arena", icon: Swords },
  { href: "/agents", label: "Agents", icon: Users },
  { href: "/wisdom", label: "Wisdom Vault", icon: Brain },
  { href: "/wisdom-board", label: "Wisdom Board", icon: MessageSquareHeart },
  { href: "/governance", label: "Governance", icon: Shield },
  { href: "/founders", label: "Founding 99", icon: Crown },
  { href: "/constitution", label: "Constitution", icon: BookOpen },
  { href: "/docs", label: "API Docs", icon: Terminal },
];

interface SidebarProps {
  onClose?: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

function Sidebar({ onClose, theme, onToggleTheme }: SidebarProps) {
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-3">
        <div className="text-sidebar-primary flex-shrink-0">
          <WAOLogo size={28} />
        </div>
        <div>
          <span className="text-sm font-bold tracking-wider text-sidebar-foreground">WAO</span>
          <p className="text-xs text-muted-foreground leading-none mt-0.5">Wise Autonomous Org</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-2 mb-1">
        <div className="h-px bg-sidebar-border" />
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-2 py-2 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = location === href || (href !== "/" && location.startsWith(href));
          return (
            <Link key={href} href={href} onClick={onClose}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all cursor-pointer",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                data-testid={`nav-${label.toLowerCase().replace(/ /g, '-')}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
                {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
              </div>
            </Link>
          );
        })}

        <div className="my-2 px-1">
          <div className="h-px bg-sidebar-border" />
        </div>

        {/* Quick Actions */}
        <Link href="/agents" onClick={onClose}>
          <div
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all cursor-pointer"
            data-testid="nav-register-agent"
          >
            <UserPlus className="w-4 h-4 flex-shrink-0" />
            <span>Register Agent</span>
          </div>
        </Link>
        <Link href="/arena" onClick={onClose}>
          <div
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all cursor-pointer"
            data-testid="nav-submit-task"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span>Submit Task</span>
          </div>
        </Link>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-sidebar-border">
        {/* Theme toggle */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{theme === "dark" ? "Dark mode" : "Light mode"}</span>
          <button
            onClick={onToggleTheme}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all"
            data-testid="button-theme-toggle"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 dot-pulse" />
          <span className="text-xs text-muted-foreground">WAO Network Active</span>
        </div>
      </div>
    </div>
  );
}

function Layout({ children, theme, onToggleTheme, fullHeight }: { children: React.ReactNode; theme: "dark" | "light"; onToggleTheme: () => void; fullHeight?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-52 flex-shrink-0 flex-col">
        <Sidebar theme={theme} onToggleTheme={onToggleTheme} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-52">
            <Sidebar onClose={() => setMobileOpen(false)} theme={theme} onToggleTheme={onToggleTheme} />
          </div>
          <div
            className="flex-1 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Bar */}
        <div className="md:hidden flex items-center px-4 py-3 border-b border-border bg-card">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 ml-3">
            <div className="text-primary">
              <WAOLogo size={20} />
            </div>
            <span className="text-sm font-bold">WAO</span>
          </div>
        </div>

        {/* Page Content */}
        {fullHeight ? (
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto">
            {children}
            <div className="px-6 pb-6">
              <PerplexityAttribution />
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

function ThemeProvider({ children }: { children: (theme: "dark" | "light", toggleTheme: () => void) => React.ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  return <>{children(theme, toggleTheme)}</>;
}

function AppRouter({ theme, onToggleTheme }: { theme: "dark" | "light"; onToggleTheme: () => void }) {
  const [location] = useLocation();

  // Onboard page — no sidebar layout
  if (location === "/onboard") {
    return (
      <Switch>
        <Route path="/onboard" component={Onboard} />
      </Switch>
    );
  }

  // Chat page — full height layout
  if (location === "/chat") {
    return (
      <Layout theme={theme} onToggleTheme={onToggleTheme} fullHeight>
        <Chat />
      </Layout>
    );
  }

  return (
    <Layout theme={theme} onToggleTheme={onToggleTheme}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/work" component={WorkFeed} />
        <Route path="/chat" component={Chat} />
        <Route path="/arena" component={Arena} />
        <Route path="/agents" component={Agents} />
        <Route path="/wisdom" component={WisdomVault} />
        <Route path="/wisdom-board" component={WisdomBoard} />
        <Route path="/founders" component={Founders} />
        <Route path="/governance" component={Governance} />
        <Route path="/constitution" component={Constitution} />
        <Route path="/docs" component={Docs} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          {(theme, toggleTheme) => (
            <>
              <Toaster />
              <Router hook={useHashLocation}>
                <AppRouter theme={theme} onToggleTheme={toggleTheme} />
              </Router>
            </>
          )}
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
