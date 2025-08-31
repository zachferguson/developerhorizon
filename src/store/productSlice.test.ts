import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

// Mock the service so the thunk doesn’t actually call the network
vi.mock("../services/productService", () => ({
    fetchAllProducts: vi.fn(),
}));
import { fetchAllProducts } from "../services/productService";

// Import the slice bits under test
import reducer, {
    selectProductById,
    selectProducts,
    selectStatus,
    selectError,
    fetchProducts,
} from "./productSlice";

// Helper: build a tiny store for thunk “integration” testing
function makeStore() {
    return configureStore({
        reducer: { products: reducer },
    });
}
// Minimal product stub
const p1 = {
    id: "p1",
    title: "Alpha",
    variants: [],
    options: [],
    images: [],
    is_enabled: true,
} as any;
const p2 = {
    id: "p2",
    title: "Beta",
    variants: [],
    options: [],
    images: [],
    is_enabled: true,
} as any;

describe("productSlice", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("starts with the expected initial state", () => {
        const state = reducer(undefined as any, { type: "@@INIT" });
        expect(state).toEqual({
            products: [],
            status: "idle",
            error: null,
        });
    });

    it("sets status=loading on fetchProducts.pending", () => {
        const s0 = reducer(undefined as any, { type: "@@INIT" });
        const s1 = reducer(
            s0,
            fetchProducts.pending("req-1", undefined as any)
        );
        expect(s1.status).toBe("loading");
        expect(s1.products).toEqual([]);
        expect(s1.error).toBeNull();
    });

    it("stores products and sets status=succeeded on fetchProducts.fulfilled (and logs)", () => {
        // Silence console.log noise but ensure it’s called
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        const s0 = reducer(undefined as any, { type: "@@INIT" });
        const s1 = reducer(
            s0,
            fetchProducts.fulfilled([p1, p2], "req-2", undefined as any)
        );

        expect(s1.status).toBe("succeeded");
        expect(s1.products).toEqual([p1, p2]);
        expect(s1.error).toBeNull();

        // Implementation detail: slice logs twice (label + payload)
        expect(logSpy).toHaveBeenCalledWith("Products retrieved:");
        expect(logSpy).toHaveBeenCalledWith([p1, p2]);
        logSpy.mockRestore();
    });

    it("sets status=failed and captures error message on fetchProducts.rejected", () => {
        const err = new Error("Network down");
        const s0 = reducer(undefined as any, { type: "@@INIT" });
        const s1 = reducer(
            s0,
            fetchProducts.rejected(err, "req-3", undefined as any)
        );
        expect(s1.status).toBe("failed");
        expect(s1.error).toBe("Network down");
        expect(s1.products).toEqual([]);
    });

    it("falls back to default error message when rejection has no message", () => {
        const s0 = reducer(undefined as any, { type: "@@INIT" });

        // Create a plain rejected action with an undefined message
        const action = {
            type: fetchProducts.rejected.type,
            error: { message: undefined },
        } as any;

        const s1 = reducer(s0, action);
        expect(s1.status).toBe("failed");
        expect(s1.error).toBe("Failed to fetch products");
    });

    it("selectors return expected slices of state", () => {
        const filledState = reducer(
            undefined as any,
            fetchProducts.fulfilled([p1, p2], "req-4", undefined as any)
        );

        // Fake RootState shape for selectors
        const root = { products: filledState } as any;

        expect(selectProducts(root)).toEqual([p1, p2]);
        expect(selectStatus(root)).toBe("succeeded");
        expect(selectError(root)).toBeNull();
        expect(selectProductById(root, "p2")).toEqual(p2);
        expect(selectProductById(root, "nope")).toBeUndefined();
    });

    it("dispatching fetchProducts updates store via thunk (service mocked)", async () => {
        const store = makeStore();
        const mockedFetch = fetchAllProducts as Mock<typeof fetchAllProducts>;
        mockedFetch.mockResolvedValueOnce([p2, p1]);

        const pending = store.dispatch(fetchProducts());
        expect(selectStatus(store.getState() as any)).toBe("loading");

        await pending;

        const state = store.getState() as any;
        expect(mockedFetch).toHaveBeenCalledTimes(1);
        expect(selectStatus(state)).toBe("succeeded");
        expect(selectProducts(state)).toEqual([p2, p1]);
    });
});
