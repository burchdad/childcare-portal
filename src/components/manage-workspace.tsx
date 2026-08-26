"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Download,
  FileText,
  GraduationCap,
  Save,
  Settings2,
  Trash2,
  Upload,
  UsersRound,
  X,
} from "lucide-react";

type Tab = "employees" | "training" | "certifications" | "documents" | "imports" | "settings";
type Employee = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  jobRoleId: string;
  employmentStatus: string;
  annualDueDate?: string | null;
  compliance: { status: string };
};
type DocumentRow = {
  id: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  employee?: { firstName: string; lastName: string } | null;
};
type ImportBatch = {
  id: string;
  fileName: string;
  status: string;
  rowCount: number;
  validRowCount: number;
  errorRowCount: number;
  rows: Array<{
    id: string;
    rowNumber: number;
    status: string;
    mapped: Record<string, string>;
    errors?: string[] | null;
  }>;
};
type RuleSet = {
  id: string;
  name: string;
  requirements: Array<{
    id: string;
    jobRoleId: string;
    requiredHours: string;
    minimumInstructorLedHours: string | null;
    jobRole: { id: string; name: string };
  }>;
};

const tabs: Array<{ id: Tab; label: string; icon: typeof UsersRound }> = [
  { id: "employees", label: "Employees", icon: UsersRound },
  { id: "training", label: "Training", icon: GraduationCap },
  { id: "certifications", label: "Certifications", icon: BadgeCheck },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "imports", label: "Imports", icon: Upload },
  { id: "settings", label: "Settings", icon: Settings2 },
];

function fieldClass() {
  return "h-10 rounded-lg border border-[#d9dfd1] bg-white px-3 text-sm outline-none";
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(typeof result.error === "string" ? result.error : "Request failed.");
  }

  return result as T;
}

