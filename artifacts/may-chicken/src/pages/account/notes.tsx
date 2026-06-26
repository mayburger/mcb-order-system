import { useState } from "react";
import { AccountLayout } from "./layout";
import {
  useListCustomerNotes,
  useCreateCustomerNote,
  useDeleteCustomerNote,
  getListCustomerNotesQueryKey,
  CustomerNote,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Plus, Trash2, TrendingUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const SUGGESTIONS = [
  "Ohne Zwiebeln",
  "Extra scharf",
  "Ohne Salat",
  "Bitte anrufen",
  "Nicht klingeln, Baby schläft",
  "Bitte Besteck mitlegen",
  "Sauce separat",
  "Wenig Salz",
];

function NoteCard({ note }: { note: CustomerNote }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteNote = useDeleteCustomerNote();

  const handleDelete = () => {
    deleteNote.mutate(
      { id: note.id },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCustomerNotesQueryKey() }),
        onError: () => toast({ title: "Fehler beim Löschen", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="bg-card border border-border p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-white">{note.text}</span>
        {note.usageCount > 0 && (
          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
            <TrendingUp className="h-3 w-3" />{note.usageCount}×
          </span>
        )}
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
        onClick={handleDelete}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

export default function AccountNotesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const { data: notes, isLoading } = useListCustomerNotes({
    query: { queryKey: getListCustomerNotesQueryKey() },
  });
  const createNote = useCreateCustomerNote();

  const existingTexts = new Set(notes?.map((n) => n.text.toLowerCase()) ?? []);

  const handleAdd = (noteText: string) => {
    const t = noteText.trim();
    if (!t) return;
    if (existingTexts.has(t.toLowerCase())) {
      toast({ title: "Notiz bereits vorhanden", variant: "destructive" });
      return;
    }
    createNote.mutate(
      { data: { text: t } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCustomerNotesQueryKey() });
          setText("");
          toast({ title: "Notiz gespeichert" });
        },
        onError: () => toast({ title: "Fehler beim Speichern", variant: "destructive" }),
      }
    );
  };

  return (
    <AccountLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-display font-bold uppercase text-white">Meine Notizen</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gespeicherte Lieferhinweise. Beim nächsten Checkout kannst du sie per Klick übernehmen.
          </p>
        </div>

        {/* Add note */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='z.B. "Ohne Zwiebeln"'
              className="rounded-none border-border bg-background text-white flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAdd(text)}
            />
            <Button
              onClick={() => handleAdd(text)}
              disabled={!text.trim() || createNote.isPending}
              className="rounded-none bg-primary hover:bg-primary/90 gap-1"
            >
              <Plus className="h-4 w-4" />
              Hinzufügen
            </Button>
          </div>

          {/* Suggestions */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-widest">Schnell hinzufügen:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.filter((s) => !existingTexts.has(s.toLowerCase())).map((s) => (
                <button
                  key={s}
                  onClick={() => handleAdd(s)}
                  className="text-xs px-3 py-1.5 border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notes list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map((i) => <div key={i} className="h-12 bg-card border border-border animate-pulse" />)}
          </div>
        ) : !notes || notes.length === 0 ? (
          <div className="bg-card border border-border p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground font-semibold">Noch keine Notizen</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => <NoteCard key={note.id} note={note} />)}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
