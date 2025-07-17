sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.InvoiceDashboard", {

        onInit: function () {
            this.getView().setModel(new JSONModel({
                invoiceCounts: [],
                companyTotals: []
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
            this._fetchAndProcessData();
        },
        onPressback: function () {
            this.getRouter().navTo("RouteTilePage");
        },
        onLogout: function () {
            this.getRouter().navTo("RouteLoginPage");
        },

        _fetchAndProcessData: async function () {
            // const rawInvoiceData = await this.ajaxReadWithJQuery("CompanyInvoice", "InvoiceData");
            const rawInvoiceData = this._getMockInvoiceData();
            this.rawInvoiceData = rawInvoiceData; // Store raw data on the controller

            // Populate the company filter dropdown with unique company names
            const uniqueCompanies = [...new Set(rawInvoiceData.map(item => item.CompanyName))];
            this.getView().getModel("companies").setData(uniqueCompanies.map(c => ({ key: c })));

            // Initial processing of data
            this.onFilterChange();
        },

        onFilterChange: function () {
            const oCompanyFilter = this.byId("companyFilter");
            const oTimeFilter = this.byId("timePeriodFilter");

            const aSelectedCompanies = oCompanyFilter.getSelectedKeys();
            const sSelectedPeriod = oTimeFilter.getSelectedKey();

            // 1. Filter the raw data based on selected companies
            let aFilteredData = this.rawInvoiceData;
            if (aSelectedCompanies.length > 0) {
                aFilteredData = this.rawInvoiceData.filter(invoice =>
                    aSelectedCompanies.includes(invoice.CompanyName)
                );
            }

            // 2. Aggregate the filtered data for the charts
            const oAggregatedData = this._aggregateData(aFilteredData, sSelectedPeriod);

            // 3. Set the new data to the chart model, which updates the UI
            this.getView().getModel("chartData").setData(oAggregatedData);
        },

        _aggregateData: function (aData, sPeriodType) {
            // This is the core logic for data aggregation

            // Aggregation for Bar Chart (Count by Period)
            const periodCounts = aData.reduce((acc, invoice) => {
                const dInvoiceDate = new Date(invoice.InvoiceDate);
                const sPeriodLabel = this._getPeriodLabel(dInvoiceDate, sPeriodType);

                if (!acc[sPeriodLabel]) {
                    acc[sPeriodLabel] = { periodLabel: sPeriodLabel, count: 0 };
                }
                acc[sPeriodLabel].count++;
                return acc;
            }, {});

            // Aggregation for Pie Chart (Total by Company)
            const companyTotals = aData.reduce((acc, invoice) => {
                const sCompanyName = invoice.CompanyName;
                if (!acc[sCompanyName]) {
                    acc[sCompanyName] = { companyName: sCompanyName, totalAmount: 0 };
                }
                acc[sCompanyName].totalAmount += parseFloat(invoice.Amount);
                return acc;
            }, {});

            return {
                // Convert objects to arrays for the model
                invoiceCounts: Object.values(periodCounts).sort((a, b) => a.periodLabel.localeCompare(b.periodLabel)),
                companyTotals: Object.values(companyTotals)
            };
        },

        _getPeriodLabel: function (oDate, sPeriodType) {
            const year = oDate.getFullYear();
            const month = oDate.getMonth(); // 0-11

            switch (sPeriodType) {
                case "Quarterly":
                    const quarter = Math.floor(month / 3) + 1;
                    return `${year}-Q${quarter}`;
                case "HalfYearly":
                    const half = month < 6 ? "H1" : "H2";
                    return `${year}-${half}`;
                case "Yearly":
                default:
                    return year.toString();
            }
        },

        _getMockInvoiceData: function () {
            return [
                { "InvoiceDate": "2023-01-15", "CompanyName": "Company A", "Amount": "1500.00" },
                { "InvoiceDate": "2023-02-20", "CompanyName": "Company B", "Amount": "2500.50" },
                { "InvoiceDate": "2023-04-10", "CompanyName": "Company A", "Amount": "3000.00" },
                { "InvoiceDate": "2023-05-05", "CompanyName": "Company C", "Amount": "1200.75" },
                { "InvoiceDate": "2023-08-18", "CompanyName": "Company B", "Amount": "4000.00" },
                { "InvoiceDate": "2023-11-25", "CompanyName": "Company A", "Amount": "2200.00" },
                { "InvoiceDate": "2024-02-01", "CompanyName": "Company C", "Amount": "1800.00" },
                { "InvoiceDate": "2024-03-30", "CompanyName": "Company B", "Amount": "3200.25" }
            ];
        }
    });
});