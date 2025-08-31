import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";

import Cart from "./Cart";
import cartReducer, {
    type CartItem as SliceCartItem,
} from "../store/cartSlice";

// --- test helpers ---
function makeStore(items: SliceCartItem[]) {
    return configureStore({
        reducer: { cart: cartReducer },
        preloadedState: { cart: { items } },
    });
}

function renderCart(items: SliceCartItem[]) {
    return render(
        <Provider store={makeStore(items)}>
            <MemoryRouter>
                <Cart />
            </MemoryRouter>
        </Provider>
    );
}

// Items must match slice's CartItem (includes color & size)
const alpha: SliceCartItem = {
    productId: "P1",
    variantId: 101,
    title: "Alpha Hoodie",
    price: 2000, // $20.00
    quantity: 2,
    image: "alpha.jpg",
    color: "Red",
    size: "M",
};

const beta: SliceCartItem = {
    productId: "P2",
    variantId: 202,
    title: "Beta Cap",
    price: 1500, // $15.00
    quantity: 1,
    image: "beta.jpg",
    color: "Black",
    size: "One Size",
};

describe("<Cart />", () => {
    it("shows the empty state when there are no items", () => {
        renderCart([]);
        expect(
            screen.getByRole("heading", { name: /shopping cart/i })
        ).toBeInTheDocument();
        expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /proceed to checkout/i })
        ).not.toBeInTheDocument();
    });

    it("renders items with image, quantity, price and shows correct total", () => {
        renderCart([alpha, beta]);

        // Alpha line item
        const alphaHeading = screen.getByRole("heading", {
            name: /alpha hoodie/i,
        });
        const alphaItem = alphaHeading.closest(".cartItem") as HTMLElement;
        expect(alphaItem).toBeTruthy();
        expect(
            within(alphaItem).getByRole("img", { name: /alpha hoodie/i })
        ).toHaveAttribute("src", "alpha.jpg");
        expect(
            within(alphaItem)
                .getByText(/quantity:/i)
                .closest("p")
        ).toHaveTextContent("2");
        expect(
            within(alphaItem)
                .getByText(/price:/i)
                .closest("p")
        ).toHaveTextContent("$20.00");

        // Beta line item
        const betaHeading = screen.getByRole("heading", { name: /beta cap/i });
        const betaItem = betaHeading.closest(".cartItem") as HTMLElement;
        expect(betaItem).toBeTruthy();
        expect(
            within(betaItem).getByRole("img", { name: /beta cap/i })
        ).toHaveAttribute("src", "beta.jpg");
        expect(
            within(betaItem)
                .getByText(/quantity:/i)
                .closest("p")
        ).toHaveTextContent("1");
        expect(
            within(betaItem)
                .getByText(/price:/i)
                .closest("p")
        ).toHaveTextContent("$15.00");

        // Total = 2*$20 + 1*$15 = $55.00
        expect(
            screen.getByRole("heading", { name: /total:\s*\$55\.00/i })
        ).toBeInTheDocument();

        // Checkout button is enabled and linked to /checkout
        const checkoutBtn = screen.getByRole("button", {
            name: /proceed to checkout/i,
        });
        expect(checkoutBtn).toBeEnabled();
        const checkoutLink = screen.getByRole("link", {
            name: /proceed to checkout/i,
        });
        expect(checkoutLink).toHaveAttribute("href", "/checkout");
    });

    it("removes an item when clicking Remove and updates the total", async () => {
        renderCart([alpha, beta]);

        // Remove Alpha
        const alphaCard = screen
            .getByRole("heading", { name: /alpha hoodie/i })
            .closest(".cartItem") as HTMLElement;
        await userEvent.click(
            within(alphaCard).getByRole("button", { name: /remove/i })
        );

        // Alpha gone, Beta remains
        expect(
            screen.queryByRole("heading", { name: /alpha hoodie/i })
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: /beta cap/i })
        ).toBeInTheDocument();

        // Total now $15.00
        expect(
            screen.getByRole("heading", { name: /total:\s*\$15\.00/i })
        ).toBeInTheDocument();

        // Checkout still enabled
        expect(
            screen.getByRole("button", { name: /proceed to checkout/i })
        ).toBeEnabled();
    });

    it("shows empty state after removing the last item", async () => {
        renderCart([beta]);

        // Remove last item
        const betaCard = screen
            .getByRole("heading", { name: /beta cap/i })
            .closest(".cartItem") as HTMLElement;
        await userEvent.click(
            within(betaCard).getByRole("button", { name: /remove/i })
        );

        // Empty state visible; checkout button gone
        expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /proceed to checkout/i })
        ).not.toBeInTheDocument();
    });
});
