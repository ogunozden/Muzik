# Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| Research source profile registry | Provider policy, HTTPS URL safety | No issue found | Internet Archive is configured as a central HTTPS archive profile. |
| Candidate review validation | Unsafe promotion, confidence drift | No issue found | `needs-context` is accepted only for review-only rows, not auto-attached references. |
| Generated coverage artifacts | Count drift, profile drift, accidental accepted source evidence | No issue found | Summary and validation report 5 profiles, 14,890 review rows, and 7 accepted references. |
| Browser evidence | Operator UI truthfulness | No issue found | UI shows archive profile and larger review queue while accepted auto-attach remains unchanged. |
