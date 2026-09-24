# DEV `RUN_EVERYTHING_ON_SUCCESS` phase-sales branches

The live Development workflow has 13 actions. Only actions 1 (phase builder), 2
(month builder), 3 (lot sales), and 12 (totals) gained a version-2 branch. Their
existing version-1 bodies remain inside `else` unchanged. This is a source
mirror of the new branch, not a deployable replacement for the full workflow.
The legacy full workflow in `creator/raw/workflow-section.ds` is an older export;
refresh it from Creator before using it to deploy to any other environment.

## 1. Phase builder

```deluge
if(ifnull(input.Lot_Sales_Schedule_Version,0).toLong() == 2)
{
    phaseCount = ifnull(input.Phases,0).toLong();
    phaseRows = Proforma_Phase[Pro_Forma == input.ID] sort by Phase;
    if(phaseCount < 1 || phaseRows.count() != phaseCount)
    {
        throw "Phase schedule needs exactly one row per active phase.";
    }
    engDelay = ifnull(input.Engineering_Delay_Months,0).toLong();
    engLength = ifnull(input.Engineering_Length_Months,0).toLong();
    constDelay = ifnull(input.Construction_Delay_Months,0).toLong();
    constLength = ifnull(input.Construction_Length,0).toLong();
    if(engDelay < 0 || constDelay < 0 || engLength < 1 || constLength < 1 || ifnull(input.Lots,0) < 1)
    {
        throw "Project lots, engineering, and construction inputs are invalid.";
    }
    phaseNo = 1;
    allocated = 0;
    previousFinal = 0;
    for each ph in phaseRows
    {
        lots = ifnull(ph.Total_Lots,0).toLong();
        initial = ifnull(ph.Initial_Take_Lots,0).toLong();
        delay = ifnull(ph.Initial_Delay_Months,0).toLong();
        remaining = lots - initial;
        firstDelay = ifnull(ph.First_Recurring_Delay_Months,0).toLong();
        perTake = ifnull(ph.Lots_Per_Take,0).toLong();
        frequency = ifnull(ph.Take_Frequency,"").toString();
        step = 1;
        if(frequency == "Quarterly")
        {
            step = 3;
        }
        else if(frequency != "Monthly")
        {
            throw "Phase " + phaseNo + " needs a Monthly or Quarterly frequency.";
        }
        if(ifnull(ph.Phase,0).toLong() != phaseNo || lots < 1 || initial < 1 || initial > lots || delay < 0)
        {
            throw "Phase " + phaseNo + " has invalid lot allocation, initial take, or delay.";
        }
        if(remaining > 0)
        {
            if(firstDelay < 1 || perTake < 1)
            {
                throw "Phase " + phaseNo + " needs a positive recurring delay and lots per take.";
            }
        }
        rate = ifnull(ph.Annual_Escalator_Pct,0).toDecimal();
        if(rate < 0)
        {
            throw "Phase " + phaseNo + " annual escalator cannot be negative.";
        }
        if(ifnull(ph.Escalator_Enabled,false) == true && rate > 0 && ph.Esc_Start_Date == null)
        {
            throw "Phase " + phaseNo + " needs an escalator start date.";
        }
        if(phaseNo == 1)
        {
            engStart = engDelay + 1;
            engEnd = engStart + engLength - 1;
            constStart = engEnd + constDelay + 1;
            constEnd = constStart + constLength - 1;
        }
        else
        {
            constEnd = previousFinal;
            constStart = constEnd - constLength + 1;
            engEnd = constStart - constDelay - 1;
            engStart = engEnd - engLength + 1;
            if(engStart < 1)
            {
                throw "Phase " + phaseNo + " engineering would start before project month 1.";
            }
        }
        saleStart = constEnd + 1 + delay;
        saleEnd = saleStart;
        if(remaining > 0)
        {
            recurringCount = ceil(remaining / perTake);
            saleEnd = saleStart + firstDelay + (recurringCount - 1) * step;
        }
        if(saleEnd > 600)
        {
            throw "Phase " + phaseNo + " ends after the 600-month limit.";
        }
        ph.Acres = input.Total_Acres * lots / input.Lots;
        ph.Eng_Start_Month = engStart;
        ph.Eng_End_Month = engEnd;
        ph.Const_Start_Month = constStart;
        ph.Const_End_Month = constEnd;
        ph.Lot_Sale_Start_Month = saleStart;
        ph.Lot_Closing_Length = saleEnd - saleStart + 1;
        ph.Lot_Sale_End_Month = saleEnd;
        previousFinal = saleEnd;
        allocated = allocated + lots;
        phaseNo = phaseNo + 1;
    }
    if(allocated != input.Lots)
    {
        throw "Phase allocations must equal project lots; allocated " + allocated + " of " + input.Lots + ".";
    }
}
```

