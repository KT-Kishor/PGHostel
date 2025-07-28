sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (BaseController, JSONModel, MessageToast) {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.InvoiceDashboard", {
        _getDefaultChartTypes: function () {
            return { statusType: "donut", monthlyType: "line", companyType: "bar", yearlyType: "line" };
        },
        onInit: function () {
            // Model for all chart data
            this.getView().setModel(new JSONModel({
                statusDistribution: [],
                monthlyValue: [],
                companyTotals: [],
                yearlyTrend: []
            }), "chartData");
            this.getView().setModel(new JSONModel([]), "companies");
            // Chart type model for each chart block - created once
            this.getView().setModel(new JSONModel(this._getDefaultChartTypes()), "invoiceChartTypeModel");

            this.getOwnerComponent().getRouter().getRoute("RouteInvoiceDashboard").attachPatternMatched(this._onObjectMatched, this);
        },
        _onObjectMatched: async function () {
            var LoginFunction = await this.commonLoginFunction("InvoiceDashboard");
            if (!LoginFunction) return;
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("invoiceDashboard"));
            this.getView().getModel("invoiceChartTypeModel").setData(this._getDefaultChartTypes());
            this.onClearFilters();
            this.readInvoiceData();
        },
        // --- Data Fetching and Filtering ---
        readInvoiceData: async function () {
            try {
                const oData = await this.ajaxReadWithJQuery("CompanyInvoice");
                const rawBackendData = Array.isArray(oData.data) ? oData.data : [oData.data];
                // Map data once on load
                this.rawInvoiceData = rawBackendData.map(item => ({
                    CompanyName: item.CustomerName,
                    Amount: parseFloat(item.TotalAmount || 0),
                    Status: item.Status || "Unknown",
                    InvoiceDate: new Date(item.InvoiceDate) // Convert to Date object for easier filtering
                }));
                // Populate company filter dropdown
                const uniqueCompanies = [...new Set(this.rawInvoiceData.map(item => item.CompanyName))];
                this.getView().getModel("companies").setData(uniqueCompanies.map(c => ({ key: c, text: c })));
                // Set default year filter to current year
                this.byId("yearFilter").setValue(new Date().getFullYear().toString());
                // Perform initial data aggregation
                this.onFilterChange();
            } catch (error) {
                MessageToast.show(error.message || this.i18nModel.getText("technicalError"));
            } finally {
                // this.closeBusyDialog();
            }
        },
        // --- Filter and Aggregate Data ---
        onFilterChange: function () {
            if (!this.rawInvoiceData) {
                return;
            }
            this.getBusyDialog();
            setTimeout(function () {
                try {
                    const aSelectedCompanies = this.byId("companyFilter").getSelectedKeys();
                    const sSelectedYear = this.byId("yearFilter").getValue();
                    // --- Filter data for the first 3 charts based on all filters ---
                    let aFilteredData = this.rawInvoiceData;
                    if (aSelectedCompanies.length > 0) {
                        aFilteredData = aFilteredData.filter(invoice => aSelectedCompanies.includes(invoice.CompanyName));
                    }
                    if (sSelectedYear) {
                        aFilteredData = aFilteredData.filter(invoice => invoice.InvoiceDate.getFullYear().toString() === sSelectedYear);
                    }
                    // --- Filter data for the Yearly Trend chart (ignores year filter) ---
                    let aYearlyTrendData = this.rawInvoiceData;
                    if (aSelectedCompanies.length > 0) {
                        aYearlyTrendData = aYearlyTrendData.filter(invoice => aSelectedCompanies.includes(invoice.CompanyName));
                    }
                    this._aggregateAndSetChartData(aFilteredData, aYearlyTrendData);
                } catch (error) {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                } finally {
                    this.closeBusyDialog();
                }
            }.bind(this), 500); // The .bind(this) is crucial to maintain the controller's context
        },
        // --- Aggregate and Set Chart Data ---
        _aggregateAndSetChartData: function (aFilteredData, aYearlyTrendData) {
            // 1. Status Distribution (Donut Chart)
            const statusDistribution = aFilteredData.reduce((acc, item) => {
                acc[item.Status] = (acc[item.Status] || 0) + 1;
                return acc;
            }, {});
            // 2. Monthly Value (Line Chart)
            const monthlyValue = aFilteredData.reduce((acc, item) => {
                const month = item.InvoiceDate.getMonth(); // 0-11
                acc[month] = (acc[month] || 0) + item.Amount;
                return acc;
            }, {});
            // 3. Company Totals (Bar Chart)
            const companyTotals = aFilteredData.reduce((acc, item) => {
                acc[item.CompanyName] = (acc[item.CompanyName] || 0) + item.Amount;
                return acc;
            }, {});
            // 4. Yearly Trend (Line Chart)
            const yearlyTrend = aYearlyTrendData.reduce((acc, item) => {
                const year = item.InvoiceDate.getFullYear();
                if (!acc[year]) acc[year] = { totalAmount: 0, count: 0 };
                acc[year].totalAmount += item.Amount;
                acc[year].count++;
                return acc;
            }, {});
            // --- Format data for models ---
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const formattedMonthly = Array.from({ length: 12 }, (_, i) => ({
                month: monthNames[i],
                totalAmount: monthlyValue[i] || 0
            }));
            this.getView().getModel("chartData").setData({
                statusDistribution: Object.entries(statusDistribution).map(([st, co]) => ({ status: st, count: co })),
                monthlyValue: formattedMonthly,
                companyTotals: Object.entries(companyTotals).map(([name, total]) => ({ companyName: name, totalAmount: total })).sort((a, b) => b.totalAmount - a.totalAmount),
                yearlyTrend: Object.entries(yearlyTrend).map(([yr, data]) => ({ year: yr, ...data })).sort((a, b) => a.year - b.year)
            });
        },
        // --- Chart Type Switchers ---
        IN_onPressStatusPie: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/statusType", "pie"); },
        IN_onPressStatusBar: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/statusType", "bar"); },
        IN_onPressStatusDonut: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/statusType", "donut"); },
        IN_onPressMonthlyPie: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/monthlyType", "pie"); },
        IN_onPressMonthlyBar: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/monthlyType", "bar"); },
        IN_onPressMonthlyLine: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/monthlyType", "line"); },
        IN_onPressCompanyPie: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/companyType", "pie"); },
        IN_onPressCompanyBar: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/companyType", "bar"); },
        IN_onPressYearlyBar: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/yearlyType", "bar"); },
        IN_onPressYearlyLine: function () { this.getView().getModel("invoiceChartTypeModel").setProperty("/yearlyType", "line"); },

        // --- Filter Reset ---
        onClearFilters: function () {
            this.byId("companyFilter").setSelectedKeys(null);
            this.byId("yearFilter").setValue(new Date().getFullYear().toString()); // Reset to current year
        },
        // --- Navigation back ---
        onPressback: function () { this.getRouter().navTo("RouteTilePage"); },
        onLogout: function () { this.getRouter().navTo("RouteLoginPage"); }
    });
});