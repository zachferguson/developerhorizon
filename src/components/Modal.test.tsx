import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "./Modal";

describe("<Modal />", () => {
    it("returns null when closed", () => {
        const onClose = vi.fn();
        const { container } = render(
            <Modal isOpen={false} onClose={onClose}>
                <p>Hidden content</p>
            </Modal>
        );
        expect(container.querySelector(".modal-overlay")).toBeNull();
    });

    it("renders overlay, content, and children when open", () => {
        const onClose = vi.fn();
        const { container } = render(
            <Modal isOpen={true} onClose={onClose}>
                <p>Visible content</p>
            </Modal>
        );

        const overlay = container.querySelector(".modal-overlay");
        const content = container.querySelector(".modal-content");

        expect(overlay).toBeInTheDocument();
        expect(content).toBeInTheDocument();
        expect(screen.getByText("Visible content")).toBeInTheDocument();
    });

    it("clicking the overlay calls onClose", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        const { container } = render(
            <Modal isOpen={true} onClose={onClose}>
                <p>Content</p>
            </Modal>
        );

        const overlay = container.querySelector(
            ".modal-overlay"
        ) as HTMLElement;
        await user.click(overlay);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("clicking inside the content does NOT call onClose (stopPropagation)", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        const { container } = render(
            <Modal isOpen={true} onClose={onClose}>
                <button>Inner button</button>
            </Modal>
        );

        const content = container.querySelector(
            ".modal-content"
        ) as HTMLElement;
        await user.click(content);
        expect(onClose).not.toHaveBeenCalled();

        // also clicking a child inside should not bubble to overlay
        await user.click(screen.getByText("Inner button"));
        expect(onClose).not.toHaveBeenCalled();
    });

    it("clicking the close button calls onClose", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(
            <Modal isOpen={true} onClose={onClose}>
                <p>Content</p>
            </Modal>
        );

        // the "✖" button is a real <button>
        const close = screen.getByRole("button", { name: "✖" });
        await user.click(close);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
