import { PrintifyCustomerAddress, PrintifyLineItem } from "./order";

export interface ShippingRatesRequestBody {
    address_to: PrintifyCustomerAddress;
    line_items: PrintifyLineItem[];
}

export interface ShippingOption {
    id: number;
    name: string;
    price: number; // Price in cents (e.g., 499 = $4.99)
    countries: string[];
}

export interface ShippingResponse {
    standard?: ShippingOption[] | number;
    priority?: ShippingOption[] | number;
    express?: ShippingOption[] | number;
    economy?: ShippingOption[] | number;
}
