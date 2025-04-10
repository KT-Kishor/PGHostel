sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "../utils/CommonAgreementPDF",
    "sap/m/MessageToast",
],
    function (BaseController, utils, JSONModel, jsPDF, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.MSAEdit", {
            onInit: function () {
                this.getRouter().getRoute("RouteMSAEdit").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            },
            MsaE_onBack: function () {
                this.getRouter().navTo("RouteMSA");
            },

            MsaE_onPressCreateSow: function () {
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
            SOW_onCloseFrag: function () {
                this.SOW_oDialog.close();
            },
            MsaE_validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
            },
            MsaE_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            SOW_onSubmitFrag: function () {
                try {
                    if (utils._LCvalidateMandatoryField(sap.ui.getCore().byId("SOW_id_MsaDesc"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("SOW_id_StartDate"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("SOW_id_EndDate"), "ID")) {
                        MessageToast.show(this.i18nModel.getText("sowSuccess"));
                    }
                    else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                }
                catch {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }

            },

            async MsaE_onPressMerge() {
                var oCoModel = this.getView().getModel("CompanyCodeDetailsModel");
                var oPDFCondNDAModel = this.getView().getModel("PDFNDAModel");
                var oPDFCondMSAModel = this.getView().getModel("PDFMSAModel");
                if (oCoModel && oPDFCondNDAModel && oPDFCondMSAModel){
                    oCoModel.destroy();
                    oPDFCondNDAModel.destroy();
                    oPDFCondMSAModel.destroy();
                    this.getView().setModel(null, "CompanyCodeDetailsModel");
                    this.getView().setModel(null, "PDFNDAModel");
                    this.getView().setModel(null, "PDFMSAModel");
                }

                try {
                    this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchcode: "KLB01" });
                    this._fetchCommonData("PDFCondition", "PDFNDAModel", { Type: "NDA" });
                    this._fetchCommonData("PDFCondition", "PDFMSAModel", { Type: "MSA" });
                    await this._waitForModels(["CompanyCodeDetailsModel", "PDFNDAModel", "PDFMSAModel"], 200, 5000);

                    var oPDFModel = this.getView().getModel("PDFData");
                    var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
                    var oPDFNDAModel = this.getView().getModel("PDFNDAModel").getData();
                    var oPDFMSAModel = this.getView().getModel("PDFMSAModel").getData();
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
                        if (typeof jsPDF !== "undefined" && typeof jsPDF._GenerateAgreementPDF === "function") {
                            sap.ui.core.BusyIndicator.show(0);
                            jsPDF._GenerateAgreementPDF(oPDFModel.getData(), oCompanyDetailsModel, oPDFNDAModel, oPDFMSAModel);
                        } else {
                            console.error("Error: jsPDF._GenerateAgreementPDF function not found.");
                        }
                    }

                } catch (error) {
                    console.error("Error waiting for models:", error);
                }
            },

            async MsaE_onPressMergeSow() {
                var oCoModel = this.getView().getModel("CompanyCodeDetailsModel");
                var oPDFCondSOWModel = this.getView().getModel("PDFSOWModel");
                if (oCoModel && oPDFCondSOWModel){
                    oCoModel.destroy();
                    oPDFCondSOWModel.destroy();
                    this.getView().setModel(null, "CompanyCodeDetailsModel");
                    this.getView().setModel(null, "PDFSOWModel");
                }
                
                try {
                    this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchcode: "KLB01" });
                    this._fetchCommonData("PDFCondition", "PDFSOWModel", { Type: "SOW" });
                    await this._waitForModels(["CompanyCodeDetailsModel", "PDFSOWModel"], 200, 5000);

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

                } catch (error) {
                    console.error("Error waiting for models:", error);
                }
            }
        });
    });