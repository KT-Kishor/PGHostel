sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../model/formatter",
    "sap/m/MessageBox",
],
    function (BaseController, utils, JSONModel, MessageToast, Formatter, MessageBox) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.MSADetails", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteMSADetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function () {
                var LoginFUnction = await this.commonLoginFunction("MSA&SOW");
                if (!LoginFUnction) return;
                if (!this.getView().getModel("ContractpaymentModel")) this._fetchCommonData("PaymentTerms", "ContractpaymentModel");
                if (!this.getView().getModel("BaseLocationModel")) this._fetchCommonData("BaseLocation", "BaseLocationModel");
                if (!this.getView().getModel("CountryModel")) this._fetchCommonData("Country", "CountryModel");

                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.byId("MsaD_id_Wizard").getSteps()[0].setValidated(false);
                this.byId("MsaD_id_Submit").setEnabled(false);
                this.byId("MasD_id_ThirdStep").getParent().setShowNextButton(false);
                this.byId("MsaD_id_Type").setEditable(true);
                this.T_onResetWizard();
                var oModelMSA = new JSONModel({
                    CompanyName: "",
                    CreateMSADate: this.Formatter.formatDate(new Date()),
                    PanCard: "",
                    Address: "",
                    CompanyHeadName: "",
                    CompanyHeadPosition: "",
                    MsaEmail: "",
                    PaymentTerms: "30 Days",
                    ContractPeriod: "12 Months",
                    Salutation: "Mr.",
                    Status: "New",
                    MsaContractPeriodEndDate: "",
                    BranchCode: "",
                    Type: "",
                    RateCharge: "",
                    PaymentAdvance: "",
                    PaymentBalance: "",
                    ReplacementMonth: "12 Months",
                    ReplacementRefund: "",
                    Country: "India",
                });
                this.getView().setModel(oModelMSA, "msaModelWizart");

                var oModel = new JSONModel({ Recruitment: false });
                this.getView().setModel(oModel, "VisibleModel")
                this.AdvanceBalance = true;
            },

            onRadioButtonGroupSelect: function (oEvent) {
                if (oEvent.getSource().getSelectedButton().getText() === 'Recruitment') {
                    this.getView().getModel("VisibleModel").setProperty("/Recruitment", true);
                } else {
                    this.getView().getModel("VisibleModel").setProperty("/Recruitment", false);
                }
            },

            T_onResetWizard: function () {
                var oWizard = this.getView().byId("MsaD_id_Wizard");
                oWizard.discardProgress(oWizard.getSteps()[0]); // Discard progress 
                oWizard.goToStep(oWizard.getSteps()[0]); // Go to the first step
                this.byId("MasD_id_ThirdStep").getParent().setShowNextButton(true);
            },

            onPaymentAdvanceInputChange: function (oEvent) {
                var sAdvanceInput = this.byId("Msa_Id_PayAdvance");
                var sBalanceInput = this.byId("Msa_Id_PayBalance");

                var sAdvanceValue = sAdvanceInput.getValue();
                var sBalanceValue = sBalanceInput.getValue();

                // Regular expression: Up to 2 digits before decimal, optional 1 digit after
                var regex = /^(?:\d{1,2})(?:\.\d{1})?$/;

                var bAdvanceValid = regex.test(sAdvanceValue);
                var bBalanceValid = regex.test(sBalanceValue);

                if (!bAdvanceValid || !bBalanceValid) {
                    sAdvanceInput.setValueState("Error");
                    sAdvanceInput.setValueStateText("Enter up to 2 digits and 1 decimal place (e.g. 99.9)");
                    sBalanceInput.setValueState("Error");
                    sBalanceInput.setValueStateText("Enter up to 2 digits and 1 decimal place (e.g. 99.9)");
                    this.AdvanceBalance = false;
                    return;
                }

                var nAdvance = parseFloat(sAdvanceValue) || 0;
                var nBalance = parseFloat(sBalanceValue) || 0;
                var nTotal = nAdvance + nBalance;

                if (nTotal > 100) {
                    this.AdvanceBalance = false;
                    var sMsg = "Total of Advance and Balance should not exceed 100%";
                    sAdvanceInput.setValueState("Error");
                    sAdvanceInput.setValueStateText(sMsg);
                    sBalanceInput.setValueState("Error");
                    sBalanceInput.setValueStateText(sMsg);
                } else {
                    this.AdvanceBalance = true;
                    sAdvanceInput.setValueState("None");
                    sBalanceInput.setValueState("None");
                }
                utils._LCvalidateTraineeAmount(oEvent);
                this.validateStep();
            },

            MsaD_onBack: function () {
                this.getRouter().navTo("RouteMSA");
                this.byId("MsaD_id_CompanyName").setValueState("None");
                this.byId("MsaD_id_HeadName").setValueState("None");
                this.byId("MsaD_id_HeadPosition").setValueState("None");
                this.byId("MsaD_id_CreateMSADate").setValueState("None");
                this.byId("MsaD_id_Email").setValueState("None");
                this.byId("MsaD_id_Address").setValueState("None");
                this.byId("MsaD_id_PanCard").setValueState("None");
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

            Msa_BranchChange: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
                this.validateStep();
            },

            LC_MSA_RateCharge: function (oEvent) {
                utils._LCvalidateTraineeAmount(oEvent);
                this.validateStep();
            },

            MSACountryComboBox: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
                this.validateStep();
            },

            validateStep: function () {
                // Check if all fields have values
                var allFieldsFilled = this.getView().byId("MsaD_id_CompanyName").getValue() && this.getView().byId("MsaD_id_HeadName").getValue() && this.getView().byId("MsaD_id_HeadPosition").getValue() && this.getView().byId("MsaD_id_CreateMSADate").getValue() && this.getView().byId("MsaD_id_PanCard").getValue() && this.getView().byId("MsaD_id_Email").getValue() && this.getView().byId('MsaD_id_Address').getValue();
                if (allFieldsFilled) {
                    // Validate each field 
                    var isRecruitment = this.getView().getModel("VisibleModel").getProperty("/Recruitment");

                    var isValid =
                        utils._LCvalidateMandatoryField(this.getView().byId("MsaD_id_CompanyName"), "ID") &&
                        utils._LCvalidateName(this.getView().byId("MsaD_id_HeadName"), "ID") &&
                        utils._LCvalidateMandatoryField(this.getView().byId("MsaD_id_HeadPosition"), "ID") &&
                        utils._LCvalidateDate(this.getView().byId("MsaD_id_CreateMSADate"), "ID") &&
                        utils._LCvalidateMandatoryField(this.getView().byId("MsaD_id_PanCard"), "ID") &&
                        utils._LCvalidateEmail(this.getView().byId("MsaD_id_Email"), "ID") &&
                        utils._LCvalidateMandatoryField(this.getView().byId("MsaD_id_Address"), "ID") &&
                        utils._LCstrictValidationComboBox(this.getView().byId("MsaD_id_Branch"), "ID") &&
                        utils._LCstrictValidationComboBox(this.getView().byId("MSA_Id_Country"), "ID") &&
                        (
                            !isRecruitment || (
                                utils._LCvalidateTraineeAmount(this.byId("Msa_Id_RateCharge"), "ID") &&
                                utils._LCvalidateTraineeAmount(this.byId("Msa_Id_Refund"), "ID") && this.AdvanceBalance && utils._LCvalidateTraineeAmount(this.byId("Msa_Id_PayAdvance"), "ID") &&
                                utils._LCvalidateTraineeAmount(this.byId("Msa_Id_PayBalance"), "ID")
                            ));

                    this.byId("MsaD_id_Wizard").getSteps()[0].setValidated(isValid);
                } else {
                    this.byId("MsaD_id_Wizard").getSteps()[0].setValidated(false);
                    this.byId("MsaD_id_WizardO").getAggregation("_nextButton").setText(this.i18nModel.getText("review"));
                }
            },

            MsaD_onComplete: function () {
                this.byId("MasD_id_ThirdStep").getParent().setShowNextButton(false);
                this.byId("MsaD_id_Submit").setEnabled(true);
                this.byId("MsaD_id_Type").setEditable(false);
            },

            MsaD_reviewSubmit: async function () {
                const oWizard = this.byId("MsaD_id_Wizard");
                if (!oWizard.getSteps()[0].getValidated()) {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                }

                try {
                    this.getBusyDialog();
                    const oModelData = this.getView().getModel("msaModelWizart").getData();
                    const [day, month, year] = oModelData.CreateMSADate.split('/');
                    const assignmentEndDate = new Date(year, month - 1, day);

                    const contractPeriod = parseInt(oModelData.ContractPeriod.split(" ")[0]);
                    assignmentEndDate.setMonth(assignmentEndDate.getMonth() + contractPeriod);

                    oModelData.MsaContractPeriodEndDate = assignmentEndDate.toISOString().split('T')[0];
                    oModelData.CreateMSADate = oModelData.CreateMSADate.split("/").reverse().join("-");
                    oModelData.Type = this.byId("MsaD_id_Type").getSelectedButton().getText();

                    if (!this.getView().getModel("VisibleModel").getProperty("/Recruitment")) oModelData.ReplacementMonth = "0"
                    if (!this.getView().getModel("VisibleModel").getProperty("/Recruitment")) oModelData.ReplacementRefund = "0"
                    if (!this.getView().getModel("VisibleModel").getProperty("/Recruitment")) oModelData.PaymentBalance = "0"
                    if (!this.getView().getModel("VisibleModel").getProperty("/Recruitment")) oModelData.PaymentAdvance = "0"
                    if (!this.getView().getModel("VisibleModel").getProperty("/Recruitment")) oModelData.RateCharge = "0"

                    const oCreateResponse = await this.ajaxCreateWithJQuery("MSADetails", { data: oModelData });

                    if (oCreateResponse) {
                        this.closeBusyDialog();
                        MessageBox.success(this.getView().getModel("i18n").getResourceBundle().getText("msaCreatedMsg"), {
                            icon: MessageBox.Icon.SUCCESS,
                            title: "Success",
                            actions: [sap.m.MessageBox.Action.OK, "Generate PDF"],
                            onClose: (sAction) => {
                                if (sAction === "OK") {
                                    this.getRouter().navTo("RouteMSA");
                                    this.byId("MasD_id_ThirdStep").getParent().setShowNextButton(true);
                                } else {
                                    this.byId("MasD_id_ThirdStep").getParent().setShowNextButton(true);
                                }
                            }
                        });
                    } else {
                        this.closeBusyDialog();
                        MessageToast.show(this.i18nModel.getText("expenseCreatedMessFailed"));
                    }
                } catch (oError) {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            }

        });
    });