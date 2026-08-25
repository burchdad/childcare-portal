"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileClock,
  FileText,
  Filter,
  GraduationCap,
  LayoutDashboard,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UsersRound,
  X,
} from "lucide-react";
import { evaluateEmployeeCompliance, type ComplianceStatus } from "@/lib/compliance";
import {
  activityItems,
  employees as initialEmployees,
  today,
  type DemoEmployee,
} from "@/lib/demo-data";

type ModalName = "employee" | "training" | "upload" | "import" | null;
type SectionName = "Dashboard" | "Employees" | "Training" | "Documents" | "Alerts" | "Audit";
type ActivityItem = (typeof activityItems)[number];
type EmployeeRow = DemoEmployee & {
  compliance: ReturnType<typeof evaluateEmployeeCompliance>;
};

const statusStyles: Record<ComplianceStatus, string> = {
  COMPLIANT: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  ATTENTION: "bg-amber-50 text-amber-800 ring-amber-200",
  AT_RISK: "bg-orange-50 text-orange-800 ring-orange-200",
  OVERDUE: "bg-red-50 text-red-800 ring-red-200",
  NON_COMPLIANT: "bg-red-50 text-red-800 ring-red-200",
  UNKNOWN: "bg-stone-100 text-stone-700 ring-stone-200",
};

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Employees", icon: UsersRound },
  { label: "Training", icon: GraduationCap },
  { label: "Documents", icon: FileText },
  { label: "Alerts", icon: Bell },
  { label: "Audit", icon: LockKeyhole },
] as const;

const locations = ["Kilgore, Texas"];
const roles = ["Caregiver", "Assistant Director", "Director", "Cook", "Substitute"];
const fieldClass = "h-10 rounded-lg border border-[#d9dfd1] px-3 font-normal outline-none";

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

function buildRows(employees: DemoEmployee[]): EmployeeRow[] {
  return employees.map((employee) => ({
    ...employee,
    compliance: evaluateEmployeeCompliance({ ...employee, today }),
  }));
}

