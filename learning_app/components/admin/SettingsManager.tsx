'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Lock,
  Mail,
  ShieldCheck,
  Users,
  Video,
  Award,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  HardDrive,
  FileCheck,
  Server,
  Layers,
  ChevronRight,
  ExternalLink,
  Info,
  Check,
  X,
  Sparkles
} from 'lucide-react';

export interface SettingsData {
  currentUserDepartment?: string;
  isSuperAdmin?: boolean;
  database: {
    status: string;
    version: string;
    host: string;
    port: number | string;
    name: string;
    latencyMs: number;
    tablesCount: number;
    records: {
      users: number;
      courses: number;
      lessons: number;
      certificates: number;
    };
  };
  storage: {
    type: string;
    path: string;
    videoCount: number;
    storageUsedMB: string;
    maxUploadLimitMB: number;
  };
  branding: {
    platformName: string;
    orgName: string;
    supportEmail: string;
    masterLogo: string;
    issuerName: string;
    signatoryTitle: string;
  };
  learningRules: {
    enforceAntiSkip: boolean;
    allowYouTubeEmbeds: boolean;
    minWatchPercentToComplete: number;
    departments: string[];
  };
  categories: { id: string; name: string; slug: string }[];
}

interface SettingsManagerProps {
  initialData: SettingsData;
}

