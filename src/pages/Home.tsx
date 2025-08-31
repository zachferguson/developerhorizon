import { STORE_NAME, STORE_WELCOME } from "../config";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { useEffect, useState } from "react";
import ProductList from "../components/ProductList";
import "../styles/home.scss";

const Home = () => {
    const allProducts = useSelector(
        (state: RootState) => state.products.products
    );
    const [featuredProducts, setFeaturedProducts] = useState<
        typeof allProducts
    >([]);

    useEffect(() => {
        if (allProducts.length > 0) {
            const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
            setFeaturedProducts(shuffled.slice(0, 5));
        }
    }, [allProducts]);

    return (
        <div className="home-container">
            <h2>{`Welcome to ${STORE_NAME}`}</h2>
            <p>{STORE_WELCOME}</p>

            {featuredProducts.length > 0 && (
                <div className="featured-products">
                    <h3>Featured Products</h3>
                    <ProductList products={featuredProducts} />
                </div>
            )}
        </div>
    );
};

export default Home;
