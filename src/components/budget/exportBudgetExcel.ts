import * as XLSX from "xlsx";

interface Category { id: string; name: string; type: string; budgeted_amount?: number | null; }
interface Entry {
  id: string; category_id: string | null; date: string;
  concept: string; amount: number; type: string; status: string;
}

interface Labels {
  date: string; category: string; concept: string; amount: string; status: string;
  income: string; expenses: string; netResult: string; noCategory: string;
  statusLabel: (s: string) => string;
  sheetBudget: string; sheetAnalysis: string;
  kpiIncome: string; kpiExpenses: string; kpiResult: string;
  byCategory: string; month: string; total: string;
}

function fmt(n: number) {
  return Math.round(n * 100) / 100;
}

export function exportBudgetExcel(
  entries: Entry[],
  categories: Category[],
  labels: Labels,
  fileName: string,
) {
  const catMap: Record<string, string> = Object.fromEntries(categories.map(c => [c.id, c.name]));
  const catName = (id: string | null) => (id ? catMap[id] || labels.noCategory : labels.noCategory);

  const income = entries.filter(e => e.type === "income").sort((a, b) => a.date.localeCompare(b.date));
  const expense = entries.filter(e => e.type === "expense").sort((a, b) => a.date.localeCompare(b.date));
  const totalIncome = income.reduce((s, e) => s + Number(e.amount), 0);
  const totalExpenses = expense.reduce((s, e) => s + Number(e.amount), 0);
  const net = totalIncome - totalExpenses;

  const header = [labels.date, labels.category, labels.concept, labels.amount, labels.status];
  const rows: (string | number)[][] = [];

  rows.push([labels.income.toUpperCase()]);
  rows.push(header);
  income.forEach(e => rows.push([e.date, catName(e.category_id), e.concept, fmt(Number(e.amount)), labels.statusLabel(e.status)]));
  rows.push([labels.income, "", "", fmt(totalIncome), ""]);
  rows.push([]);

  rows.push([labels.expenses.toUpperCase()]);
  rows.push(header);
  expense.forEach(e => rows.push([e.date, catName(e.category_id), e.concept, fmt(Number(e.amount)), labels.statusLabel(e.status)]));
  rows.push([labels.expenses, "", "", fmt(totalExpenses), ""]);
  rows.push([]);

  rows.push([labels.netResult, "", "", fmt(net), ""]);

  const wsBudget = XLSX.utils.aoa_to_sheet(rows);
  wsBudget["!cols"] = [{ wch: 12 }, { wch: 24 }, { wch: 40 }, { wch: 14 }, { wch: 14 }];

  // Analysis sheet
  const analysis: (string | number)[][] = [];
  analysis.push([labels.sheetAnalysis]);
  analysis.push([]);
  analysis.push([labels.kpiIncome, fmt(totalIncome)]);
  analysis.push([labels.kpiExpenses, fmt(totalExpenses)]);
  analysis.push([labels.kpiResult, fmt(net)]);
  analysis.push([]);

  const distribution = (type: string) => {
    const map: Record<string, number> = {};
    entries.filter(e => e.type === type).forEach(e => {
      const name = catName(e.category_id);
      map[name] = (map[name] || 0) + Number(e.amount);
    });
    return Object.entries(map);
  };

  analysis.push([`${labels.income} — ${labels.byCategory}`]);
  analysis.push([labels.category, labels.total]);
  distribution("income").forEach(([n, v]) => analysis.push([n, fmt(v)]));
  analysis.push([]);
  analysis.push([`${labels.expenses} — ${labels.byCategory}`]);
  analysis.push([labels.category, labels.total]);
  distribution("expense").forEach(([n, v]) => analysis.push([n, fmt(v)]));
  analysis.push([]);

  // Monthly
  const months: Record<string, { income: number; expense: number }> = {};
  entries.forEach(e => {
    const m = e.date.substring(0, 7);
    if (!months[m]) months[m] = { income: 0, expense: 0 };
    months[m][e.type as "income" | "expense"] += Number(e.amount);
  });
  analysis.push([labels.month, labels.income, labels.expenses, labels.netResult]);
  Object.keys(months).sort().forEach(m => {
    const d = months[m];
    analysis.push([m, fmt(d.income), fmt(d.expense), fmt(d.income - d.expense)]);
  });

  const wsAnalysis = XLSX.utils.aoa_to_sheet(analysis);
  wsAnalysis["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsBudget, labels.sheetBudget);
  XLSX.utils.book_append_sheet(wb, wsAnalysis, labels.sheetAnalysis);
  XLSX.writeFile(wb, fileName);
}