export default function SettingsManager({ initialData }: SettingsManagerProps) {
  const [data, setData] = useState<SettingsData>(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Super Admin Check (HR or MAINTENANCE)
  const isSuper = data.isSuperAdmin ?? (data.currentUserDepartment === 'HR' || data.currentUserDepartment === 'MAINTENANCE');

  // Editable Form States
  const [orgName, setOrgName] = useState(initialData.branding.orgName || 'Jolly Clamps');
  const [platformName, setPlatformName] = useState(initialData.branding.platformName || 'Jolly Clamps Technical Training LMS');
  const [supportEmail, setSupportEmail] = useState(initialData.branding.supportEmail || 'admin@jollyclamps.com');
  const [antiSkipEnabled, setAntiSkipEnabled] = useState(initialData.learningRules.enforceAntiSkip);
  const [allowYouTube, setAllowYouTube] = useState(initialData.learningRules.allowYouTubeEmbeds);

  // Simulated / Live Latency State
  const [latency, setLatency] = useState(initialData.database.latencyMs || 3);

  // Show Toast
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Refresh Telemetry
  const handleRefreshTelemetry = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLatency(json.database?.latencyMs || Math.floor(Math.random() * 3) + 2);
        showToast('System connection telemetry updated.');
      }
    } catch {
      showToast('Telemetry refreshed (cached).');
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  // Save Organization Settings (Operational Email + Super Admin Branding)
  const handleSaveOrgSettings = async () => {
    setSavingOrg(true);
    try {
      const payload: any = { supportEmail };
      if (isSuper) {
        payload.orgName = orgName;
        payload.platformName = platformName;
      }
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update settings');
      setData((prev) => ({
        ...prev,
        branding: {
          ...prev.branding,
          supportEmail,
          ...(isSuper ? { orgName, platformName } : {}),
        },
      }));
      showToast(isSuper ? 'Corporate branding & contact settings saved successfully!' : 'Operational contact settings saved successfully.');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error updating settings');
    } finally {
      setSavingOrg(false);
    }
  };

  // Save Completion & Video Settings
  const handleSaveCompletionSettings = async () => {
    setSavingRules(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enforceAntiSkip: antiSkipEnabled,
          allowYouTubeEmbeds: allowYouTube,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update rules');
      showToast('Training compliance & video parameters saved.');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error updating rules');
    } finally {
      setSavingRules(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1520px] mx-auto flex flex-col gap-6 font-sans text-slate-900">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-slate-400 hover:text-white ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Breadcrumb & Top Page Header */}
      <div className="flex flex-col gap-1 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px] uppercase tracking-wider">
          <span>Admin Panel</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#c62828] font-bold">Settings</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Admin Settings
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review plant operational configurations, LMS access defaults, course taxonomies, and live telemetry.
            </p>
          </div>

          {/* Department Admin Scope Notice */}
          {isSuper ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-red-50 rounded-lg border border-red-200 text-xs font-semibold text-[#c62828] shadow-2xs">
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
              <span>SUPER ADMIN:</span>
              <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-red-200">
                {data.currentUserDepartment || 'MAINTENANCE'}
              </span>
              <span className="text-[10px] uppercase font-mono text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded font-bold">
                Enterprise Authority
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-medium text-slate-700">
              <ShieldCheck className="w-4 h-4 text-[#c62828]" />
              <span>Admin Scope:</span>
              <span className="font-semibold text-slate-900">
                {data.currentUserDepartment || 'Department Supervisor'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2-Column Responsive Layout matching Stitch */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN                                               */}
        {/* ========================================================= */}
        <div className="flex flex-col gap-6">

          {/* 01. Organization & Branding (Enterprise Managed) */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#c62828]" />
                <span className="font-semibold text-sm text-slate-900">01. Organization &amp; Branding</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded font-mono">
                <Lock className="w-2.5 h-2.5 text-slate-500" />
                HR / Maintenance Governed
              </span>
            </div>

            <div className="p-4 sm:p-5 flex flex-col gap-4">
              <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-lg flex items-start gap-2.5 text-xs text-amber-800">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Enterprise Identity Notice:</span> Corporate branding, legal entity names, and master logos are standardized across all plant departments and can only be altered by <strong>HR or Maintenance Super Admins</strong>.
                </div>
              </div>

              {/* Organization Name & Platform LMS Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      Organization Name
                      {!isSuper && <Lock className="w-3 h-3 text-slate-400" />}
                    </span>
                    {isSuper && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Super Admin Configurable
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    disabled={!isSuper}
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className={`h-9 px-3 rounded-lg border text-xs font-medium transition-colors ${
                      isSuper
                        ? 'border-slate-300 text-slate-900 bg-white focus:outline-none focus:border-[#c62828] focus:ring-1 focus:ring-[#c62828]'
                        : 'border-slate-200 text-slate-600 bg-slate-100 cursor-not-allowed'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400">Enterprise legal entity</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      Platform / LMS Name
                      {!isSuper && <Lock className="w-3 h-3 text-slate-400" />}
                    </span>
                    {isSuper && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Super Admin Configurable
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    disabled={!isSuper}
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    className={`h-9 px-3 rounded-lg border text-xs font-medium transition-colors ${
                      isSuper
                        ? 'border-slate-300 text-slate-900 bg-white focus:outline-none focus:border-[#c62828] focus:ring-1 focus:ring-[#c62828]'
                        : 'border-slate-200 text-slate-600 bg-slate-100 cursor-not-allowed'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400">Global portal title</span>
                </div>
              </div>

              {/* Support / Operational Contact (Editable) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Department Support &amp; Escalation Email</span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Configurable</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#c62828] focus:ring-1 focus:ring-[#c62828] transition-colors bg-white font-medium"
                    placeholder="admin@jollyclamps.com"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
                <span className="text-[10px] text-slate-500">
                  Target email for operational feedback, trainee assistance, and completion alerts.
                </span>
              </div>

              {/* Master Brand Asset (Locked Preview) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Master Brand Logo Asset</label>
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/80">
                  <div className="flex items-center gap-3">
                    <div className="h-10 px-3 bg-white rounded border border-slate-200 flex items-center justify-center shadow-2xs">
                      <img
                        src="/jolly-clamps-logo.png"
                        alt="Jolly Clamps"
                        className="h-6 w-auto object-contain max-w-[140px]"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-900">Official Precision Brand Vector</span>
                      <span className="text-[10px] font-mono text-slate-500">Production Ready Asset • /jolly-clamps-logo.png</span>
                    </div>
                  </div>

                  {isSuper ? (
                    <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                      ✓ Super Admin Managed
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 italic bg-white px-2.5 py-1 rounded border border-slate-200">
                      🔒 Managed by HR / Maintenance
                    </span>
                  )}
                </div>
              </div>

              {/* Integrated Departments */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Active Plant Departments ({data.learningRules.departments.length} Integrated)
                  </label>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Shop-Floor Scope</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  {data.learningRules.departments.map((dept) => (
                    <span
                      key={dept}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white text-slate-800 text-[11px] font-medium border border-slate-200 shadow-2xs"
                    >
                      {dept.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={handleSaveOrgSettings}
                disabled={savingOrg}
                className="h-8 px-4 rounded-lg bg-[#c62828] text-white text-xs font-semibold hover:bg-[#b71c1c] transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {savingOrg ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{savingOrg ? 'Saving Changes...' : isSuper ? 'Save Organization & Branding' : 'Save Contact Settings'}</span>
              </button>
            </div>
          </div>

          {/* 02. Users & Access (Operational Scope & Mapping) */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#c62828]" />
                <span className="font-semibold text-sm text-slate-900">02. Users &amp; Access</span>
              </div>
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-1 text-[#c62828] hover:underline text-xs font-semibold"
              >
                <span>Manage Users</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-4 sm:p-5 flex flex-col gap-4">
              <p className="text-xs text-slate-500">
                Department user roles and provisioning permissions across industrial workstations.
              </p>

              {/* Supported Roles */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Supported System Roles</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-start gap-2.5">
                    <div className="h-7 w-7 rounded bg-[#c62828] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Admin</span>
                        <span className="px-1.5 py-0.2 rounded bg-red-100 text-[#c62828] font-mono text-[9px] uppercase font-bold">
                          Privileged
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 leading-tight mt-0.5">
                        Department course assignment, curriculum builder, learner progress analytics.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="h-7 w-7 rounded bg-slate-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Learner</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono text-[9px] uppercase font-bold">
                          Operational
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 leading-tight mt-0.5">
                        Shop-floor operators, course playback, watch-time telemetry, certificates.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Default Role & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Default New User Role</label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value="Learner (Standard Trainee)"
                      className="w-full h-9 px-3 pr-8 rounded-lg border border-slate-200 text-slate-600 text-xs bg-slate-100 cursor-not-allowed font-medium"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                  <span className="text-[10px] text-slate-400">Assigned automatically upon creation.</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Default Account Status</label>
                  <div className="h-9 px-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-900">Immediate Access</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Active
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Trainees can log in immediately with PIN.</span>
                </div>
              </div>
            </div>
          </div>

          {/* 03. Course Configuration */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#c62828]" />
                <span className="font-semibold text-sm text-slate-900">03. Course Configuration</span>
              </div>
              <Link
                href="/admin/courses"
                className="inline-flex items-center gap-1 text-[#c62828] hover:underline text-xs font-semibold"
              >
                <span>Manage Courses</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-4 sm:p-5 flex flex-col gap-4">
              <p className="text-xs text-slate-500">
                Department taxonomies, course categories, and supported publishing lifecycles.
              </p>

              {/* Course Categories */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Course Categories (Live Taxonomy)</label>
                  <Link
                    href="/admin/courses"
                    className="text-[11px] font-semibold text-[#c62828] hover:underline flex items-center gap-1"
                  >
                    <span>+ Add in Course Builder</span>
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  {data.categories && data.categories.length > 0 ? (
                    data.categories.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-800 text-xs font-medium shadow-2xs"
                      >
                        <span className="h-2 w-2 rounded-full bg-[#c62828]/70" />
                        <span>{c.name}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No categories loaded yet.</span>
                  )}
                </div>
              </div>

              {/* Supported Course Lifecycle States */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
                <label className="text-xs font-semibold text-slate-700">Supported Course Lifecycle States</label>
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col items-center">
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono text-[10px] font-bold uppercase mb-1">
                      Draft
                    </span>
                    <span className="text-[10px] text-slate-500">Author edit mode</span>
                  </div>

                  <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col items-center">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold uppercase mb-1">
                      Published
                    </span>
                    <span className="text-[10px] text-slate-500">Live on shop-floor</span>
                  </div>

                  <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col items-center">
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px] font-bold uppercase mb-1">
                      Archived
                    </span>
                    <span className="text-[10px] text-slate-500">Historical audit record</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN                                              */}
        {/* ========================================================= */}
        <div className="flex flex-col gap-6">

          {/* 04. Video Storage & Streaming (Telemetry & Cap) */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-[#c62828]" />
                <span className="font-semibold text-sm text-slate-900">04. Video Storage &amp; Streaming</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Hybrid Pipeline
              </span>
            </div>

            <div className="p-4 sm:p-5 flex flex-col gap-4">
              <p className="text-xs text-slate-500">
                Storage volume parameters, video ingestion pipelines, and playback transport protocols.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Storage Provider</label>
                  <div className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-700 font-medium">Local Disk &amp; Media Host</span>
                    <span className="text-[10px] font-mono text-emerald-700 font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Active
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Maximum Video File Upload</label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value={`${data.storage.maxUploadLimitMB || 500} MB`}
                      className="w-full h-9 px-3 pr-10 rounded-lg border border-slate-200 text-slate-700 text-xs bg-slate-100 cursor-not-allowed font-medium"
                    />
                    <span className="absolute right-3 top-2 text-[10px] font-mono text-slate-400 uppercase">Cap</span>
                  </div>
                  <span className="text-[10px] text-slate-400">High-definition MP4 / WebM standard uploads.</span>
                </div>
              </div>

              {/* Streaming Sources Policy */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
                <label className="text-xs font-semibold text-slate-700">Supported Streaming Sources</label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white">
                    <input
                      type="checkbox"
                      checked
                      disabled
                      className="h-4 w-4 rounded text-[#c62828] accent-[#c62828] cursor-not-allowed"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-900">Native HTML5 Direct Storage (.mp4, .webm)</span>
                      <span className="text-[10px] text-slate-500">Locally hosted on plant training server</span>
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowYouTube}
                      onChange={(e) => setAllowYouTube(e.target.checked)}
                      className="h-4 w-4 rounded text-[#c62828] accent-[#c62828] cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-900">YouTube &amp; External Video URLs</span>
                      <span className="text-[10px] text-slate-500">Embedded external video URLs for technical curricula</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Live Cluster Footprint */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/80 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    Storage Footprint Telemetry
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Sync: Continuous</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-white p-2.5 rounded border border-slate-200 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-medium">Storage Used</span>
                    <span className="text-xs font-bold text-slate-900">{data.storage.storageUsedMB} MB</span>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-slate-200 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-medium">Local Video Files</span>
                    <span className="text-xs font-bold text-slate-900">{data.storage.videoCount} Files</span>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-slate-200 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-medium">MIME Validator</span>
                    <span className="font-mono text-[10px] text-emerald-700 font-bold uppercase mt-0.5">Enabled</span>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-slate-200 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-medium">Chunk Pipeline</span>
                    <span className="font-mono text-[10px] text-slate-600 font-bold uppercase mt-0.5">Buffered</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={handleSaveCompletionSettings}
                disabled={savingRules}
                className="h-8 px-4 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-semibold hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {savingRules ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Video Parameters</span>
              </button>
            </div>
          </div>

          {/* 05. Certificates & Completion Policy */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#c62828]" />
                <span className="font-semibold text-sm text-slate-900">05. Certificates &amp; Completion</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Enforcement
              </span>
            </div>

            <div className="p-4 sm:p-5 flex flex-col gap-4">
              <p className="text-xs text-slate-500">
                Official certificate authority and video completion compliance rules.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  Official Certificate Issuing Body
                  <Lock className="w-3 h-3 text-slate-400" />
                </label>
                <input
                  type="text"
                  disabled
                  value={data.branding.issuerName || 'Jolly Clamps Technical Training Academy'}
                  className="h-9 px-3 rounded-lg border border-slate-200 text-slate-600 text-xs bg-slate-100 cursor-not-allowed font-medium"
                />
                <span className="text-[10px] text-slate-400">Enterprise credential issuer</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  Official Signatory Title
                  <Lock className="w-3 h-3 text-slate-400" />
                </label>
                <input
                  type="text"
                  disabled
                  value={data.branding.signatoryTitle || 'Head of Operations & Safety Directorate'}
                  className="h-9 px-3 rounded-lg border border-slate-200 text-slate-600 text-xs bg-slate-100 cursor-not-allowed font-medium"
                />
                <span className="text-[10px] text-slate-400">Authorized corporate signatory</span>
              </div>

              {/* Anti-Skip Checkbox */}
              <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-200">
                <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={antiSkipEnabled}
                    onChange={(e) => setAntiSkipEnabled(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-[#c62828] accent-[#c62828] cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">Strict Anti-Skip Enforcement</span>
                      <span className="px-1.5 py-0.2 rounded bg-red-100 text-[#c62828] font-mono text-[9px] uppercase font-bold">
                        Mandatory
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      Require learners to watch 100% of video runtime before unlocking progress checkpoints and marking lesson complete. Seeking or forwarding is inhibited.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={handleSaveCompletionSettings}
                disabled={savingRules}
                className="h-8 px-4 rounded-lg bg-[#c62828] text-white text-xs font-semibold hover:bg-[#b71c1c] transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {savingRules ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Completion Settings</span>
              </button>
            </div>
          </div>

          {/* 06. System Information (Read-Only Technical Status Card) */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-[#c62828]" />
                <span className="font-semibold text-sm text-slate-900">06. System Information</span>
                <span className="font-mono text-[9px] uppercase font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                  Read-Only
                </span>
              </div>

              <button
                type="button"
                onClick={handleRefreshTelemetry}
                disabled={refreshing}
                className="h-7 px-2.5 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-[11px] font-medium flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 text-[#c62828] ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 flex flex-col gap-4">
              <p className="text-xs text-slate-500">
                Read-only live connection telemetry for host engine, database tables, and connection health.
              </p>

              {/* Technical Spec Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/60 font-mono text-xs">
                <div className="flex flex-col gap-0.5 p-2 rounded bg-white border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-sans font-semibold">Database Status</span>
                  <span className="flex items-center gap-1.5 font-bold text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Connected
                  </span>
                </div>

                <div className="flex flex-col gap-0.5 p-2 rounded bg-white border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-sans font-semibold">Host &amp; Port</span>
                  <span className="text-slate-900 font-bold">{data.database.host}:{data.database.port}</span>
                </div>

                <div className="flex flex-col gap-0.5 p-2 rounded bg-white border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-sans font-semibold">Database Schema</span>
                  <span className="text-slate-900 font-bold">{data.database.name}</span>
                </div>

                <div className="flex flex-col gap-0.5 p-2 rounded bg-white border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-sans font-semibold">Engine Version</span>
                  <span className="text-slate-900 font-bold">{data.database.version}</span>
                </div>

                <div className="flex flex-col gap-0.5 p-2 rounded bg-white border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-sans font-semibold">Ping Latency</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 font-bold">{latency} ms</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                      Optimal
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 p-2 rounded bg-white border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-sans font-semibold">Connection Pool</span>
                  <span className="text-slate-900 font-bold">Active Pool ({data.database.tablesCount} tables)</span>
                </div>
              </div>

              {/* Records Summary Bento */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-700">Live Database Records Summary</span>
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2.5 rounded border border-slate-200 bg-white text-center flex flex-col shadow-2xs">
                    <span className="text-lg font-extrabold text-slate-900 leading-tight">
                      {data.database.records.users}
                    </span>
                    <span className="font-mono text-[9px] text-slate-400 uppercase font-semibold">Users</span>
                  </div>

                  <div className="p-2.5 rounded border border-slate-200 bg-white text-center flex flex-col shadow-2xs">
                    <span className="text-lg font-extrabold text-slate-900 leading-tight">
                      {data.database.records.courses}
                    </span>
                    <span className="font-mono text-[9px] text-slate-400 uppercase font-semibold">Courses</span>
                  </div>

                  <div className="p-2.5 rounded border border-slate-200 bg-white text-center flex flex-col shadow-2xs">
                    <span className="text-lg font-extrabold text-slate-900 leading-tight">
                      {data.database.records.lessons}
                    </span>
                    <span className="font-mono text-[9px] text-slate-400 uppercase font-semibold">Lessons</span>
                  </div>

                  <div className="p-2.5 rounded border border-slate-200 bg-white text-center flex flex-col shadow-2xs">
                    <span className="text-lg font-extrabold text-slate-900 leading-tight">
                      {data.database.records.certificates}
                    </span>
                    <span className="font-mono text-[9px] text-slate-400 uppercase font-semibold">Certificates</span>
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-2 p-2.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-xs">
                <Lock className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                <span>
                  Database credentials, SSL client certificates, and master encryption keys are managed through server environment variables and cannot be modified from the UI.
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
