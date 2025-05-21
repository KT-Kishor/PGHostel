sap.ui.define([
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../model/formatter", "sap/ui/core/BusyIndicator"
],
    function (BaseController, JSONModel, MessageToast, Formatter, BusyIndicator) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.AdminPaySlip", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteAdminPaySlip").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function (oEvent) {
                var LoginFunction = await this.commonLoginFunction("PaySlip");
                if (!LoginFunction) return;
                //this.getBusyDialog();
                this.AP_onSearch();
                this.oModel = this.getView().getModel("PaySlip");
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "Generate Pay Slip");
                var aData = this.oModel.getProperty("/EmpTable");
                this.oModel.setProperty("/RowCount", aData ? aData.length : 0);
                var oBinding = this.oModel.bindList("/EmpTable");
                oBinding.attachChange(function () {
                    this.oModel.setProperty("/RowCount", oBinding.getLength());
                });
                //this.closeBusyDialog();
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

            AP_onPressAddPayslip: function () {
                BusyIndicator.show(0);
                this.oModel.setProperty("/isCreate", true);
                this.oModel.setProperty("/isIdSelected", false);
                this.oModel.setProperty("/BackRoute", "RouteAdminPaySlip");
                this.getRouter().navTo("RouteNavAdminPaySlipApp");
            },

            AP_onPressPayslip: function (oEvent) {
                var oContext = oEvent.getSource().getBindingContext("PaySlip");
                var sPath = oContext.getPath();
                var oData = this.oModel.getProperty(sPath);
                this.oModel.setProperty("/isCreate", false);
                this.oModel.setProperty("/isIdSelected", true);
                this.oModel.setProperty("/BackRoute", "RouteAdminPaySlip");
                this.oModel.setProperty("/EmpData", oData);
                this.getRouter().navTo("RouteNavAdminPaySlipApp");
            }
        });
    });