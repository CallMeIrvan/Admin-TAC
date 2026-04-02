"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Database, Users, LogOut, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase/client";
import { signOut } from "firebase/auth";

export function AdminHeader() {
  const pathname = usePathname();
  
  return (
    <header className="bg-slate-900 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-6 w-full lg:w-auto">
           {/* Top bar on Mobile (Logo + Logout wrapper) */}
           <div className="flex items-center justify-between w-full lg:w-auto">
              <div className="flex items-center gap-3">
                 <div className="bg-white px-3 py-1.5 rounded-lg shadow-sm">
                    <Image src="/logo/logo-tac.png" alt="Logo TAC" width={70} height={40} className="object-contain" priority />
                 </div>
              </div>
              
              {/* Logout Button (Moved here for mobile, hidden on Desktop via order / duplicated) */}
              <Button 
                variant="outline" 
                size="sm" 
                className="lg:hidden border-slate-700 bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                onClick={() => { if(confirm("Yakin ingin keluar?")) signOut(auth); }}
              >
                <LogOut className="w-4 h-4" />
              </Button>
           </div>
           
           {/* Navigation Menu (Wraps on mobile) */}
           <nav className="flex flex-wrap justify-center lg:justify-start items-center gap-2.5 w-full mt-2 lg:mt-0">
              <Link href="/admin" className="flex-1 sm:flex-none">
                 <Button variant={pathname === "/admin" ? "secondary" : "ghost"} size="sm" className={`w-full ${pathname === "/admin" ? "bg-slate-800 text-white shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800"}`}>
                    <Users className="w-4 h-4 mr-2 hidden sm:block" />
                    <Users className="w-4 h-4 mr-1 sm:hidden" />
                    <span className="text-xs sm:text-sm">Manajemen Peserta</span>
                 </Button>
              </Link>
              <Link href="/admin/exams" className="flex-1 sm:flex-none">
                 <Button variant={pathname?.startsWith("/admin/exams") ? "secondary" : "ghost"} size="sm" className={`w-full ${pathname?.startsWith("/admin/exams") ? "bg-slate-800 text-white shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800"}`}>
                    <Database className="w-4 h-4 mr-2 hidden sm:block" />
                    <Database className="w-4 h-4 mr-1 sm:hidden" />
                    <span className="text-xs sm:text-sm">Bank Soal</span>
                 </Button>
              </Link>
              <Link href="/admin/programs" className="flex-1 sm:flex-none">
                 <Button variant={pathname?.startsWith("/admin/programs") ? "secondary" : "ghost"} size="sm" className={`w-full ${pathname?.startsWith("/admin/programs") ? "bg-slate-800 text-white shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800"}`}>
                    <Briefcase className="w-4 h-4 mr-2 hidden sm:block" />
                    <Briefcase className="w-4 h-4 mr-1 sm:hidden" />
                    <span className="text-xs sm:text-sm hidden sm:inline">Manajemen Program</span>
                    <span className="text-xs sm:text-sm sm:hidden">Program</span>
                 </Button>
              </Link>
           </nav>
        </div>
        
        <div className="hidden lg:flex items-center gap-4">
           <div className="flex flex-col text-right">
               <span className="text-sm font-semibold text-white">Administrator</span>
               <span className="text-xs text-blue-400">Secure Session</span>
           </div>
           <Button 
              variant="outline" 
              size="sm" 
              className="border-slate-700 bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 transition-colors ml-2"
              onClick={() => {
                if(confirm("Yakin ingin keluar?")) signOut(auth);
              }}
           >
              <LogOut className="w-4 h-4 mr-2" />
              <span>Logout</span>
           </Button>
        </div>
      </div>
    </header>
  );
}
