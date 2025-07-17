sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (BaseController, JSONModel, MessageToast) {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.InvoiceDashboard", {

        onInit: function () {
            // Model for all chart data
            this.getView().setModel(new JSONModel({
                statusDistribution: [],
                monthlyValue: [],
                companyTotals: [],
                yearlyTrend: []
            }), "chartData");

            this.getView().setModel(new JSONModel([]), "companies");
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteInvoiceDashboard").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: async function () {
            var LoginFunction = await this.commonLoginFunction("InvoiceDashboard");
            if (!LoginFunction) return;

            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("invoiceDashboard"));
            this.onClearFilters()
            this.readInvoiceData();
        },

        readInvoiceData: async function () {
            this.getBusyDialog();
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
                this.closeBusyDialog();
            }
        },
        
        onFilterChange: function () {
            if (!this.rawInvoiceData) return;

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
        },

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
                companyTotals: Object.entries(companyTotals).map(([name, total]) => ({ companyName: name, totalAmount: total })).sort((a,b) => b.totalAmount - a.totalAmount),
                yearlyTrend: Object.entries(yearlyTrend).map(([yr, data]) => ({ year: yr, ...data })).sort((a,b) => a.year - b.year)
            });
        },

        onClearFilters: function() {
            this.byId("companyFilter").setSelectedKeys(null);
            this.byId("yearFilter").setValue(new Date().getFullYear().toString()); // Reset to current year
           // this.onFilterChange();
        },

        // --- Navigation and Standard Functions ---
        onPressback: function () { this.getRouter().navTo("RouteTilePage"); },
        onLogout: function () { this.getRouter().navTo("RouteLoginPage"); }
    });
});