import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Mail, List, User } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";

export default function SubscriberDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [subscriber, setSubscriber] = useState<any>(null);
  const [lists, setLists] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      setLoading(true);

      const { data: subData } = await supabase
        .from("subscribers")
        .select("*")
        .eq("id", id)
        .single();

      const { data: listData } = await supabase
        .from("subscriber_lists")
        .select("lists(*)")
        .eq("subscriber_id", id);

      const { data: logData } = await supabase
        .from("campaign_email_logs")
        .select("*")
        .eq("subscriber_id", id)
        .order("created_at", { ascending: false });

      setSubscriber(subData);
      setLists((listData || []).map((x: any) => x.lists).filter(Boolean));
      setLogs(logData || []);
      setLoading(false);
    };

    fetchDetails();
  }, [id]);

  if (loading) return <div className="p-6">Loading subscriber details...</div>;
  if (!subscriber) return <div className="p-6">Subscriber not found.</div>;

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => navigate("/subscribers")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-orange-500"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Subscribers
      </button>

      <div>
        <h1 className="text-2xl font-bold">{subscriber.name || "Unnamed Subscriber"}</h1>
        <p className="text-sm text-muted-foreground">{subscriber.email}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <User className="w-5 h-5 text-orange-500 mb-2" />
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="text-xl font-bold capitalize">{subscriber.status}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <List className="w-5 h-5 text-orange-500 mb-2" />
          <p className="text-xs text-muted-foreground">Lists</p>
          <p className="text-xl font-bold">{lists.length}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <Mail className="w-5 h-5 text-orange-500 mb-2" />
          <p className="text-xs text-muted-foreground">Campaign Emails</p>
          <p className="text-xl font-bold">{logs.length}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold mb-4">Subscriber Information</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <p><b>Name:</b> {subscriber.name || "—"}</p>
          <p><b>Email:</b> {subscriber.email}</p>
          <p><b>Country:</b> {subscriber.country || "—"}</p>
          <p><b>Vertical:</b> {subscriber.vertical || "—"}</p>
          <p><b>Status:</b> {subscriber.status}</p>
          <p><b>Created:</b> {subscriber.created_at ? format(new Date(subscriber.created_at), "MMM d, yyyy h:mm a") : "—"}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold mb-3">Lists</h2>
        {lists.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not added to any list.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {lists.map((list) => (
              <span key={list.id} className="px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-sm">
                {list.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold">Campaign Email History</h2>
          <p className="text-sm text-muted-foreground">{logs.length} records</p>
        </div>
      </div>
    </div>
  );
}