// src/components/Navbar.test.tsx
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// 1) Mock the thunk *inside* the factory so it survives hoisting
vi.mock("../store/productSlice", () => ({
    fetchProducts: vi.fn(() => ({ type: "products/fetchProducts" })),
}));

// 2) Mock react-redux hooks so we can control state/dispatch
vi.mock("react-redux", () => ({
    useDispatch: vi.fn(),
    useSelector: vi.fn(),
}));

import * as ReactRedux from "react-redux";
import { fetchProducts } from "../store/productSlice"; // <-- mocked export
import Navbar from "./NavBar";

type Status = "idle" | "loading" | "succeeded" | "failed";
type TestState = { products: { status: Status }; cart: { items: unknown[] } };

const defaultState: TestState = {
    products: { status: "succeeded" },
    cart: { items: [] },
};

const useDispatchMock = ReactRedux.useDispatch as unknown as Mock;
const useSelectorMock = ReactRedux.useSelector as unknown as Mock;

function renderWithState(overrides?: Partial<TestState>) {
    const state: TestState = {
        products: { ...defaultState.products, ...(overrides?.products ?? {}) },
        cart: { ...defaultState.cart, ...(overrides?.cart ?? {}) },
    };

    const dispatchSpy = vi.fn();
    useDispatchMock.mockReturnValue(dispatchSpy);
    useSelectorMock.mockImplementation((selector: (s: TestState) => unknown) =>
        selector(state)
    );

    const ui = render(
        <MemoryRouter>
            <Navbar />
        </MemoryRouter>
    );

    return { ui, state, dispatchSpy };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("<Navbar />", () => {
    it("renders Home and All Products links", () => {
        renderWithState();
        expect(
            screen.getByRole("link", { name: /home/i }).getAttribute("href")
        ).toBe("/");
        expect(
            screen
                .getByRole("link", { name: /all products/i })
                .getAttribute("href")
        ).toBe("/products");
        const cart = screen
            .getAllByRole("link")
            .find((a) => a.getAttribute("href") === "/cart");
        expect(cart).toBeTruthy();
    });

    it("hides the cart badge at 0 items", () => {
        renderWithState({ cart: { items: [] } });
        expect(screen.queryByText(/^\d+$/)).toBeNull();
    });

    it("shows a cart badge with the item count when items > 0", () => {
        renderWithState({ cart: { items: [{}, {}, {}] } });
        expect(screen.getByText("3")).toBeInTheDocument();
    });

    it('dispatches fetchProducts when status is "idle"', () => {
        const { dispatchSpy } = renderWithState({
            products: { status: "idle" },
        });
        expect(fetchProducts).toHaveBeenCalledTimes(1);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
    });

    it('dispatches fetchProducts when status is "failed"', () => {
        const { dispatchSpy } = renderWithState({
            products: { status: "failed" },
        });
        expect(fetchProducts).toHaveBeenCalledTimes(1);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
    });

    it('does NOT dispatch when status is "succeeded"', () => {
        const { dispatchSpy } = renderWithState({
            products: { status: "succeeded" },
        });
        expect(fetchProducts).not.toHaveBeenCalled();
        expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('does NOT dispatch when status is "loading"', () => {
        const { dispatchSpy } = renderWithState({
            products: { status: "loading" },
        });
        expect(fetchProducts).not.toHaveBeenCalled();
        expect(dispatchSpy).not.toHaveBeenCalled();
    });
});
