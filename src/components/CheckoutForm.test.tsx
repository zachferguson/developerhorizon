import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    beforeAll,
    afterAll,
    type MockedFunction,
} from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CheckoutForm from "./CheckoutForm";

// --- Stripe mocks (safe: factory doesn't capture uninitialized vars)
let mockStripe: any = null;
let mockElements: any = null;
vi.mock("@stripe/react-stripe-js", () => ({
    useStripe: () => mockStripe,
    useElements: () => mockElements,
    PaymentElement: () => <div data-testid="payment-element" />,
}));

// --- orderService mock: define vi.fn() INSIDE factory (no top-level refs)
vi.mock("../services/orderService", () => ({
    createOrder: vi.fn(), // we'll import and assert on this below
}));
import { createOrder } from "../services/orderService"; // <-- mocked export

// --- helpers/fixtures
const baseShipping = {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
    country: "US",
    region: "PA",
    city: "Scranton",
    address1: "123 Paper St",
    zip: "18503",
} as const;

const baseCartItems = [
    { productId: 101, variantId: 201, quantity: 2 },
    { productId: 102, variantId: 202, quantity: 1 },
] as const;

function renderForm(
    overrides?: Partial<React.ComponentProps<typeof CheckoutForm>>
) {
    const props: React.ComponentProps<typeof CheckoutForm> = {
        email: "buyer@example.com",
        shipping: { ...baseShipping },
        cartItems: [...baseCartItems] as any,
        selectedShipping: { id: 5, price: 400 } as any,
        ...(overrides ?? {}),
    };
    return render(<CheckoutForm {...props} />);
}

// Make window.location.href writable so redirects are testable
const originalLocation = window.location;
let hrefStore = originalLocation?.href ?? "http://localhost/";
beforeAll(() => {
    Object.defineProperty(window, "location", {
        configurable: true,
        value: {
            get href() {
                return hrefStore;
            },
            set href(v: string) {
                hrefStore = v;
            },
            origin: "http://localhost",
        } as unknown as Location,
    });
});
afterAll(() => {
    Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
    });
});

beforeEach(() => {
    vi.clearAllMocks();
    mockStripe = null;
    mockElements = null;
    hrefStore = "http://localhost/";
});

describe("<CheckoutForm />", () => {
    it("disables submit when Stripe is not ready", () => {
        renderForm();
        expect(screen.getByRole("button", { name: /pay now/i })).toBeDisabled();
    });

    it("shows error and does not create order when confirmPayment returns an error", async () => {
        mockStripe = {
            confirmPayment: vi
                .fn()
                .mockResolvedValue({ error: { message: "Card declined" } }),
        };
        mockElements = {};

        renderForm();
        const btn = screen.getByRole("button", { name: /pay now/i });
        expect(btn).not.toBeDisabled();

        await userEvent.click(btn);

        expect(await screen.findByText(/card declined/i)).toBeInTheDocument();
        expect(createOrder).not.toHaveBeenCalled();
        expect(hrefStore).toBe("http://localhost/");
    });

    it("creates an order and redirects on successful payment", async () => {
        mockStripe = {
            confirmPayment: vi.fn().mockResolvedValue({
                paymentIntent: {
                    id: "pi_123",
                    status: "succeeded",
                    amount: 1234,
                },
            }),
        };
        mockElements = {};

        renderForm({
            email: "buyer@example.com",
            shipping: { ...baseShipping, phone: "555-1212" } as any,
            selectedShipping: { id: 7, price: 599 } as any,
            cartItems: [
                { productId: 10, variantId: 100, quantity: 3 },
                { productId: 11, variantId: 110, quantity: 1 },
            ] as any,
        });

        await userEvent.click(screen.getByRole("button", { name: /pay now/i }));

        await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));

        // 👇 Vitest-typed calls
        const createOrderMock = createOrder as MockedFunction<
            typeof createOrder
        >;
        const [orderDataArg, paymentIdArg] = createOrderMock.mock.calls[0];

        expect(paymentIdArg).toBe("pi_123");
        expect(orderDataArg).toEqual(
            expect.objectContaining({
                customer: expect.objectContaining({
                    email: "buyer@example.com",
                    address: expect.objectContaining({
                        first_name: "Ada",
                        last_name: "Lovelace",
                    }),
                }),
                currency: "USD",
                shipping_method: 7,
                shipping_cost: 599,
                total_price: 1234,
                line_items: [
                    { product_id: 10, variant_id: 100, quantity: 3 },
                    { product_id: 11, variant_id: 110, quantity: 1 },
                ],
            })
        );
        expect(hrefStore).toBe("/order-success");
    });

    it("uses default shipping fallback (method=1, cost=0) when none selected", async () => {
        mockStripe = {
            confirmPayment: vi.fn().mockResolvedValue({
                paymentIntent: {
                    id: "pi_abc",
                    status: "succeeded",
                    amount: 999,
                },
            }),
        };
        mockElements = {};

        renderForm({ selectedShipping: null });

        await userEvent.click(screen.getByRole("button", { name: /pay now/i }));
        await waitFor(() => expect(createOrder).toHaveBeenCalled());

        // 👇 Vitest-typed calls
        const createOrderMock = createOrder as MockedFunction<
            typeof createOrder
        >;
        const [orderData] = createOrderMock.mock.calls[0];

        expect(orderData.shipping_method).toBe(1);
        expect(orderData.shipping_cost).toBe(0);
    });
});
