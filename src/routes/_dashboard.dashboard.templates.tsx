import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboard } from '@/lib/dashboard-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeEmailHtml } from '@/lib/sanitize-html';
import { DashboardShell, DashboardEmptyState, formatDateTime } from '@/components/dashboard/primitives';
import { toast } from 'sonner';
import { Plus, Search, Trash2, Pencil, Copy, FileText, X, Save, ArrowLeft, Tag } from 'lucide-react';

export const Route = createFileRoute('/_dashboard/dashboard/templates')({
  component: TemplatesPage,
});

interface Template {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  subject: string | null;
  preheader: string | null;
  html_content: string;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ['Promotional', 'Newsletter', 'Holiday', 'Welcome', 'Reminder', 'Other'];

function TemplatesPage() {
  const { activeClientId } = useDashboard();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Template> | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const templates = useQuery({
    queryKey: ['email-templates', activeClientId],
    enabled: !!activeClientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('client_id', activeClientId!)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Template deleted');
      qc.invalidateQueries({ queryKey: ['email-templates'] });
    },
  });

  const filtered = useMemo(() => {
    let list = templates.data ?? [];
    if (categoryFilter !== 'all') {
      list = list.filter((t) => t.category === categoryFilter);
    }
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter((t) =>
        `${t.name} ${t.description ?? ''} ${(t.tags ?? []).join(' ')} ${t.subject ?? ''}`
          .toLowerCase()
          .includes(term),
      );
    }
    return list;
  }, [templates.data, search, categoryFilter]);

  if (!activeClientId) {
    return (
      <DashboardShell title="Email templates">
        <DashboardEmptyState title="Select a workspace to manage email templates." />
      </DashboardShell>
    );
  }

  if (editing) {
    return (
      <TemplateEditor
        clientId={activeClientId}
        template={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['email-templates'] });
          setEditing(null);
        }}
      />
    );
  }

  return (
    <DashboardShell
      title="Email template gallery"
      subtitle="Save and reuse your best HTML emails across campaigns."
      actions={
        <button
          onClick={() =>
            setEditing({
              name: '',
              description: '',
              category: 'Promotional',
              tags: [],
              subject: '',
              preheader: '',
              html_content: '',
            })
          }
          className="inline-flex h-9 items-center gap-2 rounded-sm bg-ink px-3 text-[13px] text-paper hover:bg-ink-soft"
        >
          <Plus className="h-4 w-4" />
          New template
        </button>
      }
    >
      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates by name, tag, subject…"
            className="h-10 w-full rounded-sm border border-hairline-strong bg-paper pl-9 pr-3 text-[14px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip label="All" active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')} />
          {CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              label={c}
              active={categoryFilter === c}
              onClick={() => setCategoryFilter(c)}
            />
          ))}
        </div>
      </div>

      {templates.isLoading ? (
        <div className="rounded-sm border border-hairline bg-paper p-12 text-center text-[14px] text-ink-muted">
          Loading templates…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-sm border border-dashed border-hairline-strong bg-paper p-12 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-ink-muted" />
          <h3 className="text-[15px] font-medium text-ink">
            {templates.data?.length === 0 ? 'No templates yet' : 'No templates match your filters'}
          </h3>
          <p className="mt-1 text-[13px] text-ink-muted">
            {templates.data?.length === 0
              ? 'Save your favourite email designs once and reuse them in any campaign.'
              : 'Try a different search or category.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={() => setEditing(t)}
              onUseInCampaign={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('xg.useTemplate', JSON.stringify(t));
                }
                navigate({ to: '/dashboard/emails' });
              }}
              onDelete={() => {
                if (confirm(`Delete template "${t.name}"?`)) del.mutate(t.id);
              }}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

/* --------------------------- Template card --------------------------- */

function TemplateCard({
  template,
  onEdit,
  onUseInCampaign,
  onDelete,
}: {
  template: Template;
  onEdit: () => void;
  onUseInCampaign: () => void;
  onDelete: () => void;
}) {
  const previewHtml = useMemo(() => sanitizeEmailHtml(template.html_content), [template.html_content]);
  return (
    <div className="group flex flex-col overflow-hidden rounded-sm border border-hairline bg-paper transition-colors hover:border-hairline-strong">
      <div className="relative h-44 overflow-hidden border-b border-hairline bg-paper-soft">
        <iframe
          title={`Preview of ${template.name}`}
          sandbox=""
          srcDoc={previewHtml || '<p style="font-family:sans-serif;color:#999;padding:24px">Empty template</p>'}
          className="pointer-events-none block h-[600px] w-[1000px] origin-top-left scale-[0.36]"
          aria-hidden="true"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-[14px] font-medium text-ink">{template.name}</h3>
          {template.category && (
            <span className="inline-flex h-5 items-center rounded-sm bg-paper-soft px-2 text-[11px] text-ink-soft">
              {template.category}
            </span>
          )}
        </div>
        {template.description && (
          <p className="mt-1 line-clamp-2 text-[12px] text-ink-muted">{template.description}</p>
        )}
        {template.tags && template.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {template.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-sm bg-paper-soft px-1.5 py-0.5 text-[10px] text-ink-soft"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-[11px] text-ink-muted">
          <span>Used {template.usage_count} {template.usage_count === 1 ? 'time' : 'times'}</span>
          <span>Updated {formatDateTime(template.updated_at)}</span>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-hairline pt-3">
          <button
            onClick={onUseInCampaign}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-sm bg-ink px-2.5 text-[12px] text-paper hover:bg-ink-soft"
          >
            <Copy className="h-3.5 w-3.5" />
            Use
          </button>
          <button
            onClick={onEdit}
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-hairline-strong bg-paper text-ink-soft hover:bg-paper-soft"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-hairline-strong bg-paper text-ink-muted hover:bg-paper-soft hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-8 rounded-sm border px-3 text-[12px] ${
        active
          ? 'border-ink bg-ink text-paper'
          : 'border-hairline-strong bg-paper text-ink-soft hover:bg-paper-soft'
      }`}
    >
      {label}
    </button>
  );
}

/* --------------------------- Editor --------------------------- */

function TemplateEditor({
  clientId,
  template,
  onClose,
  onSaved,
}: {
  clientId: string;
  template: Partial<Template>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(template.name ?? '');
  const [description, setDescription] = useState(template.description ?? '');
  const [category, setCategory] = useState(template.category ?? 'Promotional');
  const [tagsInput, setTagsInput] = useState((template.tags ?? []).join(', '));
  const [subject, setSubject] = useState(template.subject ?? '');
  const [preheader, setPreheader] = useState(template.preheader ?? '');
  const [html, setHtml] = useState(template.html_content ?? '');

  const previewHtml = useMemo(() => sanitizeEmailHtml(html), [html]);

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Name is required');
      if (!html.trim()) throw new Error('HTML content is required');
      if (!user?.id) throw new Error('You must be signed in');

      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        category: category || null,
        tags,
        subject: subject.trim() || null,
        preheader: preheader.trim() || null,
        html_content: sanitizeEmailHtml(html),
      };

      if (template.id) {
        const { error } = await supabase
          .from('email_templates')
          .update(payload)
          .eq('id', template.id)
          .eq('client_id', clientId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert({ ...payload, client_id: clientId, created_by: user.id });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(template.id ? 'Template updated' : 'Template saved');
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Save failed'),
  });

  return (
    <DashboardShell
      title={template.id ? 'Edit template' : 'New template'}
      subtitle="Templates are reusable HTML emails. Scripts and event handlers are stripped on save."
      actions={
        <>
          <button
            onClick={onClose}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-hairline-strong bg-paper px-3 text-[13px] text-ink hover:bg-paper-soft"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="inline-flex h-9 items-center gap-2 rounded-sm bg-ink px-3 text-[13px] text-paper hover:bg-ink-soft disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {save.isPending ? 'Saving…' : 'Save template'}
          </button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <Field label="Template name *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="Spring promo — 20% off"
              className="h-10 w-full rounded-sm border border-hairline-strong bg-paper px-3 text-[14px]"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Short note about when to use this template"
              className="w-full rounded-sm border border-hairline-strong bg-paper p-3 text-[13px]"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full rounded-sm border border-hairline-strong bg-paper px-2 text-[14px]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tags (comma separated)">
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="spring, sale, vip"
                className="h-10 w-full rounded-sm border border-hairline-strong bg-paper px-3 text-[14px]"
              />
            </Field>
          </div>

          <Field label="Default subject (optional)">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              placeholder="Pre-fill the campaign subject when this template is used"
              className="h-10 w-full rounded-sm border border-hairline-strong bg-paper px-3 text-[14px]"
            />
          </Field>

          <Field label="Default preheader (optional)">
            <input
              value={preheader}
              onChange={(e) => setPreheader(e.target.value)}
              maxLength={200}
              placeholder="Inbox preview text"
              className="h-10 w-full rounded-sm border border-hairline-strong bg-paper px-3 text-[14px]"
            />
          </Field>

          <Field label="Email HTML *">
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={16}
              spellCheck={false}
              className="w-full rounded-sm border border-hairline-strong bg-paper p-3 font-mono text-[12px] leading-relaxed"
              placeholder="Paste your email HTML here…"
            />
          </Field>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-soft">
            Sanitized preview
          </p>
          <div className="overflow-hidden rounded-sm border border-hairline bg-paper">
            <iframe
              title="Template preview"
              sandbox=""
              srcDoc={
                previewHtml ||
                '<p style="font-family:sans-serif;color:#999;padding:24px">Paste your HTML to preview…</p>'
              }
              className="block h-[640px] w-full"
            />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-ink">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

/* --------------------------- Picker dialog (used by campaigns) --------------------------- */

export function TemplatePickerDialog({
  clientId,
  open,
  onClose,
  onPick,
}: {
  clientId: string;
  open: boolean;
  onClose: () => void;
  onPick: (t: Template) => void;
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const templates = useQuery({
    queryKey: ['email-templates-picker', clientId],
    enabled: open && !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

  const filtered = useMemo(() => {
    let list = templates.data ?? [];
    if (categoryFilter !== 'all') list = list.filter((t) => t.category === categoryFilter);
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter((t) =>
        `${t.name} ${t.description ?? ''} ${(t.tags ?? []).join(' ')}`.toLowerCase().includes(term),
      );
    }
    return list;
  }, [templates.data, search, categoryFilter]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-sm border border-hairline bg-paper shadow-xl">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
          <div>
            <h2 className="text-[15px] font-medium text-ink">Choose a template</h2>
            <p className="text-[12px] text-ink-muted">Loads the HTML, subject and preheader into your campaign.</p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-ink-soft hover:bg-paper-soft"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-hairline px-5 py-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="h-9 w-full rounded-sm border border-hairline-strong bg-paper pl-9 pr-3 text-[13px]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip label="All" active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')} />
            {CATEGORIES.map((c) => (
              <FilterChip
                key={c}
                label={c}
                active={categoryFilter === c}
                onClick={() => setCategoryFilter(c)}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {templates.isLoading ? (
            <p className="py-8 text-center text-[13px] text-ink-muted">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-muted">No templates found.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onPick(t)}
                  className="group flex items-start gap-3 rounded-sm border border-hairline bg-paper p-3 text-left hover:border-ink"
                >
                  <div className="h-20 w-28 shrink-0 overflow-hidden rounded-sm border border-hairline bg-paper-soft">
                    <iframe
                      title={`Preview of ${t.name}`}
                      sandbox=""
                      srcDoc={sanitizeEmailHtml(t.html_content)}
                      className="pointer-events-none block h-[400px] w-[700px] origin-top-left scale-[0.16]"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="truncate text-[13px] font-medium text-ink">{t.name}</h4>
                      {t.category && (
                        <span className="shrink-0 rounded-sm bg-paper-soft px-1.5 py-0.5 text-[10px] text-ink-soft">
                          {t.category}
                        </span>
                      )}
                    </div>
                    {t.description && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-ink-muted">{t.description}</p>
                    )}
                    <p className="mt-1 text-[10px] text-ink-muted">Used {t.usage_count}× · Updated {formatDateTime(t.updated_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
