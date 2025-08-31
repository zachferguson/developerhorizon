import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "./NotFound";

describe("<NotFound />", () => {
    it("renders the NotFound text", () => {
        render(<NotFound />);
        expect(screen.getByText(/notfound/i)).toBeInTheDocument();
    });
});
