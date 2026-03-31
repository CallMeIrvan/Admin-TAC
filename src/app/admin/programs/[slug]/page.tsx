"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Loader2, ArrowLeft, Save, Tag, Search } from "lucide-react";
import Link from "next/link";
import { use } from "react";

interface ProgramEditorProps {
  params: Promise<{ slug: string }>;
}

export default function ProgramEditorPage({ params }: ProgramEditorProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const isCreating = resolvedParams.slug === "create";

  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [loading, setLoading] = useState(!isCreating);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    slug: "",
    name: "",
    description: "",
    type: "Sertifikasi",
    category: "sertifikasi",
    level: "Pemula",
    price: "",
    packagePrice: "",
    privatePrice: "",
    minParticipants: "",
    isFixedQuota: false,
    details: "",
    seoTitle: "",
    seoDescription: ""
  });

  useEffect(() => {
    const fetchProgram = async (slug: string) => {
      try {
        const docRef = doc(db, "programs", slug);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
              slug: docSnap.id,
              name: data.name || "",
              description: data.description || "",
              type: data.type || "Sertifikasi",
              category: data.category || "sertifikasi",
              level: data.level || "Pemula",
              price: data.price?.toString() || "",
              packagePrice: data.packagePrice?.toString() || "",
              privatePrice: data.privatePrice?.toString() || "",
              minParticipants: data.minParticipants?.toString() || "",
              isFixedQuota: data.isFixedQuota || false,
              details: data.details || "",
              seoTitle: data.seoTitle || "",
              seoDescription: data.seoDescription || ""
          });
        } else {
          alert("Program tidak ditemukan!");
          router.push("/admin/programs");
        }
      } catch (error) {
        console.error(error);
        alert("Gagal mengambil data program.");
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAdminAuth(true);
        if (!isCreating) {
          fetchProgram(resolvedParams.slug);
        }
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router, isCreating, resolvedParams.slug]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const docId = isCreating ? formData.slug : resolvedParams.slug;
      
      if (!docId.trim()) {
          throw new Error("Slug ID tidak boleh kosong!");
      }

      await setDoc(doc(db, "programs", docId.toLowerCase()), {
          ...formData,
          slug: docId.toLowerCase(),
          price: formData.price ? parseInt(formData.price) : null,
          packagePrice: formData.packagePrice ? parseInt(formData.packagePrice) : null,
          privatePrice: formData.privatePrice ? parseInt(formData.privatePrice) : null,
          minParticipants: formData.minParticipants ? parseInt(formData.minParticipants) : null,
      }, { merge: true });

      alert("Program berhasil disimpan!");
      router.push("/admin/programs");
    } catch (error: unknown) {
      alert("Gagal menyimpan program: " + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target;
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
    setFormData(prev => ({ ...prev, [target.name]: value }));
  };

  if (!isAdminAuth || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
         <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      <AdminHeader />

      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center mb-6">
          <Link href="/admin/programs" className="mr-4 text-slate-500 hover:text-slate-800 transition-colors">
             <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {isCreating ? "Buat Program Baru" : `Edit Program: ${formData.name}`}
              </h2>
              <p className="text-sm text-slate-500">Isi detail program, sertifikasi, kursus, harga dan konfigurasi SEO.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Editor */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h3 className="text-lg font-bold flex items-center mb-6 text-slate-800">
                        <Tag className="w-5 h-5 mr-2 text-blue-600" /> Informasi Dasar
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-slate-700">ID / URL Slug *</label>
                            <Input 
                                name="slug" 
                                value={formData.slug} 
                                onChange={handleChange} 
                                disabled={!isCreating}
                                required 
                                placeholder="Contoh: mos-excel"
                                className="font-mono bg-slate-50"
                            />
                            <p className="text-xs text-slate-400 mt-1">Hanya huruf kecil dan strip (-). Digunakan untuk URL program.</p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-slate-700">Nama Program *</label>
                            <Input name="name" value={formData.name} onChange={handleChange} required placeholder="Contoh: SERTIFIKASI MOS EXCEL" />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-1 text-slate-700">Deskripsi *</label>
                            <Textarea name="description" value={formData.description} onChange={handleChange} required rows={3} placeholder="Deskripsi singkat program..." />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1 text-slate-700">Tipe</label>
                                <select name="type" value={formData.type} onChange={handleChange} className="w-full flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                    <option value="Sertifikasi">Sertifikasi</option>
                                    <option value="Kursus">Kursus</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1 text-slate-700">Kategori</label>
                                <select name="category" value={formData.category} onChange={handleChange} className="w-full flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                    <option value="sertifikasi">sertifikasi</option>
                                    <option value="kursus">kursus</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1 text-slate-700">Level</label>
                                <select name="level" value={formData.level} onChange={handleChange} className="w-full flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                    <option value="Pemula">Pemula</option>
                                    <option value="Menengah">Menengah</option>
                                    <option value="Lanjutan">Lanjutan</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h3 className="text-lg font-bold flex items-center mb-6 text-slate-800">
                        <Tag className="w-5 h-5 mr-2 text-green-600" /> Detail Harga
                    </h3>
                    
                    {formData.type === "Sertifikasi" ? (
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-slate-700">Harga Sertifikasi (Rp)</label>
                            <Input name="price" type="number" value={formData.price} onChange={handleChange} placeholder="Misal: 1100000" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-slate-700">Harga Paket (Regular) (Rp)</label>
                                    <Input name="packagePrice" type="number" value={formData.packagePrice} onChange={handleChange} placeholder="5000000" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-slate-700">Harga Private (Rp)</label>
                                    <Input name="privatePrice" type="number" value={formData.privatePrice} onChange={handleChange} placeholder="2000000" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-slate-700">Minimal Peserta (Khusus Regular)</label>
                                    <Input name="minParticipants" type="number" value={formData.minParticipants} onChange={handleChange} placeholder="5" />
                                </div>
                                <div className="flex items-end pb-3">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                                        <input type="checkbox" name="isFixedQuota" checked={formData.isFixedQuota} onChange={handleChange} className="w-4 h-4 rounded" />
                                        Kuota Fix (Khusus Kelipatan, cth: 5/10)
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1 text-slate-700">Detail Info Harga (Singkat)</label>
                                <Input name="details" value={formData.details} onChange={handleChange} placeholder="Contoh: Minimal 5 orang / Private" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar Metadata */}
            <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 border-b border-indigo-100 mb-2">
                        <h3 className="text-lg font-bold flex items-center text-indigo-900">
                            <Search className="w-5 h-5 mr-2 text-indigo-600" /> SEO Metadata
                        </h3>
                        <p className="text-xs text-indigo-600 mt-1">Pengaturan SEO (Search Engine Optimization) yang digunakan oleh crawler Google.</p>
                    </div>
                    
                    <div className="p-5 space-y-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-slate-700">SEO Title Tag</label>
                            <Input 
                                name="seoTitle" 
                                value={formData.seoTitle} 
                                onChange={handleChange} 
                                placeholder={formData.name || "Meta judul halamaman"}
                            />
                            <p className="text-[11px] text-slate-500 mt-1">Biarkan kosong untuk otomatis memakai &apos;Nama Program&apos;. Maks 60 karakter.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-1 text-slate-700">SEO Meta Description</label>
                            <Textarea 
                                name="seoDescription" 
                                value={formData.seoDescription} 
                                onChange={handleChange} 
                                rows={4}
                                placeholder={formData.description || "Meta deskripsi"}
                            />
                            <p className="text-[11px] text-slate-500 mt-1">Biarkan kosong untuk memakai &apos;Deskripsi&apos;. Maks 160 karakter untuk Google Search.</p>
                        </div>
                        
                        <div className="bg-slate-50 border border-slate-200 rounded p-3 mt-4">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wide">Google Search Preview</p>
                            <p className="text-[#1a0dab] text-sm hover:underline cursor-pointer truncate max-w-full block">
                                {formData.seoTitle || formData.name || "Judul Halaman"} - The A Class
                            </p>
                            <p className="text-[#006621] text-xs mb-1 truncate">https://theaclassdps.com/program/{formData.slug || "url-slug"}</p>
                            <p className="text-[#545454] text-xs line-clamp-2 leading-relaxed">
                                {formData.seoDescription || formData.description || "Cuplikan deskripsi SEO yang akan muncul pada hasil pencarian google."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-8">
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mb-4 h-12 text-md" disabled={saving}>
                        {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                        {saving ? "Menyimpan..." : "Simpan Program"}
                    </Button>
                    <p className="text-xs text-center text-slate-500">
                        Perubahan akan langsung ter-refleksi di website publik.
                    </p>
                </div>
            </div>

        </form>
      </main>
    </div>
  );
}
