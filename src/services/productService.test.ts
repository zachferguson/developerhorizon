import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";

vi.mock("axios", () => ({
    default: { get: vi.fn(), post: vi.fn() },
}));

const mockedAxios = vi.mocked(axios, { deep: true });

type GetResp = Awaited<ReturnType<typeof axios.get>>;
type PostResp = Awaited<ReturnType<typeof axios.post>>;

const okGet = (data: unknown, extra: Partial<GetResp> = {}): GetResp =>
    ({
        data,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
        ...extra,
    } as GetResp);

const okPost = (data: unknown, extra: Partial<PostResp> = {}): PostResp =>
    ({
        data,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
        ...extra,
    } as PostResp);

import { API_BASE_URL, STORE_ID } from "../config";
import {
    fetchAllProducts,
    fetchSingleProduct,
    fetchShippingOptions,
} from "./productService";

describe("productService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("fetchAllProducts", () => {
        it("fetches, filters enabled variants, and filters color options to only used color ids", async () => {
            const productsPayload = {
                data: [
                    {
                        id: "p1",
                        title: "Shirt",
                        variants: [
                            { id: "v1", is_enabled: true, options: [111, 222] },
                            { id: "v2", is_enabled: false, options: [333] },
                            { id: "v3", is_enabled: true, options: [222] },
                        ],
                        options: [
                            {
                                type: "color",
                                values: [
                                    { id: 111, title: "Red" },
                                    { id: 222, title: "Blue" },
                                    { id: 333, title: "Green" },
                                ],
                            },
                            {
                                type: "size",
                                values: [{ id: "S" }, { id: "M" }],
                            },
                        ],
                    },
                    {
                        id: "p2",
                        title: "Hat",
                        variants: [
                            { id: "hv1", is_enabled: true, options: [999] },
                        ],
                        options: [
                            {
                                type: "color",
                                values: [
                                    { id: 999, title: "Black" },
                                    { id: 123, title: "Pink" },
                                ],
                            },
                        ],
                    },
                ],
            };

            mockedAxios.get.mockResolvedValueOnce(okGet(productsPayload));

            const result = await fetchAllProducts();

            expect(mockedAxios.get).toHaveBeenCalledTimes(1);
            expect(mockedAxios.get).toHaveBeenCalledWith(
                `${API_BASE_URL}/${STORE_ID}/products`
            );

            // p1: only enabled variants (v1, v3) remain
            const p1 = result.find((p: any) => p.id === "p1")!;
            expect(p1.variants.map((v: any) => v.id)).toEqual(["v1", "v3"]);
            // color values filtered to 111 & 222 only
            const p1ColorValues = p1.options.find(
                (o: any) => o.type === "color"
            )!.values;
            expect(p1ColorValues.map((c: any) => c.id)).toEqual([111, 222]);
            // non-color options unchanged
            const p1Size = p1.options.find((o: any) => o.type === "size")!;
            expect(p1Size.values).toEqual([{ id: "S" }, { id: "M" }]);

            // p2: keeps its single enabled variant; color filters to [999]
            const p2 = result.find((p: any) => p.id === "p2")!;
            expect(p2.variants.map((v: any) => v.id)).toEqual(["hv1"]);
            const p2ColorValues = p2.options.find(
                (o: any) => o.type === "color"
            )!.values;
            expect(p2ColorValues.map((c: any) => c.id)).toEqual([999]);
        });

        it("logs and throws a friendly error on failure", async () => {
            const err = new Error("boom");
            mockedAxios.get.mockRejectedValueOnce(err);
            const errorSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});

            await expect(fetchAllProducts()).rejects.toThrow(
                "Failed to load products."
            );
            expect(errorSpy).toHaveBeenCalledWith(
                "Error fetching products",
                err
            );

            errorSpy.mockRestore();
        });
    });

    describe("fetchSingleProduct", () => {
        it("returns the product by id when present", async () => {
            const productsPayload = {
                data: [
                    { id: "p1", title: "One" },
                    { id: "p2", title: "Two" },
                ],
            };

            mockedAxios.get.mockResolvedValueOnce(okGet(productsPayload));

            const result = await fetchSingleProduct("p2");
            expect(mockedAxios.get).toHaveBeenCalledWith(
                `${API_BASE_URL}/${STORE_ID}/products`
            );
            expect(result).toEqual({ id: "p2", title: "Two" });
        });

        it("throws generic error when product id is missing (and logs the internal error)", async () => {
            const productsPayload = { data: [{ id: "p1" }] };

            mockedAxios.get.mockResolvedValueOnce(okGet(productsPayload));
            const errorSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});

            // Note: the service throws "Product with id ... not found." inside try,
            // then catch replaces it with "Failed to load product."
            await expect(fetchSingleProduct("nope")).rejects.toThrow(
                "Failed to load product."
            );
            expect(errorSpy).toHaveBeenCalled(); // "Error fetching product", <Error>

            errorSpy.mockRestore();
        });

        it("logs and throws on request failure", async () => {
            const err = new Error("network bad");
            mockedAxios.get.mockRejectedValueOnce(err);
            const errorSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});

            await expect(fetchSingleProduct("p1")).rejects.toThrow(
                "Failed to load product."
            );
            expect(errorSpy).toHaveBeenCalledWith(
                "Error fetching product",
                err
            );

            errorSpy.mockRestore();
        });
    });

    describe("fetchShippingOptions", () => {
        const address = { country: "US", zip: "19104" } as any;
        const line_items = [{ sku: "x", quantity: 1 }] as any;

        it("POSTs to /shipping-options and returns combined options when arrays are provided", async () => {
            const shippingPayload = {
                standard: [
                    {
                        id: 1,
                        name: "Standard Shipping",
                        price: 8.5,
                        countries: ["US"],
                    },
                ],
                express: [
                    {
                        id: 3,
                        name: "Express Shipping",
                        price: 19.99,
                        countries: ["US"],
                    },
                ],
            };

            mockedAxios.post.mockResolvedValueOnce(okPost(shippingPayload));

            const result = await fetchShippingOptions(address, line_items);

            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockedAxios.post).toHaveBeenCalledWith(
                `${API_BASE_URL}/${STORE_ID}/shipping-options`,
                { address_to: address, line_items }
            );
            expect(result).toEqual([
                {
                    id: 1,
                    name: "Standard Shipping",
                    price: 8.5,
                    countries: ["US"],
                },
                {
                    id: 3,
                    name: "Express Shipping",
                    price: 19.99,
                    countries: ["US"],
                },
            ]);
        });

        it("coerces numeric standard/express into default option objects", async () => {
            const shippingPayload = {
                standard: 12.5,
                express: 29,
            };

            mockedAxios.post.mockResolvedValueOnce(okPost(shippingPayload));

            const result = await fetchShippingOptions(address, line_items);

            expect(result).toEqual([
                {
                    id: 1,
                    name: "Standard Shipping",
                    price: 12.5,
                    countries: ["US"],
                },
                {
                    id: 3,
                    name: "Express Shipping",
                    price: 29,
                    countries: ["US"],
                },
            ]);
        });

        it("returns empty array when neither standard nor express is present", async () => {
            mockedAxios.post.mockResolvedValueOnce(okPost({}));

            const result = await fetchShippingOptions(address, line_items);
            expect(result).toEqual([]);
        });

        it("logs and throws a friendly error on failure", async () => {
            const err = new Error("rates down");
            mockedAxios.post.mockRejectedValueOnce(err);
            const errorSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});

            await expect(
                fetchShippingOptions(address, line_items)
            ).rejects.toThrow("Failed to load shipping options.");
            expect(errorSpy).toHaveBeenCalledWith(
                "Error fetching shipping options",
                err
            );

            errorSpy.mockRestore();
        });
    });
});
