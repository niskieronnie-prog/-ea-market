# Partner webhook
`POST https://YOUR-DOMAIN/api/webhooks/<partner>`  (partner = lowercase letters/digits/_ ; env `WEBHOOK_SECRET_<PARTNER>` must exist)

Headers: `x-timestamp` = unix seconds, `x-signature` = hex HMAC-SHA256 of `"<timestamp>.<raw body>"` with the shared secret.
Timestamps older/newer than 5 minutes are rejected. `event_id` must be unique per event (replays are ignored).

Conversion: `{"type":"conversion","event_id":"evt_000001","external_id":"order-123","link_code":"a1b2c3d4e5f6","amount_minor":120000,"currency":"UGX"}`
Refund:     `{"type":"refund","event_id":"evt_000002","external_id":"order-123"}`

Commission is created only if: valid link with an ACTIVE campaign, same currency, a click within the campaign's attribution window,
and budget remaining. Otherwise the conversion is recorded and the reason returned. `amount_minor` is in minor units (UGX/TZS/RWF have none).

Test signature in PowerShell:
```powershell
$secret="<YOUR 32+ CHAR SECRET>"; $ts=[int][double]::Parse((Get-Date -UFormat %s)); 
$body='{"type":"conversion","event_id":"evt_000001","external_id":"order-1","link_code":"a1b2c3d4e5f6","amount_minor":120000,"currency":"UGX"}'
$h=New-Object System.Security.Cryptography.HMACSHA256; $h.Key=[Text.Encoding]::UTF8.GetBytes($secret)
$sig=($h.ComputeHash([Text.Encoding]::UTF8.GetBytes("$ts.$body"))|ForEach-Object{$_.ToString("x2")}) -join ""
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/webhooks/partner -Headers @{"x-timestamp"="$ts";"x-signature"=$sig} -ContentType "application/json" -Body $body
```
Important: only enable this for partners whose reports you trust. A seller reporting their own sales is NOT independent verification.
