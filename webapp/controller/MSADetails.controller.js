sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
],
    function (BaseController, utils, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.MSADetails", {
            onInit: function () {
                this.getRouter().getRoute("RouteMSADetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                this.byId("MsaD_id_Wizard").getSteps()[0].setValidated(false);
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            },
            MsaD_onBack: function () {
                this.getRouter().navTo("RouteMSA");
            },
            MsaD_validateName: function (oEvent) {
                utils._LCvalidateName(oEvent);
                this.validateStep();
            },
            MsaD_validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
                this.validateStep();
            },
            MsaD_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
                this.validateStep();
            },
            MsaD_validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
                this.validateStep();
            },

            validateStep: function () {
                // Check if all fields have values
                var allFieldsFilled = this.getView().byId("MsaD_id_CompanyName").getValue() && this.getView().byId("MsaD_id_HeadName").getValue() && this.getView().byId("MsaD_id_HeadPosition").getValue() && this.getView().byId("MsaD_id_CreateMSADate").getValue() && this.getView().byId("MsaD_id_PanCard").getValue() && this.getView().byId("MsaD_id_Email").getValue() && this.getView().byId('MsaD_id_Address').getValue();
                if (allFieldsFilled) {
                    // Validate each field 
                    var isValid = utils._LCvalidateMandatoryField(this.getView().byId("MsaD_id_CompanyName"), "ID") && utils._LCvalidateName(this.getView().byId("MsaD_id_HeadName"), "ID") && utils._LCvalidateMandatoryField(this.getView().byId("MsaD_id_HeadPosition"), "ID") && utils._LCvalidateDate(this.getView().byId("MsaD_id_CreateMSADate"), "ID") && utils._LCvalidateMandatoryField(this.getView().byId("MsaD_id_PanCard"), "ID") && utils._LCvalidateEmail(this.getView().byId("MsaD_id_Email"), "ID") && utils._LCvalidateMandatoryField(this.getView().byId("MsaD_id_Address"), "ID");
                    this.byId("MsaD_id_Wizard").getSteps()[0].setValidated(isValid);
                } else {
                    this.byId("MsaD_id_Wizard").getSteps()[0].setValidated(false);
                }
            },

            MsaD_reviewSubmit: function (oEvent) {
                try {
                    if (this.byId("MsaD_id_Wizard").getSteps()[0].getValidated()) {
                        MessageToast.show(this.i18nModel.getText("msaSubmitted"));
                    } else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                } catch (error) {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            }

        });
    });