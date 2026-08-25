const aliases: Record<string, string[]> = {
  firstName: ["first name", "firstname", "first"],
  lastName: ["last name", "lastname", "last"],
  name: ["name", "employee", "employee name"],
  role: ["role", "job role", "position", "title"],
  annualDueDate: ["annualduedate", "annual due date", "training due", "deadline"],
  completedHours: ["completedhours", "completed hours", "annual hours", "hours"],
  instructorLedHours: ["completediphours", "instructor led hours", "in person hours"],
  cprExpirationDate: ["cpr", "cpr expiration", "cpr expiration date"],
  firstAidExpirationDate: ["first aid", "first aid expiration", "first aid expiration date"],
  email: ["email", "email address"],
  phone: ["phone", "phone number"],
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function parseDelimited(text: string) {
  const delimiter = text.includes("\t") ? "\t" : ",";
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
    } else if (character === delimiter && !quoted) {
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

function findColumn(headers: string[], field: keyof typeof aliases) {
  return headers.findIndex((header) => aliases[field].includes(header));
}

function valueFor(record: string[], headers: string[], field: keyof typeof aliases) {
  const index = findColumn(headers, field);
  return index >= 0 ? record[index]?.trim() ?? "" : "";
}

function splitName(record: string[], headers: string[]) {
  const name = valueFor(record, headers, "name");
  const firstName = valueFor(record, headers, "firstName");
  const lastName = valueFor(record, headers, "lastName");

  if (firstName || lastName) {
    return { firstName, lastName };
  }

  const [first, ...rest] = name.split(/\s+/);
  return { firstName: first ?? "", lastName: rest.join(" ") };
}

export function parseWorkbookText(text: string) {
  const [rawHeaders, ...records] = parseDelimited(text);
  const headers = rawHeaders.map(normalizeHeader);
  const rows = records.map((record, index) => {
    const { firstName, lastName } = splitName(record, headers);
    const mapped = {
      firstName,
      lastName,
      email: valueFor(record, headers, "email"),
      phone: valueFor(record, headers, "phone"),
      role: valueFor(record, headers, "role") || "Caregiver",
      annualDueDate: valueFor(record, headers, "annualDueDate"),
      completedHours: valueFor(record, headers, "completedHours") || "0",
      instructorLedHours: valueFor(record, headers, "instructorLedHours") || "0",
      cprExpirationDate: valueFor(record, headers, "cprExpirationDate"),
      firstAidExpirationDate: valueFor(record, headers, "firstAidExpirationDate"),
    };
    const errors = [
      !mapped.firstName ? "Missing first name." : "",
      !mapped.lastName ? "Missing last name." : "",
      !mapped.role ? "Missing role." : "",
      !mapped.annualDueDate ? "Missing annual training due date." : "",
    ].filter(Boolean);

    return {
      rowNumber: index + 2,
      rawValues: Object.fromEntries(rawHeaders.map((header, headerIndex) => [header, record[headerIndex] ?? ""])),
      mapped,
      errors,
      status: errors.length ? "ERROR" : "READY",
    };
  });

  return {
    rows,
    rowCount: rows.length,
    validRowCount: rows.filter((row) => row.status === "READY").length,
    errorRowCount: rows.filter((row) => row.status === "ERROR").length,
  };
}
