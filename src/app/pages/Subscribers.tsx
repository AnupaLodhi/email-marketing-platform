import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { supabase, type Subscriber } from "../../lib/supabase";
import Papa from "papaparse";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Search, Plus, Upload, Download, Edit2, Trash2,
  ChevronLeft, ChevronRight, X, Check, Users, UserCheck,
  Filter, ArrowUpDown, RefreshCw,
} from "lucide-react";

type SortOption = "newest" | "oldest" | "name_az";
type Status = "active" | "unsubscribed" | "bounced";

const COUNTRIES = ["US", "UK", "CA", "AU", "DE", "FR", "IN", "BR", "SG", "AE", "Other"];
const VERTICALS = ["Finance", "Health", "Tech", "E-commerce", "Education", "Real Estate", "Travel", "Other"];
const PAGE_SIZE = 20;

const STATUS_STYLES: Record<Status, string> = {
  active: "bg-green-100 text-green-700",
  unsubscribed: "bg-gray-100 text-gray-600",
  bounced: "bg-red-100 text-red-700",
};

interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  progress: number;
  done: boolean;
}

interface FormState {
  name: string;
  email: string;
  country: string;
  vertical: string;
  status: Status;
}

const EMPTY_FORM: FormState = { name: "", email: "", country: "", vertical: "", status: "active" };

