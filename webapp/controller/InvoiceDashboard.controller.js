sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "../model/formatter"
], function (BaseController, JSONModel, MessageToast, Fragment, Formatter) {
    "use strict";
    // Define the initial default chart types as a constant for clarity and easy maintenance.
    const INITIAL_CHART_TYPES = { statusType: "donut", monthlyType: "bar", companyType: "bar", yearlyType: "line", paymentBreakdownType: "stacked_bar", pendingByCompanyType: "column" };
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
            var LoginFunction = await this.commonLoginFunction("InvoiceDashboard");
            if (!LoginFunction) return;
            this.getView().getModel("invoiceChartTypeModel").setData(JSON.parse(JSON.stringify(INITIAL_CHART_TYPES)));
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("invoiceDashboard"));
            this.byId("donutChartStatus").vizSelection([], { clearSelection: true });
            if (this._pPopover) { this._pPopover.then(oPopover => oPopover.close()); }
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
            if (item.Status === "Submitted" || item.Status === "Invoice Sent") {
                amount = parseFloat(item.TotalAmount || 0);
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
            // --- Aggregation for charts that need currency conversion ---
            const monthlyValue = aFilteredData.reduce((acc, item) => {
                const month = new Date(item.InvoiceDate).getMonth();
                acc[month] = (acc[month] || 0) + this._getInrValue(item);
                return acc;
            }, {});
            const companyTotals = aFilteredData.reduce((acc, item) => {
                acc[item.CustomerName] = (acc[item.CustomerName] || 0) + this._getInrValue(item);
                return acc;
            }, {});
            const yearlyTrend = aYearlyTrendData.reduce((acc, item) => {
                const year = new Date(item.InvoiceDate).getFullYear();
                if (!acc[year]) { acc[year] = { totalAmountInINR: 0, count: 0 }; }
                acc[year].totalAmountInINR += this._getInrValue(item);
                acc[year].count++;
                return acc;
            }, {});
            const pendingStatuses = ["Submitted", "Invoice Sent", "Payment Partially"];
            const pendingByCompany = aFilteredData.filter(item => pendingStatuses.includes(item.Status)).reduce((acc, item) => {
                acc[item.CustomerName] = (acc[item.CustomerName] || 0) + this._getInrValue(item);
                return acc;
            }, {});

            this._oGroupedInvoices = {};
            const statusCounts = aFilteredData.reduce((acc, item) => {
                const status = item.Status || "Unknown";
                if (!this._oGroupedInvoices[status]) { this._oGroupedInvoices[status] = []; }
                this._oGroupedInvoices[status].push(item);
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});

            const paymentBreakdown = aFilteredData.reduce((acc, item) => {
                const company = item.CustomerName;
                if (!acc[company]) {
                    acc[company] = { taxableAmount: 0, gstAmount: 0, tdsAmount: 0 };
                }
                const totalGst = this._convertToInr(item.CGST, item) + this._convertToInr(item.SGST, item) + this._convertToInr(item.IGST, item);
                acc[company].taxableAmount += this._convertToInr(item.SubTotalInGST, item);
                acc[company].gstAmount += totalGst;
                acc[company].tdsAmount += this._convertToInr(item.IncomeTax, item);
                return acc;
            }, {});


            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const formattedMonthly = monthNames.map((monthName, i) => ({ month: monthName, totalAmountInINR: monthlyValue[i] || 0 }));
            const formattedCompanyTotals = Object.entries(companyTotals).map(([name, total]) => ({ companyName: name, totalAmountInINR: total })).sort((a, b) => b.totalAmountInINR - a.totalAmountInINR);
            const formattedYearlyTrend = Object.entries(yearlyTrend).map(([yr, data]) => ({ year: yr, ...data })).sort((a, b) => a.year - b.year);
            const formattedPending = Object.entries(pendingByCompany).map(([name, amount]) => ({ companyName: name, pendingAmountInINR: amount })).sort((a, b) => b.pendingAmountInINR - a.pendingAmountInINR).slice(0, 5);
            const formattedStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
            let formattedPaymentBreakdown = Object.entries(paymentBreakdown).map(([name, values]) => ({ companyName: name, ...values }));
            formattedPaymentBreakdown = formattedPaymentBreakdown.filter(company => company.taxableAmount > 0 || company.gstAmount > 0 || company.tdsAmount > 0);

            // ------ Set model data ------
            this.getView().getModel("chartData").setData({
                statusDistribution: formattedStatus,
                monthlyValue: formattedMonthly,
                companyTotals: formattedCompanyTotals,
                yearlyTrend: formattedYearlyTrend,
                paymentBreakdown: formattedPaymentBreakdown,
                pendingByCompany: formattedPending
            });
        },



        // --- EVENT HANDLERS FOR CHART SELECTIONS ---
        onStatusChartSelect: function (oEvent) {
            const oSelectedData = oEvent.getParameter("data")[0].data;
            if (!oSelectedData || !oSelectedData.Status) return;
            const sStatus = oSelectedData.Status;
            const aInvoicesForStatus = this._oGroupedInvoices[sStatus] || [];
            const oView = this.getView();
            if (!this._pPopover) {
                this._pPopover = Fragment.load({ id: oView.getId(), name: "sap.kt.com.minihrsolution.fragment.InvoiceListPopover", controller: this })
                    .then(oPopover => { oView.addDependent(oPopover); return oPopover; });
            }
            this._pPopover.then(oPopover => {
                oPopover.setModel(new JSONModel({ status: sStatus, invoices: aInvoicesForStatus }), "popoverData");
                oPopover.openBy(oEvent.getParameter("data")[0].target);
            });
        },

        onPaymentBreakdownSelect: function (oEvent) {
            const oSelectedData = oEvent.getParameter("data")[0].data;
            if (!oSelectedData || !oSelectedData.Company) return;
            const sCompanyName = oSelectedData.Company;
            const aInvoices = this._aCurrentFilteredData.filter(inv => inv.CustomerName === sCompanyName && inv.Currency === "INR");
            aInvoices.forEach(inv => {
                inv.gstAmount = parseFloat(inv.CGST || 0) + parseFloat(inv.SGST || 0) + parseFloat(inv.IGST || 0);
                inv.totalAmountInINR = this._getInrValue(inv);
            });
            if (!this.pPaymentDetailsDialog) {
                this.pPaymentDetailsDialog = Fragment.load({ id: this.getView().getId(), name: "sap.kt.com.minihrsolution.fragment.PaymentBreakdownDetails", controller: this });
            }
            this.pPaymentDetailsDialog.then(oDialog => {
                oDialog.setModel(new JSONModel({ companyName: sCompanyName, invoices: aInvoices }), "dialogData");
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
            oEvent.getSource().getParent().close();
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

            //  converted INR value for each invoice
            aInvoices.forEach(inv => { inv.totalAmountInINR = this._getInrValue(inv); });

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
                // Bind model with data for dialog
                oDialog.setModel(new JSONModel({
                    companyName: sCompanyName,
                    invoices: aInvoices,
                    totalValue: totalValue
                }), "dialogData");

                this.getView().addDependent(oDialog);
                oDialog.open();
            });
        },
        onMonthlyInvoiceSelect: function (oEvent) {
            const aData = oEvent.getParameter("data");
            if (!aData || !aData[0] || !aData[0].data) return;
            const oSelectedData = aData[0].data;
            const sMonth = oSelectedData.Month;
            if (!sMonth) return;

            const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            // const monthNamesLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

            let monthIndex = monthNamesShort.indexOf(sMonth);
            // if (monthIndex === -1) monthIndex = monthNamesLong.indexOf(sMonth);

            // support numeric month strings like "1" or "01" or "12"
            if (monthIndex === -1 && /^\d+$/.test(sMonth)) {
                const num = parseInt(sMonth, 10);
                if (num >= 1 && num <= 12) monthIndex = num - 1;
            }

            //match by prefix ('Jan' )
            if (monthIndex === -1) {
                monthIndex = monthNamesShort.findIndex(m => m.toLowerCase().startsWith(sMonth.toLowerCase()));
            }

            if (monthIndex === -1) {
                // couldn't determine month index — bail out gracefully
                MessageToast.show(this.i18nModel.getText("noDataForSelectedMonth"));
                return;
            }

            // filter invoices by month index
            const aInvoices = (this._aCurrentFilteredData || []).filter(inv => {
                if (!inv || !inv.InvoiceDate) return false;
                const invDate = new Date(inv.InvoiceDate);
                if (isNaN(invDate.getTime())) return false;
                return invDate.getMonth() === monthIndex;
            });

            // convert and normalize INR values (strip commas/currency if any)
            aInvoices.forEach(inv => {
                const raw = this._getInrValue(inv); // keep your existing conversion logic
                // make sure it's a Number (remove currency symbols/commas)
                const num = Number(String(raw).replace(/[^0-9.-]+/g, ""));
                inv.totalAmountInINR = isNaN(num) ? 0 : num;
            });

            // compute total
            const totalValue = aInvoices.reduce((sum, inv) => sum + (inv.totalAmountInINR || 0), 0);

            // open fragment (same as your existing pattern)
            if (!this.pMonthlyInvoicesDialog) {
                this.pMonthlyInvoicesDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "sap.kt.com.minihrsolution.fragment.MonthlyInvoice",
                    controller: this
                });
            }

            this.pMonthlyInvoicesDialog.then(oDialog => {
                oDialog.setModel(new JSONModel({
                    month: monthNamesShort[monthIndex], // pass short name to fragment
                    invoices: aInvoices,
                    totalValue: totalValue
                }), "dialogData");

                this.getView().addDependent(oDialog);
                oDialog.open();
            });
        },
        onYearlyInvoiceSelect: function (oEvent) {
            const aData = oEvent.getParameter("data");
            if (!aData || !aData[0] || !aData[0].data) return;

            const oSelectedData = aData[0].data;
            const sYear = oSelectedData.Year;   // from chart dimension
            if (!sYear) return;

            const iYear = parseInt(sYear, 10);


            const dStart = new Date(iYear, 0, 1);   // Jan 1
            const dEnd = new Date(iYear, 11, 31);   // Dec 31

            // Take from full invoices source
            const aAllInvoices = this._aAllInvoices || this._aCurrentFilteredData || [];

            const aInvoices = aAllInvoices.filter(inv => {
                if (!inv || !inv.InvoiceDate) return false;
                const dInvDate = new Date(inv.InvoiceDate);
                return dInvDate >= dStart && dInvDate <= dEnd;
            });

            // Calculate INR values safely
            aInvoices.forEach(inv => {
                const raw = this._getInrValue(inv);
                const num = Number(String(raw).replace(/[^0-9.-]+/g, ""));
                inv.totalAmountInINR = isNaN(num) ? 0 : num;
            });

            // Total for the year (all Jan–Dec invoices)
            const totalValue = aInvoices.reduce((sum, inv) => sum + (inv.totalAmountInINR || 0), 0);

            if (!this.pYearlyInvoicesDialog) {
                this.pYearlyInvoicesDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "sap.kt.com.minihrsolution.fragment.YearlyInvoice",
                    controller: this
                });
            }

            this.pYearlyInvoicesDialog.then(oDialog => {
                oDialog.setModel(new JSONModel({
                    year: iYear,
                    invoices: aInvoices,
                    totalValue: totalValue
                }), "dialogData");

                this.getView().addDependent(oDialog);
                oDialog.open();
            });
        }






        // onAfterRendering: function () {
        //     var oVizFrame = this.byId("barChartCompany");
        //     var oScroll = this.byId("companyScroll");

        //     // Get your dataset
        //     var aData = this.getView().getModel("chartData").getProperty("/companyTotals");

        //     if (aData && aData.length > 0) {
        //         // Set dynamic height: 60px per bar + some padding
        //         var iRowHeight = 100;
        //         var iChartHeight = aData.length * iRowHeight;

        //         // Apply dynamic height to VizFrame
        //         oVizFrame.setHeight(iChartHeight + "px");
        //     }

        //     // Apply chart properties
        //     oVizFrame.setVizProperties({
        //         title: { visible: false },
        //         plotArea: {
        //             // dataLabel: { visible: true, formatString: "#,##0.##" },
        //             isFixedDataPointSize: true // prevents bar compression
        //         },
        //         valueAxis: { title: { visible: false } },
        //         categoryAxis: { title: { visible: false } }
        //     });
        // }





    });
});