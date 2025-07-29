sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment"
], function (BaseController, JSONModel, MessageToast, Fragment) {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.InvoiceDashboard", {

        _oGroupedInvoices: {},

        onInit: function () {
            this.getView().setModel(new JSONModel({
                statusDistribution: [],
                monthlyValue: [],
                companyTotals: [],
                yearlyTrend: []
            }), "chartData");
            this.getView().setModel(new JSONModel([]), "companies");
            this.getView().setModel(new JSONModel({ statusType: "donut", monthlyType: "line", companyType: "bar", yearlyType: "line" }), "invoiceChartTypeModel");
            this.getOwnerComponent().getRouter().getRoute("RouteInvoiceDashboard").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: async function () {
            var LoginFunction = await this.commonLoginFunction("InvoiceDashboard");
            if (!LoginFunction) return;
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("invoiceDashboard"));
            this.getView().setModel(new JSONModel({ statusType: "donut", monthlyType: "line", companyType: "bar", yearlyType: "line" }), "invoiceChartTypeModel");
            this.onClearFilters();
            this.readInvoiceData();
             this.byId("donutChartStatus").vizSelection([], { clearSelection: true });
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

        _aggregateAndSetAllChartData: function (aFilteredData, aYearlyTrendData) {
            this._oGroupedInvoices = {};
            const statusCounts = {};
            aFilteredData.forEach(invoice => {
                const status = invoice.Status || "Unknown";
                if (!this._oGroupedInvoices[status]) { this._oGroupedInvoices[status] = []; }
                this._oGroupedInvoices[status].push(invoice);
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });
            const aStatusDistribution = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

            const monthlyValue = aFilteredData.reduce((acc, item) => {
                const month = new Date(item.InvoiceDate).getMonth();
                acc[month] = (acc[month] || 0) + parseFloat(item.TotalAmount || 0);
                return acc;
            }, {});
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const formattedMonthly = monthNames.map((monthName, i) => ({ month: monthName, totalAmount: monthlyValue[i] || 0 }));

            const companyTotals = aFilteredData.reduce((acc, item) => {
                acc[item.CustomerName] = (acc[item.CustomerName] || 0) + parseFloat(item.TotalAmount || 0);
                return acc;
            }, {});
            const formattedCompanyTotals = Object.entries(companyTotals)
                .map(([name, total]) => ({ companyName: name, totalAmount: total }))
                .sort((a, b) => b.totalAmount - a.totalAmount);

            const yearlyTrend = aYearlyTrendData.reduce((acc, item) => {
                const year = new Date(item.InvoiceDate).getFullYear();
                if (!acc[year]) acc[year] = { totalAmount: 0, count: 0 };
                acc[year].totalAmount += parseFloat(item.TotalAmount || 0);
                acc[year].count++;
                return acc;
            }, {});
            const formattedYearlyTrend = Object.entries(yearlyTrend)
                .map(([yr, data]) => ({ year: yr, ...data }))
                .sort((a, b) => a.year - b.year);

            this.getView().getModel("chartData").setData({
                statusDistribution: aStatusDistribution,
                monthlyValue: formattedMonthly,
                companyTotals: formattedCompanyTotals,
                yearlyTrend: formattedYearlyTrend
            });
        },

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
                const oPopoverModel = new JSONModel({
                    status: sStatus,
                    invoices: aInvoicesForStatus
                });
                oPopover.setModel(oPopoverModel, "popoverData"); // <-- SET MODEL ON POPOVER
                oPopover.openBy(oEvent.getParameter("data")[0].target);
            });
        },

        onInvoiceNumberPress: function (oEvent) {
            this.getRouter().navTo("RouteCompanyInvoiceDetails", { sPath: encodeURIComponent(oEvent.getSource().getBindingContext("popoverData").getObject().InvNo) });

        },

        // --- Other functions ---
        IN_onPressStatusPie: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/statusType", "pie"); },
        IN_onPressStatusBar: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/statusType", "bar"); },
        IN_onPressStatusDonut: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/statusType", "donut"); },
        IN_onPressMonthlyPie: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/monthlyType", "pie"); },
        IN_onPressMonthlyBar: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/monthlyType", "bar"); },
        IN_onPressMonthlyLine: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/monthlyType", "line"); },
        IN_onPressCompanyPie: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/companyType", "pie"); },
        IN_onPressCompanyBar: function () { this.getView().getModel("invoiceChartTypeM odel").setProperty("/companyType", "bar"); },
        IN_onPressYearlyBar: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/yearlyType", "bar"); },
        IN_onPressYearlyLine: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/yearlyType", "line"); },

       onClearFilters: function () {
            this.byId("companyFilter").setSelectedKeys(null);
            this.byId("DashI_id_Date").setValue("");
            this.byId("yearFilter").setValue(new Date().getFullYear().toString()); // Reset to current year
        },

        onPressback: function () { this.getRouter().navTo("RouteTilePage"); },
        onLogout: function () { this.getRouter().navTo("RouteLoginPage"); }
    });
});