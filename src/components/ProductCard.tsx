import { Product } from "../types/product";
import { Link } from "react-router-dom";
import "../styles/productCard.scss";

interface ProductCardProps {
    product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
    return (
        <div className="product-card">
            <Link
                to={`/product/${product.id}`}
                style={{ textDecoration: "none" }}
            >
                <img
                    src={product.images?.[0]?.src || undefined}
                    alt={product.title}
                />
                <div className="product-card-content">
                    <h3>{product.title}</h3>
                    <p>
                        Starting at $
                        {product.variants.length > 0
                            ? Math.min(
                                  ...product.variants.map((v) => v.price)
                              ) / 100
                            : "N/A"}
                    </p>
                </div>
            </Link>
        </div>
    );
};

export default ProductCard;
