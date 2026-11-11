"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatInr } from "@/lib/currency";

interface ProductItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  basePriceInr: number;
  originalPriceInr: number | null;
  categorySlug: string;
  categoryName: string | null;
  badge: string | null;
  isPublished: boolean;
  isArchived: boolean;
  variantCount: number;
  totalStock: number;
  createdAt: Date;
}

interface AdminProductsClientProps {
  initialProducts: ProductItem[];
  categories: Array<{ slug: string; name: string }>;
}

export default function AdminProductsClient({
  initialProducts,
  categories,
}: AdminProductsClientProps) {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New product form modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    categorySlug: categories[0]?.slug || "men",
    basePriceInr: 2499,
    description: "",
    initialSku: "",
    initialSize: "M",
    initialColorName: "Ivory",
    initialColorHex: "#FFFFF0",
    initialStock: 50,
  });

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      search === "" ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || p.categorySlug === selectedCategory;
    const matchesArchived = showArchived ? true : !p.isArchived;

    return matchesSearch && matchesCategory && matchesArchived;
  });

  const handleToggleArchive = async (id: string, currentlyArchived: boolean) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/products/${id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: currentlyArchived ? "unarchive" : "archive" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update archive status");

      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, isArchived: !currentlyArchived, isPublished: currentlyArchived }
            : p
        )
      );

      setStatusMessage({
        type: "success",
        text: currentlyArchived
          ? "Garment restored and published."
          : "Garment successfully archived.",
      });
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const payload = {
        title: formData.title,
        slug: formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        categorySlug: formData.categorySlug,
        basePriceInr: Number(formData.basePriceInr),
        description: formData.description,
        variants: [
          {
            sku: formData.initialSku || `${formData.slug || "LMR"}-M-IVR`,
            size: formData.initialSize,
            colorName: formData.initialColorName,
            colorHex: formData.initialColorHex,
            stockQuantity: Number(formData.initialStock),
          },
        ],
      };

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create garment");

      setStatusMessage({ type: "success", text: "New garment created in catalog!" });
      setIsCreateOpen(false);

      // Refresh list
      const ref = await fetch("/api/admin/products");
      if (ref.ok) {
        const refreshed = await ref.json();
        setProducts(refreshed.products);
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-[#2A9D8F] font-semibold">
            Catalog Management
          </span>
          <h1 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">
            Garment Catalog
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Create, edit, archive, and manage bespoke menswear and youth garments.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 rounded-lg bg-[#264653] text-white text-xs font-semibold tracking-wider uppercase hover:bg-[#1E353F] transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <span>+</span>
          <span>Create New Garment</span>
        </button>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div
          className={`p-4 rounded-lg text-xs font-medium flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-stone-400 hover:text-stone-700 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Search by title or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs px-3.5 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2A9D8F] bg-stone-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-stone-300 text-[#264653] focus:ring-[#2A9D8F]"
            />
            <span>Include Archived</span>
          </label>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold bg-stone-50">
                <th className="py-3.5 px-4">Garment</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Variants</th>
                <th className="py-3.5 px-4">Total Stock</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-stone-400">
                    No garments match the specified criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-stone-900">
                      <div>
                        <span className="font-semibold text-stone-900">{p.title}</span>
                        <p className="text-[10px] text-stone-400 font-mono">{p.slug}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">
                      {p.categoryName || p.categorySlug}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-stone-900">
                      {formatInr(p.basePriceInr)}
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">{p.variantCount} SKUs</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          p.totalStock === 0
                            ? "text-rose-600"
                            : p.totalStock <= 10
                            ? "text-amber-600"
                            : "text-emerald-700"
                        }`}
                      >
                        {p.totalStock} units
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {p.isArchived ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                          Archived
                        </span>
                      ) : p.isPublished ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Published
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Link
                        href={`/products/${p.slug}`}
                        target="_blank"
                        className="text-stone-500 hover:text-stone-900 font-medium"
                      >
                        View ↗
                      </Link>
                      <button
                        onClick={() => handleToggleArchive(p.id, p.isArchived)}
                        disabled={isLoading}
                        className={`font-medium ${
                          p.isArchived
                            ? "text-emerald-600 hover:text-emerald-800"
                            : "text-stone-500 hover:text-rose-600"
                        }`}
                      >
                        {p.isArchived ? "Restore" : "Archive"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Product Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h2 className="text-xl font-serif font-bold text-stone-900">
                Create Garment
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Garment Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Bengal Raw Silk Sherwani"
                  value={formData.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                    setFormData({ ...formData, title, slug });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Slug</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Category</label>
                  <select
                    value={formData.categorySlug}
                    onChange={(e) => setFormData({ ...formData, categorySlug: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
                  >
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Base Price (INR)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.basePriceInr}
                  onChange={(e) => setFormData({ ...formData, basePriceInr: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Artisanal craftsmanship, weave details, bespoke fit..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
                />
              </div>

              <div className="pt-2 border-t border-stone-100">
                <p className="font-semibold text-stone-800 mb-2">Initial Garment Variant</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-stone-500 text-[10px] uppercase">Size</label>
                    <input
                      type="text"
                      value={formData.initialSize}
                      onChange={(e) => setFormData({ ...formData, initialSize: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-stone-300"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-500 text-[10px] uppercase">Color</label>
                    <input
                      type="text"
                      value={formData.initialColorName}
                      onChange={(e) => setFormData({ ...formData, initialColorName: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-stone-300"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-500 text-[10px] uppercase">Opening Stock</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.initialStock}
                      onChange={(e) => setFormData({ ...formData, initialStock: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded border border-stone-300"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 font-medium hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-lg bg-[#264653] text-white font-semibold hover:bg-[#1E353F]"
                >
                  {isLoading ? "Saving..." : "Create Garment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
