import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProductCard from "./ProductCard";
import "@testing-library/jest-dom";

// Tiny helper to render components that use <Link/>
const renderWithRouter = (ui: React.ReactElement) =>
    render(<MemoryRouter>{ui}</MemoryRouter>);

// NOTE: We don’t know your full Product type here, so we cast the minimal shape.
// For production-grade tests, create a factory in src/test/utils/factories.ts
// that returns a fully-typed Product with sensible defaults.
type MinimalProduct = {
    id: string;
    title: string;
    images?: { src: string }[];
    variants: { price: number }[];
};

const makeProduct = (
    overrides: Partial<MinimalProduct> = {}
): MinimalProduct => ({
    id: "p-123",
    title: "Laser Wrench",
    images: [{ src: "https://example.com/laser.jpg" }],
    variants: [{ price: 1299 }, { price: 1599 }], // cents
    ...overrides,
});

describe("<ProductCard />", () => {
    it("renders title and image alt", () => {
        const product = makeProduct();
        renderWithRouter(<ProductCard product={product as any} />);

        expect(
            screen.getByRole("heading", { name: /laser wrench/i })
        ).toBeInTheDocument();
        const img = screen.getByRole("img", { name: /laser wrench/i });
        expect(img).toBeInTheDocument();
        // src presence sanity check
        expect(img.getAttribute("src")).toMatch(/laser\.jpg/);
    });

    it("links to the product details page using the id", () => {
        const product = makeProduct({ id: "abc-999" });
        renderWithRouter(<ProductCard product={product as any} />);

        const link = screen.getByRole("link", { name: /laser wrench/i });
        // In jsdom, href on <a> may be absolute or relative; use getAttribute
        expect(link.getAttribute("href")).toBe("/product/abc-999");
    });

    it("shows the lowest variant price in dollars", () => {
        const product = makeProduct({
            variants: [{ price: 2599 }, { price: 1999 }, { price: 3099 }],
        });
        renderWithRouter(<ProductCard product={product as any} />);

        // Component divides by 100; no fixed formatting applied in component
        expect(screen.getByText(/Starting at \$19\.99/)).toBeInTheDocument();
    });

    it("shows N/A when there are no variants", () => {
        const product = makeProduct({ variants: [] });
        renderWithRouter(<ProductCard product={product as any} />);

        expect(screen.getByText(/Starting at \$N\/A/)).toBeInTheDocument();
    });

    it("renders gracefully when there are no images", () => {
        const product = makeProduct({ images: [] });
        renderWithRouter(<ProductCard product={product as any} />);

        const img = screen.getByRole("img", { name: /laser wrench/i });
        // React omits the src attribute if it’s undefined
        expect(img.getAttribute("src")).toBeNull();
    });
});