## 2. Month builder

```deluge
if(ifnull(input.Lot_Sales_Schedule_Version,0).toLong() == 2)
{
    phaseRows = Proforma_Phase[Pro_Forma == input.ID] sort by Phase;
    firstPhase = Proforma_Phase[Pro_Forma == input.ID && Phase == 1];
    lastPhase = Proforma_Phase[Pro_Forma == input.ID && Phase == input.Phases];
    if(firstPhase == null || lastPhase == null || input.Estimated_Purchase_Date == null)
    {
        throw "Phase schedule or estimated purchase date is missing.";
    }
    endMo = ifnull(lastPhase.Lot_Sale_End_Month,0).toLong();
    maxInstallment = Land_Installments[Pro_Forma == input.ID || Pro_Forma2 == input.ID || Pro_Forma_PID_MUD == input.ID].maximum(Month1);
    if(maxInstallment != null && maxInstallment > endMo)
    {
        endMo = maxInstallment;
    }
    for each costItem in Proforma_Item[Pro_Forma_Const == input.ID || Pro_Forma_Dev == input.ID]
    {
        specificText = ifnull(costItem.Specific_Months_List,"");
        specificTokens = specificText.toList(",");
        for each token in specificTokens
        {
            value = token.trim();
            if(value.isNumber() && value.toLong() > endMo)
            {
                endMo = value.toLong();
            }
        }
        if(ifnull(costItem.Start_Month,0) > endMo)
        {
            endMo = costItem.Start_Month;
        }
        if(ifnull(costItem.End_Month,0) > endMo)
        {
            endMo = costItem.End_Month;
        }
    }
    for each ph in phaseRows
    {
        if(ph.Eng_End_Month > endMo)
        {
            endMo = ph.Eng_End_Month;
        }
        if(ph.Const_End_Month > endMo)
        {
            endMo = ph.Const_End_Month;
        }
    }
    if(endMo < 1 || endMo > 600)
    {
        throw "The phase schedule must end within project months 1 through 600.";
    }
    delete from Proforma_Months[Proforma == input.ID];
    input.Takedown_Start_Month = firstPhase.Lot_Sale_Start_Month;
    input.Estimated_Lot_Sale_Start = input.Estimated_Purchase_Date.addMonth(firstPhase.Lot_Sale_Start_Month - 1);
    input.Estimated_Completion = input.Estimated_Purchase_Date.addMonth(endMo - 1);
    monthNo = 1;
    for each dummy in thisapp.forLoop(1,endMo)
    {
        rowDate = input.Estimated_Purchase_Date.addMonth(monthNo - 1);
        activeCount = 0;
        for each ph in phaseRows
        {
            constPhase = null;
            engPhase = null;
            if(ph.Const_Start_Month <= monthNo && ph.Const_End_Month >= monthNo)
            {
                constPhase = ph.Phase;
            }
            if(ph.Eng_Start_Month <= monthNo && ph.Eng_End_Month >= monthNo)
            {
                engPhase = ph.Phase;
            }
            if(constPhase != null || engPhase != null)
            {
                isMaster = false;
                if(activeCount == 0)
                {
                    isMaster = true;
                }
                insert into Proforma_Months
                [
                    Proforma=input.ID
                    Date1=rowDate
                    Month1=monthNo
                    Const_Phase=constPhase
                    Eng_Phase=engPhase
                    Master_Month=isMaster
                    Added_User=zoho.loginuser
                ];
                activeCount = activeCount + 1;
            }
        }
        if(activeCount == 0)
        {
            insert into Proforma_Months
            [
                Proforma=input.ID
                Date1=rowDate
                Month1=monthNo
                Master_Month=true
                Added_User=zoho.loginuser
            ];
        }
        monthNo = monthNo + 1;
    }
}
```

