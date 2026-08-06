
# Identifier Rules

- Treat Zoho Creator record IDs as strings in JavaScript. They can exceed safe integer precision.
- Convert to Deluge `long` only at the controlled server-side point where Creator requires it.
- Treat Company Facility IDs and accounting identifiers with leading zeroes as text.
- Do not infer a display value from an internal lookup ID without retrieving the lookup record or using returned display values.
