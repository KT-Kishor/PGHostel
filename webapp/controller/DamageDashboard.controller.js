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
        },

        _onRouteMatched: async function () {
            sap.ui.core.BusyIndicator.show(0);
            try {
                this.commonLoginFunction();
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this._ViewDatePickersReadOnly(["id_DD_year"], this.getView());
                const oLogin = this.getOwnerComponent().getModel("LoginModel")?.getData();
                if (!oLogin || !oLogin.BranchCode) return sap.m.MessageToast.show("Login branch not found");
                this._aUserBranches = oLogin.BranchCode ? oLogin.BranchCode.split(",").map(b => b.trim()) : [];
                await this._loadUserBranches();
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
            this.byId("id_DD_branch").setValue("");
            this.byId("id_DD_year").setValue("");
        },

        DD_search: async function () {
            sap.ui.core.BusyIndicator.show(0);
            try {
                const sBranch = this.byId("id_DD_branch").getSelectedKey();
                const oRange = this.byId("id_DD_year");

                let startDate = null;
                let endDate = null;
                if (oRange.getDateValue() && oRange.getSecondDateValue()) {
                    startDate = oRange.getDateValue().toISOString().split("T")[0];
                    endDate = oRange.getSecondDateValue().toISOString().split("T")[0];
                }
                let payload = {
                    BranchCode: sBranch || this._aUserBranches.join(","),
                    StartDate: startDate,
                    EndDate: endDate,
                    StartReturnDamageDate: startDate,
                    EndReturnDamageDate: endDate
                };
                const oChartResponse = await this.ajaxCreateWithJQuery("HM_DamageChart", payload);
                console.log("damage chart:", payload);
                this.getView().setModel(new JSONModel(oChartResponse.data || []), "damageChartModel");

                const oDailyResponse = await this.ajaxCreateWithJQuery(
                    "HM_DamageCurrentMonthBarChart",
                    {
                        StartDate: startDate,
                        EndDate: endDate
                    }
                );
                this.getView().setModel(new JSONModel(oDailyResponse.data || []), "dailyModel");
            } catch (err) {
                sap.m.MessageToast.show("Dashboard load failed");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
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