import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, ExternalLink, FileText, Bold, Italic, Heading2, Heading3, List, Quote, Link2, Eye } from "lucide-react";
import axios from "axios";
import { Header, Footer } from "./LandingPage";
import { useAuth, API, ADMIN_PORTAL_PATH } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  featured_image: "",
  featured_image_alt: "",
  category: "News",
  tags: "",
  keywords: "",
  author_name: "",
  meta_title: "",
  meta_description: "",
  canonical_url: "",
  og_image: "",
  is_published: false
};

const sanitizeBlogHtml = (content) => {
  if (!content) return "";

  let html = content;
  html = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
  html = html.replace(/\son\w+="[^"]*"/gi, "");
  html = html.replace(/\son\w+='[^']*'/gi, "");
  html = html.replace(/javascript:/gi, "");

  const allowedTags = /<\/?(p|br|strong|em|h2|h3|ul|ol|li|blockquote|a)\b[^>]*>/gi;
  return html.replace(/<[^>]+>/g, (tag) => (tag.match(allowedTags) ? tag : ""));
};

const AdminBlogPage = () => {
  const { token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const contentRef = useRef(null);

  const fetchPosts = async () => {
    try {
      const response = await axios.get(`${API}/admin/blogs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(response.data);
    } catch (error) {
      toast.error("Failed to load blog posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [token]);

  const startEdit = (post) => {
    setEditingPost(post);
    setForm({
      title: post.title || "",
      slug: post.slug || "",
      excerpt: post.excerpt || "",
      content: post.content || "",
      featured_image: post.featured_image || "",
      featured_image_alt: post.featured_image_alt || "",
      category: post.category || "News",
      tags: (post.tags || []).join(", "),
      keywords: (post.keywords || []).join(", "),
      author_name: post.author_name || "",
      meta_title: post.meta_title || "",
      meta_description: post.meta_description || "",
      canonical_url: post.canonical_url || "",
      og_image: post.og_image || "",
      is_published: !!post.is_published
    });
  };

  const resetForm = () => {
    setEditingPost(null);
    setForm(emptyForm);
  };

  const savePost = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content) {
      toast.error("Title and content are required");
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      tags: form.tags.split(",").map((item) => item.trim()).filter(Boolean),
      keywords: form.keywords.split(",").map((item) => item.trim()).filter(Boolean)
    };

    try {
      if (editingPost) {
        await axios.put(`${API}/admin/blogs/${editingPost.blog_id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Blog post updated");
      } else {
        await axios.post(`${API}/admin/blogs`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Blog post created");
      }
      resetForm();
      fetchPosts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save blog post");
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async (blogId) => {
    if (!window.confirm("Delete this blog post?")) return;

    try {
      await axios.delete(`${API}/admin/blogs/${blogId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Blog post deleted");
      if (editingPost?.blog_id === blogId) {
        resetForm();
      }
      fetchPosts();
    } catch (error) {
      toast.error("Failed to delete blog post");
    }
  };

  const updateContent = (nextContent, selectionStart = null, selectionEnd = null) => {
    setForm((prev) => ({ ...prev, content: nextContent }));
    requestAnimationFrame(() => {
      if (!contentRef.current) return;
      contentRef.current.focus();
      if (selectionStart !== null && selectionEnd !== null) {
        contentRef.current.setSelectionRange(selectionStart, selectionEnd);
      }
    });
  };

  const wrapSelection = (before, after = "", placeholder = "Text") => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = form.content.slice(start, end) || placeholder;
    const nextContent = `${form.content.slice(0, start)}${before}${selected}${after}${form.content.slice(end)}`;
    updateContent(nextContent, start + before.length, start + before.length + selected.length);
  };

  const insertBlock = (template, placeholder = "") => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = form.content.slice(start, end) || placeholder;
    const block = typeof template === "function" ? template(selected) : template;
    const nextContent = `${form.content.slice(0, start)}${block}${form.content.slice(end)}`;
    const cursor = start + block.length;
    updateContent(nextContent, cursor, cursor);
  };

  const insertLink = () => {
    const url = window.prompt("Enter the link URL", "https://");
    if (!url) return;
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = form.content.slice(start, end) || "Link text";
    const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${selected}</a>`;
    const nextContent = `${form.content.slice(0, start)}${linkHtml}${form.content.slice(end)}`;
    updateContent(nextContent, start + linkHtml.length, start + linkHtml.length);
  };

  const formattingButtons = [
    { label: "Bold", icon: Bold, action: () => wrapSelection("<strong>", "</strong>") },
    { label: "Italic", icon: Italic, action: () => wrapSelection("<em>", "</em>") },
    { label: "H2", icon: Heading2, action: () => wrapSelection("<h2>", "</h2>", "Section heading") },
    { label: "H3", icon: Heading3, action: () => wrapSelection("<h3>", "</h3>", "Subheading") },
    { label: "List", icon: List, action: () => insertBlock((selected) => `<ul>\n  <li>${selected || "List item"}</li>\n</ul>\n`) },
    { label: "Quote", icon: Quote, action: () => wrapSelection("<blockquote>", "</blockquote>", "Quote") },
    { label: "Link", icon: Link2, action: insertLink }
  ];

  return (
    <div className="min-h-screen bg-bone-white">
      <Header forceLight={true} stickyAnnouncement={true} />
      <div className="pt-12 pb-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <p className="font-body text-sm uppercase tracking-[0.25em] text-ashanti-gold mb-3">Admin Publishing</p>
            <h1 className="font-heading text-3xl tracking-wide uppercase">Blog Editor</h1>
            <p className="font-body text-muted-text mt-3 max-w-2xl">
              Publish Ghana jersey news, Black Stars jersey buying guides, and brand stories with full SEO fields including slug, meta title, description, canonical URL, OG image, tags, and keywords.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to={`${ADMIN_PORTAL_PATH}`}>
              <Button variant="outline" className="border-black">Back to Dashboard</Button>
            </Link>
            <Button className="bg-black text-white hover:bg-ashanti-gold hover:text-black" onClick={resetForm}>
              <Plus size={16} className="mr-2" /> New Post
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-10">
          <form onSubmit={savePost} className="bg-white border border-black/10 p-6 md:p-8 space-y-6">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} className="mt-2" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} className="mt-2" placeholder="ghana-jersey-buying-guide" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="News">News</SelectItem>
                    <SelectItem value="Buying Guide">Buying Guide</SelectItem>
                    <SelectItem value="Black Stars">Black Stars</SelectItem>
                    <SelectItem value="Style">Style</SelectItem>
                    <SelectItem value="Care Tips">Care Tips</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Excerpt</Label>
              <Textarea value={form.excerpt} onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))} className="mt-2 min-h-[90px]" />
            </div>
            <div>
              <Label>Article Content</Label>
              <div className="mt-2 flex flex-wrap gap-2 border border-black/10 bg-bone-white p-3">
                {formattingButtons.map((button) => {
                  const Icon = button.icon;
                  return (
                    <button
                      key={button.label}
                      type="button"
                      onClick={button.action}
                      className="inline-flex items-center gap-2 border border-black/10 bg-white px-3 py-2 font-body text-xs uppercase tracking-wide hover:border-black"
                    >
                      <Icon size={14} />
                      {button.label}
                    </button>
                  );
                })}
              </div>
              <Textarea
                ref={contentRef}
                value={form.content}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                className="mt-2 min-h-[320px]"
                placeholder="Write the article body here. You can use HTML tags like <h2>, <strong>, <em>, <ul>, <blockquote>, and links."
              />
              <p className="font-body text-xs text-muted-text mt-2">
                Formatting supported: headings, bold, italic, paragraphs, lists, quotes, line breaks, and links.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Eye size={16} className="text-ashanti-gold" />
                <h3 className="font-heading text-sm tracking-wide uppercase">Live Preview</h3>
              </div>
              <div className="border border-black/10 bg-bone-white p-5">
                <div
                  className="blog-editor-preview prose prose-neutral max-w-none [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:tracking-wide [&_h2]:uppercase [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:font-heading [&_h3]:text-xl [&_h3]:tracking-wide [&_h3]:uppercase [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:font-body [&_p]:text-sm [&_p]:leading-7 [&_p]:text-black/80 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:font-body [&_li]:text-sm [&_li]:leading-7 [&_blockquote]:border-l-4 [&_blockquote]:border-ashanti-gold [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-black/70 [&_a]:text-black [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(form.content) || "<p>Preview your formatted article here.</p>" }}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Featured Image URL</Label>
                <Input value={form.featured_image} onChange={(e) => setForm((prev) => ({ ...prev, featured_image: e.target.value }))} className="mt-2" />
              </div>
              <div>
                <Label>Featured Image Alt Text</Label>
                <Input value={form.featured_image_alt} onChange={(e) => setForm((prev) => ({ ...prev, featured_image_alt: e.target.value }))} className="mt-2" placeholder="Ghana jersey on display" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Author Name</Label>
                <Input value={form.author_name} onChange={(e) => setForm((prev) => ({ ...prev, author_name: e.target.value }))} className="mt-2" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-3 font-body text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_published: e.target.checked }))}
                    className="w-4 h-4 accent-black"
                  />
                  Publish immediately
                </label>
              </div>
            </div>
            <div className="border-t border-black/10 pt-6">
              <h2 className="font-heading text-lg tracking-wide uppercase mb-4">SEO Setup</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Meta Title</Label>
                  <Input value={form.meta_title} onChange={(e) => setForm((prev) => ({ ...prev, meta_title: e.target.value }))} className="mt-2" />
                </div>
                <div>
                  <Label>OG Image URL</Label>
                  <Input value={form.og_image} onChange={(e) => setForm((prev) => ({ ...prev, og_image: e.target.value }))} className="mt-2" />
                </div>
              </div>
              <div className="mt-4">
                <Label>Meta Description</Label>
                <Textarea value={form.meta_description} onChange={(e) => setForm((prev) => ({ ...prev, meta_description: e.target.value }))} className="mt-2 min-h-[90px]" />
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Keywords</Label>
                  <Input value={form.keywords} onChange={(e) => setForm((prev) => ({ ...prev, keywords: e.target.value }))} className="mt-2" placeholder="ghana jersey, black stars jersey, ghana football jersey" />
                </div>
                <div>
                  <Label>Tags</Label>
                  <Input value={form.tags} onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))} className="mt-2" placeholder="ghana jersey, buying guide, black stars" />
                </div>
              </div>
              <div className="mt-4">
                <Label>Canonical URL</Label>
                <Input value={form.canonical_url} onChange={(e) => setForm((prev) => ({ ...prev, canonical_url: e.target.value }))} className="mt-2" placeholder="https://ghanajersey.co/blog/your-post-slug" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving} className="bg-black text-white hover:bg-ashanti-gold hover:text-black">
                <FileText size={16} className="mr-2" /> {saving ? "Saving..." : editingPost ? "Update Post" : "Create Post"}
              </Button>
              {editingPost && (
                <Button type="button" variant="outline" className="border-black" onClick={resetForm}>
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>

          <div className="space-y-4">
            <h2 className="font-heading text-xl tracking-wide uppercase">Published and Draft Posts</h2>
            {loading ? (
              <div className="bg-white border border-black/10 p-6">Loading blog posts...</div>
            ) : posts.length > 0 ? (
              posts.map((post) => (
                <div key={post.blog_id} className="bg-white border border-black/10 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-body uppercase tracking-wider ${post.is_published ? "bg-ghana-green/10 text-ghana-green" : "bg-ashanti-gold/10 text-ashanti-gold"}`}>
                          {post.is_published ? "Published" : "Draft"}
                        </span>
                        <span className="font-body text-xs text-muted-text uppercase tracking-wider">{post.category || "News"}</span>
                      </div>
                      <h3 className="font-heading text-lg tracking-wide">{post.title}</h3>
                      <p className="font-body text-sm text-muted-text mt-2">{post.excerpt}</p>
                      <p className="font-body text-xs text-muted-text mt-3">Slug: {post.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      {post.slug && post.is_published && (
                        <Link to={`/blog/${post.slug}`} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="icon" className="border-black">
                            <ExternalLink size={16} />
                          </Button>
                        </Link>
                      )}
                      <Button variant="outline" size="icon" className="border-black" onClick={() => startEdit(post)}>
                        <Pencil size={16} />
                      </Button>
                      <Button variant="outline" size="icon" className="border-ghana-red text-ghana-red" onClick={() => deletePost(post.blog_id)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border border-black/10 p-6 text-muted-text">No blog posts yet.</div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AdminBlogPage;
