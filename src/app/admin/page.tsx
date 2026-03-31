"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Loader2, CheckCircle2, UserPlus, FileText, MoreVertical, KeyRound, Ban, Trash2 } from "lucide-react";
import { AdminHeader } from "@/components/layout/AdminHeader";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const getSecondaryAuth = () => {
    const apps = getApps();
    const secondaryApp = apps.find(app => app.name === "Secondary") || initializeApp(firebaseConfig, "Secondary");
    return getAuth(secondaryApp);
};

export interface OrderData {
  id: string;
  fullName: string;
  email: string;
  whatsapp: string;
  registrationType: string;
  program: string;
  origin: string;
  paymentStatus: string;
  uid?: string;
  accountStatus?: string;
}

export default function AdminDashboard() {
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const router = useRouter();
  
  const [pendingOrders, setPendingOrders] = useState<OrderData[]>([]);
  const [approvedOrders, setApprovedOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [password, setPassword] = useState("Tac123!");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAdminAuth(true);
        fetchOrders();
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Fetch Pending
      const qPending = query(collection(db, "orders"), where("paymentStatus", "==", "pending"));
      const snapPending = await getDocs(qPending);
      setPendingOrders(snapPending.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderData)));

      // Fetch Approved
      const qApproved = query(collection(db, "orders"), where("paymentStatus", "==", "approved"));
      const snapApproved = await getDocs(qApproved);
      setApprovedOrders(snapApproved.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderData)));
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

    const handleApprove = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedOrder || (selectedOrder.registrationType === "sertifikasi" && !password)) return;

    setIsProcessing(true);
    setSuccessMessage("");
    
    try {
      if (selectedOrder.registrationType === "sertifikasi") {
          const secondaryAuth = getSecondaryAuth();
          let userId = "";
          let isExistingUser = false;

          try {
              const userCredential = await createUserWithEmailAndPassword(
                  secondaryAuth, 
                  selectedOrder.email, 
                  password
              );
              userId = userCredential.user.uid;
          } catch (error: unknown) {
              const authError = error as { code?: string; message?: string };
              if (authError.code === "auth/email-already-in-use") {
                  isExistingUser = true;
                  // Try to find existing uid from previous orders
                  const qExisting = query(collection(db, "orders"), where("email", "==", selectedOrder.email));
                  const existingDocs = await getDocs(qExisting);
                  existingDocs.forEach(d => {
                      if (d.data().uid) userId = d.data().uid;
                  });
                  
                  if (!userId) userId = "existing-auth-user";
              } else {
                  throw authError;
              }
          }

          const orderRef = doc(db, "orders", selectedOrder.id);
          await updateDoc(orderRef, {
              paymentStatus: "approved",
              uid: userId,
              accountStatus: "active" 
          });

          setSuccessMessage(isExistingUser ? "Pendaftaran disetujui! (Akun peserta ini sudah ada sebelumnya, menggunakan akses lama)." : "Akun berhasil dibuat dan pembayaran disetujui!");
          
          const approvedOrder = { ...selectedOrder, paymentStatus: "approved", uid: userId, accountStatus: "active" };
          setPendingOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
          setApprovedOrders(prev => [approvedOrder, ...prev]);
      } else {
          const orderRef = doc(db, "orders", selectedOrder.id);
          await updateDoc(orderRef, {
              paymentStatus: "approved"
          });

          setSuccessMessage("Pembayaran disetujui!");
          
          const approvedOrder = { ...selectedOrder, paymentStatus: "approved" };
          setPendingOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
          setApprovedOrders(prev => [approvedOrder, ...prev]);
      }
    } catch (error) {
      console.error("Failed to approve order:", error);
      alert(`Gagal menyetujui pendaftaran: ${(error as Error).message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisableAccount = async (order: OrderData) => {
    if(!confirm(`Yakin ingin menonaktifkan akun ${order.email}? Mereka tidak akan bisa login.`)) return;
    
    // NOTE: This updates Firestore. True disabling in Firebase Auth requires Firebase Admin SDK in a server route
    // For now we simulate it by setting accountStatus in Firestore.
    try {
        await updateDoc(doc(db, "orders", order.id), { accountStatus: "disabled" });
        setApprovedOrders(prev => prev.map(o => o.id === order.id ? { ...o, accountStatus: "disabled" } : o));
        alert("Akun berhasil dinonaktifkan di Database. (Catatan: Auth Firebase utuh butuh pengaturan Cloud Function / Admin SDK di backend)");
    } catch (err) {
        alert("Gagal update status: " + (err as Error).message);
    }
  };

  const handleEnableAccount = async (order: OrderData) => {
    try {
        await updateDoc(doc(db, "orders", order.id), { accountStatus: "active" });
        setApprovedOrders(prev => prev.map(o => o.id === order.id ? { ...o, accountStatus: "active" } : o));
    } catch (err) {
        alert("Gagal update status: " + (err as Error).message);
    }
  };

  const handleDeleteAccount = async (order: OrderData) => {
      if(!confirm(`PERINGATAN! Yakin ingin menghapus data pesanan ${order.email} secara permanen?`)) return;

      try {
          await deleteDoc(doc(db, "orders", order.id));
          setApprovedOrders(prev => prev.filter(o => o.id !== order.id));
          alert("Data pesanan berhasil dihapus! (Catatan: User Auth perlu dihapus manual di Firebase Console jika tanpa Admin SDK)");
      } catch (err) {
          alert("Gagal menghapus: " + (err as Error).message);
      }
  };

  const handleResetPassword = (order: OrderData) => {
      alert(`Fitur Reset Password untuk ${order.email}:\n\nKarena ini Client-Side, Admin tidak bisa sembarangan merubah password user secara langsung tanpa password lama mereka kecuali menggunakan Firebase Admin SDK di server (Next.js API Route).\n\nSolusi saat ini: Gunakan fitur "Send Password Reset Email" dari Firebase secara langsung, atau ubah manual di menu Authentication -> Users di Firebase Console.`);
  };

  const closeModal = () => {
      setSelectedOrder(null);
      setSuccessMessage("");
      setPassword("Tac123!");
  };

  if (!isAdminAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
         <div className="text-center flex flex-col items-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
            <p className="text-slate-500 font-medium">Memverifikasi Akses Admin...</p>
         </div>
      </div>
    );
  }

  const renderTable = (data: OrderData[], type: "pending" | "approved") => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                <p>Memuat data...</p>
            </div>
        ) : data.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
                <CheckCircle2 className="w-12 h-12 inline-block mb-3 text-green-500 opacity-50" />
                <p className="text-lg font-medium">{type === "pending" ? "Semua beres!" : "Belum ada data"}</p>
                <p>Tidak ada pendaftar di kategori ini.</p>
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-600 border-b">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Nama Peserta</th>
                            <th className="px-6 py-4 font-semibold">Email & Kontak</th>
                            <th className="px-6 py-4 font-semibold">Program</th>
                            <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map(order => (
                            <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <p className="font-semibold text-slate-900">{order.fullName}</p>
                                    <div className="flex gap-2 mt-1">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${type === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                            {order.paymentStatus.toUpperCase()}
                                        </span>
                                        {type === 'approved' && order.accountStatus === 'disabled' && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                DISABLED
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-slate-700">{order.email}</p>
                                    <p className="text-slate-500 text-xs mt-0.5">{order.whatsapp}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-slate-700">
                                        <span className="font-medium mr-1 uppercase text-xs text-blue-600 border border-blue-200 bg-blue-50 px-1 py-0.5 rounded">{order.registrationType}</span>
                                        {order.program}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{order.origin}</p>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {type === "pending" ? (
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" onClick={() => setSelectedOrder(order)}>
                                                {order.registrationType === "sertifikasi" ? (
                                                    <>
                                                        <UserPlus className="w-4 h-4 mr-2" />
                                                        Approve & Create Account
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                                        Approve Pendaftaran
                                                    </>
                                                )}
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleDeleteAccount(order)}>
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Hapus
                                            </Button>
                                        </div>
                                    ) : (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Buka menu</span>
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Manajemen Akun</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleResetPassword(order)}>
                                                    <KeyRound className="mr-2 h-4 w-4" />
                                                    Ubah Password
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {order.accountStatus === "disabled" ? (
                                                     <DropdownMenuItem onClick={() => handleEnableAccount(order)}>
                                                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                                        Aktifkan Akun
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem onClick={() => handleDisableAccount(order)} className="text-yellow-600 focus:text-yellow-600">
                                                        <Ban className="mr-2 h-4 w-4" />
                                                        Nonaktifkan Akun
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onClick={() => handleDeleteAccount(order)} className="text-red-600 focus:text-red-600">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Hapus Akun & Data
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <AdminHeader />

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="pending" className="w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                   <h2 className="text-2xl font-bold text-slate-800">Manajemen Peserta</h2>
                   <p className="text-sm text-slate-500">Kelola persetujuan, akses Tryout, dan pengaturan akun.</p>
                </div>
                <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
                    <TabsTrigger value="pending">Menunggu Persetujuan</TabsTrigger>
                    <TabsTrigger value="approved">Akun Aktif / Selesai</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="pending" className="animate-in fade-in-50 zoom-in-95 duration-300">
                {renderTable(pendingOrders, "pending")}
            </TabsContent>

            <TabsContent value="approved" className="animate-in fade-in-50 zoom-in-95 duration-300">
                {renderTable(approvedOrders, "approved")}
            </TabsContent>
        </Tabs>
      </main>

      {/* Approve Modal */}
      {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                 <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                     <h3 className="font-bold text-lg text-slate-900">
                         {selectedOrder.registrationType === "sertifikasi" ? "Approve & Buat Akun" : "Approve Pendaftaran"}
                     </h3>
                     <p className="text-xs text-slate-500">
                         {selectedOrder.registrationType === "sertifikasi" 
                             ? "Berikan akses Login Tryout ke pendaftar." 
                             : "Setujui pembayaran kursus ini."}
                     </p>
                 </div>
                 
                 <div className="px-6 py-6 overflow-y-auto">
                     {successMessage ? (
                         <div className="text-center py-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 mb-2">Sukses!</h4>
                            <p className="text-slate-600 text-sm mb-6">{successMessage}</p>

                            <div className="bg-slate-50 rounded-lg p-4 text-left border mb-6">
                                <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Kirim Pesan WhatsApp ini ke User:</p>
                                <p className="text-sm font-mono text-slate-700 select-all cursor-text bg-white p-3 border border-slate-200 rounded">
                                    {selectedOrder.registrationType === "sertifikasi" ? (
                                        <>
                                            Halo {selectedOrder.fullName}! Pendaftaran Anda telah kami setujui. Sekarang Anda sudah bisa login ke sistem Tryout The A Class.
                                            <br/><br/>
                                            Email: {selectedOrder.email}
                                            <br/>
                                            Password: {password}
                                            <br/><br/>
                                            Silahkan login di: https://theaclassdps.com/tryout/login
                                        </>
                                    ) : (
                                        <>
                                            Halo {selectedOrder.fullName}! Pendaftaran Kursus Anda telah kami setujui. Terima kasih telah bergabung dengan The A Class. Jadwal dan informasi kelas akan segera kami infokan lebih lanjut.
                                        </>
                                    )}
                                </p>
                            </div>

                            <div className="flex gap-3 justify-center">
                                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => {
                                    let adminMsg = "";
                                    if (selectedOrder.registrationType === "sertifikasi") {
                                        adminMsg = `Halo ${selectedOrder.fullName}! Pendaftaran Anda telah kami setujui. Sekarang Anda sudah bisa login ke sistem Tryout The A Class.\n\nEmail: ${selectedOrder.email}\nPassword: ${password}\n\nSilahkan login di: https://theaclassdps.com/tryout/login`;
                                    } else {
                                        adminMsg = `Halo ${selectedOrder.fullName}! Pendaftaran Kursus Anda telah kami setujui. Terima kasih telah bergabung dengan The A Class. Jadwal dan informasi kelas akan segera kami infokan lebih lanjut.`;
                                    }
                                    window.open(`https://wa.me/${selectedOrder.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(adminMsg)}`, "_blank");
                                    closeModal();
                                }}>
                                   Kirim Info via WhatsApp & Tutup
                                </Button>
                                <Button variant="outline" className="w-full" onClick={closeModal}>Tutup (Sudah Dikirim)</Button>
                            </div>
                         </div>
                     ) : (
                        <form onSubmit={handleApprove} className="space-y-4">
                            {selectedOrder.registrationType === "sertifikasi" && (
                                <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg border border-blue-200 mb-4">
                                    Anda akan membuat sebuah akun akses <strong>Firebase Auth</strong> untuk <strong>{selectedOrder.email}</strong>.
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Nama Pendaftar</label>
                                <Input disabled value={selectedOrder.fullName} className="bg-slate-50" />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Email (Sesuai Pendaftaran)</label>
                                <Input disabled value={selectedOrder.email} className="bg-slate-50" />
                            </div>

                            {selectedOrder.registrationType === "sertifikasi" && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Buat Password Manual *</label>
                                    <Input 
                                        required 
                                        type="text" 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        className="border-blue-300 focus-visible:ring-blue-500"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Default: Tac123! Minimal 6 karakter.</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-8">
                                <Button type="button" variant="outline" onClick={closeModal} disabled={isProcessing}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700">
                                    {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {selectedOrder.registrationType === "sertifikasi" ? "Create Account" : "Approve Pendaftaran"}
                                </Button>
                            </div>
                        </form>
                     )}
                 </div>
             </div>
          </div>
      )}
    </div>
  );
}
