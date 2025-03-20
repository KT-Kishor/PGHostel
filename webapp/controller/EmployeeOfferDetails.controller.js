sap.ui.define([
    "./BaseController", "../utils/validation", "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/formatter"
],
    function (BaseController, utils, JSONModel, MessageToast, MessageBox, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.EmployeeOfferDetails", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteEmployeeOfferDetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function (oEvent) {
                this.byId("EOD_id_Wizard").getSteps()[0].setValidated(false);
                this.getView().byId("EOD_id_BondCombo").setVisible(false);
                this.getView().byId("EOD_id_Lyear").setVisible(false);
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this._fetchCommonData("Designation", "DesignationModel");
                this._fetchCommonData("BaseLocation", "BaseLocationModel");
                this._fetchCommonData("Currency", "CurrencyModel");
                this.EOD_onResetWizard();
                var jsonData = {
                    "Salutation": "Mr.",
                    "ConsultantName": "",
                    "ConsultantAddress": "",
                    "Designation": "",
                    "OfferReleaseDate": this.Formatter.formatDate(new Date()),
                    "JoiningDate": "",
                    "CTC": "",
                    "EmploymentBond": "",
                    "JoiningBonus": "0",
                    "BaseLocation": "",
                    "BasicSalary": "",
                    "HRA": "",
                    "StatutoryBonus": "",
                    "TotalMonthly": "",
                    "TotalmothlyAnnualized": "",
                    "TDS": "",
                    "MedicalInsurance": "",
                    "Gratuity": "",
                    "TotalRetires": "",
                    "PerformanceBonus": "",
                    "EngagementPB": "",
                    "TotalVariablePay": "",
                    "CostofCompany": "",
                    "Total": "",
                    "Status": "",
                    "Currency": "",
                    "EmployeeEmail": "",
                    "Year": ""
                }
                this.getView().setModel(new JSONModel(jsonData), "employeeModel");
                this.byId("EOD_id_Joindate").setMinDate(new Date());
                ["EOD_id_Name","EOD_id_mail", "EOD_id_Address", "EOD_validateAmount", "EOD_id_Bonus"].forEach(function (ids) {
                    this.getView().byId(ids).setValueState("None");
                }.bind(this));
            },
            EOD_validateName: function (oEvent) {
                utils._LCvalidateName(oEvent);
                this.validateStep();
            },
            EOD_validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
                this.validateStep();
            },
            EOD_validateAmount: function (oEvent) {
                utils._LCvalidateAmount(oEvent);
                this.validateStep();
                if(oEvent.getSource().getId().lastIndexOf("EOD_id_CTC") !== -1){
                    this.EOD_onTDSCheckboxChange();
                }
            },
            EOD_validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
                this.validateStep();
                if (oEvent.getSource().getId().lastIndexOf("EOD_id_Reldate") !== -1) {
                    // Get selected dates and Update the minimum date for joining date
                    var releaseDate = this.byId("EOD_id_Reldate").getDateValue();
                    this.byId("EOD_id_Joindate").setMinDate(releaseDate);
                }
            },
            EOD_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
                this.validateStep();
            },
            EOD_onPressBack: function () {
                this.getRouter().navTo("RouteEmployeeOffer");
            },
            //Step validation
            validateStep: function () {
                // Check if all fields have values
                var allFieldsFilled = this.getView().byId("EOD_id_Name").getValue() && this.getView().byId("EOD_id_Reldate").getValue() &&
                    this.getView().byId("EOD_id_mail").getValue() && this.getView().byId("EOD_id_Address").getValue() && this.getView().byId("EOD_id_CTC").getValue() && this.getView().byId("EOD_id_Bonus").getValue()
                if (allFieldsFilled) {
                    // Validate each field directly
                    var isValid = utils._LCvalidateName(this.getView().byId("EOD_id_Name"), "ID") && utils._LCvalidateDate(this.getView().byId("EOD_id_Reldate"), "ID") && utils._LCvalidateDate(this.getView().byId("EOD_id_Joindate"), "ID") &&
                        utils._LCvalidateEmail(this.getView().byId("EOD_id_mail"), "ID") && utils._LCvalidateMandatoryField(this.getView().byId("EOD_id_Address"), "ID") && utils._LCvalidateAmount(this.getView().byId("EOD_id_CTC"), "ID") && utils._LCvalidateAmount(this.getView().byId("EOD_id_Bonus"), "ID");

                    this.byId("EOD_id_Wizard").getSteps()[0].setValidated(isValid);
                } else {
                    this.byId("EOD_id_Wizard").getSteps()[0].setValidated(false);
                }
            },
            // Reset wizard to initial state
            EOD_onResetWizard: function () {
                var oWizard = this.getView().byId("EOD_id_Wizard");
                oWizard.discardProgress(oWizard.getSteps()[0]); // Discard progress 
                oWizard.goToStep(oWizard.getSteps()[0]); // Go to the first step
            },
            //Submit the data
            EOD_onSubmitData: function (oEvent) {
                if (this.byId("EOD_id_Wizard").getSteps()[0].getValidated()) {
                    var oModel = this.getView().getModel("employeeModel").getData();
                    oModel.BranchCode = this.getView().byId("EOD_id_Location").getSelectedItem().getAdditionalText();
                    oModel.Status = "Submitted";
                    oModel = {
                        "tableName": "EmployeeOffer",
                        "data": oModel
                    }
                    this.ajaxCreateWithJQuery("EmployeeOffer", oModel).then((oData) => {
                        if (oData.results) {
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show(this.i18nModel.getText("offerSuccess"));
                            this.getRouter().navTo("RouteEmployeeOffer");
                        }
                    }).catch((oError) => {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                    })
                }
                else {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            },
            EOD_onRadioButtonSelect: function (oEvent) {
                if (oEvent.getParameter("selectedIndex") === 0) {
                    this.getView().byId("EOD_id_BondCombo").setVisible(true);
                    this.getView().byId("EOD_id_Lyear").setVisible(true);
                    this.getView().byId("EOD_id_BondCombo").setSelectedKey("0");
                } else { // "No" selected
                    this.getView().byId("EOD_id_BondCombo").setVisible(false);
                    this.getView().byId("EOD_id_Lyear").setVisible(false);
                    this.getView().byId("EOD_id_BondCombo").setSelectedKey("");
                }
            },
            EOD_onTDSCheckboxChange: function () {
                var oTdsVal = this.byId("EOD_id_RadioButTds").getAggregation("buttons")[this.byId("EOD_id_RadioButTds").getSelectedIndex()].getProperty("text");
                this._calculateSalaryComponents(oTdsVal);
            },
            EOD_onStep2: function () {
                var oTdsVal = this.byId("EOD_id_RadioButTds").getAggregation("buttons")[this.byId("EOD_id_RadioButTds").getSelectedIndex()].getProperty("text");
                this._calculateSalaryComponents(oTdsVal);
            },
        });
    });
