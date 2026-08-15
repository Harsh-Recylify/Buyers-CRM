import React from "react";
import { useListTasks, getListTasksQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays, CheckSquare } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const { data, isLoading } = useListTasks({ limit: "100" } as any, { query: { queryKey: getListTasksQueryKey({ limit: "100" } as any) } });

  const tasks = data?.data ?? [];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const tasksByDate = new Map<string, typeof tasks>();
  tasks.forEach((t: any) => {
    if (t.dueDate) {
      const key = t.dueDate.slice(0, 10);
      if (!tasksByDate.has(key)) tasksByDate.set(key, []);
      tasksByDate.get(key)!.push(t);
    }
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const [selectedDay, setSelectedDay] = React.useState<number | null>(null);
  const selectedKey = selectedDay ? `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}` : null;
  const selectedTasks = selectedKey ? (tasksByDate.get(selectedKey) ?? []) : [];

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground mt-1">View tasks and follow-ups by due date.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold">
              {MONTHS[month]} {year}
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
            </div>
            {isLoading ? (
              <div className="grid grid-cols-7 gap-1">
                {Array(35).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, idx) => {
                  if (!day) return <div key={idx} />;
                  const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayTasks = tasksByDate.get(key) ?? [];
                  const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                  const isSelected = day === selectedDay;

                  return (
                    <div
                      key={idx}
                      className={`min-h-16 p-1.5 rounded-lg cursor-pointer border transition-all ${
                        isSelected ? "border-[#118847] bg-[#118847]/5" :
                        isToday ? "border-[#118847]/40 bg-[#118847]/5" :
                        "border-transparent hover:border-gray-200 hover:bg-gray-50/50"
                      }`}
                      onClick={() => setSelectedDay(day)}
                    >
                      <div className={`text-sm font-medium mb-1 h-6 w-6 flex items-center justify-center rounded-full ${
                        isToday ? "bg-[#118847] text-white text-xs" : "text-gray-700"
                      }`}>
                        {day}
                      </div>
                      {dayTasks.slice(0, 2).map((t: any) => (
                        <div key={t.id} className={`text-xs px-1 py-0.5 rounded mb-0.5 truncate border ${PRIORITY_COLORS[t.priority] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                          {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="text-xs text-muted-foreground">+{dayTasks.length - 2} more</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {selectedDay
                  ? `${MONTHS[month]} ${selectedDay}, ${year}`
                  : "Select a day"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDay ? (
                <div className="py-8 text-center">
                  <CalendarDays className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click a date to see tasks</p>
                </div>
              ) : selectedTasks.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No tasks due this day</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedTasks.map((t: any) => (
                    <div key={t.id} className="p-3 rounded-lg border hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight">{t.title}</p>
                        <Badge variant="outline" className={`text-xs shrink-0 ${PRIORITY_COLORS[t.priority] ?? ""}`}>
                          {t.priority}
                        </Badge>
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs capitalize">{t.status.replace(/_/g, " ")}</Badge>
                        {t.assignedToName && <span className="text-xs text-muted-foreground">{t.assignedToName}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Upcoming tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />) :
                tasks.filter((t: any) => t.dueDate && t.status !== "done" && new Date(t.dueDate) >= today).slice(0, 5).map((t: any) => (
                  <div key={t.id} className="p-2.5 rounded-lg border text-sm">
                    <p className="font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Due {new Date(t.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                ))
              }
              {!isLoading && tasks.filter((t: any) => t.dueDate && t.status !== "done" && new Date(t.dueDate) >= today).length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No upcoming tasks</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
