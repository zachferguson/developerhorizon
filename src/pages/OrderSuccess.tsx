import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import "../styles/orderSuccess.scss";
import { API_BASE_URL } from "../config";
import { OrderStatusResponse } from "../types/orderStatus";

const OrderSuccess = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId =
        searchParams.get("orderId") || localStorage.getItem("orderId");
    const email = localStorage.getItem("orderEmail");
    const [orderDetails, setOrderDetails] =
        useState<OrderStatusResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!orderId || !email) {
            setError("No order ID found. Please check your email for details.");
            setLoading(false);
            return;
        }

        axios
            .get<OrderStatusResponse>(
                `${API_BASE_URL}/order-status/${orderId}/${email}`
            )
            .then((res) => {
                setOrderDetails(res.data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching order details:", err);
                setError("Unable to retrieve order details.");
                setLoading(false);
            });
    }, [orderId, email]);

    return (
        <div className="order-success-page">
            <h2>Thank You for Your Order! 🎉</h2>
            <p>
                Your order has been successfully placed. You will receive an
                email confirmation soon.
            </p>

            {loading ? (
                <p>Loading order details...</p>
            ) : error ? (
                <p className="error-message">{error}</p>
            ) : orderDetails ? (
                <div className="order-summary">
                    <h3>Order Summary</h3>
                    <p>
                        {orderDetails.success
                            ? "Order successful!"
                            : "Order failed."}
                    </p>
                    <p>
                        <strong>Status:</strong> {orderDetails.order_status}
                    </p>

                    <div className="order-items">
                        {orderDetails.items.map((item) => (
                            <div key={item.variant_id} className="order-item">
                                <p>
                                    <strong>Product ID:</strong>{" "}
                                    {item.product_id}
                                </p>
                                <p>
                                    <strong>Variant ID:</strong>{" "}
                                    {item.variant_id}
                                </p>
                                <p>
                                    <strong>Quantity:</strong> {item.quantity}
                                </p>
                            </div>
                        ))}
                    </div>

                    <h3>
                        Total: ${(orderDetails.total_price / 100).toFixed(2)}{" "}
                        {orderDetails.currency}
                    </h3>
                    <p>
                        Shipping Cost: $
                        {(orderDetails.total_shipping / 100).toFixed(2)}
                    </p>
                </div>
            ) : (
                <p>No order details available.</p>
            )}

            <button className="return-button" onClick={() => navigate("/")}>
                Continue Shopping
            </button>
        </div>
    );
};

export default OrderSuccess;
