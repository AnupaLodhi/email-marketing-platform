import { useEffect, useState, useCallback } from "react";
import { supabase, type List, type Subscriber } from "../../lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus, Edit2, Trash2, Users, X, Check, Search,
  ChevronRight, UserPlus, UserMinus, List as ListIcon,
} from "lucide-react";

interface ListWithCount extends List {
  subscriber_count: number;
}

interface FormState { name: string; description: string }
const EMPTY_FORM: FormState = { name: "", description: "" };

export default function Lists() {
  const [lists, setLists] = useState<ListWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Subscribers panel
  const [activeList, setActiveList] = useState<ListWithCount | null>(null);
  const [listSubscribers, setListSubscribers] = useState<Subscriber[]>([]);
  const [allSubscribers, setAllSubscribers] = useState<Subscriber[]>([]);
  const [subSearch, setSubSearch] = useState("");
  const [addSearch, setAddSearch] = useState("");
  const [panelTab, setPanelTab] = useState<"members" | "add">("members");
  const [loadingSubs, setLoadingSubs] = useState(false);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    try {
      const { data: listsData, error } = await supabase
        .from("lists")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Get subscriber counts
      const counts = await Promise.all(
        (listsData || []).map(async (list) => {
          const { count } = await supabase
            .from("subscriber_lists")
            .select("*", { count: "exact", head: true })
            .eq("list_id", list.id);
          return { ...list, subscriber_count: count || 0 };
        })
      );
      setLists(counts);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  const fetchListSubscribers = async (listId: string) => {
    setLoadingSubs(true);
    const { data, error } = await supabase
      .from("subscriber_lists")
      .select("subscriber_id, subscribers(*)")
      .eq("list_id", listId);
    if (!error) {
      setListSubscribers((data || []).map((r: any) => r.subscribers));
    }

    const { data: all } = await supabase
      .from("subscribers")
      .select("*")
      .eq("status", "active")
      .order("name");
    setAllSubscribers(all || []);
    setLoadingSubs(false);
  };

  const openList = async (list: ListWithCount) => {
    setActiveList(list);
    setPanelTab("members");
    setSubSearch("");
    setAddSearch("");
    await fetchListSubscribers(list.id);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      if (editId) {
        const { error } = await supabase.from("lists").update(form).eq("id", editId);
        if (error) throw error;
        toast.success("List updated");
      } else {
        const { error } = await supabase.from("lists").insert([form]);
        if (error) throw error;
        toast.success("List created");
      }
      setShowForm(false);
      fetchLists();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("subscriber_lists").delete().eq("list_id", id);
    const { error } = await supabase.from("lists").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("List deleted");
    setDeleteId(null);
    fetchLists();
  };

  const addSubscriberToList = async (subscriberId: string) => {
    if (!activeList) return;
    const { error } = await supabase
      .from("subscriber_lists")
      .insert([{ list_id: activeList.id, subscriber_id: subscriberId }]);
    if (error && error.code !== "23505") return toast.error(error.message);
    toast.success("Subscriber added");
    await fetchListSubscribers(activeList.id);
    fetchLists();
  };

  const removeSubscriberFromList = async (subscriberId: string) => {
    if (!activeList) return;
    const { error } = await supabase
      .from("subscriber_lists")
      .delete()
      .eq("list_id", activeList.id)
      .eq("subscriber_id", subscriberId);
    if (error) return toast.error(error.message);
    toast.success("Subscriber removed");
    await fetchListSubscribers(activeList.id);
    fetchLists();
  };

  const memberIds = new Set(listSubscribers.map((s) => s.id));

  const filteredMembers = listSubscribers.filter(
    (s) =>
      s.name.toLowerCase().includes(subSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(subSearch.toLowerCase())
  );

  const nonMembers = allSubscribers.filter(
    (s) =>
      !memberIds.has(s.id) &&
      (s.name.toLowerCase().includes(addSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(addSearch.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lists</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Organize subscribers into lists</p>
        </div>
        <button
          onClick={() => { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create List
        </button>
      </div>

      {/* Lists Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-card rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <ListIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">No lists yet. Create your first list.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <div
              key={list.id}
              className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => openList(list)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <ListIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditId(list.id);
                      setForm({ name: list.name, description: list.description || "" });
                      setShowForm(true);
                    }}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteId(list.id); }}
                    className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-foreground mb-0.5">{list.name}</h3>
              {list.description && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{list.description}</p>
              )}

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{list.subscriber_count.toLocaleString()} subscribers</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subscriber Panel */}
      {activeList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div>
                <h3 className="font-semibold text-foreground">{activeList.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{activeList.subscriber_count} subscribers</p>
              </div>
              <button onClick={() => setActiveList(null)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border px-6 flex-shrink-0">
              {(["members", "add"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPanelTab(tab)}
                  className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                    panelTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "members" ? "Members" : "Add Subscribers"}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="px-6 py-3 border-b border-border flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={panelTab === "members" ? subSearch : addSearch}
                  onChange={(e) =>
                    panelTab === "members" ? setSubSearch(e.target.value) : setAddSearch(e.target.value)
                  }
                  className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loadingSubs ? (
                <div className="p-4 space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : panelTab === "members" ? (
                filteredMembers.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No members</div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredMembers.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30">
                        <div>
                          <p className="text-sm font-medium text-foreground">{sub.name}</p>
                          <p className="text-xs text-muted-foreground">{sub.email}</p>
                        </div>
                        <button
                          onClick={() => removeSubscriberFromList(sub.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <UserMinus className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                nonMembers.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No subscribers to add</div>
                ) : (
                  <div className="divide-y divide-border">
                    {nonMembers.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30">
                        <div>
                          <p className="text-sm font-medium text-foreground">{sub.name}</p>
                          <p className="text-xs text-muted-foreground">{sub.email}</p>
                        </div>
                        <button
                          onClick={() => addSubscriberToList(sub.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-primary hover:bg-primary/10 transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Add
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">{editId ? "Edit List" : "Create List"}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">List Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Newsletter Subscribers"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
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
            <h3 className="font-semibold text-foreground mb-1">Delete List?</h3>
            <p className="text-sm text-muted-foreground mb-5">All subscriber associations will be removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
