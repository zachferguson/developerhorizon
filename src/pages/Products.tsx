import { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import ProductList from "../components/ProductList";
import "../styles/product.scss";

const Products = () => {
    const allProducts = useSelector(
        (state: RootState) => state.products.products
    );
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // extract unique tags and count occurrences
    const tagCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        allProducts.forEach((product) => {
            product.tags.forEach((tag) => {
                counts[tag] = (counts[tag] || 0) + 1;
            });
        });
        return counts;
    }, [allProducts]);

    // determine which tags should be enabled (intersection logic)
    const availableTags = useMemo(() => {
        if (selectedTags.length === 0) return Object.keys(tagCounts);
        return Object.keys(tagCounts).filter((tag) =>
            allProducts.some(
                (product) =>
                    product.tags.includes(tag) &&
                    product.tags.some((t) => selectedTags.includes(t))
            )
        );
    }, [selectedTags, allProducts]);

    // filter products based on selected tags
    const filteredProducts = useMemo(() => {
        if (selectedTags.length === 0) return allProducts;
        return allProducts.filter((product) =>
            selectedTags.some((tag) => product.tags.includes(tag))
        );
    }, [selectedTags, allProducts]);

    // toggle tag selection
    const toggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    return (
        <div className="productsPage">
            <button
                className="toggleFilterButton"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
                {isFilterOpen ? "Hide Filters" : "Show Filters"}
            </button>

            {isFilterOpen && (
                <div className="tagFilter">
                    {Object.entries(tagCounts).map(([tag, count]) => (
                        <button
                            key={tag}
                            className={`tag ${
                                selectedTags.includes(tag) ? "selected" : ""
                            } ${availableTags.includes(tag) ? "" : "disabled"}`}
                            onClick={() => toggleTag(tag)}
                            disabled={!availableTags.includes(tag)}
                        >
                            {tag} ({count})
                        </button>
                    ))}
                </div>
            )}

            <ProductList products={filteredProducts} />
        </div>
    );
};

export default Products;
