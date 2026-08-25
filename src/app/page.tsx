import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileClock,
  FileText,
  Filter,
  GraduationCap,
  LayoutDashboard,
  LockKeyhole,
  Search,
  ShieldCheck,
  Upload,
  UsersRound,
} from "lucide-react";
import { activityItems, dashboardMetrics, employeeRows, today } from "@/lib/demo-data";
import type { ComplianceStatus } from "@/lib/compliance";

const statusStyles: Record<ComplianceStatus, string> = {
  COMPLIANT: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  ATTENTION: "bg-amber-50 text-amber-800 ring-amber-200",
  AT_RISK: "bg-orange-50 text-orange-800 ring-orange-200",
  OVERDUE: "bg-red-50 text-red-800 ring-red-200",
  NON_COMPLIANT: "bg-red-50 text-red-800 ring-red-200",
  UNKNOWN: "bg-stone-100 text-stone-700 ring-stone-200",
};

const metricCards = [
  {
    label: "Employees",
    value: dashboardMetrics.employees,
    icon: UsersRound,
    detail: "Across 2 active locations",
  },
  {
    label: "Fully Compliant",
    value: dashboardMetrics.compliant,
    icon: CheckCircle2,
    detail: "No immediate action needed",
  },
  {
    label: "Attention Required",
    value: dashboardMetrics.attention,
    icon: AlertTriangle,
    detail: "Due dates or deficiencies",
  },
  {
    label: "Missing Data",
    value: dashboardMetrics.missingData,
    icon: FileClock,
    detail: "Cannot determine status",
  },
];

const operationalMetrics = [
  ["Training Due <= 30 Days", dashboardMetrics.trainingDueSoon],
  ["CPR Expiring <= 60 Days", dashboardMetrics.cprExpiring],
  ["CPR Expired", dashboardMetrics.cprExpired],
  ["Training Hours Deficient", dashboardMetrics.deficient],
  ["Pending Approvals", dashboardMetrics.pendingApprovals],
];

const roadmap = [
  ["Foundation", "Organizations, locations, RBAC, audit trail, Railway Postgres"],
  ["Employee Management", "Employee profiles, roles, status, location ownership"],
  ["Training System", "Catalog, approvals, bulk entry, employee submission"],
  ["Compliance Engine", "Rule sets, cycle handling, risk status, test coverage"],
  ["Migration", "Workbook staging, validation warnings, commit audit report"],
];

