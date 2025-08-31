import axios from "axios";
import { PrintifyOrderRequest, PrintifyOrderResponse } from "../types/order";
import { API_BASE_URL, STORE_ID } from "../config";

export const createOrder = async (
    orderData: PrintifyOrderRequest,
    paymentId: string
): Promise<PrintifyOrderResponse> => {
    try {
        console.log("📦 Creating order:", orderData);
        console.log(orderData);
        console.log(`sending order to: ${API_BASE_URL}/submit-order`);
        const response = await axios.post<PrintifyOrderResponse>(
            `${API_BASE_URL}/submit-order`,
            {
                storeId: STORE_ID,
                order: orderData,
                stripe_payment_id: paymentId,
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error submitting order:", error);
        throw new Error("Failed to submit order.");
    }
};

export const getOrderStatus = async (
    orderId: string,
    email: string
): Promise<any> => {
    try {
        const response = await axios.post(`${API_BASE_URL}/order-status`, {
            orderId,
            email,
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching order status:", error);
        throw new Error("Failed to fetch order status.");
    }
};
