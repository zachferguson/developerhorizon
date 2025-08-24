import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { removeFromCart } from "../store/cartSlice";
import "../styles/cart.scss";
import { Link } from "react-router-dom";

const Cart = () => {
    const cartItems = useSelector((state: RootState) => state.cart.items);
    const dispatch = useDispatch();

    const totalPrice = cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    return (
        <div className="cartPage">
            <h2>Shopping Cart</h2>

            {cartItems.length === 0 ? (
                <p>Your cart is empty.</p>
            ) : (
                <>
                    <div className="cartItems">
                        {cartItems.map((item) => (
                            <div key={item.variantId} className="cartItem">
                                <img
                                    className="cartItemImage"
                                    src={item.image}
                                    alt={item.title}
                                />
                                <div className="cartItemData">
                                    <h3>{item.title}</h3>
                                    <p>
                                        <strong>Quantity:</strong>{" "}
                                        {item.quantity}
                                    </p>
                                    <p>
                                        <strong>Price:</strong> $
                                        {(item.price / 100).toFixed(2)}
                                    </p>
                                    <button
                                        className="removeButton"
                                        onClick={() =>
                                            dispatch(
                                                removeFromCart({
                                                    productId: item.productId,
                                                    variantId: item.variantId,
                                                })
                                            )
                                        }
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <h3>Total: ${(totalPrice / 100).toFixed(2)}</h3>
                    <Link to="/checkout">
                        <button
                            className="checkoutButton"
                            disabled={cartItems.length === 0}
                        >
                            Proceed to Checkout
                        </button>
                    </Link>
                </>
            )}
        </div>
    );
};

export default Cart;
