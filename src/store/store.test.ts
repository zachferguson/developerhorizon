import { describe, it, expect, vi, beforeEach } from "vitest";

function makeLocalStorageMock() {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((k: string) => (k in store ? store[k] : null)),
        setItem: vi.fn((k: string, v: string) => {
            store[k] = String(v);
        }),
        removeItem: vi.fn((k: string) => {
            delete store[k];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        __seed(obj: Record<string, unknown>) {
            store = Object.fromEntries(
                Object.entries(obj).map(([k, v]) => [k, JSON.stringify(v)])
            );
        },
    };
}

type StoreModule = typeof import("./store");
type CartSlice = typeof import("./cartSlice");
type ProductSlice = typeof import("./productSlice");

describe("store wiring", () => {
    let ls: ReturnType<typeof makeLocalStorageMock>;
    let storeModule: StoreModule;
    let cart: CartSlice;
    let products: ProductSlice;

    async function importFresh() {
        vi.resetModules();
        // Ensure localStorage is present before any module reads it
        Object.defineProperty(window, "localStorage", {
            configurable: true,
            value: ls,
        });
        // Import slices first (so we can use their action creators)
        cart = await import("./cartSlice");
        products = await import("./productSlice");
        // Then import the configured store
        storeModule = await import("./store");
    }

    beforeEach(async () => {
        vi.clearAllMocks();
        ls = makeLocalStorageMock();
        await importFresh();
    });

    it("initializes with products and cart reducers under expected keys", () => {
        const { store } = storeModule;
        const state = store.getState();

        expect(Object.keys(state)).toEqual(["products", "cart"]);
        expect(state.products).toEqual({
            products: [],
            status: "idle",
            error: null,
        });
        expect(state.cart).toEqual({ items: [] });
    });

    it("handles products thunk lifecycle actions (pending → fulfilled)", () => {
        const { store } = storeModule;
        const { fetchProducts } = products;

        // pending
        store.dispatch(fetchProducts.pending("req-1", undefined as any));
        expect(store.getState().products.status).toBe("loading");

        // fulfilled
        const p1 = { id: "p1" } as any;
        const p2 = { id: "p2" } as any;
        store.dispatch(
            fetchProducts.fulfilled([p1, p2], "req-1", undefined as any)
        );

        const s = store.getState().products;
        expect(s.status).toBe("succeeded");
        expect(s.products).toEqual([p1, p2]);
        expect(s.error).toBeNull();
    });

    it("handles products rejected (sets status failed and error message)", () => {
        const { store } = storeModule;
        const { fetchProducts } = products;

        store.dispatch(
            fetchProducts.rejected(new Error("boom"), "req-2", undefined as any)
        );
        const s = store.getState().products;
        expect(s.status).toBe("failed");
        expect(s.error).toBe("boom");
    });

    it("cart addToCart updates state and persists to localStorage", () => {
        const { store } = storeModule;
        const { addToCart } = cart;

        const item = {
            productId: "prod_1",
            variantId: 101,
            title: "Shirt",
            image: "https://img",
            color: "Red",
            size: "XL",
            price: 1999,
            quantity: 2,
        };

        store.dispatch(addToCart(item));

        const st = store.getState().cart;
        expect(st.items).toEqual([item]);
        expect(ls.setItem).toHaveBeenCalledWith("cart", JSON.stringify([item]));
    });

    it("cart clearCart empties state and removes from localStorage", () => {
        const { store } = storeModule;
        const { addToCart, clearCart } = cart;

        store.dispatch(
            addToCart({
                productId: "p",
                variantId: 1,
                title: "X",
                image: "",
                color: "C",
                size: "S",
                price: 1,
                quantity: 1,
            })
        );

        store.dispatch(clearCart());

        expect(store.getState().cart.items).toEqual([]);
        expect(ls.removeItem).toHaveBeenCalledWith("cart");
    });

    it("respects cart initialization from localStorage when store is created", async () => {
        // Seed, then re-import to rebuild store with seeded LS
        ls.__seed({
            cart: [
                {
                    productId: "p",
                    variantId: 7,
                    title: "Seeded",
                    image: "",
                    color: "C",
                    size: "M",
                    price: 500,
                    quantity: 3,
                },
            ],
        });
        await importFresh();

        const { store } = storeModule;
        expect(store.getState().cart.items).toEqual([
            {
                productId: "p",
                variantId: 7,
                title: "Seeded",
                image: "",
                color: "C",
                size: "M",
                price: 500,
                quantity: 3,
            },
        ]);
    });
});
