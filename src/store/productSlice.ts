import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { fetchAllProducts } from "../services/productService";
import { Product } from "../types/product";
import { RootState } from "./store";

interface ProductsState {
    products: Product[];
    status: "idle" | "loading" | "succeeded" | "failed";
    error: string | null;
}

const initialState: ProductsState = {
    products: [],
    status: "idle",
    error: null,
};

export const fetchProducts = createAsyncThunk("products/fetchAll", async () => {
    const response = await fetchAllProducts();
    return response;
});

const productSlice = createSlice({
    name: "products",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchProducts.pending, (state) => {
                state.status = "loading";
            })
            .addCase(
                fetchProducts.fulfilled,
                (state, action: PayloadAction<Product[]>) => {
                    state.status = "succeeded";
                    state.products = action.payload;
                    console.log("Products retrieved:");
                    console.log(action.payload);
                }
            )
            .addCase(fetchProducts.rejected, (state, action) => {
                state.status = "failed";
                state.error =
                    action.error.message || "Failed to fetch products";
            });
    },
});

export const selectProductById = (state: RootState, productId: string) =>
    state.products.products.find((p) => p.id === productId);

export const selectProducts = (state: RootState) => state.products.products;
export const selectStatus = (state: RootState) => state.products.status;
export const selectError = (state: RootState) => state.products.error;

export default productSlice.reducer;
