import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/adminApi';
import { offerApi } from '../api/offerApi';
import { reviewApi } from '../api/reviewApi';
import { collegeApi } from '../api/collegeApi';
import { officialReportApi } from '../api/officialReportApi';
import { DataBadge } from '../components/common/DataBadge';
import { TierBadge } from '../components/common/TierBadge';
import { InstitutionCategoryBadge } from '../components/common/InstitutionCategoryBadge';
import { SkeletonLoader, ErrorMessage } from '../components/common/FeedbackComponents';
import {
  Shield,
  FileCheck2,
  Users,
  Building,
  History,
  Check,
  X,
  AlertCircle,
  FileText,
  Search,
  CheckCircle2,
  Lock,
  Eye,
  ExternalLink,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Landmark,
  Edit3,
  FileSearch,
  RefreshCw,
  Download,
} from 'lucide-react';

export const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'verifications' | 'offers' | 'reviews' | 'audit' | 'colleges' | 'users'
  const [overview, setOverview] = useState(null);

  // Student verifications queue
  const [verificationsQueue, setVerificationsQueue] = useState([]);
  const [selectedVerificationStatus, setSelectedVerificationStatus] = useState('pending');

  // Offers queue
  const [offersQueue, setOffersQueue] = useState([]);
  const [selectedOfferStatus, setSelectedOfferStatus] = useState('all');

  // Internships queue
  const [internshipsQueue, setInternshipsQueue] = useState([]);
  const [selectedInternshipStatus, setSelectedInternshipStatus] = useState('all');

  // Official imports queue
  const [officialImportsQueue, setOfficialImportsQueue] = useState([]);
  const [selectedOfficialImportStatus, setSelectedOfficialImportStatus] = useState('all');
  const [importForm, setImportForm] = useState({
    collegeId: '',
    reportingYear: '2023-2024',
    sourceUrl: '',
    reportingSource: 'Official Institute Website',
    totalGraduatingStudents: '',
    totalEligibleStudents: '',
    uniqueStudentsPlaced: '',
    totalJobOffers: '',
    highestPackageLPA: '',
    averagePackageLPA: '',
    medianPackageLPA: '',
    uniqueRecruitersCount: '',
  });
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  // Automated Official Reports Discovery State
  const [discoveredReports, setDiscoveredReports] = useState([]);
  const [selectedScanCollegeId, setSelectedScanCollegeId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [discoveryLogs, setDiscoveryLogs] = useState([]);

  // Reviews queue
  const [reviewsQueue, setReviewsQueue] = useState([]);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState([]);

  // Colleges
  const [colleges, setColleges] = useState([]);

  // Top 50 Private Directory Telemetry
  const [top50Colleges, setTop50Colleges] = useState([]);
  const [top50Search, setTop50Search] = useState('');
  const [crawlingTop50Id, setCrawlingTop50Id] = useState(null);

  // Users
  const [usersList, setUsersList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');

  // Modals state
  const [previewDoc, setPreviewDoc] = useState(null);
  const [rejectModalStudent, setRejectModalStudent] = useState(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  // Institution Classification modal
  const [classifyModalCollege, setClassifyModalCollege] = useState(null);
  const [classificationForm, setClassificationForm] = useState({
    category: 'Category A: Premium Public',
    subCategory: 'IIT',
    classificationNotes: '',
  });
  const [classifying, setClassifying] = useState(false);

  // Official Import Verification modal
  const [verifyImportModalRecord, setVerifyImportModalRecord] = useState(null);
  const [verifyImportForm, setVerifyImportForm] = useState({
    approvalStatus: 'Verified',
    verificationLevel: 'Officially reported',
    notes: '',
    rejectionReason: '',
  });
  const [verifyingImport, setVerifyingImport] = useState(false);

  const authToken = localStorage.getItem('pr_auth_token') || '';

  useEffect(() => {
    fetchDashboardData();
  }, [activeTab, selectedOfferStatus, selectedVerificationStatus, selectedInternshipStatus, selectedOfficialImportStatus]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const res = await adminApi.getOverview();
        if (res.data?.success) setOverview(res.data.data);
      } else if (activeTab === 'verifications') {
        const res = await adminApi.getStudentVerificationsQueue({ status: selectedVerificationStatus });
        if (res.data?.success) setVerificationsQueue(res.data.data.verifications);
      } else if (activeTab === 'offers') {
        const res = await adminApi.getOffersQueue({ status: selectedOfferStatus });
        if (res.data?.success) setOffersQueue(res.data.data.offers);
      } else if (activeTab === 'internships') {
        const res = await adminApi.getInternshipsQueue({ status: selectedInternshipStatus });
        if (res.data?.success) setInternshipsQueue(res.data.data.internships);
      } else if (activeTab === 'official-imports') {
        const [colRes, recRes, reportsRes, logsRes] = await Promise.all([
          collegeApi.getColleges({ limit: 50 }),
          adminApi.getOfficialImportsQueue({ status: selectedOfficialImportStatus }),
          officialReportApi.getOfficialReports({ limit: 50 }),
          officialReportApi.getDiscoveryLogs({ limit: 10 }),
        ]);
        if (colRes.data?.success) setColleges(colRes.data.data.colleges);
        if (recRes.data?.success) setOfficialImportsQueue(recRes.data.data.records);
        if (reportsRes.data?.success) setDiscoveredReports(reportsRes.data.data.reports);
        if (logsRes.data?.success) setDiscoveryLogs(logsRes.data.data.logs);
      } else if (activeTab === 'reviews') {
        const res = await adminApi.getReviewsQueue({ status: 'all' });
        if (res.data?.success) setReviewsQueue(res.data.data.reviews);
      } else if (activeTab === 'audit') {
        const res = await adminApi.getAuditLogs({ limit: 50 });
        if (res.data?.success) setAuditLogs(res.data.data.logs);
      } else if (activeTab === 'colleges') {
        const res = await collegeApi.getColleges({ limit: 50 });
        if (res.data?.success) setColleges(res.data.data.colleges);
      } else if (activeTab === 'top-50') {
        const res = await collegeApi.getTop50PrivateColleges();
        if (res.data?.success) setTop50Colleges(res.data.data.colleges);
      } else if (activeTab === 'users') {
        const res = await adminApi.getUsers();
        if (res.data?.success) setUsersList(res.data.data.users);
      }
    } catch (err) {
      console.error('[Admin Data Error]', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveStudent = async (studentId, studentName) => {
    if (!window.confirm(`Confirm approval of college affiliation for ${studentName}?`)) return;
    try {
      const res = await adminApi.verifyCollegeAffiliation(studentId, {
        status: 'verified',
        changeReason: 'College ID proof verified by moderator',
      });
      if (res.data?.success) {
        setActionMessage(`Verified college affiliation for ${studentName}`);
        fetchDashboardData();
        if (previewDoc) setPreviewDoc(null);
        setTimeout(() => setActionMessage(''), 3500);
      }
    } catch (err) {
      alert('Verification approval failed: ' + err.message);
    }
  };

  const openRejectDialog = (student) => {
    setRejectModalStudent(student);
    setRejectionReasonText('');
  };

  const handleConfirmRejectStudent = async () => {
    if (!rejectModalStudent) return;
    const reason = rejectionReasonText.trim() || 'Uploaded document does not meet institutional validation standards.';
    try {
      const res = await adminApi.verifyCollegeAffiliation(rejectModalStudent._id, {
        status: 'rejected',
        rejectionReason: reason,
        changeReason: reason,
      });
      if (res.data?.success) {
        setActionMessage(`Affiliation rejected for ${rejectModalStudent.name}`);
        setRejectModalStudent(null);
        fetchDashboardData();
        if (previewDoc) setPreviewDoc(null);
        setTimeout(() => setActionMessage(''), 3500);
      }
    } catch (err) {
      alert('Rejection failed: ' + err.message);
    }
  };

  const openDocumentPreview = (doc, student) => {
    if (!doc?._id) return;
    const docUrl = `/api/documents/${doc._id}?token=${authToken}`;
    setPreviewDoc({
      id: doc._id,
      url: docUrl,
      fileName: doc.originalFileName || 'student_id_document',
      mimeType: doc.mimeType || 'image/jpeg',
      studentName: student?.name || 'Student',
      studentEmail: student?.email,
      studentId: student?._id,
      collegeName: student?.collegeId?.name || student?.collegeId?.shortName || 'College',
      status: student?.collegeVerificationStatus || 'pending',
    });
  };

  const handleVerifyOffer = async (offerId, status) => {
    const notes = prompt(`Enter moderator review notes for marking offer as ${status}:`) || 'Standard moderation verified.';
    try {
      const res = await offerApi.verifyOffer(offerId, {
        status,
        moderatorNotes: notes,
        rejectionReason: status === 'Rejected' ? notes : undefined,
      });
      if (res.data?.success) {
        setActionMessage(`Offer updated to ${status}`);
        fetchDashboardData();
        setTimeout(() => setActionMessage(''), 3000);
      }
    } catch (err) {
      alert('Action failed: ' + err.message);
    }
  };

  const handleVerifyInternship = async (internshipId, status) => {
    const notes = prompt(`Enter moderator review notes for marking internship as ${status}:`) || 'Standard moderation verified.';
    try {
      const res = await adminApi.verifyInternship(internshipId, {
        status,
        notes,
        rejectionReason: status === 'Rejected' ? notes : undefined,
      });
      if (res.data?.success) {
        setActionMessage(`Internship updated to ${status}`);
        fetchDashboardData();
        setTimeout(() => setActionMessage(''), 3000);
      }
    } catch (err) {
      alert('Action failed: ' + err.message);
    }
  };

  const handleScanCollegeWebsite = async (colId) => {
    if (!colId) {
      alert('Please select an institution to scan');
      return;
    }
    setScanning(true);
    setScanMessage('Connecting to official college website and crawling placement documents...');
    try {
      const res = await officialReportApi.scanCollege(colId);
      if (res.data?.success) {
        setScanMessage(res.data.message || 'Scan completed successfully.');
        fetchDashboardData();
        setTimeout(() => setScanMessage(''), 5000);
      }
    } catch (err) {
      setScanMessage('Scan failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setScanning(false);
    }
  };

  const handleReviewReport = async (reportId, action) => {
    let rejectionReason = '';
    if (action === 'reject') {
      rejectionReason = prompt('Enter documented rejection reason for this official report:');
      if (!rejectionReason) return;
    }
    try {
      const res = await officialReportApi.reviewReport(reportId, { action, rejectionReason });
      if (res.data?.success) {
        setActionMessage(`Official report ${action === 'approve' ? 'approved & published' : 'rejected'}.`);
        fetchDashboardData();
        setTimeout(() => setActionMessage(''), 3500);
      }
    } catch (err) {
      alert('Review action failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleReviewMetric = async (metricId, action) => {
    let correctedValue = undefined;
    if (action === 'correct') {
      const input = prompt('Enter the corrected numerical value for this metric:');
      if (!input) return;
      correctedValue = parseFloat(input);
      if (isNaN(correctedValue)) {
        alert('Invalid numerical value.');
        return;
      }
    }
    try {
      const res = await officialReportApi.reviewMetric(metricId, { action, correctedValue });
      if (res.data?.success) {
        setActionMessage(`Metric ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'corrected'}.`);
        fetchDashboardData();
        setTimeout(() => setActionMessage(''), 3500);
      }
    } catch (err) {
      alert('Metric action failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleExtractReport = async (reportId) => {
    try {
      setActionMessage('Extracting document statistics...');
      const res = await officialReportApi.extractReport(reportId);
      if (res.data?.success) {
        setActionMessage(`Extraction complete: ${res.data.data.metricsCount} metric(s) discovered.`);
        fetchDashboardData();
        setTimeout(() => setActionMessage(''), 3500);
      }
    } catch (err) {
      alert('Extraction failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const openClassifyCollege = (col) => {
    setClassifyModalCollege(col);
    setClassificationForm({
      category: col.institutionCategory?.category || 'Category A: Premium Public',
      subCategory: col.institutionCategory?.subCategory || 'IIT',
      classificationNotes: col.institutionCategory?.classificationNotes || '',
    });
  };

  const handleSaveClassification = async (e) => {
    e.preventDefault();
    if (!classifyModalCollege) return;
    setClassifying(true);
    try {
      const res = await collegeApi.classifyInstitution(classifyModalCollege._id, classificationForm);
      if (res.data?.success) {
        setActionMessage(`Classification updated for ${classifyModalCollege.name} (${classificationForm.category})`);
        setClassifyModalCollege(null);
        fetchDashboardData();
        setTimeout(() => setActionMessage(''), 3500);
      }
    } catch (err) {
      alert('Classification update failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setClassifying(false);
    }
  };

  const openVerifyImportModal = (record, targetStatus) => {
    setVerifyImportModalRecord(record);
    const isCatA = record.collegeId?.institutionCategory?.category?.includes('Category A');
    setVerifyImportForm({
      approvalStatus: targetStatus,
      verificationLevel: targetStatus === 'Verified' ? 'Officially reported' : 'Unverified',
      notes: targetStatus === 'Verified' ? 'Verified against official institutional placement report/NIRF filing.' : '',
      rejectionReason: targetStatus === 'Rejected' ? 'Source metrics or documentation could not be substantiated.' : '',
    });
  };

  const handleConfirmVerifyImport = async (e) => {
    e.preventDefault();
    if (!verifyImportModalRecord) return;
    setVerifyingImport(true);
    try {
      const res = await adminApi.verifyOfficialImport(verifyImportModalRecord._id, {
        approvalStatus: verifyImportForm.approvalStatus,
        verificationLevel: verifyImportForm.verificationLevel,
        notes: verifyImportForm.notes,
        rejectionReason: verifyImportForm.approvalStatus === 'Rejected' ? verifyImportForm.rejectionReason : undefined,
      });
      if (res.data?.success) {
        setActionMessage(`Official placement record updated to ${verifyImportForm.approvalStatus} (${verifyImportForm.verificationLevel})`);
        setVerifyImportModalRecord(null);
        fetchDashboardData();
        setTimeout(() => setActionMessage(''), 3500);
      }
    } catch (err) {
      alert('Verification update failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setVerifyingImport(false);
    }
  };

  const handleVerifyOfficialImport = async (recordId, approvalStatus) => {
    const record = officialImportsQueue.find((r) => r._id === recordId);
    if (record) {
      openVerifyImportModal(record, approvalStatus);
      return;
    }
    const notes = prompt(`Enter moderator validation notes for marking official record as ${approvalStatus}:`) || 'Source verified against institutional filing.';
    try {
      const res = await adminApi.verifyOfficialImport(recordId, {
        approvalStatus,
        notes,
        rejectionReason: approvalStatus === 'Rejected' ? notes : undefined,
      });
      if (res.data?.success) {
        setActionMessage(`Official placement record marked as ${approvalStatus}`);
        fetchDashboardData();
        setTimeout(() => setActionMessage(''), 3000);
      }
    } catch (err) {
      alert('Action failed: ' + err.message);
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importForm.collegeId) return alert('Please select a college.');
    if (!importForm.sourceUrl) return alert('Please enter official source URL.');
    if (!importForm.reportingYear) return alert('Please specify reporting year.');

    setImporting(true);
    try {
      const res = await adminApi.importOfficialPlacement(importForm);
      if (res.data?.success) {
        setImportMessage('Official placement metrics imported with Pending status. Requires verification before public release.');
        fetchDashboardData();
        setImportForm({
          collegeId: '',
          reportingYear: '2023-2024',
          sourceUrl: '',
          reportingSource: 'Official Institute Website',
          totalGraduatingStudents: '',
          totalEligibleStudents: '',
          uniqueStudentsPlaced: '',
          totalJobOffers: '',
          highestPackageLPA: '',
          averagePackageLPA: '',
          medianPackageLPA: '',
          uniqueRecruitersCount: '',
        });
        setTimeout(() => setImportMessage(''), 4500);
      }
    } catch (err) {
      alert('Import failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setImporting(false);
    }
  };

  const handleModerateReview = async (reviewId, status) => {
    try {
      const res = await reviewApi.moderateReview(reviewId, {
        status,
        moderationNotes: `Moderated to ${status} by admin console`,
      });
      if (res.data?.success) {
        setActionMessage(`Review updated to ${status}`);
        fetchDashboardData();
        setTimeout(() => setActionMessage(''), 3000);
      }
    } catch (err) {
      alert('Action failed: ' + err.message);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    const reason = prompt(`Reason for promoting/changing role to ${newRole}:`) || 'Administrative role adjustment';
    try {
      await adminApi.updateUserRole(userId, { role: newRole, changeReason: reason });
      fetchDashboardData();
    } catch (err) {
      alert('Role change failed: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            <h1 className="text-3xl font-extrabold text-navy-950">Administration & Verification Center</h1>
          </div>
          <p className="text-xs text-slate-500">
            Audit student ID cards, moderate verified offers, review feedback, and oversee institutional tier classifications.
          </p>
        </div>

        {actionMessage && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 animate-fade-in shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto text-xs font-semibold space-x-2 pb-0.5">
        {[
          { id: 'overview', label: 'Platform Overview' },
          {
            id: 'verifications',
            label: 'Student ID Verifications',
            badge: overview?.pendingStudentVerifications > 0 ? overview.pendingStudentVerifications : null,
          },
          {
            id: 'offers',
            label: 'Offer Verification Queue',
            badge: overview?.pendingOffers > 0 ? overview.pendingOffers : null,
          },
          {
            id: 'internships',
            label: 'Internship Moderation Queue',
            badge: overview?.pendingInternships > 0 ? overview.pendingInternships : null,
          },
          {
            id: 'official-imports',
            label: 'Official Reports & Imports',
            badge: overview?.pendingOfficialImports > 0 ? overview.pendingOfficialImports : null,
          },
          { id: 'reviews', label: 'Review Moderation' },
          { id: 'audit', label: 'Immutable Audit Logs' },
          { id: 'colleges', label: 'Colleges & Tier Manager' },
          { id: 'top-50', label: 'Top 50 Private Telemetry', badge: '50' },
          { id: 'users', label: 'User Roles & Verifications' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 px-4 rounded-t-xl transition whitespace-nowrap border-b-2 flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-purple-600 text-purple-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-purple-600 text-white leading-none">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div
              onClick={() => setActiveTab('verifications')}
              className="p-5 rounded-2xl bg-white border border-purple-200 shadow-sm space-y-1 cursor-pointer hover:border-purple-400 hover:shadow-md transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-700 font-semibold">Pending IDs</span>
                <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 transition" />
              </div>
              <div className="text-2xl font-extrabold text-purple-700">{overview.pendingStudentVerifications ?? 0}</div>
              <p className="text-[11px] text-purple-500">Student ID proof</p>
            </div>

            <div
              onClick={() => setActiveTab('offers')}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1 cursor-pointer hover:border-slate-300 transition"
            >
              <span className="text-xs text-slate-500 font-medium">Pending Offers</span>
              <div className="text-2xl font-extrabold text-amber-600">{overview.pendingOffers}</div>
              <p className="text-[11px] text-slate-400">Verified: {overview.verifiedOffers}</p>
            </div>

            <div
              onClick={() => setActiveTab('internships')}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1 cursor-pointer hover:border-slate-300 transition"
            >
              <span className="text-xs text-slate-500 font-medium">Pending Internships</span>
              <div className="text-2xl font-extrabold text-blue-600">{overview.pendingInternships ?? 0}</div>
              <p className="text-[11px] text-slate-400">Verified: {overview.verifiedInternships ?? 0}</p>
            </div>

            <div
              onClick={() => setActiveTab('official-imports')}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1 cursor-pointer hover:border-slate-300 transition"
            >
              <span className="text-xs text-slate-500 font-medium">Pending Imports</span>
              <div className="text-2xl font-extrabold text-indigo-600">{overview.pendingOfficialImports ?? 0}</div>
              <p className="text-[11px] text-slate-400">Official reports</p>
            </div>

            <div
              onClick={() => setActiveTab('reviews')}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1 cursor-pointer hover:border-slate-300 transition"
            >
              <span className="text-xs text-slate-500 font-medium">Flagged Reviews</span>
              <div className="text-2xl font-extrabold text-rose-600">{overview.pendingReviews}</div>
              <p className="text-[11px] text-slate-400">In moderation queue</p>
            </div>

            <div
              onClick={() => setActiveTab('audit')}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1 cursor-pointer hover:border-slate-300 transition"
            >
              <span className="text-xs text-slate-500 font-medium">Audited Events</span>
              <div className="text-2xl font-extrabold text-brand-primary">{overview.totalAuditEvents}</div>
              <p className="text-[11px] text-slate-400">Documented changes</p>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT ID VERIFICATION QUEUE TAB */}
      {activeTab === 'verifications' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-purple-600" />
                <span>Student College ID Verification Queue</span>
              </h3>
              <p className="text-xs text-slate-500">
                Inspect uploaded student ID cards or bonafide certificates to validate college affiliation.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Status filter:</span>
              <select
                value={selectedVerificationStatus}
                onChange={(e) => setSelectedVerificationStatus(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 font-medium"
              >
                <option value="pending">Pending Review</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
                <option value="all">All Submissions</option>
              </select>
            </div>
          </div>

          {loading ? (
            <SkeletonLoader count={3} />
          ) : verificationsQueue.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
              <p className="font-semibold text-slate-700">No student verifications in queue for selected filter.</p>
              <p className="text-slate-400">When students upload their ID proof, submissions will appear here for review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">College & Department</th>
                    <th className="py-3 px-4">ID Proof Document</th>
                    <th className="py-3 px-4">Submitted Date</th>
                    <th className="py-3 px-4">Current Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {verificationsQueue.map((student) => {
                    const doc = student.collegeVerificationDocument;
                    return (
                      <tr key={student._id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{student.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{student.email}</div>
                          <div className="text-[10px] text-slate-400">Pseudonym: {student.pseudonym}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">
                            {student.collegeId?.name || student.collegeId?.shortName || 'Not Set'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {student.departmentId?.name || student.departmentId?.code || 'Department'} • Batch {student.graduationYear || 'N/A'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {doc ? (
                            <div className="space-y-1.5">
                              <button
                                type="button"
                                onClick={() => openDocumentPreview(doc, student)}
                                className="inline-flex items-center gap-1.5 text-xs text-purple-700 hover:text-purple-900 font-semibold bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg border border-purple-200 transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View ID Document</span>
                              </button>
                              <div className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
                                {doc.originalFileName} ({(doc.fileSize / 1024).toFixed(1)} KB)
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">No document attached</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {doc?.createdAt ? new Date(doc.createdAt).toLocaleDateString() : new Date(student.updatedAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4">
                          {student.isCollegeVerified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Verified</span>
                            </span>
                          ) : student.collegeVerificationStatus === 'pending' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              <Clock className="w-3.5 h-3.5 text-purple-600" />
                              <span>Pending Review</span>
                            </span>
                          ) : student.collegeVerificationStatus === 'rejected' ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                                <span>Rejected</span>
                              </span>
                              {student.collegeVerificationRejectionReason && (
                                <p className="text-[10px] text-rose-700 truncate max-w-[180px]" title={student.collegeVerificationRejectionReason}>
                                  Reason: {student.collegeVerificationRejectionReason}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              Unverified
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApproveStudent(student._id, student.name)}
                              disabled={student.isCollegeVerified}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold text-[11px] transition flex items-center gap-1 disabled:opacity-40"
                              title="Approve College Affiliation"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openRejectDialog(student)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-semibold text-[11px] transition flex items-center gap-1"
                              title="Reject with Reason"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* OFFERS VERIFICATION QUEUE TAB */}
      {activeTab === 'offers' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">Student Offer Verification Queue</h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Filter status:</span>
              <select
                value={selectedOfferStatus}
                onChange={(e) => setSelectedOfferStatus(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700"
              >
                <option value="all">All</option>
                <option value="Pending">Pending</option>
                <option value="Under review">Under review</option>
                <option value="Verified">Verified</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {loading ? (
            <SkeletonLoader count={3} />
          ) : offersQueue.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No offers in queue for selected filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">College & Dept</th>
                    <th className="py-3 px-4">Company & Role</th>
                    <th className="py-3 px-4">CTC (LPA)</th>
                    <th className="py-3 px-4">Document Evidence</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {offersQueue.map((offer) => (
                    <tr key={offer._id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{offer.studentId?.name}</div>
                        <div className="text-[11px] text-slate-500">{offer.studentId?.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>{offer.collegeId?.shortName || offer.collegeId?.name}</div>
                        <div className="text-[11px] text-slate-500">{offer.departmentId?.code} • {offer.graduationYear}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{offer.companyName}</div>
                        <div className="text-[11px] text-slate-500">{offer.jobRole}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-brand-primary">
                        {offer.annualCtcLpa} LPA
                      </td>
                      <td className="py-3.5 px-4">
                        {offer.supportingDocument ? (
                          <button
                            type="button"
                            onClick={() => openDocumentPreview(offer.supportingDocument, offer.studentId)}
                            className="inline-flex items-center gap-1 text-[11px] text-purple-600 hover:underline font-semibold bg-purple-50 px-2 py-1 rounded"
                          >
                            <FileText className="w-3 h-3" />
                            <span>View Letter</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No file attached</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[11px]">{offer.verificationStatus}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleVerifyOffer(offer._id, 'Verified')}
                            className="p-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            title="Verify and Approve"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleVerifyOffer(offer._id, 'Rejected')}
                            className="p-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                            title="Reject"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* INTERNSHIP MODERATION QUEUE TAB */}
      {activeTab === 'internships' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">Student Internship Verification Queue</h3>
              <p className="text-xs text-slate-500">Validate student internship certificates, monthly stipends, and PPO conversions</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Filter status:</span>
              <select
                value={selectedInternshipStatus}
                onChange={(e) => setSelectedInternshipStatus(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700"
              >
                <option value="all">All</option>
                <option value="Pending">Pending</option>
                <option value="Under review">Under review</option>
                <option value="Verified">Verified</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {loading ? (
            <SkeletonLoader count={2} />
          ) : internshipsQueue.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
              No internship records found matching status criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">College & Dept</th>
                    <th className="py-3 px-4">Company & Role</th>
                    <th className="py-3 px-4">Stipend & Mode</th>
                    <th className="py-3 px-4">PPO Outcome</th>
                    <th className="py-3 px-4">Evidence</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {internshipsQueue.map((intern) => (
                    <tr key={intern._id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{intern.studentId?.name || 'Anonymous Student'}</div>
                        <div className="text-[11px] text-slate-500">{intern.studentId?.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>{intern.collegeId?.shortName || intern.collegeId?.name}</div>
                        <div className="text-[11px] text-slate-500">{intern.departmentId?.code}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{intern.companyName}</div>
                        <div className="text-[11px] text-slate-500">{intern.internshipRole}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {intern.stipendCategory === 'Paid'
                            ? `₹${intern.monthlyStipendInr?.toLocaleString('en-IN') || 0}/mo`
                            : intern.stipendCategory}
                        </div>
                        <div className="text-[11px] text-slate-500">{intern.workMode}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[11px] text-purple-700">{intern.ppoConversion}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {intern.verificationEvidenceId ? (
                          <button
                            type="button"
                            onClick={() => openDocumentPreview(intern.verificationEvidenceId, intern.studentId)}
                            className="inline-flex items-center gap-1 text-[11px] text-purple-600 hover:underline font-semibold bg-purple-50 px-2 py-1 rounded"
                          >
                            <FileText className="w-3 h-3" />
                            <span>View Proof</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No file</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[11px]">{intern.verificationStatus}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleVerifyInternship(intern._id, 'Verified')}
                            className="p-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            title="Verify and Approve"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleVerifyInternship(intern._id, 'Rejected')}
                            className="p-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                            title="Reject"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* OFFICIAL REPORTS & IMPORTS TAB */}
      {activeTab === 'official-imports' && (
        <div className="space-y-8">
          {/* Section 0: Automated Official Website Discovery & Extraction Center */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">
                  <FileSearch className="w-4 h-4 text-purple-600" />
                  <span>Automated Official Report Discovery Engine</span>
                </div>
                <h3 className="font-bold text-lg text-slate-900">
                  Scan Official College Websites & Fetch Reports
                </h3>
                <p className="text-xs text-slate-500 max-w-xl">
                  Discovers placement pages, annual reports, and brochures directly from registered official domains. Zero third-party data scraping.
                </p>
              </div>

              {/* Trigger Manual Scan Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedScanCollegeId}
                  onChange={(e) => setSelectedScanCollegeId(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white text-slate-700"
                >
                  <option value="">Select College to Scan</option>
                  {colleges.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.website})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={scanning || !selectedScanCollegeId}
                  onClick={() => handleScanCollegeWebsite(selectedScanCollegeId)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                  <span>{scanning ? 'Scanning Website...' : 'Scan Official Website'}</span>
                </button>
              </div>
            </div>

            {scanMessage && (
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>{scanMessage}</span>
              </div>
            )}

            {/* Discovered Reports Queue */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Discovered Official Documents ({discoveredReports.length})
                </h4>
                <span className="text-[11px] text-slate-400">Click a report to inspect extracted metrics & cited snippets</span>
              </div>

              {discoveredReports.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                  No official reports discovered yet. Select an institution above and click "Scan Official Website" to begin automated discovery.
                </div>
              ) : (
                <div className="space-y-3">
                  {discoveredReports.map((report) => {
                    const isExpanded = expandedReportId === report._id;
                    return (
                      <div
                        key={report._id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition p-4 sm:p-5 space-y-3"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">
                                {report.collegeId?.name}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                {report.academicSession}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  report.status === 'Approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : report.status === 'Rejected'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {report.status}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({report.metricsCount || 0} metrics)
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 font-medium">
                              {report.documentTitle}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                              <span>Source: <a href={report.sourceUrl} target="_blank" rel="noreferrer" className="text-brand-secondary hover:underline">{report.sourceUrl}</a></span>
                              <span>•</span>
                              <span>Discovered: {new Date(report.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={report.reportUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-semibold flex items-center gap-1 shadow-2xs"
                            >
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                              <span>Source Doc</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => setExpandedReportId(isExpanded ? null : report._id)}
                              className="px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[11px] font-semibold transition"
                            >
                              {isExpanded ? 'Hide Metrics' : 'View Metrics'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleExtractReport(report._id)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-semibold transition"
                              title="Re-run text & table extraction"
                            >
                              Re-extract
                            </button>

                            {report.status !== 'Approved' && (
                              <button
                                type="button"
                                onClick={() => handleReviewReport(report._id, 'approve')}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 transition shadow-xs"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve Report</span>
                              </button>
                            )}

                            {report.status !== 'Rejected' && (
                              <button
                                type="button"
                                onClick={() => handleReviewReport(report._id, 'reject')}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[11px] font-semibold flex items-center gap-1 transition"
                              >
                                <X className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expandable Details: Extracted Metrics with Citations */}
                        {isExpanded && (
                          <div className="pt-3 border-t border-slate-200 space-y-3 animate-fade-in">
                            <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                              Extracted Statistics & Cited Document Evidence:
                            </h5>

                            {report.metrics && report.metrics.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {report.metrics.map((metric) => (
                                  <div
                                    key={metric._id}
                                    className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 text-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-900">{metric.metricName}</span>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        metric.reviewStatus === 'Approved'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : metric.reviewStatus === 'Rejected'
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {metric.reviewStatus}
                                      </span>
                                    </div>

                                    <div className="text-base font-extrabold text-purple-700">
                                      {metric.rawReportedValue}
                                    </div>

                                    <div className="p-2 bg-slate-50 rounded-lg text-[10px] font-mono text-slate-600 border border-slate-100 leading-relaxed italic">
                                      "{metric.sourceTextSnippet}"
                                    </div>

                                    <div className="flex items-center justify-between pt-1 text-[11px]">
                                      <span className="text-slate-400">Page: {metric.pageNumber || 1}</span>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleReviewMetric(metric._id, 'correct')}
                                          className="text-slate-600 hover:text-slate-900 text-[10px] font-semibold underline"
                                        >
                                          Correct Value
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleReviewMetric(metric._id, 'approve')}
                                          className="text-emerald-700 hover:underline text-[10px] font-bold"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleReviewMetric(metric._id, 'reject')}
                                          className="text-rose-600 hover:underline text-[10px] font-bold"
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">
                                No individual metrics extracted yet. Click "Re-extract" to run parsing.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Discovery Scan Logs Audit Trail */}
            {discoveryLogs.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Recent Automated Discovery Scan History:
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {discoveryLogs.slice(0, 5).map((log) => (
                    <div key={log._id} className="p-2 rounded-lg bg-slate-50 text-[11px] flex justify-between items-center text-slate-600">
                      <div>
                        <strong>{log.collegeId?.name || 'College'}</strong>: {log.notes}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.scannedAt || log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 1: Official Placement Information Import Form */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Import Placement Metrics from Official Source</h3>
              <p className="text-xs text-slate-500">
                Administrators can ingest placement data from institute websites or NIRF reports. Records are strictly imported in <strong>Pending</strong> status and require moderator source validation before appearing publicly.
              </p>
            </div>

            {importMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                {importMessage}
              </div>
            )}

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target College *</label>
                  <select
                    value={importForm.collegeId}
                    onChange={(e) => setImportForm({ ...importForm, collegeId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800"
                  >
                    <option value="">Select College</option>
                    {colleges.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reporting Academic Year *</label>
                  <input
                    type="text"
                    value={importForm.reportingYear}
                    onChange={(e) => setImportForm({ ...importForm, reportingYear: e.target.value })}
                    placeholder="e.g. 2023-2024"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reporting Source Classification</label>
                  <select
                    value={importForm.reportingSource}
                    onChange={(e) => setImportForm({ ...importForm, reportingSource: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800"
                  >
                    <option value="Official Institute Website">Official Institute Website</option>
                    <option value="NIRF Mandatory Disclosure">NIRF Mandatory Disclosure</option>
                    <option value="Annual Placement Brochure">Annual Placement Brochure</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Source URL *</label>
                <input
                  type="url"
                  value={importForm.sourceUrl}
                  onChange={(e) => setImportForm({ ...importForm, sourceUrl: e.target.value })}
                  placeholder="https://institute.ac.in/placements/annual-report-2024.pdf"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Graduating Students</label>
                  <input
                    type="number"
                    value={importForm.totalGraduatingStudents}
                    onChange={(e) => setImportForm({ ...importForm, totalGraduatingStudents: e.target.value })}
                    placeholder="e.g. 4500"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Eligible Students (Denominator)</label>
                  <input
                    type="number"
                    value={importForm.totalEligibleStudents}
                    onChange={(e) => setImportForm({ ...importForm, totalEligibleStudents: e.target.value })}
                    placeholder="Leave empty if undisclosed"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unique Placed Students *</label>
                  <input
                    type="number"
                    value={importForm.uniqueStudentsPlaced}
                    onChange={(e) => setImportForm({ ...importForm, uniqueStudentsPlaced: e.target.value })}
                    placeholder="e.g. 3800"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Job Offers *</label>
                  <input
                    type="number"
                    value={importForm.totalJobOffers}
                    onChange={(e) => setImportForm({ ...importForm, totalJobOffers: e.target.value })}
                    placeholder="e.g. 4900"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Median Package (LPA)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={importForm.medianPackageLPA}
                    onChange={(e) => setImportForm({ ...importForm, medianPackageLPA: e.target.value })}
                    placeholder="e.g. 6.5"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Average Package (LPA)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={importForm.averagePackageLPA}
                    onChange={(e) => setImportForm({ ...importForm, averagePackageLPA: e.target.value })}
                    placeholder="e.g. 8.2"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Highest Package (LPA)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={importForm.highestPackageLPA}
                    onChange={(e) => setImportForm({ ...importForm, highestPackageLPA: e.target.value })}
                    placeholder="e.g. 52.0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unique Recruiters</label>
                  <input
                    type="number"
                    value={importForm.uniqueRecruitersCount}
                    onChange={(e) => setImportForm({ ...importForm, uniqueRecruitersCount: e.target.value })}
                    placeholder="e.g. 350"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={importing}
                  className="px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-navy-800 transition shadow-sm disabled:opacity-50"
                >
                  {importing ? 'Importing...' : 'Import Official Record (Pending Verification)'}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Pending Official Records Validation Queue */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Official Placement Reports Moderation Queue</h3>
                <p className="text-xs text-slate-500">Cross-examine imported reports against official source URLs before publishing</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Status filter:</span>
                <select
                  value={selectedOfficialImportStatus}
                  onChange={(e) => setSelectedOfficialImportStatus(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700"
                >
                  <option value="all">All</option>
                  <option value="Pending">Pending Validation</option>
                  <option value="Verified">Verified & Active</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            {loading ? (
              <SkeletonLoader count={2} />
            ) : officialImportsQueue.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
                No official reports found in the verification queue.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">College</th>
                      <th className="py-3 px-4">Year</th>
                      <th className="py-3 px-4">Source URL</th>
                      <th className="py-3 px-4">Placed / Offers</th>
                      <th className="py-3 px-4">Median / Highest</th>
                      <th className="py-3 px-4">Import Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {officialImportsQueue.map((rec) => (
                      <tr key={rec._id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {rec.collegeId?.name || 'Unknown'}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {rec.reportingYear || rec.seasonId?.academicYear || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 max-w-[200px] truncate">
                          {rec.sourceUrl ? (
                            <a
                              href={rec.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-secondary hover:underline flex items-center gap-1 font-medium"
                            >
                              <span className="truncate">{rec.sourceUrl}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div>Placed: <strong>{rec.uniqueStudentsPlaced}</strong></div>
                          <div className="text-[11px] text-slate-500">Offers: {rec.totalJobOffers}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-brand-primary font-bold">{rec.medianPackageLPA ? `${rec.medianPackageLPA} LPA` : 'N/A'}</div>
                          <div className="text-[11px] text-slate-500">Max: {rec.highestPackageLPA || 'N/A'} LPA</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {rec.importDate ? new Date(rec.importDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              rec.approvalStatus === 'Verified'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : rec.approvalStatus === 'Rejected'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {rec.approvalStatus || 'Pending'}
                            </span>
                            {rec.verificationLevel && (
                              <div className="text-[10px] text-slate-500 font-medium">
                                Level: <span className="font-semibold text-slate-700">{rec.verificationLevel}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openVerifyImportModal(rec, 'Verified')}
                              className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 text-[11px] font-semibold transition"
                              title="Validate, Choose Verification Level & Approve"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Verify</span>
                            </button>
                            <button
                              onClick={() => openVerifyImportModal(rec, 'Rejected')}
                              className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 text-[11px] font-semibold transition"
                              title="Reject with Reason"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REVIEW MODERATION TAB */}
      {activeTab === 'reviews' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900">Review Moderation Queue</h3>
          <div className="space-y-4">
            {reviewsQueue.map((rev) => (
              <div key={rev._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-900">
                    {rev.authorDisplayName} ({rev.collegeId?.shortName}) - Rating: {rev.overallRating}/5.0
                  </div>
                  <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-200 text-slate-700">
                    Status: {rev.moderationStatus}
                  </span>
                </div>
                <h4 className="font-bold text-slate-800">{rev.title}</h4>
                <p className="text-slate-600">{rev.reviewText}</p>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleModerateReview(rev._id, 'Approved')}
                    className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-semibold hover:bg-emerald-700"
                  >
                    Approve & Publish
                  </button>
                  <button
                    onClick={() => handleModerateReview(rev._id, 'Rejected')}
                    className="px-3 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-semibold hover:bg-rose-700"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AUDIT LOGS TAB */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Immutable Administrative Audit Trail</h3>
            <p className="text-xs text-slate-500">Every change to placement statistics and verification decisions is recorded here.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Performed By</th>
                  <th className="py-3 px-4">Mandatory Reason</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">{log.actionType}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{log.entityType}</td>
                    <td className="py-3 px-4 text-slate-600">{log.performedByEmail || 'Staff'}</td>
                    <td className="py-3 px-4 text-slate-700 italic max-w-xs truncate">{log.changeReason}</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COLLEGES TAB */}
      {activeTab === 'colleges' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-slate-900">Colleges & Platform Tier Classifications</h3>
              <p className="text-xs text-slate-500">
                Manage institution categorization (Category A Premium Public vs Category B Private) and historical data verification policies.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">College</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Institution Category</th>
                  <th className="py-3 px-4">Placement Discovery</th>
                  <th className="py-3 px-4">Historical Policy</th>
                  <th className="py-3 px-4">Platform Tier</th>
                  <th className="py-3 px-4">Completeness</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {colleges.map((col) => {
                  const isCatA = col.institutionCategory?.category?.includes('Category A');
                  return (
                    <tr key={col._id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900">{col.name}</td>
                      <td className="py-3 px-4 text-slate-600">{col.city}, {col.state}</td>
                      <td className="py-3 px-4">
                        <InstitutionCategoryBadge
                          category={col.institutionCategory?.category}
                          subCategory={col.institutionCategory?.subCategory}
                          size="xs"
                        />
                      </td>
                      <td className="py-3 px-4">
                        {col.placementDiscovery?.status === 'completed' ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Discovered ({col.placementDiscovery.reportsFoundCount || col.placementDiscovery.uniqueSessionsFound?.length || 0} sessions)
                          </span>
                        ) : col.placementDiscovery?.status === 'in_progress' ? (
                          <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 flex items-center gap-1">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            Crawling
                          </span>
                        ) : col.placementDiscovery?.status === 'no_data_found' ? (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Not Found
                          </span>
                        ) : col.website ? (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await collegeApi.triggerDiscovery(col._id);
                                fetchDashboardData();
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="text-[10px] font-semibold text-brand-primary hover:text-navy-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-300 cursor-pointer"
                          >
                            Crawl Website
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No URL</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs">
                        {isCatA ? (
                          <span className="text-purple-700 font-medium">
                            Official reports 2018–19+; missing metrics marked "Not reported".
                          </span>
                        ) : (
                          <span className="text-indigo-700 font-medium">
                            Strict session evidence; like-for-like comparison; no extrapolation.
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4"><TierBadge tier={col.tierClassification?.tier} /></td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{col.dataCompletenessScore}%</td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => openClassifyCollege(col)}
                          className="px-2.5 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs flex items-center gap-1.5 transition shadow-xs"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Classify / Policy</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TOP 50 PRIVATE DIRECTORY TELEMETRY TAB */}
      {activeTab === 'top-50' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900">Top 50 Private Engineering Telemetry & Crawler Control</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Curated national benchmark based on NIRF Engineering 2024 & NAAC accreditation. Monitor official report discoveries and trigger on-demand crawlers.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/top-private-engineering-colleges-india"
                target="_blank"
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-brand-primary transition flex items-center gap-1.5"
              >
                <span>View Public Top 50 Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await collegeApi.getTop50PrivateColleges();
                    if (res.data?.success) setTop50Colleges(res.data.data.colleges);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Telemetry Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs space-y-1">
              <span className="font-bold text-amber-900 uppercase text-[10px] tracking-wider block">Ranked Institutions</span>
              <div className="text-2xl font-extrabold text-amber-900">{top50Colleges.length} <span className="text-xs font-normal text-amber-700">Curated</span></div>
              <p className="text-amber-700 text-[11px]">Strictly Category B Private institutions</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-1">
              <span className="font-bold text-emerald-900 uppercase text-[10px] tracking-wider block">Official Portal Coverage</span>
              <div className="text-2xl font-extrabold text-emerald-900">
                {top50Colleges.filter((c) => c.officialPlacementPageUrl || c.website).length} <span className="text-xs font-normal text-emerald-700">/ {top50Colleges.length}</span>
              </div>
              <p className="text-emerald-700 text-[11px]">100% Verified official source URLs</p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-xs space-y-1">
              <span className="font-bold text-indigo-900 uppercase text-[10px] tracking-wider block">Indexed Placement Reports</span>
              <div className="text-2xl font-extrabold text-indigo-900">
                {top50Colleges.reduce((acc, c) => acc + (c.officialReportsCount || 0), 0)} <span className="text-xs font-normal text-indigo-700">Documents</span>
              </div>
              <p className="text-indigo-700 text-[11px]">Discovered & verified reports</p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 text-xs space-y-1">
              <span className="font-bold text-purple-900 uppercase text-[10px] tracking-wider block">Multi-Session Data</span>
              <div className="text-2xl font-extrabold text-purple-900">
                {top50Colleges.reduce((acc, c) => acc + (c.availableSessions?.length || 0), 0)} <span className="text-xs font-normal text-purple-700">Sessions</span>
              </div>
              <p className="text-purple-700 text-[11px]">Total academic sessions captured</p>
            </div>
          </div>

          {/* Search bar within Top 50 */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={top50Search}
              onChange={(e) => setTop50Search(e.target.value)}
              placeholder="Filter Top 50 colleges by name, city, state..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Telemetry Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-3 text-center">Rank</th>
                  <th className="py-3 px-4">Institution Name</th>
                  <th className="py-3 px-3 text-center">NIRF / NAAC</th>
                  <th className="py-3 px-4">Official Placement Portal</th>
                  <th className="py-3 px-3 text-center">Sessions</th>
                  <th className="py-3 px-3 text-center">Reports</th>
                  <th className="py-3 px-3 text-right">Latest Highest</th>
                  <th className="py-3 px-3 text-right">Latest Avg / Median</th>
                  <th className="py-3 px-4 text-center">Crawler Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {top50Colleges
                  .filter((col) => {
                    if (!top50Search.trim()) return true;
                    const q = top50Search.toLowerCase();
                    return (
                      col.name.toLowerCase().includes(q) ||
                      (col.shortName && col.shortName.toLowerCase().includes(q)) ||
                      (col.city && col.city.toLowerCase().includes(q)) ||
                      (col.state && col.state.toLowerCase().includes(q))
                    );
                  })
                  .map((col) => {
                    const p = col.latestPlacementRecord;
                    const isCrawling = crawlingTop50Id === col._id;

                    return (
                      <tr key={col._id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 text-center font-extrabold text-slate-900">
                          #{col.top50Rank || col.rankingDetails?.rank || '—'}
                        </td>

                        <td className="py-3 px-4">
                          <Link
                            to={`/colleges/${col.slug || col._id}`}
                            className="font-bold text-slate-900 hover:text-brand-primary text-xs"
                          >
                            {col.name}
                          </Link>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {col.city}, {col.state}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="space-y-0.5">
                            {col.nirfRanking?.engineeringRank && (
                              <div className="text-[10px] font-bold text-purple-700">
                                NIRF #{col.nirfRanking.engineeringRank}
                              </div>
                            )}
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              NAAC {col.naacGrade || 'Accredited'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 max-w-xs truncate">
                          {col.officialPlacementPageUrl ? (
                            <a
                              href={col.officialPlacementPageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-primary hover:underline font-mono text-[11px] flex items-center gap-1"
                              title={col.officialPlacementPageUrl}
                            >
                              <span className="truncate max-w-[200px]">{col.officialPlacementPageUrl}</span>
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            </a>
                          ) : col.website ? (
                            <a
                              href={col.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-600 hover:underline font-mono text-[11px] flex items-center gap-1"
                            >
                              <span className="truncate max-w-[200px]">{col.website}</span>
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">No URL</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-wrap justify-center gap-1 max-w-[120px]">
                            {col.availableSessions && col.availableSessions.length > 0 ? (
                              col.availableSessions.slice(0, 2).map((s, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                  {s}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 text-[10px]">—</span>
                            )}
                            {col.availableSessions && col.availableSessions.length > 2 && (
                              <span className="text-slate-400 text-[10px]">+{col.availableSessions.length - 2}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-slate-800">
                          {col.officialReportsCount || 0}
                        </td>

                        <td className="py-3 px-3 text-right font-extrabold text-emerald-600">
                          {p?.highestPackageLPA ? `₹${p.highestPackageLPA} L` : '—'}
                        </td>

                        <td className="py-3 px-3 text-right text-xs">
                          <div className="font-bold text-indigo-600">{p?.averagePackageLPA ? `₹${p.averagePackageLPA} L (avg)` : '—'}</div>
                          <div className="text-[11px] text-blue-600 font-semibold">{p?.medianPackageLPA ? `₹${p.medianPackageLPA} L (med)` : ''}</div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={async () => {
                              setCrawlingTop50Id(col._id);
                              try {
                                const res = await collegeApi.triggerDiscovery(col._id);
                                if (res.data?.success) {
                                  setActionMessage(`Crawling initiated for ${col.name}`);
                                  setTimeout(() => setActionMessage(''), 4000);
                                  const updated = await collegeApi.getTop50PrivateColleges();
                                  if (updated.data?.success) setTop50Colleges(updated.data.data.colleges);
                                }
                              } catch (err) {
                                alert(`Crawl failed: ${err.response?.data?.message || err.message}`);
                              } finally {
                                setCrawlingTop50Id(null);
                              }
                            }}
                            disabled={isCrawling}
                            className="px-2.5 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs inline-flex items-center gap-1.5 transition disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${isCrawling ? 'animate-spin' : ''}`} />
                            <span>{isCrawling ? 'Crawling...' : 'Re-crawl'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* USER ROLES & VERIFICATIONS TAB */}
      {activeTab === 'users' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900">User Roles & Affiliation Status</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">College</th>
                  <th className="py-3 px-4">Affiliation Status</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3 px-4 text-slate-600">{u.email}</td>
                    <td className="py-3 px-4 text-slate-600">{u.collegeId?.name || 'None'}</td>
                    <td className="py-3 px-4">
                      {u.isCollegeVerified ? (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          College Verified
                        </span>
                      ) : u.collegeVerificationStatus === 'pending' ? (
                        <div className="space-y-0.5">
                          <span className="inline-block text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            ID Proof Pending
                          </span>
                          {u.collegeVerificationDocument?.originalFileName && (
                            <button
                              type="button"
                              onClick={() => openDocumentPreview(u.collegeVerificationDocument, u)}
                              className="block text-[10px] text-purple-600 hover:underline font-mono truncate max-w-[150px]"
                            >
                              {u.collegeVerificationDocument.originalFileName}
                            </button>
                          )}
                        </div>
                      ) : u.collegeVerificationStatus === 'rejected' ? (
                        <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Rejected
                        </span>
                      ) : (
                        <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold uppercase text-[10px] text-purple-700">{u.role}</td>
                    <td className="py-3 px-4 space-x-2">
                      <button
                        onClick={() => handleRoleChange(u._id, u.role === 'student' ? 'moderator' : 'student')}
                        className="text-[11px] text-purple-600 hover:underline font-semibold"
                      >
                        Toggle Role
                      </button>
                      <button
                        onClick={() => handleApproveStudent(u._id, u.name)}
                        className="text-[11px] text-emerald-600 hover:underline font-semibold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openRejectDialog(u)}
                        className="text-[11px] text-rose-600 hover:underline font-semibold"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECURE DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-navy-950 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-600" />
                  <span>Confidential Student Document: {previewDoc.fileName}</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Student: <strong>{previewDoc.studentName}</strong> ({previewDoc.studentEmail}) • Institute: <strong>{previewDoc.collegeName}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                  title="Open in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Raw</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body Preview */}
            <div className="flex-1 p-6 overflow-auto bg-slate-100/60 flex items-center justify-center min-h-[350px]">
              {previewDoc.mimeType.includes('pdf') || previewDoc.fileName.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.url}
                  title="PDF Document Preview"
                  className="w-full h-[65vh] rounded-2xl border border-slate-300 bg-white"
                />
              ) : (
                <img
                  src={previewDoc.url}
                  alt="Student ID Proof Preview"
                  className="max-h-[65vh] w-auto max-w-full rounded-2xl border border-slate-300 shadow-md object-contain bg-white"
                />
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>Protected by DPDP RBAC. Confidential student credentials.</span>
              </div>

              <div className="flex items-center gap-2">
                {previewDoc.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleApproveStudent(previewDoc.studentId, previewDoc.studentName)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve Affiliation</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const studentToReject = {
                          _id: previewDoc.studentId,
                          name: previewDoc.studentName,
                          email: previewDoc.studentEmail,
                        };
                        setRejectModalStudent(studentToReject);
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject with Reason</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON DIALOG MODAL */}
      {rejectModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-base">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Reject College Affiliation Request</span>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalStudent(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-600">
                You are rejecting verification for <strong>{rejectModalStudent.name}</strong> ({rejectModalStudent.email}).
                Please specify a documented reason. This reason will be logged into immutable audit records and displayed directly to the student on their profile page so they can address it.
              </p>
            </div>

            {/* Quick Reason Suggestions */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-700">Quick Reason Templates:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Photo is blurry or unreadable',
                  'College ID has expired',
                  'Name on ID does not match account name',
                  'Not an official college credential',
                  'College name mismatch with selected institution',
                ].map((template) => (
                  <button
                    key={template}
                    type="button"
                    onClick={() => setRejectionReasonText(template)}
                    className="text-[10px] px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 text-slate-700 hover:text-purple-700 transition"
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-800 block">
                Detailed Rejection Reason (Mandatory for DPDP & Audit compliance):
              </label>
              <textarea
                rows={3}
                required
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                placeholder="e.g., ID card photo is blurry; student roll number and college seal are not discernible. Please upload a high-resolution scan."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectModalStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectStudent}
                disabled={!rejectionReasonText.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                <X className="w-3.5 h-3.5" />
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSTITUTION CLASSIFICATION MODAL */}
      {classifyModalCollege && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-base">
                <Landmark className="w-5 h-5 text-purple-600 shrink-0" />
                <span>Classify Institution & Historical Policy</span>
              </div>
              <button
                type="button"
                onClick={() => setClassifyModalCollege(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm">{classifyModalCollege.name}</h4>
              <p className="text-xs text-slate-500">{classifyModalCollege.city}, {classifyModalCollege.state}</p>
            </div>

            <form onSubmit={handleSaveClassification} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 block">
                  Institution Category:
                </label>
                <select
                  value={classificationForm.category}
                  onChange={(e) => {
                    const cat = e.target.value;
                    const defaultSub = cat.includes('Category A') ? 'IIT' : 'Private University';
                    setClassificationForm({ ...classificationForm, category: cat, subCategory: defaultSub });
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Category A: Premium Public">Category A: Premium Public (IITs, NITs, IIITs)</option>
                  <option value="Category B: Private">Category B: Private (Universities, Engineering Colleges, Deemed)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 block">
                  Sub-Category:
                </label>
                <select
                  value={classificationForm.subCategory}
                  onChange={(e) => setClassificationForm({ ...classificationForm, subCategory: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {classificationForm.category.includes('Category A') ? (
                    <>
                      <option value="IIT">IIT (Indian Institute of Technology)</option>
                      <option value="NIT">NIT (National Institute of Technology)</option>
                      <option value="IIIT">IIIT (Indian Institute of Information Technology)</option>
                      <option value="Other Premium Public">Other Premium Public Central / State Institution</option>
                    </>
                  ) : (
                    <>
                      <option value="Private University">Private University (State / UGC)</option>
                      <option value="Private Engineering College">Private Engineering College (Affiliated)</option>
                      <option value="Deemed University">Deemed-to-be University (Private Sector)</option>
                      <option value="Other Private">Other Private Institution</option>
                    </>
                  )}
                </select>
              </div>

              {/* Policy explanation card */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="font-semibold text-slate-700 block">Active Historical Placement Policy:</span>
                {classificationForm.category.includes('Category A') ? (
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    🏛️ <strong>Category A Policy:</strong> Displays historical placement records from 2018–19 through current session from credible official filings and NIRF reports. Partial historical data allowed. Missing metrics explicitly marked <em>"Not reported"</em> rather than guessed.
                  </p>
                ) : (
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    🛡️ <strong>Category B Policy:</strong> Strict session-wise evidence required. Marketing claims not accepted as outcomes. Tit-for-tat like-for-like comparison enforced. Outlier peak package vs median comparisons strictly prohibited. Unverified sessions marked <em>"Verified data not available for this session"</em>.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 block">
                  Moderator Classification Notes:
                </label>
                <textarea
                  rows={2}
                  value={classificationForm.classificationNotes}
                  onChange={(e) => setClassificationForm({ ...classificationForm, classificationNotes: e.target.value })}
                  placeholder="e.g., Classified based on Institute of National Importance statutory charter."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setClassifyModalCollege(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={classifying}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{classifying ? 'Saving...' : 'Save Classification'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL IMPORT VERIFICATION MODAL */}
      {verifyImportModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-navy-950 font-bold text-base">
                <FileCheck2 className="w-5 h-5 text-brand-primary shrink-0" />
                <span>Verify Official Placement Record</span>
              </div>
              <button
                type="button"
                onClick={() => setVerifyImportModalRecord(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">{verifyImportModalRecord.collegeId?.name || 'College'}</div>
              <div className="text-slate-600">Reporting Session: <strong>{verifyImportModalRecord.reportingYear || 'N/A'}</strong></div>
              <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-700">
                <span>Placed: <strong>{verifyImportModalRecord.uniqueStudentsPlaced || 0}</strong></span>
                <span>Offers: <strong>{verifyImportModalRecord.totalJobOffers || 0}</strong></span>
                <span>Median: <strong>{verifyImportModalRecord.medianPackageLPA ? `${verifyImportModalRecord.medianPackageLPA} LPA` : 'N/A'}</strong></span>
                <span>Max: <strong>{verifyImportModalRecord.highestPackageLPA ? `${verifyImportModalRecord.highestPackageLPA} LPA` : 'N/A'}</strong></span>
              </div>
            </div>

            <form onSubmit={handleConfirmVerifyImport} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 block">
                  Moderator Decision:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifyImportForm({ ...verifyImportForm, approvalStatus: 'Verified', verificationLevel: 'Officially reported' })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                      verifyImportForm.approvalStatus === 'Verified'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    ✓ Approve & Verify
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerifyImportForm({ ...verifyImportForm, approvalStatus: 'Rejected', verificationLevel: 'Unverified' })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                      verifyImportForm.approvalStatus === 'Rejected'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    ✕ Reject Record
                  </button>
                </div>
              </div>

              {verifyImportForm.approvalStatus === 'Verified' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 block">
                      Verification Level (Standardized Classification):
                    </label>
                    <select
                      value={verifyImportForm.verificationLevel}
                      onChange={(e) => setVerifyImportForm({ ...verifyImportForm, verificationLevel: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                    >
                      <option value="Officially reported">Officially reported (Official brochure, website, or statutory NIRF report)</option>
                      <option value="Independently verified">Independently verified (Backed by direct student proofs / pay slips)</option>
                      <option value="Partially verified">Partially verified (Some metrics validated, others pending proof)</option>
                      <option value="Unverified">Unverified (Self-claimed or marketing pamphlet)</option>
                    </select>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                    ⚠️ <strong>Policy Notice:</strong> Official college reports and brochures must never be labeled as <em>"Independently verified"</em>. They must be categorized as <em>"Officially reported"</em> to preserve transparency.
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 block">
                      Verification Notes:
                    </label>
                    <textarea
                      rows={2}
                      value={verifyImportForm.notes}
                      onChange={(e) => setVerifyImportForm({ ...verifyImportForm, notes: e.target.value })}
                      placeholder="e.g., Validated against officially signed NIRF 2024 institutional disclosure."
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 block">
                    Rejection Reason (Mandatory for Audit Trail):
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={verifyImportForm.rejectionReason}
                    onChange={(e) => setVerifyImportForm({ ...verifyImportForm, rejectionReason: e.target.value })}
                    placeholder="e.g., Source URL points to unverified promotional banner without official placement officer endorsement."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVerifyImportModalRecord(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyingImport || (verifyImportForm.approvalStatus === 'Rejected' && !verifyImportForm.rejectionReason.trim())}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow-xs ${
                    verifyImportForm.approvalStatus === 'Verified'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{verifyingImport ? 'Updating...' : `Confirm ${verifyImportForm.approvalStatus}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
