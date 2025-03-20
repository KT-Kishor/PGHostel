sap.ui.define([
    "./BaseController", "../utils/validation", "sap/ui/model/json/JSONModel", 
    "sap/m/MessageToast",
    "sap/m/MessageBox"],
    function (BaseController, utils, JSONModel, MessageToast,MessageBox) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.EmployeeOffer", {
            onInit: function () {
                this.getRouter().getRoute("RouteEmployeeOffer").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.readCallForEmployeeOffer();
                this.byId("EO_id_OnboardBtn").setVisible(false);
                this.byId("EO_id_RejectBtn").setVisible(false);
                this._fetchCommonData("BaseLocation", "BaseLocationModel");
            },
            readCallForEmployeeOffer : function(){
                var filter={ID:""}
                this.ajaxReadWithJQuery("EmployeeOffer",filter).then((oData) =>{
                    var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getView().setModel(new JSONModel(offerData),"EmployeeOfferModel");
                })
                .catch((oError) => {
                    MessageBox.error("Error while reading the employee offer details")
                })
            },
            EO_onSignout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            EO_onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            EO_onPressAddEmployee: function () {
                this.getRouter().navTo("RouteEmployeeOfferDetails");
            },
            EO_onOnboardPress: function () {
                this._commonFragmentOpen(this,"OnboardEmployee");
            },
            OEF_onPressClose: function () {
                this._commonFragmentClose(this,"OnboardEmployee");
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
                try {
                    if (utils._LCvalidateEmail(sap.ui.getCore().byId("OEF_id_CompanyMail"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("OEF_id_DateofBirth"), "ID") && utils._LCvalidateMobileNumber(sap.ui.getCore().byId("OEF_id_Mobile"), "ID")) {
                        MessageToast.show(this.i18nModel.getText("onBoardSuccess"));
                    }
                    else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                }
                catch {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },
            EO_onSelectionRadRowE:function(oEvent){
                var oOnboardButton = this.byId("EO_id_OnboardBtn");
                var oRejectButton = this.byId("EO_id_RejectBtn");
                var oSelectedItem = oEvent.getParameter("listItem");
                // If an item is selected, check the status and update button visibility accordingly
                if (oSelectedItem) {
                  var sStatus = oSelectedItem.getBindingContext().getProperty("Status");
                  this.Id = oSelectedItem.getBindingContext().getProperty("ID")
                  var isDisabled = sStatus === "OnBoarded" || sStatus === "Rejected";
                  oOnboardButton.setVisible(!isDisabled);
                  oRejectButton.setVisible(!isDisabled);
                } else {
                  // Hide both buttons if no item is selected
                  oOnboardButton.setVisible(false);
                  oRejectButton.setVisible(false);
                }
            }
        });
    });