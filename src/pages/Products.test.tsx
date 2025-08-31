import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import Products from "./Products";

// Mock ProductList so we can assert what gets passed in
vi.mock("../components/ProductList", () => ({
    default: ({ products }: any) => (
        <div data-testid="product-list" data-count={products?.length ?? 0} />
    ),
}));

// helper to render with a tiny mock store
function renderWithStore(products: any[]) {
    const preloadedState = {
        products: {
            products,
            status: "succeeded",
            error: null,
        },
        cart: { items: [] },
    };

    // simple identity reducers; we don't mutate in these tests
    const store = configureStore({
        reducer: {
            products: (state = preloadedState.products) => state,
            cart: (state = preloadedState.cart) => state,
        },
        preloadedState,
    });

    return render(
        <Provider store={store}>
            <Products />
        </Provider>
    );
}

// sample products with overlapping tags to exercise the intersection logic
const pA = { id: "A", title: "A", tags: ["Men", "Shirt", "Red"] };
const pB = { id: "B", title: "B", tags: ["Women", "Shirt", "Blue"] };
const pC = { id: "C", title: "C", tags: ["Unisex", "Hoodie", "Red"] };
const pD = { id: "D", title: "D", tags: ["Women", "Hoodie", "Green"] };
const all = [pA, pB, pC, pD];

describe("<Products />", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders with all products when no tags are selected and filters are hidden by default", () => {
        renderWithStore(all);

        // Filters are initially hidden
        expect(screen.queryByRole("button", { name: /men/i })).toBeNull();

        // ProductList receives all items
        expect(screen.getByTestId("product-list")).toHaveAttribute(
            "data-count",
            "4"
        );

        // Toggle button shows “Show Filters”
        expect(
            screen.getByRole("button", { name: /show filters/i })
        ).toBeInTheDocument();
    });

    it("shows tag buttons with correct counts when filters are opened", async () => {
        renderWithStore(all);
        await userEvent.click(
            screen.getByRole("button", { name: /show filters/i })
        );

        // Counts: Men(1), Women(2), Shirt(2), Red(2), Blue(1), Unisex(1), Hoodie(2), Green(1)
        for (const [tag, count] of [
            ["Men", 1],
            ["Women", 2],
            ["Shirt", 2],
            ["Red", 2],
            ["Blue", 1],
            ["Unisex", 1],
            ["Hoodie", 2],
            ["Green", 1],
        ] as const) {
            expect(
                screen.getByRole("button", {
                    name: new RegExp(`^${tag} \\(${count}\\)$`, "i"),
                })
            ).toBeInTheDocument();
        }
    });

    it("selecting a single tag filters products and limits available tags to the union of matching products' tags", async () => {
        renderWithStore(all);
        await userEvent.click(
            screen.getByRole("button", { name: /show filters/i })
        );

        // Select "Men" (only pA has Men)
        await userEvent.click(
            screen.getByRole("button", { name: /^Men \(1\)$/i })
        );

        // ProductList now receives only pA
        expect(screen.getByTestId("product-list")).toHaveAttribute(
            "data-count",
            "1"
        );

        // Available tags become the tags of pA: ["Men","Shirt","Red"]
        const enabled = ["Men", "Shirt", "Red"];
        const disabled = ["Women", "Blue", "Unisex", "Hoodie", "Green"];

        for (const tag of enabled) {
            const btn = screen.getByRole("button", {
                name: new RegExp(`^${tag} \\(`),
            });
            expect(btn).not.toBeDisabled();
        }
        for (const tag of disabled) {
            const btn = screen.getByRole("button", {
                name: new RegExp(`^${tag} \\(`),
            });
            expect(btn).toBeDisabled();
        }
    });

    it("adding a second tag expands available tags and filtered products (OR logic)", async () => {
        renderWithStore(all);
        await userEvent.click(
            screen.getByRole("button", { name: /show filters/i })
        );

        // Select "Men" first => only pA
        await userEvent.click(
            screen.getByRole("button", { name: /^Men \(1\)$/i })
        );
        expect(screen.getByTestId("product-list")).toHaveAttribute(
            "data-count",
            "1"
        );

        // Select "Shirt" (present on pA and pB) => pA + pB
        await userEvent.click(
            screen.getByRole("button", { name: /^Shirt \(2\)$/i })
        );
        expect(screen.getByTestId("product-list")).toHaveAttribute(
            "data-count",
            "2"
        );

        // Available tags are union of tags on products that have either Men or Shirt => pA ∪ pB
        const shouldBeEnabled = ["Men", "Shirt", "Red", "Women", "Blue"];
        const shouldBeDisabled = ["Hoodie", "Unisex", "Green"];

        for (const tag of shouldBeEnabled) {
            const btn = screen.getByRole("button", {
                name: new RegExp(`^${tag} \\(`),
            });
            expect(btn).not.toBeDisabled();
        }
        for (const tag of shouldBeDisabled) {
            const btn = screen.getByRole("button", {
                name: new RegExp(`^${tag} \\(`),
            });
            expect(btn).toBeDisabled();
        }
    });

    it("toggling tags off restores filters and counts", async () => {
        renderWithStore(all);
        await userEvent.click(
            screen.getByRole("button", { name: /show filters/i })
        );

        // Select two tags
        await userEvent.click(
            screen.getByRole("button", { name: /^Men \(1\)$/i })
        ); // pA
        await userEvent.click(
            screen.getByRole("button", { name: /^Shirt \(2\)$/i })
        ); // pA + pB
        expect(screen.getByTestId("product-list")).toHaveAttribute(
            "data-count",
            "2"
        );

        // Toggle off "Men" -> still "Shirt" selected => pA + pB
        await userEvent.click(
            screen.getByRole("button", { name: /^Men \(1\)$/i })
        );
        expect(screen.getByTestId("product-list")).toHaveAttribute(
            "data-count",
            "2"
        );

        // Toggle off "Shirt" -> no tags selected => all products again
        await userEvent.click(
            screen.getByRole("button", { name: /^Shirt \(2\)$/i })
        );
        expect(screen.getByTestId("product-list")).toHaveAttribute(
            "data-count",
            "4"
        );
    });

    it("filter panel toggle button switches text", async () => {
        renderWithStore(all);
        const toggle = screen.getByRole("button", { name: /show filters/i });
        await userEvent.click(toggle);
        expect(
            screen.getByRole("button", { name: /hide filters/i })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole("button", { name: /hide filters/i })
        );
        expect(
            screen.getByRole("button", { name: /show filters/i })
        ).toBeInTheDocument();
    });
});
