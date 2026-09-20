import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Download,
  Users,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Alumni } from '../types';
import { ApiService } from '../services/api';
import { StorageService } from '../services/storage';

interface ImportAlumniModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportAlumniModal: React.FC<ImportAlumniModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Partial<Alumni>[]>([]);
  const [duplicatesCount, setDuplicatesCount] = useState(0);
  const [duplicateItems, setDuplicateItems] = useState<string[]>([]);
  const [autoDistribute, setAutoDistribute] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  if (!isOpen) return null;

  const activeSCs = StorageService.getSCUsers().filter((sc) => sc.status === 'Active');
  const existingAlumni = StorageService.getAlumni();
  const existingMobiles = new Set(existingAlumni.map((a) => a.mobile.replace(/\D/g, '')));
  const existingIds = new Set(existingAlumni.map((a) => a.id.toLowerCase().trim()));

  // Process CSV string into Alumni objects
  const processCSVText = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length <= 1) {
      alert('CSV is empty or missing data rows.');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

    const nameIdx = headers.findIndex((h) => h.includes('name'));
    const mobileIdx = headers.findIndex((h) => h.includes('mobile') || h.includes('phone'));
    const emailIdx = headers.findIndex((h) => h.includes('email'));
    const courseIdx = headers.findIndex((h) => h.includes('course'));
    const batchIdx = headers.findIndex((h) => h.includes('batch'));
    const passingIdx = headers.findIndex((h) => h.includes('passing') || h.includes('year'));
    const idIdx = headers.findIndex((h) => h.includes('alumni_id') || h.includes('id'));

    const items: Partial<Alumni>[] = [];
    let dupCount = 0;
    const dupNames: string[] = [];
    const seenInFile = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((cell) => cell.replace(/^["']|["']$/g, '').trim());
      if (!row || row.length === 0 || !row[0]) continue;

      const name = nameIdx >= 0 ? row[nameIdx] : row[0] || `Alumni ${i}`;
      const mobile = mobileIdx >= 0 ? row[mobileIdx] : row[1] || '';
      const email = emailIdx >= 0 ? row[emailIdx] : row[2] || '';
      const course = courseIdx >= 0 ? row[courseIdx] : row[3] || 'B.Sc Sound Engineering';
      const batch = batchIdx >= 0 ? row[batchIdx] : row[4] || '2023-2026';
      const passingYear = passingIdx >= 0 ? row[passingIdx] : row[5] || '2026';
      const id = idIdx >= 0 && row[idIdx] ? row[idIdx] : `ALUM-${1000 + existingAlumni.length + items.length + 1}`;

      const cleanMobile = mobile.replace(/\D/g, '');

      // Check duplicates
      if (
        (cleanMobile && existingMobiles.has(cleanMobile)) ||
        (cleanMobile && seenInFile.has(cleanMobile)) ||
        existingIds.has(id.toLowerCase().trim())
      ) {
        dupCount++;
        dupNames.push(`${name} (${mobile || id})`);
        continue;
      }

      if (cleanMobile) seenInFile.add(cleanMobile);

      items.push({
        id,
        name,
        mobile,
        email,
        course,
        batch,
        passingYear,
        callStatus: 'Pending',
        remark: 'Imported via batch CSV',
      });
    }

    setParsedData(items);
    setDuplicatesCount(dupCount);
    setDuplicateItems(dupNames);
    setStep('preview');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processCSVText(content);
    };
    reader.readAsText(f);
  };

  // Load 100 Sample Alumni Demo Data to test distribution
  const handleLoadSampleData = (count: number = 25) => {
    const courses = [
      'B.Sc Sound Engineering',
      'B.Sc VFX & Animation',
      'B.Sc Game Art & Design',
      'Diploma in Filmmaking',
      'B.Sc Media & Communication',
      'Photography & Cinematography',
    ];
    const batches = ['2021-2024', '2022-2025', '2023-2026'];

    const items: Partial<Alumni>[] = [];
    let startIdx = 1000 + existingAlumni.length + 1;

    for (let i = 1; i <= count; i++) {
      const mobile = `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`;
      items.push({
        id: `ALUM-${startIdx++}`,
        name: `Sample Alumni ${i}`,
        mobile,
        email: `alumni.${i}@testmail.com`,
        course: courses[i % courses.length],
        batch: batches[i % batches.length],
        passingYear: '2025',
        callStatus: 'Pending',
        remark: 'Generated batch sample for distribution test',
      });
    }

    setParsedData(items);
    setDuplicatesCount(0);
    setDuplicateItems([]);
    setStep('preview');
  };

  const handleDownloadSampleCSV = () => {
    const headers = 'Alumni_ID,Name,Mobile,Email,Course,Batch,Passing_Year\n';
    const sampleRows = [
      'ALUM-9001,Kunal Varma,+91 98200 11223,kunal.v@gmail.com,B.Sc Sound Engineering,2022-2025,2025',
      'ALUM-9002,Meera Sen,+91 98200 22334,meera.sen@gmail.com,B.Sc VFX & Animation,2021-2024,2024',
      'ALUM-9003,Rahul Sawant,+91 98200 33445,rahul.s@gmail.com,B.Sc Game Art & Design,2023-2026,2026',
      'ALUM-9004,Divya Kapoor,+91 98200 44556,divya.k@gmail.com,Diploma in Filmmaking,2023-2024,2024',
    ].join('\n');

    const blob = new Blob([headers + sampleRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SEAMEDU_Alumni_Import_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    try {
      const res = await ApiService.importAlumni(parsedData, autoDistribute);
      alert(
        `Successfully imported and distributed ${res.added} alumni among ${activeSCs.length} active SC(s)!` +
          (res.duplicates > 0 ? ` (${res.duplicates} duplicate numbers/IDs skipped)` : '')
      );
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to import alumni.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold">
              <UploadCloud className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Import Alumni Excel / CSV</h3>
              <p className="text-xs text-slate-400">
                Upload alumni file, preview records, detect duplicates, and auto-distribute equally
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {step === 'upload' ? (
            <div className="space-y-6">
              {/* Dropzone */}
              <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/40 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all">
                <FileSpreadsheet className="w-12 h-12 text-indigo-600 mb-3" />
                <p className="text-sm font-semibold text-slate-800 mb-1">
                  Choose CSV file or drag and drop here
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Supports comma-separated CSV with headers: Alumni_ID, Name, Mobile, Email, Course, Batch
                </p>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs">
                  Browse CSV File
                </span>
              </label>

              {/* Sample Template & Quick Demo generator */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-100/80 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-slate-600" />
                  <span className="text-slate-700 font-medium">Need the format template?</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSampleCSV}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                  >
                    Download Template (.csv)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSampleData(30)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Load 30 Test Alumni</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSampleData(103)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-medium transition-colors"
                    title="Simulates prompt specification (103 alumni evenly distributed)"
                  >
                    Test 103 Alumni Rule
                  </button>
                </div>
              </div>

              {/* Active SC distribution rule summary */}
              <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-indigo-950">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Automatic Equal Distribution Among Active SCs</span>
                </div>
                <p className="text-indigo-800">
                  Currently {activeSCs.length} active counsellor(s) available:{' '}
                  <b>{activeSCs.map((s) => s.name).join(', ') || 'No active SCs'}</b>.
                </p>
                <p className="text-slate-600 text-[11px]">
                  Rule: Assignments are distributed strictly equally. If 103 alumni are imported with 3 active SCs,
                  two SCs will receive 34 and one will receive 35. The difference will never exceed 1. Inactive SCs will receive 0.
                </p>
              </div>
            </div>
          ) : (
            /* Step 2: Preview & Validation */
            <div className="space-y-4">
              {/* Summary banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                  <span className="text-emerald-700 font-semibold block">Valid New Records</span>
                  <span className="text-xl font-bold text-emerald-900">{parsedData.length}</span>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                  <span className="text-amber-700 font-semibold block">Duplicates Detected</span>
                  <span className="text-xl font-bold text-amber-900">{duplicatesCount}</span>
                  <span className="text-[10px] text-amber-600 block mt-0.5">
                    (Skipped automatically to prevent duplication)
                  </span>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs">
                  <span className="text-indigo-700 font-semibold block">Active Counsellors</span>
                  <span className="text-xl font-bold text-indigo-900">{activeSCs.length}</span>
                  <span className="text-[10px] text-indigo-600 block mt-0.5">
                    ~{activeSCs.length ? Math.round(parsedData.length / activeSCs.length) : 0} per SC
                  </span>
                </div>
              </div>

              {/* Distribution Toggle Option */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div>
                  <span className="font-bold text-slate-800">
                    Automatically distribute equally among active SCs
                  </span>
                  <p className="text-slate-500 text-[11px]">
                    Maintains strict balance across Anjali, Shweta, Rohan, etc.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoDistribute}
                  onChange={(e) => setAutoDistribute(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
              </div>

              {/* Duplicates notice if any */}
              {duplicatesCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>{duplicatesCount} duplicate mobile/ID(s) flagged and excluded:</span>
                  </div>
                  <p className="text-[11px] text-amber-700 font-mono truncate">
                    {duplicateItems.slice(0, 5).join(', ')}
                    {duplicateItems.length > 5 ? ` and ${duplicateItems.length - 5} more` : ''}
                  </p>
                </div>
              )}

              {/* Data Table Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                    Data Preview ({parsedData.length} records)
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Change File
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-2.5">ID</th>
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Mobile</th>
                        <th className="p-2.5">Course</th>
                        <th className="p-2.5">Batch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {parsedData.slice(0, 15).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono text-indigo-600 font-medium">{row.id}</td>
                          <td className="p-2.5 font-medium text-slate-800">{row.name}</td>
                          <td className="p-2.5 text-slate-600">{row.mobile}</td>
                          <td className="p-2.5 text-slate-600">{row.course}</td>
                          <td className="p-2.5 text-slate-500">{row.batch}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 15 && (
                  <p className="text-[11px] text-slate-400 mt-1 text-center">
                    Showing first 15 of {parsedData.length} rows
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>

          {step === 'preview' && (
            <button
              type="button"
              disabled={isImporting || parsedData.length === 0}
              onClick={handleConfirmImport}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isImporting ? (
                <span>Importing...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Distribute {parsedData.length} Alumni</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
