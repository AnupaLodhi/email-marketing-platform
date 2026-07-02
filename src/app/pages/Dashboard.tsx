import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Users, List, Mail, Send, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subDays } from "date-fns";

interface Stats {
  totalSubscribers: number;
  activeSubscribers: number;
  totalLists: number;
  totalCampaigns: number;
  campaignsByStatus: Record<string, number>;
  recentCampaigns: Array<{
    id: string;
    name: string;
    status: string;
    sent_count: number;
    created_at: string;
  }>;
}

const COLORS = {
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-100 text-blue-700",
  sending: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalSubscribers: 0,
    activeSubscribers: 0,
    totalLists: 0,
    totalCampaigns: 0,
    campaignsByStatus: {},
    recentCampaigns: [],
  });
  const [chartData, setChartData] = useState<Array<{ date: string; subscribers: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [subRes, listRes, campaignRes] = await Promise.all([
        supabase.from("subscribers").select("id, status, created_at"),
        supabase.from("lists").select("id"),
        supabase.from("campaigns").select("id, name, status, sent_count, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      const subscribers = subRes.data || [];
      const lists = listRes.data || [];
      const campaigns = campaignRes.data || [];

      const campaignsByStatus = campaigns.reduce((acc: Record<string, number>, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {});

      setStats({
        totalSubscribers: subscribers.length,
        activeSubscribers: subscribers.filter((s) => s.status === "active").length,
        totalLists: lists.length,
        totalCampaigns: campaigns.length,
        campaignsByStatus,
        recentCampaigns: campaigns,
      });

      // Build 30-day chart
      const days = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        const dateStr = format(date, "yyyy-MM-dd");
        const count = subscribers.filter(
          (s) => s.created_at && s.created_at.startsWith(dateStr)
        ).length;
        return { date: format(date, "MMM d"), subscribers: count };
      });
      setChartData(days);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: "Total Subscribers",
      value: stats.totalSubscribers.toLocaleString(),
      icon: Users,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      trend: "+12%",
    },
    {
      label: "Active Subscribers",
      value: stats.activeSubscribers.toLocaleString(),
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
      trend: "+8%",
    },
    {
      label: "Total Lists",
      value: stats.totalLists.toLocaleString(),
      icon: List,
      color: "text-blue-600",
      bg: "bg-blue-50",
      trend: "+3",
    },
    {
      label: "Total Campaigns",
      value: stats.totalCampaigns.toLocaleString(),
      icon: Mail,
      color: "text-purple-600",
      bg: "bg-purple-50",
      trend: "+2",
    },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-card rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-600 font-medium">{card.trend}</span>
                <span className="text-xs text-muted-foreground">this month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Subscriber Growth */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-1">Subscriber Growth</h3>
          <p className="text-xs text-muted-foreground mb-4">New subscribers — last 30 days</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f7" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} interval={6} />
              <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <Area
                type="monotone"
                dataKey="subscribers"
                stroke="#4f46e5"
                strokeWidth={2}
                fill="url(#subGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Campaign Status */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-1">Campaign Status</h3>
          <p className="text-xs text-muted-foreground mb-4">Breakdown by status</p>
          <div className="space-y-3">
            {Object.entries({
              draft: { label: "Draft", color: "bg-gray-400" },
              scheduled: { label: "Scheduled", color: "bg-blue-500" },
              sending: { label: "Sending", color: "bg-yellow-500" },
              completed: { label: "Completed", color: "bg-green-500" },
              failed: { label: "Failed", color: "bg-red-500" },
            }).map(([key, { label, color }]) => {
              const count = stats.campaignsByStatus[key] || 0;
              const total = stats.totalCampaigns || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{label}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Recent Campaigns</h3>
        </div>
        {stats.recentCampaigns.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No campaigns yet. Create your first campaign.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {stats.recentCampaigns.map((c) => (
              <div key={c.id} className="px-5 py-3.5 flex items-center gap-4">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Send className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(c.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {c.sent_count.toLocaleString()} sent
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                      COLORS[c.status as keyof typeof COLORS] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
