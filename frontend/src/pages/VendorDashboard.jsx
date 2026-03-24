import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Package, Plus, Edit2, Trash2, Eye, Clock, CheckCircle, XCircle, ShoppingBag, DollarSign } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Header, Footer } from "./LandingPage";
import { useAuth, API } from "../App";
import { toast } from "sonner";
import axios from "axios";

const VendorDashboard = () => {
  const { user, token } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Product form state
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    currency: "USD",
    category: "clubs",
    sizes: ["S", "M", "L", "XL"],
    stock: "",
    images: [""],
    tags: []
  });

  const categories = [
    { id: "clubs", name: "Club Jerseys" },
    { id: "national", name: "National Team" },
    { id: "retro", name: "Retro Collection" },
    { id: "streetwear", name: "Streetwear" }
  ];

  const sizes = ["XS", "S", "M", "L", "XL", "XXL"];

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [productsRes, ordersRes, profileRes] = await Promise.all([
        axios.get(`${API}/vendor/products`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/vendor/orders`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/vendor/profile`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setProducts(productsRes.data);
      setOrders(ordersRes.data);
      setProfile(profileRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    
    if (!productForm.name || !productForm.price || !productForm.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const payload = {
        ...productForm,
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock) || 0,
        images: productForm.images.filter(img => img.trim() !== "")
      };

      if (editingProduct) {
        await axios.put(`${API}/vendor/products/${editingProduct.product_id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Product updated");
      } else {
        await axios.post(`${API}/vendor/products`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Product submitted for approval");
      }

      setShowProductModal(false);
      setEditingProduct(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save product");
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      await axios.delete(`${API}/vendor/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Product deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      currency: product.currency,
      category: product.category,
      sizes: product.sizes,
      stock: product.stock.toString(),
      images: product.images.length > 0 ? product.images : [""],
      tags: product.tags || []
    });
    setShowProductModal(true);
  };

  const resetForm = () => {
    setProductForm({
      name: "",
      description: "",
      price: "",
      currency: "USD",
      category: "clubs",
      sizes: ["S", "M", "L", "XL"],
      stock: "",
      images: [""],
      tags: []
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return <span className="flex items-center gap-1 text-ghana-green text-xs uppercase tracking-wider"><CheckCircle size={12} /> Approved</span>;
      case "pending":
        return <span className="flex items-center gap-1 text-ashanti-gold text-xs uppercase tracking-wider"><Clock size={12} /> Pending</span>;
      case "rejected":
        return <span className="flex items-center gap-1 text-ghana-red text-xs uppercase tracking-wider"><XCircle size={12} /> Rejected</span>;
      default:
        return null;
    }
  };

  // Calculate stats
  const approvedProducts = products.filter(p => p.status === "approved").length;
  const pendingProducts = products.filter(p => p.status === "pending").length;
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

  return (
    <div className="min-h-screen bg-bone-white" data-testid="vendor-dashboard">
      <Header />

      <div className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto">
        {/* Welcome */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl tracking-widest uppercase" data-testid="vendor-title">
              Vendor Dashboard
            </h1>
            <p className="font-body text-muted-text mt-2">
              {profile?.vendor_profile?.brand_name || user?.name}
            </p>
          </div>
          <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
            <DialogTrigger asChild>
              <Button 
                className="bg-black text-white hover:bg-ashanti-gold hover:text-black"
                onClick={() => { setEditingProduct(null); resetForm(); }}
                data-testid="add-product-btn"
              >
                <Plus size={16} className="mr-2" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading tracking-widest uppercase">
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitProduct} className="space-y-6 mt-4">
                <div>
                  <Label className="font-body text-sm uppercase tracking-wider">Product Name *</Label>
                  <Input
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="mt-2 rounded-none"
                    data-testid="product-name-input"
                  />
                </div>

                <div>
                  <Label className="font-body text-sm uppercase tracking-wider">Description *</Label>
                  <Textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="mt-2 rounded-none min-h-[100px]"
                    data-testid="product-description-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-body text-sm uppercase tracking-wider">Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      className="mt-2 rounded-none"
                      data-testid="product-price-input"
                    />
                  </div>
                  <div>
                    <Label className="font-body text-sm uppercase tracking-wider">Currency</Label>
                    <Select value={productForm.currency} onValueChange={(v) => setProductForm({ ...productForm, currency: v })}>
                      <SelectTrigger className="mt-2 rounded-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GHS">GHS</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-body text-sm uppercase tracking-wider">Category</Label>
                    <Select value={productForm.category} onValueChange={(v) => setProductForm({ ...productForm, category: v })}>
                      <SelectTrigger className="mt-2 rounded-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="font-body text-sm uppercase tracking-wider">Stock</Label>
                    <Input
                      type="number"
                      value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                      className="mt-2 rounded-none"
                    />
                  </div>
                </div>

                <div>
                  <Label className="font-body text-sm uppercase tracking-wider">Sizes</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {sizes.map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          const newSizes = productForm.sizes.includes(size)
                            ? productForm.sizes.filter(s => s !== size)
                            : [...productForm.sizes, size];
                          setProductForm({ ...productForm, sizes: newSizes });
                        }}
                        className={`w-12 h-10 border font-body text-sm ${productForm.sizes.includes(size) ? 'bg-black text-white border-black' : 'border-black/20'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="font-body text-sm uppercase tracking-wider">Image URLs</Label>
                  {productForm.images.map((url, index) => (
                    <div key={index} className="flex gap-2 mt-2">
                      <Input
                        value={url}
                        onChange={(e) => {
                          const newImages = [...productForm.images];
                          newImages[index] = e.target.value;
                          setProductForm({ ...productForm, images: newImages });
                        }}
                        placeholder="https://example.com/image.jpg"
                        className="rounded-none"
                      />
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const newImages = productForm.images.filter((_, i) => i !== index);
                            setProductForm({ ...productForm, images: newImages });
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2"
                    onClick={() => setProductForm({ ...productForm, images: [...productForm.images, ""] })}
                  >
                    <Plus size={16} className="mr-2" /> Add Image
                  </Button>
                </div>

                <Button type="submit" className="w-full bg-black text-white hover:bg-ashanti-gold hover:text-black py-6" data-testid="submit-product-btn">
                  {editingProduct ? "Update Product" : "Submit for Approval"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-white p-6 border border-black/10">
            <div className="flex items-center gap-3 text-muted-text mb-2">
              <Package size={20} />
              <span className="font-body text-xs uppercase tracking-wider">Total Products</span>
            </div>
            <span className="font-body text-3xl font-medium">{products.length}</span>
          </div>
          <div className="bg-white p-6 border border-black/10">
            <div className="flex items-center gap-3 text-muted-text mb-2">
              <CheckCircle size={20} />
              <span className="font-body text-xs uppercase tracking-wider">Approved</span>
            </div>
            <span className="font-body text-3xl font-medium text-ghana-green">{approvedProducts}</span>
          </div>
          <div className="bg-white p-6 border border-black/10">
            <div className="flex items-center gap-3 text-muted-text mb-2">
              <Clock size={20} />
              <span className="font-body text-xs uppercase tracking-wider">Pending</span>
            </div>
            <span className="font-body text-3xl font-medium text-ashanti-gold">{pendingProducts}</span>
          </div>
          <div className="bg-white p-6 border border-black/10">
            <div className="flex items-center gap-3 text-muted-text mb-2">
              <DollarSign size={20} />
              <span className="font-body text-xs uppercase tracking-wider">Revenue</span>
            </div>
            <span className="font-body text-3xl font-medium">${totalRevenue.toFixed(2)}</span>
          </div>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="bg-transparent border-b border-black/10 w-full justify-start rounded-none h-auto p-0 mb-8">
            <TabsTrigger 
              value="products" 
              className="font-body text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4 px-6"
            >
              Products
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="font-body text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4 px-6"
            >
              Orders
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white p-4 animate-pulse">
                    <div className="aspect-[3/4] bg-gray-200"></div>
                    <div className="h-4 bg-gray-200 mt-4 w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.product_id} className="bg-white border border-black/10 overflow-hidden" data-testid={`vendor-product-${product.product_id}`}>
                    <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative">
                      <img
                        src={product.images?.[0] || "https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=400"}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-4 left-4">
                        {getStatusBadge(product.status)}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-heading text-sm tracking-wide uppercase">{product.name}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-body text-lg font-medium">{product.currency} {product.price.toFixed(2)}</span>
                        <span className="font-body text-sm text-muted-text">Stock: {product.stock}</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => openEditModal(product)}
                        >
                          <Edit2 size={14} className="mr-1" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteProduct(product.product_id)}
                          className="text-ghana-red hover:bg-ghana-red hover:text-white"
                        >
                          <Trash2 size={14} />
                        </Button>
                        {product.status === "approved" && (
                          <Link to={`/products/${product.product_id}`}>
                            <Button variant="outline" size="sm">
                              <Eye size={14} />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white border border-black/10">
                <Package size={48} className="mx-auto text-muted-text mb-4" />
                <h3 className="font-heading text-lg tracking-widest uppercase mb-2">No products yet</h3>
                <p className="font-body text-muted-text mb-6">Add your first product to get started</p>
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            {orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.order_id} className="bg-white p-6 border border-black/10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div>
                        <span className="font-mono text-sm">{order.order_id}</span>
                        <div className="flex items-center gap-4 mt-2 font-body text-sm text-muted-text">
                          <span>{new Date(order.created_at).toLocaleDateString()}</span>
                          <span className="capitalize">{order.order_status}</span>
                        </div>
                      </div>
                      <span className="font-body text-xl font-medium">{order.currency} {order.total?.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-black/10 pt-4">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 py-2">
                          <div className="w-12 h-12 bg-gray-100">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1">
                            <span className="font-body text-sm">{item.name}</span>
                            <span className="font-body text-xs text-muted-text block">Size: {item.size} × {item.quantity}</span>
                          </div>
                          <span className="font-body">{order.currency} {(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white border border-black/10">
                <ShoppingBag size={48} className="mx-auto text-muted-text mb-4" />
                <h3 className="font-heading text-lg tracking-widest uppercase mb-2">No orders yet</h3>
                <p className="font-body text-muted-text">Orders will appear here when customers purchase your products</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default VendorDashboard;
