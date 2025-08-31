import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

// -------------------- Router hoist/mocks --------------------
const { navigateMock } = vi.hoisted(() => ({
    navigateMock: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual<typeof import("react-router-dom")>(
        "react-router-dom"
    );
    return {
        ...actual,
        useNavigate: () => navigateMock,
    };
});

// -------------------- Stripe mocks --------------------
vi.mock("@stripe/stripe-js", () => ({
    loadStripe: vi.fn(() => Promise.resolve({} as any)),
}));

vi.mock("@stripe/react-stripe-js", () => ({
    // Render children directly so the form is visible in the DOM
    Elements: ({ children }: any) => (
        <div data-testid="elements">{children}</div>
    ),
}));

// -------------------- CheckoutForm mock --------------------
vi.mock("../components/CheckoutForm", () => ({
    default: (props: any) => (
        <div data-testid="CheckoutForm">
            Checkout Form
            <pre data-testid="cf-props">{JSON.stringify(props)}</pre>
        </div>
    ),
}));

// -------------------- Axios mock --------------------
vi.mock("axios", () => ({
    default: { post: vi.fn() },
}));
import axios from "axios";

// -------------------- SUT --------------------
import Checkout from "./Checkout";

// -------------------- Test helpers --------------------
type CartItem = {
    productId: string;
    variantId: number;
    quantity: number;
    price: number; // cents
};

function makeStore(items: CartItem[]) {
    const preloadedState = {
        cart: { items },
        products: { products: [], status: "idle", error: null },
    };
    return configureStore({
        reducer: {
            cart: (s = preloadedState.cart) => s,
            products: (s = preloadedState.products) => s,
        },
        preloadedState,
    });
}

function renderCheckout(items: CartItem[], openModal = vi.fn()) {
    return render(
        <Provider store={makeStore(items)}>
            <Checkout openModal={openModal} />
        </Provider>
    );
}

async function fillAddressOnly() {
    await userEvent.type(
        screen.getByPlaceholderText(/enter first name/i),
        "Grace"
    );
    await userEvent.type(
        screen.getByPlaceholderText(/enter last name/i),
        "Hopper"
    );
    await userEvent.type(
        screen.getByPlaceholderText(/enter address/i),
        "1 Navy Way"
    );
    await userEvent.type(
        screen.getByPlaceholderText(/enter city/i),
        "Arlington"
    );
    await userEvent.type(
        screen.getByPlaceholderText(/enter state\/region/i),
        "VA"
    );
    await userEvent.type(
        screen.getByPlaceholderText(/enter zip code/i),
        "22202"
    );
}

async function fillEmailsAndAgree(email = "user@example.com") {
    await userEvent.type(
        screen.getByPlaceholderText(/enter your email/i),
        email
    );
    await userEvent.type(
        screen.getByPlaceholderText(/confirm your email/i),
        email
    );
    // The only visible checkbox is the terms checkbox
    const checkbox = screen.getByRole("checkbox");
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
}

function getPaymentCalls() {
    return (axios.post as any).mock.calls.filter((c: any[]) =>
        String(c[0]).includes("/payments/create-payment-intent")
    );
}

function getShippingCalls() {
    return (axios.post as any).mock.calls.filter((c: any[]) =>
        String(c[0]).includes("/shipping-options")
    );
}

// -------------------- Tests --------------------
describe("<Checkout />", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        navigateMock.mockClear();
        (axios.post as any).mockReset?.();
    });

    it("redirects to /cart when the cart is empty", async () => {
        renderCheckout([]);
        await waitFor(() => {
            expect(navigateMock).toHaveBeenCalledWith("/cart");
        });
        expect(axios.post).not.toHaveBeenCalled();
    });

    it("shows the gated message until form is valid; then loads shipping → payment intent → shows CheckoutForm", async () => {
        // Cart with 2 items (prices in cents)
        const items: CartItem[] = [
            { productId: "P1", variantId: 101, quantity: 2, price: 2000 }, // $20 x2 = $40
            { productId: "P2", variantId: 202, quantity: 1, price: 1500 }, // $15
        ];
        // Shipping standard = $5 (500 cents); priority = $9 (900 cents)
        const shippingResponse = {
            data: {
                standard: 500,
                priority: [
                    {
                        id: 476,
                        name: "Priority Shipping",
                        price: 900,
                        countries: ["US"],
                    },
                ],
                express: [],
                economy: [],
            },
        };
        // URL-aware axios mock: stable across re-renders
        const post = axios.post as unknown as Mock;
        post.mockImplementation((url: string) => {
            if (url.includes("/shipping-options")) {
                return Promise.resolve(shippingResponse);
            }
            if (url.includes("/payments/create-payment-intent")) {
                return Promise.resolve({
                    data: { clientSecret: "cs_test_123" },
                });
            }
            return Promise.reject(new Error("Unknown URL " + url));
        });

        renderCheckout(items);

        // Initially, user must complete the form
        expect(
            screen.getByText(/please complete all required fields/i)
        ).toBeInTheDocument();

        // Fill only address to trigger the shipping quote fetch
        await fillAddressOnly();

        // Shipping select appears after axios returns
        const select = await screen.findByRole("combobox");
        // Standard should be present with price displayed as dollars
        expect(
            within(select).getByRole("option", {
                name: /standard shipping - \$5\.00/i,
            })
        ).toBeInTheDocument();

        // No payment intent yet because form isn't fully ready
        expect(getPaymentCalls().length).toBe(0);

        // Now complete emails + agree → triggers payment intent
        await fillEmailsAndAgree();

        // The “gated” message disappears
        await waitFor(() => {
            expect(
                screen.queryByText(/please complete all required fields/i)
            ).not.toBeInTheDocument();
        });

        // Payment intent was created with cart total + selected shipping
        // Cart total = 2000*2 + 1500*1 = 5500; shipping = 500; amount = 6000
        await waitFor(() => {
            const paymentCalls = getPaymentCalls();
            expect(paymentCalls.length).toBeGreaterThanOrEqual(1);
            const [, body] = paymentCalls.at(-1)!; // last payment call
            expect(body).toMatchObject({
                storeId: "developerhorizon",
                amount: 6000,
                currency: "usd",
            });
        });

        // Elements + CheckoutForm render once clientSecret resolves
        expect(await screen.findByTestId("elements")).toBeInTheDocument();
        expect(await screen.findByTestId("CheckoutForm")).toBeInTheDocument();

        // And shipping call contained our line_items mapping
        const [shipUrl, shipBody] = getShippingCalls()[0];
        expect(shipUrl).toBe(
            "https://zfxapi.com/printify/20416540/shipping-options"
        );
        expect(shipBody).toMatchObject({
            address_to: expect.any(Object),
            line_items: [
                { product_id: "P1", variant_id: 101, quantity: 2 },
                { product_id: "P2", variant_id: 202, quantity: 1 },
            ],
        });
    });

    it("clicking the Terms link opens the modal and does NOT toggle the checkbox", async () => {
        // Have at least one cart item so we don’t redirect
        const items: CartItem[] = [
            { productId: "P1", variantId: 1, quantity: 1, price: 1000 },
        ];

        // URL-aware mock (even though shipping won't fire in this test)
        const post = axios.post as unknown as Mock;
        post.mockImplementation((url: string) => {
            if (url.includes("/shipping-options")) {
                return Promise.resolve({
                    data: {
                        standard: 500,
                        priority: [],
                        express: [],
                        economy: [],
                    },
                });
            }
            if (url.includes("/payments/create-payment-intent")) {
                return Promise.resolve({
                    data: { clientSecret: "cs_irrelevant" },
                });
            }
            return Promise.reject(new Error("Unknown URL " + url));
        });

        const openModal = vi.fn();
        renderCheckout(items, openModal);

        // Make sure the checkbox starts unchecked
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).not.toBeChecked();

        // Click the inline Terms link (target the link span, not the error text)
        const termsLink = screen.getByText(/terms and conditions/i, {
            selector: "span.terms-link",
        });
        await userEvent.click(termsLink);

        expect(openModal).toHaveBeenCalledTimes(1);
        expect(checkbox).not.toBeChecked();
    });

    it("re-creates the payment intent when the user changes the shipping method", async () => {
        const items: CartItem[] = [
            { productId: "P1", variantId: 101, quantity: 2, price: 2000 }, // 4000
            { productId: "P2", variantId: 202, quantity: 1, price: 1500 }, // 1500 -> total 5500
        ];

        // URL-aware mock + counter for successive payment intents
        const post = axios.post as unknown as Mock;
        let paymentCall = 0;
        post.mockImplementation((url: string) => {
            if (url.includes("/shipping-options")) {
                return Promise.resolve({
                    data: {
                        standard: 500, // id=1 via mapper
                        priority: [
                            {
                                id: 476,
                                name: "Priority Shipping",
                                price: 900,
                                countries: ["US"],
                            },
                        ], // id=2
                        express: [],
                        economy: [],
                    },
                });
            }
            if (url.includes("/payments/create-payment-intent")) {
                paymentCall += 1;
                return Promise.resolve({
                    data: {
                        clientSecret:
                            paymentCall === 1 ? "cs_first" : "cs_after_change",
                    },
                });
            }
            return Promise.reject(new Error("Unknown URL " + url));
        });

        renderCheckout(items);

        // Fill address → get shipping methods
        await fillAddressOnly();
        const select = await screen.findByRole("combobox");

        // Now complete emails + agree so first payment intent fires
        await fillEmailsAndAgree();

        // First payment intent should have used standard ($5) → 5500 + 500 = 6000
        await waitFor(() => {
            const calls = getPaymentCalls();
            expect(calls.length).toBeGreaterThanOrEqual(1);
            const [, body] = calls.at(-1)!;
            expect(body.amount).toBe(6000);
        });

        // Change to Priority (id=2 → $9) → triggers a NEW payment intent (5500 + 900 = 6400)
        await userEvent.selectOptions(select, "2");

        await waitFor(() => {
            const calls = getPaymentCalls();
            expect(calls.length).toBeGreaterThanOrEqual(2);
            const [, body] = calls.at(-1)!;
            expect(body.amount).toBe(6400);
        });

        // Form stays rendered
        expect(await screen.findByTestId("CheckoutForm")).toBeInTheDocument();

        // Our CheckoutForm mock receives selectedShipping in props — sanity check
        const props = JSON.parse(
            (await screen.findByTestId("cf-props")).textContent || "{}"
        );
        expect(props.selectedShipping).toMatchObject({ id: 2, price: 900 });
        expect(props.email).toBe("user@example.com");
    });

    it("keeps the gated message visible when form is incomplete", async () => {
        const items: CartItem[] = [
            { productId: "P1", variantId: 1, quantity: 1, price: 1000 },
        ];

        // URL-aware mock for consistency (no calls expected here)
        const post = axios.post as unknown as Mock;
        post.mockImplementation((url: string) => {
            if (url.includes("/shipping-options")) {
                return Promise.resolve({
                    data: {
                        standard: 500,
                        priority: [],
                        express: [],
                        economy: [],
                    },
                });
            }
            if (url.includes("/payments/create-payment-intent")) {
                return Promise.resolve({ data: { clientSecret: "cs_unused" } });
            }
            return Promise.reject(new Error("Unknown URL " + url));
        });

        renderCheckout(items);

        // Fill some fields but not all (no confirm email / terms)
        await userEvent.type(
            screen.getByPlaceholderText(/enter your email/i),
            "a@b.com"
        );
        await userEvent.type(
            screen.getByPlaceholderText(/enter first name/i),
            "Grace"
        );

        expect(
            screen.getByText(/please complete all required fields/i)
        ).toBeInTheDocument();

        // No payment intent without full form + terms
        expect(getPaymentCalls().length).toBe(0);
    });
});
