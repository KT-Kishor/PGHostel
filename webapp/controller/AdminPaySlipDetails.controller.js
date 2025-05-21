sap.ui.define([
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast", "sap/ui/core/BusyIndicator", "../model/formatter"
],
    function (BaseController, JSONModel, MessageToast, BusyIndicator, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.AdminPaySlipDetails", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteNavAdminPaySlipApp").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function (oEvent) {
                BusyIndicator.hide();
                var LoginFunction = await this.commonLoginFunction("PaySlip");
                if (!LoginFunction) return;
                //this.getBusyDialog();
                this.oModel = this.getView().getModel("PaySlip");
                //this.closeBusyDialog();
            },

            APD_onPressBack: function () {
                var oRoutePath = this.oModel.getProperty("/BackRoute");
                if(oRoutePath === "RouteAdminPaySlip") this.getRouter().navTo(oRoutePath);
                else this.getRouter().navTo(oRoutePath, { sPath: this.oModel.getProperty("/BackPath") });
            },

            APD_onEmployeeIDChange: function (oEvent) {
                this.oModel.setProperty("/isIdSelected", true);
            },

            APD_onEmployeeIDChange: async function (oEvent) {
                this.getBusyDialog();
                var sValue = oEvent.getParameter("value");
                try { 
                    var response = await this.ajaxCreateWithJQuery("PaySlipDetails", { EmployeeID : sValue }); 
                }
                catch (e) { console.warn(e); }
                console.log(response);
                debugger
                this.closeBusyDialog();
            }
        });
    });