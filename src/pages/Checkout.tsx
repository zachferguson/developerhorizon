import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { useNavigate } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import axios from "axios";
import "../styles/checkout.scss";
import CheckoutForm from "../components/CheckoutForm";
import {
    ShippingOption,
    ShippingRatesRequestBody,
    ShippingResponse,
} from "../types/shipping";

const stripePromise = loadStripe(
    "pk_live_51OOnBUJN1IbLIgQO7ZLENVz9eGeWHVhE1eO8gkUXd2kx3qHZBQhQYBWLhCeg9SkcIijPsg7IGJi0ByYBp0W1dyOD00R3E2WXhq"
);

interface PaymentIntentResponse {
    clientSecret: string;
}

const Checkout = ({
    openModal,
}: {
    openModal: (content: JSX.Element) => void;
}) => {
    const cartItems = useSelector((state: RootState) => state.cart.items);
    const navigate = useNavigate();

    useEffect(() => {
        if (cartItems.length === 0) {
            navigate("/cart");
        }
    }, [cartItems, navigate]);

    const [email, setEmail] = useState("");
    const [confirmEmail, setConfirmEmail] = useState("");
    const [createAccount, setCreateAccount] = useState(false);
    const [shipping, setShipping] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        country: "US",
        region: "",
        city: "",
        address1: "",
        address2: "",
        zip: "",
    });

    const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>(
        []
    );
    const [selectedShipping, setSelectedShipping] =
        useState<ShippingOption | null>({
            id: 1, // default to "Standard Shipping"
            name: "Standard Shipping",
            price: 0, // set a default price (might be overridden later)
            countries: ["US"],
        });
    const [clientSecret, setClientSecret] = useState("");
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [isReadyToPay, setIsReadyToPay] = useState(false);

    useEffect(() => {
        if (
            email &&
            confirmEmail &&
            confirmEmail === email &&
            shipping.first_name &&
            shipping.last_name &&
            shipping.address1 &&
            shipping.city &&
            shipping.region &&
            shipping.zip &&
            cartItems.length > 0 &&
            agreedToTerms
        ) {
            setIsReadyToPay(true);
        } else {
            setIsReadyToPay(false);
        }
    }, [email, confirmEmail, shipping, cartItems, agreedToTerms]);

    useEffect(() => {
        if (
            !shipping.first_name ||
            !shipping.last_name ||
            !shipping.address1 ||
            !shipping.city ||
            !shipping.region ||
            !shipping.zip
        ) {
            return;
        }

        const requestBody: ShippingRatesRequestBody = {
            address_to: shipping,
            line_items: cartItems.map((item) => ({
                product_id: item.productId,
                variant_id: item.variantId,
                quantity: item.quantity,
            })),
        };

        axios
            .post<ShippingResponse>(
                "https://zfxapi.com/printify/20416540/shipping-options",
                requestBody
            )
            .then((res) => {
                console.log("Raw Shipping Response Data:", res.data);

                // map Printify's raw shipping IDs (e.g., 475) to Printify's expected shipping method numbers
                const SHIPPING_METHOD_MAP: Record<number, number> = {
                    475: 1, // Standard Shipping
                    476: 2, // Priority Shipping
                    477: 3, // Printify Express Shipping
                    478: 4, // Economy Shipping
                };

                // helper function to parse shipping options correctly
                const parseShippingOption = (
                    option: ShippingOption[] | number | undefined,
                    name: string
                ): ShippingOption[] => {
                    if (!option) return [];
                    return Array.isArray(option)
                        ? option.map((opt) => ({
                              ...opt,
                              id: SHIPPING_METHOD_MAP[opt.id] || 1,
                          }))
                        : [
                              {
                                  id: SHIPPING_METHOD_MAP[475] || 1,
                                  name,
                                  price: option,
                                  countries: ["US"],
                              },
                          ];
                };

                const availableShippingOptions: ShippingOption[] = [
                    ...parseShippingOption(
                        res.data.standard,
                        "Standard Shipping"
                    ),
                    ...parseShippingOption(
                        res.data.priority,
                        "Priority Shipping"
                    ),
                    ...parseShippingOption(
                        res.data.express,
                        "Express Shipping"
                    ),
                    ...parseShippingOption(
                        res.data.economy,
                        "Economy Shipping"
                    ),
                ];

                setShippingOptions(availableShippingOptions);

                const defaultShipping =
                    availableShippingOptions.find(
                        (option) => option.id === 1
                    ) ||
                    availableShippingOptions[0] ||
                    null;

                setSelectedShipping(defaultShipping);
            })
            .catch((error) =>
                console.error("Failed to fetch shipping options", error)
            );
    }, [shipping, cartItems]);

    useEffect(() => {
        if (!isReadyToPay || !selectedShipping) return;
        axios
            .post<PaymentIntentResponse>(
                "https://zfxapi.com/payments/create-payment-intent",
                {
                    storeId: "developerhorizon",
                    amount:
                        cartItems.reduce(
                            (sum, item) => sum + item.price * item.quantity,
                            0
                        ) + (selectedShipping?.price || 0),
                    currency: "usd",
                }
            )
            .then((res) => {
                setClientSecret(res.data.clientSecret);
                console.log(`client_secret: ${res.data.clientSecret}`);
            })
            .catch((error) =>
                console.error("Error creating payment intent", error)
            );
    }, [isReadyToPay, selectedShipping, cartItems]);

    return (
        <div className="checkout-page">
            <h2>Checkout</h2>
            <p>Please fill out the details below to complete your order.</p>

            <div className="checkout-section">
                <label>Email Address</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                />
                <label>Confirm Email Address</label>
                <input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="Confirm your email"
                    required
                />
                <label style={{ display: "none" }}>
                    <input
                        type="checkbox"
                        checked={createAccount}
                        onChange={() => setCreateAccount(!createAccount)}
                    />
                    Create an account?
                </label>
                <p style={{ color: "red", fontSize: "0.8em" }}>
                    * this email is where your receipt, confirmation number, and
                    tracking information will be sent. Please ensure it is
                    correct.
                </p>
            </div>

            <div className="checkout-section">
                <label>First Name</label>
                <input
                    type="text"
                    value={shipping.first_name}
                    onChange={(e) =>
                        setShipping({ ...shipping, first_name: e.target.value })
                    }
                    placeholder="Enter first name"
                    required
                />

                <label>Last Name</label>
                <input
                    type="text"
                    value={shipping.last_name}
                    onChange={(e) =>
                        setShipping({ ...shipping, last_name: e.target.value })
                    }
                    placeholder="Enter last name"
                    required
                />

                <label>Address</label>
                <input
                    type="text"
                    value={shipping.address1}
                    onChange={(e) =>
                        setShipping({ ...shipping, address1: e.target.value })
                    }
                    placeholder="Enter address"
                    required
                />

                <label>City</label>
                <input
                    type="text"
                    value={shipping.city}
                    onChange={(e) =>
                        setShipping({ ...shipping, city: e.target.value })
                    }
                    placeholder="Enter city"
                    required
                />

                <label>State/Region</label>
                <input
                    type="text"
                    value={shipping.region}
                    onChange={(e) =>
                        setShipping({ ...shipping, region: e.target.value })
                    }
                    placeholder="Enter state/region"
                    required
                />

                <label>ZIP Code</label>
                <input
                    type="text"
                    value={shipping.zip}
                    onChange={(e) =>
                        setShipping({ ...shipping, zip: e.target.value })
                    }
                    placeholder="Enter ZIP code"
                    required
                />
            </div>

            {shippingOptions.length > 0 && (
                <div className="checkout-section">
                    <label>Shipping Method</label>
                    <select
                        value={selectedShipping?.id || ""}
                        onChange={(e) =>
                            setSelectedShipping(
                                shippingOptions.find(
                                    (option) =>
                                        option.id === Number(e.target.value)
                                ) || null
                            )
                        }
                    >
                        {shippingOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.name} - $
                                {(option.price / 100).toFixed(2)}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            <div className="terms-container">
                <label className="checkbox-label">
                    <span>
                        I understand and agree to the{" "}
                        <span
                            className="terms-link"
                            onClick={(e) => {
                                e.stopPropagation(); // Prevents checkbox from being toggled when clicking the link
                                openModal(
                                    <div>
                                        <h2>Terms and Conditions</h2>
                                        <p>
                                            Welcome to DeveloperHorizon. By
                                            placing an order with us, you agree
                                            to the following terms and
                                            conditions. Please read them
                                            carefully before making a purchase.
                                        </p>
                                        <h3>
                                            1. Order Processing & Fulfillment
                                        </h3>
                                        <p>
                                            All orders are processed immediately
                                            upon purchase. Once an order is
                                            placed, it cannot be modified or
                                            canceled. Orders are fulfilled as
                                            print-on-demand. Production times
                                            vary based on the product and print
                                            provider.
                                        </p>
                                        <h3>2. Shipping & Delivery</h3>
                                        <p>
                                            Shipping times are separate from
                                            production times and vary based on
                                            your location and the selected
                                            shipping method. Once shipped, we
                                            are not responsible for carrier
                                            delays, lost, stolen, or
                                            misdelivered packages. If you
                                            experience an issue, please contact
                                            the shipping provider with your
                                            tracking number. If an order is
                                            returned due to an incorrect or
                                            incomplete address, the customer is
                                            responsible for reshipping costs.
                                        </p>
                                        <h3>3. Returns, Exchanges & Refunds</h3>
                                        <p>
                                            All sales are final since each item
                                            is made to order. We do not accept
                                            returns or exchanges for incorrect
                                            sizes, buyer’s remorse, or personal
                                            preference. If you receive a
                                            defective, misprinted, or incorrect
                                            item, you must contact us within 7
                                            days of delivery with a photo of the
                                            issue. We will work to resolve the
                                            issue by offering a replacement or
                                            refund at our discretion. Refunds
                                            (if applicable) will be processed
                                            back to the original payment method.
                                        </p>
                                        <h3>4. Product Quality & Variations</h3>
                                        <p>
                                            Colors and sizing may vary slightly
                                            due to differences in screen
                                            displays and manufacturing
                                            processes. Apparel sizing is based
                                            on the size charts provided on the
                                            product page. We strongly recommend
                                            checking the size guide before
                                            purchasing.
                                        </p>
                                        <h3>5. Payments & Security</h3>
                                        <p>
                                            All transactions are securely
                                            processed via Stripe. We do not
                                            store or have access to your payment
                                            details. Prices are listed in USD
                                            and are subject to change without
                                            notice.
                                        </p>
                                        <h3>
                                            6. Intellectual Property & Designs
                                        </h3>
                                        <p>
                                            All designs sold on our store are
                                            either created by DeveloperHorizon
                                            or licensed for commercial use.
                                            Unauthorized reproduction or resale
                                            of designs is prohibited. If you
                                            believe a design infringes on your
                                            intellectual property rights, please
                                            contact us.
                                        </p>
                                        <h3>7. Contact & Customer Support</h3>
                                        <p>
                                            For any issues or questions, contact
                                            us at support@developerHorizon.com.
                                            Our team will respond within [X]
                                            business days.
                                        </p>
                                        <p>
                                            By placing an order, you acknowledge
                                            and accept these terms. We
                                            appreciate your support and look
                                            forward to providing you with
                                            high-quality custom apparel!
                                        </p>
                                    </div>
                                );
                            }}
                        >
                            Terms and Conditions
                        </span>
                        .
                    </span>
                    <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={() => setAgreedToTerms(!agreedToTerms)}
                    />
                </label>
            </div>

            {/* stripe loads only after everything is ready */}
            {isReadyToPay ? (
                clientSecret && (
                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                        <CheckoutForm
                            email={email}
                            shipping={shipping}
                            cartItems={cartItems}
                            selectedShipping={selectedShipping}
                        />
                    </Elements>
                )
            ) : (
                <p className="error-message">
                    Please complete all required fields and agree to the terms
                    and conditions to continue.
                </p>
            )}
        </div>
    );
};

export default Checkout;
