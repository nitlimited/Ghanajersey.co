import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Package, Plus, Edit2, Trash2, Eye, Clock, CheckCircle, XCircle, 
  ShoppingBag, DollarSign, TrendingUp, AlertTriangle, Copy, Pause, Play,
  Truck, CreditCard, HelpCircle, FileText, MessageSquare, Percent, ThumbsUp
} from "lucide-react";
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
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [promos, setPromos] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vendorStatus, setVendorStatus] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploadingImageIndex, setUploadingImageIndex] = useState(null);

  // Product form state
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    price_ghs: "",
    currency: "USD",
    category: "official-tournament",
    sizes: ["S", "M", "L", "XL"],
    stock: "",
    images: ["", ""],
    tags: [],
    allows_customization: false,
    customization_price: "",
    customization_price_ghs: ""
  });

  // Promo form state
  const [promoForm, setPromoForm] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: "",
    min_purchase: "",
    max_uses: ""
  });

  const categories = [
    { id: "official-tournament", name: "Official Tournament" },
    { id: "streetwear", name: "Streetwear" },
    { id: "fan", name: "Fan Jerseys" },
    { id: "retro", name: "Retro Collection" },
    { id: "creative-designer", name: "Creative Designer" },
    { id: "local-club", name: "Local Club" }
  ];

  const sizes = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

  useEffect(() => {
    checkVendorStatusAndFetch();
  }, [token]);

  const checkVendorStatusAndFetch = async () => {
    if (!token) return;
    
    // Admins bypass status check
    if (user?.role === "admin") {
      fetchData();
      return;
    }
    
    try {
      // First check vendor onboarding status
      const statusRes = await axios.get(`${API}/vendor/onboarding-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const status = statusRes.data.vendor_status;
      setVendorStatus(status);
      
      // Redirect unapproved vendors to onboarding
      if (status === "pending_onboarding") {
        navigate("/vendor/onboarding");
        return;
      }
      
      // If pending approval or approved, fetch dashboard data
      if (status === "approved") {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to check vendor status:", error);
      // If 403, redirect to onboarding
      if (error.response?.status === 403) {
        navigate("/vendor/onboarding");
      }
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [dashboardRes, productsRes, ordersRes, profileRes, promosRes] = await Promise.all([
        axios.get(`${API}/vendor/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/vendor/products`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/vendor/orders`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/vendor/profile`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/vendor/promos`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setDashboard(dashboardRes.data);
      setProducts(productsRes.data);
      setOrders(ordersRes.data);
      setProfile(profileRes.data);
      setPromos(promosRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();

    const uploadedImages = productForm.images.filter(img => img.trim() !== "");
    
    if (!productForm.name || !productForm.price || !productForm.price_ghs || !productForm.description) {
      toast.error("Please fill in all required fields including both USD and GHS prices");
      return;
    }

    if (uploadedImages.length === 0) {
      toast.error("Please upload at least one product image to storage");
      return;
    }

    try {
      const payload = {
        ...productForm,
        price: parseFloat(productForm.price),
        price_ghs: parseFloat(productForm.price_ghs),
        stock: parseInt(productForm.stock) || 0,
        images: uploadedImages,
        allows_customization: productForm.allows_customization,
        customization_price: productForm.allows_customization ? parseFloat(productForm.customization_price) || 0 : 0,
        customization_price_ghs: productForm.allows_customization && productForm.customization_price_ghs 
          ? parseFloat(productForm.customization_price_ghs) 
          : null
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

  const handleDuplicateProduct = async (productId) => {
    try {
      await axios.post(`${API}/vendor/products/${productId}/duplicate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Product duplicated and submitted for approval");
      fetchData();
    } catch (error) {
      toast.error("Failed to duplicate product");
    }
  };

  const handleTogglePause = async (productId, isPaused) => {
    try {
      await axios.put(`${API}/vendor/products/${productId}/pause?is_paused=${!isPaused}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(isPaused ? "Product unpaused" : "Product paused");
      fetchData();
    } catch (error) {
      toast.error("Failed to update product");
    }
  };

  const handleUpdateStock = async (productId, newStock) => {
    try {
      await axios.put(`${API}/vendor/products/${productId}/stock?stock=${newStock}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Stock updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update stock");
    }
  };

  const handleUploadProductImage = async (index, file) => {
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append("file", file);
    setUploadingImageIndex(index);

    try {
      const res = await axios.post(`${API}/upload/product-image`, uploadData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setProductForm((prev) => {
        const newImages = [...prev.images];
        newImages[index] = res.data.url;
        return { ...prev, images: newImages };
      });
      toast.success("Image uploaded to storage");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to upload image");
    } finally {
      setUploadingImageIndex(null);
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API}/vendor/orders/${orderId}/status?status=${status}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Order marked as ${status}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update order");
    }
  };

  const handleSendConfirmation = async (orderId) => {
    try {
      const res = await axios.post(`${API}/vendor/orders/${orderId}/send-confirmation`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Confirmation request sent to customer");
      // In production, this would trigger an email
      console.log("Confirmation link:", res.data.confirmation_link);
    } catch (error) {
      toast.error("Failed to send confirmation request");
    }
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/vendor/promos`, {
        ...promoForm,
        discount_value: parseFloat(promoForm.discount_value),
        min_purchase: promoForm.min_purchase ? parseFloat(promoForm.min_purchase) : null,
        max_uses: promoForm.max_uses ? parseInt(promoForm.max_uses) : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Promo code created");
      setShowPromoModal(false);
      setPromoForm({ code: "", discount_type: "percentage", discount_value: "", min_purchase: "", max_uses: "" });
      fetchData();
    } catch (error) {
      toast.error("Failed to create promo");
    }
  };

  const handleDeletePromo = async (promoId) => {
    try {
      await axios.delete(`${API}/vendor/promos/${promoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Promo deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete promo");
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      price_ghs: (product.price_ghs || "").toString(),
      currency: product.currency,
      category: product.category,
      sizes: product.sizes,
      stock: product.stock.toString(),
      images: product.images.length > 0 ? [...product.images, ""] : ["", ""],
      tags: product.tags || [],
      allows_customization: product.allows_customization || false,
      customization_price: (product.customization_price || "").toString(),
      customization_price_ghs: (product.customization_price_ghs || "").toString()
    });
    setShowProductModal(true);
  };

  const resetForm = () => {
    setProductForm({
      name: "",
      description: "",
      price: "",
      price_ghs: "",
      currency: "USD",
      category: "official-tournament",
      sizes: ["S", "M", "L", "XL"],
      stock: "",
      images: ["", ""],
      tags: [],
      allows_customization: false,
      customization_price: "",
      customization_price_ghs: ""
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

  const getOrderStatusColor = (status) => {
    switch (status) {
      case "processing": return "bg-blue-100 text-blue-700";
      case "shipped": return "bg-purple-100 text-purple-700";
      case "delivered": return "bg-ghana-green/10 text-ghana-green";
      case "cancelled": return "bg-ghana-red/10 text-ghana-red";
      default: return "bg-gray-100 text-muted-text";
    }
  };

  const productNotifications = [...products]
    .filter((product) => ["approved", "rejected"].includes(product.status))
    .sort((a, b) => new Date(b.reviewed_at || b.created_at || 0) - new Date(a.reviewed_at || a.created_at || 0))
    .slice(0, 6);

  const formatNotificationTime = (value) => {
    if (!value) return "Recently";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently";
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bone-white">
        <Header forceLight={true} stickyAnnouncement={true} />
        <div className="pt-12 flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Show pending approval screen for vendors awaiting approval
  if (vendorStatus === "pending_approval") {
    return (
      <div className="min-h-screen bg-bone-white">
        <Header forceLight={true} stickyAnnouncement={true} />
        <div className="pt-12 pb-24 px-6 md:px-12 max-w-2xl mx-auto text-center">
          <div className="bg-ashanti-gold/10 border border-ashanti-gold/30 p-8 mt-12">
            <Clock size={48} className="mx-auto text-ashanti-gold mb-4" />
            <h1 className="font-heading text-2xl mb-4">Application Under Review</h1>
            <p className="font-body text-muted-text mb-6">
              Thank you for submitting your vendor application! Our team is carefully reviewing your information to ensure quality standards on our platform.
            </p>
            <p className="font-body text-sm text-muted-text mb-4">
              This process usually takes 1-2 business days. You will receive a notification once your application is approved.
            </p>
            <div className="bg-white p-4 border border-black/10 mt-6">
              <p className="font-body text-xs text-muted-text uppercase tracking-wider mb-2">Need Help?</p>
              <p className="font-body text-sm">
                Contact us at <a href="mailto:vendors@ghanajersey.co" className="text-ashanti-gold underline">vendors@ghanajersey.co</a>
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Show rejected screen
  if (vendorStatus === "rejected") {
    return (
      <div className="min-h-screen bg-bone-white">
        <Header forceLight={true} stickyAnnouncement={true} />
        <div className="pt-12 pb-24 px-6 md:px-12 max-w-2xl mx-auto text-center">
          <div className="bg-ghana-red/10 border border-ghana-red/30 p-8 mt-12">
            <XCircle size={48} className="mx-auto text-ghana-red mb-4" />
            <h1 className="font-heading text-2xl mb-4">Application Not Approved</h1>
            <p className="font-body text-muted-text mb-6">
              Unfortunately, your vendor application was not approved at this time. This may be due to incomplete information or not meeting our quality standards.
            </p>
            <Button 
              className="bg-black hover:bg-ashanti-gold hover:text-black"
              onClick={() => navigate("/vendor/onboarding")}
            >
              Resubmit Application
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone-white" data-testid="vendor-dashboard">
      <Header forceLight={true} stickyAnnouncement={true} />

      <div className="pt-12 pb-24 px-6 md:px-12 max-w-7xl mx-auto">
        {/* Welcome */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
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
                <Plus size={16} className="mr-2" /> Add New Jersey
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading tracking-widest uppercase">
                  {editingProduct ? "Edit Product" : "Add New Jersey"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitProduct} className="space-y-6 mt-4">
                <div>
                  <Label className="font-body text-sm uppercase tracking-wider">Product Name *</Label>
                  <Input
                    value={productForm.name}
                    onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                    placeholder="Ghana Home Jersey 2024"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="font-body text-sm uppercase tracking-wider">Description *</Label>
                  <Textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                    placeholder="Describe your jersey..."
                    className="mt-2 min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-body text-sm uppercase tracking-wider">Price USD *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={productForm.price}
                      onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                      placeholder="79.99"
                      className="mt-2"
                      required
                    />
                    <p className="font-body text-xs text-muted-text mt-1">For international customers</p>
                  </div>
                  <div>
                    <Label className="font-body text-sm uppercase tracking-wider">Price GHS *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={productForm.price_ghs}
                      onChange={(e) => setProductForm({...productForm, price_ghs: e.target.value})}
                      placeholder="1200.00"
                      className="mt-2"
                      required
                    />
                    <p className="font-body text-xs text-muted-text mt-1">For Ghana customers</p>
                  </div>
                </div>
                <p className="font-body text-xs text-ashanti-gold bg-ashanti-gold/10 p-2 -mt-2">
                  Set both prices - customers see the price based on their location
                </p>

                <div>
                  <Label className="font-body text-sm uppercase tracking-wider">Stock Quantity *</Label>
                  <Input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                    placeholder="50"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="font-body text-sm uppercase tracking-wider">Category</Label>
                  <Select
                    value={productForm.category}
                    onValueChange={(value) => setProductForm({...productForm, category: value})}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="font-body text-sm uppercase tracking-wider">Available Sizes</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {sizes.map((size) => (
                      <Button
                        key={size}
                        type="button"
                        variant={productForm.sizes.includes(size) ? "default" : "outline"}
                        size="sm"
                        className={productForm.sizes.includes(size) ? "bg-black" : ""}
                        onClick={() => {
                          const newSizes = productForm.sizes.includes(size)
                            ? productForm.sizes.filter(s => s !== size)
                            : [...productForm.sizes, size];
                          setProductForm({...productForm, sizes: newSizes});
                        }}
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="font-body text-sm uppercase tracking-wider">Product Images</Label>
                  <p className="font-body text-xs text-muted-text mb-2">Upload front image first, then back for hover effect.</p>
                  {productForm.images.map((img, index) => (
                    <div key={index} className="mt-2 space-y-2 border border-black/10 p-3">
                      <div className="flex items-center gap-3">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleUploadProductImage(index, e.target.files?.[0])}
                          className="flex-1"
                        />
                        {uploadingImageIndex === index && (
                          <span className="font-body text-xs text-muted-text">Uploading...</span>
                        )}
                      </div>
                      {img && (
                        <img src={img} alt={`Product ${index + 1}`} className="w-20 h-20 object-cover border border-black/10" />
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setProductForm({...productForm, images: [...productForm.images, ""]})}
                  >
                    + Add More Images
                  </Button>
                </div>

                {/* Customization Option */}
                <div className="border border-black/10 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Label className="font-body text-sm uppercase tracking-wider">Allow Customization</Label>
                      <p className="font-body text-xs text-muted-text">Let customers add their name and number on the back</p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={productForm.allows_customization}
                        onChange={(e) => setProductForm({...productForm, allows_customization: e.target.checked})}
                        className="w-5 h-5 accent-ashanti-gold"
                      />
                    </label>
                  </div>
                  
                  {productForm.allows_customization && (
                    <div className="pt-4 border-t border-black/10">
                      <Label className="font-body text-sm uppercase tracking-wider">Customization Price</Label>
                      <p className="font-body text-xs text-muted-text mb-2">Additional charge for customization (both currencies)</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-sm">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={productForm.customization_price}
                            onChange={(e) => setProductForm({...productForm, customization_price: e.target.value})}
                            placeholder="15.00"
                            className="w-full"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-body text-sm">GH₵</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={productForm.customization_price_ghs}
                            onChange={(e) => setProductForm({...productForm, customization_price_ghs: e.target.value})}
                            placeholder="230.00"
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full bg-black hover:bg-ashanti-gold hover:text-black">
                  {editingProduct ? "Update Product" : "Submit for Approval"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {productNotifications.length > 0 && (
          <div className="mb-8 bg-white border border-black/10 p-6">
            <h2 className="font-heading text-lg tracking-wide uppercase mb-4">Product Notifications</h2>
            <div className="space-y-3">
              {productNotifications.map((product) => (
                <div key={`notification-${product.product_id}`} className="flex items-start justify-between gap-4 border border-black/10 p-4">
                  <div>
                    <p className="font-body text-sm font-medium">{product.name}</p>
                    <p className="font-body text-xs text-muted-text">Product ID: {product.product_id}</p>
                    <p className="font-body text-xs text-muted-text mt-1">
                      {product.status === "approved"
                        ? "This product has been approved and can appear in the shop."
                        : "This product was reviewed and is currently rejected."}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(product.status)}
                    <p className="font-body text-xs text-muted-text mt-2">{formatNotificationTime(product.reviewed_at || product.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-black text-white p-5">
            <div className="flex items-center gap-2 text-white/60 mb-2">
              <DollarSign size={14} />
              <span className="font-body text-xs uppercase tracking-wider">Total Revenue</span>
            </div>
            <span className="font-body text-2xl font-medium">${dashboard?.total_revenue?.toFixed(2) || "0.00"}</span>
          </div>
          <div className="bg-ashanti-gold/10 border border-ashanti-gold/30 p-5">
            <div className="flex items-center gap-2 text-ashanti-gold mb-2">
              <Percent size={14} />
              <span className="font-body text-xs uppercase tracking-wider">Platform Fee (15%)</span>
            </div>
            <span className="font-body text-2xl font-medium">${dashboard?.platform_commission?.toFixed(2) || "0.00"}</span>
          </div>
          <div className="bg-ghana-green/10 border border-ghana-green/30 p-5">
            <div className="flex items-center gap-2 text-ghana-green mb-2">
              <CreditCard size={14} />
              <span className="font-body text-xs uppercase tracking-wider">Net Earnings</span>
            </div>
            <span className="font-body text-2xl font-medium text-ghana-green">${dashboard?.net_earnings?.toFixed(2) || "0.00"}</span>
          </div>
          <div className="bg-white border border-black/10 p-5">
            <div className="flex items-center gap-2 text-muted-text mb-2">
              <Clock size={14} />
              <span className="font-body text-xs uppercase tracking-wider">Pending Payout</span>
            </div>
            <span className="font-body text-2xl font-medium">${dashboard?.pending_payout?.toFixed(2) || "0.00"}</span>
          </div>
          <div className="bg-white border border-black/10 p-5">
            <div className="flex items-center gap-2 text-muted-text mb-2">
              <CheckCircle size={14} />
              <span className="font-body text-xs uppercase tracking-wider">Paid Out</span>
            </div>
            <span className="font-body text-2xl font-medium">${dashboard?.paid_payout?.toFixed(2) || "0.00"}</span>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-4 border border-black/10 text-center">
            <p className="font-body text-xs text-muted-text uppercase">Products</p>
            <p className="font-body text-xl font-medium">{dashboard?.approved_products || 0}</p>
          </div>
          <div className="bg-white p-4 border border-black/10 text-center">
            <p className="font-body text-xs text-muted-text uppercase">Pending</p>
            <p className="font-body text-xl font-medium text-ashanti-gold">{dashboard?.pending_products || 0}</p>
          </div>
          <div className="bg-white p-4 border border-black/10 text-center">
            <p className="font-body text-xs text-muted-text uppercase">Total Orders</p>
            <p className="font-body text-xl font-medium">{dashboard?.total_orders || 0}</p>
          </div>
          <div className="bg-white p-4 border border-black/10 text-center">
            <p className="font-body text-xs text-muted-text uppercase">New Orders</p>
            <p className="font-body text-xl font-medium text-blue-600">{dashboard?.new_orders || 0}</p>
          </div>
          <div className="bg-white p-4 border border-black/10 text-center">
            <p className="font-body text-xs text-muted-text uppercase">Monthly Sales</p>
            <p className="font-body text-xl font-medium">${dashboard?.monthly_revenue?.toFixed(2) || "0.00"}</p>
          </div>
          <div className="bg-white p-4 border border-black/10 text-center">
            <p className="font-body text-xs text-muted-text uppercase">Total Votes</p>
            <p className="font-body text-xl font-medium">{dashboard?.total_votes || 0}</p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        {dashboard?.low_stock_products?.length > 0 && (
          <div className="bg-ghana-red/10 border border-ghana-red/30 p-4 mb-8">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-ghana-red" />
              <h3 className="font-body text-sm font-semibold text-ghana-red uppercase">Low Stock Alert</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {dashboard.low_stock_products.map((product) => (
                <div key={product.product_id} className="flex items-center gap-3 bg-white p-3">
                  <img src={product.images?.[0]} alt={product.name} className="w-12 h-12 object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm truncate">{product.name}</p>
                    <p className="font-body text-xs text-ghana-red font-semibold">{product.stock} items left</p>
                  </div>
                  <Input
                    type="number"
                    className="w-20 h-8 text-sm"
                    placeholder="Add"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const newStock = parseInt(e.target.value) + product.stock;
                        handleUpdateStock(product.product_id, newStock);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="bg-transparent border-b border-black/10 w-full justify-start rounded-none h-auto p-0 mb-8 overflow-x-auto flex-nowrap">
            <TabsTrigger value="orders" className="font-body text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4 px-4 whitespace-nowrap">
              Orders ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="products" className="font-body text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4 px-4 whitespace-nowrap">
              Products ({products.length})
            </TabsTrigger>
            <TabsTrigger value="insights" className="font-body text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4 px-4 whitespace-nowrap">
              Performance
            </TabsTrigger>
            <TabsTrigger value="promos" className="font-body text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4 px-4 whitespace-nowrap">
              Promos
            </TabsTrigger>
            <TabsTrigger value="support" className="font-body text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4 px-4 whitespace-nowrap">
              Support
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.order_id} className="bg-white border border-black/10 p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-heading text-sm">Order #{order.order_id.slice(-8)}</h3>
                        <span className={`px-2 py-1 text-xs font-body ${getOrderStatusColor(order.order_status)}`}>
                          {order.order_status || 'pending'}
                        </span>
                        {order.delivery_confirmed && (
                          <span className="px-2 py-1 text-xs font-body bg-ghana-green/10 text-ghana-green flex items-center gap-1">
                            <CheckCircle size={10} /> Confirmed
                          </span>
                        )}
                      </div>
                      <p className="font-body text-xs text-muted-text">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Select
                        value={order.order_status || 'processing'}
                        onValueChange={(value) => handleUpdateOrderStatus(order.order_id, value)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      {order.order_status === 'delivered' && !order.delivery_confirmed && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-ashanti-gold text-ashanti-gold hover:bg-ashanti-gold hover:text-black"
                          onClick={() => handleSendConfirmation(order.order_id)}
                        >
                          Request Confirmation
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-bone-white">
                    <div>
                      <p className="font-body text-xs text-muted-text uppercase mb-1">Customer</p>
                      <p className="font-body text-sm font-medium">{order.shipping_address?.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="font-body text-xs text-muted-text uppercase mb-1">Phone</p>
                      <p className="font-body text-sm">{order.shipping_address?.phone || "N/A"}</p>
                    </div>
                    <div>
                      <p className="font-body text-xs text-muted-text uppercase mb-1">Address</p>
                      <p className="font-body text-sm">
                        {order.shipping_address?.address}, {order.shipping_address?.city}, {order.shipping_address?.country}
                      </p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-3">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 border border-black/5">
                        <img src={item.image} alt={item.name} className="w-16 h-16 object-cover" />
                        <div className="flex-1">
                          <p className="font-body text-sm font-medium">{item.name}</p>
                          <p className="font-body text-xs text-muted-text">
                            Size: {item.size} | Qty: {item.quantity}
                          </p>
                        </div>
                        <p className="font-body text-sm font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-black/10 flex justify-between items-center">
                    <p className="font-body text-sm text-muted-text">
                      Payment: <span className={order.payment_status === 'paid' ? 'text-ghana-green' : 'text-ashanti-gold'}>{order.payment_status}</span>
                    </p>
                    <p className="font-body text-lg font-semibold">
                      Total: ${order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <p className="text-center text-muted-text py-12 font-body">No orders yet</p>
              )}
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product.product_id} className={`bg-white border overflow-hidden ${product.is_paused ? 'border-muted-text opacity-60' : 'border-black/10'}`}>
                  <div className="relative">
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={product.images?.[0] || "https://via.placeholder.com/400"}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {product.is_paused && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-body text-sm uppercase tracking-wider">Paused</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {product.stock <= 5 && (
                        <span className="bg-ghana-red text-white text-xs px-2 py-1 font-body">Low Stock</span>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-heading text-sm tracking-wide">{product.name}</h3>
                        <p className="font-body text-[11px] text-muted-text mt-1">Product ID: {product.product_id}</p>
                        {getStatusBadge(product.status)}
                      </div>
                      <span className="font-body text-lg font-semibold">${product.price}</span>
                    </div>
                    <p className="font-body text-xs text-muted-text mb-3">
                      Stock: {product.stock} | Votes: {product.vote_count || 0}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="border-black" onClick={() => openEditModal(product)}>
                        <Edit2 size={12} className="mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDuplicateProduct(product.product_id)}>
                        <Copy size={12} className="mr-1" /> Duplicate
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleTogglePause(product.product_id, product.is_paused)}
                      >
                        {product.is_paused ? <Play size={12} className="mr-1" /> : <Pause size={12} className="mr-1" />}
                        {product.is_paused ? "Unpause" : "Pause"}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-ghana-red text-ghana-red hover:bg-ghana-red hover:text-white"
                        onClick={() => handleDeleteProduct(product.product_id)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {products.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-text font-body mb-4">No products yet</p>
                <Button onClick={() => { setEditingProduct(null); resetForm(); setShowProductModal(true); }}>
                  <Plus size={16} className="mr-2" /> Add Your First Jersey
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Performance Insights Tab */}
          <TabsContent value="insights">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Sellers */}
              <div className="bg-white border border-black/10 p-6">
                <h3 className="font-heading text-lg mb-4 flex items-center gap-2">
                  <TrendingUp size={18} /> Top Selling Jerseys
                </h3>
                {dashboard?.top_sellers?.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.top_sellers.map((product, index) => (
                      <div key={product.product_id} className="flex items-center gap-3 p-3 bg-bone-white">
                        <span className="font-heading text-xl text-muted-text w-6">#{index + 1}</span>
                        <img src={product.images?.[0]} alt={product.name} className="w-12 h-12 object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm font-medium truncate">{product.name}</p>
                          <p className="font-body text-xs text-muted-text">{product.total_sold} sold</p>
                        </div>
                        <p className="font-body text-sm font-semibold text-ghana-green">${product.total_revenue?.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-text font-body text-center py-8">No sales data yet</p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="bg-white border border-black/10 p-6">
                <h3 className="font-heading text-lg mb-4 flex items-center gap-2">
                  <ThumbsUp size={18} /> Jersey Votes
                </h3>
                <div className="space-y-3">
                  {products.filter(p => p.vote_count > 0).sort((a, b) => b.vote_count - a.vote_count).slice(0, 5).map((product, index) => (
                    <div key={product.product_id} className="flex items-center gap-3 p-3 bg-bone-white">
                      <span className="font-heading text-xl text-ashanti-gold w-6">#{index + 1}</span>
                      <img src={product.images?.[0]} alt={product.name} className="w-12 h-12 object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-medium truncate">{product.name}</p>
                      </div>
                      <p className="font-body text-lg font-semibold">{product.vote_count} <span className="text-xs text-muted-text">votes</span></p>
                    </div>
                  ))}
                  {products.filter(p => p.vote_count > 0).length === 0 && (
                    <p className="text-muted-text font-body text-center py-8">No votes yet</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Promos Tab */}
          <TabsContent value="promos">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-heading text-lg">Your Promo Codes</h3>
              <Dialog open={showPromoModal} onOpenChange={setShowPromoModal}>
                <DialogTrigger asChild>
                  <Button className="bg-black text-white hover:bg-ashanti-gold hover:text-black">
                    <Plus size={16} className="mr-2" /> Create Promo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-heading">Create Promo Code</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreatePromo} className="space-y-4 mt-4">
                    <div>
                      <Label>Promo Code</Label>
                      <Input
                        value={promoForm.code}
                        onChange={(e) => setPromoForm({...promoForm, code: e.target.value.toUpperCase()})}
                        placeholder="SUMMER20"
                        className="mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Discount Type</Label>
                        <Select
                          value={promoForm.discount_type}
                          onValueChange={(value) => setPromoForm({...promoForm, discount_type: value})}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Discount Value</Label>
                        <Input
                          type="number"
                          value={promoForm.discount_value}
                          onChange={(e) => setPromoForm({...promoForm, discount_value: e.target.value})}
                          placeholder={promoForm.discount_type === "percentage" ? "20" : "10.00"}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Min Purchase (optional)</Label>
                        <Input
                          type="number"
                          value={promoForm.min_purchase}
                          onChange={(e) => setPromoForm({...promoForm, min_purchase: e.target.value})}
                          placeholder="50.00"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Max Uses (optional)</Label>
                        <Input
                          type="number"
                          value={promoForm.max_uses}
                          onChange={(e) => setPromoForm({...promoForm, max_uses: e.target.value})}
                          placeholder="100"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-black">Create Promo Code</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {promos.map((promo) => (
                <div key={promo.promo_id} className="bg-white border border-black/10 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-heading text-lg">{promo.code}</h4>
                      <p className="font-body text-sm text-ashanti-gold">
                        {promo.discount_type === "percentage" ? `${promo.discount_value}% OFF` : `$${promo.discount_value} OFF`}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-ghana-red"
                      onClick={() => handleDeletePromo(promo.promo_id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <div className="space-y-1 text-xs font-body text-muted-text">
                    {promo.min_purchase && <p>Min purchase: ${promo.min_purchase}</p>}
                    {promo.max_uses && <p>Max uses: {promo.max_uses} ({promo.uses || 0} used)</p>}
                  </div>
                </div>
              ))}
              {promos.length === 0 && (
                <p className="text-center text-muted-text py-8 font-body col-span-full">No promo codes created yet</p>
              )}
            </div>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-black/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MessageSquare size={24} className="text-ashanti-gold" />
                  <h3 className="font-heading text-lg">Contact Support</h3>
                </div>
                <p className="font-body text-sm text-muted-text mb-4">
                  Need help with your store? Our support team is here to assist you.
                </p>
                <Button className="w-full bg-black hover:bg-ashanti-gold hover:text-black">
                  Contact Admin
                </Button>
              </div>

              <div className="bg-white border border-black/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText size={24} className="text-ashanti-gold" />
                  <h3 className="font-heading text-lg">Seller Guidelines</h3>
                </div>
                <p className="font-body text-sm text-muted-text mb-4">
                  Review our guidelines for listing products and maintaining quality standards.
                </p>
                <ul className="font-body text-sm space-y-2 mb-4">
                  <li>• High-quality product images required</li>
                  <li>• Accurate descriptions and sizing</li>
                  <li>• Respond to orders within 24 hours</li>
                  <li>• Ship within 3 business days</li>
                </ul>
                <Button variant="outline" className="w-full border-black">
                  Read Full Guidelines
                </Button>
              </div>

              <div className="bg-white border border-black/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard size={24} className="text-ashanti-gold" />
                  <h3 className="font-heading text-lg">Payout Policy</h3>
                </div>
                <p className="font-body text-sm text-muted-text mb-4">
                  Understand how and when you get paid for your sales.
                </p>
                <ul className="font-body text-sm space-y-2 mb-4">
                  <li>• Platform commission: 15%</li>
                  <li>• Payout after delivery confirmation</li>
                  <li>• Weekly payout schedule</li>
                  <li>• Minimum payout: $50</li>
                </ul>
                <Button variant="outline" className="w-full border-black">
                  View Payout Details
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default VendorDashboard;
