# Custom Deluge Functions

| Function | Returns | Parameters | Detected forms |
| --- | --- | --- | --- |
| applyBudgetTrackFinalState | string | 3 | Add_Budget, Budget_Category, Budget_Item |
| buildForecastManagerSummary | string | 1 | Forecast, Subdivision, Takedown_Schedule |
| Claim_Proforma | string | 2 | Add_Pro_Forma, User_Access |
| createBudgetAttachmentRecord | string | 1 | Add_Budget, Contract_Version |
| createBuilderTakedown | void | 1 | Builder_Takedown, Takedown_Template |
| createContract | void | 1 | Builder_Takedown, Subdivision |
| createTaxtable | void | 1 |  |
| createTaxTemplate | void | 1 |  |
| Create_LOI_Contract | string | 1 | Add_Pro_Forma, Company, Contract, Contract_Version |
| defaultFunction | void | 1 |  |
| deleteBudgetAttachment | string | 2 | Contract_Version |
| exportBudgetSnapshot | string | 2 | Add_Budget, Budget_Approvals, Budget_Category, Budget_Item, Contract_Version |
| forLoop | list | 2 |  |
| formStyle | string | 0 |  |
| generateApprovedBudgetPDF | string | 1 |  |
| getBudgetAttachmentPreview | string | 2 | Contract_Version |
| getUserAccess | string | 1 | Add_Pro_Forma, User_Access |
| handleApprovalAction | string | 4 | Add_Budget, Budget_Approvals, Budget_Category, Budget_Item |
| Handle_Proforma_Approval_Action | map | 4 | Add_Pro_Forma, Budget_Approvals |
| killApprovalChain | string | 2 | Add_Budget, Budget_Approvals, Budget_Category, Budget_Item |
| killApprovalFlow | string | 1 | Add_Budget, Budget_Approvals, Budget_Category, Budget_Item |
| Kill_Proforma_Approval_Flow | map | 1 | Add_Pro_Forma, Budget_Approvals |
| Manage_Proforma_Approval_Config | map | 6 | Add_Pro_Forma, Budget_Approvals |
| massCreateforecasts | void | 1 | Builder_Takedown |
| massUpdate | void | 1 | Builder_Takedown |
| massUpdatetax | void | 1 | Builder_Takedown |
| openBudget | void | 1 | Add_Budget |
| PF_Build_Proforma_Approval_PDF | map | 2 | Add_Pro_Forma, Budget_Approvals, Builder, Company, LOI_Worksheet, Proforma_Item |
| PF_Get_Proforma_LOI_Snapshot | map | 1 | Add_Pro_Forma, Builder, Company, LOI_Worksheet, Property |
| PF_Packet_Escape | string | 1 |  |
| PF_Packet_Money | string | 1 |  |
| PF_Packet_Number | string | 2 |  |
| PF_PDF_Clean | string | 1 |  |
| PF_PDF_Compile | string | 2 |  |
| PF_PDF_Line | string | 6 |  |
| PF_PDF_Rect | string | 7 |  |
| PF_PDF_Text | string | 6 |  |
| PF_PDF_Wrap | list | 2 |  |
| proforma_save | string | 1 | Add_Pro_Forma, Builder, Company, Construction_Curve, LOI_Worksheet, Land_Installments |
| reportProformaWidgetError | string | 1 |  |
| Review_LOI_Request | string | 4 | Add_Pro_Forma |
| sendApprovalEmail | string | 2 | Add_Budget, Budget_Approvals |
| Send_Proforma_Approval_Email | map | 2 |  |
| Send_Proforma_Approval_Email_With_Context | map | 5 | Add_Pro_Forma, Budget_Approvals |
| setProjectProforma | string | 2 | Add_Pro_Forma, Project |
| startAllApprovalChains | string | 1 |  |
| startApprovalChain | string | 2 | Add_Budget, Budget_Approvals, Budget_Category, Budget_Item |
| Start_Proforma_Approval_Chain | map | 1 | Add_Pro_Forma, Budget_Approvals |
| Submit_LOI_For_Legal_Approval | string | 1 | Add_Pro_Forma, Company |
| syncBudgetApprovalStatus | string | 2 | Add_Budget |
| Update_Proforma_Approval_Recipient | map | 1 | Budget_Approvals |
| utilitiesconvertIntegerToCurrency | string | 1 |  |
| utilitiesmakeRange | list | 2 |  |
