import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/usePermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Users, Truck, Settings } from "lucide-react";
import IssuedInvoicesList from "./IssuedInvoicesList";
import ReceivedInvoicesList from "./ReceivedInvoicesList";
import ClientsList from "./ClientsList";
import SuppliersList from "./SuppliersList";
import InvoiceConfig from "./InvoiceConfig";

interface Props {
  projectId: string;
}

export default function InvoiceModule({ projectId }: Props) {
  const { t } = useTranslation("invoices");
  const { can } = usePermissions();
  const canReadContacts = can("read", "contacts");
  const canReadTaxes = can("read", "taxes");

  return (
    <div className="space-y-4">
      <Tabs defaultValue="issued" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="issued" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5" />
            <span>{t("sections.issued")}</span>
          </TabsTrigger>
          <TabsTrigger value="received" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5" />
            <span>{t("sections.received")}</span>
          </TabsTrigger>
          {canReadContacts && (
            <TabsTrigger value="clients" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5" />
              <span>{t("sections.clients")}</span>
            </TabsTrigger>
          )}
          {canReadContacts && (
            <TabsTrigger value="suppliers" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Truck className="h-3.5 w-3.5" />
              <span>{t("sections.suppliers")}</span>
            </TabsTrigger>
          )}
          {canReadTaxes && (
            <TabsTrigger value="config" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Settings className="h-3.5 w-3.5" />
              <span>{t("sections.configuration")}</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="issued">
          <IssuedInvoicesList projectId={projectId} />
        </TabsContent>
        <TabsContent value="received">
          <ReceivedInvoicesList projectId={projectId} />
        </TabsContent>
        {canReadContacts && (
          <TabsContent value="clients">
            <ClientsList />
          </TabsContent>
        )}
        {canReadContacts && (
          <TabsContent value="suppliers">
            <SuppliersList />
          </TabsContent>
        )}
        {canReadTaxes && (
          <TabsContent value="config">
            <InvoiceConfig projectId={projectId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
