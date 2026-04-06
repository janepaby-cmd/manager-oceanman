import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, AlertTriangle } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Category { id: string; name: string; type: string; budgeted_amount: number | null; }
interface Entry { id: string; category_id: string | null; date: string; amount: number; type: string; }

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

interface Props { projectId: string; }

export default function BudgetAnalysis({ projectId }: Props) {
  const { t } = useTranslation("budget");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: e }, { data: c }] = await Promise.all([
        supabase.from("budget_entries").select("id, category_id, date, amount, type").eq("project_id", projectId),
        supabase.from("budget_categories").select("id, name, type, budgeted_amount").eq("project_id", projectId),
      ]);
      if (e) setEntries(e as Entry[]);
      if (c) setCategories(c as Category[]);
      setLoading(false);
    };
    fetch();
  }, [projectId]);

  const totalIncome = entries.filter(e => e.type === "income").reduce((s, e) => s + Number(e.amount), 0);
  const totalExpenses = entries.filter(e => e.type === "expense").reduce((s, e) => s + Number(e.amount), 0);
  const netResult = totalIncome - totalExpenses;

  const hasBudgets = categories.some(c => c.budgeted_amount != null && c.budgeted_amount > 0);

  const totalDeviation = useMemo(() => {
    if (!hasBudgets) return 0;
    return categories.reduce((sum, cat) => {
      if (!cat.budgeted_amount) return sum;
      const actual = entries.filter(e => e.category_id === cat.id).reduce((s, e) => s + Number(e.amount), 0);
      return sum + (cat.budgeted_amount - actual);
    }, 0);
  }, [categories, entries, hasBudgets]);

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; income: number; expense: number }> = {};
    entries.forEach(e => {
      const m = e.date.substring(0, 7);
      if (!months[m]) months[m] = { month: m, income: 0, expense: 0 };
      months[m][e.type as "income" | "expense"] += Number(e.amount);
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  }, [entries]);

  // Category distribution
  const catDistribution = (type: string) => {
    const catMap: Record<string, number> = {};
    entries.filter(e => e.type === type).forEach(e => {
      const name = e.category_id ? (categories.find(c => c.id === e.category_id)?.name || "?") : t("entries.no_category");
      catMap[name] = (catMap[name] || 0) + Number(e.amount);
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  };

  // Cumulative
  const cumulativeData = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    let cum = 0;
    const pts: { date: string; value: number }[] = [];
    sorted.forEach(e => {
      cum += e.type === "income" ? Number(e.amount) : -Number(e.amount);
      pts.push({ date: e.date, value: cum });
    });
    return pts;
  }, [entries]);

  // Deviation
  const deviationData = useMemo(() => {
    return categories.filter(c => c.budgeted_amount != null && c.budgeted_amount > 0).map(cat => {
      const actual = entries.filter(e => e.category_id === cat.id).reduce((s, e) => s + Number(e.amount), 0);
      return { name: cat.name, budgeted: cat.budgeted_amount!, actual, deviation: cat.budgeted_amount! - actual };
    });
  }, [categories, entries]);

  if (loading) return <p className="text-center py-8 text-muted-foreground">{t("common:loading", "Cargando...")}</p>;

  if (entries.length === 0) {
    return <div className="border rounded-lg p-8 text-center text-muted-foreground">{t("analysis.no_data")}</div>;
  }

  const incomeDistData = catDistribution("income");
  const expenseDistData = catDistribution("expense");

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">{t("analysis.title")}</h3>

      {/* KPIs */}
      <div className={`grid gap-3 ${hasBudgets ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3"}`}>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-xs text-muted-foreground">{t("analysis.kpi_income")}</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">+{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <TrendingDown className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-xs text-muted-foreground">{t("analysis.kpi_expenses")}</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">-{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Activity className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">{t("analysis.kpi_result")}</p>
            <p className={`text-lg font-bold ${netResult >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {netResult >= 0 ? "+" : ""}{netResult.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </CardContent></Card>
        {hasBudgets && (
          <Card><CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-xs text-muted-foreground">{t("analysis.kpi_deviation")}</p>
              <p className={`text-lg font-bold ${totalDeviation >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {totalDeviation >= 0 ? t("analysis.surplus") : t("analysis.deficit")}: {Math.abs(totalDeviation).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent></Card>
        )}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Monthly bar */}
        {monthlyData.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t("analysis.chart_monthly")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="income" name={t("entries.type_income")} fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="expense" name={t("entries.type_expense")} fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Income donut */}
        {incomeDistData.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t("analysis.chart_income_dist")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={incomeDistData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {incomeDistData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Expense donut */}
        {expenseDistData.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t("analysis.chart_expense_dist")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={expenseDistData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {expenseDistData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Cumulative line */}
        {cumulativeData.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t("analysis.chart_cumulative")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" name={t("analysis.kpi_result")} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Deviation chart */}
      {hasBudgets && deviationData.length > 0 ? (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t("analysis.chart_deviation")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deviationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="budgeted" name={t("analysis.budgeted")} fill="#94a3b8" radius={[0,4,4,0]} />
                <Bar dataKey="actual" name={t("analysis.actual")} fill="hsl(var(--primary))" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : !hasBudgets && (
        <div className="border rounded-lg p-6 text-center text-muted-foreground text-sm">{t("analysis.no_budget_set")}</div>
      )}
    </div>
  );
}