function escapeCsv(value: string | number) {
  const text = String(value);
  return text.includes(",") || text.includes('"') || text.includes("\n")
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

function createCsv(rows: EmployeeRow[]) {
  const headers = ["Employee", "Location", "Role", "Status", "Training", "CPR", "Deadline"];
  const body = rows.map((employee) => [
    employee.name,
    employee.location,
    employee.role,
    employee.compliance.status,
    `${employee.completedHours}/${employee.requiredHours}`,
    employee.compliance.certifications.cpr,
    formatDate(employee.annualDueDate),
  ]);

  return [headers, ...body].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function createAuditCsv(activities: ActivityItem[]) {
  const headers = ["ID", "Message"];
  const body = activities.map((activity) => [activity.id, activity.message]);

  return [headers, ...body].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function createEmployeeImportTemplate() {
  const headers = [
    "name",
    "location",
    "role",
    "completedHours",
    "requiredHours",
    "completedIpHours",
    "requiredIpHours",
    "annualDueDate",
    "cprExpirationDate",
    "firstAidExpirationDate",
  ];
  const example = [
    "Jordan Lee",
    "Kilgore, Texas",
    "Caregiver",
    6,
    24,
    2,
    5,
    "2026-12-31",
    "2027-04-01",
    "2027-04-01",
  ];

  return [headers, example].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      row.push(value.trim());
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
}

function parseDateCell(value: string) {
  return value ? new Date(`${value}T12:00:00`) : undefined;
}

function parseNumberCell(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function csvToEmployees(text: string) {
  const [headers, ...records] = parseCsv(text);
  const normalizedHeaders = headers.map((header) => header.trim().toLowerCase());
  const requiredHeaders = ["name", "location", "role", "annualduedate"];
  const missingHeaders = requiredHeaders.filter(
    (header) => !normalizedHeaders.includes(header),
  );

  if (missingHeaders.length > 0) {
    return {
      employees: [],
      errors: [`Missing required column(s): ${missingHeaders.join(", ")}`],
    };
  }

  const valueFor = (record: string[], key: string) =>
    record[normalizedHeaders.indexOf(key.toLowerCase())] ?? "";
  const errors: string[] = [];
  const employees = records.flatMap((record, index) => {
    const rowNumber = index + 2;
    const name = valueFor(record, "name").trim();
    const location = valueFor(record, "location").trim();
    const role = valueFor(record, "role").trim();
    const annualDueDate = valueFor(record, "annualDueDate").trim();

    if (!name || !location || !role || !annualDueDate) {
      errors.push(`Row ${rowNumber} skipped because name, location, role, or annualDueDate is blank.`);
      return [];
    }

    return [
      {
        id: crypto.randomUUID(),
        name,
        location,
        role,
        completedHours: parseNumberCell(valueFor(record, "completedHours"), 0),
        requiredHours: parseNumberCell(valueFor(record, "requiredHours"), 24),
        completedInstructorLedHours: parseNumberCell(valueFor(record, "completedIpHours"), 0),
        requiredInstructorLedHours: parseNumberCell(valueFor(record, "requiredIpHours"), 5),
        annualDueDate: parseDateCell(annualDueDate),
        cprExpirationDate: parseDateCell(valueFor(record, "cprExpirationDate")),
        firstAidExpirationDate: parseDateCell(valueFor(record, "firstAidExpirationDate")),
      } satisfies DemoEmployee,
    ];
  });

  return { employees, errors };
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18211d]/35 p-4">
      <section className="w-full max-w-xl rounded-lg border border-[#d9dfd1] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#e5e9df] px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9dfd1] text-[#4d5b52] hover:bg-[#f3f6ef]"
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function ComplianceDashboard() {
  const [employees, setEmployees] = useState<DemoEmployee[]>(initialEmployees);
  const [activities, setActivities] = useState(activityItems);
  const [activeSection, setActiveSection] = useState<SectionName>("Dashboard");
  const [activeLocation, setActiveLocation] = useState("All Locations");
  const [activeRole, setActiveRole] = useState("All Roles");
  const [dueSoonOnly, setDueSoonOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalName>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    initialEmployees[0]?.id ?? "",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => buildRows(employees), [employees]);

  const filteredRows = useMemo(() => {
    return rows.filter((employee) => {
      const matchesSearch = [employee.name, employee.location, employee.role]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesLocation =
        activeLocation === "All Locations" || employee.location === activeLocation;
      const matchesRole = activeRole === "All Roles" || employee.role === activeRole;
      const matchesDueSoon =
        !dueSoonOnly ||
        (employee.compliance.daysUntilDeadline !== null &&
          employee.compliance.daysUntilDeadline <= 60);

      return matchesSearch && matchesLocation && matchesRole && matchesDueSoon;
    });
  }, [activeLocation, activeRole, dueSoonOnly, query, rows]);

  const metrics = useMemo(() => {
    const counts = rows.reduce(
      (acc, employee) => {
        acc[employee.compliance.status] += 1;
        if (
          employee.compliance.daysUntilDeadline !== null &&
          employee.compliance.daysUntilDeadline <= 30
        ) {
          acc.trainingDueSoon += 1;
        }
        if (employee.compliance.certifications.cpr === "EXPIRING") {
          acc.cprExpiring += 1;
        }
        if (employee.compliance.certifications.cpr === "EXPIRED") {
          acc.cprExpired += 1;
        }
        if (employee.compliance.annualTraining.remaining > 0) {
          acc.deficient += 1;
        }
        return acc;
      },
      {
        COMPLIANT: 0,
        ATTENTION: 0,
        AT_RISK: 0,
        OVERDUE: 0,
        NON_COMPLIANT: 0,
        UNKNOWN: 0,
        trainingDueSoon: 0,
        cprExpiring: 0,
        cprExpired: 0,
        deficient: 0,
      },
    );

    return {
      employees: rows.length,
      compliant: counts.COMPLIANT,
      attention: counts.ATTENTION + counts.AT_RISK,
      nonCompliant: counts.NON_COMPLIANT + counts.OVERDUE,
      missingData: counts.UNKNOWN,
      trainingDueSoon: counts.trainingDueSoon,
      cprExpiring: counts.cprExpiring,
      cprExpired: counts.cprExpired,
      deficient: counts.deficient,
      pendingApprovals: activities.filter((activity) =>
        activity.message.includes("submitted"),
      ).length,
    };
  }, [activities, rows]);

  const priorityEmployee =
    filteredRows.find((employee) => employee.compliance.status !== "COMPLIANT") ??
    filteredRows[0] ??
    rows[0];
  const selectedEmployee =
    rows.find((employee) => employee.id === selectedEmployeeId) ?? rows[0];

  function addActivity(message: string) {
    setActivities((current) =>
      [{ id: crypto.randomUUID(), message }, ...current].slice(0, 8),
    );
  }

  function handleAddEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const location = String(form.get("location") ?? locations[0]);
    const role = String(form.get("role") ?? roles[0]);

    if (!name) {
      return;
    }

    const employee: DemoEmployee = {
      id: crypto.randomUUID(),
      name,
      location,
      role,
      requiredHours: Number(form.get("requiredHours") ?? 24),
      completedHours: Number(form.get("completedHours") ?? 0),
      requiredInstructorLedHours: Number(form.get("requiredIpHours") ?? 5),
      completedInstructorLedHours: Number(form.get("completedIpHours") ?? 0),
      annualDueDate: new Date(`${String(form.get("annualDueDate"))}T12:00:00`),
      cprExpirationDate: form.get("cprExpirationDate")
        ? new Date(`${String(form.get("cprExpirationDate"))}T12:00:00`)
        : undefined,
      firstAidExpirationDate: form.get("firstAidExpirationDate")
        ? new Date(`${String(form.get("firstAidExpirationDate"))}T12:00:00`)
        : undefined,
    };

    setEmployees((current) => [...current, employee]);
    setSelectedEmployeeId(employee.id);
    addActivity(`${employee.name} was added to ${employee.location}.`);
    setModal(null);
    event.currentTarget.reset();
  }

  function handleRemoveEmployee(employee: EmployeeRow) {
    setEmployees((current) => current.filter((item) => item.id !== employee.id));
    addActivity(`${employee.name} was removed from active monitoring.`);
  }

  function handleAddTraining(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const employeeId = String(form.get("employeeId"));
    const hours = Number(form.get("hours") ?? 0);
    const deliveryType = String(form.get("deliveryType"));
    const courseName = String(form.get("courseName") ?? "Training");

    setEmployees((current) =>
      current.map((employee) =>
        employee.id === employeeId
          ? {
              ...employee,
              completedHours: employee.completedHours + hours,
              completedInstructorLedHours:
                deliveryType === "INSTRUCTOR_LED"
                  ? employee.completedInstructorLedHours + hours
                  : employee.completedInstructorLedHours,
            }
          : employee,
      ),
    );

    const employeeName =
      rows.find((employee) => employee.id === employeeId)?.name ?? "Employee";
    addActivity(`${courseName} was approved for ${employeeName} (${hours} hour(s)).`);
    setModal(null);
    event.currentTarget.reset();
  }

  function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const employeeId = String(form.get("employeeId"));
    const documentName = String(form.get("documentName") ?? "Certificate").trim();
    const employeeName =
      rows.find((employee) => employee.id === employeeId)?.name ?? "Employee";

    addActivity(`${documentName || "Certificate"} was uploaded for ${employeeName}.`);
    setModal(null);
    event.currentTarget.reset();
  }

  async function handleImportFile() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      addActivity("Import opened; no workbook selected yet.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      addActivity(`${file.name} was rejected. Import currently accepts CSV roster files.`);
      return;
    }

    const text = await file.text();
    const result = csvToEmployees(text);

    if (result.employees.length === 0) {
      addActivity(`${file.name} imported 0 employees. ${result.errors.join(" ")}`);
      return;
    }

    setEmployees((current) => [...current, ...result.employees]);
    setSelectedEmployeeId(result.employees[0].id);
    addActivity(
      `${file.name} imported ${result.employees.length} employee(s). ${result.errors.length} warning(s).`,
    );
    setModal(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleExport() {
    const csv = createCsv(filteredRows);
    downloadCsv("compliance-risk-list.csv", csv);
    addActivity(`Compliance risk list exported with ${filteredRows.length} row(s).`);
  }

  function handleExportAudit() {
    downloadCsv("audit-activity.csv", createAuditCsv(activities));
    addActivity(`Audit activity exported with ${activities.length} row(s).`);
  }

  function handleDownloadImportTemplate() {
    downloadCsv("employee-import-template.csv", createEmployeeImportTemplate());
    addActivity("Employee import template downloaded.");
  }

  const metricCards = [
    {
      label: "Employees",
      value: metrics.employees,
      icon: UsersRound,
      detail: "Active monitoring roster",
    },
    {
      label: "Fully Compliant",
      value: metrics.compliant,
      icon: CheckCircle2,
      detail: "No immediate action needed",
    },
    {
      label: "Attention Required",
      value: metrics.attention,
      icon: AlertTriangle,
      detail: "Due dates or deficiencies",
    },
    {
      label: "Missing Data",
      value: metrics.missingData,
      icon: FileClock,
      detail: "Cannot determine status",
    },
  ];

  const operationalMetrics = [
    ["Training Due <= 30 Days", metrics.trainingDueSoon],
    ["CPR Expiring <= 60 Days", metrics.cprExpiring],
    ["CPR Expired", metrics.cprExpired],
    ["Training Hours Deficient", metrics.deficient],
    ["Pending Approvals", metrics.pendingApprovals],
  ];

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#18211d]">
      <aside className="fixed inset-y-0 left-0 hidden w-20 flex-col items-center border-r border-[#d9dfd1] bg-[#fffdf7] py-5 lg:flex">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#224433] text-white">
          <ShieldCheck className="h-6 w-6" aria-hidden />
        </div>
        <nav className="mt-10 flex flex-1 flex-col gap-3">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              className={`flex h-11 w-11 items-center justify-center rounded-lg border text-[#405048] transition hover:border-[#8aa27b] hover:bg-[#edf2e8] ${
                activeSection === label
                  ? "border-[#8aa27b] bg-[#edf2e8]"
                  : "border-transparent bg-transparent"
              }`}
              key={label}
              onClick={() => {
                setActiveSection(label);
                addActivity(`${label} view opened.`);
              }}
              title={label}
              type="button"
            >
              <Icon className="h-5 w-5" aria-hidden />
            </button>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-20">
        <header className="sticky top-0 z-20 border-b border-[#d9dfd1] bg-[#fffdf7]/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-[#6b735f]">Ghost AI Solutions</p>
                <h1 className="text-2xl font-semibold text-[#18211d] sm:text-3xl">
                  Childcare Compliance Portal
                </h1>
                <p className="mt-1 text-sm text-[#66705f]">{activeSection} workspace</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd5c0] bg-white px-3 text-sm font-medium text-[#2f3a34] shadow-sm">
                  <Search className="h-4 w-4" aria-hidden />
                  <input
                    className="w-36 bg-transparent outline-none placeholder:text-[#82907f]"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search"
                    value={query}
                  />
                </label>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd5c0] bg-white px-3 text-sm font-medium text-[#2f3a34] shadow-sm transition hover:bg-[#f3f6ef]"
                  onClick={() => setModal("import")}
                  type="button"
                >
                  <Upload className="h-4 w-4" aria-hidden />
                  Import
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd5c0] bg-white px-3 text-sm font-medium text-[#2f3a34] shadow-sm transition hover:bg-[#f3f6ef]"
                  onClick={() => setModal("employee")}
                  type="button"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add Employee
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#224433] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a3528]"
                  onClick={() => setModal("training")}
                  type="button"
                >
                  <GraduationCap className="h-4 w-4" aria-hidden />
                  Add Training
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {["All Locations", ...locations].map((location) => (
                <button
                  className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 transition ${
                    activeLocation === location
                      ? "border-[#8aa27b] bg-[#edf2e8] text-[#293d32]"
                      : "border-[#d9dfd1] bg-white text-[#4d5b52] hover:bg-[#edf2e8]"
                  }`}
                  key={location}
                  onClick={() => setActiveLocation(location)}
                  type="button"
                >
                  <Filter className="h-3.5 w-3.5" aria-hidden />
                  {location === "All Locations" ? "All Locations" : "Kilgore Site"}
                </button>
              ))}
              <select
                className="h-9 rounded-lg border border-[#d9dfd1] bg-white px-3 text-sm text-[#4d5b52] outline-none"
                onChange={(event) => setActiveRole(event.target.value)}
                value={activeRole}
              >
                <option>All Roles</option>
                {roles.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
              <button
                className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 transition ${
                  dueSoonOnly
                    ? "border-[#8aa27b] bg-[#edf2e8] text-[#293d32]"
                    : "border-[#d9dfd1] bg-white text-[#4d5b52] hover:bg-[#edf2e8]"
                }`}
                onClick={() => setDueSoonOnly((current) => !current)}
                type="button"
              >
                <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                Due &lt;= 60 Days
              </button>
            </div>
            <nav className="grid grid-cols-3 gap-2 border-t border-[#e5e9df] pt-3 text-xs sm:grid-cols-6 lg:hidden">
              {navItems.map(({ label, icon: Icon }) => (
                <button
                  className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 font-medium ${
                    activeSection === label
                      ? "border-[#8aa27b] bg-[#edf2e8] text-[#293d32]"
                      : "border-[#d9dfd1] bg-white text-[#4d5b52]"
                  }`}
                  key={label}
                  onClick={() => {
                    setActiveSection(label);
                    addActivity(`${label} view opened.`);
                  }}
                  type="button"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </header>

        {activeSection === "Dashboard" ? (
          <>
        <section className="border-b border-[#d9dfd1] bg-[#edf2e8]">
          <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.3fr_0.7fr] lg:px-8">
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

            {priorityEmployee ? (
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
            ) : null}
          </div>
        </section>

        <section className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_340px] lg:px-8">
          <div className="overflow-hidden rounded-lg border border-[#d9dfd1] bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#e5e9df] px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Compliance Risk List</h2>
                <p className="text-sm text-[#66705f]">
                  {filteredRows.length} employee(s) match the current controls.
                </p>
              </div>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cbd5c0] bg-white px-3 text-sm font-medium text-[#2f3a34] transition hover:bg-[#f3f6ef]"
                onClick={handleExport}
                type="button"
              >
                <Download className="h-4 w-4" aria-hidden />
                Export
              </button>
            </div>
            <div className="grid gap-3 p-4 md:hidden">
              {filteredRows.map((employee) => (
                <EmployeeCard
                  employee={employee}
                  key={employee.id}
                  onAddTraining={(employeeId) => {
                    setSelectedEmployeeId(employeeId);
                    setModal("training");
                  }}
                  onRemoveEmployee={handleRemoveEmployee}
                />
              ))}
            </div>
            <div className="hidden md:block">
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[16%]" />
                  <col className="w-[12%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead className="bg-[#f7f8f5] text-xs uppercase text-[#677363]">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Employee</th>
                    <th className="px-3 py-3 font-semibold">Location</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Training</th>
                    <th className="px-3 py-3 font-semibold">CPR</th>
                    <th className="px-3 py-3 font-semibold">Deadline</th>
                    <th className="px-3 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf0e8]">
                  {filteredRows.map((employee) => (
                    <tr className="hover:bg-[#fafbf7]" key={employee.id}>
                      <td className="px-3 py-4 align-top">
                        <p className="font-medium text-[#18211d]">{employee.name}</p>
                        <p className="text-[#6b735f]">{employee.role}</p>
                      </td>
                      <td className="px-3 py-4 align-top text-[#425148]">{employee.location}</td>
                      <td className="px-3 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${
                            statusStyles[employee.compliance.status]
                          }`}
                        >
                          {employee.compliance.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-3 py-4 align-top">
                        {employee.completedHours} / {employee.requiredHours}
                        <span className="block text-[#77816f]">
                          {employee.compliance.annualTraining.remaining} remaining
                        </span>
                      </td>
                      <td className="px-3 py-4 align-top">
                        {employee.compliance.certifications.cpr}
                      </td>
                      <td className="px-3 py-4 align-top">{formatDate(employee.annualDueDate)}</td>
                      <td className="px-3 py-4 align-top">
                        <div className="flex gap-2">
                          <button
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#cbd5c0] text-[#2f3a34] hover:bg-[#f3f6ef]"
                            onClick={() => {
                              setSelectedEmployeeId(employee.id);
                              setModal("training");
                            }}
                            title={`Add training for ${employee.name}`}
                            type="button"
                          >
                            <GraduationCap className="h-4 w-4" aria-hidden />
                          </button>
                          <button
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7c7bd] text-[#9a432d] hover:bg-[#fff1ec]"
                            onClick={() => handleRemoveEmployee(employee)}
                            title={`Remove ${employee.name}`}
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      </td>
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
                  <p className="text-sm text-[#66705f]">
                    {selectedEmployee?.name ?? "No employee selected"}
                  </p>
                </div>
              </div>
              {selectedEmployee ? (
                <div className="mt-5 space-y-4">
                  <select
                    className="h-10 w-full rounded-lg border border-[#d9dfd1] bg-white px-3 text-sm outline-none"
                    onChange={(event) => setSelectedEmployeeId(event.target.value)}
                    value={selectedEmployee.id}
                  >
                    {rows.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                  <ProgressBar
                    color="#6f8b5f"
                    completed={selectedEmployee.completedHours}
                    label="Annual Training"
                    required={selectedEmployee.requiredHours}
                  />
                  <ProgressBar
                    color="#478477"
                    completed={selectedEmployee.completedInstructorLedHours}
                    label="Instructor Led"
                    required={selectedEmployee.requiredInstructorLedHours}
                  />
                  <button
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#224433] px-3 text-sm font-semibold text-white transition hover:bg-[#1a3528]"
                    onClick={() => setModal("upload")}
                    type="button"
                  >
                    <Upload className="h-4 w-4" aria-hidden />
                    Upload Training
                  </button>
                </div>
              ) : null}
            </article>

            <article className="rounded-lg border border-[#d9dfd1] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4efe1] text-[#715f37]">
                  <CalendarClock className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h2 className="font-semibold">Active Controls</h2>
                  <p className="text-sm text-[#66705f]">Every button changes this workspace</p>
                </div>
              </div>
              <div className="mt-5 space-y-2 text-sm text-[#4e5d54]">
                <p>Section: {activeSection}</p>
                <p>Location: {activeLocation}</p>
                <p>Role: {activeRole}</p>
                <p>Due filter: {dueSoonOnly ? "On" : "Off"}</p>
              </div>
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
                {activities.map((item) => (
                  <p
                    className="border-l-2 border-[#cbd5c0] pl-3 text-sm text-[#4e5d54]"
                    key={item.id}
                  >
                    {item.message}
                  </p>
                ))}
              </div>
            </article>
          </div>
        </section>
          </>
        ) : (
          <WorkspaceTab
            activities={activities}
            activeSection={activeSection}
            filteredRows={filteredRows}
            metrics={metrics}
            onAddEmployee={() => setModal("employee")}
            onAddTraining={(employeeId) => {
              if (employeeId) {
                setSelectedEmployeeId(employeeId);
              }
              setModal("training");
            }}
            onExportAudit={handleExportAudit}
            onRemoveEmployee={handleRemoveEmployee}
            onUpload={(employeeId) => {
              if (employeeId) {
                setSelectedEmployeeId(employeeId);
              }
              setModal("upload");
            }}
            rows={rows}
          />
        )}
      </div>

      {modal === "employee" ? (
        <Modal onClose={() => setModal(null)} title="Add Employee">
          <form className="grid gap-4 p-5" onSubmit={handleAddEmployee}>
            <label className="grid gap-1 text-sm font-medium">
              Employee Name
              <input className={fieldClass} name="name" placeholder="New Employee" required />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Location" name="location" options={locations} />
              <SelectField label="Role" name="role" options={roles} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField defaultValue={0} label="Completed Hours" name="completedHours" />
              <NumberField defaultValue={24} label="Required Hours" name="requiredHours" />
              <NumberField defaultValue={0} label="Completed IP Hours" name="completedIpHours" />
              <NumberField defaultValue={5} label="Required IP Hours" name="requiredIpHours" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <DateField defaultValue="2026-12-31" label="Annual Due" name="annualDueDate" required />
              <DateField label="CPR Expires" name="cprExpirationDate" />
              <DateField label="First Aid Expires" name="firstAidExpirationDate" />
            </div>
            <SubmitButton icon={Plus}>Add Employee</SubmitButton>
          </form>
        </Modal>
      ) : null}

      {modal === "training" ? (
        <Modal onClose={() => setModal(null)} title="Add Training">
          <form className="grid gap-4 p-5" onSubmit={handleAddTraining}>
            <label className="grid gap-1 text-sm font-medium">
              Employee
              <select className={fieldClass} defaultValue={selectedEmployee?.id} name="employeeId">
                {rows.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Course Name
              <input
                className={fieldClass}
                defaultValue="Recognizing Child Maltreatment"
                name="courseName"
                required
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField defaultValue={2} label="Hours" min={0.25} name="hours" step={0.25} />
              <label className="grid gap-1 text-sm font-medium">
                Delivery Type
                <select className={fieldClass} name="deliveryType">
                  <option value="INSTRUCTOR_LED">Instructor Led</option>
                  <option value="ONLINE">Online</option>
                  <option value="SELF_STUDY">Self Study</option>
                </select>
              </label>
            </div>
            <SubmitButton icon={GraduationCap}>Save Training</SubmitButton>
          </form>
        </Modal>
      ) : null}

      {modal === "upload" ? (
        <Modal onClose={() => setModal(null)} title="Upload Training Document">
          <form className="grid gap-4 p-5" onSubmit={handleUpload}>
            <label className="grid gap-1 text-sm font-medium">
              Employee
              <select className={fieldClass} defaultValue={selectedEmployee?.id} name="employeeId">
                {rows.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Document Name
              <input
                className={fieldClass}
                defaultValue="Training certificate"
                name="documentName"
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              File
              <input className="rounded-lg border border-[#d9dfd1] px-3 py-2 font-normal" type="file" />
            </label>
            <SubmitButton icon={Upload}>Upload</SubmitButton>
          </form>
        </Modal>
      ) : null}

      {modal === "import" ? (
        <Modal onClose={() => setModal(null)} title="Import Workbook">
          <div className="grid gap-4 p-5">
            <p className="text-sm text-[#66705f]">
              Upload a CSV roster with the template columns. Valid rows are added to the
              employee roster and compliance is recalculated immediately.
            </p>
            <input
              accept=".csv,text/csv"
              className="rounded-lg border border-[#d9dfd1] px-3 py-2"
              ref={fileInputRef}
              type="file"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cbd5c0] bg-white px-3 text-sm font-medium text-[#2f3a34] hover:bg-[#f3f6ef]"
                onClick={handleDownloadImportTemplate}
                type="button"
              >
                <Download className="h-4 w-4" aria-hidden />
                Template
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#224433] px-3 text-sm font-semibold text-white"
                onClick={handleImportFile}
                type="button"
              >
                <Upload className="h-4 w-4" aria-hidden />
                Import Employees
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

function ProgressBar({
  color,
  completed,
  label,
  required,
}: {
  color: string;
  completed: number;
  label: string;
  required: number;
}) {
  const width = required > 0 ? Math.min(100, (completed / required) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span>
          {completed} / {required} hours
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-[#e3e7dc]">
        <div className="h-2 rounded-full" style={{ backgroundColor: color, width: `${width}%` }} />
      </div>
    </div>
  );
}

function WorkspaceTab({
  activities,
  activeSection,
  filteredRows,
  metrics,
  onAddEmployee,
  onAddTraining,
  onExportAudit,
  onRemoveEmployee,
  onUpload,
  rows,
}: {
  activities: ActivityItem[];
  activeSection: Exclude<SectionName, "Dashboard">;
  filteredRows: EmployeeRow[];
  metrics: {
    employees: number;
    compliant: number;
    attention: number;
    nonCompliant: number;
    missingData: number;
    trainingDueSoon: number;
    cprExpiring: number;
    cprExpired: number;
    deficient: number;
    pendingApprovals: number;
  };
  onAddEmployee: () => void;
  onAddTraining: (employeeId?: string) => void;
  onExportAudit: () => void;
  onRemoveEmployee: (employee: EmployeeRow) => void;
  onUpload: (employeeId?: string) => void;
  rows: EmployeeRow[];
}) {
  if (activeSection === "Employees") {
    return (
      <section className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        <WorkspacePanel
          action={
            <button
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#224433] px-3 text-sm font-semibold text-white"
              onClick={onAddEmployee}
              type="button"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add Employee
            </button>
          }
          description="Add, review, and remove active employee records."
          title="Employees"
        >
          <EmployeeTable
            employees={filteredRows}
            onAddTraining={onAddTraining}
            onRemoveEmployee={onRemoveEmployee}
          />
        </WorkspacePanel>
        <SummaryPanel
          items={[
            ["Active employees", metrics.employees],
            ["Fully compliant", metrics.compliant],
            ["Needs attention", metrics.attention],
            ["Missing data", metrics.missingData],
          ]}
          title="Roster Summary"
        />
      </section>
    );
  }

  if (activeSection === "Training") {
    return (
      <section className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <WorkspacePanel
          action={
            <button
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#224433] px-3 text-sm font-semibold text-white"
              onClick={() => onAddTraining()}
              type="button"
            >
              <GraduationCap className="h-4 w-4" aria-hidden />
              Add Training
            </button>
          }
          description="Approve training and watch hours recalculate immediately."
          title="Training"
        >
          <div className="grid gap-3 md:grid-cols-2">
            {filteredRows.map((employee) => (
              <article
                className="rounded-lg border border-[#e1e6dc] bg-[#fffdf7] p-4"
                key={employee.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{employee.name}</h3>
                    <p className="text-sm text-[#66705f]">{employee.role}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                      statusStyles[employee.compliance.status]
                    }`}
                  >
                    {employee.compliance.status.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <ProgressBar
                    color="#6f8b5f"
                    completed={employee.completedHours}
                    label="Annual Training"
                    required={employee.requiredHours}
                  />
                  <ProgressBar
                    color="#478477"
                    completed={employee.completedInstructorLedHours}
                    label="Instructor Led"
                    required={employee.requiredInstructorLedHours}
                  />
                </div>
                <button
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-[#cbd5c0] bg-white px-3 text-sm font-medium text-[#2f3a34] hover:bg-[#f3f6ef]"
                  onClick={() => onAddTraining(employee.id)}
                  type="button"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add Hours
                </button>
              </article>
            ))}
          </div>
        </WorkspacePanel>
        <SummaryPanel
          items={[
            ["Training due soon", metrics.trainingDueSoon],
            ["Hours deficient", metrics.deficient],
            ["Pending approvals", metrics.pendingApprovals],
          ]}
          title="Training Queue"
        />
      </section>
    );
  }

  if (activeSection === "Documents") {
    return (
      <section className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <WorkspacePanel
          action={
            <button
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#224433] px-3 text-sm font-semibold text-white"
              onClick={() => onUpload()}
              type="button"
            >
              <Upload className="h-4 w-4" aria-hidden />
              Upload Document
            </button>
          }
          description="Certificate and document actions are grouped by employee."
          title="Documents"
        >
          <div className="grid gap-3 md:grid-cols-2">
            {filteredRows.map((employee) => (
              <article className="rounded-lg border border-[#e1e6dc] bg-white p-4" key={employee.id}>
                <h3 className="font-semibold">{employee.name}</h3>
                <p className="mt-1 text-sm text-[#66705f]">{employee.location}</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-[#f6e8e3] p-3">
                    <dt className="text-[#855c50]">CPR</dt>
                    <dd className="font-semibold">{employee.compliance.certifications.cpr}</dd>
                  </div>
                  <div className="rounded-lg bg-[#eaf3f1] p-3">
                    <dt className="text-[#52716b]">First Aid</dt>
                    <dd className="font-semibold">
                      {employee.compliance.certifications.firstAid}
                    </dd>
                  </div>
                </dl>
                <button
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-[#cbd5c0] bg-white px-3 text-sm font-medium text-[#2f3a34] hover:bg-[#f3f6ef]"
                  onClick={() => onUpload(employee.id)}
                  type="button"
                >
                  <Upload className="h-4 w-4" aria-hidden />
                  Upload
                </button>
              </article>
            ))}
          </div>
        </WorkspacePanel>
        <SummaryPanel
          items={[
            ["CPR expiring", metrics.cprExpiring],
            ["CPR expired", metrics.cprExpired],
            ["Missing data", metrics.missingData],
          ]}
          title="Document Risk"
        />
      </section>
    );
  }

  if (activeSection === "Alerts") {
    const alertRows = rows.filter((employee) => employee.compliance.status !== "COMPLIANT");

    return (
      <section className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        <WorkspacePanel
          description="Open compliance alerts generated from missing data, deadlines, and certifications."
          title="Alerts"
        >
          <div className="space-y-3">
            {alertRows.map((employee) => (
              <article
                className="rounded-lg border border-[#e1e6dc] bg-[#fffdf7] p-4"
                key={employee.id}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-semibold">{employee.name}</h3>
                    <p className="text-sm text-[#66705f]">
                      {employee.location} · {formatDate(employee.annualDueDate)}
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-[#4e5d54]">
                      {employee.compliance.reasons.slice(0, 3).map((reason) => (
                        <li className="flex gap-2" key={reason}>
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#bc5f2f]" aria-hidden />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#cbd5c0] bg-white px-3 text-sm font-medium text-[#2f3a34] hover:bg-[#f3f6ef]"
                    onClick={() => onAddTraining(employee.id)}
                    type="button"
                  >
                    <GraduationCap className="h-4 w-4" aria-hidden />
                    Resolve
                  </button>
                </div>
              </article>
            ))}
          </div>
        </WorkspacePanel>
        <SummaryPanel
          items={[
            ["Attention", metrics.attention],
            ["Non-compliant", metrics.nonCompliant],
            ["Missing data", metrics.missingData],
          ]}
          title="Alert Summary"
        />
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
      <WorkspacePanel
        action={
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd5c0] bg-white px-3 text-sm font-medium text-[#2f3a34] hover:bg-[#f3f6ef]"
            onClick={onExportAudit}
            type="button"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export
          </button>
        }
        description="Recent workspace activity with stable audit identities."
        title="Audit"
      >
        <div className="space-y-3">
          {activities.map((activity) => (
            <p
              className="rounded-lg border border-[#e1e6dc] bg-[#fffdf7] p-4 text-sm text-[#4e5d54]"
              key={activity.id}
            >
              {activity.message}
            </p>
          ))}
        </div>
      </WorkspacePanel>
      <SummaryPanel
        items={[
          ["Audit entries", activities.length],
          ["Employees tracked", metrics.employees],
          ["Filtered rows", filteredRows.length],
        ]}
        title="Audit Summary"
      />
    </section>
  );
}

function WorkspacePanel({
  action,
  children,
  description,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-[#d9dfd1] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#e5e9df] px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-[#66705f]">{description}</p>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function SummaryPanel({
  items,
  title,
}: {
  items: Array<[string, number]>;
  title: string;
}) {
  return (
    <aside className="rounded-lg border border-[#d9dfd1] bg-white p-5 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map(([label, value]) => (
          <div className="rounded-lg bg-[#f7f8f5] p-3" key={label}>
            <p className="text-2xl font-semibold text-[#293d32]">{value}</p>
            <p className="mt-1 text-sm text-[#66705f]">{label}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

function EmployeeTable({
  employees,
  onAddTraining,
  onRemoveEmployee,
}: {
  employees: EmployeeRow[];
  onAddTraining: (employeeId?: string) => void;
  onRemoveEmployee: (employee: EmployeeRow) => void;
}) {
  return (
    <>
    <div className="grid gap-3 md:hidden">
      {employees.map((employee) => (
        <EmployeeCard
          employee={employee}
          key={employee.id}
          onAddTraining={onAddTraining}
          onRemoveEmployee={onRemoveEmployee}
        />
      ))}
    </div>
    <div className="hidden md:block">
      <table className="w-full table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[18%]" />
          <col className="w-[18%]" />
          <col className="w-[16%]" />
          <col className="w-[16%]" />
          <col className="w-[10%]" />
        </colgroup>
        <thead className="bg-[#f7f8f5] text-xs uppercase text-[#677363]">
          <tr>
            <th className="px-3 py-3 font-semibold">Employee</th>
            <th className="px-3 py-3 font-semibold">Location</th>
            <th className="px-3 py-3 font-semibold">Status</th>
            <th className="px-3 py-3 font-semibold">Training</th>
            <th className="px-3 py-3 font-semibold">Deadline</th>
            <th className="px-3 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#edf0e8]">
          {employees.map((employee) => (
            <tr className="hover:bg-[#fafbf7]" key={employee.id}>
              <td className="px-3 py-4 align-top">
                <p className="font-medium text-[#18211d]">{employee.name}</p>
                <p className="text-[#6b735f]">{employee.role}</p>
              </td>
              <td className="px-3 py-4 align-top text-[#425148]">{employee.location}</td>
              <td className="px-3 py-4 align-top">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${
                    statusStyles[employee.compliance.status]
                  }`}
                >
                  {employee.compliance.status.replace("_", " ")}
                </span>
              </td>
              <td className="px-3 py-4 align-top">
                {employee.completedHours} / {employee.requiredHours}
              </td>
              <td className="px-3 py-4 align-top">{formatDate(employee.annualDueDate)}</td>
              <td className="px-3 py-4 align-top">
                <div className="flex gap-2">
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#cbd5c0] text-[#2f3a34] hover:bg-[#f3f6ef]"
                    onClick={() => onAddTraining(employee.id)}
                    title={`Add training for ${employee.name}`}
                    type="button"
                  >
                    <GraduationCap className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7c7bd] text-[#9a432d] hover:bg-[#fff1ec]"
                    onClick={() => onRemoveEmployee(employee)}
                    title={`Remove ${employee.name}`}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}

function EmployeeCard({
  employee,
  onAddTraining,
  onRemoveEmployee,
}: {
  employee: EmployeeRow;
  onAddTraining: (employeeId: string) => void;
  onRemoveEmployee: (employee: EmployeeRow) => void;
}) {
  return (
    <article className="rounded-lg border border-[#e1e6dc] bg-[#fffdf7] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#18211d]">{employee.name}</h3>
          <p className="text-sm text-[#66705f]">
            {employee.role} · {employee.location}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${
            statusStyles[employee.compliance.status]
          }`}
        >
          {employee.compliance.status.replace("_", " ")}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-white p-3">
          <dt className="text-[#66705f]">Training</dt>
          <dd className="font-semibold">
            {employee.completedHours} / {employee.requiredHours}
          </dd>
        </div>
        <div className="rounded-lg bg-white p-3">
          <dt className="text-[#66705f]">CPR</dt>
          <dd className="font-semibold">{employee.compliance.certifications.cpr}</dd>
        </div>
        <div className="col-span-2 rounded-lg bg-white p-3">
          <dt className="text-[#66705f]">Deadline</dt>
          <dd className="font-semibold">{formatDate(employee.annualDueDate)}</dd>
        </div>
      </dl>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cbd5c0] bg-white px-3 text-sm font-medium text-[#2f3a34]"
          onClick={() => onAddTraining(employee.id)}
          type="button"
        >
          <GraduationCap className="h-4 w-4" aria-hidden />
          Training
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#e7c7bd] bg-white px-3 text-sm font-medium text-[#9a432d]"
          onClick={() => onRemoveEmployee(employee)}
          type="button"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Remove
        </button>
      </div>
    </article>
  );
}

function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <select className={fieldClass} name={name}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  defaultValue,
  label,
  min = 0,
  name,
  step = 1,
}: {
  defaultValue: number;
  label: string;
  min?: number;
  name: string;
  step?: number;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <input
        className={fieldClass}
        defaultValue={defaultValue}
        min={min}
        name={name}
        step={step}
        type="number"
      />
    </label>
  );
}

function DateField({
  defaultValue,
  label,
  name,
  required = false,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <input
        className={fieldClass}
        defaultValue={defaultValue}
        name={name}
        required={required}
        type="date"
      />
    </label>
  );
}

function SubmitButton({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon: typeof Plus;
}) {
  return (
    <button
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#224433] px-3 text-sm font-semibold text-white"
      type="submit"
    >
      <Icon className="h-4 w-4" aria-hidden />
      {children}
    </button>
  );
}

