type TransactionExportRow = {
  reference: string;
  type: string;
  amount: number | string;
  status: string;
  createdAt: string;
  wallet?: { user?: { email?: string | null } | null } | null;
  description?: string | null;
};

function formatAmount(amount: number | string) {
  return Number(amount).toLocaleString();
}

export function transactionsToCsv(rows: TransactionExportRow[]) {
  const header = ["Reference", "Type", "User", "Amount (GHS)", "Status", "Date"];
  const body = rows.map((row) => [
    row.reference,
    row.type,
    row.wallet?.user?.email ?? "—",
    formatAmount(row.amount),
    row.status,
    new Date(row.createdAt).toLocaleString(),
  ]);
  return [header, ...body]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function downloadTransactionCsv(csv: string, filename: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadTransactionPdf(rows: TransactionExportRow[], filename: string) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("PayForMe — Transaction history", 14, 16);
  doc.setFontSize(10);
  doc.text(`Exported ${new Date().toLocaleString()} · ${rows.length} records`, 14, 23);

  autoTable(doc, {
    startY: 28,
    head: [["Reference", "Type", "User", "Amount (GHS)", "Status", "Date"]],
    body: rows.map((row) => [
      row.reference,
      row.type,
      row.wallet?.user?.email ?? "—",
      formatAmount(row.amount),
      row.status,
      new Date(row.createdAt).toLocaleString(),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [5, 150, 105] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(filename);
}

export function transactionExportFilename(prefix: string, extension: string) {
  const date = new Date().toISOString().slice(0, 10);
  return `payrent-${prefix}-${date}.${extension}`;
}
