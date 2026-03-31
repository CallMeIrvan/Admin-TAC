"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Loader2, Plus, Edit, Trash2, Database, Briefcase } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils";

interface ProgramData {
  id: string; // from doc.id (which is also the slug)
  slug: string;
  name: string;
  type: string;
  price?: number;
  packagePrice?: number;
  level?: string;
  category?: string;
}

export default function ProgramsListPage() {
  const router = useRouter();
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [programs, setPrograms] = useState<ProgramData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAdminAuth(true);
        fetchPrograms();
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "programs"));
      setPrograms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProgramData)));
    } catch (error) {
      console.error("Error fetching programs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus program "${name}" secara permanen? Menghapus program ini dapat merusak halaman publik jika URL (slug) tidak di-redirect.`)) return;
    try {
      await deleteDoc(doc(db, "programs", id));
      setPrograms(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert("Gagal menghapus: " + (err as Error).message);
    }
  };

  if (!isAdminAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
         <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <AdminHeader />

      <main className="container mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
               <h2 className="text-2xl font-bold text-slate-800">Manajemen Program / Produk</h2>
               <p className="text-sm text-slate-500">Kelola Sertifikasi & Kursus, harga, serta metadata SEO.</p>
            </div>
            <Link href="/admin/programs/create">
               <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Program Baru
               </Button>
            </Link>
        </div>

        {loading ? (
            <div className="bg-white rounded-xl shadow-sm border p-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                <p>Memuat data program...</p>
            </div>
        ) : programs.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-slate-500">
                <Database className="w-12 h-12 inline-block mb-3 text-slate-300" />
                <p className="text-lg font-medium text-slate-700">Belum ada program</p>
                <p className="mb-6">Mulai tambahkan program kursus atau sertifikasi pertama Anda.</p>
                <Link href="/admin/programs/create">
                    <Button variant="outline">Buat Sekarang</Button>
                </Link>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {programs.map(prog => (
                   <div key={prog.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                       <div className="p-6 flex-grow">
                           <div className="flex justify-between items-start mb-4">
                               <div className={`${prog.type === 'Sertifikasi' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'} p-2 rounded-lg`}>
                                   <Briefcase className="w-6 h-6" />
                               </div>
                               <span className={`text-xs font-semibold px-2 py-1 rounded tracking-wider uppercase ${prog.type === 'Sertifikasi' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                   {prog.type}
                               </span>
                           </div>
                           <h3 className="text-lg font-bold text-slate-800 mb-1 leading-tight">{prog.name}</h3>
                           <p className="text-xs text-slate-400 mb-4 items-center flex gap-1">
                               /{prog.slug}
                           </p>
                           <p className="font-bold text-slate-700">
                               {prog.type === 'Sertifikasi' ? formatRupiah(prog.price || 0) : formatRupiah(prog.packagePrice || 0) + ' / paket'}
                           </p>
                       </div>
                       <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-between gap-2">
                           <Link href={`/admin/programs/${prog.id}`} className="flex-1">
                               <Button variant="outline" className="w-full bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200">
                                   <Edit className="w-4 h-4 mr-2" />
                                   Edit Details
                               </Button>
                           </Link>
                           <Button variant="outline" className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-100" onClick={() => handleDelete(prog.id, prog.name)}>
                               <Trash2 className="w-4 h-4" />
                           </Button>
                       </div>
                   </div>
               ))}
            </div>
        )}
      </main>
    </div>
  );
}
