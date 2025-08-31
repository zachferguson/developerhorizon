import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import ProductDetails from "./ProductDetails";
import { addToCart } from "../store/cartSlice";

const { params, sanitizeSpy, toastSuccess, toastError } = vi.hoisted(() => ({
    params: { productId: "P1" as string },
    sanitizeSpy: vi.fn((html: string) => `SANITIZED:${html}`),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
}));

// Mock react-router-dom and inject dynamic params
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual<typeof import("react-router-dom")>(
        "react-router-dom"
    );
    return {
        ...actual,
        useParams: () => params, // <- uses the hoisted object
    };
});

// Hoisted factories can now safely reference the hoisted spies
vi.mock("dompurify", () => ({
    default: { sanitize: sanitizeSpy },
}));

vi.mock("react-toastify", () => ({
    toast: { success: toastSuccess, error: toastError },
}));

function makeStore(
    preloadedProducts: any[],
    status: "idle" | "loading" | "succeeded" | "failed" = "succeeded"
) {
    const preloadedState = {
        products: { products: preloadedProducts, status, error: null },
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

function renderWithStore(store = makeStore([])) {
    const openModal = vi.fn();
    render(
        <Provider store={store}>
            <ProductDetails openModal={openModal} />
        </Provider>
    );
    return { openModal, store };
}

const prodBase = {
    id: "P1",
    title: "Hoodie Mk I",
    description: "<b>bold</b>",
    options: [
        {
            type: "color",
            values: [
                { id: 100, title: "Red", colors: ["#ff0000"] },
                { id: 101, title: "Blue", colors: ["#0000ff"] },
            ],
        },
        {
            type: "size",
            values: [
                { id: 200, title: "M" },
                { id: 201, title: "L" },
            ],
        },
    ],
    variants: [
        { id: 1000, is_enabled: true, price: 2599, options: [100, 200] }, // Red M
        { id: 1001, is_enabled: true, price: 2699, options: [101, 201] }, // Blue L
        { id: 9999, is_enabled: false, price: 1999, options: [101, 200] }, // Blue M (disabled)
    ],
    images: [
        { src: "default.jpg", variant_ids: [] },
        { src: "redM.jpg", variant_ids: [1000] },
        { src: "blueL.jpg", variant_ids: [1001] },
    ],
} as const;

describe("<ProductDetails />", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sanitizeSpy.mockClear();
        toastSuccess.mockClear();
        toastError.mockClear();
    });

    it("shows loading when slice is loading", () => {
        const store = makeStore([], "loading");
        renderWithStore(store);
        expect(
            screen.getByText(/loading product details/i)
        ).toBeInTheDocument();
    });

    it("shows not-found when product is absent", () => {
        const store = makeStore([{ ...prodBase, id: "OTHER" }], "succeeded");
        renderWithStore(store);
        expect(screen.getByText(/product not found/i)).toBeInTheDocument();
    });

    it("renders title, sanitizes description, defaults to first color/size, and opens modal on image click", async () => {
        const store = makeStore([prodBase]);
        const { openModal } = renderWithStore(store);

        expect(
            screen.getByRole("heading", { name: prodBase.title })
        ).toBeInTheDocument();

        const desc = screen.getByText(/^SANITIZED:/);
        expect(desc).toBeInTheDocument();
        expect(sanitizeSpy).toHaveBeenCalledWith(prodBase.description);

        const img = screen.getByRole("img", {
            name: prodBase.title,
        }) as HTMLImageElement;
        expect(img.src).toMatch(/redM\.jpg$/); // default Red+M

        await userEvent.click(img);
        expect(openModal).toHaveBeenCalledTimes(1);
    });

    it("quantity clamps between 1 and 10 (buttons & manual input)", async () => {
        const store = makeStore([prodBase]);
        renderWithStore(store);

        const dec = screen.getByRole("button", { name: "-" });
        const inc = screen.getByRole("button", { name: "+" });
        const input = screen.getByRole("spinbutton") as HTMLInputElement;

        expect(input.value).toBe("1");
        await userEvent.click(inc);
        await userEvent.click(inc);
        expect(input.value).toBe("3");

        await userEvent.clear(input);
        await userEvent.type(input, "42");
        expect(input.value).toBe("10");

        for (let i = 0; i < 15; i++) await userEvent.click(dec);
        expect(input.value).toBe("1");
    });

    it("add-to-cart happy path dispatches addToCart with expected payload and shows success toast", async () => {
        const store = makeStore([prodBase]);
        const spyDispatch = vi.spyOn(store, "dispatch");
        renderWithStore(store);

        await userEvent.click(
            screen.getByRole("button", { name: /add to cart/i })
        );

        const calls = (spyDispatch as any).mock.calls;
        const action = calls[calls.length - 1][0];
        expect(action.type).toBe(addToCart.type);
        expect(action.payload).toEqual(
            expect.objectContaining({
                productId: "P1",
                variantId: 1000,
                title: prodBase.title,
                image: "redM.jpg",
                color: "Red",
                size: "M",
                price: 2599,
                quantity: 1,
            })
        );
        expect(toastSuccess).toHaveBeenCalledWith(
            `${prodBase.title} added to cart!`
        );
    });

    it("switching to Blue + L chooses variant 1001 and image blueL.jpg", async () => {
        const store = makeStore([prodBase]);
        const spyDispatch = vi.spyOn(store, "dispatch");
        renderWithStore(store);

        // Click the second color label (Blue)
        const colorSection = screen
            .getByText(/select color/i)
            .closest(".selection-container") as HTMLElement;
        const colorLabels = colorSection.querySelectorAll("label");
        await userEvent.click(colorLabels[1]);

        // Click the second size label (L)
        const sizeSection = screen
            .getByText(/select size/i)
            .closest(".selection-container") as HTMLElement;
        const sizeLabels = sizeSection.querySelectorAll("label");
        await userEvent.click(sizeLabels[1]);

        const img = screen.getByRole("img", {
            name: prodBase.title,
        }) as HTMLImageElement;
        expect(img.src).toMatch(/blueL\.jpg$/);

        await userEvent.click(
            screen.getByRole("button", { name: /add to cart/i })
        );
        const calls = (spyDispatch as any).mock.calls;
        const action = calls[calls.length - 1][0];
        expect(action.type).toBe(addToCart.type);
        expect(action.payload.variantId).toBe(1001);
    });

    it("shows an error toast and does not dispatch when no enabled variant matches", async () => {
        const tricky = {
            ...prodBase,
            variants: [
                {
                    id: 1001,
                    is_enabled: true,
                    price: 2699,
                    options: [101, 201],
                },
            ], // only Blue+L
            images: [
                { src: "default.jpg", variant_ids: [] },
                { src: "blueL.jpg", variant_ids: [1001] },
            ],
        };
        const store = makeStore([tricky]);
        const spyDispatch = vi.spyOn(store, "dispatch");
        renderWithStore(store);

        await userEvent.click(
            screen.getByRole("button", { name: /add to cart/i })
        );

        expect(toastError).toHaveBeenCalledWith(
            "Please select a valid size and color."
        );
        const types = (spyDispatch as any).mock.calls.map(
            (c: any[]) => c[0].type
        );
        expect(types).not.toContain(addToCart.type);
    });
});
