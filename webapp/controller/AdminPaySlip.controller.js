sap.ui.define([
    "./BaseController", "../model/formatter", "sap/ui/core/BusyIndicator"
],
    function (BaseController, Formatter, BusyIndicator) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.AdminPaySlip", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteAdminPaySlip").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function () {
                var LoginFunction = await this.commonLoginFunction("PaySlip");
                if (!LoginFunction) return;
                this.AP_onSearch();
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.oModel = this.getView().getModel("PaySlip");
                this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("paySlipTitle"));
            },

            AP_onPressAddPayslip: function () {
                this.getRouter().navTo("RouteNavAdminPaySlipApp");
            },

            onPressback: function () {
                this.getOwnerComponent().getRouter().navTo("RouteTilePage");
            },

            onLogout: function () {
                this.getOwnerComponent().getRouter().navTo("RouteLoginPage");
            },

            AP_onSearch: async function () {
                this.getView().byId("AP_id_AdminPaySlipTable").setBusy(true);
                var aFilterItems = this.byId("AP_id_AdminPaySlip").getFilterGroupItems();
                var params = {};
                aFilterItems.forEach(function (oItem) {
                    var oControl = oItem.getControl();
                    var sValue = oItem.getName();
                    if (oControl && oControl.getValue()) {
                        if (sValue === "PaySlipDate") {
                            params["PaySlipStartMonth"] = "01-" + oControl.getValue().split(' to ')[0];
                            params["PaySlipEndMonth"] = "02-" + oControl.getValue().split(' to ')[1];
                        } else {
                            params[sValue] = oControl.getSelectedKey();
                        }
                    }
                });
                await this._commonGETCall("AdminPaySlip", "EmpTable", params);
                this.getView().byId("AP_id_AdminPaySlipTable").setBusy(false);
            },

            AP_onClear: function () {
                var aFilterItems = this.byId("AP_id_AdminPaySlip").getFilterGroupItems();
                aFilterItems.forEach(function (oItem) {
                    (oItem.getControl().setSelectedKey) ? oItem.getControl().setSelectedKey("") : oItem.getControl().setValue("");
                });
            },

            AP_onPressAddPayslip: function () {
                BusyIndicator.show(0);
                this.oModel.setProperty("/isCreate", true);
                this.oModel.setProperty("/isIdSelected", false);
                this.oModel.setProperty("/EmpData", {});
                this.oModel.setProperty("/BackRoute", "RouteAdminPaySlip");
                this.getRouter().navTo("RouteNavAdminPaySlipApp");
            },

            AP_onPressPayslip: function (oEvent) {
                var sPath = oEvent.getSource().getBindingContext("PaySlip").getPath();
                this.oModel.setProperty("/isCreate", false);
                this.oModel.setProperty("/isIdSelected", true);
                this.oModel.setProperty("/EmpData", {});
                this.oModel.setProperty("/BackRoute", "RouteAdminPaySlip");
                var month = this.oModel.getProperty(`${sPath}/YearMonth`).split("-")[1];
                var filters = {
                    ID: this.oModel.getProperty(`${sPath}/ID`),
                    EmployeeID: this.oModel.getProperty(`${sPath}/EmployeeID`),
                    FinancialYear: this.oModel.getProperty(`${sPath}/FinancialYear`),
                    Month: month,
                };
                this.oModel.setProperty("/SelectedFilters", filters);
                this.getRouter().navTo("RouteNavAdminPaySlipApp");
            }
        });
    });