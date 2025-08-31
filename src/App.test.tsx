import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---- Mock leaf components so we only test App's wiring ----
vi.mock("./components/Header", () => ({
    default: () => <div data-testid="header">Header</div>,
}));
vi.mock("./components/NavBar", () => ({
    default: () => <div data-testid="navbar">NavBar</div>,
}));
vi.mock("./components/Footer", () => ({
    default: () => <div data-testid="footer">Footer</div>,
}));

// Pages
vi.mock("./pages/Home", () => ({
    default: () => <div data-testid="home">Home</div>,
}));
vi.mock("./pages/Products", () => ({
    default: () => <div data-testid="products">Products</div>,
}));
vi.mock("./pages/Cart", () => ({
    default: () => <div data-testid="cart">Cart</div>,
}));
vi.mock("./pages/OrderSuccess", () => ({
    default: () => <div data-testid="order-success">OrderSuccess</div>,
}));
vi.mock("./pages/OrderStatus", () => ({
    default: () => <div data-testid="order-status">OrderStatus</div>,
}));

// Give ProductDetails/Checkout a way to trigger App.openModal
vi.mock("./pages/ProductDetails", () => ({
    default: ({ openModal }: { openModal: (c: JSX.Element) => void }) => (
        <div data-testid="product-details">
            <button onClick={() => openModal(<div>PD Modal Content</div>)}>
                Open Product Modal
            </button>
        </div>
    ),
}));
vi.mock("./pages/Checkout", () => ({
    default: ({ openModal }: { openModal: (c: JSX.Element) => void }) => (
        <div data-testid="checkout">
            <button
                onClick={() => openModal(<div>Checkout Modal Content</div>)}
            >
                Open Checkout Modal
            </button>
        </div>
    ),
}));

// NotFound can be real or mocked — mock for consistency
vi.mock("./pages/NotFound", () => ({
    default: () => <div data-testid="notfound">NotFound</div>,
}));

// Modal mock: only renders when isOpen, shows children, and an onClose hook
vi.mock("./components/Modal", () => ({
    default: ({
        isOpen,
        onClose,
        children,
    }: {
        isOpen: boolean;
        onClose: () => void;
        children?: React.ReactNode;
    }) =>
        isOpen ? (
            <div data-testid="modal">
                <button onClick={onClose}>Close</button>
                <div data-testid="modal-content">{children}</div>
            </div>
        ) : null,
}));

// ToastContainer: keep it lightweight & detectable
vi.mock("react-toastify", () => ({
    ToastContainer: () => <div data-testid="toast-container" />,
}));

import App from "./App";

describe("<App /> routing & layout", () => {
    beforeEach(() => {
        // reset URL between tests
        window.history.pushState({}, "", "/");
    });

    it("renders Header, NavBar, Footer and Home on /", () => {
        render(<App />);

        expect(screen.getByTestId("header")).toBeInTheDocument();
        expect(screen.getByTestId("navbar")).toBeInTheDocument();
        expect(screen.getByTestId("footer")).toBeInTheDocument();
        expect(screen.getByTestId("home")).toBeInTheDocument();

        // Toast is mounted
        expect(screen.getByTestId("toast-container")).toBeInTheDocument();

        // Header precedes NavBar in the DOM
        const header = screen.getByTestId("header");
        const navbar = screen.getByTestId("navbar");
        const follows =
            header.compareDocumentPosition(navbar) &
            Node.DOCUMENT_POSITION_FOLLOWING;
        expect(follows).toBeTruthy();
    });

    it.each([
        ["/", "home"],
        ["/products", "products"],
        ["/cart", "cart"],
        ["/order-success", "order-success"],
        ["/order-status", "order-status"],
        ["/product/abc", "product-details"],
        ["/checkout", "checkout"],
        ["/this-route-does-not-exist", "notfound"],
    ])("navigates to %s and renders %s", (path, testId) => {
        window.history.pushState({}, "", path as string);
        render(<App />);
        expect(screen.getByTestId(testId as string)).toBeInTheDocument();
    });

    it("opens and closes the modal from a child route (ProductDetails)", async () => {
        window.history.pushState({}, "", "/product/xyz");
        render(<App />);

        // Open via the mocked ProductDetails button
        await userEvent.click(
            screen.getByRole("button", { name: /open product modal/i })
        );
        expect(screen.getByTestId("modal")).toBeInTheDocument();
        expect(screen.getByTestId("modal-content")).toHaveTextContent(
            "PD Modal Content"
        );

        // Close it
        await userEvent.click(screen.getByRole("button", { name: /close/i }));
        expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    });

    it("also opens the modal from Checkout", async () => {
        window.history.pushState({}, "", "/checkout");
        render(<App />);

        await userEvent.click(
            screen.getByRole("button", { name: /open checkout modal/i })
        );
        expect(screen.getByTestId("modal")).toBeInTheDocument();
        expect(screen.getByTestId("modal-content")).toHaveTextContent(
            "Checkout Modal Content"
        );
    });
});
