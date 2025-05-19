sap.ui.define([
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
],
    function (BaseController, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.AdminPaySlip", {
            onInit: function () {
                this.getRouter().getRoute("RouteAdminPaySlip").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function (oEvent) {
                var LoginFunction = await this.commonLoginFunction("PaySlip");
                if (!LoginFunction) return;
                this.getBusyDialog();
                this.oModel = this.getView().getModel("PaySlip");
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "Generate Pay Slip");
                await this._commonGETCall("AdminPaySlip", "EmpTable");
                console.log(this.oModel.getData());
                this.closeBusyDialog();
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
                    oItem.getControl().setValue("");
                    // var oControl = oItem.getControl(); // Get the associated control
                    // if (oControl) {
                    //     if (oControl.setValue) {
                    //         oControl.setValue(""); // Clear value for ComboBox, Input, DatePicker, etc.
                    //     }
                    //     if (oControl.setSelectedKey) {
                    //         oControl.setSelectedKey(""); // Reset selection for dropdowns
                    //     }
                    //     if (oControl.setSelected) {
                    //         oControl.setSelected(false); // Reset selection for Checkboxes
                    //     }
                    // }
                });
            },
        });
    });