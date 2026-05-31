import { aud } from "@whattax/core/primitives";
import { GrossPay } from "@whattax/rules-au-pay";
import { au } from "@whattax/sdk/au";

export const handlePayPreview = async (request: Request): Promise<Response> => {
  const body: {
    readonly grossPayCents: number;
    readonly period: "fortnightly" | "monthly" | "weekly";
    readonly taxFreeThresholdClaimed: boolean;
  } = await request.json();

  const report = await au.pay.takeHomePay({
    grossPay: new GrossPay({
      amount: aud(body.grossPayCents),
      period: body.period,
    }),
    taxFreeThresholdClaimed: body.taxFreeThresholdClaimed,
  });

  return Response.json({
    netPayCents: report.netPay.cents,
    withholdingsCents: report.withholdingsTotal.cents,
  });
};

if (import.meta.main) {
  const response = await handlePayPreview(
    new Request("http://localhost/pay-preview", {
      body: JSON.stringify({
        grossPayCents: 165_400,
        period: "weekly",
        taxFreeThresholdClaimed: true,
      }),
      method: "POST",
    })
  );

  console.log(await response.text());
}
