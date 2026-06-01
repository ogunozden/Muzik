# Threat Model: References Read-Only Snapshot

The scanned diff moves `/references` from a purely token-refreshed client page to a server-rendered read-only snapshot. The primary risk is accidental disclosure of operator-only staged source data or weakening the ops-token boundary. The changed server page reads only three fixed artifact files and sanitizes inbox/mapping rows before hydration. The extracted client dashboard retains the existing token header behavior for refresh and write operations.
