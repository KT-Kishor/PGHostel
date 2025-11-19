sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "../model/formatter"
], function (BaseController, JSONModel, MessageToast, Fragment, Formatter) {
    "use strict";
    // Define the initial default chart types as a constant for clarity and easy maintenance.
    const INITIAL_CHART_TYPES = { statusType: "donut", monthlyType: "line", companyType: "bar", yearlyType: "line", paymentBreakdownType: "bar", pendingByCompanyType: "column" };
    return BaseController.extend("sap.kt.com.minihrsolution.controller.InvoiceDashboard", {
        Formatter: Formatter,

        _oGroupedInvoices: {},
        _aCurrentFilteredData: [],

        onInit: function () {
            const oChartData = { statusDistribution: [], monthlyValue: [], companyTotals: [], yearlyTrend: [], paymentBreakdown: [], pendingByCompany: [], statusDistributionCreditNote: [], monthlyValueCreditNote: [] };
            this.getView().setModel(new JSONModel(oChartData), "chartData");
            this.getView().setModel(new JSONModel([]), "companies");
            // Initialize the chart type model with the default values.
            this.getView().setModel(new JSONModel(INITIAL_CHART_TYPES), "invoiceChartTypeModel");
            this.getOwnerComponent().getRouter().getRoute("RouteInvoiceDashboard").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: async function () {
            var oVizFrame = this.getView().byId("donutChartStatus");
            var LoginFunction = await this.commonLoginFunction("InvoiceDashboard");
            if (!LoginFunction) return;
            this.getView().getModel("invoiceChartTypeModel").setData(JSON.parse(JSON.stringify(INITIAL_CHART_TYPES)));
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("invoiceDashboard"));
            this.byId("donutChartStatus").vizSelection([], { clearSelection: true });
            if (this._pPopover) { this._pPopover.then(oPopover => oPopover.close()); }

            var legendPosition = sap.ui.Device.system.phone ? "left" : "right";
            oVizFrame.setVizProperties({
                legend: {
                    position: legendPosition
                }
            });
            this.onClearFilters();
            this.readInvoiceData();
        },

        readInvoiceData: async function () {
            try {
                this.getBusyDialog();
                const oData = await this.ajaxReadWithJQuery("CompanyInvoice");
                const CreditNote = await this.ajaxReadWithJQuery("CreditNote");

                this.rawInvoiceData = Array.isArray(oData.data) ? oData.data : [oData.data];
                this.creditNotesData = Array.isArray(CreditNote.data) ? CreditNote.data : [CreditNote.data];

                // Merge logic
                this.rawInvoiceData = this.rawInvoiceData.map(invoice => {
                    const matchedNotes = this.creditNotesData.filter(cn => cn.InvNo === invoice.InvNo);
                    invoice.CCInvNo = matchedNotes[0]?.CCInvNo || "";
                    if (invoice.Currency === "INR") {
                        var matchedNotesTotal = matchedNotes.reduce((sum, cn) => sum + Number(cn.TotalAmount || 0), 0);
                    } else {
                        var matchedNotesTotal = matchedNotes.reduce((sum, cn) => sum + Number(cn.TotalAmount || 0), 0);
                    }
                    const creditNotesInINR = invoice.Currency === "INR" ? matchedNotesTotal : matchedNotes.reduce((sum, cn) => sum + Number(cn.AmountInINR || 0), 0);

                    return {
                        ...invoice,
                        CreditNotes: matchedNotes,
                        CreditNotesTotal: matchedNotesTotal,
                        TotalAmount: Number(invoice.TotalAmount || 0),
                        AmountInINR: Number(invoice.AmountInINR || 0) - creditNotesInINR,
                        CreditNotesTotalInINR: creditNotesInINR || 0
                    };
                });

                const uniqueCompanies = [...new Set(this.rawInvoiceData.map(item => item.CustomerName))];
                this.getView().getModel("companies").setData(uniqueCompanies.map(c => ({ key: c, text: c })));
                const today = new Date();
                let year = today.getFullYear();
                let month = today.getMonth() + 1;

                //   before April, financial year is (previous year - current year)
                //   April or later, financial year is (current year - next year)
                let financialYear;
                if (month < 4) {
                    financialYear = (year - 1) + "-" + year;
                } else {
                    financialYear = year + "-" + (year + 1);
                }

                this.byId("yearFilter").setValue(financialYear);
                this.InvoicePaymentDetail = await this.ajaxReadWithJQuery("InvoicePaymentDetail");
                this.onFilterChange();
            } catch (error) {
                MessageToast.show(error.message || this.i18nModel.getText("technicalError"));
                this.closeBusyDialog();
            }
        },
        onDateRangeselection: function () {
            const oYearFilter = this.byId("yearFilter");
            oYearFilter.setValue("");
        },
        onchangeFY: function (oEvent) {
            // get selected year from DatePicker
            const sYear = oEvent.getSource().getValue();
            if (!sYear) return;

            const year = parseInt(sYear, 10);

            // Financial Year = selectedYear - (selectedYear+1)
            const financialYear = year + "-" + (year + 1);

            // set back to DatePicker as string
            this.byId("yearFilter").setValue(financialYear);
        },

        onFilterChange: function () {
    if (!this.rawInvoiceData) return;
    this.getBusyDialog();

    setTimeout(() => {
        try {
            // Make deep copy so rawInvoiceData never changes
            const invoiceDataCopy = JSON.parse(JSON.stringify(this.rawInvoiceData));
            const creditNotesCopy = JSON.parse(JSON.stringify(this.creditNotesData));

            const oCompanyFilter = this.byId("companyFilter");
            const oYearFilter = this.byId("yearFilter");
            const oDateRange = this.byId("DashI_id_Date");

            const aSelectedCompanies = oCompanyFilter.getSelectedKeys();
            let sSelectedYear = oYearFilter.getValue();
            let dFrom = oDateRange.getDateValue();
            let dTo = oDateRange.getSecondDateValue();

            if (sSelectedYear) {
                oDateRange.setValue("");
                dFrom = null;
                dTo = null;
            }

            // Use the copy (NEVER rawInvoiceData)
            let aFilteredData = invoiceDataCopy.filter(item => {
                const invoiceDate = new Date(item.InvoiceDate);

                let bCompanyMatch = aSelectedCompanies.length === 0 || aSelectedCompanies.includes(item.CustomerName);
                let bDateMatch = true;

                if (dFrom && dTo) {
                    const dEndDate = new Date(dTo);
                    dEndDate.setDate(dEndDate.getDate() + 1);
                    bDateMatch = invoiceDate >= dFrom && invoiceDate < dEndDate;
                } else if (sSelectedYear) {
                    const fyStart = new Date(parseInt(sSelectedYear), 3, 1);
                    const fyEnd = new Date(parseInt(sSelectedYear) + 1, 2, 31, 23, 59, 59);
                    bDateMatch = invoiceDate >= fyStart && invoiceDate <= fyEnd;
                }

                return bCompanyMatch && bDateMatch;
            });

            this._aCurrentFilteredData = aFilteredData;

            const creditInvNos = aFilteredData.map(cn => cn.InvNo);

            const aFilterDataCreditNote = creditNotesCopy.filter(inv =>
                creditInvNos.includes(inv.InvNo)
            );

            this._aCurrentFilteredDataCreditNote = aFilterDataCreditNote;

            let aYearlyTrendData = (aSelectedCompanies.length > 0)
                ? invoiceDataCopy.filter(invoice => aSelectedCompanies.includes(invoice.CustomerName))
                : invoiceDataCopy;

            this._aggregateAndSetAllChartData(aFilteredData, aYearlyTrendData, aFilterDataCreditNote);

        } catch (error) {
            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
        } finally {
            this.closeBusyDialog();
        }
    }, 100);
},



        // --- HELPER to get INR value. Refactored to be reusable --
        _getInrValue: function (item) {
            if (!item) return 0;

            const currency = item.Currency || "";
            const status = item.Status || "";
            const conversionRate = parseFloat(item.ConversionRate) || 1;

            let amount = 0;

            // ---------------------------
            // 1️⃣ Status Based Amount Logic
            // ---------------------------
            if (status === "Submitted" || status === "Invoice Sent" || status === "Payment Received") {

                // If invoice is fully billed / submitted
                amount = (currency === "INR")
                    ? parseFloat(item.TotalAmount) || 0
                    : parseFloat(item.AmountInINR) || parseFloat(item.TotalAmount) || 0;

            } else if (status === "Payment Partially") {

                // Partial payments use Due Amount for foreign currency
                amount = (currency === "INR")
                    ? parseFloat(item.DueAmount || item.TotalAmount) || 0
                    : parseFloat(item.DueAmount) || parseFloat(item.AmountInINR) || 0;

            } else {
                // Other statuses → fallback logic
                amount = parseFloat(item.DueAmount || item.TotalAmount) || 0;
            }

            // ---------------------------
            // 2️⃣ Final Conversion to INR
            // ---------------------------
            if (currency === "INR") {
                return amount; // no conversion needed
            }

            const amountInINR = parseFloat(item.AmountInINR) || 0;

            // If backend already sent INR → use that  
            if (amountInINR > 0) {
                return amountInINR;
            }

            // Otherwise convert manually  
            return amount * conversionRate;
        },

        _convertToInr: function (value, item) {
            const numValue = parseFloat(value || 0);
            if (item.Currency === "INR" || !item.ConversionRate) {
                return numValue;
            }
            const conversionRate = parseFloat(item.ConversionRate);
            return numValue * conversionRate;
        },

        _aggregateAndSetAllChartData: function (aFilteredData, aYearlyTrendData, aFilterDataCreditNote) {

            const AllFilteredData = aFilteredData || [];

            //---------------------------------------------------------------------
            // 1️⃣ Monthly Values (Apr–Mar Financial Year)
            //---------------------------------------------------------------------
            const monthlyValue = aFilteredData.reduce((acc, item) => {
                const d = new Date(item.InvoiceDate);
                if (isNaN(d.getTime())) return acc;

                const month = d.getMonth();
                if(item.Currency === "INR"){
                    var TotalAmount = parseFloat(item.TotalAmount || 0) - parseFloat(item.CreditNotesTotal || 0);
                }else{
                    var TotalAmount = parseFloat(item.AmountInINR || 0);
                }
                acc[month] = (acc[month] || 0) + TotalAmount
                return acc;
            }, {});

            //---------------------------------------------------------------------
            // 2️⃣ Company Totals
            //---------------------------------------------------------------------
            const companyTotals = aFilteredData.reduce((acc, item) => {
                if(item.Currency === "INR"){
                    var TotalAmount = parseFloat(item.TotalAmount || 0) - parseFloat(item.CreditNotesTotal || 0);
                }else{
                    var TotalAmount = parseFloat(item.AmountInINR || 0);
                }
                acc[item.CustomerName] = (acc[item.CustomerName] || 0) + TotalAmount;
                return acc;
            }, {});

            //---------------------------------------------------------------------
            // 3️⃣ Yearly Trend (Apr–Mar)
            //---------------------------------------------------------------------
            const yearlyTrend = aYearlyTrendData.reduce((acc, item) => {
                const d = new Date(item.InvoiceDate);
                if (isNaN(d)) return acc;

                const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
                const fyLabel = `${year}-${year + 1}`;

                if (!acc[fyLabel]) {
                    acc[fyLabel] = { totalAmountInINR: 0, count: 0 };
                }
                 if(item.Currency === "INR"){
                    var TotalAmount = parseFloat(item.TotalAmount || 0) - parseFloat(item.CreditNotesTotal || 0);
                }else{
                    var TotalAmount = parseFloat(item.AmountInINR || 0);
                }

                acc[fyLabel].totalAmountInINR += TotalAmount;
                acc[fyLabel].count++;

                return acc;
            }, {});

            //---------------------------------------------------------------------
            // 4️⃣ Pending / Outstanding Amount per Company
            //---------------------------------------------------------------------
            const pendingStatuses = ["Submitted", "Invoice Sent", "Payment Partially"];

            const pendingByCompany = aFilteredData
                .filter(item => pendingStatuses.includes(item.Status))
                .reduce((acc, item) => {

                    const due = parseFloat(item.DueAmount || item.TotalAmount || 0);
                    const cn = parseFloat(item.CreditNotesTotal || 0);
                    let amount = due - cn;

                    // Convert to INR
                    if (item.Currency !== "INR") {
                        amount *= parseFloat(item.ConversionRate || 1);
                    }

                    acc[item.CustomerName] = (acc[item.CustomerName] || 0) + amount;
                    return acc;
                }, {});

            //---------------------------------------------------------------------
            // 5️⃣ Status-wise totals + Grouped Invoice Container
            //---------------------------------------------------------------------
            this._oGroupedInvoices = {};

            const statusAmounts = AllFilteredData.reduce((acc, item) => {
                const status = item.Status || "Unknown";

                if (!this._oGroupedInvoices[status]) this._oGroupedInvoices[status] = [];

                // Calculate final amount after credit note
                const originalAmount = parseFloat(item.TotalAmount || 0);
                const creditNote = parseFloat(item.CreditNotesTotal || 0);
                const net = originalAmount - creditNote;

                let inrValue = net;
                item.OldTotalAmount = item.TotalAmount;

                if (item.Currency !== "INR") {
                    inrValue = net * parseFloat(item.ConversionRate || 1);
                    item.AmountInINR = inrValue;
                } else {
                    item.TotalAmount = inrValue;
                }

                this._oGroupedInvoices[status].push(item);
                acc[status] = (acc[status] || 0) + inrValue;

                return acc;
            }, {});

            //---------------------------------------------------------------------
            // 6️⃣ Payment Breakdown (GST, TDS, Credit Notes)
            //---------------------------------------------------------------------
            const paymentBreakdown = aFilteredData.reduce((acc, item) => {
                const company = item.CustomerName;

                if (!acc[company]) {
                    acc[company] = {
                        taxableAmount: 0,
                        gstAmount: 0,
                        tdsAmount: 0,
                        CreditNotesTotalAmount: 0,
                        invoices: []
                    };
                }

                const gst = this._convertToInr(item.CGST, item) +
                    this._convertToInr(item.SGST, item) +
                    this._convertToInr(item.IGST, item);

                acc[company].taxableAmount += this._convertToInr(item.SubTotalInGST, item);
                acc[company].gstAmount += gst;
                acc[company].tdsAmount += this._convertToInr(item.IncomeTax, item);

                // Credit Notes INR
                const cnInr = item.Currency === "INR"
                    ? Number(item.CreditNotesTotal || 0)
                    : Number(item.CreditNotesTotal * parseFloat(item.ConversionRate || 1));

                acc[company].CreditNotesTotalAmount += cnInr;

                acc[company].invoices.push({
                    InvNo: item.InvNo,
                    CCInvNo: item.CCInvNo,
                    SubTotalInGST: this._convertToInr(item.SubTotalInGST, item),
                    gstAmount: gst,
                    IncomeTax: this._convertToInr(item.IncomeTax, item),
                    totalAmountInINR: this._getInrValue(item),
                    CreditNotesTotal: cnInr
                });

                return acc;
            }, {});

            //---------------------------------------------------------------------
            // 7️⃣ Determine Financial Year Start
            //---------------------------------------------------------------------
            const getFY = (d) => d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;

            let fyStartYear = new Date().getFullYear();
            if (aFilteredData.length > 0) {
                const minDate = aFilteredData
                    .map(i => new Date(i.InvoiceDate))
                    .filter(d => !isNaN(d))
                    .sort((a, b) => a - b)[0];

                fyStartYear = minDate ? getFY(minDate) : getFY(new Date());
            }

            //---------------------------------------------------------------------
            // 8️⃣ Monthly Aggregation Format (Apr–Mar)
            //---------------------------------------------------------------------
            const monthNames = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

            const formattedMonthly = monthNames.map((name, idx) => {
                const realMonth = (idx + 3) % 12;
                const year = realMonth >= 3 ? fyStartYear : fyStartYear + 1;

                return {
                    month: `${name}-${year}`,
                    totalAmountInINR: monthlyValue[realMonth] || 0
                };
            });

            //---------------------------------------------------------------------
            // 9️⃣ Company Totals (Sorted)
            //---------------------------------------------------------------------
            const formattedCompanyTotals = Object.entries(companyTotals)
                .map(([name, total]) => ({ companyName: name, totalAmountInINR: total }))
                .sort((a, b) => b.totalAmountInINR - a.totalAmountInINR);

            //---------------------------------------------------------------------
            // 🔟 Yearly Trend Sorted
            //---------------------------------------------------------------------
            const formattedYearlyTrend = Object.entries(yearlyTrend)
                .map(([fy, obj]) => ({ year: fy, ...obj }))
                .sort((a, b) => a.year.localeCompare(b.year));

            //---------------------------------------------------------------------
            // 1️⃣1️⃣ Pending Top 5
            //---------------------------------------------------------------------
            const formattedPending = Object.entries(pendingByCompany)
                .map(([name, amt]) => ({ companyName: name, pendingAmountInINR: amt }))
                .sort((a, b) => b.pendingAmountInINR - a.pendingAmountInINR)
                .slice(0, 5);

            //---------------------------------------------------------------------
            // 1️⃣2️⃣ Status Distribution
            //---------------------------------------------------------------------
            const formattedStatus = Object.entries(statusAmounts)
                .map(([status, totalInr]) => ({
                    status,
                    totalAmountInINR: totalInr
                }));

            //---------------------------------------------------------------------
            // 1️⃣3️⃣ Payment Breakdown Final Formatting
            //---------------------------------------------------------------------
            let formattedPaymentBreakdown = Object.entries(paymentBreakdown).map(([name, values]) => ({
                companyName: name,
                taxableAmount: values.taxableAmount || values.invoices.reduce((s, i) => s + i.totalAmountInINR, 0),
                gstAmount: values.gstAmount,
                tdsAmount: values.tdsAmount,
                CreditNotesTotalAmount: values.CreditNotesTotalAmount,
                invoices: values.invoices
            }));

            //---------------------------------------------------------------------
            // 1️⃣4️⃣ Credit Note Aggregation (Status + Monthly)
            //---------------------------------------------------------------------
            const statusAmountsCreditNote = {};
            this._oGroupedInvoicesCreditNote = {};

            aFilterDataCreditNote.forEach(item => {
                const status = item.Status || "Unknown";

                if (!this._oGroupedInvoicesCreditNote[status]) {
                    this._oGroupedInvoicesCreditNote[status] = [];
                }

                let totalAmountInINR = item.Currency === "INR"
                    ? Number(item.TotalAmount || 0)
                    : Number(item.AmountInINR || item.TotalAmount || 0);

                this._oGroupedInvoicesCreditNote[status].push({
                    InvNo: item.InvNo,
                    TotalAmountINR: totalAmountInINR,
                    OriginalItem: item
                });

                statusAmountsCreditNote[status] = (statusAmountsCreditNote[status] || 0) + totalAmountInINR;
            });

            const formattedStatusCreditNote = Object.entries(statusAmountsCreditNote)
                .map(([st, amt]) => ({ status: st, totalAmountInINR: amt }));

            //-----------------------------------------------------------
            // Monthly Credit Note
            //-----------------------------------------------------------
            const monthlyValueCreditNote = aFilterDataCreditNote.reduce((acc, item) => {
                const d = new Date(item.InvoiceDate);
                if (isNaN(d)) return acc;

                const month = d.getMonth();
                acc[month] = (acc[month] || 0) + this._getInrValue(item);
                return acc;
            }, {});

            const formattedMonthlyCreditNote = monthNames.map((name, idx) => {
                const realMonth = (idx + 3) % 12;
                const year = realMonth >= 3 ? fyStartYear : fyStartYear + 1;

                return {
                    month: `${name}-${year}`,
                    totalAmountInINR: monthlyValueCreditNote[realMonth] || 0
                };
            });

            //---------------------------------------------------------------------
            // 1️⃣5️⃣ SET FINAL MODEL DATA
            //---------------------------------------------------------------------
            this.getView().getModel("chartData").setData({
                statusDistribution: formattedStatus,
                monthlyValue: formattedMonthly,
                companyTotals: formattedCompanyTotals,
                yearlyTrend: formattedYearlyTrend,
                paymentBreakdown: formattedPaymentBreakdown,
                pendingByCompany: formattedPending,
                statusDistributionCreditNote: formattedStatusCreditNote,
                monthlyValueCreditNote: formattedMonthlyCreditNote
            });

            this._formattedPaymentBreakdown = formattedPaymentBreakdown;
        },

        // --- EVENT HANDLERS FOR CHART SELECTIONS ---
        onStatusChartSelect: function (oEvent) {
            const oSelectedData = oEvent.getParameter("data")[0].data;
            if (!oSelectedData || !oSelectedData.Status) return;
            const sStatus = oSelectedData.Status;
            let aInvoicesForStatus = this._oGroupedInvoices[sStatus] || [];
            aInvoicesForStatus = aInvoicesForStatus.slice().sort((a, b) => {
                const dA = new Date(a.InvoiceDate);
                const dB = new Date(b.InvoiceDate);
                return dB - dA; // latest first
            });
            const oView = this.getView();
            if (!this._pPopover) {
                this._pPopover = Fragment.load({
                    id: oView.getId(),
                    name: "sap.kt.com.minihrsolution.fragment.InvoiceListPopover",
                    controller: this
                }).then(oPopover => {
                    oView.addDependent(oPopover);
                    return oPopover;
                });
            }

            this._pPopover.then(oPopover => {
                oPopover.setModel(new JSONModel({
                    status: sStatus,
                    invoices: aInvoicesForStatus,
                    AllTotalAmount: aInvoicesForStatus.reduce((sum, inv) => {
                        let amount = 0;
                        if (inv.Currency === "INR") {
                            amount = parseFloat(inv.TotalAmount || 0);
                        } else {
                            amount = parseFloat(inv.AmountInINR || 0);
                        }
                        return sum + amount;
                    }, 0)
                }), "popoverData");

                // Set dynamic title combining i18n text and status
                const sTitlePrefix = this.i18nModel.getText("invoiceFor");
                oPopover.setTitle(`${sTitlePrefix} ${sStatus}`);

                // Open popover near the clicked element
                oPopover.open(oEvent.getParameter("data")[0].target);
            });
        },

        onStatusChartSelectCreditNote: function (oEvent) {
            const oSelectedData = oEvent.getParameter("data")[0].data;
            if (!oSelectedData || !oSelectedData.Status) return;
            const sStatus = oSelectedData.Status;
            let aOriginalInvoices = (this._oGroupedInvoicesCreditNote[sStatus] || []).map(i => i.OriginalItem);

            // Sort OriginalItems directly
            aOriginalInvoices = aOriginalInvoices.sort((a, b) => {
                const dA = new Date(a.InvoiceDate);
                const dB = new Date(b.InvoiceDate);
                return dB - dA; // latest first
            });
            const oView = this.getView();
            if (!this._pPopoverCreditNote) {
                this._pPopoverCreditNote = Fragment.load({
                    id: oView.getId(),
                    name: "sap.kt.com.minihrsolution.fragment.CreditNoteListPopover",
                    controller: this
                }).then(oPopover => {
                    oView.addDependent(oPopover);
                    return oPopover;
                });
            }

            this._pPopoverCreditNote.then(oPopover => {
                oPopover.setModel(new JSONModel({
                    status: sStatus,
                    invoices: aOriginalInvoices,
                    AllTotalAmount: aOriginalInvoices.reduce((sum, inv) => {
                        let amount = 0;
                        if (inv.Currency === "INR") {
                            amount = parseFloat(inv.TotalAmount || 0);
                        } else {
                            amount = parseFloat(inv.AmountInINR || 0);
                        }
                        return sum + amount;
                    }, 0)
                }), "popoverData");

                // Set dynamic title combining i18n text and status
                const sTitlePrefix = this.i18nModel.getText("invoiceFor");
                oPopover.setTitle(`${sTitlePrefix} ${sStatus}`);

                // Open popover near the clicked element
                oPopover.open(oEvent.getParameter("data")[0].target);
            });
        },
        onPressCreditNoteInvoice: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext("popoverData");
            if (!oContext) return sap.m.MessageToast.show("No data found for this row.");
            const oRowData = oContext.getObject();
            if (!oRowData.InvNo) return sap.m.MessageToast.show("No Invoice details found for this credit note.");
            this.getRouter().navTo("RouteCreditNoteDetails", { sPath: encodeURIComponent(oRowData.CCInvNo), dash: "InvoiceDashboard" });
        },


        onPaymentBreakdownSelect: function (oEvent) {
            const oSelectedData = oEvent.getParameter("data")[0].data;
            if (!oSelectedData || !oSelectedData.Company) return;

            const sCompanyName = oSelectedData.Company;

            // Find the company data from the formatted payment breakdown
            const oCompanyData = this._formattedPaymentBreakdown.find(item =>
                item.companyName === sCompanyName
            );

            if (!oCompanyData || !oCompanyData.invoices) {
                console.warn(`No invoice data found for company: ${sCompanyName}`);
                return;
            }

            const aInvoices = oCompanyData.invoices;

            if (!this.pPaymentDetailsDialog) {
                this.pPaymentDetailsDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "sap.kt.com.minihrsolution.fragment.PaymentBreakdownDetails",
                    controller: this
                });
            }

            this.pPaymentDetailsDialog.then(oDialog => {
                oDialog.setModel(new JSONModel({
                    companyName: sCompanyName,
                    invoices: aInvoices,
                    AllTotalAmount: aInvoices.reduce((sum, inv) => {
                        let amount = 0;
                        if (inv.Currency === "INR") {
                            amount = parseFloat(inv.totalAmountInINR || 0);
                        } else {
                            amount = parseFloat(inv.totalAmountInINR || 0);
                        }
                        return sum + amount;
                    }, 0)
                }), "dialogData");
                this.getView().addDependent(oDialog);
                oDialog.open();
            });
        },


        onPendingCompanySelect: async function (oEvent) {
            const oSelectedData = oEvent.getParameter("data")[0].data;
            if (!oSelectedData || !oSelectedData.Company) return;
            const sCompanyName = oSelectedData.Company;
            const aPendingStatuses = ["Submitted", "Invoice Sent", "Payment Partially"];
            const aInvoices = this._aCurrentFilteredData.filter(inv => inv.CustomerName === sCompanyName && aPendingStatuses.includes(inv.Status));

            aInvoices.forEach(inv => {
                const totalAmount = parseFloat(inv.TotalAmount || 0);
                const dueAmount = parseFloat(inv.DueAmount || inv.TotalAmount || 0);
                const creditTotal = parseFloat(inv.CreditNotesTotal || 0);
                const conversion = parseFloat(inv.ConversionRate || 1);

                const pending = (inv.Currency === "INR") ? (inv.DueAmount) ? dueAmount - creditTotal : dueAmount : dueAmount - creditTotal;

                var ResivedData = this.InvoicePaymentDetail.data.filter(payment => payment.InvNo === inv.InvNo);

                if (inv.Currency === "INR") {
                    inv.pendingAmountInINR = pending;
                    inv.ReceivedAmount = ResivedData.reduce((sum, pay) => sum + parseFloat(pay.ReceivedAmount || 0), 0);
                } else {
                    inv.pendingAmountInINR = pending * conversion;
                    inv.ReceivedAmount = (ResivedData.reduce((sum, pay) => sum + parseFloat(pay.ReceivedAmount || 0), 0) * conversion);
                }
                if (inv.ReceivedAmount < 0) inv.ReceivedAmount = 0;
            });
            //sort
            aInvoices.sort((a, b) => {
                const dA = new Date(a.InvoiceDate);
                const dB = new Date(b.InvoiceDate);
                return dB - dA; // latest first
            });
            if (!this.pPendingInvoicesDialog) {
                this.pPendingInvoicesDialog = Fragment.load({ id: this.getView().getId(), name: "sap.kt.com.minihrsolution.fragment.PendingInvoicesDialog", controller: this });
            }
            this.pPendingInvoicesDialog.then(oDialog => {
                oDialog.setModel(new JSONModel({
                    companyName: sCompanyName,
                    invoices: aInvoices,
                    AllTotalAmount: aInvoices.reduce((sum, inv) => {
                        let amount = 0;
                        if (inv.Currency === "INR") {
                            amount = parseFloat(inv.pendingAmountInINR || 0);
                        } else {
                            amount = parseFloat(inv.pendingAmountInINR || 0);
                        }
                        return sum + amount;
                    }, 0)
                }), "dialogData");
                this.getView().addDependent(oDialog);
                oDialog.open();
            });
        },

        onCloseDialog: function (oEvent) {
            oEvent.getSource().getParent().getParent().close();
        },

        onInvoiceNumberPress: function (oEvent) {
            this.getRouter().navTo("RouteCompanyInvoiceDetails", { sPath: encodeURIComponent(oEvent.getSource().getBindingContext("popoverData").getObject().InvNo), dash: "InvoiceDashboard" });
        },
        onInvoiceCreditNotesPress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("popoverData");
            if (!oContext) {
                var oContext = oEvent.getSource().getBindingContext("dialogData");
            }
            if (!oContext) return sap.m.MessageToast.show("No data found for this row.");
            const oRowData = oContext.getObject();
            if (!oRowData.CCInvNo) return sap.m.MessageToast.show("No Credit Note details found for this invoice.");
            this.getRouter().navTo("RouteCreditNoteDetails", { sPath: encodeURIComponent(oRowData.CCInvNo), dash: "InvoiceDashboard" });
        },
        onPaymentBreakdownPress: function (oEvent) { this.getRouter().navTo("RouteCompanyInvoiceDetails", { sPath: encodeURIComponent(oEvent.getSource().getBindingContext("dialogData").getObject().InvNo), dash: "InvoiceDashboard" }); },
        onPendingInvoicePress: function (oEvent) { this.getRouter().navTo("RouteCompanyInvoiceDetails", { sPath: encodeURIComponent(oEvent.getSource().getBindingContext("dialogData").getObject().InvNo), dash: "InvoiceDashboard" }); },

        // --- CHART TYPE SWITCHERS ---
        IN_onPressStatusPie: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/statusType", "pie"); },
        IN_onPressStatusBar: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/statusType", "bar"); },
        IN_onPressStatusDonut: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/statusType", "donut"); },
        IN_onPressMonthlyPie: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/monthlyType", "waterfall"); },
        IN_onPressMonthlyBar: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/monthlyType", "bar"); },
        IN_onPressMonthlyLine: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/monthlyType", "line"); },
        IN_onPressCompanyPie: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/companyType", "waterfall"); },
        IN_onPressCompanyBar: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/companyType", "bar"); },
        IN_onPressYearlyBar: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/yearlyType", "bar"); },
        IN_onPressYearlyLine: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/yearlyType", "line"); },
        onPressPaymentStackedColumn: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/paymentBreakdownType", "stacked_bar"); },
        onPressPaymentStackedBar: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/paymentBreakdownType", "column"); },
        onPressPaymentGroupedBar: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/paymentBreakdownType", "bar"); },
        onPressPendingColumn: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/pendingByCompanyType", "column"); },
        onPressPendingBar: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/pendingByCompanyType", "bar"); },

        onClearFilters: function () {
            this.byId("companyFilter").setSelectedKeys(null);
            this.byId("DashI_id_Date").setValue("");

            const today = new Date();
            let year = today.getFullYear();
            let month = today.getMonth() + 1;

            //   before April, financial year is (previous year - current year)
            //   April or later, financial year is (current year - next year)
            let financialYear;
            if (month < 4) {
                financialYear = (year - 1) + "-" + year;
            } else {
                financialYear = year + "-" + (year + 1);
            }

            this.byId("yearFilter").setValue(financialYear);
        },


        onPressback: function () { this.getRouter().navTo("RouteTilePage"); },
        onLogout: function () { this.getRouter().navTo("RouteLoginPage"); },

        onTotalInvoiceValueSelect: function (oEvent) {
            const oSelectedData = oEvent.getParameter("data")[0].data;
            if (!oSelectedData || !oSelectedData.Company) return;

            const sCompanyName = oSelectedData.Company;

            // Get all invoices of that company from filtered data
            const aInvoices = this._aCurrentFilteredData.filter(inv => inv.CustomerName === sCompanyName);

            // Converted INR value for each invoice
            aInvoices.forEach(inv => { inv.totalAmountInINR = this._getInrValue(inv); });

            // Sort invoices by date (latest first)
            aInvoices.sort((a, b) => {
                const dA = new Date(a.InvoiceDate);
                const dB = new Date(b.InvoiceDate);
                return dB - dA;
            });

            // Calculate total value
            const totalValue = aInvoices.reduce((sum, inv) => sum + inv.totalAmountInINR, 0);
            var AllTotalAmount = aInvoices.reduce((sum, inv) => {
                let amount = 0;
                (inv.Currency === "INR") ? amount = parseFloat(inv.TotalAmount || 0) : amount = parseFloat(inv.AmountInINR || 0);
                return sum + amount;
            }, 0)
            oSelectedData['Total Value (INR)'] = AllTotalAmount;
            // Lazy-load the fragment if not already loaded
            if (!this.pTotalInvoicesDialog) {
                this.pTotalInvoicesDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "sap.kt.com.minihrsolution.fragment.TotalInVoiceValue",
                    controller: this
                });
            }

            this.pTotalInvoicesDialog.then(oDialog => {
                // Compose dynamic title — localized prefix + company name
                const sTitlePrefix = this.i18nModel.getText("totalInvoiceValue");
                const sTitle = `${sTitlePrefix} - ${sCompanyName}`;

                // Set model with data for dialog
                oDialog.setModel(new JSONModel({
                    companyName: sCompanyName,
                    invoices: aInvoices,
                    totalValue: totalValue,
                    AllTotalAmount: AllTotalAmount
                }), "dialogData");

                // Set dynamic title here
                oDialog.setTitle(sTitle);

                this.getView().addDependent(oDialog);
                oDialog.open();
            });
        },

        onMonthlyInvoiceSelect: function (oEvent) {
            var aData = oEvent.getParameter("data");
            if (!aData || !aData[0] || !aData[0].data) return;

            const oSelectedData = aData[0].data;
            const sMonthLabel = oSelectedData.Month;  // e.g. "Apr-2024"
            if (!sMonthLabel) return;

            const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            // Extract month and year
            const [sMonth, sYear] = sMonthLabel.split("-");
            const monthIndex = monthNamesShort.indexOf(sMonth); // JS month index (0–11)
            const iYear = parseInt(sYear, 10);

            if (monthIndex === -1 || isNaN(iYear)) {
                MessageToast.show(this.i18nModel.getText("noDataForSelectedMonth"));
                return;
            }

            // Filter invoices by month + year
            const aInvoices = (this._aCurrentFilteredData || []).filter(inv => {
                if (!inv || !inv.InvoiceDate) return false;
                const invDate = new Date(inv.InvoiceDate);
                return !isNaN(invDate.getTime()) &&
                    invDate.getMonth() === monthIndex &&
                    invDate.getFullYear() === iYear;
            });

            // Convert each invoice to INR
            aInvoices.forEach(inv => {
                const rawValue = this._getInrValue(inv);
                const numValue = Number(String(rawValue).replace(/[^0-9.-]+/g, ""));
                inv.totalAmountInINR = isNaN(numValue) ? 0 : numValue;
            });

            // Total value in INR
            const totalValue = aInvoices.reduce((sum, inv) => sum + (inv.totalAmountInINR || 0), 0);

            // Total considering currency
            const AllTotalAmount = aInvoices.reduce((sum, inv) => {
                const amount = (inv.Currency === "INR") ? parseFloat(inv.TotalAmount || 0)
                    : parseFloat(inv.AmountInINR || 0);
                return sum + (isNaN(amount) ? 0 : amount);
            }, 0);

            // Update selected data with total
            aData[0].data["Total Value (INR)"] = AllTotalAmount;

            // Lazy load fragment
            if (!this.pMonthlyInvoicesDialog) {
                this.pMonthlyInvoicesDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "sap.kt.com.minihrsolution.fragment.MonthlyInvoice",
                    controller: this
                });
            }

            this.pMonthlyInvoicesDialog.then(oDialog => {
                const sTitle = `${this.i18nModel.getText("monthlyinvoicefor")} ${sMonth}-${iYear}`;

                oDialog.setModel(new JSONModel({
                    month: `${sMonth}-${iYear}`,
                    invoices: aInvoices,
                    totalValue: totalValue,
                    AllTotalAmount: AllTotalAmount
                }), "dialogData");

                oDialog.setTitle(sTitle);
                this.getView().addDependent(oDialog);
                oDialog.open();
            });
        },
        onMonthlyInvoiceSelectCreditNote: function (oEvent) {
            const aData = oEvent.getParameter("data");
            if (!aData || !aData[0] || !aData[0].data) return;

            const oSelectedData = aData[0].data;
            const sMonthLabel = oSelectedData.Month;  // e.g. "Apr-2024"
            if (!sMonthLabel) return;

            const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            // --- extract month and year from label like "Apr-2024"
            const [sMonth, sYear] = sMonthLabel.split("-");
            const monthIndex = monthNamesShort.indexOf(sMonth); // JS month index (0–11)
            const iYear = parseInt(sYear, 10);

            if (monthIndex === -1 || isNaN(iYear)) {
                MessageToast.show(this.i18nModel.getText("noDataForSelectedMonth"));
                return;
            }

            // filter invoices by month + year
            const aInvoices = (this._aCurrentFilteredDataCreditNote || []).filter(inv => {
                if (!inv || !inv.InvoiceDate) return false;
                const invDate = new Date(inv.InvoiceDate);
                if (isNaN(invDate.getTime())) return false;
                return invDate.getMonth() === monthIndex && invDate.getFullYear() === iYear;
            });

            // convert to INR properly
            aInvoices.forEach(inv => {
                const raw = this._getInrValue(inv);
                const num = Number(String(raw).replace(/[^0-9.-]+/g, ""));
                inv.totalAmountInINR = isNaN(num) ? 0 : num;
            });

            const totalValue = aInvoices.reduce((sum, inv) => sum + (inv.totalAmountInINR || 0), 0);

            // lazy load fragment
            if (!this.pMonthlyInvoicesDialogCreditNote) {
                this.pMonthlyInvoicesDialogCreditNote = Fragment.load({
                    id: this.getView().getId(),
                    name: "sap.kt.com.minihrsolution.fragment.MonthlyInvoiceCreditNote",
                    controller: this
                });
            }

            this.pMonthlyInvoicesDialogCreditNote.then(oDialog => {
                // Compose dynamic dialog title using i18n text plus selected month-year
                const sTitle = this.i18nModel.getText("monthlycreditnotefor") + " " + sMonth + "-" + iYear;

                oDialog.setModel(new JSONModel({
                    month: `${sMonth}-${iYear}`, // pass month + year
                    invoices: aInvoices,
                    totalValue: totalValue,
                    AllTotalAmount: aInvoices.reduce((sum, inv) => {
                        let amount = 0;
                        if (inv.Currency === "INR") {
                            amount = parseFloat(inv.TotalAmount || 0);
                        } else {
                            amount = parseFloat(inv.AmountInINR || 0);
                        }
                        return sum + amount;
                    }, 0)
                }), "dialogData");

                oDialog.setTitle(sTitle);  // Set dynamic title here

                this.getView().addDependent(oDialog);
                oDialog.open();
            });
        },
        onYearlyInvoiceSelect: function (oEvent) {
            const aData = oEvent.getParameter("data");
            if (!aData || !aData[0] || !aData[0].data) return;

            const oSelectedData = aData[0].data;
            const sYearRaw = oSelectedData.Year || oSelectedData.year;
            const iYear = parseInt(String(sYearRaw), 10);

            if (isNaN(iYear)) {
                MessageToast.show(this.i18nModel.getText("noDataForSelectedYear"));
                return;
            }

            // Determine FY from clicked year
            const fyStartYear = iYear;
            const fyEndYear = fyStartYear + 1;
            const fyLabel = `${fyStartYear}-${fyEndYear}`;

            const aAllInvoices = this._aAllInvoices || this._aCurrentFilteredData || this.rawInvoiceData || [];

            // Filter invoices inside Apr 1 (fyStartYear) – Mar 31 (fyEndYear)
            const aInvoices = aAllInvoices.filter(inv => {
                if (!inv || !inv.InvoiceDate) return false;
                const dInv = new Date(inv.InvoiceDate);
                if (isNaN(dInv.getTime())) return false;

                const fyStartDate = new Date(fyStartYear, 3, 1);  // Apr 1 of selected year
                const fyEndDate = new Date(fyEndYear, 2, 31, 23, 59, 59); // Mar 31 of next year with time

                return dInv >= fyStartDate && dInv <= fyEndDate;
            });

            // Attach numeric INR value
            aInvoices.forEach(inv => {
                const raw = this._getInrValue(inv);
                const num = Number(String(raw).replace(/[^0-9.-]+/g, ""));
                inv.totalAmountInINR = isNaN(num) ? 0 : num;
            });

            // Sort latest first
            aInvoices.sort((a, b) => new Date(b.InvoiceDate) - new Date(a.InvoiceDate));

            // Compute FY total
            const totalValue = aInvoices.reduce((sum, inv) => sum + (inv.totalAmountInINR || 0), 0);
            var AllTotalAmount = aInvoices.reduce((sum, inv) => {
                let amount = 0;
                (inv.Currency === "INR") ? amount = parseFloat(inv.TotalAmount || 0) : amount = parseFloat(inv.AmountInINR || 0);
                return sum + amount;
            }, 0)
            // Lazy load dialog
            aData[0].data['Total Value (INR)'] = AllTotalAmount
            if (!this.pYearlyInvoicesDialog) {
                this.pYearlyInvoicesDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "sap.kt.com.minihrsolution.fragment.YearlyInvoice",
                    controller: this
                });
            }

            this.pYearlyInvoicesDialog.then(oDialog => {
                oDialog.setModel(new JSONModel({
                    year: fyLabel,
                    invoices: aInvoices,
                    totalValue: totalValue,
                    AllTotalAmount: AllTotalAmount
                }), "dialogData");

                this.getView().addDependent(oDialog);
                oDialog.open();
            });
        }

    });
});