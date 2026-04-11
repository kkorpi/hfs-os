// @ts-nocheck
import { getInvoiceByToken, getSettingsPublic } from "@/lib/actions";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePDF } from "@/lib/invoice-pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const [data, settings] = await Promise.all([
    getInvoiceByToken(token),
    getSettingsPublic(),
  ]);

  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const { invoice, client, lineItems } = data;

  const buffer = await renderToBuffer(
    <InvoicePDF invoice={invoice} client={client} lineItems={lineItems} settings={settings} />
  );

  const filename = `${invoice.number || "invoice"}.pdf`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
