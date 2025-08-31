import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

// ---- Hoisted knobs used inside mocks
const { currentSearch, navigateMock } = vi.hoisted(() => ({
    currentSearch: { value: "" as string },
    navigateMock: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual<typeof import("react-router-dom")>(
        "react-router-dom"
    );
    return {
        ...actual,
        useNavigate: () => navigateMock,
        useSearchParams: () => [new URLSearchParams(currentSearch.value)],
    };
});

vi.mock("../config", () => ({
    API_BASE_URL: "https://api.test",
}));

vi.mock("axios", () => ({
    default: {
        get: vi.fn(),
    },
}));
import axios from "axios";

import OrderSuccess from "./OrderSuccess";

function makeStore() {
    return configureStore({
        reducer: {
            products: (s = { products: [], status: "idle", error: null }) => s,
            cart: (s = { items: [] }) => s,
        },
    });
}

// Basic localStorage stub with simple in-memory map
function installLocalStorage() {
    let store: Record<string, string> = {};
    Object.defineProperty(window, "localStorage", {
        configurable: true,
        value: {
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
            __seed(obj: Record<string, string>) {
                store = { ...obj };
            },
        },
    });
    return window.localStorage as any;
}

function renderPage() {
    return render(
        <Provider store={makeStore()}>
            <OrderSuccess />
        </Provider>
    );
}

describe("<OrderSuccess />", () => {
    let ls: any;
    beforeEach(() => {
        vi.clearAllMocks();
        navigateMock.mockClear();
        (axios.get as any).mockReset?.();
        currentSearch.value = "";
        ls = installLocalStorage();
        ls.clear();
    });

    it("shows error immediately when there is no orderId or email", async () => {
        renderPage();
        expect(screen.getByText(/no order id found/i)).toBeInTheDocument();
        expect((axios.get as any).mock.calls.length).toBe(0);

        await userEvent.click(
            screen.getByRole("button", { name: /continue shopping/i })
        );
        expect(navigateMock).toHaveBeenCalledWith("/");
    });

    it("fetches using localStorage values and renders a full order summary on success", async () => {
        ls.__seed({
            orderId: "ord_abc",
            orderEmail: "buyer@example.com",
        });

        (axios.get as any).mockResolvedValueOnce({
            data: {
                success: true,
                order_status: "processing",
                items: [
                    { product_id: "P1", variant_id: 101, quantity: 2 },
                    { product_id: "P2", variant_id: 202, quantity: 1 },
                ],
                total_price: 12345,
                total_shipping: 599,
                currency: "USD",
            },
        });

        renderPage();

        expect(await screen.findByText(/order summary/i)).toBeInTheDocument();

        expect((axios.get as any).mock.calls[0][0]).toBe(
            "https://api.test/order-status/ord_abc/buyer@example.com"
        );

        expect(screen.getByText(/order successful!/i)).toBeInTheDocument();

        // "<strong>Status:</strong> processing" -> assert on the parent <p>
        const statusP = screen.getByText(/status:/i).closest("p")!;
        expect(statusP).toHaveTextContent(/processing/i);

        // Items: assert on the parent <p> for each labeled row
        const productIdPs = screen
            .getAllByText(/product id:/i)
            .map((el) => el.closest("p")!);
        expect(productIdPs[0]).toHaveTextContent(/product id:\s*p1/i);
        expect(productIdPs[1]).toHaveTextContent(/product id:\s*p2/i);

        const variantIdPs = screen
            .getAllByText(/variant id:/i)
            .map((el) => el.closest("p")!);
        expect(variantIdPs[0]).toHaveTextContent(/variant id:\s*101/i);
        expect(variantIdPs[1]).toHaveTextContent(/variant id:\s*202/i);

        const quantityPs = screen
            .getAllByText(/quantity:/i)
            .map((el) => el.closest("p")!);
        expect(quantityPs[0]).toHaveTextContent(/quantity:\s*2/i);
        expect(quantityPs[1]).toHaveTextContent(/quantity:\s*1/i);

        expect(
            screen.getByRole("heading", { name: /total:\s*\$123\.45 USD/i })
        ).toBeInTheDocument();
        expect(
            screen.getByText(/shipping cost:\s*\$5\.99/i)
        ).toBeInTheDocument();
    });

    it("uses the orderId from the query string when present (overrides LS)", async () => {
        currentSearch.value = "orderId=query_999";
        ls.__seed({
            orderId: "ord_should_not_be_used",
            orderEmail: "buyer@example.com",
        });

        (axios.get as any).mockResolvedValueOnce({
            data: {
                success: true,
                order_status: "ok",
                items: [],
                total_price: 0,
                total_shipping: 0,
                currency: "USD",
            },
        });

        renderPage();
        await screen.findByText(/order summary/i);

        expect((axios.get as any).mock.calls[0][0]).toBe(
            "https://api.test/order-status/query_999/buyer@example.com"
        );
    });

    it("shows an error message when the API request fails", async () => {
        ls.__seed({
            orderId: "ord_fail",
            orderEmail: "buyer@example.com",
        });

        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        (axios.get as any).mockRejectedValueOnce(new Error("boom"));

        renderPage();

        expect(
            await screen.findByText(/unable to retrieve order details/i)
        ).toBeInTheDocument();
        errSpy.mockRestore();
    });

    it("renders 'No order details available.' when API returns null data", async () => {
        ls.__seed({
            orderId: "ord_null",
            orderEmail: "buyer@example.com",
        });

        (axios.get as any).mockResolvedValueOnce({ data: null });

        renderPage();

        expect(
            await screen.findByText(/no order details available/i)
        ).toBeInTheDocument();
    });

    it("allows the user to continue shopping (navigates home)", async () => {
        ls.__seed({
            orderId: "ord_go",
            orderEmail: "buyer@example.com",
        });

        (axios.get as any).mockResolvedValueOnce({
            data: {
                success: true,
                order_status: "ok",
                items: [],
                total_price: 0,
                total_shipping: 0,
                currency: "USD",
            },
        });

        renderPage();
        await screen.findByText(/order summary/i);

        await userEvent.click(
            screen.getByRole("button", { name: /continue shopping/i })
        );
        expect(navigateMock).toHaveBeenCalledWith("/");
    });
});
