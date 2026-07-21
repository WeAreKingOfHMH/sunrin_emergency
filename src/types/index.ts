export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  options?: any;
  sold_out: boolean;
  backorder: boolean;
  active: boolean;
}

export interface OrderItem {
  id: string; // product id
  productName: string;
  optionName?: string;
  quantity: number;
  price: number;
  backorder: boolean;
}

export interface Order {
  id: string;
  createdAt: number;
  total: number;
  paymentMethod: string;
  status: string;
  dailyOrderNumber?: number;
  items: OrderItem[];
  lane?: string; // We'll infer lane from pos_lanes or cart_session logic if possible
  discountAmount?: number;
  customerName?: string;
  customerStudentId?: string;
}
