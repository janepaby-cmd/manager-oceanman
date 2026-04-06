import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  companyBlock: { maxWidth: "50%" },
  companyName: { fontSize: 14, fontWeight: "bold", marginBottom: 4 },
  label: { color: "#666", fontSize: 8, marginBottom: 2 },
  value: { marginBottom: 4 },
  invoiceTitle: { fontSize: 18, fontWeight: "bold", textAlign: "right" },
  invoiceNumber: { fontSize: 12, textAlign: "right", marginTop: 4 },
  invoiceDate: { fontSize: 9, textAlign: "right", color: "#666", marginTop: 2 },
  clientBox: { backgroundColor: "#f5f5f5", padding: 12, borderRadius: 4, marginBottom: 20 },
  clientLabel: { fontSize: 8, color: "#999", marginBottom: 4 },
  clientName: { fontSize: 12, fontWeight: "bold", marginBottom: 2 },
  table: { marginBottom: 20 },
  tableHeader: { flexDirection: "row", backgroundColor: "#333", color: "#fff", padding: 6 },
  tableRow: { flexDirection: "row", padding: 6, borderBottomWidth: 1, borderBottomColor: "#eee" },
  colConcept: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.5, textAlign: "right" },
  colTax: { flex: 1.5, textAlign: "right" },
  colTotal: { flex: 1.5, textAlign: "right" },
  thText: { color: "#fff", fontSize: 8, fontWeight: "bold" },
  totalsBox: { alignSelf: "flex-end", width: 250 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalLabel: { fontSize: 10 },
  totalValue: { fontSize: 10, fontWeight: "bold" },
  grandTotal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderTopWidth: 2, borderTopColor: "#333", marginTop: 4 },
  grandTotalLabel: { fontSize: 13, fontWeight: "bold" },
  grandTotalValue: { fontSize: 13, fontWeight: "bold" },
  notes: { marginTop: 20, padding: 10, backgroundColor: "#fafafa", borderRadius: 4, fontSize: 9, color: "#555" },
});

interface Props {
  config: any;
  client: any;
  invoice: { number: string; issue_date: string; due_date?: string; notes?: string; subtotal: number; tax_total: number; total: number };
  lines: { concept: string; quantity: number; unit_price: number; tax_id: string; line_total: number }[];
  taxBreakdown: { name: string; type: string; rate: number; amount: number }[];
  taxes: any[];
}

export default function InvoicePdf({ config, client, invoice, lines, taxBreakdown, taxes }: Props) {
  const getTaxName = (taxId: string) => {
    const t = taxes.find(tx => tx.id === taxId);
    return t ? `${t.name} (${t.rate}%)` : "";
  };

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.companyBlock}>
            {config?.company_name && <Text style={s.companyName}>{config.company_name}</Text>}
            {config?.company_tax_id && <><Text style={s.label}>CIF/NIF</Text><Text style={s.value}>{config.company_tax_id}</Text></>}
            {config?.company_address && <Text style={s.value}>{config.company_address}</Text>}
            {config?.company_email && <Text style={s.value}>{config.company_email}</Text>}
          </View>
          <View>
            <Text style={s.invoiceTitle}>FACTURA</Text>
            <Text style={s.invoiceNumber}>{invoice.number}</Text>
            <Text style={s.invoiceDate}>Fecha: {invoice.issue_date}</Text>
            {invoice.due_date && <Text style={s.invoiceDate}>Vencimiento: {invoice.due_date}</Text>}
          </View>
        </View>

        {/* Client */}
        <View style={s.clientBox}>
          <Text style={s.clientLabel}>CLIENTE</Text>
          <Text style={s.clientName}>{client?.name || ""}</Text>
          {client?.tax_id && <Text style={s.value}>CIF/NIF: {client.tax_id}</Text>}
          {client?.address && <Text style={s.value}>{[client.address, client.city, client.zip, client.country].filter(Boolean).join(", ")}</Text>}
          {client?.email && <Text style={s.value}>{client.email}</Text>}
        </View>

        {/* Table */}
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.thText, s.colConcept]}>Concepto</Text>
            <Text style={[s.thText, s.colQty]}>Cant.</Text>
            <Text style={[s.thText, s.colPrice]}>P. Unit.</Text>
            <Text style={[s.thText, s.colTax]}>Impuesto</Text>
            <Text style={[s.thText, s.colTotal]}>Total</Text>
          </View>
          {lines.map((line, i) => (
            <View key={i} style={s.tableRow}>
              <Text style={s.colConcept}>{line.concept}</Text>
              <Text style={s.colQty}>{line.quantity}</Text>
              <Text style={s.colPrice}>{Number(line.unit_price).toFixed(2)} €</Text>
              <Text style={s.colTax}>{line.tax_id ? getTaxName(line.tax_id) : "—"}</Text>
              <Text style={s.colTotal}>{line.line_total.toFixed(2)} €</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totalsBox}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Base imponible</Text>
            <Text style={s.totalValue}>{invoice.subtotal.toFixed(2)} €</Text>
          </View>
          {taxBreakdown.map((tb, i) => (
            <View key={i} style={s.totalRow}>
              <Text style={s.totalLabel}>{tb.name} ({tb.rate}%)</Text>
              <Text style={s.totalValue}>{tb.type === "deduction" ? "-" : ""}{tb.amount.toFixed(2)} €</Text>
            </View>
          ))}
          <View style={s.grandTotal}>
            <Text style={s.grandTotalLabel}>TOTAL</Text>
            <Text style={s.grandTotalValue}>{invoice.total.toFixed(2)} €</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={s.notes}>
            <Text>{invoice.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
