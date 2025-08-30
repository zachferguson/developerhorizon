import { describe, it, expect, vi, beforeEach } from "vitest";

// --- localStorage mock that we control per test
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
        // helper for tests
        __seed(data: Record<string, unknown>) {
            store = Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, JSON.stringify(v)])
            );
        },
        __snapshot() {
            return { ...store };
        },
    };
}

type SliceModule = typeof import("./cartSlice");

describe("cartSlice", () => {
    let ls: ReturnType<typeof makeLocalStorageMock>;
    let slice: SliceModule;

    async function importFreshSlice() {
        // Ensure a clean module registry so initialState re-runs with our mocked LS
        vi.resetModules();
        slice = await import("./cartSlice");
    }

    beforeEach(async () => {
        // fresh mock each test
        ls = makeLocalStorageMock();
        Object.defineProperty(window, "localStorage", {
            configurable: true,
            value: ls,
        });
        await importFreshSlice();
    });

    const sampleItem = {
        productId: "prod_1",
        variantId: 101,
        title: "Comfy Tee",
        image: "https://example.com/tee.png",
        color: "Solid Red",
        size: "XL",
        price: 2599,
        quantity: 2,
    };

    it("initializes state from localStorage when present", async () => {
        // Seed LS, then re-import so initialState uses it
        ls.__seed({
            cart: [{ ...sampleItem, quantity: 5 }],
        });
        await importFreshSlice();

        const { default: reducer } = slice;
        const state = reducer(undefined as any, { type: "@@INIT" });

        expect(state.items).toEqual([{ ...sampleItem, quantity: 5 }]);
        expect(ls.getItem).toHaveBeenCalledWith("cart");
    });

    it("initializes with empty array when localStorage is empty", () => {
        const { default: reducer } = slice;
        const state = reducer(undefined as any, { type: "@@INIT" });
        expect(state.items).toEqual([]);
        expect(ls.getItem).toHaveBeenCalledWith("cart");
    });

    it("addToCart pushes a new item and persists", () => {
        const { default: reducer, addToCart } = slice;

        const state1 = reducer(undefined as any, { type: "@@INIT" });
        const state2 = reducer(state1, addToCart(sampleItem));

        expect(state2.items).toEqual([sampleItem]);
        expect(ls.setItem).toHaveBeenCalledWith(
            "cart",
            JSON.stringify([sampleItem])
        );
    });

    it("addToCart increments quantity when variantId already exists (even if productId differs)", () => {
        const { default: reducer, addToCart } = slice;

        const existing = {
            ...sampleItem,
            productId: "different_prod",
            quantity: 1,
        };
        const state1 = reducer(undefined as any, { type: "@@INIT" });
        const state2 = reducer(state1, addToCart(existing));
        const state3 = reducer(
            state2,
            addToCart({ ...sampleItem, quantity: 3 }) // same variantId=101
        );

        expect(state3.items).toHaveLength(1);
        expect(state3.items[0].variantId).toBe(101);
        expect(state3.items[0].quantity).toBe(4); // 1 + 3
        expect(ls.setItem).toHaveBeenCalledTimes(2);
    });

    it("removeFromCart removes only the exact (productId, variantId) match and persists", () => {
        const { default: reducer, addToCart, removeFromCart } = slice;

        const a = { ...sampleItem }; // prod_1 / 101
        const b = { ...sampleItem, variantId: 102, quantity: 1 }; // prod_1 / 102
        const c = { ...sampleItem, productId: "prod_2", variantId: 101 }; // prod_2 / 101 (merges into 101)

        let state = reducer(undefined as any, { type: "@@INIT" });
        state = reducer(state, addToCart(a));
        state = reducer(state, addToCart(b));
        state = reducer(state, addToCart(c)); // merges with variantId 101

        // remove only prod_1 + 101 (this is the merged line)
        state = reducer(
            state,
            removeFromCart({ productId: "prod_1", variantId: 101 })
        );

        // Only the 102 item remains because 101 was a merged line
        expect(state.items.map((x) => [x.productId, x.variantId])).toEqual([
            ["prod_1", 102],
        ]);

        expect(ls.setItem).toHaveBeenLastCalledWith(
            "cart",
            JSON.stringify(state.items)
        );
    });

    it("clearCart empties items and removes 'cart' key from localStorage", () => {
        const { default: reducer, addToCart, clearCart } = slice;

        let state = reducer(undefined as any, { type: "@@INIT" });
        state = reducer(state, addToCart(sampleItem));
        state = reducer(state, clearCart());

        expect(state.items).toEqual([]);
        expect(ls.removeItem).toHaveBeenCalledWith("cart");
    });

    it("updateQuantity updates the item quantity and persists", () => {
        const { default: reducer, addToCart, updateQuantity } = slice;

        let state = reducer(undefined as any, { type: "@@INIT" });
        state = reducer(state, addToCart(sampleItem));

        state = reducer(state, updateQuantity({ variantId: 101, quantity: 7 }));
        expect(state.items[0].quantity).toBe(7);

        expect(ls.setItem).toHaveBeenCalledWith(
            "cart",
            JSON.stringify(state.items)
        );
    });

    it("updateQuantity still persists even if the item does not exist (no-op state change)", () => {
        const { default: reducer, updateQuantity } = slice;

        const state1 = reducer(undefined as any, { type: "@@INIT" });
        const state2 = reducer(
            state1,
            updateQuantity({ variantId: 999, quantity: 3 })
        );

        expect(state2.items).toEqual([]); // unchanged
        expect(ls.setItem).toHaveBeenCalledWith("cart", JSON.stringify([]));
    });
});
