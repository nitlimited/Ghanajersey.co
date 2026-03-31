import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { Header, Footer, MobileBottomNav } from "./LandingPage";
import { API } from "../App";
import SEO from "../components/SEO";
import { Button } from "../components/ui/button";

const renderContent = (content) =>
  (content || "").split(/\n{2,}/).filter(Boolean).map((paragraph, index) => (
    <p key={index} className="font-body text-base md:text-lg leading-8 text-black/85 mb-6 whitespace-pre-line">
      {paragraph}
    </p>
  ));

const BlogPostPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const [postResponse, recentResponse] = await Promise.all([
          axios.get(`${API}/blogs/${slug}`),
          axios.get(`${API}/blogs?limit=4`)
        ]);
        setPost(postResponse.data);
        setRecentPosts(recentResponse.data.filter((item) => item.slug !== slug).slice(0, 3));
      } catch (error) {
        console.error("Failed to fetch blog post:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
    window.scrollTo(0, 0);
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bone-white">
        <Header forceLight={true} stickyAnnouncement={true} />
        <div className="pt-20 max-w-4xl mx-auto px-6 md:px-12 animate-pulse">
          <div className="h-10 bg-gray-200 w-2/3 mb-6"></div>
          <div className="h-4 bg-gray-200 w-1/3 mb-10"></div>
          <div className="aspect-[16/9] bg-gray-200 mb-8"></div>
          <div className="h-5 bg-gray-200 w-full mb-4"></div>
          <div className="h-5 bg-gray-200 w-full mb-4"></div>
          <div className="h-5 bg-gray-200 w-4/5"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-bone-white">
        <Header forceLight={true} stickyAnnouncement={true} />
        <div className="pt-24 pb-24 text-center px-6">
          <h1 className="font-heading text-3xl tracking-wide uppercase">Article Not Found</h1>
          <p className="font-body text-muted-text mt-4">That Ghana jersey story is not available right now.</p>
          <Link to="/blog" className="inline-block mt-8">
            <Button className="bg-black text-white hover:bg-ashanti-gold hover:text-black">Browse Articles</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone-white">
      <SEO
        title={post.meta_title || post.title}
        description={post.meta_description || post.excerpt}
        canonicalPath={`/blog/${post.slug}`}
        image={post.og_image || post.featured_image}
        type="article"
        keywords={(post.keywords || []).join(", ")}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.meta_description || post.excerpt,
          image: post.og_image || post.featured_image,
          author: {
            "@type": "Person",
            name: post.author_name || "GhanaJersey.co Editorial Team"
          },
          publisher: {
            "@type": "Organization",
            name: "GhanaJersey.co"
          },
          datePublished: post.publish_at || post.created_at,
          dateModified: post.updated_at || post.publish_at || post.created_at,
          mainEntityOfPage: `${window.location.origin}/blog/${post.slug}`
        }}
      />
      <Header forceLight={true} stickyAnnouncement={true} />

      <article className="pt-12 pb-24 px-6 md:px-12 max-w-4xl mx-auto">
        <nav className="font-body text-sm text-muted-text mb-8">
          <Link to="/" className="hover:text-black">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/blog" className="hover:text-black">Blog</Link>
          <span className="mx-2">/</span>
          <span className="text-black">{post.title}</span>
        </nav>

        <p className="font-body text-xs uppercase tracking-[0.25em] text-ashanti-gold mb-4">{post.category || "News"}</p>
        <h1 className="font-heading text-3xl md:text-5xl tracking-wide uppercase leading-tight">{post.title}</h1>
        <div className="flex flex-wrap gap-4 font-body text-sm text-muted-text mt-6">
          <span>By {post.author_name || "GhanaJersey.co Editorial Team"}</span>
          <span>{post.reading_minutes} min read</span>
          <span>{new Date(post.publish_at || post.created_at).toLocaleDateString()}</span>
        </div>

        {post.featured_image && (
          <div className="mt-10 aspect-[16/9] overflow-hidden border border-black/10">
            <img src={post.featured_image} alt={post.featured_image_alt || post.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="mt-10">
          {renderContent(post.content)}
        </div>

        {post.tags?.length > 0 && (
          <div className="mt-10 pt-8 border-t border-black/10 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag} className="px-3 py-2 border border-black/10 font-body text-xs uppercase tracking-wider">
                {tag}
              </span>
            ))}
          </div>
        )}

        {recentPosts.length > 0 && (
          <section className="mt-20">
            <h2 className="font-heading text-2xl tracking-wide uppercase mb-8">More Ghana Jersey Stories</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentPosts.map((item) => (
                <Link key={item.blog_id} to={`/blog/${item.slug}`} className="bg-white border border-black/10 p-5 hover:border-black transition-colors">
                  <p className="font-body text-xs uppercase tracking-[0.2em] text-muted-text mb-3">{item.category || "News"}</p>
                  <h3 className="font-heading text-lg tracking-wide">{item.title}</h3>
                  <p className="font-body text-sm text-muted-text mt-3 leading-6">{item.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default BlogPostPage;
