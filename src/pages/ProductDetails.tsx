import { useParams } from "react-router-dom";
import { RootState } from "../store/store";
import DOMPurify from "dompurify";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState, useMemo, type ReactNode } from "react";
import { addToCart } from "../store/cartSlice";
import { toast } from "react-toastify";
import "../styles/productDetails.scss";
import { Product } from "../types/product";

const ProductDetails = ({
    openModal,
}: {
    openModal: (content: ReactNode) => void;
}) => {
    const { productId } = useParams<{ productId: string }>();
    const dispatch = useDispatch();
    const allProducts = useSelector(
        (state: RootState) => state.products.products
    );
    const status = useSelector((state: RootState) => state.products.status);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(status === "loading" || allProducts.length === 0);
    }, [status, allProducts]);

    const product = allProducts.find((p: Product) => p.id === productId);

    const sanitizedDescription = useMemo(() => {
        return product ? DOMPurify.sanitize(product.description) : "";
    }, [product]);

    const colorOption = useMemo(() => {
        return product
            ? product.options.find((opt) => opt.type === "color")
            : null;
    }, [product]);

    const colors = useMemo(() => {
        return colorOption?.values || [];
    }, [colorOption]);

    const sizeOption = useMemo(() => {
        return product
            ? product.options.find((opt) => opt.type === "size")
            : null;
    }, [product]);

    const sizes = useMemo(() => {
        return sizeOption?.values || [];
    }, [sizeOption]);

    const [selectedColor, setSelectedColor] = useState<number | null>(null);
    const [selectedSize, setSelectedSize] = useState<number | null>(null);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (colors.length > 0) setSelectedColor(colors[0].id);
        if (sizes.length > 0) setSelectedSize(sizes[0].id);
    }, [colors, sizes]);

    const selectedVariant = useMemo(() => {
        return product?.variants.find(
            (variant) =>
                variant.is_enabled &&
                variant.options.includes(selectedColor!) &&
                variant.options.includes(selectedSize!)
        );
    }, [selectedColor, selectedSize, product]);

    const selectedImageSrc = useMemo(() => {
        if (!selectedVariant) return product?.images[0]?.src;
        const matchingImage = product?.images.find((img) =>
            img.variant_ids.includes(selectedVariant?.id)
        );
        return matchingImage ? matchingImage.src : product?.images[0]?.src;
    }, [selectedVariant, product]);

    const handleAddToCart = () => {
        if (!selectedVariant) {
            toast.error("Please select a valid size and color.");
            return;
        }

        const selectedColorName =
            colors.find((c) => c.id === selectedColor)?.title || "Unknown";
        const selectedSizeName =
            sizes.find((s) => s.id === selectedSize)?.title || "Unknown";

        const cartItem = {
            productId: product!.id,
            variantId: selectedVariant.id,
            title: product!.title,
            image: selectedImageSrc!,
            color: selectedColorName,
            size: selectedSizeName,
            price: selectedVariant.price,
            quantity,
        };

        dispatch(addToCart(cartItem));
        toast.success(`${product!.title} added to cart!`);
    };

    if (loading) {
        return <p>Loading product details...</p>;
    }

    if (!product) {
        return <p>Product not found. Please try again later.</p>;
    }

    return (
        <div className="product-details">
            <h2 className="product-title">{product.title}</h2>

            <div className="product-content">
                <div className="product-image">
                    <img
                        src={selectedImageSrc || undefined}
                        alt={product.title}
                        onClick={() =>
                            openModal(
                                <img
                                    src={selectedImageSrc || undefined}
                                    alt={product.title}
                                    className="modal-image"
                                />
                            )
                        }
                        style={{ cursor: "pointer" }}
                    />
                </div>
                <div className="product-options">
                    <div className="selection-container">
                        <h3>Quantity</h3>
                        <div className="quantity-selector">
                            <button
                                onClick={() =>
                                    setQuantity(Math.max(1, quantity - 1))
                                }
                            >
                                -
                            </button>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setQuantity(
                                        isNaN(val)
                                            ? 1
                                            : Math.min(10, Math.max(1, val))
                                    );
                                }}
                                min="1"
                                max="10"
                            />
                            <button
                                onClick={() =>
                                    setQuantity(Math.min(10, quantity + 1))
                                }
                            >
                                +
                            </button>
                        </div>
                    </div>
                    <div className="selection-container">
                        <h3>Select Color</h3>
                        <div className="color-options">
                            {colors.map((color) => (
                                <label key={color.id}>
                                    <input
                                        type="radio"
                                        name="color"
                                        value={color.id}
                                        checked={selectedColor === color.id}
                                        onChange={() =>
                                            setSelectedColor(color.id)
                                        }
                                        style={{ display: "none" }}
                                    />
                                    <div
                                        className={`color-option ${
                                            selectedColor === color.id
                                                ? "selected"
                                                : ""
                                        }`}
                                        style={{
                                            backgroundColor:
                                                color.colors?.[0] || "#ccc",
                                        }}
                                    />
                                </label>
                            ))}
                        </div>
                        <p className="selected-color-text">
                            <strong>Color:</strong>{" "}
                            {colors.find((c) => c.id === selectedColor)
                                ?.title || "Unknown"}
                        </p>
                    </div>
                    <div className="selection-container">
                        <h3>Select Size</h3>
                        <div className="size-options">
                            {sizes.map((size) => (
                                <label key={size.id}>
                                    <input
                                        type="radio"
                                        name="size"
                                        value={size.id}
                                        checked={selectedSize === size.id}
                                        onChange={() =>
                                            setSelectedSize(size.id)
                                        }
                                        style={{ display: "none" }}
                                    />
                                    <div
                                        className={`size-option ${
                                            selectedSize === size.id
                                                ? "selected"
                                                : ""
                                        }`}
                                    >
                                        {size.title}
                                    </div>
                                </label>
                            ))}
                        </div>
                        <p className="selected-size-text">
                            <strong>Size:</strong>{" "}
                            {sizes.find((s) => s.id === selectedSize)?.title ||
                                "Unknown"}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleAddToCart}
                    className="add-to-cart-button"
                >
                    Add to Cart
                </button>
            </div>
            <div
                className="product-description"
                dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
            />
        </div>
    );
};

export default ProductDetails;
