sap.ui.define([
    "./BaseController","../utils/validation","sap/ui/model/json/JSONModel","sap/m/MessageToast",
],
    function (BaseController, utils, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.ContractDetails", {
            onInit: function () {
                this.getRouter().getRoute("RouteContractDetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function (oEvent) {
                this.byId("CD_id_Wizard").getSteps()[0].setValidated(false);
                this.i18nModel=this.getView().getModel("i18n").getResourceBundle();

            },
            validateName: function (oEvent) {
                utils._LCvalidateName(oEvent);
                this.validateStep();
            },
            validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
                this.validateStep();
            },
            validateAmount: function (oEvent) {
                utils._LCvalidateAmount(oEvent);
                this.validateStep();
            },
            validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
                this.validateStep();
            },
            ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
                this.validateStep();
            },
            CD_onPressback: function () {
                this.getRouter().navTo("RouteContract");
            },
            //Step validation
            validateStep: function () {
                var step1Validated = this.byId("CD_id_AgreeDate").getValue() && this.byId("CD_id_CName").getValue() &&
                    this.byId("CD_id_Address").getValue() && this.byId("CD_id_Email").getValue() &&
                    this.byId("CD_id_Role").getValue() && this.byId("CD_id_Amount").getValue() &&
                    utils._LCvalidateDate(this.byId("CD_id_AgreeDate"), "ID") && utils._LCvalidateName(this.byId("CD_id_CName"), "ID") &&
                    utils._LCvalidateEmail(this.byId("CD_id_Email"), "ID") && utils._LCvalidateMandatoryField(this.byId("CD_id_Address"), "ID") &&
                    utils._LCvalidateAmount(this.byId("CD_id_Amount"), "ID");
            
                var step2Validated =   this.byId("CD_id_Datestart").getValue() && this.byId("CD_id_DateEnd").getValue() &&
                    utils._LCvalidateDate(this.byId("CD_id_Datestart"), "ID") && utils._LCvalidateDate(this.byId("CD_id_DateEnd"), "ID");
            
                var isStep1Validated = step1Validated ? true : false;
                var isStep2Validated = step2Validated ? true : false;
            
                // Update validation status for each step
                this.byId("CD_id_Wizard").getSteps()[0].setValidated(isStep1Validated);
                this.byId("CD_id_Wizard").getSteps()[1].setValidated(isStep2Validated);
            },
            
            //Submit the data
            CD_onSubmit: function () {
                try {
                    var allStepsValidated = this.byId("CD_id_Wizard").getSteps().every(function (step) {
                        return step.getValidated();
                    }); 
                    if (allStepsValidated) {
                        MessageToast.show(this.i18nModel.getText("contractSuccess"));
                    } else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                } catch {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },
            
        });
    });
