import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  LayoutDashboard, Package, Users, ShoppingCart, DollarSign, 
  CheckCircle, XCircle, Star, Clock, TrendingUp, Eye, ChevronDown,
  Percent, ThumbsUp, AlertCircle, CreditCard
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
  const [vendorAnalytics, setVendorAnalytics] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [votingStats, setVotingStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorProducts, setVendorProducts] = useState([]);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [dashboardRes, pendingRes, vendorsRes, ordersRes, customersRes, vendorAnalyticsRes, votingRes] = await Promise.all([
        axios.get(`${API}/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/products/pending`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/vendors`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/orders`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/customers`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/analytics/vendors`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/voting-stats`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setDashboard(dashboardRes.data);
      setPendingProducts(pendingRes.data);
      setVendors(vendorsRes.data);
      setOrders(ordersRes.data);
      setCustomers(customersRes.data);
      setVendorAnalytics(vendorAnalyticsRes.data);
      setVotingStats(votingRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorProducts = async (vendorId) => {
    try {
      const res = await axios.get(`${API}/admin/vendors/${vendorId}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVendorProducts(res.data);
      setSelectedVendor(vendorId);
    } catch (error) {
      toast.error("Failed to fetch vendor products");
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
        <Header forceLight={true} stickyAnnouncement={true} />
        <div className="pt-12 flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse">
            <div className="w-12 h-12 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone-white" data-testid="admin-dashboard">
      <Header forceLight={true} stickyAnnouncement={true} />

      <div className="pt-12 pb-24 px-6 md:px-12 max-w-7xl mx-auto">
        {/* Title */}
        <div className="mb-12">
          <h1 className="font-heading text-2xl md:text-3xl tracking-widest uppercase" data-testid="admin-title">
            Admin Dashboard
          </h1>
          <p className="font-body text-muted-text mt-2">Manage your marketplace</p>
        </div>

        {/* Revenue Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-black text-white p-6 border border-black">
            <div className="flex items-center gap-2 text-white/60 mb-2">
              <DollarSign size={16} />
              <span className="font-body text-xs uppercase tracking-wider">Total Revenue</span>
            </div>
            <span className="font-body text-2xl font-medium">${dashboard?.total_revenue?.toFixed(2)}</span>
          </div>
          <div className="bg-ashanti-gold p-6 border border-ashanti-gold">
            <div className="flex items-center gap-2 text-black/60 mb-2">
              <Percent size={16} />
              <span className="font-body text-xs uppercase tracking-wider">Platform Commission (15%)</span>
            </div>
            <span className="font-body text-2xl font-medium">${dashboard?.platform_commission?.toFixed(2)}</span>
          </div>
          <div className="bg-white p-6 border border-black/10">
            <div className="flex items-center gap-2 text-muted-text mb-2">
              <CreditCard size={16} />
              <span className="font-body text-xs uppercase tracking-wider">Vendor Earnings</span>
            </div>
            <span className="font-body text-2xl font-medium">${dashboard?.vendor_earnings_total?.toFixed(2)}</span>
          </div>
          <div className="bg-white p-6 border border-black/10">
            <div className="flex items-center gap-2 text-muted-text mb-2">
              <CheckCircle size={16} />
              <span className="font-body text-xs uppercase tracking-wider">Confirmed Deliveries</span>
            </div>
            <span className="font-body text-2xl font-medium">{dashboard?.confirmed_deliveries || 0}</span>
            {dashboard?.pending_confirmations > 0 && (
              <span className="text-xs text-ashanti-gold ml-2">({dashboard.pending_confirmations} pending)</span>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-12">
          <div className="bg-white p-4 border border-black/10">
            <div className="flex items-center gap-2 text-muted-text mb-1">
              <ShoppingCart size={14} />
              <span className="font-body text-xs uppercase tracking-wider">Orders</span>
            </div>
            <span className="font-body text-xl font-medium">{dashboard?.total_orders}</span>
          </div>
          <div className="bg-white p-4 border border-black/10">
            <div className="flex items-center gap-2 text-muted-text mb-1">
              <Package size={14} />
              <span className="font-body text-xs uppercase tracking-wider">Products</span>
            </div>
            <span className="font-body text-xl font-medium">{dashboard?.total_products}</span>
          </div>
          <div className="bg-white p-4 border border-black/10">
            <div className="flex items-center gap-2 text-ashanti-gold mb-1">
              <Clock size={14} />
              <span className="font-body text-xs uppercase tracking-wider">Pending</span>
            </div>
            <span className="font-body text-xl font-medium text-ashanti-gold">{dashboard?.pending_products}</span>
          </div>
          <div className="bg-white p-4 border border-black/10">
            <div className="flex items-center gap-2 text-muted-text mb-1">
              <Users size={14} />
              <span className="font-body text-xs uppercase tracking-wider">Vendors</span>
            </div>
            <span className="font-body text-xl font-medium">{dashboard?.total_vendors}</span>
          </div>
          <div className="bg-white p-4 border border-black/10">
            <div className="flex items-center gap-2 text-muted-text mb-1">
              <Users size={14} />
              <span className="font-body text-xs uppercase tracking-wider">Customers</span>
            </div>
            <span className="font-body text-xl font-medium">{dashboard?.total_customers}</span>
          </div>
          <div className="bg-white p-4 border border-black/10">
            <div className="flex items-center gap-2 text-muted-text mb-1">
              <ThumbsUp size={14} />
              <span className="font-body text-xs uppercase tracking-wider">Total Votes</span>
            </div>
            <span className="font-body text-xl font-medium">{votingStats?.total_votes || 0}</span>
          </div>
        </div>

        <Tabs defaultValue="vendors" className="w-full">
          <TabsList className="bg-transparent border-b border-black/10 w-full justify-start rounded-none h-auto p-0 mb-8 overflow-x-auto flex-nowrap">
            <TabsTrigger 
              value="vendors" 
              className="font-body text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4 px-4 whitespace-nowrap"
            >
              Vendors & Earnings
            </TabsTrigger>
            <TabsTrigger 
              value="pending" 
              className="font-body text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4 px-4 whitespace-nowrap"
            >
              Pending ({pendingProducts.length})
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="font-body text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4 px-4 whitespace-nowrap"
            >
              Orders
            </TabsTrigger>
            <TabsTrigger 
              value="voting" 
              className="font-body text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4 px-4 whitespace-nowrap"
            >
              Voting Panel
            </TabsTrigger>
            <TabsTrigger 
              value="customers" 
              className="font-body text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4 px-4 whitespace-nowrap"
            >
              Customers
            </TabsTrigger>
          </TabsList>

          {/* Vendors & Earnings Tab */}
          <TabsContent value="vendors">
            <div className="space-y-6">
              {vendorAnalytics.map((vendor) => (
                <div key={vendor.vendor_id} className="bg-white border border-black/10 p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="font-heading text-lg">{vendor.brand_name || vendor.name}</h3>
                      <p className="font-body text-sm text-muted-text">{vendor.email}</p>
                      <span className={`inline-block mt-2 px-2 py-1 text-xs font-body ${vendor.is_active ? 'bg-ghana-green/10 text-ghana-green' : 'bg-ghana-red/10 text-ghana-red'}`}>
                        {vendor.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-black"
                      onClick={() => fetchVendorProducts(vendor.vendor_id)}
                    >
                      View Products ({vendor.total_products})
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="font-body text-xs text-muted-text uppercase tracking-wider">Total Revenue</p>
                      <p className="font-body text-lg font-medium">${vendor.total_revenue.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-body text-xs text-muted-text uppercase tracking-wider">Platform Fee (15%)</p>
                      <p className="font-body text-lg font-medium text-ashanti-gold">${vendor.platform_commission.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-body text-xs text-muted-text uppercase tracking-wider">Net Earnings</p>
                      <p className="font-body text-lg font-medium text-ghana-green">${vendor.net_earnings.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-body text-xs text-muted-text uppercase tracking-wider">Pending Payout</p>
                      <p className="font-body text-lg font-medium">${vendor.pending_payout.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-body text-xs text-muted-text uppercase tracking-wider">Paid Out</p>
                      <p className="font-body text-lg font-medium">${vendor.paid_payout.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-black/10 grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="font-body text-xs text-muted-text">Products</p>
                      <p className="font-body font-medium">{vendor.approved_products} / {vendor.total_products}</p>
                    </div>
                    <div>
                      <p className="font-body text-xs text-muted-text">Orders</p>
                      <p className="font-body font-medium">{vendor.total_orders}</p>
                    </div>
                    <div>
                      <p className="font-body text-xs text-muted-text">Pending Approval</p>
                      <p className="font-body font-medium text-ashanti-gold">{vendor.pending_products}</p>
                    </div>
                    <div>
                      <p className="font-body text-xs text-muted-text">Votes</p>
                      <p className="font-body font-medium">{vendor.total_votes}</p>
                    </div>
                  </div>

                  {/* Vendor Products Dropdown */}
                  {selectedVendor === vendor.vendor_id && vendorProducts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-black/10">
                      <h4 className="font-body text-sm font-semibold mb-3">Products by {vendor.brand_name || vendor.name}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {vendorProducts.map((product) => (
                          <div key={product.product_id} className="flex items-center gap-3 p-3 bg-bone-white">
                            <img src={product.images?.[0]} alt={product.name} className="w-16 h-16 object-cover" />
                            <div className="flex-1 min-w-0">
                              <p className="font-body text-sm font-medium truncate">{product.name}</p>
                              <p className="font-body text-xs text-muted-text">${product.price} • {product.stock} in stock</p>
                              <span className={`text-xs ${product.status === 'approved' ? 'text-ghana-green' : 'text-ashanti-gold'}`}>
                                {product.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {vendorAnalytics.length === 0 && (
                <p className="text-center text-muted-text py-12 font-body">No vendors registered yet</p>
              )}
            </div>
          </TabsContent>

          {/* Pending Products */}
          <TabsContent value="pending">
            {pendingProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingProducts.map((product) => (
                  <div key={product.product_id} className="bg-white border border-black/10 overflow-hidden">
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={product.images?.[0] || "https://via.placeholder.com/400"}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-heading text-sm tracking-wide mb-1">{product.name}</h3>
                      <p className="font-body text-xs text-muted-text mb-2">by {product.vendor_name}</p>
                      <p className="font-body text-lg font-semibold mb-4">${product.price}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-ghana-green hover:bg-ghana-green/80"
                          onClick={() => handleApproveProduct(product.product_id, "approved")}
                        >
                          <CheckCircle size={14} className="mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-ghana-red text-ghana-red hover:bg-ghana-red hover:text-white"
                          onClick={() => handleApproveProduct(product.product_id, "rejected")}
                        >
                          <XCircle size={14} className="mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-text py-12 font-body">No pending products</p>
            )}
          </TabsContent>

          {/* Orders */}
          <TabsContent value="orders">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/10">
                    <th className="text-left font-body text-xs uppercase tracking-wider py-4 px-4">Order ID</th>
                    <th className="text-left font-body text-xs uppercase tracking-wider py-4 px-4">Customer</th>
                    <th className="text-left font-body text-xs uppercase tracking-wider py-4 px-4">Items</th>
                    <th className="text-left font-body text-xs uppercase tracking-wider py-4 px-4">Total</th>
                    <th className="text-left font-body text-xs uppercase tracking-wider py-4 px-4">Payment</th>
                    <th className="text-left font-body text-xs uppercase tracking-wider py-4 px-4">Confirmed</th>
                    <th className="text-left font-body text-xs uppercase tracking-wider py-4 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.order_id} className="border-b border-black/5">
                      <td className="py-4 px-4 font-body text-sm">{order.order_id.slice(-8)}</td>
                      <td className="py-4 px-4">
                        <p className="font-body text-sm">{order.shipping_address?.name || "N/A"}</p>
                        <p className="font-body text-xs text-muted-text">{order.shipping_address?.phone}</p>
                      </td>
                      <td className="py-4 px-4 font-body text-sm">{order.items?.length || 0} items</td>
                      <td className="py-4 px-4 font-body text-sm font-medium">${order.total?.toFixed(2)}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-block px-2 py-1 text-xs font-body ${getStatusColor(order.payment_status)}`}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {order.delivery_confirmed ? (
                          <span className="text-ghana-green text-xs flex items-center gap-1">
                            <CheckCircle size={12} /> Yes
                          </span>
                        ) : (
                          <span className="text-muted-text text-xs flex items-center gap-1">
                            <Clock size={12} /> No
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <Select
                          value={order.order_status}
                          onValueChange={(value) => handleUpdateOrderStatus(order.order_id, value)}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
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
              {orders.length === 0 && (
                <p className="text-center text-muted-text py-12 font-body">No orders yet</p>
              )}
            </div>
          </TabsContent>

          {/* Voting Panel (View Only) */}
          <TabsContent value="voting">
            <div className="bg-white border border-black/10 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading text-lg">Jersey Voting Statistics</h3>
                  <p className="font-body text-sm text-muted-text">View-only panel - votes determined by customers</p>
                </div>
                <div className="text-center">
                  <p className="font-body text-3xl font-bold text-ashanti-gold">{votingStats?.total_votes || 0}</p>
                  <p className="font-body text-xs text-muted-text uppercase">Total Votes</p>
                </div>
              </div>
              
              {votingStats?.top_voted && (
                <div className="bg-ashanti-gold/10 border border-ashanti-gold/30 p-4 flex items-center gap-4">
                  <img 
                    src={votingStats.top_voted.images?.[0]} 
                    alt={votingStats.top_voted.name}
                    className="w-20 h-20 object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-body text-xs text-ashanti-gold uppercase tracking-wider mb-1">Current Leader</p>
                    <h4 className="font-heading text-lg">{votingStats.top_voted.name}</h4>
                    <p className="font-body text-sm text-muted-text">by {votingStats.top_voted.vendor_name}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-body text-2xl font-bold">{votingStats.top_voted.vote_count}</p>
                    <p className="font-body text-xs text-muted-text">votes</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {votingStats?.products?.map((product, index) => (
                <div key={product.product_id} className="bg-white border border-black/10 p-4 flex items-center gap-4">
                  <div className="font-heading text-2xl text-muted-text w-8">#{index + 1}</div>
                  <img 
                    src={product.images?.[0]} 
                    alt={product.name}
                    className="w-16 h-16 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-body text-sm font-medium truncate">{product.name}</h4>
                    <p className="font-body text-xs text-muted-text">{product.vendor_name}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-body text-lg font-bold">{product.vote_count || 0}</p>
                    <p className="font-body text-xs text-muted-text">votes</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Customers */}
          <TabsContent value="customers">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/10">
                    <th className="text-left font-body text-xs uppercase tracking-wider py-4 px-4">Name</th>
                    <th className="text-left font-body text-xs uppercase tracking-wider py-4 px-4">Email</th>
                    <th className="text-left font-body text-xs uppercase tracking-wider py-4 px-4">Joined</th>
                    <th className="text-left font-body text-xs uppercase tracking-wider py-4 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.user_id} className="border-b border-black/5">
                      <td className="py-4 px-4 font-body text-sm">{customer.name}</td>
                      <td className="py-4 px-4 font-body text-sm text-muted-text">{customer.email}</td>
                      <td className="py-4 px-4 font-body text-sm text-muted-text">
                        {new Date(customer.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-block px-2 py-1 text-xs font-body ${customer.is_active ? 'bg-ghana-green/10 text-ghana-green' : 'bg-gray-100 text-muted-text'}`}>
                          {customer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {customers.length === 0 && (
                <p className="text-center text-muted-text py-12 font-body">No customers yet</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
