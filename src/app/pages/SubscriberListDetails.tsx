import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Users, UserCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";

export default function SubscriberListDetails() {
  const { type } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscribers();
  }, [type]);

  const fetchSubscribers = async () => {
    setLoading(true);

    let query = supabase
      .from("subscribers")
      .select("*")
      .order("created_at", { ascending: false });

    if (type === "active") {
      query = query.eq("status", "active");
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      setRows([]);
    } else {
      setRows(data || []);
    }

    setLoading(false);
  };

  const title =
    type === "active" ? "Active Subscribers" : "All Subscribers";

  return (
    <div className="p-6 space-y-6">
      <div>
        <button
          onClick={() => navigate("/subscribers")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-orange-500 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Subscribers
        </button>

        <h1 className="text-2xl font-bold">{title}</h1>

        <p className="text-sm text-muted-foreground mt-1">
          Complete subscriber records
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <div
          className={`p-2 rounded-lg ${
            type === "active" ? "bg-green-50" : "bg-indigo-50"
          }`}
        >
          {type === "active" ? (
            <UserCheck className="w-5 h-5 text-green-600" />
          ) : (
            <Users className="w-5 h-5 text-indigo-600" />
          )}
        </div>

        <div>
          <p className="text-xs uppercase text-muted-foreground">
            Total Records
          </p>
          <p className="text-xl font-bold">{rows.length}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Country</th>
                <th className="text-left px-4 py-3">Vertical</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No subscribers found.
                  </td>
                </tr>
              ) : (
                rows.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => navigate(`/subscribers/${sub.id}`)}
                    className="hover:bg-muted/30 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium">
                      {sub.name || "—"}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {sub.email}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {sub.country || "—"}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {sub.vertical || "—"}
                    </td>

                    <td className="px-4 py-3 capitalize">
                      {sub.status}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {sub.created_at
                        ? format(new Date(sub.created_at), "MMM d, yyyy")
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}