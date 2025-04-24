sap.ui.define([
    "./BaseController", "../utils/validation", "sap/ui/model/json/JSONModel", "sap/m/MessageToast",
],
    function (BaseController, utils, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.ContractDetails", {
            onInit: function () {
                this.getRouter().getRoute("RouteContractDetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function () {
                sap.ui.core.BusyIndicator.show(0);
                this.commonLoginFunction("Contract"); // Call common login function
                await this._fetchCommonData("Currency", "CurrencyModel");
                await this._fetchCommonData("BaseLocation", "BaseLocationModel");
                await this._fetchCommonData("ManageCustomer", "CreateCustomerModel");
                await this._fetchCommonData("PaymentTerms", "ContractpaymentModel");
                var oView = this.getView();
                var oWizard = oView.byId("CD_id_Wizard");
                oWizard.discardProgress(oView.byId("CD_id_Firststep"));
                oWizard.goToStep(oView.byId("CD_id_Firststep"));
            
                this._wizard = this.byId("wizardContentPage");
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            
                this.byId("CD_id_Wizard").getSteps()[0].setValidated(false);
                this.byId("CD_id_Wizard").getSteps()[1].setValidated(false);
            
                try {
                    const response = await this.ajaxReadWithJQuery("Contract", {}); // No filters passed
                    sap.ui.core.BusyIndicator.hide();
                    const rawData = response.data || {};
                    const oModelContractNo = Array.isArray(rawData) ? rawData : Object.values(rawData);
                
                    let newContractNo;
                    if (oModelContractNo.length > 0) {
                        const contractNos = oModelContractNo.map(obj => parseInt(obj.ContractNo.slice(4), 10));
                        const maxContractNo = Math.max(...contractNos);
                        newContractNo = "KT-C" + (maxContractNo + 1).toString().padStart(3, '0');
                    } else {
                        newContractNo = "KT-C001";
                    }
                
                    this.byId('CD_id_ConNo').setValue(newContractNo);

                   
                    const oData = {
                        ContractNo: newContractNo,
                        AgreementDate: this.Formatter.formatDate(new Date()),
                        ConsultantName: "",
                        ConsultantAddress: "",
                        ContarctEmail: "",
                        Role: "",
                        Rate: "Hr",
                        Amount: "",
                        Currency: "INR",
                        EndClientHirer: "",
                        Location: "REMOTE",
                        HiringContact: "",
                        AssignmentStatus: "New",
                        StartDate: "",
                        EndDate: "",
                        InsuranceRequirement: "No",
                        WarrantyDate: "6 Months",
                        AdditionalRates: "No",
                        PaymentTerms: "6 Months",
                        Status: "Submitted",
                        Salutation: "Mr.",
                        Salutation2: "Mr.",
                        contractLocation: "Kalaburagi"
                    };
            
                    const oModel = new sap.ui.model.json.JSONModel(oData);
                    this.getView().setModel(oModel, "ContractModelWizart");
                } catch (error) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(error.message || error.responseText);
                }
            },
            CD_validateName: function (oEvent) {
                utils._LCvalidateName(oEvent);
                this.validateStep();

                const selectedKey = oEvent.getSource().getSelectedKey();
                const oModel = this.getView().getModel("ContractModelWizart");
                oModel.setProperty("/HiringContact", selectedKey);
            },
            CD_validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
                this.validateStep();
            },
            CD_validateAmount: function (oEvent) {
                utils._LCvalidateAmount(oEvent);
                this.validateStep();
            },
            CD_validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
                this.validateStep();
            },
            CD_ValidateCommonFields: function (oEvent) {
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

                var step2Validated = this.byId("CD_id_HiringContact").getValue() && this.byId("CD_id_Datestart").getValue() && this.byId("CD_id_DateEnd").getValue() &&
                    utils._LCvalidateName(this.byId("CD_id_HiringContact"), "ID") && utils._LCvalidateDate(this.byId("CD_id_Datestart"), "ID") && utils._LCvalidateDate(this.byId("CD_id_DateEnd"), "ID");

                var isStep1Validated = step1Validated ? true : false;
                var isStep2Validated = step2Validated ? true : false;

                // Update validation status for each step
                this.byId("CD_id_Wizard").getSteps()[0].setValidated(isStep1Validated);
                this.byId("CD_id_Wizard").getSteps()[1].setValidated(isStep2Validated);
            },

             //radio button select function
             RadioButtonSelect: function (oEvent) {
                var oModel = this.getView().getModel("ContractModelWizart");
                this.RadioButton = oEvent.getSource().getAggregation("buttons")[oEvent.getSource().mProperties.selectedIndex].getText()
                oModel.setProperty("/Rate", this.RadioButton);
            },

            CD_onSubmit: async function () {
                try {
                    var allStepsValidated = this.byId("CD_id_Wizard").getSteps().every(function (step) {
                        return step.getValidated();
                    });
            
                    if (!allStepsValidated) {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        return;
                    }

                    var formattedText;
                    switch (this.RadioButton) {
                        case "Hour":
                            formattedText = "Hr";
                            break;
                        case "Daily":
                            formattedText = "Day";
                            break;
                        case "Monthly":
                            formattedText = "Month";
                            break;
                        default:
                            formattedText = "Hr";
                    }
            
                    var oModel = this.getView().getModel("ContractModelWizart");
                    // Prepare data object with the required fields
                    var data = {
                        "ContractNo": oModel.oData.ContractNo,
                        "ConsultantNameSalutation": (oModel.oData.Salutation),
                        "ConsultantName": (oModel.oData.ConsultantName),
                        "ConsultantAddress": (oModel.oData.ConsultantAddress),
                        "EndClient": (oModel.oData.EndClientHirer),
                        "ConsultingService": (oModel.oData.Role),
                        "LocationService": (oModel.oData.Location),
                        "ContractStatus": (oModel.oData.AssignmentStatus),
                        "AssignmentStartDate": oModel.oData.StartDate.split("/").reverse().join("-"),
                        "AssignmentEndDate": oModel.oData.EndDate.split("/").reverse().join("-"),
                        "ConsultantRate": oModel.oData.Amount + " " + oModel.oData.Currency + " Per " + formattedText + " Including all tax",
                        "PaymentTerms": (oModel.oData.PaymentTerms),
                        "ClientReportContactSalutation": (oModel.oData.Salutation2),
                        "ClientReportContact": (oModel.oData.HiringContact),
                        "SpecificInsuranceRequirement": (oModel.oData.InsuranceRequirement),
                        "ContractPeriod": (oModel.oData.WarrantyDate),
                        "ExpensesClaim": (oModel.oData.AdditionalRates),
                        "Status": "Submitted",
                        "AgreementDate":oModel.oData.AgreementDate.split("/").reverse().join("-"),
                        "ContarctEmail": (oModel.oData.ContarctEmail),
                        "ContractLocation": (oModel.oData.contractLocation),
                        "AgreementNo": String(1).padStart(2, '0')
                    };
                    var response = await this.ajaxCreateWithJQuery("Contract", { data: data });
                    if(response.success===true){
                        MessageToast.show(this.i18nModel.getText("contractSuccess"));
                        this.getRouter().navTo("RouteContract")
                    }
                } catch (error) {
                    MessageToast.show(error.message || error.responseText);
                }
            },
        });
    });
