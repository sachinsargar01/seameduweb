import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Phone,
  PhoneCall,
  Calendar,
  Clock,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  UserCheck,
  CheckSquare,
  Square,
  Share2,
  RefreshCw,
  Edit3,
  Trash2,
} from 'lucide-react';
import { Alumni, CallStatus, SCUser } from '../types';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EditAlumniModal } from '../components/EditAlumniModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

interface AlumniPageProps {
  onOpenCallModal: (alumni: Alumni) => void;
  filterInitialScId?: string;
}

export const AlumniPage: React.FC<AlumniPageProps> = ({
  onOpenCallModal,
  filterInitialScId,
}) => {
  const { role, user } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  const [alumniList, setAlumniList] = useState<Alumni[]>([]);
  const [activeSCs, setActiveSCs] = useState<SCUser[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingAlumni, setEditingAlumni] = useState<Alumni | null>(null);

  // Multi-filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCallStatus, setFilterCallStatus] = useState<string>('ALL');
  const [filterRefStatus, setFilterRefStatus] = useState<string>('ALL');
  const [filterCourse, setFilterCourse] = useState<string>('ALL');
  const [filterBatch, setFilterBatch] = useState<string>('ALL');
  const [filterSC, setFilterSC] = useState<string>(filterInitialScId || 'ALL');
  const [filterSpecial, setFilterSpecial] = useState<'ALL' | 'TODAY' | 'OVERDUE'>('ALL');

  // Bulk reassign selection (Admin)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetReassignSC, setTargetReassignSC] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);

  // Delete modal state (Admin)
  const [deletingAlumni, setDeletingAlumni] = useState<Alumni | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const loadData = () => {
    const list = StorageService.getAlumni();
    setAlumniList(list);
    const scs = StorageService.getSCUsers().filter((s) => s.status === 'Active');
    setActiveSCs(scs);
    if (scs.length > 0 && !targetReassignSC) {
      setTargetReassignSC(scs[0].id);
    }
  };

  const handleSyncSheets = async () => {
    setIsSyncing(true);
    try {
      const liveAlumni = await ApiService.getAlumni(role === 'SC' ? user?.id : undefined);
      setAlumniList(liveAlumni);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (filterInitialScId) {
      setFilterSC(filterInitialScId);
    }
  }, [filterInitialScId]);

  // If user is SC, restrict by default to their own alumni
  const baseList = role === 'SC' ? alumniList.filter((a) => a.assignedSCId === user?.id) : alumniList;

  // Filter application
  const filteredAlumni = baseList.filter((a) => {
    // Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        a.name.toLowerCase().includes(q) ||
        a.mobile.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        a.course.toLowerCase().includes(q) ||
        a.batch.toLowerCase().includes(q) ||
        a.assignedSCName.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Call Status
    if (filterCallStatus !== 'ALL' && a.callStatus !== filterCallStatus) {
      return false;
    }

    // Reference Status
    if (filterRefStatus !== 'ALL' && a.referenceReceived !== filterRefStatus) {
      return false;
    }

    // Course
    if (filterCourse !== 'ALL' && a.course !== filterCourse) {
      return false;
    }

    // Batch
    if (filterBatch !== 'ALL' && a.batch !== filterBatch) {
      return false;
    }

    // SC Filter (for admin)
    if (role === 'ADMIN' && filterSC !== 'ALL') {
      if (a.assignedSCId !== filterSC) return false;
    }

    // Special: Follow-up Today
    if (filterSpecial === 'TODAY') {
      if (a.nextFollowup !== todayStr) return false;
    }

    // Special: Overdue
    if (filterSpecial === 'OVERDUE') {
      if (!a.nextFollowup || a.nextFollowup >= todayStr) return false;
    }

    return true;
  });

  // Unique Courses and Batches for dropdowns
  const courses = Array.from(new Set(alumniList.map((a) => a.course))).filter(Boolean);
  const batches = Array.from(new Set(alumniList.map((a) => a.batch))).filter(Boolean);

  // Bulk selection toggles
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredAlumni.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAlumni.map((a) => a.id));
    }
  };

  const handleBulkReassign = async () => {
    if (selectedIds.length === 0 || !targetReassignSC) return;
    const targetSC = activeSCs.find((s) => s.id === targetReassignSC);
    if (!targetSC) return;

    setIsReassigning(true);
    await ApiService.reassignAlumni(selectedIds, targetSC.id, targetSC.name);
    loadData();
    setSelectedIds([]);
    setIsReassigning(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAlumni) return;
    setIsDeleting(true);
    try {
      await ApiService.deleteAlumni(deletingAlumni.id, user?.id, user?.name);
      loadData();
      setDeletingAlumni(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      for (const id of selectedIds) {
        await ApiService.deleteAlumni(id, user?.id, user?.name);
      }
      loadData();
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExportCSV = () => {
    ApiService.exportToCSV('SEAMEDU_Alumni_Directory', filteredAlumni);
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {role === 'ADMIN' ? 'All Alumni Directory' : 'My Assigned Alumni'}
          </h2>
          <p className="text-xs text-slate-500">
            {filteredAlumni.length} alumni found • Click any alumni to initiate call, record notes, and collect references.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {role === 'ADMIN' && (
            <>
              <button
                onClick={handleSyncSheets}
                disabled={isSyncing}
                className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                title="Fetch live alumni records from Google Sheets"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Sheets'}</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search name, phone, ID, SC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800"
            />
          </div>

          {/* Call Status Filter */}
          <div>
            <select
              value={filterCallStatus}
              onChange={(e) => setFilterCallStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium text-slate-700"
            >
              <option value="ALL">All Call Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Connected">Connected</option>
              <option value="Callback">Callback</option>
              <option value="No Answer">No Answer</option>
              <option value="Busy">Busy</option>
              <option value="Wrong Number">Wrong Number</option>
            </select>
          </div>

          {/* Reference Status Filter */}
          <div>
            <select
              value={filterRefStatus}
              onChange={(e) => setFilterRefStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium text-slate-700"
            >
              <option value="ALL">All Reference Status</option>
              <option value="Yes">Reference Received (Yes)</option>
              <option value="No">No Reference (No)</option>
            </select>
          </div>

          {/* Course Filter */}
          <div>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium text-slate-700 truncate"
            >
              <option value="ALL">All Courses</option>
              {courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Special Quick Pills (Today / Overdue) */}
          <div>
            <select
              value={filterSpecial}
              onChange={(e) => setFilterSpecial(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-indigo-700"
            >
              <option value="ALL">All Followup Timelines</option>
              <option value="TODAY">Follow-up Today Only</option>
              <option value="OVERDUE">Overdue Follow-ups</option>
            </select>
          </div>
        </div>

        {/* Additional Admin Row: Batch and SC assignment filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium">Batch:</span>
            <select
              value={filterBatch}
              onChange={(e) => setFilterBatch(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700"
            >
              <option value="ALL">All Batches</option>
              {batches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {role === 'ADMIN' && (
              <>
                <span className="text-slate-400 font-medium ml-2">Counsellor:</span>
                <select
                  value={filterSC}
                  onChange={(e) => setFilterSC(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700"
                >
                  <option value="ALL">All Counsellors</option>
                  {activeSCs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            {(filterCallStatus !== 'ALL' ||
              filterRefStatus !== 'ALL' ||
              filterCourse !== 'ALL' ||
              filterBatch !== 'ALL' ||
              filterSC !== 'ALL' ||
              filterSpecial !== 'ALL' ||
              searchTerm) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterCallStatus('ALL');
                  setFilterRefStatus('ALL');
                  setFilterCourse('ALL');
                  setFilterBatch('ALL');
                  setFilterSC('ALL');
                  setFilterSpecial('ALL');
                }}
                className="text-xs text-rose-600 hover:underline ml-2"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="text-slate-500">
            Showing <b className="text-slate-800">{filteredAlumni.length}</b> of{' '}
            {baseList.length} alumni
          </div>
        </div>
      </div>

      {/* Admin Bulk Reassign Bar */}
      {role === 'ADMIN' && selectedIds.length > 0 && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-4 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold">
              {selectedIds.length}
            </span>
            <span className="font-semibold text-indigo-950">Alumni selected for reassignment</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-indigo-800 font-medium">Reassign to:</span>
            <select
              value={targetReassignSC}
              onChange={(e) => setTargetReassignSC(e.target.value)}
              className="px-2.5 py-1 bg-white border border-indigo-200 rounded text-xs font-semibold text-slate-800 focus:outline-none"
            >
              {activeSCs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleBulkReassign}
              disabled={isReassigning}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold transition-colors shadow-xs"
            >
              {isReassigning ? 'Reassigning...' : 'Confirm Reassign'}
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold transition-colors shadow-xs flex items-center gap-1"
              title="Delete all selected alumni records"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-2 py-1 text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Alumni Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                {role === 'ADMIN' && (
                  <th className="p-3 w-8">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-slate-400 hover:text-indigo-600"
                    >
                      {selectedIds.length === filteredAlumni.length && filteredAlumni.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                )}
                <th className="p-3">Alumni ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Mobile</th>
                <th className="p-3">Course</th>
                <th className="p-3">Batch</th>
                {role === 'ADMIN' && <th className="p-3">Assigned SC</th>}
                <th className="p-3 text-center">Call Status</th>
                <th className="p-3 text-center">Reference Status</th>
                <th className="p-3">Next Follow-up</th>
                <th className="p-3">Last Call Date</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredAlumni.length === 0 ? (
                <tr>
                  <td
                    colSpan={role === 'ADMIN' ? 12 : 10}
                    className="p-12 text-center text-slate-400"
                  >
                    <PhoneCall className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No alumni matching current filters.</p>
                    <p className="text-[11px]">Adjust your search query or clear active filters.</p>
                  </td>
                </tr>
              ) : (
                filteredAlumni.map((alumni) => {
                  const isSelected = selectedIds.includes(alumni.id);
                  const isOverdue =
                    alumni.nextFollowup && alumni.nextFollowup < todayStr;
                  const isToday = alumni.nextFollowup === todayStr;

                  return (
                    <tr
                      key={alumni.id}
                      className={`hover:bg-indigo-50/30 transition-colors ${
                        isSelected ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      {role === 'ADMIN' && (
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(alumni.id)}
                            className="text-slate-400 hover:text-indigo-600"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      )}

                      <td className="p-3 font-mono text-indigo-600 font-semibold">{alumni.id}</td>

                      <td
                        className="p-3 font-bold text-slate-900 cursor-pointer hover:underline"
                        onClick={() => onOpenCallModal(alumni)}
                      >
                        {alumni.name}
                      </td>

                      <td className="p-3">
                        <a
                          href={`tel:${alumni.mobile}`}
                          className="text-slate-700 hover:text-indigo-600 flex items-center gap-1 font-medium"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{alumni.mobile}</span>
                        </a>
                      </td>

                      <td className="p-3 text-slate-600 max-w-xs truncate" title={alumni.course}>
                        {alumni.course}
                      </td>

                      <td className="p-3 text-slate-500 font-mono text-[11px]">{alumni.batch}</td>

                      {role === 'ADMIN' && (
                        <td className="p-3 font-medium text-slate-800">
                          {alumni.assignedSCName || 'Unassigned'}
                        </td>
                      )}

                      {/* Call Status Badge */}
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            alumni.callStatus === 'Connected'
                              ? 'bg-emerald-100 text-emerald-800'
                              : alumni.callStatus === 'Callback'
                              ? 'bg-amber-100 text-amber-800'
                              : alumni.callStatus === 'No Answer' || alumni.callStatus === 'Busy'
                              ? 'bg-slate-200 text-slate-800'
                              : alumni.callStatus === 'Wrong Number'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {alumni.callStatus}
                        </span>
                      </td>

                      {/* Reference Status Badge */}
                      <td className="p-3 text-center">
                        {alumni.referenceReceived === 'Yes' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center justify-center gap-1">
                            <Share2 className="w-3 h-3" />
                            <span>Yes ({alumni.referenceCount})</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No</span>
                        )}
                      </td>

                      {/* Next Followup */}
                      <td className="p-3">
                        {alumni.nextFollowup ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 w-max ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-800 font-bold'
                                : isToday
                                ? 'bg-amber-100 text-amber-800 font-bold'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{alumni.nextFollowup}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Last Call Date */}
                      <td className="p-3 text-slate-500 text-[11px]">
                        {alumni.lastCallDate
                          ? new Date(alumni.lastCallDate).toLocaleDateString()
                          : 'Not called yet'}
                      </td>

                      {/* Action */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {role === 'ADMIN' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingAlumni(alumni)}
                                className="p-1 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-colors border border-slate-200"
                                title="Edit Alumni Details & Google Sheets Record"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeletingAlumni(alumni)}
                                className="p-1 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors border border-slate-200 hover:border-rose-300"
                                title="Delete Alumni (Deletes from app and connected Google Sheet)"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenCallModal(alumni)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded text-xs font-semibold transition-all border border-indigo-200 hover:border-indigo-600 flex items-center gap-1"
                          >
                            <PhoneCall className="w-3 h-3" />
                            <span>Call / Log</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Alumni Modal (Admin Only) */}
      {role === 'ADMIN' && (
        <EditAlumniModal
          alumni={editingAlumni}
          isOpen={Boolean(editingAlumni)}
          onClose={() => setEditingAlumni(null)}
          onSuccess={loadData}
        />
      )}

      {/* Single Delete Confirmation Modal */}
      {deletingAlumni && (
        <DeleteConfirmationModal
          isOpen={Boolean(deletingAlumni)}
          title="Delete Alumni Record"
          recordName={deletingAlumni.name}
          recordId={deletingAlumni.id}
          description="Are you sure you want to delete this alumni record? This will permanently remove the record from active rosters and delete it immediately from the connected Google Sheet."
          recordDetails={[
            { label: 'Alumni ID', value: deletingAlumni.id },
            { label: 'Full Name', value: deletingAlumni.name },
            { label: 'Mobile', value: deletingAlumni.mobile },
            { label: 'Course', value: deletingAlumni.course },
            { label: 'Batch', value: deletingAlumni.batch },
            { label: 'Assigned SC', value: deletingAlumni.assignedSCName || 'Unassigned' },
          ]}
          isDeleting={isDeleting}
          onConfirm={handleConfirmDelete}
          onClose={() => !isDeleting && setDeletingAlumni(null)}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <DeleteConfirmationModal
          isOpen={showBulkDeleteModal}
          title={`Delete ${selectedIds.length} Selected Alumni`}
          recordName={`${selectedIds.length} Alumni Records`}
          description={`Are you sure you want to delete ${selectedIds.length} alumni records? All records will be removed from the active database and deleted immediately from the connected Google Sheet.`}
          recordDetails={[
            { label: 'Total Records', value: `${selectedIds.length} alumni` },
            { label: 'Affected IDs', value: selectedIds.slice(0, 5).join(', ') + (selectedIds.length > 5 ? ` +${selectedIds.length - 5} more` : '') },
          ]}
          isDeleting={isBulkDeleting}
          onConfirm={handleConfirmBulkDelete}
          onClose={() => !isBulkDeleting && setShowBulkDeleteModal(false)}
        />
      )}
    </div>
  );
};
