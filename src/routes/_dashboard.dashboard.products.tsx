import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboard } from '@/lib/dashboard-context';
import { supabase } from '@/integrations/supabase/client';
import { DashboardShell, DashboardEmptyState, formatCurrencyCents } from '@/components/dashboard/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package, Gift, DollarSign, Tag, Image as ImageIcon } from 'lucide-react';

export const Route = createFileRoute('/_dashboard/dashboard/products')({
  component: ProductsPage,
});

type ProductType = 'one_time' | 'bundle' | 'open_amount';

interface ProductRow {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  price_cents: number | null;
  product_type: ProductType;
  image_url: string | null;
  valid_from: string | null;
  valid_until: string | null;
  display_order: number;
  is_active: boolean;
  updated_at: string;
}

interface ItemRow {
  id: string;
  product_id: string;
  name: string;
  quantity: number;
  display_order: number;
}

interface FormItem {
  id?: string;
  name: string;
  quantity: number;
}

interface FormState {
  name: string;
  description: string;
  price_dollars: string;
  product_type: ProductType;
  image_url: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  items: FormItem[];
}

const emptyForm: FormState = {
  name: '',
  description: '',
  price_dollars: '',
  product_type: 'one_time',
  image_url: '',
  valid_from: '',
  valid_until: '',
  is_active: true,
  items: [],
};

const typeLabel: Record<ProductType, string> = {
  one_time: 'One-time',
  bundle: 'Bundle',
  open_amount: 'Open amount',
};

