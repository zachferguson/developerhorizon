import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "./Footer";

describe("<Footer />", () => {
    it("renders a <footer> landmark with the expected text", () => {
        const { container } = render(<Footer />);

        // landmark exists
        const footer = screen.getByRole("contentinfo");
        expect(footer).toBeInTheDocument();
        expect(footer).toHaveClass("footer");

        // text content (includes © and exact phrase)
        expect(footer).toHaveTextContent(
            "© 2025 DeveloperHorizon. All Rights Reserved."
        );

        // structure sanity: exactly one <p> inside
        expect(container.querySelectorAll("footer p")).toHaveLength(1);
    });

    it("renders the copyright year and brand explicitly", () => {
        render(<Footer />);
        expect(screen.getByText(/2025/)).toBeInTheDocument();
        expect(screen.getByText(/DeveloperHorizon/)).toBeInTheDocument();
    });
});
