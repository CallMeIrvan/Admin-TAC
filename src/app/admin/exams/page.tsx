"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Loader2, Plus, Edit, Trash2, Database, BookOpen } from "lucide-react";
import Link from "next/link";

interface ExamData {
  id: string;
  title: string;
  programId: string;
  type: string;
  questions?: any[];
}

export default function ExamsListPage() {
  const router = useRouter();
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [exams, setExams] = useState<ExamData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAdminAuth(true);
        fetchExams();
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "exams"));
      setExams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamData)));
    } catch (error) {
      console.error("Error fetching exams:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Yakin ingin menghapus paket soal "${title}" secara permanen?`)) return;
    try {
      await deleteDoc(doc(db, "exams", id));
      setExams(prev => prev.filter(e => e.id !== id));
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
               <h2 className="text-2xl font-bold text-slate-800">Bank Soal & Tryout</h2>
               <p className="text-sm text-slate-500">Kelola paket soal sertifikasi secara dinamis.</p>
            </div>
            <Link href="/admin/exams/create">
               <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Buat Paket Ujian Baru
               </Button>
            </Link>
        </div>

        {loading ? (
            <div className="bg-white rounded-xl shadow-sm border p-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                <p>Memuat data ujian...</p>
            </div>
        ) : exams.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-slate-500">
                <Database className="w-12 h-12 inline-block mb-3 text-slate-300" />
                <p className="text-lg font-medium text-slate-700">Belum ada paket soal</p>
                <p className="mb-6">Mulai tambahkan paket soal pertama Anda.</p>
                <Link href="/admin/exams/create">
                    <Button variant="outline">Buat Sekarang</Button>
                </Link>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {exams.map(exam => (
                   <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                       <div className="p-6 flex-grow">
                           <div className="flex justify-between items-start mb-4">
                               <div className="bg-blue-50 text-blue-700 p-2 rounded-lg">
                                   <BookOpen className="w-6 h-6" />
                               </div>
                               <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded uppercase tracking-wider">
                                   Tipe {exam.type}
                               </span>
                           </div>
                           <h3 className="text-lg font-bold text-slate-800 mb-1">{exam.title}</h3>
                           <p className="text-sm text-slate-500 mb-4 items-center flex gap-1">
                               <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                               {exam.programId}
                           </p>
                           <p className="text-sm bg-slate-50 inline-block px-3 py-1 rounded-md text-slate-600 font-medium">
                               {exam.questions?.length || 0} Soal
                           </p>
                       </div>
                       <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-between gap-2">
                           <Link href={`/admin/exams/${exam.id}`} className="flex-1">
                               <Button variant="outline" className="w-full bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200">
                                   <Edit className="w-4 h-4 mr-2" />
                                   Edit Ujian
                               </Button>
                           </Link>
                           <Button variant="outline" className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-100" onClick={() => handleDelete(exam.id, exam.title)}>
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