function ProductsPage() {
  const { activeClientId, activeClientName } = useDashboard();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const productsQuery = useQuery({
    queryKey: ['gift-card-products', activeClientId],
    enabled: !!activeClientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_products')
        .select('*')
        .eq('client_id', activeClientId!)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
  });

  const products = productsQuery.data ?? [];
  const productIds = useMemo(() => products.map((p) => p.id), [products]);

  const itemsQuery = useQuery({
    queryKey: ['gift-card-product-items', productIds.join(',')],
    enabled: productIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_product_items')
        .select('*')
        .in('product_id', productIds)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ItemRow[];
    },
  });

  const itemsByProduct = useMemo(() => {
    const map = new Map<string, ItemRow[]>();
    (itemsQuery.data ?? []).forEach((it) => {
      const arr = map.get(it.product_id) ?? [];
      arr.push(it);
      map.set(it.product_id, arr);
    });
    return map;
  }, [itemsQuery.data]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: ProductRow) => {
    setEditing(p);
    const items = (itemsByProduct.get(p.id) ?? []).map((it) => ({
      id: it.id,
      name: it.name,
      quantity: it.quantity,
    }));
    setForm({
      name: p.name,
      description: p.description ?? '',
      price_dollars: p.price_cents != null ? (p.price_cents / 100).toFixed(2) : '',
      product_type: p.product_type,
      image_url: p.image_url ?? '',
      valid_from: p.valid_from ?? '',
      valid_until: p.valid_until ?? '',
      is_active: p.is_active,
      items,
    });
    setOpen(true);
  };

  const saveProduct = useMutation({
    mutationFn: async () => {
      if (!activeClientId) throw new Error('No active client');
      if (!form.name.trim()) throw new Error('Name is required');

      const price_cents =
        form.product_type === 'open_amount'
          ? null
          : form.price_dollars
            ? Math.round(parseFloat(form.price_dollars) * 100)
            : null;

      const payload = {
        client_id: activeClientId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price_cents,
        product_type: form.product_type,
        image_url: form.image_url.trim() || null,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        is_active: form.is_active,
      };

      let productId = editing?.id;

      if (editing) {
        const { error } = await supabase
          .from('gift_card_products')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('gift_card_products')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        productId = data.id;
      }

      if (!productId) throw new Error('Missing product id');

      // Sync items only when bundle
      if (form.product_type === 'bundle') {
        const existing = itemsByProduct.get(productId) ?? [];
        const keepIds = new Set(form.items.filter((i) => i.id).map((i) => i.id!));
        const toDelete = existing.filter((it) => !keepIds.has(it.id)).map((it) => it.id);

        if (toDelete.length) {
          const { error } = await supabase
            .from('gift_card_product_items')
            .delete()
            .in('id', toDelete);
          if (error) throw error;
        }

        for (let idx = 0; idx < form.items.length; idx++) {
          const it = form.items[idx];
          if (!it.name.trim()) continue;
          if (it.id) {
            const { error } = await supabase
              .from('gift_card_product_items')
              .update({ name: it.name.trim(), quantity: it.quantity, display_order: idx })
              .eq('id', it.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('gift_card_product_items')
              .insert({
                product_id: productId,
                name: it.name.trim(),
                quantity: it.quantity,
                display_order: idx,
              });
            if (error) throw error;
          }
        }
      } else {
        // Non-bundle: clear items
        const existing = itemsByProduct.get(productId) ?? [];
        if (existing.length) {
          const { error } = await supabase
            .from('gift_card_product_items')
            .delete()
            .in(
              'id',
              existing.map((it) => it.id),
            );
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Product updated' : 'Product created');
      qc.invalidateQueries({ queryKey: ['gift-card-products', activeClientId] });
      qc.invalidateQueries({ queryKey: ['gift-card-product-items'] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (p: ProductRow) => {
      const { error } = await supabase
        .from('gift_card_products')
        .update({ is_active: !p.is_active })
        .eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gift-card-products', activeClientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gift_card_products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Product deleted');
      qc.invalidateQueries({ queryKey: ['gift-card-products', activeClientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!activeClientId) {
    return (
      <DashboardShell title="Gift card products">
        <DashboardEmptyState title="Select a workspace to view products." />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Gift card products"
      subtitle={activeClientName ? `Catalog for ${activeClientName}` : 'Catalog of gift cards you sell'}
      actions={
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New product
        </Button>
      }
    >
      {productsQuery.isLoading ? (
        <p className="text-[14px] text-ink-muted">Loading…</p>
      ) : products.length === 0 ? (
        <DashboardEmptyState
          title="No products yet"
          description="Create your first gift card product. You can mark it as a one-time service, an open amount, or a bundle of services."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.map((p) => {
            const items = itemsByProduct.get(p.id) ?? [];
            return (
              <div
                key={p.id}
                className="group flex flex-col rounded-md border border-hairline bg-paper overflow-hidden"
              >
                <div className="relative aspect-[16/9] w-full bg-paper-soft border-b border-hairline">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-ink-muted">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                  {!p.is_active && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary">Inactive</Badge>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-[15px] text-ink truncate">{p.name}</h3>
                      <div className="mt-1 flex items-center gap-2 text-[12px] text-ink-muted">
                        <TypeIcon type={p.product_type} />
                        <span>{typeLabel[p.product_type]}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {p.product_type === 'open_amount' ? (
                        <span className="text-[14px] text-ink-muted">Open</span>
                      ) : p.price_cents != null ? (
                        <span className="font-medium text-[15px] text-ink">
                          {formatCurrencyCents(p.price_cents)}
                        </span>
                      ) : (
                        <span className="text-[12px] text-ink-muted">No price</span>
                      )}
                    </div>
                  </div>

                  {p.description && (
                    <p className="mt-2 text-[13px] text-ink-soft line-clamp-2">{p.description}</p>
                  )}

                  {p.product_type === 'bundle' && items.length > 0 && (
                    <ul className="mt-3 space-y-1 text-[13px] text-ink-soft">
                      {items.slice(0, 4).map((it) => (
                        <li key={it.id} className="flex items-baseline gap-2">
                          <span className="text-ink-muted">×{it.quantity}</span>
                          <span className="truncate">{it.name}</span>
                        </li>
                      ))}
                      {items.length > 4 && (
                        <li className="text-[12px] text-ink-muted">+{items.length - 4} more</li>
                      )}
                    </ul>
                  )}

                  {(p.valid_from || p.valid_until) && (
                    <p className="mt-3 text-[12px] text-ink-muted">
                      Valid{' '}
                      {p.valid_from ? new Date(p.valid_from).toLocaleDateString() : '—'}
                      {' → '}
                      {p.valid_until ? new Date(p.valid_until).toLocaleDateString() : '—'}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-hairline">
                    <label className="flex items-center gap-2 text-[12px] text-ink-muted cursor-pointer">
                      <Switch
                        checked={p.is_active}
                        onCheckedChange={() => toggleActive.mutate(p)}
                      />
                      Active
                    </label>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(p)}
                        className="gap-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
                            deleteProduct.mutate(p.id);
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit product' : 'New product'}</DialogTitle>
            <DialogDescription>
              Define a gift card you sell. Bundles include a list of services.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. 60-min massage"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Short description shown to customers"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.product_type}
                  onValueChange={(v) => setForm({ ...form, product_type: v as ProductType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-time service</SelectItem>
                    <SelectItem value="bundle">Bundle</SelectItem>
                    <SelectItem value="open_amount">Open amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">
                  Price (USD){' '}
                  {form.product_type === 'open_amount' && (
                    <span className="text-ink-muted text-[12px]">— not used</span>
                  )}
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={form.product_type === 'open_amount'}
                  value={form.price_dollars}
                  onChange={(e) => setForm({ ...form, price_dollars: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Image URL</Label>
              <Input
                id="image"
                type="url"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://…"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from">Valid from</Label>
                <Input
                  id="from"
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="until">Valid until</Label>
                <Input
                  id="until"
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                />
              </div>
            </div>

            {form.product_type === 'bundle' && (
              <div className="space-y-2 rounded-md border border-hairline bg-paper-soft p-4">
                <div className="flex items-center justify-between">
                  <Label>Included services</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm({ ...form, items: [...form.items, { name: '', quantity: 1 }] })
                    }
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add item
                  </Button>
                </div>
                {form.items.length === 0 ? (
                  <p className="text-[13px] text-ink-muted py-2">No items yet.</p>
                ) : (
                  <div className="space-y-2">
                    {form.items.map((it, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={it.name}
                          onChange={(e) => {
                            const next = [...form.items];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setForm({ ...form, items: next });
                          }}
                          placeholder="Service name"
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => {
                            const next = [...form.items];
                            next[idx] = { ...next[idx], quantity: Math.max(1, parseInt(e.target.value) || 1) };
                            setForm({ ...form, items: next });
                          }}
                          className="w-20"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const next = form.items.filter((_, i) => i !== idx);
                            setForm({ ...form, items: next });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <label className="flex items-center gap-3 pt-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <span className="text-[14px] text-ink">Active</span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveProduct.mutate()} disabled={saveProduct.isPending}>
              {saveProduct.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

function TypeIcon({ type }: { type: ProductType }) {
  if (type === 'bundle') return <Package className="h-3.5 w-3.5" />;
  if (type === 'open_amount') return <DollarSign className="h-3.5 w-3.5" />;
  return <Gift className="h-3.5 w-3.5" />;
}
