import { AccountLayout } from "./layout";
import {
  useListCustomerFavorites,
  useDeleteCustomerFavorite,
  getListCustomerFavoritesQueryKey,
  FavoriteOrder,
} from "@workspace/api-client-react";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Heart, RefreshCw, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

function FavoriteCard({ fav }: { fav: FavoriteOrder }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { setCartFromSnapshot } = useCart();
  const deleteFav = useDeleteCustomerFavorite();

  const handleOrder = () => {
    setCartFromSnapshot(fav.items);
    toast({ title: `"${fav.name}" zum Warenkorb hinzugefügt` });
    navigate("/cart");
  };

  const handleDelete = () => {
    if (!confirm(`"${fav.name}" wirklich löschen?`)) return;
    deleteFav.mutate(
      { id: fav.id },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCustomerFavoritesQueryKey() }),
        onError: () => toast({ title: "Fehler beim Löschen", variant: "destructive" }),
      }
    );
  };

  const totalPrice = fav.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <div className="bg-card border border-border p-4 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary shrink-0" />
          <span className="font-bold text-white">{fav.name}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {fav.items.map((i) => `${i.quantity}× ${i.itemName}`).join(", ")}
        </p>
        <p className="text-sm text-primary font-bold mt-1">ca. {totalPrice.toFixed(2)} €</p>
        <p className="text-xs text-muted-foreground">
          Gespeichert: {new Date(fav.createdAt).toLocaleDateString("de-DE")}
        </p>
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <Button size="sm" className="rounded-none bg-primary hover:bg-primary/90 text-xs h-8 gap-1" onClick={handleOrder}>
          <RefreshCw className="h-3 w-3" />
          Bestellen
        </Button>
        <Button size="sm" variant="ghost" className="rounded-none text-muted-foreground hover:text-destructive text-xs h-8 gap-1" onClick={handleDelete}>
          <Trash2 className="h-3 w-3" />
          Löschen
        </Button>
      </div>
    </div>
  );
}

export default function AccountFavoritesPage() {
  const { data: favorites, isLoading } = useListCustomerFavorites({
    query: { queryKey: getListCustomerFavoritesQueryKey() },
  });

  return (
    <AccountLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold uppercase text-white">Meine Favoriten</h2>
          <span className="text-sm text-muted-foreground">{favorites?.length ?? 0} gespeichert</span>
        </div>

        <div className="bg-secondary/20 border border-border p-3 text-xs text-muted-foreground">
          <strong className="text-white">Tipp:</strong> Öffne eine vergangene Bestellung unter "Bestellungen" und speichere sie als Favorit — dann kannst du sie hier mit einem Klick erneut bestellen.
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2].map((i) => <div key={i} className="h-20 bg-card border border-border animate-pulse" />)}
          </div>
        ) : !favorites || favorites.length === 0 ? (
          <div className="bg-card border border-border p-16 text-center">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground font-semibold">Noch keine Favoriten</p>
            <p className="text-xs text-muted-foreground mt-1">Speichere eine Bestellung als Favorit um sie schnell erneut zu bestellen.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map((fav) => <FavoriteCard key={fav.id} fav={fav} />)}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
