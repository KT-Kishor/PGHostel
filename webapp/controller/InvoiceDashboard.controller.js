sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "../model/formatter"
], function (BaseController, JSONModel, MessageToast, Fragment, Formatter) {
    "use strict";
    // Define the initial default chart types as a constant for clarity and easy maintenance.
    const INITIAL_CHART_TYPES = { statusType: "donut", monthlyType: "line", companyType: "bar", yearlyType: "line", paymentBreakdownType: "stacked_bar", pendingByCompanyType: "column" };
    return BaseController.extend("sap.kt.com.minihrsolution.controller.InvoiceDashboard", {
        Formatter: Formatter,

        _oGroupedInvoices: {},
        _aCurrentFilteredData: [],

        onInit: function () {
            const oChartData = { statusDistribution: [], monthlyValue: [], companyTotals: [], yearlyTrend: [], paymentBreakdown: [], pendingByCompany: [] };
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
                this.rawInvoiceData = (Array.isArray(oData.data) ? oData.data : [oData.data]);
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
        }
        ,

        onFilterChange: function () {
            if (!this.rawInvoiceData) return;
            this.getBusyDialog();

            setTimeout(() => {
                try {
                    const oCompanyFilter = this.byId("companyFilter");
                    const oYearFilter = this.byId("yearFilter");
                    const oDateRange = this.byId("DashI_id_Date");

                    const aSelectedCompanies = oCompanyFilter.getSelectedKeys();
                    let sSelectedYear = oYearFilter.getValue();
                    let dFrom = oDateRange.getDateValue();
                    let dTo = oDateRange.getSecondDateValue();

                    //  Clear year if date range is selected
                    // if (dFrom && dTo) {
                    //     oYearFilter.setValue("");
                    //     sSelectedYear = "";
                    // }

                    //  Clear date range if year is selected
                    if (sSelectedYear) {
                        oDateRange.setValue("");
                        dFrom = null;
                        dTo = null;
                    }

                    let aFilteredData = this.rawInvoiceData.filter(item => {
                        const invoiceDate = new Date(item.InvoiceDate);

                        let bCompanyMatch = aSelectedCompanies.length === 0 || aSelectedCompanies.includes(item.CustomerName);
                        let bDateMatch = true;

                        if (dFrom && dTo) {
                            const dEndDate = new Date(dTo);
                            dEndDate.setDate(dEndDate.getDate() + 1); // include last date
                            bDateMatch = invoiceDate >= dFrom && invoiceDate < dEndDate;
                        } else if (sSelectedYear) {
                            //  Financial Year filtering
                            // Example: if yearFilter = "2024" → Apr 1, 2024 – Mar 31, 2025
                            const fyStart = new Date(parseInt(sSelectedYear), 3, 1); // April 1
                            const fyEnd = new Date(parseInt(sSelectedYear) + 1, 2, 31, 23, 59, 59); // March 31 next year
                            bDateMatch = invoiceDate >= fyStart && invoiceDate <= fyEnd;
                        }

                        return bCompanyMatch && bDateMatch;
                    });

                    this._aCurrentFilteredData = aFilteredData;

                    let aYearlyTrendData = (aSelectedCompanies.length > 0) ?
                        this.rawInvoiceData.filter(invoice => aSelectedCompanies.includes(invoice.CustomerName)) :
                        this.rawInvoiceData;

                    this._aggregateAndSetAllChartData(aFilteredData, aYearlyTrendData);
                } catch (error) {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                } finally {
                    this.closeBusyDialog();
                }
            }, 100);
        },


        // --- HELPER to get INR value. Refactored to be reusable --
        _getInrValue: function (item) {
            let amount = 0;
            if (item.Status === "Submitted" || item.Status === "Invoice Sent" || item.Status === "Payment Received") {
                if (item.Currency === "INR") {
                    amount = parseFloat(item.TotalAmount || 0);
                } else {
                    amount = parseFloat(item.AmountInINR || 0);
                }
            } else if (item.Status === "Payment Partially") {
                amount = parseFloat(item.DueAmount || 0);
            } else {

                amount = parseFloat(item.DueAmount || item.TotalAmount || 0);
            }

            if (item.Currency === "INR") {
                return amount;
            }
            // const totalAmount = parseFloat(item.TotalAmount || 0); 
            // if (item.Currency === "INR") {
            //     return totalAmount;
            // }
            const amountInINR = parseFloat(item.AmountInINR || 0);
            if (amountInINR > 0) {
                return amountInINR;
            }
            const conversionRate = parseFloat(item.ConversionRate || 1);
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

        _aggregateAndSetAllChartData: function (aFilteredData, aYearlyTrendData) {
            //  fiscal start year from a date Apr-Mar FY
            const monthlyValue = aFilteredData.reduce((acc, item) => {
                const d = new Date(item.InvoiceDate);
                if (isNaN(d.getTime())) return acc;
                const month = d.getMonth(); // 0 to 11
                acc[month] = (acc[month] || 0) + this._getInrValue(item);
                return acc;
            }, {});

            const companyTotals = aFilteredData.reduce((acc, item) => {
                acc[item.CustomerName] = (acc[item.CustomerName] || 0) + this._getInrValue(item);
                return acc;
            }, {});

            const yearlyTrend = aYearlyTrendData.reduce((acc, item) => {
                const d = new Date(item.InvoiceDate);
                if (isNaN(d.getTime())) return acc;
                // Calculate fiscal start year (Apr–Mar)
                const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
                const fyLabel = `${year}-${year + 1}`; //  '2024-2025'
                if (!acc[fyLabel]) { acc[fyLabel] = { totalAmountInINR: 0, count: 0 }; }
                acc[fyLabel].totalAmountInINR += this._getInrValue(item);
                acc[fyLabel].count++;
                return acc;
            }, {});


            const pendingStatuses = ["Submitted", "Invoice Sent", "Payment Partially"];
            const pendingByCompany = aFilteredData
                .filter(item => pendingStatuses.includes(item.Status))
                .reduce((acc, item) => {
                    acc[item.CustomerName] = (acc[item.CustomerName] || 0) + this._getInrValue(item);
                    return acc;
                }, {});

            this._oGroupedInvoices = {};
            const statusAmounts = aFilteredData.reduce((acc, item) => {
                const status = item.Status || "Unknown";
                if (!this._oGroupedInvoices[status]) { this._oGroupedInvoices[status] = []; }
                this._oGroupedInvoices[status].push(item);

                const totalAmount = this._getInrValue(item);
                acc[status] = (acc[status] || 0) + totalAmount;
                return acc;
            }, {});


            const paymentBreakdown = aFilteredData.reduce((acc, item) => {
                const company = item.CustomerName;

                if (!acc[company]) {
                    acc[company] = { taxableAmount: 0, gstAmount: 0, tdsAmount: 0, invoices: [] };
                }

                const totalGst = this._convertToInr(item.CGST, item) +
                    this._convertToInr(item.SGST, item) +
                    this._convertToInr(item.IGST, item);

                acc[company].taxableAmount += this._convertToInr(item.SubTotalInGST, item);
                acc[company].gstAmount += totalGst;
                acc[company].tdsAmount += this._convertToInr(item.IncomeTax, item);

                //  Always push invoice details
                acc[company].invoices.push({
                    InvNo: item.InvNo,
                    SubTotalInGST: this._convertToInr(item.SubTotalInGST, item),
                    gstAmount: totalGst,
                    IncomeTax: this._convertToInr(item.IncomeTax, item),
                    totalAmountInINR: this._getInrValue(item)
                });

                return acc;
            }, {});


            // --- Determine Fiscal Year Start based on filtered data ---
            const getFiscalStartYearFromDate = (date) => {
                const m = date.getMonth(); // 0 to 11
                const y = date.getFullYear();
                return (m >= 3) ? y : (y - 1); // Apr(3)..Dec => same year; Jan(0)..Mar(2) => prev year
            };

            let fyStartYear;
            if (aFilteredData && aFilteredData.length > 0) {
                // find the earliest invoice date in the filtered set
                let minDate = null;
                for (let i = 0; i < aFilteredData.length; i++) {
                    const d = new Date(aFilteredData[i].InvoiceDate);
                    if (isNaN(d.getTime())) continue;
                    if (!minDate || d < minDate) minDate = d;
                }
                fyStartYear = minDate ? getFiscalStartYearFromDate(minDate) : getFiscalStartYearFromDate(new Date());
            } else {
                // no data: derive from today
                fyStartYear = getFiscalStartYearFromDate(new Date());
            }

            // --- Financial Year Monthly Aggregation (Apr → Mar with Year) ---
            const monthNames = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

            const formattedMonthly = monthNames.map((monthName, idx) => {
                const realMonth = (idx + 3) % 12; // map Apr idx 0 -> realMonth 3
                const displayYear = (realMonth >= 3) ? fyStartYear : (fyStartYear + 1);
                return {
                    month: `${monthName}-${displayYear}`,
                    totalAmountInINR: monthlyValue[realMonth] || 0
                };
            });

            const formattedCompanyTotals = Object.entries(companyTotals)
                .map(([name, total]) => ({ companyName: name, totalAmountInINR: total }))
                .sort((a, b) => b.totalAmountInINR - a.totalAmountInINR);

            const formattedYearlyTrend = Object.entries(yearlyTrend)
                .map(([fyLabel, data]) => ({ year: fyLabel, ...data }))
                .sort((a, b) => a.year.localeCompare(b.year));

            const formattedPending = Object.entries(pendingByCompany)
                .map(([name, amount]) => ({ companyName: name, pendingAmountInINR: amount }))
                .sort((a, b) => b.pendingAmountInINR - a.pendingAmountInINR)
                .slice(0, 5);

            const formattedStatus = Object.entries(statusAmounts)
                .map(([status, totalAmount]) => ({
                    status,
                    totalAmountInINR: totalAmount
                }));


            let formattedPaymentBreakdown = Object.entries(paymentBreakdown).map(([name, values]) => {
                const totalAmountInINR = values.invoices.reduce((sum, inv) => sum + inv.totalAmountInINR, 0);

                // if all values are 0 → fall back to total
                if (values.taxableAmount === 0 && values.gstAmount === 0 && values.tdsAmount === 0) {
                    return {
                        companyName: name,
                        taxableAmount: totalAmountInINR,
                        gstAmount: 0,
                        tdsAmount: 0,
                        invoices: values.invoices
                    };
                }

                return {
                    companyName: name,
                    taxableAmount: values.taxableAmount,
                    gstAmount: values.gstAmount,
                    tdsAmount: values.tdsAmount,
                    invoices: values.invoices
                };
            });


            // formattedPaymentBreakdown = formattedPaymentBreakdown.filter(company =>
            //     company.taxableAmount > 0 || company.gstAmount > 0 || company.tdsAmount > 0
            // );

            // ------ Set model data ------
            this.getView().getModel("chartData").setData({
                statusDistribution: formattedStatus,
                monthlyValue: formattedMonthly,
                companyTotals: formattedCompanyTotals,
                yearlyTrend: formattedYearlyTrend,
                paymentBreakdown: formattedPaymentBreakdown,
                pendingByCompany: formattedPending
            });
            this._formattedPaymentBreakdown = formattedPaymentBreakdown;
        }
        ,

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
                    invoices: aInvoicesForStatus
                }), "popoverData");

                // Set dynamic title combining i18n text and status
                const sTitlePrefix = this.i18nModel.getText("invoiceFor");
                oPopover.setTitle(`${sTitlePrefix} ${sStatus}`);

                // Open popover near the clicked element
                oPopover.open(oEvent.getParameter("data")[0].target);
            });
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
                    invoices: aInvoices
                }), "dialogData");
                this.getView().addDependent(oDialog);
                oDialog.open();
            });
        },


        onPendingCompanySelect: function (oEvent) {
            const oSelectedData = oEvent.getParameter("data")[0].data;
            if (!oSelectedData || !oSelectedData.Company) return;
            const sCompanyName = oSelectedData.Company;
            const aPendingStatuses = ["Submitted", "Invoice Sent", "Payment Partially"];
            const aInvoices = this._aCurrentFilteredData.filter(inv => inv.CustomerName === sCompanyName && aPendingStatuses.includes(inv.Status));
            aInvoices.forEach(inv => { inv.pendingAmountInINR = this._getInrValue(inv); });
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
                oDialog.setModel(new JSONModel({ companyName: sCompanyName, invoices: aInvoices }), "dialogData");
                this.getView().addDependent(oDialog);
                oDialog.open();
            });
        },

        onCloseDialog: function (oEvent) {
            oEvent.getSource().getParent().getParent().close();
        },

        onInvoiceNumberPress: function (oEvent) { this.getRouter().navTo("RouteCompanyInvoiceDetails", { sPath: encodeURIComponent(oEvent.getSource().getBindingContext("popoverData").getObject().InvNo), dash: "InvoiceDashboard" }); },
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
                    totalValue: totalValue
                }), "dialogData");

                // Set dynamic title here
                oDialog.setTitle(sTitle);

                this.getView().addDependent(oDialog);
                oDialog.open();
            });
        },

        onMonthlyInvoiceSelect: function (oEvent) {
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
            const aInvoices = (this._aCurrentFilteredData || []).filter(inv => {
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
            if (!this.pMonthlyInvoicesDialog) {
                this.pMonthlyInvoicesDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "sap.kt.com.minihrsolution.fragment.MonthlyInvoice",
                    controller: this
                });
            }

            this.pMonthlyInvoicesDialog.then(oDialog => {
                // Compose dynamic dialog title using i18n text plus selected month-year
                const sTitle = this.i18nModel.getText("monthlyinvoicefor") + " " + sMonth + "-" + iYear;

                oDialog.setModel(new JSONModel({
                    month: `${sMonth}-${iYear}`, // pass month + year
                    invoices: aInvoices,
                    totalValue: totalValue
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

            const aAllInvoices = this._aAllInvoices || this.rawInvoiceData || this._aCurrentFilteredData || [];

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

            // Lazy load dialog
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
                    totalValue: totalValue
                }), "dialogData");

                this.getView().addDependent(oDialog);
                oDialog.open();
            });
        }

    });
});