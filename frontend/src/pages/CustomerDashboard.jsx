import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Package, Heart, User, Settings, ChevronRight, MapPin, Clock } from "lucide-react";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Header, Footer } from "./LandingPage";
import { useAuth, API } from "../App";
import axios from "axios";

const CustomerDashboard = () => {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, wishlistRes] = await Promise.all([
          axios.get(`${API}/orders`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/wishlist`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setOrders(ordersRes.data);
        setWishlist(wishlistRes.data.items || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const getStatusColor = (status) => {
    switch (status) {
      case "paid": return "text-ghana-green";
      case "pending": return "text-ashanti-gold";
      case "failed": return "text-ghana-red";
      case "processing": return "text-blue-600";
      case "shipped": return "text-purple-600";
      case "delivered": return "text-ghana-green";
      default: return "text-muted-text";
    }
  };

  return (
    <div className="min-h-screen bg-bone-white" data-testid="customer-dashboard">
      <Header />

      <div className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto">
        {/* Welcome */}
        <div className="mb-12">
          <h1 className="font-cinzel text-2xl md:text-3xl tracking-widest uppercase" data-testid="dashboard-title">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="font-outfit text-muted-text mt-2">Manage your orders and account settings</p>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="bg-transparent border-b border-black/10 w-full justify-start rounded-none h-auto p-0 mb-8">
            <TabsTrigger 
              value="orders" 
              className="font-outfit text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4 px-6"
              data-testid="tab-orders"
            >
              <Package size={16} className="mr-2" /> Orders
            </TabsTrigger>
            <TabsTrigger 
              value="wishlist" 
              className="font-outfit text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4 px-6"
              data-testid="tab-wishlist"
            >
              <Heart size={16} className="mr-2" /> Wishlist
            </TabsTrigger>
            <TabsTrigger 
              value="account" 
              className="font-outfit text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4 px-6"
              data-testid="tab-account"
            >
              <User size={16} className="mr-2" /> Account
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 w-1/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.order_id} className="bg-white p-6 border border-black/10" data-testid={`order-${order.order_id}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm">{order.order_id}</span>
                          <span className={`font-outfit text-xs uppercase tracking-wider ${getStatusColor(order.payment_status)}`}>
                            {order.payment_status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 font-outfit text-sm text-muted-text">
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {new Date(order.created_at).toLocaleDateString()}
                          </span>
                          <span>{order.items?.length} items</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-outfit text-xl font-medium">{order.currency} {order.total?.toFixed(2)}</span>
                        <span className={`block font-outfit text-xs uppercase tracking-wider mt-1 ${getStatusColor(order.order_status)}`}>
                          {order.order_status}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4">
                      {order.items?.slice(0, 4).map((item, index) => (
                        <div key={index} className="w-20 h-24 flex-shrink-0 bg-gray-100 overflow-hidden">
                          <img src={item.image || "https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=200"} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>

                    {order.tracking_number && (
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-black/10">
                        <MapPin size={16} className="text-muted-text" />
                        <span className="font-outfit text-sm text-muted-text">Tracking: {order.tracking_number}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white border border-black/10">
                <Package size={48} className="mx-auto text-muted-text mb-4" />
                <h3 className="font-cinzel text-lg tracking-widest uppercase mb-2">No orders yet</h3>
                <p className="font-outfit text-muted-text mb-6">Start shopping to see your orders here</p>
                <Link to="/products">
                  <Button className="bg-black text-white hover:bg-ashanti-gold hover:text-black">
                    Browse Products
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>

          {/* Wishlist Tab */}
          <TabsContent value="wishlist">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[3/4] bg-gray-200"></div>
                    <div className="h-4 bg-gray-200 mt-4 w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : wishlist.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {wishlist.map((product) => (
                  <Link key={product.product_id} to={`/products/${product.product_id}`} className="group">
                    <div className="aspect-[3/4] bg-gray-100 overflow-hidden">
                      <img
                        src={product.images?.[0] || "https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=400"}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <h3 className="font-cinzel text-sm tracking-wide uppercase mt-4 group-hover:text-ashanti-gold transition-colors">
                      {product.name}
                    </h3>
                    <span className="font-outfit text-lg">{product.currency} {product.price?.toFixed(2)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white border border-black/10">
                <Heart size={48} className="mx-auto text-muted-text mb-4" />
                <h3 className="font-cinzel text-lg tracking-widest uppercase mb-2">Wishlist is empty</h3>
                <p className="font-outfit text-muted-text mb-6">Save your favorite items for later</p>
                <Link to="/products">
                  <Button className="bg-black text-white hover:bg-ashanti-gold hover:text-black">
                    Explore Products
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account">
            <div className="bg-white p-8 border border-black/10 max-w-2xl">
              <h3 className="font-cinzel text-lg tracking-widest uppercase mb-6">Account Details</h3>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-black text-white flex items-center justify-center font-cinzel text-2xl">
                    {user?.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-outfit font-medium text-lg">{user?.name}</p>
                    <p className="font-outfit text-muted-text">{user?.email}</p>
                  </div>
                </div>

                <div className="border-t border-black/10 pt-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="font-outfit text-muted-text">Account Type</span>
                    <span className="font-outfit capitalize">{user?.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-outfit text-muted-text">Total Orders</span>
                    <span className="font-outfit">{orders.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-outfit text-muted-text">Wishlist Items</span>
                    <span className="font-outfit">{wishlist.length}</span>
                  </div>
                </div>

                {user?.role === "customer" && (
                  <div className="border-t border-black/10 pt-6">
                    <Link to="/auth" className="flex items-center justify-between hover:text-ashanti-gold transition-colors">
                      <span className="font-outfit">Become a Vendor</span>
                      <ChevronRight size={20} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default CustomerDashboard;
