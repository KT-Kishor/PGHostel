sap.ui.define([
    "./BaseController", "../utils/validation", "sap/ui/model/json/JSONModel", "sap/m/MessageToast",],
    function (BaseController, utils, JSONModel, MessageToast,) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.EmployeeOffer", {
            onInit: function () {
                this.getRouter().getRoute("RouteEmployeeOffer").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

            },
            Ov_onSignout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            Ov_onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            Ov_onPressAddEmployee: function () {
                this.getRouter().navTo("RouteEmployeeOfferDetails");
            },

            O_onOnboardPress: function () {
                if (!this.EO_oDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.OnboardEmployee",
                        controller: this,
                    }).then(function (EO_oDialog) {
                        this.EO_oDialog = EO_oDialog;
                        this.getView().addDependent(this.EO_oDialog);
                        this.EO_oDialog.open();
                    }.bind(this));
                } else {
                    this.EO_oDialog.open();
                }
            },
            Oef_onPressClose: function () {
                this.EO_oDialog.close();
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

            Oef_onPressOnBoard: function (oEvent) {
                try {
                    if (utils._LCvalidateEmail(sap.ui.getCore().byId("OeF_id_CompanyMail"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("Oef_id_DateofBirth"), "ID") && utils._LCvalidateMobileNumber(sap.ui.getCore().byId("Oef_id_Mobile"), "ID")) {
                        MessageToast.show(this.i18nModel.getText("onBoardSuccess"));
                    }
                    else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                }
                catch {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }

            }




        });
    });