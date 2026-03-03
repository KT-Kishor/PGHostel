sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "../model/formatter"
], function (BaseController, JSONModel, MessageToast, Fragment, Formatter) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.DamageDashboard", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteDamageDashboard").attachMatched(this._onRouteMatched, this);
            this.getView().setModel(new sap.ui.model.json.JSONModel({ monthly: "column", daily: "column", status: "column", payment: "column" }), "chartTypeModel");
        },

        _onRouteMatched: async function () {
            sap.ui.core.BusyIndicator.show(0);
            try {
                this.commonLoginFunction();
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this._ViewDatePickersReadOnly(["id_DD_year", "id_DD_Date"], this.getView());
                const oLogin = this.getOwnerComponent().getModel("LoginModel")?.getData();
                if (!oLogin || !oLogin.BranchCode) return sap.m.MessageToast.show("Login branch not found");
                this._aUserBranches = oLogin.BranchCode ? oLogin.BranchCode.split(",").map(b => b.trim()) : [];
                await this._loadUserBranches();
                this._setDefaultDates();
                await this.DD_search();
            } catch (err) {
                MessageToast.show("Something went wrong");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        _loadUserBranches: async function () {
            const oData = await this.ajaxReadWithJQuery("HM_Branch", {});
            let aAllBranches = Array.isArray(oData.data) ? oData.data : [oData.data];
            let aFiltered = aAllBranches.filter(b =>
                this._aUserBranches.includes(b.BranchID));
            this.getView().setModel(new JSONModel(aFiltered), "branchModel");
        },

        DD_onPressClear: function () {
            this.byId("id_DD_branch").setSelectedKeys([]);
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            const oYearRange = this.byId("id_DD_year");
            oYearRange.setDateValue(firstDay);
            oYearRange.setSecondDateValue(lastDay);
            const oMonthPicker = this.byId("id_DD_Date");
            oMonthPicker.setDateValue(firstDay);
        },

        DD_search: async function () {
            sap.ui.core.BusyIndicator.show(0);
            try {
                const aSelectedBranches = this.byId("id_DD_branch").getSelectedKeys();
                let aBranchesToUse = [];
                if (!aSelectedBranches || aSelectedBranches.length === 0) {
                    aBranchesToUse = this._aUserBranches || [];
                } else {
                    aBranchesToUse = aSelectedBranches.filter(b =>
                        this._aUserBranches.includes(b)
                    );
                    if (aBranchesToUse.length === 0) {
                        sap.m.MessageToast.show("Unauthorized branch selected");
                        return;
                    }
                }
                const branchPayload = aBranchesToUse.join(",");
                const oRange = this.byId("id_DD_year");
                const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                    pattern: "yyyy-MM-dd"
                });
                let startDate = null;
                let endDate = null;
                if (oRange.getDateValue() && oRange.getSecondDateValue()) {
                    startDate = oDateFormat.format(oRange.getDateValue());
                    endDate = oDateFormat.format(oRange.getSecondDateValue());
                }
                let payload = {
                    BranchCode: branchPayload,
                    StartDate: startDate,
                    EndDate: endDate,
                    StartReturnDamageDate: "",
                    EndReturnDamageDate: ""
                };
                const oChartResponse = await this.ajaxCreateWithJQuery("HM_DamageChart", payload);
                console.log("HM_DamageChart FULL RESPONSE:", oChartResponse);
                const aCharts = oChartResponse?.data || [];

                const oItems = aCharts.find(c => c.chart === "ItemName");
                const oType = aCharts.find(c => c.chart === "Type");
                const oStatus = aCharts.find(c => c.chart === "Status");
                const aItemsData = (oItems?.data || []).map(d => ({ ItemName: d.name, Count: d.count }));
                const aTypeData = (oType?.data || []).map(d => ({ Type: d.name, Count: d.count }));
                const aStatusData = (oStatus?.data || []).map(d => ({ Status: d.name, Count: d.count }));

                this.getView().setModel(new JSONModel(aItemsData), "itemsModel");
                this.getView().setModel(new JSONModel(aTypeData), "typeModel");
                this.getView().setModel(new JSONModel(aStatusData), "statusModel");
                console.log("STATUS MODEL:", aStatusData);
                const oRangeDaily = this.byId("id_DD_Date");
                let dailyStart = null;
                let dailyEnd = null;
                if (oRangeDaily.getDateValue()) {
                    const selectedDate = oRangeDaily.getDateValue();

                    const year = selectedDate.getFullYear();
                    const month = selectedDate.getMonth();

                    const firstDay = new Date(year, month, 1);
                    const lastDay = new Date(year, month + 1, 0);

                    dailyStart = oDateFormat.format(firstDay);
                    dailyEnd = oDateFormat.format(lastDay);
                }
                const oDailyResponse = await this.ajaxCreateWithJQuery(
                    "HM_DamageCurrentMonthBarChart",
                    {
                        StartDate: dailyStart,
                        EndDate: dailyEnd
                    }
                );
                console.log("DAILY RESPONSE:", oDailyResponse)
                const formattedDaily = (oDailyResponse.data || []).map(d => ({
                    Date: d.Date.split("-")[2],
                    Recovered: d.Recovered,
                    Pending: d.Pending
                }));
                this.getView().setModel(new JSONModel(formattedDaily), "dailyModel");
            } catch (err) {
                sap.m.MessageToast.show("Dashboard load failed");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        _setDefaultDates: function () {
            const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                pattern: "yyyy-MM-dd"
            });

            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            // Set Year filter
            const oYearRange = this.byId("id_DD_year");
            oYearRange.setDateValue(firstDay);
            oYearRange.setSecondDateValue(lastDay);

            // Set Date filter
            const oDateRange = this.byId("id_DD_Date");
            oDateRange.setDateValue(firstDay);
        },

        onColumnChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/monthly", "column");
        },

        onBarChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/monthly", "bar");
        },

        onLineChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/monthly", "line");
        },

        onPieChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/monthly", "pie");
        },

        ondayColumnChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/daily", "stacked_column");
        },

        ondayBarChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/daily", "bar");
        },

        ondayLineChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/daily", "line");
        },

        ondayPieChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/daily", "pie");
        },

        onStatusColumnChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/status", "donut");
        },

        onStatusBarChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/status", "bar");
        },

        onStatusLineChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/status", "line");
        },

        onStatusPieChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/status", "pie");
        },

        onPayColumnChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/payment", "column");
        },

        onPayBarChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/payment", "bar");
        },

        onPayLineChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/payment", "donut");
        },

        onPayPieChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/payment", "pie");
        },

        onHome: function () {
            this.CommonLogoutFunction();
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },
    })
})