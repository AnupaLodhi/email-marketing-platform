import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { supabase } from "../../lib/supabase";
import { ArrowLeft } from "lucide-react";

type Row = Record<string, any>;

const CONFIG: Record<
  string,
  {
    title: string;
    description: string;
  }
> = {
  subscribers: {
    title: "Subscriber Analytics",
    description: "Complete subscriber statistics and records",
  },
  lists: {
    title: "List Analytics",
    description: "Subscriber list statistics",
  },
  campaigns: {
    title: "Campaign Analytics",
    description: "Complete campaign performance overview",
  },
  sent: {
    title: "Email Delivery Analytics",
    description: "Recipient-level email sending records",
  },
  opens: {
    title: "Open Analytics",
    description: "Recipients who opened campaign emails",
  },
  clicks: {
    title: "Click Analytics",
    description: "Recipients who clicked tracked campaign links",
  },
  bounces: {
    title: "Bounce Analytics",
    description: "Failed and bounced email deliveries",
  },
  unsubscribes: {
    title: "Unsubscribe Analytics",
    description: "Subscribers who unsubscribed from emails",
  },
};

export default function AnalyticsDetails() {
  const { type } = useParams();
  const navigate = useNavigate();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const config = CONFIG[type || ""] || {
    title: "Analytics Details",
    description: "Detailed analytics records",
  };

  useEffect(() => {
    fetchData();
  }, [type]);

  const fetchData = async () => {
    setLoading(true);

    try {
      let result;

      switch (type) {
        case "subscribers":
          result = await supabase
            .from("subscribers")
            .select("*")
            .order("created_at", { ascending: false });
          break;

        case "lists":
          result = await supabase
            .from("lists")
            .select("*")
            .order("created_at", { ascending: false });
          break;

        case "campaigns":
          result = await supabase
            .from("campaigns")
            .select("*")
            .order("created_at", { ascending: false });
          break;

        case "sent":
          result = await supabase
            .from("campaign_email_logs")
            .select("*")
            .order("sent_at", { ascending: false });
          break;

                case "opens":
          result = await supabase
            .from("campaign_open_logs")
            .select("*")
            .order("opened_at", { ascending: false });
          break;

        case "clicks":
          result = await supabase
            .from("campaign_click_logs")
            .select("*")
            .order("clicked_at", { ascending: false });
          break;

        case "bounces":
          result = await supabase
            .from("campaign_email_logs")
            .select("*")
            .eq("status", "failed")
            .order("created_at", { ascending: false });
          break;
        case "unsubscribes":
          result = await supabase
            .from("subscribers")
            .select("*")
            .eq("status", "unsubscribed")
            .order("created_at", { ascending: false });
          break;

        default:
          result = { data: [], error: null };
      }

      if (result.error) {
        console.error("Analytics error:", result.error);
        setRows([]);
      } else {
        setRows(result.data || []);
      }
    } catch (error) {
      console.error(error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const visibleColumns =
    rows.length > 0
      ? Object.keys(rows[0]).filter(
          (key) =>
            ![
              "template_html",
              "preview_text",
            ].includes(key)
        )
      : [];

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "—";

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    if (
      typeof value === "string" &&
      value.includes("T") &&
      !isNaN(Date.parse(value))
    ) {
      return new Date(value).toLocaleString();
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <button
          onClick={() => navigate("/analytics")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-orange-500 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Analytics
        </button>

        <h1 className="text-2xl font-bold text-foreground">
          {config.title}
        </h1>

        <p className="text-sm text-muted-foreground mt-1">
          {config.description}
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <p className="text-xs text-muted-foreground">
          Total Records
        </p>

        <p className="text-3xl font-bold text-orange-500 mt-1">
          {rows.length}
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold">Detailed Records</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {rows.length} records found
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-muted-foreground">
            Loading analytics...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            No records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {visibleColumns.map((column) => (
                    <th
                      key={column}
                      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {column
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {rows.map((row, index) => (
                  <tr
                    key={row.id || index}
                    className="hover:bg-muted/30"
                  >
                    {visibleColumns.map((column) => (
                      <td
                        key={column}
                        className="px-4 py-3 whitespace-nowrap"
                      >
                        {formatValue(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}