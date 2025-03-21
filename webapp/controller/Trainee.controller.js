sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../model/formatter"
],
    function (BaseController, utils, JSONModel, MessageToast,Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.Trainee", {
            Formatter:Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteTrainee").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                this.readCallForTrainee();
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "Trainee Details");
            },

            readCallForTrainee: function () {
                var filter = { ID: "" }
                this.ajaxReadWithJQuery("Trainee", filter).then((oData) => {
                    var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getView().setModel(new JSONModel(offerData), "traineeModel");
                    sap.ui.core.BusyIndicator.hide();
                }).catch((oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Error while reading the employee offer details")
                })
            },

            T_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },
            T_validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
            },
            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            T_onPressAddTrainee: function () {
                this.getRouter().navTo("RouteTraineeDetails");
            },
            //certificate fragment
            T_onCertDownload: function () {
                if (!this.TC_oDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.TraineeCertificate",
                        controller: this,
                    }).then(function (TC_oDialog) {
                        this.TC_oDialog = TC_oDialog;
                        this.getView().addDependent(this.TC_oDialog);
                        this.TC_oDialog.open();
                    }.bind(this));
                } else {
                    this.TC_oDialog.open();
                }
            },
            TCF_onPressCloseDialog: function () {
                this.TC_oDialog.close();
            },
            //download certificate
            TCF_onPressDownload: function () {
                try {
                    if (utils._LCvalidateMandatoryField(sap.ui.getCore().byId("TCF_id_ProjectName"), "ID")) {
                        MessageToast.show(this.i18nModel.getText("downloadSucess"));
                    }
                    else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                }
                catch {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },
            //onboard trainee dialog
            T_onOnboardPress: function () {
                if (!this.TOb_oDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.OnboardTrainee",
                        controller: this,
                    }).then(function (TOb_oDialog) {
                        this.TOb_oDialog = TOb_oDialog;
                        this.getView().addDependent(this.TOb_oDialog);
                        this.TOb_oDialog.open();
                    }.bind(this));
                } else {
                    this.TOb_oDialog.open();
                }
            },

            OTF_onPressClose: function () {
                this.TOb_oDialog.close();
            },
            //onboard trainee
            OTF_onPressOnboard: function () {
                try {
                    if (utils._LCvalidateEmail(sap.ui.getCore().byId("OTF_id_TraineeMail"), "ID")) {
                        MessageToast.show(this.i18nModel.getText("traineeOnboardSucess"));
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