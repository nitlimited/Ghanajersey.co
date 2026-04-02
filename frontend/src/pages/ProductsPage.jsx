import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Filter, X, ChevronDown, Star, Grid, List } from "lucide-react";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Slider } from "../components/ui/slider";
import { Header, Footer, ProductCard, MobileBottomNav } from "./LandingPage";
import { API, getProductPath } from "../App";
import axios from "axios";
import SEO from "../components/SEO";

const categorySeoMap = {
  "official-tournament": {
    title: "Ghana Jersey Tournament Collection",
    description: "Buy Ghana jersey tournament styles and Black Stars-inspired match kits on GhanaJersey.co for shoppers in Ghana and abroad.",
    canonicalPath: "/products/ghana-jersey-tournament",
    keywords: "ghana jersey, black stars jersey, ghana tournament jersey"
  },
  "streetwear": {
    title: "Ghana Jersey Streetwear",
    description: "Shop Ghana jersey streetwear, culture-led football fashion, and modern Black Stars-inspired looks on GhanaJersey.co.",
    canonicalPath: "/products/ghana-jersey-streetwear",
    keywords: "ghana jersey streetwear, ghana jersey, black stars streetwear"
  },
  "fan": {
    title: "Ghana Fan Jersey Collection",
    description: "Browse fan-made Ghana jersey and Black Stars jersey styles built for supporters in Ghana and abroad.",
    canonicalPath: "/products/ghana-fan-jersey",
    keywords: "ghana fan jersey, ghana jersey, black stars jersey"
  },
  "retro": {
    title: "Retro Ghana Jersey Collection",
    description: "Shop retro Ghana jersey styles and vintage Black Stars-inspired football shirts on GhanaJersey.co.",
    canonicalPath: "/products/retro-ghana-jersey",
    keywords: "retro ghana jersey, ghana jersey retro, vintage ghana football shirt"
  },
  "creative-designer": {
    title: "Creative Ghana Jersey Designer Collection",
    description: "Discover creative Ghana jersey designs, football fashion, and original designer drops on GhanaJersey.co.",
    canonicalPath: "/products/creative-ghana-jersey",
    keywords: "creative ghana jersey, ghana jersey designer, ghana jersey"
  },
  "local-club": {
    title: "Local Club Ghana Jersey Collection",
    description: "Shop local club Ghana jersey styles and football-inspired shirts on GhanaJersey.co.",
    canonicalPath: "/products/local-club-ghana-jersey",
    keywords: "local club ghana jersey, ghana club jersey, ghana jersey"
  }
};

const categoryRouteMap = Object.fromEntries(
  Object.entries(categorySeoMap).map(([categoryId, seo]) => [categoryId, seo.canonicalPath])
);

const ProductsPage = ({ forcedCategory = "" }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState(forcedCategory || searchParams.get("category") || "");
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "latest");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");

  useEffect(() => {
    if (forcedCategory) {
      setSelectedCategory(forcedCategory);
    }
  }, [forcedCategory]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (forcedCategory || selectedCategory) params.append("category", forcedCategory || selectedCategory);
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
  }, [selectedCategory, forcedCategory, priceRange, sortBy, searchQuery, searchParams]);

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
    if (forcedCategory) {
      navigate("/products");
      return;
    }
    setSearchParams({});
  };

  const activeCategory = forcedCategory || selectedCategory;
  const hasActiveFilters = activeCategory || priceRange[0] > 0 || priceRange[1] < 500 || searchQuery;
  const categorySeo = activeCategory ? categorySeoMap[activeCategory] : null;

  return (
    <div className="min-h-screen bg-bone-white" data-testid="products-page">
      <SEO
        title={categorySeo?.title || "Shop Ghana Jersey and Black Stars Jersey Collection"}
        description={categorySeo?.description || "Browse Ghana jersey styles, Black Stars jersey options, retro Ghana football shirts, and designer kits across the full collection."}
        canonicalPath={categorySeo?.canonicalPath || `/products${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
        keywords={categorySeo?.keywords || `ghana jersey, black stars jersey, ghana football jersey, ${activeCategory || "ghana jersey shop"}`}
      />
      <Header forceLight={true} stickyAnnouncement={true} />

      {/* Page Header */}
      <div className="pt-12 pb-12 px-6 md:px-12 bg-black text-white">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-heading text-3xl md:text-4xl tracking-widest uppercase" data-testid="page-title">
            {activeCategory ? categories.find(c => c.id === activeCategory)?.name || "Shop" : "All Jerseys"}
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
                  onClick={() => {
                    if (forcedCategory) {
                      navigate("/products");
                      setShowFilters(false);
                      return;
                    }
                    setSelectedCategory("");
                  }}
                  className={`text-left font-body text-sm py-2 transition-colors ${!activeCategory ? 'text-black font-medium' : 'text-muted-text hover:text-black'}`}
                  data-testid="category-all"
                >
                  All Categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      if (categoryRouteMap[category.id]) {
                        navigate(categoryRouteMap[category.id]);
                        setShowFilters(false);
                        return;
                      }
                      setSelectedCategory(category.id);
                    }}
                    className={`text-left font-body text-sm py-2 transition-colors ${activeCategory === category.id ? 'text-black font-medium' : 'text-muted-text hover:text-black'}`}
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
                      to={getProductPath(product)}
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
      <MobileBottomNav />
    </div>
  );
};

export default ProductsPage;
