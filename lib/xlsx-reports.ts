// Excel workbook builders for HR / inventory reports. Pure functions over
// plain data so they can be unit-tested in node without a session.
import ExcelJS from "exceljs";
import { daysInMonth, monthLabel } from "./hr-dates";
import { unitLabel } from "./inventory-units";

const FILL = {
	present: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9F2E1" } } as ExcelJS.Fill,
	late: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDEBC8" } } as ExcelJS.Fill,
	absent: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9D3D3" } } as ExcelJS.Fill,
	header: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } } as ExcelJS.Fill,
};

export interface AttendanceXlsxEmployee {
	fullName: string;
	/** date ("YYYY-MM-DD") -> { status, earlyLeave } */
	records: Record<string, { status: string; earlyLeave: boolean }>;
}

export function buildAttendanceWorkbook(month: string, employees: AttendanceXlsxEmployee[]): ExcelJS.Workbook {
	const wb = new ExcelJS.Workbook();
	wb.creator = "Fahad Al Sharq AC Systems LLC";
	const ws = wb.addWorksheet(`Attendance ${month}`, { views: [{ state: "frozen", xSplit: 1, ySplit: 4 }] });

	const days = daysInMonth(month);
	const totalCols = 1 + days.length + 4;

	// Title + legend
	ws.mergeCells(1, 1, 1, totalCols);
	const title = ws.getCell(1, 1);
	title.value = `Fahad Al Sharq AC Systems LLC — Attendance Sheet — ${monthLabel(month)}`;
	title.font = { bold: true, size: 13 };
	ws.mergeCells(2, 1, 2, totalCols);
	const legend = ws.getCell(2, 1);
	legend.value = "P = Present, L = Late, A = Absent, * = early leave";
	legend.font = { size: 9, color: { argb: "FF6B7280" } };

	// Header row (row 4)
	const headerRow = ws.getRow(4);
	headerRow.getCell(1).value = "Employee";
	days.forEach((d, i) => {
		headerRow.getCell(2 + i).value = Number(d.slice(8));
	});
	const totalsStart = 2 + days.length;
	["Present", "Late", "Absent", "'Other' leaves"].forEach((label, i) => {
		headerRow.getCell(totalsStart + i).value = label;
	});
	headerRow.eachCell((cell) => {
		cell.font = { bold: true, size: 9 };
		cell.fill = FILL.header;
		cell.alignment = { horizontal: "center" };
	});
	headerRow.getCell(1).alignment = { horizontal: "left" };

	// Data rows
	employees.forEach((emp, r) => {
		const row = ws.getRow(5 + r);
		row.getCell(1).value = emp.fullName;
		let present = 0;
		let late = 0;
		let absent = 0;
		let otherLeaves = 0;
		days.forEach((d, i) => {
			const rec = emp.records[d];
			if (!rec) return;
			const cell = row.getCell(2 + i);
			const letter = rec.status === "PRESENT" ? "P" : rec.status === "LATE" ? "L" : "A";
			cell.value = rec.earlyLeave ? `${letter}*` : letter;
			cell.alignment = { horizontal: "center" };
			cell.font = { size: 9, bold: true };
			cell.fill = rec.status === "PRESENT" ? FILL.present : rec.status === "LATE" ? FILL.late : FILL.absent;
			if (rec.status === "PRESENT") present++;
			else if (rec.status === "LATE") late++;
			else absent++;
			if (rec.earlyLeave) otherLeaves++;
		});
		row.getCell(totalsStart).value = present;
		row.getCell(totalsStart + 1).value = late;
		row.getCell(totalsStart + 2).value = absent;
		row.getCell(totalsStart + 3).value = otherLeaves;
		for (let i = 0; i < 4; i++) row.getCell(totalsStart + i).alignment = { horizontal: "center" };
	});

	// Column widths
	ws.getColumn(1).width = 26;
	for (let i = 0; i < days.length; i++) ws.getColumn(2 + i).width = 4;
	for (let i = 0; i < 4; i++) ws.getColumn(totalsStart + i).width = 12;

	return wb;
}

export interface UsageXlsxRow {
	buildingName: string;
	itemName: string;
	itemCode: string | null;
	category: string | null;
	unit: string;
	totalQuantity: number;
	timesUsed: number;
	estimatedCost: number | null; // null when no unit price is set
}

export function buildUsageWorkbook(rows: UsageXlsxRow[], rangeLabel: string): ExcelJS.Workbook {
	const wb = new ExcelJS.Workbook();
	wb.creator = "Fahad Al Sharq AC Systems LLC";
	const ws = wb.addWorksheet("Usage by Building", { views: [{ state: "frozen", ySplit: 4 }] });

	ws.mergeCells("A1:G1");
	ws.getCell("A1").value = `Fahad Al Sharq AC Systems LLC — Inventory Usage by Building`;
	ws.getCell("A1").font = { bold: true, size: 13 };
	ws.mergeCells("A2:G2");
	ws.getCell("A2").value = rangeLabel;
	ws.getCell("A2").font = { size: 9, color: { argb: "FF6B7280" } };

	const header = ws.getRow(4);
	["Building", "Item", "Code", "Category", "Quantity Used", "Times Used", "Est. Cost (AED)"].forEach((label, i) => {
		const cell = header.getCell(1 + i);
		cell.value = label;
		cell.font = { bold: true, size: 10 };
		cell.fill = FILL.header;
	});

	let r = 5;
	let lastBuilding: string | null = null;
	let grandCost = 0;
	for (const row of rows) {
		const wsRow = ws.getRow(r++);
		// Show the building name only on its first row, like a grouped report
		wsRow.getCell(1).value = row.buildingName === lastBuilding ? "" : row.buildingName;
		if (row.buildingName !== lastBuilding) wsRow.getCell(1).font = { bold: true };
		lastBuilding = row.buildingName;
		wsRow.getCell(2).value = row.itemName;
		wsRow.getCell(3).value = row.itemCode ?? "";
		wsRow.getCell(4).value = row.category ?? "";
		wsRow.getCell(5).value = `${Number(row.totalQuantity.toFixed(2))} ${unitLabel(row.unit)}`;
		wsRow.getCell(6).value = row.timesUsed;
		if (row.estimatedCost !== null) {
			wsRow.getCell(7).value = Number(row.estimatedCost.toFixed(2));
			grandCost += row.estimatedCost;
		}
	}

	const totalRow = ws.getRow(r + 1);
	totalRow.getCell(4).value = "Total estimated cost:";
	totalRow.getCell(4).font = { bold: true };
	totalRow.getCell(7).value = Number(grandCost.toFixed(2));
	totalRow.getCell(7).font = { bold: true };

	ws.getColumn(1).width = 28;
	ws.getColumn(2).width = 30;
	ws.getColumn(3).width = 14;
	ws.getColumn(4).width = 16;
	ws.getColumn(5).width = 16;
	ws.getColumn(6).width = 12;
	ws.getColumn(7).width = 16;

	return wb;
}

export async function workbookToBase64(wb: ExcelJS.Workbook): Promise<string> {
	const buffer = await wb.xlsx.writeBuffer();
	return Buffer.from(buffer).toString("base64");
}

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
