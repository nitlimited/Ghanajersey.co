import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { X, Plus, ShoppingBag, Star, ChevronDown } from "lucide-react";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Header, Footer } from "./LandingPage";
import { useCart, API, getProductPath } from "../App";
import { useLocalization } from "../localization";
import { toast } from "sonner";
import axios from "axios";

const ComparePage = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([null, null]);
  const [selectedSizes, setSelectedSizes] = useState(["", ""]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { formatPrice } = useLocalization();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API}/products`);
        setAllProducts(response.data);
        
        // Check URL params for pre-selected products
        const product1 = searchParams.get("product1");
        const product2 = searchParams.get("product2");
        
        if (product1 || product2) {
          const selected = [null, null];
          if (product1) {
            const p1 = response.data.find(p => p.product_id === product1);
            if (p1) selected[0] = p1;
          }
          if (product2) {
            const p2 = response.data.find(p => p.product_id === product2);
            if (p2) selected[1] = p2;
          }
          setSelectedProducts(selected);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchParams]);

  const handleSelectProduct = (index, productId) => {
    const product = allProducts.find(p => p.product_id === productId);
    const newSelected = [...selectedProducts];
    newSelected[index] = product || null;
    setSelectedProducts(newSelected);
    
    // Reset size selection
    const newSizes = [...selectedSizes];
    newSizes[index] = product?.sizes?.[0] || "";
    setSelectedSizes(newSizes);
  };

  const handleRemoveProduct = (index) => {
    const newSelected = [...selectedProducts];
    newSelected[index] = null;
    setSelectedProducts(newSelected);
  };

  const handleAddToCart = async (index) => {
    const product = selectedProducts[index];
    const size = selectedSizes[index];
    
    if (!product) return;
    if (!size) {
      toast.error("Please select a size");
      return;
    }
    
    await addToCart(product.product_id, 1, size);
  };

  const compareFields = [
    { key: "price", label: "Price", format: (p) => formatPrice(p.price, p.price_ghs) },
    { key: "category", label: "Category", format: (p) => p.category.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase()) },
    { key: "jersey_type", label: "Type", format: (p) => p.jersey_type === "original" ? "Original" : "Fan Made" },
    { key: "sizes", label: "Sizes Available", format: (p) => p.sizes.join(", ") },
    { key: "stock", label: "In Stock", format: (p) => `${p.stock} pieces` },
    { key: "rating", label: "Rating", format: (p) => p.rating > 0 ? `${p.rating} / 5` : "No ratings yet" },
    { key: "vote_count", label: "Votes", format: (p) => `${p.vote_count || 0} votes` },
    { key: "vendor_name", label: "Designer", format: (p) => p.vendor_name || "Unknown" },
  ];

  const getProductImage = (product) => {
    if (!product) return null;
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0];
    }
    return product.image || null;
  };

  return (
    <div className="min-h-screen bg-bone-white" data-testid="compare-page">
      <Header forceLight={true} stickyAnnouncement={true} />

      <div className="pt-12 pb-24 px-6 md:px-12 max-w-6xl mx-auto">
        <h1 className="font-heading text-2xl md:text-3xl text-center mb-4">Compare Jerseys</h1>
        <p className="font-body text-center text-muted-text mb-12">
          Select two jerseys to compare side by side
        </p>

        {/* Product Selection */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8 mb-12">
          {[0, 1].map((index) => (
            <div key={index} className="bg-white border border-black/10 p-6">
              {selectedProducts[index] ? (
                <div className="relative">
                  <button
                    onClick={() => handleRemoveProduct(index)}
                    className="absolute top-0 right-0 p-2 hover:bg-black/5"
                    data-testid={`remove-product-${index}`}
                  >
                    <X size={20} />
                  </button>
                  
                  <Link to={getProductPath(selectedProducts[index])}>
                    <div className="aspect-square bg-gray-100 overflow-hidden mb-4">
                      {getProductImage(selectedProducts[index]) ? (
                        <img
                          src={getProductImage(selectedProducts[index])}
                          alt={selectedProducts[index].name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-4 text-center bg-gradient-to-b from-white to-stone-200">
                          <p className="font-body text-sm text-muted-text">Image unavailable</p>
                        </div>
                      )}
                    </div>
                  </Link>
                  
                  <h3 className="font-heading text-lg mb-2">{selectedProducts[index].name}</h3>
                  <p className="font-body text-2xl font-semibold text-ashanti-gold mb-4">
                    {formatPrice(selectedProducts[index].price, selectedProducts[index].price_ghs)}
                  </p>

                  {/* Size Selection */}
                  <div className="mb-4">
                    <label className="font-body text-sm text-muted-text block mb-2">Select Size</label>
                    <Select 
                      value={selectedSizes[index]} 
                      onValueChange={(value) => {
                        const newSizes = [...selectedSizes];
                        newSizes[index] = value;
                        setSelectedSizes(newSizes);
                      }}
                    >
                      <SelectTrigger className="rounded-none" data-testid={`size-select-${index}`}>
                        <SelectValue placeholder="Choose size" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedProducts[index].sizes.map(size => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={() => handleAddToCart(index)}
                    className="w-full bg-ashanti-gold text-black hover:bg-black hover:text-white"
                    data-testid={`add-to-cart-${index}`}
                  >
                    <ShoppingBag size={16} className="mr-2" /> Add to Cart
                  </Button>
                </div>
              ) : (
                <div className="min-h-[340px] md:min-h-[420px] flex flex-col items-center justify-center border-2 border-dashed border-black/20 px-4 text-center">
                  <Plus size={48} className="text-muted-text mb-4" />
                  <p className="font-body text-sm text-muted-text mb-4">Select a jersey</p>
                  <Select onValueChange={(value) => handleSelectProduct(index, value)}>
                    <SelectTrigger className="w-full max-w-sm rounded-none min-h-[52px]" data-testid={`select-product-${index}`}>
                      <SelectValue placeholder="Choose jersey" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 w-[--radix-select-trigger-width]">
                      {allProducts.map(product => (
                        <SelectItem 
                          key={product.product_id} 
                          value={product.product_id}
                          disabled={selectedProducts.some(p => p?.product_id === product.product_id)}
                        >
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        {selectedProducts[0] && selectedProducts[1] && (
          <>
            <div className="hidden md:block bg-white border border-black/10 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/10 bg-black text-white">
                    <th className="font-body text-sm font-semibold text-left p-4 w-1/3">Specification</th>
                    <th className="font-body text-sm font-semibold text-center p-4 w-1/3">{selectedProducts[0].name}</th>
                    <th className="font-body text-sm font-semibold text-center p-4 w-1/3">{selectedProducts[1].name}</th>
                  </tr>
                </thead>
                <tbody>
                  {compareFields.map((field, index) => (
                    <tr key={field.key} className={index % 2 === 0 ? "bg-bone-white" : "bg-white"}>
                      <td className="font-body text-sm font-semibold p-4">{field.label}</td>
                      <td className="font-body text-sm text-center p-4">
                        {field.format(selectedProducts[0])}
                      </td>
                      <td className="font-body text-sm text-center p-4">
                        {field.format(selectedProducts[1])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4">
              {compareFields.map((field) => (
                <div key={field.key} className="bg-white border border-black/10 p-5">
                  <p className="font-body text-xs uppercase tracking-widest text-muted-text mb-3">{field.label}</p>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedProducts.map((product, productIndex) => (
                      <div key={`${field.key}-${productIndex}`} className="border border-black/10 bg-bone-white p-4">
                        <p className="font-heading text-sm mb-2">{product.name}</p>
                        <p className="font-body text-sm">{field.format(product)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {(!selectedProducts[0] || !selectedProducts[1]) && (
          <div className="text-center py-12 bg-white border border-black/10">
            <p className="font-body text-muted-text">
              Select two jerseys above to see the comparison
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default ComparePage;