export default function Subscribers() {
  const navigate = useNavigate();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterVertical, setFilterVertical] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("subscribers").select("*", { count: "exact" });

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      if (filterCountry) query = query.eq("country", filterCountry);
      if (filterVertical) query = query.eq("vertical", filterVertical);
      if (filterStatus) query = query.eq("status", filterStatus);

      if (sort === "newest") query = query.order("created_at", { ascending: false });
      else if (sort === "oldest") query = query.order("created_at", { ascending: true });
      else query = query.order("name", { ascending: true });

      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, count, error } = await query;
      if (error) throw error;

      setSubscribers(data || []);
      setTotal(count || 0);

      // Active count (unfiltered)
      const { count: ac } = await supabase
        .from("subscribers")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      setActiveCount(ac || 0);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, filterCountry, filterVertical, filterStatus, sort, page]);

  useEffect(() => {
    setPage(1);
  }, [search, filterCountry, filterVertical, filterStatus, sort]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (sub: Subscriber) => {
    setEditId(sub.id);
setForm({
  name: sub.name || "",
  email: sub.email || "",
  country: sub.country || "",
  vertical: sub.vertical || "",
  status: (sub.status || "active") as Status,
});    setShowForm(true);
  };

 const handleSave = async () => {
  if (!form.name || !form.email) return toast.error("Name and email are required");
  setSaving(true);

  const DEFAULT_LIST_ID = "5ef97515-c8ef-47bc-90e9-9c6a9ddb8f85";

  const cleanForm = {
    ...form,
    email: form.email.trim().toLowerCase(),
    list_id: DEFAULT_LIST_ID,
  };

  try {
    let subscriberId = editId;

    if (editId) {
      const { error } = await supabase
        .from("subscribers")
        .update(cleanForm)
        .eq("id", editId);

      if (error) throw error;
      toast.success("Subscriber updated");
    } else {
      const { data: existing, error: findError } = await supabase
        .from("subscribers")
        .select("id")
        .eq("email", cleanForm.email)
        .maybeSingle();

      if (findError) throw findError;

      if (existing) {
        subscriberId = existing.id;

        const { error } = await supabase
          .from("subscribers")
          .update({ ...cleanForm, status: "active" })
          .eq("id", existing.id);

        if (error) throw error;
        toast.success("Subscriber reactivated");
      } else {
        const { data, error } = await supabase
          .from("subscribers")
          .insert([cleanForm])
          .select("id")
          .single();

        if (error) throw error;
        subscriberId = data.id;
        toast.success("Subscriber added");
      }
    }

    if (subscriberId) {
      const { error: linkError } = await supabase
        .from("subscriber_lists")
        .insert([{ list_id: DEFAULT_LIST_ID, subscriber_id: subscriberId }]);

      if (linkError && linkError.code !== "23505") throw linkError;
    }

    setShowForm(false);
    fetchSubscribers();
  } catch (err: any) {
    toast.error(err.message || "Something went wrong");
  } finally {
    setSaving(false);
  }
};
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("subscribers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Subscriber deleted");
    setDeleteId(null);
    fetchSubscribers();
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult({ imported: 0, skipped: 0, failed: 0, progress: 0, done: false });

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        let imported = 0, skipped = 0, failed = 0;
        const BATCH = 50;

        for (let i = 0; i < rows.length; i += BATCH) {
          const batch = rows.slice(i, i + BATCH);
          const validRows = batch
            .filter((row) => {
              const email = (row.email || row.Email || "").trim();
              return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            })
            .map((row) => ({
              name: (row.name || row.Name || "").trim(),
              email: (row.email || row.Email || "").trim().toLowerCase(),
              country: (row.country || row.Country || "").trim(),
              vertical: (row.vertical || row.Vertical || "").trim(),
              status: "active" as Status,
            }));

          const invalidCount = batch.length - validRows.length;
          failed += invalidCount;

          if (validRows.length > 0) {
            const { data, error } = await supabase
              .from("subscribers")
              .upsert(validRows, { onConflict: "email", ignoreDuplicates: true })
              .select();
            if (error) {
              failed += validRows.length;
            } else {
              const insertedCount = data?.length || 0;
              imported += insertedCount;
              skipped += validRows.length - insertedCount;
            }
          }

          setImportResult({
            imported,
            skipped,
            failed,
            progress: Math.round(((i + batch.length) / rows.length) * 100),
            done: i + BATCH >= rows.length,
          });
        }

        if (imported > 0) fetchSubscribers();
        if (csvRef.current) csvRef.current.value = "";
      },
    });
  };

  const handleExport = async () => {
    const { data, error } = await supabase
      .from("subscribers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);

    const csv = Papa.unparse(data || []);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported successfully");
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscribers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your email list</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchSubscribers}
            className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          <button
            onClick={() => csvRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Subscriber
          </button>
        </div>
      </div>

      {/* Stat cards */}
      {/* Stat cards */}
<div className="grid grid-cols-2 gap-4">
  <button
    onClick={() => navigate("/subscribers/all")}
    className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 text-left hover:border-orange-300 hover:shadow-sm transition-all"
  >
    <div className="p-2 bg-indigo-50 rounded-lg">
      <Users className="w-5 h-5 text-indigo-600" />
    </div>

    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
        Total
      </p>

      <p className="text-xl font-bold text-foreground">
        {total.toLocaleString()}
      </p>
    </div>
  </button>

  <button
    onClick={() => navigate("/subscribers/active")}
    className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 text-left hover:border-orange-300 hover:shadow-sm transition-all"
  >
    <div className="p-2 bg-green-50 rounded-lg">
      <UserCheck className="w-5 h-5 text-green-600" />
    </div>

    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
        Active
      </p>

      <p className="text-xl font-bold text-foreground">
        {activeCount.toLocaleString()}
      </p>
    </div>
  </button>
</div>
      {/* Import progress */}
      {importResult && (
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">
              {importResult.done ? "Import Complete" : "Importing..."}
            </p>
            {importResult.done && (
              <button onClick={() => setImportResult(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${importResult.progress}%` }}
            />
          </div>
          <div className="flex gap-4 text-xs">
            <span className="text-green-600 font-medium">✓ {importResult.imported} imported</span>
            <span className="text-yellow-600 font-medium">↷ {importResult.skipped} skipped</span>
            <span className="text-red-600 font-medium">✗ {importResult.failed} failed</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Countries</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={filterVertical}
            onChange={(e) => setFilterVertical(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Verticals</option>
            {VERTICALS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="bounced">Bounced</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name_az">Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Country</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vertical</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Created</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    No subscribers found
                  </td>
                </tr>
              ) : (
                subscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
<td className="px-4 py-3 font-medium">
  <button
    onClick={() => navigate(`/subscribers/${sub.id}`)}
    className="text-foreground hover:text-orange-500 hover:underline transition-colors text-left"
  >
    {sub.name}
  </button>
</td>                    <td className="px-4 py-3 text-muted-foreground">{sub.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{sub.country || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{sub.vertical || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[(sub.status || "active") as Status] || "bg-gray-100 text-gray-600"}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {format(new Date(sub.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(sub)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(sub.id)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md border border-border disabled:opacity-40 hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 py-1 text-xs font-medium text-foreground">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-md border border-border disabled:opacity-40 hover:bg-muted transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">{editId ? "Edit Subscriber" : "Add Subscriber"}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: "Name", field: "name", type: "text", placeholder: "John Doe" },
                { label: "Email", field: "email", type: "email", placeholder: "john@example.com" },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={form[field as keyof FormState]}
                    onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Country</label>
                  <select
                    value={form.country}
                    onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Select...</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Vertical</label>
                  <select
                    value={form.vertical}
                    onChange={(e) => setForm(f => ({ ...f, vertical: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Select...</option>
                    {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm(f => ({ ...f, status: e.target.value as Status }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="active">Active</option>
                  <option value="unsubscribed">Unsubscribed</option>
                  <option value="bounced">Bounced</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {saving ? "Saving..." : (<><Check className="w-3.5 h-3.5" /> Save</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Delete Subscriber?</h3>
            <p className="text-sm text-muted-foreground mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
