"use client";

import { useState, useEffect, use } from "react";
import { doc, getDoc, setDoc, addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth, storage } from "@/lib/firebase/client";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Loader2, Plus, Save, Trash2, ArrowLeft, GripVertical, CheckCircle2, Image as ImageIcon, Link as LinkIcon } from "lucide-react";
import Link from "next/link";

export interface QuestionOption {
  label: string;
  text: string;
}

export interface QuestionStatement {
  text: string;
  answer: "True" | "False";
}

export interface QuestionData {
  id: number;
  question: string;
  imageUrl?: string;
  isUploadingImage?: boolean;
  type: "single" | "multiple" | "true_false" | "drag_and_drop";
  options?: QuestionOption[];
  statements?: QuestionStatement[];
  answers: string[];
}

export default function ExamEditorPage() {
  const params = useParams();
  const examId = params.id as string;
  const isCreate = examId === "create";

  const router = useRouter();
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [programId, setProgramId] = useState("");
  const [examType, setExamType] = useState("1");
  const [questions, setQuestions] = useState<QuestionData[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAdminAuth(true);
        if (!isCreate) fetchExamData();
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router, isCreate]);

  const fetchExamData = async () => {
    try {
      const docRef = doc(db, "exams", examId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTitle(data.title || "");
        setProgramId(data.programId || "");
        setExamType(data.type || "1");
        setQuestions(data.questions || []);
      } else {
        alert("Exam not found!");
        router.push("/admin/exams");
      }
    } catch (error) {
      console.error("Error fetching exam:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title || !programId) {
      alert("Judul dan Program ID wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        programId,
        type: examType,
        questions,
        updatedAt: new Date().toISOString()
      };

      if (isCreate) {
        await addDoc(collection(db, "exams"), payload);
        alert("Berhasil membuat paket ujian baru!");
        router.push("/admin/exams");
      } else {
        await setDoc(doc(db, "exams", examId), payload, { merge: true });
        alert("Berhasil memperbarui paket ujian!");
      }
    } catch (error) {
      console.error("Error saving exam:", error);
      alert("Gagal menyimpan data.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (qIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    updateQuestion(qIndex, "isUploadingImage", true);
    try {
      const storageRef = ref(storage, `exams/${examId !== 'create' ? examId : 'new'}/q_${qIndex}_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      updateQuestion(qIndex, "imageUrl", url);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Gagal mengupload gambar. Pastikan Storage Rules Firebase sudah mengizinkan write.");
    } finally {
      updateQuestion(qIndex, "isUploadingImage", false); 
    }
  };

  const addQuestion = () => {
    const newId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1;
    setQuestions([
      ...questions,
      {
        id: newId,
        question: "",
        type: "single",
        options: [
          { label: "A", text: "" },
          { label: "B", text: "" }
        ],
        answers: []
      }
    ]);
  };

  const removeQuestion = (index: number) => {
    if(confirm("Hapus soal ini?")) {
      const newQ = [...questions];
      newQ.splice(index, 1);
      setQuestions(newQ);
    }
  };

  const updateQuestion = (index: number, field: keyof QuestionData, value: any) => {
    const newQ = [...questions];
    newQ[index] = { ...newQ[index], [field]: value };

    // Handle structural changes when type switches
    if (field === "type") {
       if (value === "true_false") {
          newQ[index].statements = [{ text: "", answer: "True" }];
          newQ[index].options = [];
          newQ[index].answers = [];
       } else if (value === "drag_and_drop") {
          newQ[index].options = [{ label: "A", text: "[Drag & Drop Area]" }];
          newQ[index].statements = [];
       } else {
          if (!newQ[index].options || newQ[index].options.length === 0) {
             newQ[index].options = [{ label: "A", text: "" }, { label: "B", text: "" }];
          }
          newQ[index].statements = [];
       }
    }

    setQuestions(newQ);
  };

  const addOption = (qIndex: number) => {
    const newQ = [...questions];
    const opts = newQ[qIndex].options || [];
    const nextLabel = String.fromCharCode(65 + opts.length); // A, B, C...
    opts.push({ label: nextLabel, text: "" });
    newQ[qIndex].options = opts;
    setQuestions(newQ);
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    const newQ = [...questions];
    if (newQ[qIndex].options) {
      newQ[qIndex].options[optIndex].text = text;
      setQuestions(newQ);
    }
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const newQ = [...questions];
    if (newQ[qIndex].options) {
      newQ[qIndex].options.splice(optIndex, 1);
      // Reassign labels A, B, C...
      newQ[qIndex].options.forEach((o, i) => o.label = String.fromCharCode(65 + i));
      setQuestions(newQ);
    }
  };

  const toggleAnswer = (qIndex: number, label: string, isSingle: boolean) => {
    const newQ = [...questions];
    if (isSingle) {
      newQ[qIndex].answers = [label];
    } else {
      const ans = newQ[qIndex].answers || [];
      if (ans.includes(label)) {
        newQ[qIndex].answers = ans.filter(a => a !== label);
      } else {
        newQ[qIndex].answers = [...ans, label];
      }
    }
    setQuestions(newQ);
  };

  const addStatement = (qIndex: number) => {
    const newQ = [...questions];
    const stmts = newQ[qIndex].statements || [];
    stmts.push({ text: "", answer: "True" });
    newQ[qIndex].statements = stmts;
    setQuestions(newQ);
  };

  const updateStatement = (qIndex: number, sIndex: number, field: "text" | "answer", value: string) => {
    const newQ = [...questions];
    if (newQ[qIndex].statements) {
      newQ[qIndex].statements[sIndex] = { ...newQ[qIndex].statements[sIndex], [field]: value } as QuestionStatement;
      setQuestions(newQ);
    }
  };
  
  const removeStatement = (qIndex: number, sIndex: number) => {
    const newQ = [...questions];
    if (newQ[qIndex].statements) {
      newQ[qIndex].statements.splice(sIndex, 1);
      setQuestions(newQ);
    }
  };

  if (!isAdminAuth || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
         <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-32">
      <AdminHeader />

      {/* FIXED TOP BAR */}
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm w-full">
         <div className="container mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-4">
                <Link href="/admin/exams">
                   <Button variant="ghost" size="icon" className="rounded-full">
                      <ArrowLeft className="w-5 h-5" />
                   </Button>
                </Link>
                <div>
                   <h2 className="text-xl font-bold text-slate-800">
                      {isCreate ? "Buat Paket Ujian" : "Edit Paket Ujian"}
                   </h2>
                   <p className="text-xs text-slate-500">Auto-save tidak aktif. Jangan lupa menekan Simpan.</p>
                </div>
             </div>
             <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan Ujian
             </Button>
         </div>
      </div>

      <main className="container mx-auto px-4 max-w-4xl py-8">
         {/* HEADER FORM */}
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 border-t-8 border-t-blue-600">
             <h3 className="text-lg font-bold mb-4">Informasi Utama</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Judul Paket Ujian *</label>
                    <Input 
                       placeholder="Contoh: ITS Networking Latihan 1" 
                       value={title} 
                       onChange={e => setTitle(e.target.value)} 
                       className="border-slate-300"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">ID Program (Sertifikasi) *</label>
                    <Input 
                       placeholder="Contoh: its-networking" 
                       value={programId} 
                       onChange={e => setProgramId(e.target.value)} 
                       className="border-slate-300"
                    />
                 </div>
                 <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">Tipe / Kelompok Ujian</label>
                    <select 
                       className="w-full flex h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                       value={examType}
                       onChange={e => setExamType(e.target.value)}
                    >
                        <option value="1">Tipe 1 (Latihan 1)</option>
                        <option value="2">Tipe 2 (Latihan 2)</option>
                        <option value="3">Tipe 3 (Ujian Akhir)</option>
                    </select>
                 </div>
             </div>
         </div>

         {/* QUESTIONS LIST */}
         <div className="space-y-6">
            {questions.map((q, qIndex) => (
                <div key={qIndex} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-visible relative group">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border rounded-full px-2 py-1 shadow-sm flex items-center gap-1 text-slate-400 cursor-move">
                        <GripVertical className="w-4 h-4" />
                    </div>
                    
                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row gap-4 mb-4">
                            <div className="flex-grow">
                                <label className="text-sm font-bold text-slate-500 mb-1 block">Pertanyaan {qIndex + 1}</label>
                                <textarea 
                                    className="w-full min-h-[100px] p-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y"
                                    placeholder="Ketik pertanyaan di sini..."
                                    value={q.question}
                                    onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                                />
                                
                                {/* Image Uploader Area */}
                                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                            <ImageIcon className="w-4 h-4" /> Gambar Soal (Opsional)
                                        </label>
                                        {q.imageUrl && (
                                            <Button variant="ghost" size="sm" onClick={() => updateQuestion(qIndex, "imageUrl", "")} className="h-6 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs">
                                                <Trash2 className="w-3 h-3 mr-1"/> Hapus Gambar
                                            </Button>
                                        )}
                                    </div>
                                    
                                    {q.imageUrl ? (
                                        <div className="w-full relative rounded-md overflow-hidden bg-slate-100 flex justify-center items-center border">
                                            <img src={q.imageUrl} alt="Pertanyaan" className="max-h-48 object-contain" />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                            <Button variant="outline" size="sm" asChild className="cursor-pointer bg-white relative shrink-0">
                                                <label>
                                                    {q.isUploadingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                                                    {q.isUploadingImage ? "Mengupload..." : "Upload File Gambar"}
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(qIndex, e)} disabled={q.isUploadingImage} />
                                                </label>
                                            </Button>
                                            <span className="text-xs text-slate-400 font-medium px-2 shrink-0">ATAU</span>
                                            <div className="flex-1 relative w-full">
                                                <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <Input 
                                                    placeholder="Paste URL Gambar dari link luar..."
                                                    className="pl-9 h-8 text-xs border-slate-300 shadow-none bg-white"
                                                    value={q.imageUrl || ""}
                                                    onChange={e => updateQuestion(qIndex, "imageUrl", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="w-full sm:w-48">
                                <label className="text-sm font-bold text-slate-500 mb-1 block">Tipe Soal</label>
                                <select 
                                    className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    value={q.type}
                                    onChange={(e) => updateQuestion(qIndex, "type", e.target.value)}
                                >
                                    <option value="single">Pilihan Ganda (1 Jawaban)</option>
                                    <option value="multiple">Pilihan Ganda (Banyak Jawaban)</option>
                                    <option value="true_false">Benar / Salah</option>
                                    <option value="drag_and_drop">Drag & Drop / Interaktif</option>
                                </select>
                            </div>
                        </div>

                        {/* RENDER OPTIONS BASED ON TYPE */}
                        <div className="pl-0 sm:pl-4 space-y-3">
                           {(q.type === "single" || q.type === "multiple" || q.type === "drag_and_drop") && (
                               <div className="space-y-3">
                                   {q.options?.map((opt, optIndex) => (
                                       <div key={optIndex} className="flex items-center gap-3">
                                           {/* Answer Selector */}
                                           <div 
                                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer flex-shrink-0 transition-colors ${q.answers?.includes(opt.label) ? "bg-green-500 border-green-500 text-white" : "border-slate-300 hover:border-green-400"}`}
                                              onClick={() => toggleAnswer(qIndex, opt.label, q.type === "single")}
                                              title="Tandai sebagai jawaban benar"
                                           >
                                              {q.answers?.includes(opt.label) && <CheckCircle2 className="w-4 h-4" />}
                                           </div>
                                           <span className="font-bold text-slate-500 w-5">{opt.label}.</span>
                                           <Input 
                                              value={opt.text}
                                              onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)}
                                              placeholder={`Opsi ${opt.label}`}
                                              className="border-slate-200 shadow-none focus-visible:ring-1 focus-visible:border-blue-500"
                                           />
                                           <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 flex-shrink-0" onClick={() => removeOption(qIndex, optIndex)}>
                                              <Trash2 className="w-4 h-4" />
                                           </Button>
                                       </div>
                                   ))}
                                   <Button variant="ghost" size="sm" onClick={() => addOption(qIndex)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 ml-12">
                                       <Plus className="w-4 h-4 mr-1" /> Tambah Opsi
                                   </Button>
                               </div>
                           )}

                           {q.type === "true_false" && (
                               <div className="space-y-3">
                                   {q.statements?.map((stmt, sIndex) => (
                                       <div key={sIndex} className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-3 rounded-lg border">
                                           <Input 
                                              value={stmt.text}
                                              onChange={(e) => updateStatement(qIndex, sIndex, "text", e.target.value)}
                                              placeholder="Pernyataan..."
                                              className="border-slate-300"
                                           />
                                           <div className="flex items-center gap-2 shrink-0">
                                               <select 
                                                  className="p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold text-sm"
                                                  value={stmt.answer}
                                                  onChange={(e) => updateStatement(qIndex, sIndex, "answer", e.target.value as "True" | "False")}
                                               >
                                                   <option value="True">True</option>
                                                   <option value="False">False</option>
                                               </select>
                                               <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500" onClick={() => removeStatement(qIndex, sIndex)}>
                                                  <Trash2 className="w-4 h-4" />
                                               </Button>
                                           </div>
                                       </div>
                                   ))}
                                   <Button variant="ghost" size="sm" onClick={() => addStatement(qIndex)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                                       <Plus className="w-4 h-4 mr-1" /> Tambah Pernyataan
                                   </Button>
                               </div>
                           )}
                        </div>
                    </div>
                    {/* FOOTER OF QUESTION CARD */}
                    <div className="border-t border-slate-100 p-3 bg-slate-50 flex justify-end">
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeQuestion(qIndex)}>
                           <Trash2 className="w-4 h-4 mr-2" /> Hapus Soal
                        </Button>
                    </div>
                </div>
            ))}

            <div className="pt-4 flex justify-center pb-12">
               <Button onClick={addQuestion} variant="outline" size="lg" className="w-full max-w-sm border-2 border-dashed border-slate-300 text-slate-600 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 py-8 rounded-xl shadow-sm">
                  <Plus className="w-6 h-6 mr-2" />
                  Tambah Soal Berikutnya
               </Button>
            </div>
         </div>
      </main>
    </div>
  );
}