function dateValue(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export function ManageWorkspace({ canEdit }: { canEdit: boolean }) {
  const [activeTab, setActiveTab] = useState<Tab>("employees");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [imports, setImports] = useState<ImportBatch[]>([]);
  const [ruleSets, setRuleSets] = useState<RuleSet[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const documentFileRef = useRef<HTMLInputElement>(null);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? employees[0],
    [employees, selectedEmployeeId],
  );
  const selectedEmployeeDocuments = useMemo(
    () =>
      selectedEmployee
        ? documents.filter((document) =>
            document.employee
              ? `${document.employee.firstName} ${document.employee.lastName}` ===
                selectedEmployee.name
              : false,
          )
        : [],
    [documents, selectedEmployee],
  );
  const usesEmployeeRoster =
    activeTab === "employees" ||
    activeTab === "training" ||
    activeTab === "certifications" ||
    activeTab === "documents";

  async function refresh() {
    const [employeeData, documentData, importData, ruleData] = await Promise.all([
      jsonFetch<{ employees: Employee[] }>("/api/employees"),
      jsonFetch<{ documents: DocumentRow[] }>("/api/documents"),
      jsonFetch<{ batches: ImportBatch[] }>("/api/imports/workbook"),
      jsonFetch<{ ruleSets: RuleSet[] }>("/api/compliance-rules"),
    ]);

    setEmployees(employeeData.employees);
    setDocuments(documentData.documents);
    setImports(importData.batches);
    setRuleSets(ruleData.ruleSets);
    setSelectedEmployeeId((current) => current || employeeData.employees[0]?.id || "");
  }

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");

    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const [employeeData, documentData, importData, ruleData] = await Promise.all([
          jsonFetch<{ employees: Employee[] }>("/api/employees"),
          jsonFetch<{ documents: DocumentRow[] }>("/api/documents"),
          jsonFetch<{ batches: ImportBatch[] }>("/api/imports/workbook"),
          jsonFetch<{ ruleSets: RuleSet[] }>("/api/compliance-rules"),
        ]);

        if (!active) return;

        setEmployees(employeeData.employees);
        setDocuments(documentData.documents);
        setImports(importData.batches);
        setRuleSets(ruleData.ruleSets);
        setSelectedEmployeeId(employeeData.employees[0]?.id || "");
      } catch (error) {
        if (active) {
          setMessage(error instanceof Error ? error.message : "Load failed.");
        }
      }
    }

    void loadInitialData();

    return () => {
      active = false;
    };
  }, []);

  async function updateEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEmployee || !canEdit) return;
    const form = new FormData(event.currentTarget);
    form.set("employeeId", selectedEmployee.id);

    await runAction(async () => {
      await jsonFetch(`/api/employees/${selectedEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          email: form.get("email"),
          phone: form.get("phone"),
          annualTrainingDueDate: form.get("annualTrainingDueDate"),
          employmentStatus: form.get("employmentStatus"),
        }),
      });
      setMessage("Employee saved live.");
      await refresh();
    });
  }

  async function createEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return;
    if (!selectedEmployee) return;
    const form = new FormData(event.currentTarget);
    form.set("employeeId", selectedEmployee.id);

    await runAction(async () => {
      const result = await jsonFetch<{ employee: Employee }>("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      setMessage(`${result.employee.name} created live.`);
      event.currentTarget.reset();
      await refresh();
      setSelectedEmployeeId(result.employee.id);
      setShowAddEmployee(false);
    });
  }

  async function removeEmployee() {
    if (!selectedEmployee || !canEdit) return;

    await runAction(async () => {
      await jsonFetch(`/api/employees/${selectedEmployee.id}`, { method: "DELETE" });
      setMessage(`${selectedEmployee.name} was terminated live.`);
      setSelectedEmployeeId("");
      await refresh();
    });
  }

  async function addTraining(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return;
    const form = new FormData(event.currentTarget);

    await runAction(async () => {
      await jsonFetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      setMessage("Training record saved live.");
      event.currentTarget.reset();
      await refresh();
    });
  }

  async function saveCertification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return;
    const form = new FormData(event.currentTarget);

    await runAction(async () => {
      await jsonFetch("/api/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      setMessage("Certification saved live.");
      await refresh();
    });
  }

  async function uploadImport() {
    const file = importFileRef.current?.files?.[0];
    if (!file || !canEdit) return;
    const form = new FormData();
    form.append("file", file);

    await runAction(async () => {
      await jsonFetch("/api/imports/workbook", { method: "POST", body: form });
      setMessage("Workbook staged live for review.");
      if (importFileRef.current) importFileRef.current.value = "";
      await refresh();
    });
  }

  async function commitImport(batchId: string) {
    if (!canEdit) return;
    await runAction(async () => {
      await jsonFetch(`/api/imports/workbook/${batchId}/commit`, { method: "POST" });
      setMessage("Workbook import committed live.");
      await refresh();
    });
  }

  async function updateRequirement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return;
    const form = new FormData(event.currentTarget);

    await runAction(async () => {
      await jsonFetch("/api/compliance-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      setMessage("Compliance requirement saved live.");
      await refresh();
    });
  }

  async function archiveDocument(id: string) {
    if (!canEdit) return;
    await runAction(async () => {
      await jsonFetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setMessage("Document archived live.");
      await refresh();
    });
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return;
    if (!selectedEmployee) return;
    const file = documentFileRef.current?.files?.[0];
    if (!file) {
      setMessage("Choose a document file first.");
      return;
    }

    const form = new FormData(event.currentTarget);
    form.set("employeeId", selectedEmployee.id);
    form.set("file", file);

    await runAction(async () => {
      await jsonFetch("/api/documents/upload", { method: "POST", body: form });
      setMessage("Document uploaded live.");
      event.currentTarget.reset();
      await refresh();
    });
  }

  return (
    <div className="mt-6 grid gap-5">
      <nav className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium ${
              activeTab === id
                ? "border-[#8aa27b] bg-[#edf2e8] text-[#293d32]"
                : "border-[#d9dfd1] bg-white text-[#4d5b52]"
            }`}
            key={id}
            onClick={() => setActiveTab(id)}
            type="button"
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
        <button
          className="ml-auto inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-[#cbd5c0] bg-white px-3 text-sm font-medium text-[#2f3a34]"
          disabled={busy}
          onClick={() => runAction(async () => {
            await refresh();
            setMessage("Live data reloaded.");
          })}
          type="button"
        >
          <Settings2 className="h-4 w-4" aria-hidden />
          Reload Live Data
        </button>
      </nav>

      {message ? (
        <p className={`rounded-lg border px-4 py-3 text-sm ${
          message.toLowerCase().includes("failed") || message.toLowerCase().includes("denied") || message.toLowerCase().includes("required")
            ? "border-[#e7c7bd] bg-[#fff8f5] text-[#9a432d]"
            : "border-[#d9dfd1] bg-white text-[#405048]"
        }`}>
          {busy ? "Working live... " : ""}
          {message}
        </p>
      ) : null}

      {usesEmployeeRoster ? (
        <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <RosterPanel
            busy={busy}
            canEdit={canEdit}
            employees={employees}
            onAddEmployee={() => setShowAddEmployee(true)}
            onSelectEmployee={setSelectedEmployeeId}
            selectedEmployeeId={selectedEmployee?.id ?? ""}
          />
          <div className="grid gap-5">
            {activeTab === "employees" ? (
              <Panel title="Employee Details">
              {selectedEmployee ? (
                <form className="grid gap-4" key={selectedEmployee.id} onSubmit={updateEmployee}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input defaultValue={selectedEmployee.firstName} label="First Name" name="firstName" />
                    <Input defaultValue={selectedEmployee.lastName} label="Last Name" name="lastName" />
                    <Input defaultValue={selectedEmployee.email ?? ""} label="Email" name="email" />
                    <Input defaultValue={selectedEmployee.phone ?? ""} label="Phone" name="phone" />
                    <Input
                      defaultValue={dateValue(selectedEmployee.annualDueDate)}
                      label="Annual Due Date"
                      name="annualTrainingDueDate"
                      type="date"
                    />
                    <label className="grid gap-1 text-sm font-medium">
                      Employment Status
                      <select className={fieldClass()} defaultValue={selectedEmployee.employmentStatus} name="employmentStatus">
                        <option>ACTIVE</option>
                        <option>LEAVE</option>
                        <option>TERMINATED</option>
                        <option>FUTURE_HIRE</option>
                      </select>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Submit disabled={!canEdit || busy} icon={Save}>Save Employee</Submit>
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e7c7bd] bg-white px-3 text-sm font-semibold text-[#9a432d] disabled:opacity-60"
                      disabled={!canEdit || busy}
                      onClick={removeEmployee}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Terminate
                    </button>
                    <Link className="inline-flex h-10 items-center rounded-lg border border-[#cbd5c0] bg-white px-3 text-sm font-semibold" href={`/employees/${selectedEmployee.id}`}>
                      Open Profile
                    </Link>
                  </div>
                </form>
              ) : null}
              </Panel>
            ) : null}

            {activeTab === "training" ? (
              <Panel title={selectedEmployee ? `Add Training for ${selectedEmployee.name}` : "Add Training"}>
                {selectedEmployee ? (
                  <form className="grid gap-4 md:grid-cols-2" key={selectedEmployee.id} onSubmit={addTraining}>
                    <Input defaultValue="Annual training" label="Course Name" name="courseName" />
                    <Input label="Provider" name="provider" />
                    <Input defaultValue={new Date().toISOString().slice(0, 10)} label="Training Date" name="trainingDate" type="date" />
                    <Input defaultValue="1" label="Hours" name="hours" type="number" />
                    <label className="grid gap-1 text-sm font-medium">
                      Delivery Type
                      <select className={fieldClass()} name="trainingDeliveryType">
                        <option value="ONLINE">Online</option>
                        <option value="INSTRUCTOR_LED">Instructor Led</option>
                        <option value="SELF_STUDY">Self Study</option>
                        <option value="IN_PERSON">In Person</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </label>
                    <div className="md:col-span-2">
                      <Submit disabled={!canEdit || busy} icon={GraduationCap}>Save Training</Submit>
                    </div>
                  </form>
                ) : null}
              </Panel>
            ) : null}

            {activeTab === "certifications" ? (
              <Panel title={selectedEmployee ? `CPR / First Aid for ${selectedEmployee.name}` : "CPR / First Aid"}>
                {selectedEmployee ? (
                  <form className="grid gap-4 md:grid-cols-2" key={selectedEmployee.id} onSubmit={saveCertification}>
                    <label className="grid gap-1 text-sm font-medium">
                      Certification
                      <select className={fieldClass()} name="certificationType">
                        <option value="CPR">CPR</option>
                        <option value="FIRST_AID">First Aid</option>
                      </select>
                    </label>
                    <Input label="Provider" name="provider" />
                    <Input label="Certificate Number" name="certificateNumber" />
                    <Input label="Issue Date" name="issueDate" type="date" />
                    <Input label="Expiration Date" name="expirationDate" type="date" />
                    <div className="md:col-span-2">
                      <Submit disabled={!canEdit || busy} icon={BadgeCheck}>Save Certification</Submit>
                    </div>
                  </form>
                ) : null}
              </Panel>
            ) : null}

            {activeTab === "documents" ? (
              <Panel title={selectedEmployee ? `Documents for ${selectedEmployee.name}` : "Documents"}>
                {selectedEmployee ? (
                  <>
                    <form className="mb-5 grid gap-3 rounded-lg border border-[#e1e6dc] bg-[#fffdf7] p-4 md:grid-cols-2" key={selectedEmployee.id} onSubmit={uploadDocument}>
                      <Input defaultValue="Training certificate" label="Document Name" name="documentName" />
                      <label className="grid gap-1 text-sm font-medium">
                        File
                        <input
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,image/*,application/pdf"
                          className="rounded-lg border border-[#d9dfd1] bg-white px-3 py-2 text-sm"
                          ref={documentFileRef}
                          type="file"
                        />
                      </label>
                      <div className="md:col-span-2">
                        <Submit disabled={!canEdit || busy} icon={Upload}>Upload Document</Submit>
                      </div>
                    </form>
                    <div className="grid gap-3">
                      {selectedEmployeeDocuments.length ? (
                        selectedEmployeeDocuments.map((document) => (
                          <DocumentCard
                            busy={busy}
                            canEdit={canEdit}
                            document={document}
                            key={document.id}
                            onArchive={archiveDocument}
                          />
                        ))
                      ) : (
                        <p className="rounded-lg border border-[#e1e6dc] bg-white p-4 text-sm text-[#66705f]">
                          No documents uploaded for {selectedEmployee.name}.
                        </p>
                      )}
                    </div>
                  </>
                ) : null}
              </Panel>
            ) : null}
          </div>
        </section>
      ) : null}

      {showAddEmployee ? (
        <Modal onClose={() => setShowAddEmployee(false)} title="Add Employee">
          <form className="grid gap-3 p-5 md:grid-cols-2" onSubmit={createEmployee}>
            <Input label="First Name" name="firstName" />
            <Input label="Last Name" name="lastName" />
            <Input label="Email" name="email" />
            <Input label="Phone" name="phone" />
            <label className="grid gap-1 text-sm font-medium">
              Role
              <select className={fieldClass()} name="role">
                {["Caregiver", "Assistant Director", "Director", "Cook", "Substitute"].map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </label>
            <Input label="Annual Due Date" name="annualDueDate" type="date" />
            <div className="flex gap-2 md:col-span-2">
              <Submit disabled={!canEdit || busy} icon={UsersRound}>Create Employee</Submit>
              <button
                className="inline-flex h-10 items-center rounded-lg border border-[#cbd5c0] bg-white px-3 text-sm font-semibold"
                onClick={() => setShowAddEmployee(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeTab === "imports" ? (
        <Panel title="Workbook Import Review">
          <div className="flex flex-wrap gap-2">
            <input accept=".csv,.tsv,text/csv,text/tab-separated-values" className="rounded-lg border border-[#d9dfd1] bg-white px-3 py-2 text-sm" ref={importFileRef} type="file" />
            <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#224433] px-3 text-sm font-semibold text-white disabled:opacity-60" disabled={!canEdit || busy} onClick={uploadImport} type="button">
              <Upload className="h-4 w-4" aria-hidden />
              Stage Workbook
            </button>
          </div>
          <div className="mt-5 grid gap-4">
            {imports.map((batch) => (
              <article className="rounded-lg border border-[#e1e6dc] bg-white p-4" key={batch.id}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-semibold">{batch.fileName}</h3>
                    <p className="text-sm text-[#66705f]">
                      {batch.status} · {batch.validRowCount} ready · {batch.errorRowCount} errors · {batch.rowCount} rows
                    </p>
                  </div>
                  <button className="h-9 rounded-lg bg-[#224433] px-3 text-sm font-semibold text-white disabled:opacity-60" disabled={!canEdit || busy || batch.status === "COMMITTED" || batch.validRowCount === 0} onClick={() => commitImport(batch.id)} type="button">
                    Commit Ready Rows
                  </button>
                </div>
                <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-[#edf0e8]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#f7f8f5] text-xs uppercase text-[#66705f]">
                      <tr>
                        <th className="px-3 py-2">Row</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Role</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.rows.map((row) => (
                        <tr className="border-t border-[#edf0e8]" key={row.id}>
                          <td className="px-3 py-2">{row.rowNumber}</td>
                          <td className="px-3 py-2">{row.mapped.firstName} {row.mapped.lastName}</td>
                          <td className="px-3 py-2">{row.mapped.role}</td>
                          <td className="px-3 py-2">{row.status}</td>
                          <td className="px-3 py-2 text-[#9a432d]">{row.errors?.join(" ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      ) : null}

      {activeTab === "settings" ? (
        <Panel title="Compliance Rule Admin">
          <div className="grid gap-4 md:grid-cols-2">
            {ruleSets.flatMap((ruleSet) =>
              ruleSet.requirements.map((requirement) => (
                <form className="rounded-lg border border-[#e1e6dc] bg-white p-4" key={requirement.id} onSubmit={updateRequirement}>
                  <input name="jobRoleId" type="hidden" value={requirement.jobRoleId} />
                  <h3 className="font-semibold">{requirement.jobRole.name}</h3>
                  <div className="mt-3 grid gap-3">
                    <Input defaultValue={String(requirement.requiredHours)} label="Annual Hours" name="requiredHours" type="number" />
                    <Input defaultValue={String(requirement.minimumInstructorLedHours ?? 0)} label="Instructor-Led Hours" name="minimumInstructorLedHours" type="number" />
                  </div>
                  <div className="mt-4">
                    <Submit disabled={!canEdit || busy} icon={Save}>Save Rule</Submit>
                  </div>
                </form>
              )),
            )}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-lg border border-[#d9dfd1] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
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
      <section className="w-full max-w-3xl rounded-lg border border-[#d9dfd1] bg-white shadow-xl">
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

function RosterPanel({
  busy,
  canEdit,
  employees,
  onAddEmployee,
  onSelectEmployee,
  selectedEmployeeId,
}: {
  busy: boolean;
  canEdit: boolean;
  employees: Employee[];
  onAddEmployee: () => void;
  onSelectEmployee: (employeeId: string) => void;
  selectedEmployeeId: string;
}) {
  return (
    <Panel title="Roster">
      <button
        className="mb-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#224433] px-3 text-sm font-semibold text-white disabled:opacity-60"
        disabled={!canEdit || busy}
        onClick={onAddEmployee}
        type="button"
      >
        <UsersRound className="h-4 w-4" aria-hidden />
        Add Employee
      </button>
      <div className="grid gap-2">
        {employees.map((employee) => (
          <button
            className={`rounded-lg border px-3 py-2 text-left text-sm ${
              selectedEmployeeId === employee.id
                ? "border-[#8aa27b] bg-[#edf2e8]"
                : "border-[#e1e6dc] bg-white"
            }`}
            key={employee.id}
            onClick={() => onSelectEmployee(employee.id)}
            type="button"
          >
            <span className="font-semibold">{employee.name}</span>
            <span className="block text-[#66705f]">
              {employee.role} · {employee.compliance.status.replaceAll("_", " ")}
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function DocumentCard({
  busy,
  canEdit,
  document,
  onArchive,
}: {
  busy: boolean;
  canEdit: boolean;
  document: DocumentRow;
  onArchive: (id: string) => void;
}) {
  return (
    <article className="grid gap-3 rounded-lg border border-[#e1e6dc] bg-white p-4 md:grid-cols-[1fr_auto]">
      <div>
        <h3 className="font-semibold">{document.documentType}</h3>
        <p className="text-sm text-[#66705f]">
          {document.fileName} · {Math.ceil(document.fileSize / 1024)} KB
        </p>
      </div>
      <div className="flex gap-2">
        <a
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#cbd5c0] px-3 text-sm font-semibold"
          href={`/api/documents/${document.id}/download`}
        >
          <Download className="h-4 w-4" aria-hidden />
          Download
        </a>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e7c7bd] px-3 text-sm font-semibold text-[#9a432d] disabled:opacity-60"
          disabled={!canEdit || busy}
          onClick={() => onArchive(document.id)}
          type="button"
        >
          Archive
        </button>
      </div>
    </article>
  );
}

function Input({
  defaultValue = "",
  label,
  name,
  type = "text",
}: {
  defaultValue?: string;
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <input className={fieldClass()} defaultValue={defaultValue} name={name} type={type} />
    </label>
  );
}

function Submit({
  children,
  disabled,
  icon: Icon,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  icon: typeof Save;
}) {
  return (
    <button
      className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#224433] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      type="submit"
    >
      <Icon className="h-4 w-4" aria-hidden />
      {children}
    </button>
  );
}
