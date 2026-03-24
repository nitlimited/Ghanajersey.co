import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  LayoutDashboard, Package, Users, ShoppingCart, DollarSign, 
  CheckCircle, XCircle, Star, Clock, TrendingUp, Eye
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Header, Footer } from "./LandingPage";
import { useAuth, API } from "../App";
import { toast } from "sonner";
import axios from "axios";

const AdminDashboard = () => {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [dashboardRes, pendingRes, vendorsRes, ordersRes, customersRes] = await Promise.all([
        axios.get(`${API}/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/products/pending`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/vendors`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/orders`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/customers`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setDashboard(dashboardRes.data);
      setPendingProducts(pendingRes.data);
      setVendors(vendorsRes.data);
      setOrders(ordersRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProduct = async (productId, status) => {
    try {
      await axios.put(`${API}/admin/products/${productId}/approve`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Product ${status}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update product");
    }
  };

  const handleToggleFeatured = async (productId, featured) => {
    try {
      await axios.put(`${API}/admin/products/${productId}/featured`, { featured }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(featured ? "Product featured" : "Product unfeatured");
      fetchData();
    } catch (error) {
      toast.error("Failed to update product");
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}/status?order_status=${status}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Order status updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update order");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid": return "text-ghana-green bg-ghana-green/10";
      case "pending": return "text-ashanti-gold bg-ashanti-gold/10";
      case "failed": return "text-ghana-red bg-ghana-red/10";
      case "processing": return "text-blue-600 bg-blue-100";
      case "shipped": return "text-purple-600 bg-purple-100";
      case "delivered": return "text-ghana-green bg-ghana-green/10";
      default: return "text-muted-text bg-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bone-white">
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="w-12 h-12 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone-white" data-testid="admin-dashboard">
      <Header />

      <div className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto">
        {/* Title */}
        <div className="mb-12">
          <h1 className="font-cinzel text-2xl md:text-3xl tracking-widest uppercase" data-testid="admin-title">
            Admin Dashboard
          </h1>
          <p className="font-outfit text-muted-text mt-2">Manage your marketplace</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          <div className="bg-white p-6 border border-black/10">
            <div className="flex items-center gap-2 text-muted-text mb-2">
              <DollarSign size={16} />
              <span className="font-outfit text-xs uppercase tracking-wider">Revenue</span>
            </div>
            <span className="font-outfit text-2xl font-medium">${dashboard?.total_revenue?.toFixed(2)}</span>
          </div>
          <div className="bg-white p-6 border border-black/10">
            <div className="flex items-center gap-2 text-muted-text mb-2">
              <ShoppingCart size={16} />
              <span className="font-outfit text-xs uppercase tracking-wider">Orders</span>
            </div>
            <span className="font-outfit text-2xl font-medium">{dashboard?.total_orders}</span>
          </div>
          <div className="bg-white p-6 border border-black/10">
            <div className="flex items-center gap-2 text-muted-text mb-2">
              <Package size={16} />
              <span className="font-outfit text-xs uppercase tracking-wider">Products</span>
            </div>
            <span className="font-outfit text-2xl font-medium">{dashboard?.total_products}</span>
          </div>
          <div className="bg-white p-6 border border-black/10">
            <div className="flex items-center gap-2 text-ashanti-gold mb-2">
              <Clock size={16} />
              <span className="font-outfit text-xs uppercase tracking-wider">Pending</span>
            </div>
            <span className="font-outfit text-2xl font-medium text-ashanti-gold">{dashboard?.pending_products}</span>
          </div>
          <div className="bg-white p-6 border border-black/10">
            <div className="flex items-center gap-2 text-muted-text mb-2">
              <Users size={16} />
              <span className="font-outfit text-xs uppercase tracking-wider">Vendors</span>
            </div>
            <span className="font-outfit text-2xl font-medium">{dashboard?.total_vendors}</span>
          </div>
          <div className="bg-white p-6 border border-black/10">
            <div className="flex items-center gap-2 text-muted-text mb-2">
              <Users size={16} />
              <span className="font-outfit text-xs uppercase tracking-wider">Customers</span>
            </div>
            <span className="font-outfit text-2xl font-medium">{dashboard?.total_customers}</span>
          </div>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="bg-transparent border-b border-black/10 w-full justify-start rounded-none h-auto p-0 mb-8 overflow-x-auto flex-nowrap">
            <TabsTrigger 
              value="pending" 
              className="font-outfit text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4 px-4 whitespace-nowrap"
            >
              Pending ({pendingProducts.length})
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="font-outfit text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4 px-4 whitespace-nowrap"
            >
              Orders
            </TabsTrigger>
            <TabsTrigger 
              value="vendors" 
              className="font-outfit text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4 px-4 whitespace-nowrap"
            >
              Vendors
            </TabsTrigger>
            <TabsTrigger 
              value="customers" 
              className="font-outfit text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4 px-4 whitespace-nowrap"
            >
              Customers
            </TabsTrigger>
          </TabsList>

          {/* Pending Products */}
          <TabsContent value="pending">
            {pendingProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingProducts.map((product) => (
                  <div key={product.product_id} className="bg-white border border-black/10 overflow-hidden" data-testid={`pending-${product.product_id}`}>
                    <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                      <img
                        src={product.images?.[0] || "https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=400"}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-cinzel text-sm tracking-wide uppercase">{product.name}</h3>
                      <p className="font-outfit text-xs text-muted-text mt-1">By {product.vendor_name}</p>
                      <p className="font-outfit text-sm text-muted-text mt-2 line-clamp-2">{product.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-outfit text-lg font-medium">{product.currency} {product.price.toFixed(2)}</span>
                        <span className="font-outfit text-sm text-muted-text">{product.category}</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={() => handleApproveProduct(product.product_id, "approved")}
                          className="flex-1 bg-ghana-green text-white hover:bg-ghana-green/90"
                          data-testid={`approve-${product.product_id}`}
                        >
                          <CheckCircle size={14} className="mr-1" /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleApproveProduct(product.product_id, "rejected")}
                          className="flex-1 border-ghana-red text-ghana-red hover:bg-ghana-red hover:text-white"
                          data-testid={`reject-${product.product_id}`}
                        >
                          <XCircle size={14} className="mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white border border-black/10">
                <CheckCircle size={48} className="mx-auto text-ghana-green mb-4" />
                <h3 className="font-cinzel text-lg tracking-widest uppercase mb-2">All caught up!</h3>
                <p className="font-outfit text-muted-text">No pending products to review</p>
              </div>
            )}
          </TabsContent>

          {/* Orders */}
          <TabsContent value="orders">
            <div className="bg-white border border-black/10 overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-black/10">
                  <tr>
                    <th className="text-left font-outfit text-xs uppercase tracking-wider p-4">Order ID</th>
                    <th className="text-left font-outfit text-xs uppercase tracking-wider p-4">Customer</th>
                    <th className="text-left font-outfit text-xs uppercase tracking-wider p-4">Total</th>
                    <th className="text-left font-outfit text-xs uppercase tracking-wider p-4">Payment</th>
                    <th className="text-left font-outfit text-xs uppercase tracking-wider p-4">Status</th>
                    <th className="text-left font-outfit text-xs uppercase tracking-wider p-4">Date</th>
                    <th className="text-left font-outfit text-xs uppercase tracking-wider p-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.order_id} className="border-b border-black/5" data-testid={`admin-order-${order.order_id}`}>
                      <td className="p-4 font-mono text-sm">{order.order_id}</td>
                      <td className="p-4 font-outfit text-sm">{order.customer_email}</td>
                      <td className="p-4 font-outfit font-medium">{order.currency} {order.total?.toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs uppercase tracking-wider ${getStatusColor(order.payment_status)}`}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs uppercase tracking-wider ${getStatusColor(order.order_status)}`}>
                          {order.order_status}
                        </span>
                      </td>
                      <td className="p-4 font-outfit text-sm text-muted-text">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <Select 
                          value={order.order_status} 
                          onValueChange={(value) => handleUpdateOrderStatus(order.order_id, value)}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs rounded-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Vendors */}
          <TabsContent value="vendors">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vendors.map((vendor) => (
                <div key={vendor.user_id} className="bg-white p-6 border border-black/10" data-testid={`vendor-${vendor.user_id}`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-cinzel">
                      {vendor.name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-outfit font-medium">{vendor.vendor_profile?.brand_name || vendor.name}</h3>
                      <p className="font-outfit text-sm text-muted-text">{vendor.email}</p>
                    </div>
                  </div>
                  {vendor.vendor_profile?.location && (
                    <p className="font-outfit text-sm text-muted-text">Location: {vendor.vendor_profile.location}</p>
                  )}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-black/10">
                    <span className={`px-2 py-1 text-xs uppercase tracking-wider ${vendor.is_active ? 'text-ghana-green bg-ghana-green/10' : 'text-ghana-red bg-ghana-red/10'}`}>
                      {vendor.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="font-outfit text-xs text-muted-text">
                      Joined {new Date(vendor.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Customers */}
          <TabsContent value="customers">
            <div className="bg-white border border-black/10 overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-black/10">
                  <tr>
                    <th className="text-left font-outfit text-xs uppercase tracking-wider p-4">Name</th>
                    <th className="text-left font-outfit text-xs uppercase tracking-wider p-4">Email</th>
                    <th className="text-left font-outfit text-xs uppercase tracking-wider p-4">Status</th>
                    <th className="text-left font-outfit text-xs uppercase tracking-wider p-4">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.user_id} className="border-b border-black/5">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-cinzel text-sm">
                            {customer.name?.charAt(0)}
                          </div>
                          <span className="font-outfit">{customer.name}</span>
                        </div>
                      </td>
                      <td className="p-4 font-outfit text-sm text-muted-text">{customer.email}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs uppercase tracking-wider ${customer.is_active ? 'text-ghana-green bg-ghana-green/10' : 'text-ghana-red bg-ghana-red/10'}`}>
                          {customer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4 font-outfit text-sm text-muted-text">
                        {new Date(customer.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
