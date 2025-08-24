export interface PrintifyOrderRequest {
    line_items: PrintifyLineItem[];
    customer: PrintifyCustomer;
    total_price: number;
    currency: string;
    shipping_method: number;
    shipping_cost: number;
}

export interface PrintifyLineItem {
    product_id: string;
    variant_id: number;
    quantity: number;
}

export interface PrintifyCustomer {
    email: string;
    address: PrintifyCustomerAddress;
}

export interface PrintifyCustomerAddress {
    first_name: string;
    last_name: string;
    phone?: string;
    country: string;
    region: string;
    city: string;
    address1: string;
    address2?: string;
    zip: string;
}

export interface PrintifyOrderResponse {
    id: string; // Printify's unique order ID
    status: string; // Possible values: "pending", "processed", "canceled", etc.
    total_price: number;
    currency: string;
    shipping_method: string;
    shipping_cost: number;
    line_items: PrintifyLineItem[];
    created_at: string; // ISO timestamp
    updated_at: string; // ISO timestamp
}
