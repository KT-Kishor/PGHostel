sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "../model/formatter"
], function (BaseController, JSONModel, MessageToast, Fragment, Formatter) {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.InvoiceDashboard", {
         Formatter: Formatter,

        _oGroupedInvoices: {},
        _aCurrentFilteredData: [], // Store currently filtered data for drill-downs

        onInit: function () {
            const oChartData = { statusDistribution: [], monthlyValue: [], companyTotals: [], yearlyTrend: [], paymentBreakdown: [], pendingByCompany: [] };
            const oChartTypes = { statusType: "donut", monthlyType: "line", companyType: "bar", yearlyType: "line", paymentBreakdownType: "stacked_bar", pendingByCompanyType: "column" };
            this.getView().setModel(new JSONModel(oChartData), "chartData");
            this.getView().setModel(new JSONModel([]), "companies");
            this.getView().setModel(new JSONModel(oChartTypes), "invoiceChartTypeModel");
            this.getOwnerComponent().getRouter().getRoute("RouteInvoiceDashboard").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: async function () {
            var LoginFunction = await this.commonLoginFunction("InvoiceDashboard");
            if (!LoginFunction) return;
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("invoiceDashboard"));  
            // Clear selections and close any open popovers
            this.byId("donutChartStatus").vizSelection([], { clearSelection: true });
            if (this._pPopover) { this._pPopover.then(oPopover => oPopover.close()); }
            this.onClearFilters();
            this.readInvoiceData();
        },

        readInvoiceData: async function () {
            try {
                const oData = await this.ajaxReadWithJQuery("CompanyInvoice");
                this.rawInvoiceData = (Array.isArray(oData.data) ? oData.data : [oData.data]);
                const uniqueCompanies = [...new Set(this.rawInvoiceData.map(item => item.CustomerName))];
                this.getView().getModel("companies").setData(uniqueCompanies.map(c => ({ key: c, text: c })));
                this.byId("yearFilter").setValue(new Date().getFullYear().toString());
                this.onFilterChange();
            } catch (error) {
                MessageToast.show(error.message || this.i18nModel.getText("technicalError"));
            }
        },

        onFilterChange: function () {
            if (!this.rawInvoiceData) return;
            this.getBusyDialog();
            setTimeout(() => {
                try {
                    const aSelectedCompanies = this.byId("companyFilter").getSelectedKeys();
                    const sSelectedYear = this.byId("yearFilter").getValue();
                    const oDateRange = this.byId("DashI_id_Date");
                    const dFrom = oDateRange.getDateValue();
                    const dTo = oDateRange.getSecondDateValue();

                    let aFilteredData = this.rawInvoiceData.filter(item => {
                        const invoiceDate = new Date(item.InvoiceDate);
                        let bCompanyMatch = aSelectedCompanies.length === 0 || aSelectedCompanies.includes(item.CustomerName);
                        let bDateMatch = true;
                        if (dFrom && dTo) {
                            const dEndDate = new Date(dTo);
                            dEndDate.setDate(dEndDate.getDate() + 1);
                            bDateMatch = invoiceDate >= dFrom && invoiceDate < dEndDate;
                        } else if (sSelectedYear) {
                            bDateMatch = invoiceDate.getFullYear().toString() === sSelectedYear;
                        }
                        return bCompanyMatch && bDateMatch;
                    });   
                    // Store the filtered data for drill-down actions
                    this._aCurrentFilteredData = aFilteredData;

                    let aYearlyTrendData = (aSelectedCompanies.length > 0)
                        ? this.rawInvoiceData.filter(invoice => aSelectedCompanies.includes(invoice.CustomerName))
                        : this.rawInvoiceData;                   
                    this._aggregateAndSetAllChartData(aFilteredData, aYearlyTrendData);
                } catch (error) {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                } finally {
                    this.closeBusyDialog();
                }
            }, 100);
        },

        // --- HELPER to get INR value. Refactored to be reusable ---
        _getInrValue: function(item) {
             const totalAmount = parseFloat(item.TotalAmount || 0);
             if (item.Currency === "INR") {
                 return totalAmount;
             }
             const amountInINR = parseFloat(item.AmountInINR || 0);
             if (amountInINR > 0) {
                 return amountInINR;
             }
             const conversionRate = parseFloat(item.ConversionRate || 1);
             return totalAmount * conversionRate;
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
            const pendingStatuses = ["Submitted", "Payment Partially"];
            const pendingByCompany = aFilteredData.filter(item => pendingStatuses.includes(item.Status)).reduce((acc, item) => {
                acc[item.CustomerName] = (acc[item.CustomerName] || 0) + this._getInrValue(item);
                return acc;
            }, {});

            // --- Aggregation for charts that DO NOT need currency conversion ---
            this._oGroupedInvoices = {};
            const statusCounts = aFilteredData.reduce((acc, item) => {
                const status = item.Status || "Unknown";
                if (!this._oGroupedInvoices[status]) { this._oGroupedInvoices[status] = []; }
                this._oGroupedInvoices[status].push(item);
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});   
            // --- Aggregation for Payment Breakdown (INR only) ---
            const paymentBreakdown = aFilteredData.reduce((acc, item) => {
                if (item.Currency === "INR") {
                    const company = item.CustomerName;
                    if (!acc[company]) {
                        acc[company] = { taxableAmount: 0, gstAmount: 0, tdsAmount: 0 };
                    }
                    const totalGst = parseFloat(item.CGST || 0) + parseFloat(item.SGST || 0) + parseFloat(item.IGST || 0);
                    acc[company].taxableAmount += parseFloat(item.SubTotalInGST || 0);
                    acc[company].gstAmount += totalGst;
                    acc[company].tdsAmount += parseFloat(item.IncomeTax || 0);
                }
                return acc;
            }, {});

            // --- Formatting for UI Models ---
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const formattedMonthly = monthNames.map((monthName, i) => ({ month: monthName, totalAmountInINR: monthlyValue[i] || 0 }));
            const formattedCompanyTotals = Object.entries(companyTotals).map(([name, total]) => ({ companyName: name, totalAmountInINR: total })).sort((a, b) => b.totalAmountInINR - a.totalAmountInINR);
            const formattedYearlyTrend = Object.entries(yearlyTrend).map(([yr, data]) => ({ year: yr, ...data })).sort((a, b) => a.year - b.year);
            const formattedPending = Object.entries(pendingByCompany).map(([name, amount]) => ({ companyName: name, pendingAmountInINR: amount })).sort((a, b) => b.pendingAmountInINR - a.pendingAmountInINR).slice(0, 5); // MODIFIED: Get top 5
            const formattedStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
            const formattedPaymentBreakdown = Object.entries(paymentBreakdown).map(([name, values]) => ({ companyName: name, ...values }));
            
            // --- Set data to the model ---
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
                const oPopoverModel = new JSONModel({ status: sStatus, invoices: aInvoicesForStatus });
                oPopover.setModel(oPopoverModel, "popoverData");
                oPopover.openBy(oEvent.getParameter("data")[0].target);
            });
        },

        onPaymentBreakdownSelect: function (oEvent) {
            const oSelectedData = oEvent.getParameter("data")[0].data;
            if (!oSelectedData || !oSelectedData.Company) return;
            const sCompanyName = oSelectedData.Company;
            const aInvoices = this._aCurrentFilteredData.filter(inv => inv.CustomerName === sCompanyName && inv.Currency === "INR");
            // Add calculated values needed for the dialog table
            aInvoices.forEach(inv => {
                inv.gstAmount = parseFloat(inv.CGST || 0) + parseFloat(inv.SGST || 0) + parseFloat(inv.IGST || 0);
                inv.totalAmountInINR = this._getInrValue(inv); 
            });
            if (!this.pPaymentDetailsDialog) {
                this.pPaymentDetailsDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "sap.kt.com.minihrsolution.fragment.PaymentBreakdownDetails",
                    controller: this
                });
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
            const aPendingStatuses = ["Submitted", "Payment Partially"];
            const aInvoices = this._aCurrentFilteredData.filter(inv =>
                inv.CustomerName === sCompanyName && aPendingStatuses.includes(inv.Status)
            );
            // Add calculated values needed for the dialog table
            aInvoices.forEach(inv => {
                inv.pendingAmountInINR = this._getInrValue(inv);
            });
            if (!this.pPendingInvoicesDialog) {
                this.pPendingInvoicesDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "sap.kt.com.minihrsolution.fragment.PendingInvoicesDialog",
                    controller: this
                });
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
        
        onInvoiceNumberPress: function (oEvent) {
            this.getRouter().navTo("RouteCompanyInvoiceDetails", { sPath: encodeURIComponent(oEvent.getSource().getBindingContext("popoverData").getObject().InvNo) });
        },

        // --- CHART TYPE SWITCHERS ---
        IN_onPressStatusPie: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/statusType", "pie"); },
        IN_onPressStatusBar: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/statusType", "bar"); },
        IN_onPressStatusDonut: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/statusType", "donut"); },
        IN_onPressMonthlyPie: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/monthlyType", "pie"); },
        IN_onPressMonthlyBar: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/monthlyType", "bar"); },
        IN_onPressMonthlyLine: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/monthlyType", "line"); },
        IN_onPressCompanyPie: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/companyType", "pie"); },
        IN_onPressCompanyBar: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/companyType", "bar"); },
        IN_onPressYearlyBar: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/yearlyType", "bar"); },
        onPressYearlyLine: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/yearlyType", "line"); },
        onPressPaymentStacked: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/paymentBreakdownType", "stacked_bar"); },
        onPressPaymentGrouped: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/paymentBreakdownType", "bar"); },
        onPressPendingColumn: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/pendingByCompanyType", "column"); },
        onPressPendingBar: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/pendingByCompanyType", "bar"); },

        onClearFilters: function () {
            this.byId("companyFilter").setSelectedKeys(null);
            this.byId("DashI_id_Date").setValue("");
            this.byId("yearFilter").setValue(new Date().getFullYear().toString());
        },
        onPressback: function () { this.getRouter().navTo("RouteTilePage"); },
        onLogout: function () { this.getRouter().navTo("RouteLoginPage"); }
    });
});