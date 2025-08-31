import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

// ---- Hoisted knobs for router
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
        post: vi.fn(),
    },
}));
import axios from "axios";

import OrderStatus from "./OrderStatus";

type Product = {
    id: string;
    title: string;
    variants: Array<{ id: number; title?: string }>;
    options: any[];
    images: Array<{ src: string; is_default?: boolean; variant_ids: number[] }>;
    is_enabled?: boolean;
};

function makeStore(preloadedProducts: Product[] = []) {
    const preloadedState = {
        products: {
            products: preloadedProducts,
            status: "succeeded",
            error: null,
        },
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

function renderWithStore(products: Product[] = []) {
    return render(
        <Provider store={makeStore(products)}>
            <OrderStatus />
        </Provider>
    );
}

describe("<OrderStatus />", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        navigateMock.mockClear();
        (axios.post as any).mockReset?.();
        currentSearch.value = "";
    });

    it("shows an error immediately when orderId or email is missing", async () => {
        renderWithStore([]);

        expect(
            screen.getByText(/invalid order details\. please check your email/i)
        ).toBeInTheDocument();
        expect((axios.post as any).mock.calls.length).toBe(0);

        await userEvent.click(
            screen.getByRole("button", { name: /continue shopping/i })
        );
        expect(navigateMock).toHaveBeenCalledWith("/");
    });

    it("posts to the API and renders a full order summary with enriched items", async () => {
        // Provide both params in the URL
        currentSearch.value =
            "orderId=ord123&email=" + encodeURIComponent("user@example.com");

        // Products with safe images (note the variant_ids arrays)
        const products: Product[] = [
            {
                id: "P1",
                title: "Alpha Hoodie",
                variants: [
                    { id: 101, title: "Red / M" },
                    { id: 102, title: "Blue / L" },
                ],
                options: [],
                images: [
                    {
                        src: "alpha-default.jpg",
                        is_default: true,
                        variant_ids: [],
                    },
                    { src: "alpha-redm.jpg", variant_ids: [101] },
                ],
                is_enabled: true,
            },
            {
                id: "P2",
                title: "Beta Cap",
                variants: [{ id: 202, title: "One Size" }],
                options: [],
                images: [{ src: "beta-os.jpg", variant_ids: [202] }],
                is_enabled: true,
            },
        ];

        (axios.post as any).mockResolvedValueOnce({
            data: {
                success: true,
                order_status: "ok",
                created_at: "2024-05-10T12:00:00Z",
                tracking_number: "1Z999",
                tracking_url: "https://track.example/1Z999",
                customer: {
                    first_name: "Grace",
                    last_name: "Hopper",
                    address1: "1 Navy Way",
                    city: "Arlington",
                    region: "VA",
                    zip: "22202",
                    country: "US",
                },
                items: [
                    {
                        product_id: "P1",
                        variant_id: 101,
                        quantity: 2,
                        sku: "ALP-101",
                        country: "US",
                    },
                    {
                        product_id: "P2",
                        variant_id: 202,
                        quantity: 1,
                        sku: "BET-202",
                        country: "US",
                    },
                ],
                total_price: 5000, // $50.00
                total_shipping: 0,
                currency: "USD",
                shipments: [
                    {
                        carrier: "UPS",
                        tracking_number: "1Z999",
                        tracking_url: "https://track.example/1Z999",
                    },
                ],
            },
        });

        renderWithStore(products);

        // Order summary shows up
        expect(await screen.findByText(/order summary/i)).toBeInTheDocument();

        // API was called with composed URL & payload
        expect((axios.post as any).mock.calls[0][0]).toBe(
            "https://api.test/order-status"
        );
        expect((axios.post as any).mock.calls[0][1]).toEqual({
            orderId: "ord123",
            email: "user@example.com",
        });

        // Status line (parent <p>)
        const statusP = screen.getByText(/order status:/i).closest("p")!;
        expect(statusP).toHaveTextContent(/ok/i);

        // Shipping/customer bits
        expect(screen.getByText(/grace hopper/i)).toBeInTheDocument();
        const shipAddrP = screen.getByText(/shipping address:/i).closest("p")!;
        expect(shipAddrP).toHaveTextContent(/1 navy way/i);
        expect(shipAddrP).toHaveTextContent(/arlington/i);
        expect(shipAddrP).toHaveTextContent(/\bva\b/i);
        expect(shipAddrP).toHaveTextContent(/22202/i);
        expect(shipAddrP).toHaveTextContent(/\bus\b/i);

        // Items: images are chosen by variant_ids
        const alphaImg = screen.getByAltText(
            "Alpha Hoodie"
        ) as HTMLImageElement;
        expect(alphaImg.src).toMatch(/alpha-redm\.jpg$/);

        const betaImg = screen.getByAltText("Beta Cap") as HTMLImageElement;
        expect(betaImg.src).toMatch(/beta-os\.jpg$/);

        // Variant label (parent <p>)
        const variantPs = screen
            .getAllByText(/variant:/i)
            .map((el) => el.closest("p")!);
        expect(variantPs[0]).toHaveTextContent(/red \/ m/i);
        expect(variantPs[1]).toHaveTextContent(/one size/i);

        // SKU / Country / Quantity (parent <p> each)
        const skuPs = screen
            .getAllByText(/sku:/i)
            .map((el) => el.closest("p")!);
        expect(skuPs[0]).toHaveTextContent(/alp-101/i);
        expect(skuPs[1]).toHaveTextContent(/bet-202/i);

        const countryPs = screen
            .getAllByText(/country:/i)
            .map((el) => el.closest("p")!);
        expect(countryPs[0]).toHaveTextContent(/\bus\b/i);
        expect(countryPs[1]).toHaveTextContent(/\bus\b/i);

        const qtyPs = screen
            .getAllByText(/quantity:/i)
            .map((el) => el.closest("p")!);
        expect(qtyPs[0]).toHaveTextContent(/2/);
        expect(qtyPs[1]).toHaveTextContent(/1/);

        // Totals and shipments
        expect(screen.getByText(/\$50\.00\s+USD/i)).toBeInTheDocument();
        expect(
            screen.getByText(/shipping cost:\s*\$0\.00/i)
        ).toBeInTheDocument();

        // 🔧 Carrier text is split by <strong>; assert on the parent <p>
        const shipInfoP = screen.getByText(/carrier:/i).closest("p")!;
        expect(shipInfoP).toHaveTextContent(/carrier:\s*ups/i);

        expect(screen.getByRole("link", { name: /1z999/i })).toHaveAttribute(
            "href",
            "https://track.example/1Z999"
        );
    });

    it("shows a friendly error when the API call fails", async () => {
        currentSearch.value =
            "orderId=ord123&email=" + encodeURIComponent("user@example.com");
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        (axios.post as any).mockRejectedValueOnce(new Error("boom"));

        renderWithStore([]);
        expect(
            await screen.findByText(/unable to retrieve order details/i)
        ).toBeInTheDocument();

        errSpy.mockRestore();
    });

    it("renders 'No order details available.' when API returns null data", async () => {
        currentSearch.value =
            "orderId=ord123&email=" + encodeURIComponent("user@example.com");
        (axios.post as any).mockResolvedValueOnce({ data: null });

        renderWithStore([]);
        expect(
            await screen.findByText(/no order details available/i)
        ).toBeInTheDocument();
    });

    it("renders even when products slice is empty (falls back to item titles/labels and empty image)", async () => {
        currentSearch.value =
            "orderId=ord123&email=" + encodeURIComponent("user@example.com");

        (axios.post as any).mockResolvedValueOnce({
            data: {
                success: true,
                order_status: "ok",
                created_at: "2024-05-10T12:00:00Z",
                customer: {
                    first_name: "Grace",
                    last_name: "Hopper",
                    address1: "1 Navy Way",
                    city: "Arlington",
                    region: "VA",
                    zip: "22202",
                    country: "US",
                },
                items: [
                    {
                        product_id: "UNKNOWN",
                        variant_id: 999,
                        quantity: 1,
                        sku: "MYST-1",
                        country: "US",
                        title: "Mystery Thing",
                        variant_label: "One Size",
                    },
                ],
                total_price: 5000,
                total_shipping: 0,
                currency: "USD",
                shipments: [],
            },
        });

        renderWithStore([]); // empty products slice

        expect(await screen.findByText(/order summary/i)).toBeInTheDocument();

        // Title fallback from item.title
        expect(
            screen.getByRole("heading", { name: /mystery thing/i })
        ).toBeInTheDocument();

        // Image fallback becomes empty string
        const img = screen.getByAltText("Mystery Thing") as HTMLImageElement;
        expect(img).not.toHaveAttribute("src");

        // Variant fallback from item.variant_label, assert on parent <p>
        const variantP = screen.getByText(/variant:/i).closest("p")!;
        expect(variantP).toHaveTextContent(/one size/i);

        // The rest of details — assert on parent <p> to avoid <strong> split
        const skuP = screen.getByText(/sku:/i).closest("p")!;
        expect(skuP).toHaveTextContent(/myst-1/i);
        const countryP = screen.getByText(/country:/i).closest("p")!;
        expect(countryP).toHaveTextContent(/\bus\b/i);
        const qtyP = screen.getByText(/quantity:/i).closest("p")!;
        expect(qtyP).toHaveTextContent(/1/);

        expect(screen.getByText(/\$50\.00\s+USD/i)).toBeInTheDocument();
        expect(
            screen.getByText(/shipping cost:\s*\$0\.00/i)
        ).toBeInTheDocument();
    });
});
