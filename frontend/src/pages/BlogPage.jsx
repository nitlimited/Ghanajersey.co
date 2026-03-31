import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import axios from "axios";
import { Header, Footer, MobileBottomNav } from "./LandingPage";
import { API } from "../App";
import SEO from "../components/SEO";
import { Button } from "../components/ui/button";

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await axios.get(`${API}/blogs?limit=24`);
        setPosts(response.data);
      } catch (error) {
        console.error("Failed to fetch blog posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen bg-bone-white">
      <SEO
        title="Ghana Jersey Blog, Black Stars Jersey News & Style Guides"
        description="Read Ghana jersey news, Black Stars jersey updates, match-day style guides, and buying tips. Explore fresh stories built to help fans find the right Ghana jersey."
        canonicalPath="/blog"
        keywords="ghana jersey blog, black stars jersey news, ghana football jersey guide, ghana jersey style, black stars shirt blog"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "GhanaJersey.co Blog",
          description: "News, buying guides, and style stories around Ghana jerseys and Black Stars jerseys.",
          url: `${window.location.origin}/blog`
        }}
      />
      <Header forceLight={true} stickyAnnouncement={true} />

      <div className="pt-12 pb-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="max-w-3xl mb-14">
          <p className="font-body text-sm uppercase tracking-[0.3em] text-ashanti-gold mb-4">Journal</p>
          <h1 className="font-heading text-3xl md:text-5xl tracking-wide uppercase">Ghana Jersey News, Buying Guides and Black Stars Stories</h1>
          <p className="font-body text-base text-muted-text mt-5 leading-7">
            Follow Ghana jersey trends, Black Stars jersey releases, local designer spotlights, and practical care tips that help fans and collectors shop with confidence.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="animate-pulse bg-white border border-black/10">
                <div className="aspect-[4/3] bg-gray-200"></div>
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-gray-200 w-1/3"></div>
                  <div className="h-6 bg-gray-200 w-4/5"></div>
                  <div className="h-4 bg-gray-200 w-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <article key={post.blog_id} className="bg-white border border-black/10 overflow-hidden group">
                {post.featured_image && (
                  <Link to={`/blog/${post.slug}`} className="block aspect-[4/3] overflow-hidden">
                    <img
                      src={post.featured_image}
                      alt={post.featured_image_alt || post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </Link>
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-muted-text mb-4">
                    <span>{post.category || "News"}</span>
                    <span>{post.reading_minutes} min read</span>
                  </div>
                  <Link to={`/blog/${post.slug}`}>
                    <h2 className="font-heading text-xl tracking-wide leading-snug group-hover:text-ashanti-gold transition-colors">
                      {post.title}
                    </h2>
                  </Link>
                  <p className="font-body text-sm text-muted-text mt-4 leading-6">{post.excerpt}</p>
                  <Link to={`/blog/${post.slug}`} className="inline-flex items-center gap-2 mt-6 font-body text-sm font-semibold hover:text-ashanti-gold transition-colors">
                    Read Article <ChevronRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-black/10 p-10 text-center">
            <h2 className="font-heading text-2xl tracking-wide">First stories are on the way</h2>
            <p className="font-body text-muted-text mt-3">Publish your first Ghana jersey article from the admin blog editor.</p>
          </div>
        )}

        <div className="mt-16 bg-black text-white p-8 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="font-body text-xs uppercase tracking-[0.25em] text-white/60 mb-3">Need a starting point?</p>
            <h2 className="font-heading text-2xl md:text-3xl tracking-wide uppercase">Shop the latest Ghana jersey collection</h2>
          </div>
          <Link to="/products">
            <Button className="bg-ashanti-gold text-black hover:bg-white px-8 py-6 font-body uppercase tracking-widest">
              Browse Jerseys
            </Button>
          </Link>
        </div>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default BlogPage;
