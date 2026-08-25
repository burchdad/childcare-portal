import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { canManageEmployees, getCurrentUser } from "@/lib/server/auth";
import { employeeInclude, serializeEmployee } from "@/lib/server/employees";

type Props = { params: Promise<{ id: string }> };

function formatDate(value?: Date | string | null) {
  if (!value) {
    return "Missing";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function Panel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-[#d9dfd1] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function EmployeeProfilePage({ params }: Props) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    return (
      <main className="min-h-screen bg-[#f7f8f5] p-8 text-[#18211d]">
        <Link className="text-sm font-semibold text-[#224433]" href="/login">
          Sign in to view employee profiles
        </Link>
      </main>
    );
  }

  if (user.roles.includes("EMPLOYEE") && !canManageEmployees(user) && user.employeeId !== id) {
    return (
      <main className="min-h-screen bg-[#f7f8f5] p-8 text-[#18211d]">
        <p className="font-semibold">You can only view your own employee profile.</p>
      </main>
    );
  }

  const [employeeRecord, auditLogs] = await Promise.all([
    prisma.employee.findFirst({
      where: { id, organizationId: user.organizationId },
      include: employeeInclude,
    }),
    prisma.auditLog.findMany({
      where: { organizationId: user.organizationId, entityId: id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  if (!employeeRecord) {
    return (
      <main className="min-h-screen bg-[#f7f8f5] p-8 text-[#18211d]">
        <p className="font-semibold">Employee not found.</p>
      </main>
    );
  }

  const employee = serializeEmployee(employeeRecord);
  const tabs = ["Overview", "Training", "Certifications", "Documents", "Compliance", "Activity"];

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#18211d]">
      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
        <Link className="text-sm font-semibold text-[#224433]" href="/">
          Back to dashboard
        </Link>
        <div className="mt-4 flex flex-col gap-3 border-b border-[#d9dfd1] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-[#66705f]">{employee.role}</p>
            <h1 className="text-3xl font-semibold">{employee.name}</h1>
            <p className="mt-1 text-sm text-[#66705f]">{employee.location}</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold ring-1 ring-[#d9dfd1]">
            {employee.compliance.status.replace("_", " ")}
          </span>
        </div>
        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <a
              className="shrink-0 rounded-lg border border-[#cbd5c0] bg-white px-3 py-2 text-sm font-medium text-[#2f3a34]"
              href={`#${tab.toLowerCase()}`}
              key={tab}
            >
              {tab}
            </a>
          ))}
        </nav>
        <div className="mt-6 grid gap-6">
          <Panel title="Overview">
            <dl id="overview" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Status", employee.employmentStatus],
                ["Hire Date", formatDate(employee.hireDate)],
                ["Annual Due", formatDate(employee.annualDueDate)],
                ["Employee Number", employee.employeeNumber ?? "Unassigned"],
              ].map(([label, value]) => (
                <div className="rounded-lg bg-[#f7f8f5] p-3" key={label}>
                  <dt className="text-sm text-[#66705f]">{label}</dt>
                  <dd className="mt-1 font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Training">
            <div id="training" className="space-y-3">
              {employee.trainingRecords.length ? (
                employee.trainingRecords.map((record) => (
                  <article className="rounded-lg border border-[#e1e6dc] p-3" key={record.id}>
                    <p className="font-semibold">{record.courseNameSnapshot}</p>
                    <p className="text-sm text-[#66705f]">
                      {Number(record.hours)} hour(s) · {record.trainingDeliveryType} ·{" "}
                      {formatDate(record.trainingDate)}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-[#66705f]">No training records yet.</p>
              )}
            </div>
          </Panel>
          <Panel title="Certifications">
            <div id="certifications" className="grid gap-3 md:grid-cols-2">
              {employee.certifications.map((certification) => (
                <article className="rounded-lg border border-[#e1e6dc] p-3" key={certification.id}>
                  <p className="font-semibold">{certification.certificationType.replace("_", " ")}</p>
                  <p className="text-sm text-[#66705f]">
                    {certification.status} · Expires {formatDate(certification.expirationDate)}
                  </p>
                </article>
              ))}
            </div>
          </Panel>
          <Panel title="Documents">
            <div id="documents" className="space-y-3">
              {employee.documents.length ? (
                employee.documents.map((document) => (
                  <article className="rounded-lg border border-[#e1e6dc] p-3" key={document.id}>
                    <p className="font-semibold">{document.documentType}</p>
                    <p className="text-sm text-[#66705f]">
                      {document.fileName} · {Math.ceil(document.fileSize / 1024)} KB ·{" "}
                      {formatDate(document.uploadedAt)}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-[#66705f]">No documents uploaded yet.</p>
              )}
            </div>
          </Panel>
          <Panel title="Compliance">
            <div id="compliance" className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-[#f7f8f5] p-4">
                <p className="text-sm text-[#66705f]">Annual Training</p>
                <p className="text-2xl font-semibold">
                  {employee.completedHours} / {employee.requiredHours}
                </p>
              </div>
              <div className="rounded-lg bg-[#f7f8f5] p-4">
                <p className="text-sm text-[#66705f]">Instructor Led</p>
                <p className="text-2xl font-semibold">
                  {employee.completedInstructorLedHours} / {employee.requiredInstructorLedHours}
                </p>
              </div>
              <ul className="md:col-span-2 space-y-2 text-sm text-[#4e5d54]">
                {employee.compliance.reasons.map((reason) => (
                  <li className="rounded-lg border border-[#e1e6dc] bg-white p-3" key={reason}>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
          <Panel title="Activity">
            <div id="activity" className="space-y-3">
              {auditLogs.length ? (
                auditLogs.map((log) => (
                  <article className="rounded-lg border border-[#e1e6dc] p-3" key={log.id}>
                    <p className="font-semibold">{log.action.replaceAll("_", " ")}</p>
                    <p className="text-sm text-[#66705f]">{formatDate(log.createdAt)}</p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-[#66705f]">No activity recorded for this employee yet.</p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
