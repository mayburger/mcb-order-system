import { Layout } from "@/components/layout";
import { useGetOpeningHours } from "@workspace/api-client-react";
import { Clock } from "lucide-react";

export default function OpeningHoursPage() {
  const { data: hours, isLoading } = useGetOpeningHours();

  const today = new Date().getDay();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-20 max-w-2xl">
        <div className="text-center mb-12">
          <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-5xl font-display font-bold uppercase tracking-tight text-white">Opening Hours</h1>
          <p className="text-muted-foreground mt-3">Come hungry, leave satisfied.</p>
        </div>

        <div className="bg-card border border-border overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-border">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex justify-between px-6 py-4 animate-pulse">
                  <div className="h-4 bg-secondary rounded w-24" />
                  <div className="h-4 bg-secondary rounded w-32" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {hours?.map((day) => {
                const isToday = day.dayOfWeek === today;
                return (
                  <div key={day.id}
                    className={`flex items-center justify-between px-6 py-4 transition-colors ${isToday ? "bg-primary/10" : "hover:bg-secondary/30"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold uppercase tracking-wide ${isToday ? "text-primary" : "text-white"}`}>
                        {day.dayName}
                      </span>
                      {isToday && (
                        <span className="text-xs bg-primary text-white px-2 py-0.5 uppercase font-bold">Today</span>
                      )}
                    </div>
                    <span className={`font-medium ${day.isClosed ? "text-destructive" : "text-muted-foreground"}`}>
                      {day.isClosed ? "Closed" : `${day.openTime} – ${day.closeTime}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