## 3. Lot-sales events

```deluge
if(ifnull(input.Lot_Sales_Schedule_Version,0).toLong() == 2)
{
    totalSold = 0;
    phaseRows = Proforma_Phase[Pro_Forma == input.ID] sort by Phase;
    for each ph in phaseRows
    {
        lots = ifnull(ph.Total_Lots,0).toLong();
        initial = ifnull(ph.Initial_Take_Lots,0).toLong();
        remaining = lots - initial;
        firstDelay = ifnull(ph.First_Recurring_Delay_Months,0).toLong();
        perTake = ifnull(ph.Lots_Per_Take,0).toLong();
        step = 1;
        if(ph.Take_Frequency == "Quarterly")
        {
            step = 3;
        }
        takeCount = 1;
        if(remaining > 0)
        {
            takeCount = takeCount + ceil(remaining / perTake);
        }
        takeNo = 1;
        lastSaleMonth = 0;
        for each take in thisapp.forLoop(1,takeCount)
        {
            sold = initial;
            saleMonth = ph.Lot_Sale_Start_Month;
            if(takeNo > 1)
            {
                sold = perTake;
                if(remaining < sold)
                {
                    sold = remaining;
                }
                saleMonth = ph.Lot_Sale_Start_Month + firstDelay + (takeNo - 2) * step;
                remaining = remaining - sold;
            }
            monthRow = Proforma_Months[Proforma == input.ID && Month1 == saleMonth && Master_Month == true];
            if(monthRow == null)
            {
                throw "Missing master month for phase " + ph.Phase + " sale month " + saleMonth + ".";
            }
            basis = sold * input.Sale_Price_FF * input.Lot_Size_Ft;
            baseIncome = basis.round(0);
            markupPct = ifnull(ph.Additional_Markup_Pct,0).toDecimal();
            markupIncome = (basis * markupPct / 100).round(0);
            annualPct = ifnull(ph.Annual_Escalator_Pct,0).toDecimal();
            enabled = ifnull(ph.Escalator_Enabled,false);
            elapsed = 0;
            if(enabled == true && annualPct > 0)
            {
                saleDate = input.Estimated_Purchase_Date.addMonth(saleMonth - 1);
                elapsed = (saleDate.getYear() - ph.Esc_Start_Date.getYear()) * 12 + saleDate.getMonth() - ph.Esc_Start_Date.getMonth();
                if(elapsed < 0)
                {
                    elapsed = 0;
                }
            }
            escalatorIncome = (basis * annualPct * elapsed / 1200).round(0);
            monthRow.Lot_Sale_Phase = ph.Phase;
            monthRow.Lots_Sold = sold;
            monthRow.Base_Lot_Sales = baseIncome;
            monthRow.Additional_Markup_Income = markupIncome;
            monthRow.Escalator_Interest_Accrued = escalatorIncome;
            monthRow.Escalator_Percentage = if(enabled == true,annualPct,0);
            monthRow.Escalator_Elapsed_Months = elapsed;
            monthRow.Escalator_Applied_Pct = if(enabled == true,annualPct * elapsed / 12,0);
            monthRow.Finished_Lot_Sales = baseIncome + markupIncome + escalatorIncome;
            totalSold = totalSold + sold;
            lastSaleMonth = saleMonth;
            takeNo = takeNo + 1;
        }
        if(remaining != 0 || lastSaleMonth != ph.Lot_Sale_End_Month)
        {
            throw "Phase " + ph.Phase + " event totals disagree with its schedule.";
        }
    }
    if(totalSold != input.Lots)
    {
        throw "The event schedule sells " + totalSold + " lots, but the project has " + input.Lots + ".";
    }
}
```

## 12. Totals

The existing totals script computes all other totals as before. Its
`Gross_Sales` assignment alone is conditional:

```deluge
if(ifnull(input.Lot_Sales_Schedule_Version,0).toLong() == 2)
{
    input.Gross_Sales = ifnull(Proforma_Months[Proforma == input.ID].sum(Finished_Lot_Sales),0);
}
else
{
    input.Gross_Sales = input.Sale_Price_FF * input.Lots * input.Lot_Size_Ft;
}
```
