import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock the config so STORE_NAME is stable in tests
vi.mock("../config", () => ({
    STORE_NAME: "Nebula Threads",
}));

import Header from "./Header";

describe("<Header />", () => {
    it("renders a header (banner) and the marketing blurb", () => {
        render(<Header />);

        // <header> should be present
        expect(screen.getByRole("banner")).toBeInTheDocument();

        // body copy
        expect(
            screen.getByText(
                /space, science, programming, robotics, and artificial/i
            )
        ).toBeInTheDocument();
    });

    it("renders the mobile logo <img> with alt = STORE_NAME and correct style", () => {
        render(<Header />);
        const img = screen.getByRole("img", { name: /nebula threads/i });
        // src attribute (avoid absolute URL normalization)
        expect(img.getAttribute("src")).toBe("/mobilelogo.png");
        // inline style
        expect(img).toHaveStyle("max-width: 70%");
        // className present
        expect(img).toHaveClass("logo");
    });

    it("includes a <source> for desktop with the expected media and srcset", () => {
        const { container } = render(<Header />);
        const source = container.querySelector("source");
        expect(source).toBeTruthy();
        expect(source?.getAttribute("media")).toBe("(min-width: 768px)");
        expect(source?.getAttribute("srcset")).toBe("/desktoplogo.png");
    });
});
