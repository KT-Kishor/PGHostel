sap.ui.define([
    "./BaseController", "sap/ui/model/json/JSONModel", "sap/m/MessageToast",],
    function (BaseController, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.Contract", {
            onInit: function () {
                this.getRouter().getRoute("RouteContract").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched:async function () {
                this.commonLoginFunction("Contract"); // Call common login function
                await this._fetchCommonData("Contract", "ContractModel", { startDate: `${new Date().getFullYear()}-01-01`, endDate: `${new Date().getFullYear()}-12-31` }, ["C_id_Salary"]) // Fetch common data
                await this._fetchCommonData("ManageCustomer", "CreateCustomerModel"); // fetch customer data
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("contractDetails"));
            },
            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.CommonLogoutFunction(); // Navigate to login page
            },
            C_onPressAddContract: function () {
                this.getRouter().navTo("RouteContractDetails");
            },
            C_onClearFilters: function () {
                const oView = this.getView();
                const oFilterBar = oView.byId("C_id_FilterBar");
                oFilterBar.getFilterGroupItems().forEach(item => oFilterBar.getControlByKey(item.getName())?.setSelectedKey?.(""));
                oView.byId("C_id_EndClient")?.setSelectedKey("");
                oView.byId("C_id_Year")?.setDateValue(null); oView.byId("C_id_Year")?.setSecondDateValue(null);
            }
        });
    });