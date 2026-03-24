import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Filter, X, ChevronDown, Star, Grid, List } from "lucide-react";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Slider } from "../components/ui/slider";
import { Header, Footer, ProductCard } from "./LandingPage";
import { API } from "../App";
import axios from "axios";

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "latest");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategory) params.append("category", selectedCategory);
        if (priceRange[0] > 0) params.append("min_price", priceRange[0]);
        if (priceRange[1] < 500) params.append("max_price", priceRange[1]);
        if (sortBy) params.append("sort_by", sortBy);
        if (searchQuery) params.append("search", searchQuery);
        if (searchParams.get("featured")) params.append("featured", "true");

        const response = await axios.get(`${API}/products?${params.toString()}`);
        setProducts(response.data);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory, priceRange, sortBy, searchQuery, searchParams]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API}/products/categories`);
        setCategories(response.data);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };

    fetchCategories();
  }, []);

  const clearFilters = () => {
    setSelectedCategory("");
    setPriceRange([0, 500]);
    setSortBy("latest");
    setSearchQuery("");
    setSearchParams({});
  };

  const hasActiveFilters = selectedCategory || priceRange[0] > 0 || priceRange[1] < 500 || searchQuery;

  return (
    <div className="min-h-screen bg-bone-white" data-testid="products-page">
      <Header forceLight={true} />

      {/* Page Header */}
      <div className="pt-32 pb-12 px-6 md:px-12 bg-black text-white">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-heading text-3xl md:text-4xl tracking-widest uppercase" data-testid="page-title">
            {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name || "Shop" : "All Jerseys"}
          </h1>
          <p className="font-body text-sm text-white/60 mt-2">
            {products.length} products
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-8 border-b border-black/10">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className="border-black"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="filter-toggle"
            >
              <Filter size={16} className="mr-2" />
              Filters
              {hasActiveFilters && <span className="ml-2 w-2 h-2 bg-ashanti-gold rounded-full"></span>}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="text-sm" data-testid="clear-filters">
                Clear all
              </Button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 ${viewMode === "grid" ? "text-black" : "text-muted-text"}`}
                data-testid="view-grid"
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${viewMode === "list" ? "text-black" : "text-muted-text"}`}
                data-testid="view-list"
              >
                <List size={20} />
              </button>
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] border-black rounded-none" data-testid="sort-select">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-12">
          {/* Filters Sidebar */}
          <aside className={`${showFilters ? 'block' : 'hidden'} md:block w-full md:w-64 flex-shrink-0`}>
            {/* Search */}
            <div className="mb-8">
              <h3 className="font-heading text-sm tracking-widest uppercase mb-4">Search</h3>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jerseys..."
                className="w-full border-b border-black/20 bg-transparent py-3 font-body text-sm focus:border-black outline-none"
                data-testid="search-input"
              />
            </div>

            {/* Categories */}
            <div className="mb-8">
              <h3 className="font-heading text-sm tracking-widest uppercase mb-4">Categories</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setSelectedCategory("")}
                  className={`text-left font-body text-sm py-2 transition-colors ${!selectedCategory ? 'text-black font-medium' : 'text-muted-text hover:text-black'}`}
                  data-testid="category-all"
                >
                  All Categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`text-left font-body text-sm py-2 transition-colors ${selectedCategory === category.id ? 'text-black font-medium' : 'text-muted-text hover:text-black'}`}
                    data-testid={`category-filter-${category.id}`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-8">
              <h3 className="font-heading text-sm tracking-widest uppercase mb-4">Price Range</h3>
              <Slider
                value={priceRange}
                onValueChange={setPriceRange}
                min={0}
                max={500}
                step={10}
                className="mb-4"
                data-testid="price-slider"
              />
              <div className="flex justify-between font-body text-sm text-muted-text">
                <span>${priceRange[0]}</span>
                <span>${priceRange[1]}</span>
              </div>
            </div>

            {/* Mobile Close */}
            <Button
              className="md:hidden w-full mt-4"
              onClick={() => setShowFilters(false)}
            >
              Apply Filters
            </Button>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'} gap-6`}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[3/4] bg-gray-200"></div>
                    <div className="h-4 bg-gray-200 mt-4 w-3/4"></div>
                    <div className="h-4 bg-gray-200 mt-2 w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'} gap-6`}>
                {products.map((product) => (
                  viewMode === 'grid' ? (
                    <ProductCard key={product.product_id} product={product} />
                  ) : (
                    <Link
                      key={product.product_id}
                      to={`/products/${product.product_id}`}
                      className="flex gap-6 border border-transparent hover:border-black transition-all p-4"
                      data-testid={`product-list-${product.product_id}`}
                    >
                      <div className="w-32 h-40 flex-shrink-0 overflow-hidden bg-gray-100">
                        <img
                          src={product.images?.[0] || "https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=300"}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-heading text-lg tracking-wide uppercase">{product.name}</h3>
                        <p className="font-body text-sm text-muted-text mt-2 line-clamp-2">{product.description}</p>
                        <div className="flex items-center gap-4 mt-4">
                          <span className="font-body text-lg font-medium">{product.currency} {product.price.toFixed(2)}</span>
                          {product.rating > 0 && (
                            <div className="flex items-center gap-1">
                              <Star size={14} fill="#D4AF37" className="text-ashanti-gold" />
                              <span className="font-body text-sm text-muted-text">{product.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="font-body text-lg text-muted-text mb-4">No products found</p>
                <Button variant="outline" onClick={clearFilters} className="border-black">
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ProductsPage;
