sap.ui.define([
    "./BaseController","../utils/validation", "sap/ui/model/json/JSONModel","sap/m/MessageToast",
],
    function (BaseController, utils, JSONModel, MessageToast,) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.EmployeeOfferDetails", {
            onInit: function () {
                this.getRouter().getRoute("RouteEmployeeOfferDetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function (oEvent) {
                this.byId("EOD_id_Wizard").getSteps()[0].setValidated(false);
                this.getView().byId("EOD_id_BondCombo").setVisible(false);
                this.getView().byId("EOD_id_Lyear").setVisible(false);
                this.i18nModel=this.getView().getModel("i18n").getResourceBundle();
                this._commonDesignation();
                this._commonBaseLocation();
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
            EOD_onPressBack: function () {
                this.getRouter().navTo("RouteEmployeeOffer");
            },
            //Step validation
            validateStep: function () {
                // Check if all fields have values
                if (this.getView().byId("EOD_id_Name").getValue() && this.getView().byId("EOD_id_Reldate").getValue() &&
                    this.getView().byId("EOD_id_mail").getValue() && this.getView().byId("EOD_id_Address").getValue() && this.getView().byId("EOD_id_CTC").getValue() && this.getView().byId("EOD_id_Bonus").getValue()
                ) {
                    // Validate each field directly
                    var isValid = utils._LCvalidateName(this.getView().byId("EOD_id_Name"), "ID") && utils._LCvalidateDate(this.getView().byId("EOD_id_Reldate"), "ID") && utils._LCvalidateDate(this.getView().byId("EOD_id_Joindate"), "ID") &&
                        utils._LCvalidateEmail(this.getView().byId("EOD_id_mail"), "ID") && utils._LCvalidateMandatoryField(this.getView().byId("EOD_id_Address"), "ID") && utils._LCvalidateAmount(this.getView().byId("EOD_id_CTC"), "ID") && utils._LCvalidateAmount(this.getView().byId("EOD_id_Bonus"), "ID");

                    this.byId("EOD_id_Wizard").getSteps()[0].setValidated(isValid);
                } else {
                    this.byId("EOD_id_Wizard").getSteps()[0].setValidated(false);
                }
            },
            //Submit the data
            EOD_id_Submit: function () {
                try {
                    if (this.byId("EOD_id_Wizard").getSteps()[0].getValidated()) {
                        MessageToast.show(this.i18nModel("offerSuccess"));
                    }
                    else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                }
                catch {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },
            onRadioButtonSelect: function (oEvent) {    
                if (oEvent.getParameter("selectedIndex") === 0) {
                    this.getView().byId("EOD_id_BondCombo").setVisible(true);
                    this.getView().byId("EOD_id_Lyear").setVisible(true);
                    this.getView().byId("EOD_id_BondCombo").setSelectedKey("0"); 
                } else { // "No" selected
                    this.getView().byId("EOD_id_BondCombo").setVisible(false);
                    this.getView().byId("EOD_id_Lyear").setVisible(false);
                    this.getView().byId("EOD_id_BondCombo").setSelectedKey(""); 
                }
            }

        });
    });
