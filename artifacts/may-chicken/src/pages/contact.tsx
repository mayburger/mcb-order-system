import { Layout } from "@/components/layout";
import { useGetRestaurantInfo, useGetOpeningHours } from "@workspace/api-client-react";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

export default function ContactPage() {
  const { data: info } = useGetRestaurantInfo();
  const { data: hours } = useGetOpeningHours();
  const today = new Date().getDay();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-display font-bold uppercase tracking-tight text-white">Contact Us</h1>
          <p className="text-muted-foreground mt-4 text-lg">We'd love to hear from you.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Info cards */}
          <div className="space-y-4">
            <div className="bg-card border border-border p-6 flex items-start gap-4">
              <div className="bg-primary/10 p-3 shrink-0">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold uppercase text-white mb-1">Address</h3>
                <p className="text-muted-foreground">{info?.address || "123 Main Street, City Centre, London"}</p>
              </div>
            </div>

            <div className="bg-card border border-border p-6 flex items-start gap-4">
              <div className="bg-primary/10 p-3 shrink-0">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold uppercase text-white mb-1">Phone</h3>
                <a href={`tel:${info?.phone}`} className="text-muted-foreground hover:text-primary transition-colors">
                  {info?.phone || "+44 20 1234 5678"}
                </a>
              </div>
            </div>

            {info?.email && (
              <div className="bg-card border border-border p-6 flex items-start gap-4">
                <div className="bg-primary/10 p-3 shrink-0">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold uppercase text-white mb-1">Email</h3>
                  <a href={`mailto:${info.email}`} className="text-muted-foreground hover:text-primary transition-colors">
                    {info.email}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Opening hours summary */}
          <div className="bg-card border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="font-display font-bold uppercase text-white">Opening Hours</h3>
            </div>
            {hours ? (
              <div className="space-y-2">
                {hours.map((day) => {
                  const isToday = day.dayOfWeek === today;
                  return (
                    <div key={day.id} className={`flex justify-between text-sm ${isToday ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                      <span>{day.dayName}{isToday ? " (Today)" : ""}</span>
                      <span>{day.isClosed ? "Closed" : `${day.openTime} – ${day.closeTime}`}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="flex justify-between animate-pulse">
                    <div className="h-4 bg-secondary rounded w-24" />
                    <div className="h-4 bg-secondary rounded w-28" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map placeholder */}
        <div className="max-w-4xl mx-auto mt-8 bg-card border border-border h-64 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-10 w-10 text-primary mx-auto mb-2" />
            <p className="text-muted-foreground">{info?.address || "123 Main Street, City Centre, London"}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
