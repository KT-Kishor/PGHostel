sap.ui.define([
    "./BaseController", "sap/ui/model/json/JSONModel", "sap/m/MessageToast", "../model/formatter"],
    function (BaseController, JSONModel, MessageToast, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.EmployeeDetails", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteEmployeeDetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function (oEvent) {
                try {
                    var LoginFunction = await this.commonLoginFunction("EmployeeDetails");
                    if (!LoginFunction) return;

                    this.getBusyDialog();
                    if (oEvent.getParameter("arguments").sPath === 'EmployeeDetails') this.onClearEmployeeDetails();
                    this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                    this.getView().getModel("LoginModel").setProperty("/HeaderName", "Employee Details");
                    await this._fetchCommonData("EmployeeDetailsData", "EmployeeModel");
                    await this._fetchCommonData("BaseLocation", "BaseLocationModel"); // base location read call
                    await this._fetchCommonData("AppVisibility", "RoleModel"); // common role get call
                    this.CommonReadCall();
                    this.Emp_det_onSearch();
                    this.closeBusyDialog();
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },

            Emp_det_onSearch: async function () {
                try {
                    this.getBusyDialog();
                    const aFilterItems = this.byId("ED_id_FilterBar").getFilterGroupItems();
                    const params = {};

                    aFilterItems.forEach(function (oItem) {
                        const oControl = oItem.getControl();
                        const sKey = oItem.getName();

                        if (oControl && typeof oControl.getValue === "function") {
                            const sValue = oControl.getValue().trim();

                            if (sValue) {
                                params[sKey] = sValue;
                            }
                        }
                    });
                    await this._fetchCommonData("EmployeeDetails", "sEmployeeDetails", params);
                    this.closeBusyDialog();
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },

            onClearEmployeeDetails: function () {
                this.byId("ED_id_EmpIDFilter").setValue("");
                this.byId("ED_id_ManagerFilter").setValue("");
                this.byId("ED_id_Status").setValue("");
            },

            CommonReadCall: async function () {
                await this._fetchCommonData("EmployeeDetails", "FilterEmployeeDetails", {});
            },

            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.CommonLogoutFunction();
                this.getRouter().navTo("RouteLoginPage");
            },

            ED_onPressEmployeeRow: function (oEvent) {
                var EmployeeID = oEvent.getSource().getBindingContext("sEmployeeDetails").getProperty("EmployeeID");
                this.getRouter().navTo("SelfService", { sPath: EmployeeID });
            }


        });
    });