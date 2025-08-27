import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProductList from "./ProductList";

// Mock the child to isolate ProductList behavior
vi.mock("./ProductCard", () => {
    return {
        default: ({ product }: { product: { id: string; title: string } }) => (
            <div data-testid="product-card" data-id={product.id}>
                {product.title}
            </div>
        ),
    };
});

type MinimalProduct = {
    id: string;
    title: string;
};

const makeProduct = (
    overrides: Partial<MinimalProduct> = {}
): MinimalProduct => ({
    id: cryptoRandomId(),
    title: "Sample Product",
    ...overrides,
});

// tiny id helper so tests aren’t brittle
function cryptoRandomId() {
    // good enough for tests; not security-related
    return Math.random().toString(36).slice(2, 10);
}

describe("<ProductList /> unit", () => {
    it("renders one ProductCard per product", () => {
        const products = [makeProduct(), makeProduct(), makeProduct()];
        render(<ProductList products={products as any} />);

        const cards = screen.getAllByTestId("product-card");
        expect(cards).toHaveLength(3);
    });

    it("passes the correct product props to each ProductCard", () => {
        const products = [
            makeProduct({ id: "p-1", title: "Alpha" }),
            makeProduct({ id: "p-2", title: "Beta" }),
        ];
        render(<ProductList products={products as any} />);

        const cards = screen.getAllByTestId("product-card");
        expect(cards[0]).toHaveTextContent("Alpha");
        expect(cards[0]).toHaveAttribute("data-id", "p-1");
        expect(cards[1]).toHaveTextContent("Beta");
        expect(cards[1]).toHaveAttribute("data-id", "p-2");
    });

    it("renders nothing when products is empty", () => {
        render(<ProductList products={[]} />);
        expect(screen.queryByTestId("product-card")).toBeNull();
    });
});
