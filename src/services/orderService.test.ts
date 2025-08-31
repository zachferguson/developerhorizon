import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";

vi.mock("axios", () => ({
    default: { post: vi.fn() },
}));

const mockedAxios = vi.mocked(axios, { deep: true });

type PostResp = Awaited<ReturnType<typeof axios.post>>;
const ok = (data: unknown, extra: Partial<PostResp> = {}): PostResp =>
    ({
        data,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
        ...extra,
    } as PostResp);

import { API_BASE_URL, STORE_ID } from "../config";
import { createOrder, getOrderStatus } from "./orderService";

describe("orderService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("createOrder", () => {
        it("POSTs to /submit-order with storeId, order, and stripe_payment_id and returns data", async () => {
            const orderData: any = { items: [{ sku: "sku-123", quantity: 2 }] };
            const paymentId = "pi_12345";
            const responsePayload = { id: "order_1", status: "submitted" };

            mockedAxios.post.mockResolvedValueOnce(ok(responsePayload));

            const result = await createOrder(orderData, paymentId);

            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockedAxios.post).toHaveBeenCalledWith(
                `${API_BASE_URL}/submit-order`,
                {
                    storeId: STORE_ID,
                    order: orderData,
                    stripe_payment_id: paymentId,
                }
            );
            expect(result).toEqual(responsePayload);
        });

        it("logs and throws a friendly error when the request fails", async () => {
            const orderData: any = { items: [] };
            const paymentId = "pi_fail";
            const err = new Error("network error");

            mockedAxios.post.mockRejectedValueOnce(err);
            const errorSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});

            await expect(createOrder(orderData, paymentId)).rejects.toThrow(
                "Failed to submit order."
            );

            expect(errorSpy).toHaveBeenCalledWith(
                "Error submitting order:",
                err
            );
            errorSpy.mockRestore();
        });
    });

    describe("getOrderStatus", () => {
        it("POSTs to /order-status with orderId and email and returns data", async () => {
            const orderId = "order_1";
            const email = "person@example.com";
            const responsePayload = { status: "in_production" };

            mockedAxios.post.mockResolvedValueOnce(ok(responsePayload));

            const result = await getOrderStatus(orderId, email);

            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockedAxios.post).toHaveBeenCalledWith(
                `${API_BASE_URL}/order-status`,
                { orderId, email }
            );
            expect(result).toEqual(responsePayload);
        });

        it("logs and throws a friendly error when the status fetch fails", async () => {
            const orderId = "order_2";
            const email = "person@example.com";
            const err = new Error("bad gateway");

            mockedAxios.post.mockRejectedValueOnce(err);
            const errorSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});

            await expect(getOrderStatus(orderId, email)).rejects.toThrow(
                "Failed to fetch order status."
            );

            expect(errorSpy).toHaveBeenCalledWith(
                "Error fetching order status:",
                err
            );
            errorSpy.mockRestore();
        });
    });
});
