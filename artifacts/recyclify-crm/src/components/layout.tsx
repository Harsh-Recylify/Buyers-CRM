import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useListNotifications, getListNotificationsQueryKey, useGlobalSearch, getGlobalSearchQueryKey } from "@workspace/api-client-react";
import logo from "@assets/images_1782449948308.png";
import {
  LayoutDashboard,
  Building2,
  KanbanSquare,
  Users,
  Gavel,
  CheckSquare,
  CalendarDays,
  Activity,
  BarChart3,
  Bell,
  ShieldAlert,
  Settings,
  User as UserIcon,
  Search,
  LogOut,
  Menu,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Companies", href: "/companies", icon: Building2 },
  { name: "Pipeline", href: "/pipeline", icon: KanbanSquare },
  { name: "Bids", href: "/bids", icon: Gavel },
  { name: "Buyers", href: "/buyers", icon: Users },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Calendar", href: "/calendar", icon: CalendarDays },
  { name: "Activities", href: "/activities", icon: Activity },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Notifications", href: "/notifications", icon: Bell },
];

const SEARCH_RESULT_ROUTE: Record<string, (id: number) => string> = {
  company: (id) => `/companies/${id}`,
  buyer: (id) => `/buyers/${id}`,
  bid: (id) => `/bids/${id}`,
  task: () => `/tasks`,
  user: () => `/admin`,
};

const SEARCH_RESULT_LABEL: Record<string, string> = {
  company: "Company",
  buyer: "Buyer",
  bid: "Bid",
  task: "Task",
  user: "Team member",
};

const adminItems = [
  { name: "Admin Panel", href: "/admin", icon: ShieldAlert },
];

const bottomItems = [
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Profile", href: "/profile", icon: UserIcon },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const notifParams = { unreadOnly: "true" } as any;
  const { data: notifications } = useListNotifications(
    notifParams,
    { query: { enabled: !!user, refetchInterval: 60000, queryKey: getListNotificationsQueryKey(notifParams) } }
  );

  const unreadCount = notifications?.unreadCount || 0;
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  return (
    <>
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onNavigate}>
          <img src={logo} alt="Recyclify" className="h-8" />
          <span className="font-bold tracking-tight text-sidebar-foreground">Bidder Market</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid items-start px-2 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                location === item.href || location.startsWith(item.href + "/")
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
              {item.name === "Notifications" && unreadCount > 0 && (
                <Badge variant="destructive" className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full p-0">
                  {unreadCount}
                </Badge>
              )}
            </Link>
          ))}

          {isAdmin && (
            <>
              <div className="mt-4 mb-2 px-4 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Administration
              </div>
              {adminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                    location.startsWith(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              ))}
            </>
          )}
        </nav>
      </div>

      <div className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 px-2 hover:bg-sidebar-accent">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={user?.avatar || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col items-start overflow-hidden">
                <span className="truncate text-sm font-medium leading-none">{user?.name}</span>
                <span className="truncate text-xs text-muted-foreground mt-1">{user?.role?.replace('_', ' ')}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {bottomItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href} onClick={onNavigate} className="flex w-full cursor-pointer items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

function GlobalSearch() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchParams = { q: debouncedQuery };
  const { data, isFetching } = useGlobalSearch(searchParams, {
    query: {
      enabled: debouncedQuery.length >= 2,
      queryKey: getGlobalSearchQueryKey(searchParams),
    },
  });

  const goToResult = (type: string, id: number) => {
    const toRoute = SEARCH_RESULT_ROUTE[type];
    setOpen(false);
    setQuery("");
    if (toRoute) setLocation(toRoute(id));
  };

  const showDropdown = open && debouncedQuery.length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search companies, buyers, bids..."
          className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-full"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-auto rounded-lg border bg-white shadow-lg md:w-2/3 lg:w-full">
          {isFetching ? (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : !data?.results.length ? (
            <div className="p-4 text-sm text-muted-foreground">No results for "{debouncedQuery}"</div>
          ) : (
            <ul className="py-1">
              {data.results.map((result) => (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => goToResult(result.type, result.id)}
                  >
                    <span className="font-medium text-gray-900">{result.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {SEARCH_RESULT_LABEL[result.type] ?? result.type}
                      {result.subtitle ? ` · ${result.subtitle}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const notifParams = { unreadOnly: "true" } as any;
  const { data: notifications } = useListNotifications(
    notifParams,
    { query: { enabled: !!user, refetchInterval: 60000, queryKey: getListNotificationsQueryKey(notifParams) } }
  );
  const unreadCount = notifications?.unreadCount || 0;

  return (
    <div className="flex h-screen w-full bg-gray-50/50">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 flex-col border-r bg-sidebar md:flex">
        <SidebarNav />
      </aside>

      {/* Sidebar (mobile drawer) */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="flex w-64 flex-col bg-sidebar p-0">
          <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b bg-white px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileNavOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          <div className="w-full flex-1">
            <GlobalSearch />
          </div>

          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/notifications">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
              )}
            </Link>
          </Button>
        </header>
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
