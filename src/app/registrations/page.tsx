"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Registration {
    id: string;
    fullName: string;
    email: string;
    program: string;
    whatsapp: string;
    status: string;
    registrationType: string;
    createdAt: string;
}

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
        const response = await fetch('/api/admin/registrations');
        if (response.ok) {
            const data = await response.json();
            setRegistrations(data);
        }
    } catch (error) {
        console.error("Failed to fetch", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
          case 'approved': return 'bg-green-100 text-green-800 border-green-200';
          case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
          default: return 'bg-slate-100 text-slate-800 border-slate-200';
      }
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-slate-50">
      <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-500">Manajemen Pendaftaran Peserta</p>
          </div>
          <Button onClick={fetchRegistrations} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
          </Button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-slate-600">ID / Tanggal</th>
                <th className="px-6 py-4 text-left font-semibold text-slate-600">Peserta</th>
                <th className="px-6 py-4 text-left font-semibold text-slate-600">Program</th>
                <th className="px-6 py-4 text-left font-semibold text-slate-600">Status</th>
                <th className="px-6 py-4 text-right font-semibold text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                  <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                          Memuat data...
                      </td>
                  </tr>
              ) : registrations.length === 0 ? (
                  <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                          Belum ada data pendaftaran.
                      </td>
                  </tr>
              ) : (
                  registrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-mono font-medium text-slate-900">{reg.id}</div>
                            <div className="text-xs text-slate-500">{new Date(reg.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{reg.fullName}</div>
                            <div className="text-slate-500 flex flex-col">
                                <span>{reg.email}</span>
                                <a href={`https://wa.me/62${reg.whatsapp}`} className="text-green-600 hover:underline">
                                    +62{reg.whatsapp}
                                </a>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <span className="capitalize font-medium block text-slate-700">{reg.registrationType}</span>
                            <span className="text-slate-500 text-xs uppercase bg-slate-100 px-2 py-0.5 rounded inline-block mt-1">
                                {reg.program}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(reg.status)}`}>
                                {reg.status}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                             <select 
                                className="text-xs border-slate-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                defaultValue={reg.status}
                                onChange={(e) => console.log("Status update not implemented", e.target.value)}
                             >
                                 <option value="pending">Pending</option>
                                 <option value="approved">Approved</option>
                                 <option value="rejected">Rejected</option>
                             </select>
                        </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