function formatDate(date?: Date) {
  if (!date) {
    return "Missing";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function Home() {
  const priorityEmployee = employeeRows[0];

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#18211d]">
      <aside className="fixed inset-y-0 left-0 hidden w-20 flex-col items-center border-r border-[#d9dfd1] bg-[#fffdf7] py-5 lg:flex">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#224433] text-white">
          <ShieldCheck className="h-6 w-6" aria-hidden />
        </div>
        <nav className="mt-10 flex flex-1 flex-col gap-3">
          {[LayoutDashboard, UsersRound, GraduationCap, FileText, Bell, LockKeyhole].map(
            (Icon, index) => (
              <button
                className={`flex h-11 w-11 items-center justify-center rounded-lg border text-[#405048] transition hover:border-[#8aa27b] hover:bg-[#edf2e8] ${
                  index === 0
                    ? "border-[#8aa27b] bg-[#edf2e8]"
                    : "border-transparent bg-transparent"
                }`}
                key={Icon.displayName ?? index}
                title={
                  ["Dashboard", "Employees", "Training", "Documents", "Alerts", "Audit"][
                    index
                  ]
                }
                type="button"
              >
                <Icon className="h-5 w-5" aria-hidden />
              </button>
            ),
          )}
        </nav>
      </aside>

      <div className="lg:pl-20">
        <header className="sticky top-0 z-20 border-b border-[#d9dfd1] bg-[#fffdf7]/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-[#6b735f]">Ghost AI Solutions</p>
                <h1 className="text-2xl font-semibold text-[#18211d] sm:text-3xl">
                  Childcare Compliance Portal
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd5c0] bg-white px-3 text-sm font-medium text-[#2f3a34] shadow-sm transition hover:bg-[#f3f6ef]"
                  type="button"
                >
                  <Search className="h-4 w-4" aria-hidden />
                  Search
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd5c0] bg-white px-3 text-sm font-medium text-[#2f3a34] shadow-sm transition hover:bg-[#f3f6ef]"
                  type="button"
                >
                  <Upload className="h-4 w-4" aria-hidden />
                  Import
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#224433] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a3528]"
                  type="button"
                >
                  <GraduationCap className="h-4 w-4" aria-hidden />
                  Add Training
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {["Tyler Center", "Longview Center", "All Roles", "Due <= 60 Days"].map(
                (filter) => (
                  <button
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d9dfd1] bg-white px-3 text-[#4d5b52] transition hover:bg-[#edf2e8]"
                    key={filter}
                    type="button"
                  >
                    <Filter className="h-3.5 w-3.5" aria-hidden />
                    {filter}
                  </button>
                ),
              )}
            </div>
          </div>
        </header>

        <section className="border-b border-[#d9dfd1] bg-[#edf2e8]">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.3fr_0.7fr] lg:px-8">
            <div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metricCards.map(({ label, value, icon: Icon, detail }) => (
                  <article
                    className="rounded-lg border border-[#d3ddca] bg-white p-4 shadow-sm"
                    key={label}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-[#657064]">{label}</p>
                      <Icon className="h-5 w-5 text-[#6f8b5f]" aria-hidden />
                    </div>
                    <p className="mt-4 text-3xl font-semibold text-[#18211d]">{value}</p>
                    <p className="mt-2 text-sm text-[#6b735f]">{detail}</p>
                  </article>
                ))}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-5">
                {operationalMetrics.map(([label, value]) => (
                  <div
                    className="rounded-lg border border-[#d3ddca] bg-[#fffdf7] p-3"
                    key={label}
                  >
                    <p className="text-2xl font-semibold text-[#293d32]">{value}</p>
                    <p className="mt-1 text-sm text-[#66705f]">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <article className="rounded-lg border border-[#d3ddca] bg-[#fffdf7] p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#6b735f]">Priority Employee</p>
                  <h2 className="mt-1 text-xl font-semibold">{priorityEmployee.name}</h2>
                  <p className="mt-1 text-sm text-[#66705f]">
                    {priorityEmployee.role} at {priorityEmployee.location}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                    statusStyles[priorityEmployee.compliance.status]
                  }`}
                >
                  {priorityEmployee.compliance.status.replace("_", " ")}
                </span>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#f4efe1] p-3">
                  <dt className="text-sm text-[#74694f]">Annual Training</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {priorityEmployee.completedHours} / {priorityEmployee.requiredHours}
                  </dd>
                </div>
                <div className="rounded-lg bg-[#eaf3f1] p-3">
                  <dt className="text-sm text-[#52716b]">Instructor Led</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {priorityEmployee.completedInstructorLedHours} /{" "}
                    {priorityEmployee.requiredInstructorLedHours}
                  </dd>
                </div>
                <div className="rounded-lg bg-[#f6e8e3] p-3">
                  <dt className="text-sm text-[#855c50]">CPR</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {priorityEmployee.compliance.certifications.cpr}
                  </dd>
                </div>
                <div className="rounded-lg bg-[#eef0e8] p-3">
                  <dt className="text-sm text-[#69705b]">Deadline</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {formatDate(priorityEmployee.annualDueDate)}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 space-y-2">
                {priorityEmployee.compliance.reasons.slice(0, 3).map((reason) => (
                  <p className="flex gap-2 text-sm text-[#4e5d54]" key={reason}>
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#bc5f2f]"
                      aria-hidden
                    />
                    {reason}
                  </p>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_340px] lg:px-8">
          <div className="overflow-hidden rounded-lg border border-[#d9dfd1] bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#e5e9df] px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Compliance Risk List</h2>
                <p className="text-sm text-[#66705f]">
                  Calculated from approved training, certifications, and rule requirements.
                </p>
              </div>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cbd5c0] bg-white px-3 text-sm font-medium text-[#2f3a34] transition hover:bg-[#f3f6ef]"
                type="button"
              >
                <FileText className="h-4 w-4" aria-hidden />
                Export
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#f7f8f5] text-xs uppercase text-[#677363]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Employee</th>
                    <th className="px-4 py-3 font-semibold">Location</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Training</th>
                    <th className="px-4 py-3 font-semibold">CPR</th>
                    <th className="px-4 py-3 font-semibold">Deadline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf0e8]">
                  {employeeRows.map((employee) => (
                    <tr className="hover:bg-[#fafbf7]" key={employee.id}>
                      <td className="px-4 py-4">
                        <p className="font-medium text-[#18211d]">{employee.name}</p>
                        <p className="text-[#6b735f]">{employee.role}</p>
                      </td>
                      <td className="px-4 py-4 text-[#425148]">{employee.location}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                            statusStyles[employee.compliance.status]
                          }`}
                        >
                          {employee.compliance.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {employee.completedHours} / {employee.requiredHours}
                        <span className="ml-2 text-[#77816f]">
                          {employee.compliance.annualTraining.remaining} remaining
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {employee.compliance.certifications.cpr}
                      </td>
                      <td className="px-4 py-4">{formatDate(employee.annualDueDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <article className="rounded-lg border border-[#d9dfd1] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eaf3f1] text-[#37665f]">
                  <ClipboardCheck className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h2 className="font-semibold">Employee Home Preview</h2>
                  <p className="text-sm text-[#66705f]">Self-service compliance snapshot</p>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Annual Training</span>
                    <span>18 / 24 hours</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[#e3e7dc]">
                    <div className="h-2 w-3/4 rounded-full bg-[#6f8b5f]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Instructor Led</span>
                    <span>3 / 5 hours</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[#e3e7dc]">
                    <div className="h-2 w-3/5 rounded-full bg-[#478477]" />
                  </div>
                </div>
                <button
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#224433] px-3 text-sm font-semibold text-white transition hover:bg-[#1a3528]"
                  type="button"
                >
                  <Upload className="h-4 w-4" aria-hidden />
                  Upload Training
                </button>
              </div>
            </article>

            <article className="rounded-lg border border-[#d9dfd1] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4efe1] text-[#715f37]">
                  <CalendarClock className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h2 className="font-semibold">Build Milestones</h2>
                  <p className="text-sm text-[#66705f]">
                    Starting from {formatDate(today)}
                  </p>
                </div>
              </div>
              <ol className="mt-5 space-y-3">
                {roadmap.map(([title, detail], index) => (
                  <li className="flex gap-3" key={title}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#edf2e8] text-sm font-semibold text-[#405d31]">
                      {index + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{title}</span>
                      <span className="block text-sm text-[#66705f]">{detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </article>

            <article className="rounded-lg border border-[#d9dfd1] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f6e8e3] text-[#8a5141]">
                  <Building2 className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h2 className="font-semibold">Audit Activity</h2>
                  <p className="text-sm text-[#66705f]">Immutable operational history</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {activityItems.map((item) => (
                  <p
                    className="border-l-2 border-[#cbd5c0] pl-3 text-sm text-[#4e5d54]"
                    key={item}
                  >
                    {item}
                  </p>
                ))}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
