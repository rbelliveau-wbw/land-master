
# Proforma LOI Field Save Mismatch

## Problem

LOI values entered in the widget were missing from saved records or approval snapshots.

## Prevention

Validate every payload key against `creator/generated/fields/Add_Pro_Forma.json`, verify lookup payload shapes, and test create and edit paths separately. Keep the approval snapshot fields synchronized with the save contract.
