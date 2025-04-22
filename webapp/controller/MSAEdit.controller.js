sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "../utils/CommonAgreementPDF",
    "sap/m/MessageToast",
    "../model/formatter",
    "sap/ui/core/BusyIndicator",
],
    function (BaseController, utils, JSONModel, jsPDF, MessageToast, Formatter, BusyIndicator) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.MSAEdit", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteMSAEdit").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function (oEvent) {
                // this.commonLoginFunction("MSA&SOW");
                this._fetchCommonData("PaymentTerms", "ContractpaymentModel");
                this._fetchCommonData("BaseLocation", "BaseLocationModel");
                this.MSAID = oEvent.getParameter("arguments").sPath;
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                await this.MSADetailsReadCall();

                var editable = new JSONModel({ editable: false, isEnabled: true, Mode: "Delete", save: false, submitBtn: false, ExpendBtn: false, RelesedBtn: false });
                this.getView().setModel(editable, "simpleForm");

                this.SimpleFormModel = this.getView().getModel("simpleForm");
                var oModelDataPro = new JSONModel();
                this.getView().setModel(oModelDataPro, "oModelDataPro");
                var oSowCreateModel = new JSONModel();
                this.getView().setModel(oSowCreateModel, "sowCreateModel");
                BusyIndicator.hide();
            },

            MSADetailsReadCall: async function () {
                BusyIndicator.show(0);
                try {
                    var response = await this._fetchCommonData("MSADetails", "FilteredMsaModel", {MsaID: this.MSAID});

                    if (this.getView().getModel("FilteredMsaModel").getData()[0].Type === "Recruitment") {
                        this.byId("MsaD_id_Type").setSelectedIndex(0); // First RadioButton
                    } else {
                        this.byId("MsaD_id_Type").setSelectedIndex(1); // Second RadioButton
                    } 
                } catch (error) {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                } finally {
                    BusyIndicator.hide();
                }
            },

            MsaE_onBack: function () {
                this.getRouter().navTo("RouteMSA");
            },

            SOW_onCloseFrag: function () {
                this.SOW_oDialog.close();
            },
            MsaE_validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
            },
            MsaE_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            MsaE_onEditOrSavePress: function () {
                if (this.SimpleFormModel.getProperty("/editable")) {
                    this.onPressSave();
                } else {
                    this.SimpleFormModel.setProperty("/editable", true);
                    this.SimpleFormModel.setProperty("/isEnabled", false);
                }
            },

            Msa_LC_CompanyName: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            Msa_LC_CompanyHeadName: function (oEvent) {
                utils._LCvalidateName(oEvent);
            },

            Msa_LC_HeadPosition: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            Msa_onComboBoxChange:function(oEvent){
                utils._LCvalidateMandatoryField(oEvent);
            },

            Msa_ChangeMsaDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
                const oModelData = this.getView().getModel("FilteredMsaModel").getData()[0];
                const [day, month, year] = this.byId("MsaE_id_CreateMSADate").getValue().split('/');
                const assignmentEndDate = new Date(year, month - 1, day);
        
                const contractPeriod = parseInt(oModelData.ContractPeriod.split(" ")[0]);
                assignmentEndDate.setMonth(assignmentEndDate.getMonth() + contractPeriod);
        
                oModelData.MsaContractPeriodEndDate = assignmentEndDate.toISOString().split('T')[0];
                oModelData.CreateMSADate = this.byId("MsaE_id_CreateMSADate").getValue().split("/").reverse().join("-");
            },

            Msa_LC_PanCard: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            Msa_LC_EmailID: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
            },

            Msa_LC_Address: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            onPressSave: async function () {
                if (utils._LCvalidateMandatoryField(this.getView().byId("MsaE_id_CompanyName"), "ID") && utils._LCvalidateMandatoryField(this.getView().byId("MsaE_id_HeadPosition"), "ID") && utils._LCvalidateName(this.getView().byId("MsaE_id_MsaHead"), "ID") && utils._LCvalidateDate(this.getView().byId("MsaE_id_CreateMSADate"), "ID") && utils._LCvalidateMandatoryField(this.getView().byId("MsaE_id_MsaPanCard"), "ID") && utils._LCvalidateEmail(this.getView().byId("MsaE_id_MSAEmail"), "ID") && utils._LCvalidateMandatoryField(this.getView().byId("MsaE_id_MsaAddress"), "ID") && utils._LCvalidateMandatoryField(this.byId("MsaE_Id_Branch","ID"),"ID")) {
                    var oModel = this.getView().getModel("FilteredMsaModel").getData()[0];
                    oModel.Type = this.byId("MsaE_id_Type").getSelectedButton().getText();
                    
                    var oData = {
                        "data": oModel,
                        "filters": {
                            "MsaID": oModel.MsaID
                        }
                    }
                    await this.ajaxUpdateWithJQuery("MSADetails", oData).then((oData) => {
                        if (oData) {
                            this.SimpleFormModel.setProperty("/editable", false);
                            this.SimpleFormModel.setProperty("/isEnabled", true);
                            MessageToast.show(this.i18nModel.getText("msaupdateSuccess"));
                            BusyIndicator.hide();
                        } else {
                            MessageToast.show(this.i18nModel.getText("msaupdateFailed"));
                        }
                    })
                        .catch((oError) => {
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                        })
                } else {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            },

            SOW_onSubmitFrag: function () {
                try {
                    if (utils._LCvalidateMandatoryField(sap.ui.getCore().byId("SOW_id_MsaDesc"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("SOW_id_StartDate"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("SOW_id_EndDate"), "ID")) {
                        MessageToast.show(this.i18nModel.getText("sowSuccess"));
                    } else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                } catch {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }

            },

            FragmentOpen: function () {
                if (!this.SOW_oDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.SowDetails",
                        controller: this,
                    }).then(function (SOW_oDialog) {
                        this.SOW_oDialog = SOW_oDialog;
                        this.getView().addDependent(this.SOW_oDialog);
                        this.SOW_oDialog.open();
                    }.bind(this));
                } else {
                    this.SOW_oDialog.open();
                }
            },

            SOW_onAddConsultant: function () {
                var oModelPro = this.getView().getModel("oModelDataPro");
                this.SNoValue = this.SNoValue + 1;
                var oDataPro = oModelPro.getProperty("/");
                oDataPro.push({
                    "IndexNo": String(this.SNoValue),
                    "SNo": globalThis.crypto.randomUUID(),
                    "ConsultantName": "",
                    "Designation": "",
                    "Rate": "",
                    "Salutation": "Mr.",
                    "Currency": "INR",
                    "PerDay": "Per Day",
                    "Status": "New"
                });
                oModelPro.setProperty("/", oDataPro);
            },

            onPressDeleteModeCreateSow: function (oEvent) {
                var oModel = this.getView().getModel("oModelDataPro");
                var oContext = oEvent.getParameter("listItem").getBindingContext("oModelDataPro");
                var sIndex = oContext.getPath().split("/")[1];

                var aData = oModel.getData();
                aData.splice(sIndex, 1);

                aData.forEach(function (item, index) {
                    item.IndexNo = index + 1;
                });

                oModel.setData(aData);
                this.SNoValue = aData.length;
            },

            MsaE_onPressCreateSow: function () {
                this.SimpleFormModel.setProperty("/save", true);
                this.SimpleFormModel.setProperty("/submitBtn", false);
                this.SimpleFormModel.setProperty("/ExpendBtn", false);
                this.SimpleFormModel.setProperty("/RelesedBtn", false);
                this.FragmentOpen();
                var jsonProData = [];
                this.SNoValue = 0;
                this.getView().getModel("oModelDataPro").setData(jsonProData);

                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                var result = ""
                for (var i = 0; i < 10; i++) {
                    result += characters.charAt(Math.floor(Math.random() * characters.length));
                }
                var jsonSow = {
                    MsaID: this.msaValue,
                    Description: "",
                    SowID: result,
                    StartDate: "",
                    EndDate: "",
                    Currency: "INR"
                };

                this.getView().getModel("sowCreateModel").setData(jsonSow);
                var oView = this.getView();
            },

            MsaE_onPressRelesedSow: function () {
                this.SimpleFormModel.setProperty("/save", false);
                this.SimpleFormModel.setProperty("/submitBtn", false);
                this.SimpleFormModel.setProperty("/ExpendBtn", false);
                this.SimpleFormModel.setProperty("/RelesedBtn", true);
                this.FragmentOpen();
            },

            MasE_onPressExpendSow: function () {
                this.SimpleFormModel.setProperty("/save", false);
                this.SimpleFormModel.setProperty("/submitBtn", false);
                this.SimpleFormModel.setProperty("/ExpendBtn", true);
                this.SimpleFormModel.setProperty("/RelesedBtn", false);
                this.FragmentOpen();
            },

            MsaE_onPressUpdateSOW: function () {
                this.SimpleFormModel.setProperty("/save", false);
                this.SimpleFormModel.setProperty("/submitBtn", true);
                this.SimpleFormModel.setProperty("/ExpendBtn", false);
                this.SimpleFormModel.setProperty("/RelesedBtn", false);
                this.FragmentOpen();
            },

            SOW_onSaveFrag: function () {
                try {

                } catch (error) {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },

            async MsaE_onPressMerge() {
                BusyIndicator.show(0);
                var oModel = this.getView().getModel("FilteredMsaModel").getData()[0];
                await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: oModel.BranchCode });
                await this._fetchCommonData("PDFCondition", "PDFNDAModel", { Type: "NDA" });
                await this._fetchCommonData("PDFCondition", "PDFMSAModel", { Type: "MSA" });
                var oPDFModel = this.getView().getModel("PDFData");
                oPDFModel.setProperty("/AgreementDate", Formatter.formatDate(oModel.CreateMSADate));
                oPDFModel.setProperty("/AgreementEndDate", Formatter.formatDate(oModel.MsaContractPeriodEndDate));
                oPDFModel.setProperty("/ClientCompanyName", oModel.CompanyName);
                oPDFModel.setProperty("/ClientCompanyAddress", oModel.Address);
                oPDFModel.setProperty("/ClientName", oModel.Salutation + " " + oModel.CompanyHeadName);
                oPDFModel.setProperty("/ClientRole", oModel.CompanyHeadPosition);
                oPDFModel.setProperty("/AgreementDuration", oModel.ContractPeriod);
                oPDFModel.setProperty("/PaymentTerms", oModel.PaymentTerms);
                var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
                var oPDFNDAModel = this.getView().getModel("PDFNDAModel").getData();
                var oPDFMSAModel = this.getView().getModel("PDFMSAModel").getData();
                if (!oCompanyDetailsModel || !oCompanyDetailsModel.companylogo) {
                    BusyIndicator.hide();
                    MessageToast.show("Company Logo or Model not found.");
                    return;
                }
                if (!oCompanyDetailsModel.companylogo64 && !oCompanyDetailsModel.signature64) {
                    var logoBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.companylogo?.data);
                    var signBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.signature?.data);
                    if (logoBase64 && signBase64) {
                        oCompanyDetailsModel.companylogo64 = "data:image/png;base64," + logoBase64;
                        oCompanyDetailsModel.signature64 = "data:image/png;base64," + signBase64;
                    }
                }
                if (oCompanyDetailsModel.companylogo64 && oCompanyDetailsModel.signature64) {
                    if (typeof jsPDF !== "undefined" && typeof jsPDF._GenerateAgreementPDF === "function") {
                        BusyIndicator.show(0);
                        jsPDF._GenerateAgreementPDF(oPDFModel.getData(), oCompanyDetailsModel, oPDFNDAModel, oPDFMSAModel);
                    } else {
                        BusyIndicator.hide();
                        console.error("Error: jsPDF._GenerateAgreementPDF function not found.");
                    }
                }
            },

            async MsaE_onPressMergeSow() {
                await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: "KLB01" });
                await this._fetchCommonData("PDFCondition", "PDFSOWModel", { Type: "SOW" });
                var oPDFModel = this.getView().getModel("PDFData");
                var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
                var oPDFSOWModel = this.getView().getModel("PDFSOWModel").getData();
                if (!oCompanyDetailsModel || !oCompanyDetailsModel.companylogo) {
                    MessageToast.show("Company Logo or Model not found.");
                    return;
                }
                if (!oCompanyDetailsModel.companylogo64 && !oCompanyDetailsModel.signature64) {
                    var logoBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.companylogo?.data);
                    var signBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.signature?.data);
                    if (logoBase64 && signBase64) {
                        oCompanyDetailsModel.companylogo64 = "data:image/png;base64," + logoBase64;
                        oCompanyDetailsModel.signature64 = "data:image/png;base64," + signBase64;
                    }
                }
                if (oCompanyDetailsModel.companylogo64 && oCompanyDetailsModel.signature64) {
                    if (typeof jsPDF !== "undefined" && typeof jsPDF._GenerateSOWPDF === "function") {
                        sap.ui.core.BusyIndicator.show(0);
                        jsPDF._GenerateSOWPDF(oPDFModel.getData(), oCompanyDetailsModel, oPDFSOWModel);
                    } else {
                        console.error("Error: jsPDF._GenerateSOWPDF function not found.");
                    }
                }
            }
        });
    });