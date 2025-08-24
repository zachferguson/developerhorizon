import axios from "axios";
import { Product } from "../types/product";
import {
    ShippingOption,
    ShippingRatesRequestBody,
    ShippingResponse,
} from "../types/shipping";
import { API_BASE_URL, STORE_ID } from "../config";

export const fetchAllProducts = async (): Promise<Product[]> => {
    try {
        const response = await axios.get<{ data: Product[] }>(
            `${API_BASE_URL}/${STORE_ID}/products`
        );

        const filteredProducts = response.data.data.map((product) => {
            // Step 1: Keep only enabled variants
            const enabledVariants = product.variants.filter(
                (variant) => variant.is_enabled
            );

            // Step 2: Extract color IDs from enabled variants
            const usedColorIds = new Set(
                enabledVariants.flatMap((variant) => variant.options)
            );

            // Step 3: Filter colors in product.options based on usedColorIds
            const filteredOptions = product.options.map((option) => {
                if (option.type === "color") {
                    return {
                        ...option,
                        values: option.values.filter((color) =>
                            usedColorIds.has(color.id)
                        ),
                    };
                }
                return option;
            });

            return {
                ...product,
                variants: enabledVariants,
                options: filteredOptions,
            };
        });

        return filteredProducts;
    } catch (err: any) {
        console.error("Error fetching products", err);
        throw new Error("Failed to load products.");
    }
};

export const fetchSingleProduct = async (
    productId: string
): Promise<Product> => {
    // TODO - update this to use the api method I haven't written yet on zfxapi
    try {
        const response = await axios.get<{ data: Product[] }>(
            `${API_BASE_URL}/${STORE_ID}/products`
        );

        // Find the product with the matching id.
        const product = response.data.data.find((p) => p.id === productId);

        if (!product) {
            throw new Error(`Product with id ${productId} not found.`);
        }

        return product;
    } catch (err: any) {
        console.error("Error fetching product", err);
        throw new Error("Failed to load product.");
    }
};

export const fetchShippingOptions = async (
    address: ShippingRatesRequestBody["address_to"],
    cartItems: ShippingRatesRequestBody["line_items"]
): Promise<ShippingOption[]> => {
    try {
        const response = await axios.post<ShippingResponse>(
            `${API_BASE_URL}/${STORE_ID}/shipping-options`,
            { address_to: address, line_items: cartItems }
        );

        const standard: ShippingOption[] = Array.isArray(response.data.standard)
            ? response.data.standard
            : response.data.standard
            ? [
                  {
                      id: 1,
                      name: "Standard Shipping",
                      price: response.data.standard,
                      countries: ["US"],
                  },
              ]
            : [];

        const express: ShippingOption[] = Array.isArray(response.data.express)
            ? response.data.express
            : response.data.express
            ? [
                  {
                      id: 3,
                      name: "Express Shipping",
                      price: response.data.express,
                      countries: ["US"],
                  },
              ]
            : [];

        return [...standard, ...express];
    } catch (err: any) {
        console.error("Error fetching shipping options", err);
        throw new Error("Failed to load shipping options.");
    }
};
