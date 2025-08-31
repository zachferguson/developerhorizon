import { useState } from "react";
import {
    useStripe,
    useElements,
    PaymentElement,
} from "@stripe/react-stripe-js";
import { createOrder } from "../services/orderService";
import { PrintifyOrderRequest } from "../types/order";
import { CartItem } from "../store/cartSlice";
import { ShippingOption } from "../types/shipping";

interface CheckoutFormProps {
    email: string;
    shipping: {
        first_name: string;
        last_name: string;
        email: string;
        phone?: string;
        country: string;
        region: string;
        city: string;
        address1: string;
        address2?: string;
        zip: string;
    };
    cartItems: CartItem[];
    selectedShipping: ShippingOption | null;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
    email,
    shipping,
    cartItems,
    selectedShipping,
}) => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!stripe || !elements) return;

        setLoading(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.origin + "/order-success",
            },
            redirect: "if_required",
        });

        if (error) {
            console.error("Stripe Error:", error);
            setErrorMessage(error.message ?? "An unknown error occurred.");
            setLoading(false);
            return;
        }

        if (paymentIntent && paymentIntent.status === "succeeded") {
            const orderData: PrintifyOrderRequest = {
                line_items: cartItems.map((item) => ({
                    product_id: item.productId,
                    variant_id: item.variantId,
                    quantity: item.quantity,
                })),
                customer: {
                    email,
                    address: shipping,
                },
                total_price: paymentIntent.amount,
                currency: "USD",
                shipping_method: selectedShipping?.id || 1,
                shipping_cost: selectedShipping?.price || 0,
            };

            try {
                await createOrder(orderData, paymentIntent.id);
                window.location.href = "/order-success";
            } catch (error) {
                console.error("Error submitting order", error);
                setErrorMessage(
                    "Payment succeeded, but order submission failed."
                );
            }
        }

        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="stripe-payment-form">
            <PaymentElement />
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            <button type="submit" disabled={!stripe || loading}>
                {loading ? "Processing..." : "Pay Now"}
            </button>
        </form>
    );
};

export default CheckoutForm;
