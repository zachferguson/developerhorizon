export interface OrderStatusResponse {
    success: boolean;
    order_status: string;
    tracking_number?: string | null;
    tracking_url?: string | null;
    total_price: number; // Price customer paid
    total_shipping: number; // Shipping cost customer paid
    currency: string;
    created_at: string;

    customer: {
        first_name: string;
        last_name: string;
        email: string;
        phone?: string;
        country: string;
        region: string;
        city: string;
        address1: string;
        address2?: string;
        zip: string;
        company?: string | null;
    };

    items: {
        product_id: string;
        variant_id: number;
        quantity: number;
        print_provider_id: number;
        //cost: number; // Merchant cost
        //price: number; // Customer paid price
        //shipping_cost: number;
        status: string;
        title: string;
        variant_label: string;
        sku: string;
        country: string;
        sent_to_production_at?: string | null;
        fulfilled_at?: string | null;
    }[];

    metadata: {
        order_type: string;
        shop_order_id: number | string;
        shop_order_label: string;
        shop_fulfilled_at?: string | null;
    };

    shipping_method: number;
    is_printify_express: boolean;
    is_economy_shipping: boolean;

    shipments: {
        carrier: string;
        tracking_number: string;
        tracking_url: string;
        delivered_at?: string | null;
    }[];

    printify_connect?: {
        url: string;
        id: string;
    } | null;
}
