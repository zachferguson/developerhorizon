import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import Home from "./Home";
import { STORE_NAME } from "../config";

// Mock ProductList so we can assert how many products it receives
vi.mock("../components/ProductList", () => ({
    default: ({ products }: any) => (
        <div data-testid="product-list" data-count={products?.length ?? 0} />
    ),
}));

function makeStore(products: any[]) {
    const preloadedState = {
        products: { products, status: "idle", error: null },
        cart: { items: [] },
    };
    return configureStore({
        reducer: {
            products: (s = preloadedState.products) => s,
            cart: (s = preloadedState.cart) => s,
        },
        preloadedState,
    });
}

function renderHome(products: any[]) {
    return render(
        <Provider store={makeStore(products)}>
            <Home />
        </Provider>
    );
}

const genProducts = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
        id: `p${i + 1}`,
        title: `Product ${i + 1}`,
    }));

describe("<Home />", () => {
    beforeEach(() => vi.clearAllMocks());

    it("renders the welcome headline with the store name", () => {
        renderHome([]);
        const heading = screen.getByRole("heading", { level: 2 });
        expect(heading).toHaveTextContent(`Welcome to ${STORE_NAME}`);
        expect(
            screen.getByText(
                /high-quality apparel designed for tech enthusiasts/i
            )
        ).toBeInTheDocument();
    });

    it("does not show Featured Products when there are no products", () => {
        renderHome([]);
        expect(
            screen.queryByText(/featured products/i)
        ).not.toBeInTheDocument();
        expect(screen.queryByTestId("product-list")).not.toBeInTheDocument();
    });

    it("shows Featured Products and passes up to 5 items to ProductList", async () => {
        renderHome(genProducts(7)); // more than 5
        expect(
            await screen.findByText(/featured products/i)
        ).toBeInTheDocument();

        const list = await screen.findByTestId("product-list");
        expect(list).toBeInTheDocument();
        expect(list.getAttribute("data-count")).toBe("5");
    });

    it("passes fewer than 5 when there are fewer products", async () => {
        renderHome(genProducts(3));
        expect(
            await screen.findByText(/featured products/i)
        ).toBeInTheDocument();

        const list = await screen.findByTestId("product-list");
        expect(list.getAttribute("data-count")).toBe("3");
    });
});
