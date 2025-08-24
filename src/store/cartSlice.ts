import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CartItem {
    productId: string; // ID of the product
    variantId: number; // ID of the selected variant
    title: string; // Product title
    image: string; // Product image URL
    color: string; // Selected color name (e.g., "Solid Red")
    size: string; // Selected size (e.g., "XL")
    price: number; // Price in cents
    quantity: number; // Quantity of item
}

interface CartState {
    items: CartItem[];
}

const initialState: CartState = {
    items: JSON.parse(localStorage.getItem("cart") || "[]"),
};

const cartSlice = createSlice({
    name: "cart",
    initialState,
    reducers: {
        addToCart: (state, action: PayloadAction<CartItem>) => {
            const existingItem = state.items.find(
                (item) => item.variantId === action.payload.variantId
            );

            if (existingItem) {
                existingItem.quantity += action.payload.quantity;
            } else {
                state.items.push(action.payload);
            }

            localStorage.setItem("cart", JSON.stringify(state.items)); // ✅ Persist changes
        },

        removeFromCart: (
            state,
            action: PayloadAction<{ productId: string; variantId: number }>
        ) => {
            state.items = state.items.filter(
                (item) =>
                    item.productId !== action.payload.productId ||
                    item.variantId !== action.payload.variantId
            );

            localStorage.setItem("cart", JSON.stringify(state.items)); // ✅ Persist updated cart
        },

        clearCart: (state) => {
            state.items = [];
            localStorage.removeItem("cart"); // ✅ Completely clear storage
        },

        updateQuantity: (
            state,
            action: PayloadAction<{ variantId: number; quantity: number }>
        ) => {
            const item = state.items.find(
                (item) => item.variantId === action.payload.variantId
            );
            if (item) {
                item.quantity = action.payload.quantity;
            }

            localStorage.setItem("cart", JSON.stringify(state.items)); // ✅ Persist changes
        },
    },
});

export const { addToCart, removeFromCart, clearCart, updateQuantity } =
    cartSlice.actions;
export default cartSlice.reducer;
