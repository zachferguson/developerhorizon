import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import { fetchProducts } from "../store/productSlice";
import "../styles/navbar.scss";

const Navbar = () => {
    const dispatch = useDispatch<AppDispatch>();
    const status = useSelector((state: RootState) => state.products.status);

    useEffect(() => {
        if (status === "idle" || status === "failed") {
            dispatch(fetchProducts());
        }
    }, [dispatch, status]);

    const cartItems = useSelector((state: RootState) => state.cart.items);
    const cartCount = cartItems.length;

    return (
        <nav className="navbar">
            <div className="leftSection">
                <div className="navLink">
                    <Link to="/">Home</Link>
                </div>
                <div className="navLink">
                    <Link to="/products">All Products</Link>
                </div>
            </div>

            <div className="rightSection">
                <Link to="/cart" className="cartContainer">
                    <ShoppingCart size={24} color="#fff" />
                    {cartCount > 0 && (
                        <span className="cartBadge">{cartCount}</span>
                    )}
                </Link>
            </div>
        </nav>
    );
};

export default Navbar;
