sap.ui.define([
    "./BaseController", "../utils/validation", "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/formatter"],
    function (BaseController, utils, JSONModel, MessageToast, MessageBox, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.EmployeeOffer", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteEmployeeOffer").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.readCallForEmployeeOffer();
                this.byId("EO_id_OnboardBtn").setVisible(false);
                this.byId("EO_id_RejectBtn").setVisible(false);
                this._fetchCommonData("BaseLocation", "BaseLocationModel");
                this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("headerEmpDetails"));
            },
            readCallForEmployeeOffer: function () {
                var filter = { ID: "" }
                this.ajaxReadWithJQuery("EmployeeOffer", filter).then((oData) => {
                    var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getView().setModel(new JSONModel(offerData), "EmployeeOfferModel");
                    sap.ui.core.BusyIndicator.hide();
                }).catch((oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Error while reading the employee offer details")
                })
            },
            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            EO_onPressAddEmployee: function () {
                this.getRouter().navTo("RouteEmployeeOfferDetails");
            },
            EO_onOnboardPress: function () {
                this._commonFragmentOpen(this, "OnboardEmployee");
            },
            OEF_onPressClose: function () {
                this._commonFragmentClose(this, "OnboardEmployee");
            },
            validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
            },
            validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
            },
            validateMobileNo: function (oEvent) {
                utils._LCvalidateMobileNumber(oEvent);
            },
            OEF_onPressOnBoard: function (oEvent) {
                if (utils._LCvalidateEmail(sap.ui.getCore().byId("OEF_id_CompanyMail"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("OEF_id_DateofBirth"), "ID") && utils._LCvalidateMobileNumber(sap.ui.getCore().byId("OEF_id_Mobile"), "ID")) {
                    MessageToast.show(this.i18nModel.getText("onBoardSuccess"));
                }
                else {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            },
            EO_onSelectionRadRowE: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("listItem");
                // If an item is selected, check the status and update button visibility accordingly
                if (oSelectedItem) {
                    var sStatus = oSelectedItem.getBindingContext("EmployeeOfferModel").getProperty("Status");
                    this.ID = oSelectedItem.getBindingContext("EmployeeOfferModel").getProperty("ID")
                    var isDisabled = sStatus === "OnBoarded" || sStatus === "Rejected";
                    this.byId("EO_id_OnboardBtn").setVisible(!isDisabled);
                    this.byId("EO_id_RejectBtn").setVisible(!isDisabled);
                }
            }
        });
    });