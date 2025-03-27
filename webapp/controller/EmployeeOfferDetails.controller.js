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
                this.sArgPara = oEvent.getParameter("arguments").sParOffer
                this.sSalutationArg = oEvent.getParameter("arguments").sParEmployee;
                if (this.sArgPara !== "X") {
                  this.getView().getModel("employeeModel").setProperty("/ConsultantName", this.sArgPara);
                  this.getView().getModel("employeeModel").setProperty("/Salutation", this.sSalutationArg);
                }
                this.byId("EOD_id_Wizard").getSteps()[0].setValidated(false);
                this.getView().byId("EOD_id_BondCombo").setVisible(false);
                this.getView().byId("EOD_id_Lyear").setVisible(false);
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this._fetchCommonData("Designation", "DesignationModel");
                this._fetchCommonData("BaseLocation", "BaseLocationModel");
                this._fetchCommonData("Currency", "CurrencyModel");
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
                    "Year": "",
                    "Type": 0,
                }
                this.getView().setModel(new JSONModel(jsonData), "employeeModel");
                var oViewModel = new JSONModel({ isEditMode: true, isVisiable: true, editable: false, isCTCVisible: false });
                this.getView().setModel(oViewModel, "viewModel");
                this.byId("EOD_id_Joindate").setMinDate(new Date());
                ["EOD_id_Name", "EOD_id_mail", "EOD_id_Address", "EOD_id_CTC", "EOD_id_Bonus"].forEach(function (ids) {
                    this.getView().byId(ids).setValueState("None");
                }.bind(this));
                if (this.sArgPara === "CreateOfferFlag") {
                    this.getView().byId("EOD_id_PageCrate").setVisible(true);
                    this.getView().byId("EODF_id_PageUpdate").setVisible(false);
                    this.EOD_onResetWizard();
                } else {
                    this.getView().byId("EOD_id_PageCrate").setVisible(false);
                    this.getView().byId("EODF_id_PageUpdate").setVisible(true);
                    var oBasicDetailsSection = this.getView().byId("EODF_id_BasicDetailsSection");
                    this.getView().byId("EODF_id_ObjectPageLayoutEmp").setSelectedSection(oBasicDetailsSection);
                    this.readCallForEmployeeOffer(this.sArgPara);
                }
            },
            EOUF_onEditOrSavePress: function () {
                var oViewModel = this.getView().getModel("viewModel");
                // Check if in edit mode
                if (oViewModel.getProperty("/editable")) {
                    var isValid = utils._LCvalidateName(this.getView().byId("EOUF_id_Name"), "ID") && utils._LCvalidateDate(this.getView().byId("EOUF_id_Reldate"), "ID") && utils._LCvalidateDate(this.getView().byId("EOUF_id_Joindate"), "ID") &&
                    utils._LCvalidateEmail(this.getView().byId("EOUF_id_mail"), "ID") && utils._LCvalidateMandatoryField(this.getView().byId("EOUF_id_Address"), "ID") && utils._LCvalidateAmount(this.getView().byId("EOUF_id_CTC"), "ID") && utils._LCvalidateAmount(this.getView().byId("EOUF_id_Bonus"), "ID");
                    // Save the changes
                    if(isValid)this.updateCallForEmployeeOffer(oViewModel);
                    else MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                } else {
                    // Enable edit mode and make CTC field visible
                    oViewModel.setProperty("/editable", true);
                    oViewModel.setProperty("/isEditMode", false);
                    oViewModel.setProperty("/isCTCVisible", true);
                }
            },
            updateCallForEmployeeOffer: function (oViewModel) {
                var oModel = this.getView().getModel("employeeModel").getData();
                oModel.BranchCode = this.getView().byId("EOUF_id_Location").getSelectedItem().getAdditionalText();
                oModel.Type = oModel.Type === 0 ? "TDS" : (oModel.Type === 1 ? "No TDS" : "PF");
                oModel = {
                    "data": oModel,
                    "filters":{
                        "ID":this.sArgPara
                    }
                }
                this.ajaxUpdateWithJQuery("EmployeeOffer", oModel).then((oData) => {
                    if (oData.results) {
                        oViewModel.setProperty("/editable", false);
                        oViewModel.setProperty("/isEditMode", true);
                        oViewModel.setProperty("/isCTCVisible", false);
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show(this.i18nModel.getText("offerUpdateSucc"));
                    }
                }).catch((oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                })
            },
            readCallForEmployeeOffer: function (sArgPara) {
                var queryString = $.param({
                    "ID":sArgPara
                    });
                this.ajaxReadWithJQuery("EmployeeOffer", queryString).then((oData) => {
                    var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    offerData[0].Type = offerData[0].Type === "TDS" ? 0 : (offerData[0].Type === "No TDS" ? 1 : 2);
                    this.getView().setModel(new JSONModel(offerData[0]), "employeeModel");
                    sap.ui.core.BusyIndicator.hide();
                    var oViewModel = this.getView().getModel("viewModel");
                    if (offerData[0].Status === "OnBoarded") {
                        oViewModel.setProperty("/isVisiable", false);
                        oViewModel.setProperty("/ediBut", false);
                    } else if (offerData[0].Status === "Rejected") {
                        oViewModel.setProperty("/isVisiable", false);
                        oViewModel.setProperty("/ediBut", true);
                    } else if (offerData[0].Status === "Submitted") {
                        oViewModel.setProperty("/isVisiable", true);
                        oViewModel.setProperty("editBut", true);
                    }
                }).catch((oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error(this.i18nModel.getText("commonErrorMessage"))
                })
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
                this.EOD_onTDSCheckboxChange();
            },
            EOD_validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
                this.validateStep();
                var oOfferDateId = oEvent.getSource().getId().split("--")[2], releaseDate; 
                if (oOfferDateId === "EOD_id_Reldate" || oOfferDateId === "EOUF_id_Reldate") {
                    // Get selected dates and Update the minimum date for joining date
                    if(oOfferDateId === "EOD_id_Reldate"){
                        releaseDate = this.byId("EOD_id_Reldate").getDateValue();
                        this.byId("EOD_id_Joindate").setMinDate(releaseDate);}
                    else{
                        releaseDate = this.byId("EOUF_id_Reldate").getDateValue();
                        this.byId("EOUF_id_Joindate").setMinDate(releaseDate);}
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
                this.getView().getModel("employeeModel").setProperty("/Type", 0)
                this.getView().byId("EOD_id_Bond").setSelectedIndex(1);
            },
            //Submit the data
            EOD_onSubmitData: function () {
                if (this.byId("EOD_id_Wizard").getSteps()[0].getValidated()) {
                    var oModel = this.getView().getModel("employeeModel").getData();
                    oModel.BranchCode = this.getView().byId("EOD_id_Location").getSelectedItem().getAdditionalText();
                    oModel.Type = oModel.Type === 0 ? "TDS" : (oModel.Type === 1 ? "No TDS" : "PF");
                    oModel.BaseLocation = oModel.BaseLocation !== "" ? oModel.BaseLocation : this.getView().byId("EOD_id_Location").getSelectedKey(); 
                    oModel.Status = "Submitted";
                    console.log(oModel);
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
                } else { // "No" selected
                    this.getView().byId("EOD_id_BondCombo").setVisible(false);
                    this.getView().byId("EOD_id_Lyear").setVisible(false);
                }
            },
            EOD_onTDSCheckboxChange: function () {
                var oTdsVal = this.getView().getModel("employeeModel").getProperty("/Type");
                oTdsVal = oTdsVal === 0 ? "TDS" : (oTdsVal === 1 ? "No TDS" : "PF");
                if (this.getView().getModel("employeeModel").getProperty("/CTC"))
                    this._calculateSalaryComponents(oTdsVal);
            },
            EOD_onStep2: function () {
                var oTdsVal = this.byId("EOD_id_RadioButTds").getAggregation("buttons")[this.byId("EOD_id_RadioButTds").getSelectedIndex()].getProperty("text");
                this._calculateSalaryComponents(oTdsVal);
            },
        });
    });
