sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",   
    "../model/formatter",
    "sap/m/MessageBox"
],
    function (BaseController, utils, JSONModel, MessageToast,Formatter,MessageBox) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.MSADetails", {
            Formatter:Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteMSADetails").attachMatched(this._onRouteMatched, this);
                this._fetchCommonData("PaymentTerms", "ContractpaymentModel");
            },
            _onRouteMatched: function () {
                this.byId("MsaD_id_Wizard").getSteps()[0].setValidated(false);
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                
                  var oModelMSA = new JSONModel({
                    CompanyName: "",
                    CreateMSADate: this.Formatter.formatDate(new Date()),
                    PANCard: "",
                    Address: "",
                    CompanyHeadName: "",
                    CompanyHeadPosition: "",
                    MSAEmail: "",
                    PaymentTerms: "30 Days",
                    ContractPeriod: "12 Months",
                    Salutation: "Mr.",
                    Status: "New",
                    MsaContractPeriodEndDate: ""
                  });  
                  this.getView().setModel(oModelMSA, "msaModelWizart");               
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

            MsaD_reviewSubmit: async function () {
                const oWizard = this.byId("MsaD_id_Wizard");
                if (!oWizard.getSteps()[0].getValidated()) {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                }
            
                try {
                    sap.ui.core.BusyIndicator.show(0);            
                    const oModelData = this.getView().getModel("msaModelWizart").getData();
                    const [day, month, year] = oModelData.CreateMSADate.split('/');
                    const assignmentEndDate = new Date(year, month - 1, day);
            
                    const contractPeriod = parseInt(oModelData.ContractPeriod.split(" ")[0]);
                    assignmentEndDate.setMonth(assignmentEndDate.getMonth() + contractPeriod);
            
                    oModelData.MsaContractPeriodEndDate = assignmentEndDate.toISOString().split('T')[0];
            
                    const oCreateResponse = await this.ajaxCreateWithJQuery("MSADetails", { data: oModelData });
            
                    if (oCreateResponse) {
                        MessageBox.success(this.getView().getModel("i18n").getResourceBundle().getText("msaCreatedMsg"), {
                            icon: MessageBox.Icon.SUCCESS,
                            title: "Success",
                            actions: [sap.m.MessageBox.Action.OK, "Generate PDF"],
                            onClose: (sAction) => {
                                sap.ui.core.BusyIndicator.hide();
                                if (sAction === "OK") {
                                    this.getRouter().navTo("RouteMSA");
                                }
                                // You can trigger PDF generation logic if needed here
                            }
                        });
                    } else {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show(this.i18nModel.getText("expenseCreatedMessFailed"));
                    }
                } catch (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            }            

        });
    });