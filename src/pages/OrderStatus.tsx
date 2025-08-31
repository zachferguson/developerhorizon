import { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { useSearchParams, useNavigate } from "react-router-dom";
import { RootState } from "../store/store";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { OrderStatusResponse } from "../types/orderStatus";
import "../styles/orderStatus.scss";

const OrderStatus = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const orderId = searchParams.get("orderId");
    const email = searchParams.get("email");

    const [orderDetails, setOrderDetails] =
        useState<OrderStatusResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const allProducts = useSelector(
        (state: RootState) => state.products.products
    );

    useEffect(() => {
        if (!orderId || !email) {
            setError("Invalid order details. Please check your email.");
            setLoading(false);
            return;
        }

        axios
            .post<OrderStatusResponse>(`${API_BASE_URL}/order-status`, {
                orderId,
                email,
            })
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

    const enrichedOrderItems = useMemo(() => {
        if (!orderDetails) return [];

        return orderDetails.items.map((item) => {
            const product = allProducts.find((p) => p.id === item.product_id);
            const variant = product?.variants.find(
                (v) => v.id === item.variant_id
            );

            const productImage =
                product?.images.find((img) =>
                    img.variant_ids.includes(item.variant_id)
                )?.src ||
                product?.images.find((img) => img.is_default)?.src ||
                product?.images[0]?.src ||
                undefined;

            return {
                title: product?.title || item.title,
                image: productImage,
                variantLabel: variant?.title || item.variant_label,
                sku: item.sku,
                country: item.country,
                quantity: item.quantity,
                //price: item.,
            };
        });
    }, [orderDetails, allProducts]);

    return (
        <div className="order-status-page">
            <h2>Order Status</h2>

            {loading ? (
                <p>Loading order details...</p>
            ) : error ? (
                <p className="error-message">{error}</p>
            ) : orderDetails ? (
                <div className="order-summary">
                    <h3>Order Summary</h3>
                    <p>
                        <strong>Order Status:</strong>{" "}
                        {orderDetails.order_status}
                    </p>
                    <p>
                        <strong>Order Placed:</strong>{" "}
                        {new Date(orderDetails.created_at).toLocaleString()}
                    </p>

                    {orderDetails.tracking_number && (
                        <p>
                            <strong>Tracking Number:</strong>{" "}
                            {orderDetails.tracking_number}{" "}
                            {orderDetails.tracking_url && (
                                <a
                                    href={orderDetails.tracking_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Track Order
                                </a>
                            )}
                        </p>
                    )}

                    <h3>Shipping Details</h3>
                    <p>
                        <strong>Customer:</strong>{" "}
                        {orderDetails.customer.first_name}{" "}
                        {orderDetails.customer.last_name}
                    </p>
                    <p>
                        <strong>Shipping Address:</strong>{" "}
                        {orderDetails.customer.address1},{" "}
                        {orderDetails.customer.city},{" "}
                        {orderDetails.customer.region}{" "}
                        {orderDetails.customer.zip},{" "}
                        {orderDetails.customer.country}
                    </p>

                    <h3>Items Ordered</h3>
                    <div className="order-items">
                        {enrichedOrderItems.map((item, index) => (
                            <div key={index} className="order-item">
                                <img
                                    src={item.image ?? undefined}
                                    alt={item.title}
                                    className="order-item-image"
                                />
                                <div className="order-item-details">
                                    <h4>{item.title}</h4>
                                    <p>
                                        <strong>Variant:</strong>{" "}
                                        {item.variantLabel}
                                    </p>
                                    <p>
                                        <strong>SKU:</strong> {item.sku}
                                    </p>
                                    <p>
                                        <strong>Country:</strong> {item.country}
                                    </p>
                                    <p>
                                        <strong>Quantity:</strong>{" "}
                                        {item.quantity}
                                    </p>
                                    {/* <p>
                                        <strong>Price:</strong> $
                                        {(item.price / 100).toFixed(2)}
                                    </p> */}
                                </div>
                            </div>
                        ))}
                    </div>

                    <h3>Total:</h3>
                    <p>
                        ${(orderDetails.total_price / 100).toFixed(2)}{" "}
                        {orderDetails.currency}
                    </p>
                    <p>
                        Shipping Cost: $
                        {(orderDetails.total_shipping / 100).toFixed(2)}
                    </p>

                    {orderDetails.shipments.length > 0 && (
                        <>
                            <h3>Shipping Information</h3>
                            {orderDetails.shipments.map((shipment, index) => (
                                <p key={index}>
                                    <strong>Carrier:</strong> {shipment.carrier}{" "}
                                    | <strong>Tracking:</strong>{" "}
                                    <a
                                        href={shipment.tracking_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {shipment.tracking_number}
                                    </a>
                                </p>
                            ))}
                        </>
                    )}
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

export default OrderStatus;
