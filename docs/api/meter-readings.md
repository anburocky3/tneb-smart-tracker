# TNEB Meter Readings API Documentation

This API allows third-party applications (e.g., house-rent management apps) to securely retrieve electricity meter readings and billing data for a specific consumer.

## Endpoint

`GET /api/meter-readings`

## Authentication & Authorization

Access is granted based on the pairing of a **Consumer Number** and a **Token ID**. These must match a connection previously linked within the Minnal system.

### Request Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `consumerNo` | `string` | Yes | The TNEB Consumer Number. |
| `tokenID` | `string` | Yes | The unique TNEB Token ID associated with the consumer. |

## Response Format

### Success Response (`200 OK`)

```json
{
  "success": true,
  "timestamp": "2026-09-17T10:00:00Z",
  "data": {
    "consumer": {
      "consumerNo": "09049...",
      "name": "John Doe",
      "address": "...",
      "region": "...",
      "circle": "...",
      "section": "...",
      "distribution": "...",
      "phase": "...",
      "meterNumber": "...",
      "serviceStatus": "...",
      "sanctionedLoad": "...",
      "reducedLoad": "...",
      "aadhaarStatus": "Updated",
      "panStatus": "Updated"
    },
    "latestReading": {
      "date": "21/07/2026",
      "kwhReading": 12345,
      "units": 150,
      "amount": 1200,
      "dueDate": "05/08/2026",
      "paidDate": "02/08/2026",
      "receiptNo": "REC123456",
      "isPaid": true,
      "rawDate": 1721000000000
    },
    "billingHistory": [
      { "date": "...", "units": 150, "amount": 1200, "...": "..." },
      { "date": "...", "units": 140, "amount": 1100, "...": "..." }
    ],
    "slabRates": [
      { "from": "0", "to": "100", "rate": "...", "maxLimit": "..." }
    ]
  }
}
```

### Error Responses

| Status Code | Meaning | Description |
| :--- | :--- | :--- |
| `400 Bad Request` | Missing Parameters | One or both of `consumerNo` or `tokenID` are missing. |
| `401 Unauthorized` | Invalid Credentials | The `consumerNo` and `tokenID` pair does not exist in our records. |
| `500 Internal Server Error` | Server Error | An error occurred while scraping TNEB data. |

## Security & Rate Limiting

- **Authorization**: Requests are validated against the `tneb_connections` database.
- **Rate Limiting**: (Implemented at Infrastructure Level) To prevent abuse, this API is rate-limited. If you encounter a `429 Too Many Requests` error, please reduce the frequency of your calls.
- **Versioning**: Currently at `v1`. Future versions will be prefixed in the URL (e.g., `/api/v2/meter-readings`).
