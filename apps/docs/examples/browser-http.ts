const apiBaseUrl = process.env.WHATTAX_API_BASE_URL ?? "http://127.0.0.1:4000";

export const calculateTakeHomePay = async (): Promise<unknown> => {
  const payload = JSON.parse(`{
    "facts": {
      "grossPay": {
        "_tag": "GrossPay",
        "amount": { "_tag": "Money", "cents": 346200, "currency": "AUD" },
        "period": "fortnightly"
      },
      "taxFreeThresholdClaimed": true
    },
    "jurisdiction": "AU",
    "taxYear": "2025-26"
  }`);

  const response = await fetch(
    `${apiBaseUrl}/api/v1/calculators/au.pay.take-home/calculate?help=errors`,
    {
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
      method: "POST",
    }
  );

  const body = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(body.error));
  }

  return body;
};

if (import.meta.main) {
  const body = await calculateTakeHomePay();

  console.log(JSON.stringify(body, null, 2));
}
