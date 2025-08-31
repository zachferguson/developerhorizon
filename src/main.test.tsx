import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---
const renderMock = vi.fn();
const createRootMock = vi.fn(() => ({ render: renderMock }));

vi.mock("react-dom/client", () => ({
    createRoot: createRootMock,
}));

// Provide a fake store so we can assert it’s passed into <Provider>
const fakeStore = {
    dispatch: vi.fn(),
    getState: vi.fn(),
    subscribe: vi.fn(),
};
vi.mock("./store/store.ts", () => ({
    store: fakeStore,
}));

// Keep App super light so we don’t render the whole tree
const AppMock = () => React.createElement("div", null, "App");
vi.mock("./App.tsx", () => ({ default: AppMock }));

describe("main.tsx bootstrapping", () => {
    beforeEach(() => {
        vi.resetModules(); // ensure fresh import of main.tsx
        renderMock.mockClear();
        createRootMock.mockClear();
        document.body.innerHTML = '<div id="root"></div>'; // container expected by main.tsx
    });

    it("creates a root on #root and renders <StrictMode><Provider><App /></Provider></StrictMode>", async () => {
        // Import AFTER mocks + DOM are ready (main.tsx runs on import)
        await import("./main.tsx");

        const rootEl = document.getElementById("root");
        expect(createRootMock).toHaveBeenCalledWith(rootEl);
        expect(renderMock).toHaveBeenCalledTimes(1);

        const rendered = renderMock.mock.calls[0][0];
        expect(React.isValidElement(rendered)).toBe(true);

        // Top-level should be React.StrictMode
        expect(rendered.type).toBe(React.StrictMode);

        // Its child should be <Provider store={fakeStore}>…</Provider>
        const providerEl = Array.isArray(rendered.props.children)
            ? rendered.props.children[0]
            : rendered.props.children;

        // react-redux sets displayName on Provider; otherwise .name works
        const providerTypeName =
            providerEl?.type?.displayName || providerEl?.type?.name;
        expect(providerTypeName).toBe("Provider");
        expect(providerEl.props.store).toBe(fakeStore);

        // And inside Provider we should see our mocked App element
        const appEl = providerEl.props.children;
        expect(appEl.type).toBe(AppMock);
    });
});
