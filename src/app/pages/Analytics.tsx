import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { format, subDays } from "date-fns";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, Mail, List, Send, TrendingUp, TrendingDown,
  MousePointer, UserMinus, AlertTriangle,
} from "lucide-react";

interface AnalyticsData {
  totalSubscribers: number;
  activeSubscribers: number;
  totalLists: number;
  totalCampaigns: number;
  emailsSent: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubRate: number;
  recentCampaigns: Array<{ name: string; sent_count: number; open_count: number; click_count: number; bounce_count: number }>;
  subscribersByDay: Array<{ date: string; count: number; cumulative: number }>;
  byCountry: Array<{ country: string; count: number }>;
  byVertical: Array<{ vertical: string; count: number }>;
  byStatus: Array<{ name: string; value: number; color: string }>;
}

const COUNTRY_COLORS = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const VERTICAL_COLORS = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

const StatCard = ({
  label, value, sub, icon: Icon, color, trend, trendUp,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; bg: string;
  trend?: string; trendUp?: boolean;
}) => (
  <div className="bg-card rounded-xl border border-border p-5">
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trendUp ? "text-green-600" : "text-red-500"}`}>
          {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend}
        </div>
      )}
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
  </div>
);

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [subRes, listRes, campRes] = await Promise.all([
        supabase.from("subscribers").select("id, status, country, vertical, created_at"),
        supabase.from("lists").select("id"),
        supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
      ]);

      const subscribers = subRes.data || [];
      const lists = listRes.data || [];
      const campaigns = campRes.data || [];

      const totalSent = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0);
      const totalOpen = campaigns.reduce((s, c) => s + (c.open_count || 0), 0);
      const totalClick = campaigns.reduce((s, c) => s + (c.click_count || 0), 0);
      const totalBounce = campaigns.reduce((s, c) => s + (c.bounce_count || 0), 0);
      const totalUnsub = subscribers.filter(s => s.status === "unsubscribed").length;

      // 30-day subscriber chart
      const days = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        const dateStr = format(date, "yyyy-MM-dd");
        const dayCount = subscribers.filter(s => s.created_at?.startsWith(dateStr)).length;
        return { date: format(date, "MMM d"), count: dayCount };
      });
      // Add cumulative
      let cumulative = 0;
      const subscribersByDay = days.map(d => {
        cumulative += d.count;
        return { ...d, cumulative };
      });

      // By country
      const countryMap: Record<string, number> = {};
      subscribers.forEach(s => {
        const c = s.country || "Unknown";
        countryMap[c] = (countryMap[c] || 0) + 1;
      });
      const byCountry = Object.entries(countryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([country, count]) => ({ country, count }));

      // By vertical
      const verticalMap: Record<string, number> = {};
      subscribers.forEach(s => {
        const v = s.vertical || "Unknown";
        verticalMap[v] = (verticalMap[v] || 0) + 1;
      });
      const byVertical = Object.entries(verticalMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([vertical, count]) => ({ vertical, count }));

      const byStatus = [
        { name: "Active", value: subscribers.filter(s => s.status === "active").length, color: "#10b981" },
        { name: "Unsubscribed", value: subscribers.filter(s => s.status === "unsubscribed").length, color: "#6b7280" },
        { name: "Bounced", value: subscribers.filter(s => s.status === "bounced").length, color: "#ef4444" },
      ];

      setData({
        totalSubscribers: subscribers.length,
        activeSubscribers: subscribers.filter(s => s.status === "active").length,
        totalLists: lists.length,
        totalCampaigns: campaigns.length,
        emailsSent: totalSent,
        openRate: totalSent ? Math.round((totalOpen / totalSent) * 100) : 0,
        clickRate: totalSent ? Math.round((totalClick / totalSent) * 100) : 0,
        bounceRate: totalSent ? Math.round((totalBounce / totalSent) * 100) : 0,
        unsubRate: subscribers.length ? Math.round((totalUnsub / subscribers.length) * 100) : 0,
        recentCampaigns: campaigns.slice(0, 5),
        subscribersByDay,
        byCountry,
        byVertical,
        byStatus,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-card rounded-xl border border-border animate-pulse" />)}
        </div>
      </div>
    );
  }

  const topStatCards = [
    { label: "Total Subscribers", value: data.totalSubscribers.toLocaleString(), icon: Users, color: "bg-indigo-500", bg: "bg-indigo-50", trend: "+12%", trendUp: true },
    { label: "Total Lists", value: data.totalLists.toLocaleString(), icon: List, color: "bg-blue-500", bg: "bg-blue-50" },
    { label: "Total Campaigns", value: data.totalCampaigns.toLocaleString(), icon: Mail, color: "bg-purple-500", bg: "bg-purple-50" },
    { label: "Emails Sent", value: data.emailsSent.toLocaleString(), icon: Send, color: "bg-green-500", bg: "bg-green-50" },
    { label: "Open Rate", value: `${data.openRate}%`, icon: TrendingUp, color: "bg-cyan-500", bg: "bg-cyan-50", trend: data.openRate > 20 ? "Good" : "Low", trendUp: data.openRate > 20 },
    { label: "Click Rate", value: `${data.clickRate}%`, icon: MousePointer, color: "bg-amber-500", bg: "bg-amber-50" },
    { label: "Bounce Rate", value: `${data.bounceRate}%`, icon: AlertTriangle, color: "bg-orange-500", bg: "bg-orange-50", trend: data.bounceRate > 5 ? "High" : "Good", trendUp: data.bounceRate <= 5 },
    { label: "Unsub Rate", value: `${data.unsubRate}%`, icon: UserMinus, color: "bg-red-500", bg: "bg-red-50", trend: data.unsubRate < 1 ? "Good" : "Monitor", trendUp: data.unsubRate < 1 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Last 30 days performance overview</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {topStatCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Subscriber growth */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-0.5">Subscriber Growth</h3>
        <p className="text-xs text-muted-foreground mb-4">New subscribers per day — last 30 days</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data.subscribersByDay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f7" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} interval={5} />
            <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
            <Area type="monotone" dataKey="count" name="New" stroke="#4f46e5" strokeWidth={2} fill="url(#grad1)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Campaign performance */}
      {data.recentCampaigns.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-0.5">Campaign Performance</h3>
          <p className="text-xs text-muted-foreground mb-4">Sent, opens, clicks by campaign</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.recentCampaigns} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f7" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="sent_count" name="Sent" fill="#4f46e5" radius={[3, 3, 0, 0]} />
              <Bar dataKey="open_count" name="Opens" fill="#06b6d4" radius={[3, 3, 0, 0]} />
              <Bar dataKey="click_count" name="Clicks" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Country & Vertical charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Countries */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-0.5">Top Countries</h3>
          <p className="text-xs text-muted-foreground mb-4">Subscribers by country</p>
          {data.byCountry.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data</p>
          ) : (
            <div className="space-y-2.5">
              {data.byCountry.map(({ country, count }, i) => {
                const max = data.byCountry[0].count;
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={country}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground font-medium">{country || "Unknown"}</span>
                      <span className="text-muted-foreground">{count.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: COUNTRY_COLORS[i % COUNTRY_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Verticals */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-0.5">Top Verticals</h3>
          <p className="text-xs text-muted-foreground mb-4">Subscribers by vertical</p>
          {data.byVertical.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data</p>
          ) : (
            <div className="space-y-2.5">
              {data.byVertical.map(({ vertical, count }, i) => {
                const max = data.byVertical[0].count;
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={vertical}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground font-medium">{vertical || "Unknown"}</span>
                      <span className="text-muted-foreground">{count.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: VERTICAL_COLORS[i % VERTICAL_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Subscriber status pie */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-0.5">Subscriber Status</h3>
        <p className="text-xs text-muted-foreground mb-4">Distribution of subscriber statuses</p>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ResponsiveContainer width={200} height={180}>
            <PieChart>
              <Pie
                data={data.byStatus}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {data.byStatus.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3 flex-1">
            {data.byStatus.map(({ name, value, color }) => {
              const pct = data.totalSubscribers ? Math.round((value / data.totalSubscribers) * 100) : 0;
              return (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm text-foreground">{name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-foreground">{value.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground ml-1">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
