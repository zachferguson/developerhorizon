import { Product } from "../types/product";
import ProductCard from "./ProductCard";

interface ProductListProps {
    products: Product[];
}

const ProductList: React.FC<ProductListProps> = ({ products }) => {
    return (
        <div>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "16px",
                    alignItems: "stretch", // Ensures all items stretch to the same height
                }}
            >
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
};

export default ProductList;
