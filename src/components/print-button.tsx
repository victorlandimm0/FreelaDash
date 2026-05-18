"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

type PrintButtonProps = {
  invoiceId: number;
  status: "draft" | "sent" | "paid";
};

export function PrintButton({ invoiceId, status }: PrintButtonProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function markAsSent() {
    setIsSaving(true);
    const response = await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent" })
    });

    setIsSaving(false);

    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => window.print()}>
        <Printer className="h-4 w-4" aria-hidden="true" />
        Exportar PDF
      </Button>
      {status === "draft" && (
        <Button variant="secondary" onClick={markAsSent} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          Marcar como enviada
        </Button>
      )}
    </div>
  );
}
