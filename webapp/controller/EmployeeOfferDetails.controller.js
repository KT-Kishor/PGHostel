sap.ui.define([
    "./BaseController", "../utils/validation", "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../utils/CommonJsPDF",
    "../model/formatter"
],
    function (BaseController, utils, JSONModel, MessageToast, MessageBox, jsPDF, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.EmployeeOfferDetails", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteEmployeeOfferDetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function (oEvent) {
                this.sArgPara = oEvent.getParameter("arguments").sParOffer
                this.sSalutationArg = oEvent.getParameter("arguments").sParEmployee;
                this.byId("EOD_id_Wizard").getSteps()[0].setValidated(false);
                this.getView().byId("EOD_id_BondCombo").setVisible(false);
                this.getView().byId("EOD_id_Lyear").setVisible(false);
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this._fetchCommonData("Designation", "DesignationModel");
                this._fetchCommonData("BaseLocation", "BaseLocationModel");
                this._fetchCommonData("Currency", "CurrencyModel");
                this._fetchCommonData("CompanyEmails", "CCMailModel", {
                    applicationName: "EmployeeOffer"
                  });

                  var jsonData = {
                    "Salutation": "Mr.",
                    "ConsultantName": "",
                    "ConsultantAddress": "",
                    "Designation": "",
                    "OfferReleaseDate": this.Formatter.formatDate(new Date()),
                    "JoiningDate": "",
                    "CTC": "",
                    "EmploymentBond": "0",
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
                    "PinCode": ""
                }
                this.getView().setModel(new JSONModel(jsonData), "employeeModel");
                var oViewModel = new JSONModel({ isEditMode: true, isVisiable: true, editable: false });
                this.getView().setModel(oViewModel, "viewModel");
                this.byId("EOD_id_Joindate").setMinDate(new Date());
                ["EOD_id_Name", "EOUF_id_Name", "EOD_id_mail", "EOUF_id_mail", "EOUF_id_Address", "EOD_id_Address", "EOD_id_CTC", "EOUF_id_CTC", "EOUF_id_Bonus", "EOD_id_Bonus", "EOD_id_PinCode"].forEach(function (ids) {
                    this.getView().byId(ids).setValueState("None");
                }.bind(this));
                if (this.sArgPara === "CreateOfferFlag" || this.sSalutationArg !== "UpdateOffer") {
                    var createPage = true, updatePage = false;
                    if (this.sArgPara !== "CreateOfferFlag") {
                        this.getView().getModel("employeeModel").setProperty("/ConsultantName", this.sArgPara);
                        this.getView().getModel("employeeModel").setProperty("/Salutation", this.sSalutationArg);
                    }
                    this.EOD_onResetWizard();
                } else {
                    var createPage = false, updatePage = true;
                    var oBasicDetailsSection = this.getView().byId("EODF_id_BasicDetailsSection");
                    this.getView().byId("EODF_id_ObjectPageLayoutEmp").setSelectedSection(oBasicDetailsSection);
                    this.readCallForEmployeeOffer(this.sArgPara);
                }
                this.getView().byId("EOD_id_PageCrate").setVisible(createPage);
                this.getView().byId("EODF_id_PageUpdate").setVisible(updatePage);
            },
            EOUF_onEditOrSavePress: function () {
                var oViewModel = this.getView().getModel("viewModel");
                // Check if in edit mode
                if (oViewModel.getProperty("/editable")) {
                    var isValid = utils._LCvalidateName(this.getView().byId("EOUF_id_Name"), "ID") && utils._LCvalidateDate(this.getView().byId("EOUF_id_Reldate"), "ID") && utils._LCvalidateDate(this.getView().byId("EOUF_id_Joindate"), "ID") &&
                        utils._LCvalidateEmail(this.getView().byId("EOUF_id_mail"), "ID") && utils._LCvalidateMandatoryField(this.getView().byId("EOUF_id_Address"), "ID") && utils._LCvalidatePinCode(this.getView().byId("EOUF_id_PinCode"), "ID") && utils._LCvalidateAmount(this.getView().byId("EOUF_id_CTC"), "ID") && utils._LCvalidateAmount(this.getView().byId("EOUF_id_Bonus"), "ID");
                    // Save the changes
                    if (isValid) this.updateCallForEmployeeOffer(oViewModel);
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
                oModel.Status = oModel.Status === "Rejected" ? "Submitted" : oModel.Status;
                oModel.BranchCode = this.getView().byId("EOUF_id_Location").getSelectedItem().getAdditionalText();
                oModel = {
                    "data": oModel,
                    "filters": {
                        "ID": this.sArgPara
                    }
                }
                this.ajaxUpdateWithJQuery("EmployeeOffer", oModel).then((oData) => {
                    if (oData.results) {
                        oViewModel.setProperty("/editable", false);
                        oViewModel.setProperty("/isEditMode", true);
                        oViewModel.setProperty("/isCTCVisible", false);
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show(this.i18nModel.getText("offerUpdateSucc"));
                        this.getRouter().navTo("RouteEmployeeOffer");
                    }
                }).catch((oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                })
            },
            readCallForEmployeeOffer: function (sArgPara) {
                var queryString = $.param({
                    "ID": sArgPara
                });
                this.ajaxReadWithJQuery("EmployeeOffer", queryString).then((oData) => {
                    var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    var index = offerData[0].TDS.split(" ")[1] !== "0" ? 0 : (offerData[0].TDS.split(" ")[1] === "0" ? 1 : 2);
                    this.byId("EOUF_id_RadioButTds").setSelectedIndex(index);
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
            EOD_validatePinCode: function (oEvent) {
                utils._LCvalidatePinCode(oEvent);
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
                    var joinDateVa = oOfferDateId === "EOD_id_Reldate" ? "EOD_id_Joindate" : "EOUF_id_Joindate";
                    releaseDate = this.byId(oOfferDateId).getDateValue();
                    this.byId(joinDateVa).setValue("");
                    this.byId(joinDateVa).setMinDate(releaseDate);
                }
            },
            EOD_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
                this.validateStep();
            },
            EOD_onPressBack: function () {
                this.getRouter().navTo("RouteEmployeeOffer", { valueEmp: "EmployeeOfferDetails" });
            },
            //Step validation
            validateStep: function () {
                // Check if all fields have values
                var allFieldsFilled = this.getView().byId("EOD_id_Name").getValue() && this.getView().byId("EOD_id_Reldate").getValue() &&
                    this.getView().byId("EOD_id_mail").getValue() && this.getView().byId("EOD_id_Address").getValue() && this.getView().byId("EOD_id_CTC").getValue() && this.getView().byId("EOD_id_Bonus").getValue()
                if (allFieldsFilled) {
                    // Validate each field directly
                    var isValid = utils._LCvalidateName(this.getView().byId("EOD_id_Name"), "ID") && utils._LCvalidateDate(this.getView().byId("EOD_id_Reldate"), "ID") && utils._LCvalidateDate(this.getView().byId("EOD_id_Joindate"), "ID") &&
                        utils._LCvalidateEmail(this.getView().byId("EOD_id_mail"), "ID") && utils._LCvalidateMandatoryField(this.getView().byId("EOD_id_Address"), "ID") && utils._LCvalidatePinCode(this.getView().byId("EOD_id_PinCode"), "ID") && utils._LCvalidateAmount(this.getView().byId("EOD_id_CTC"), "ID") && utils._LCvalidateAmount(this.getView().byId("EOD_id_Bonus"), "ID");
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
                this.getView().byId("EOD_id_Bond").setSelectedIndex(1);
                this.getView().byId("EOUF_id_RadioButTds").setSelectedIndex(0);
            },
            //Submit the data
            EOD_onSubmitData: function () {
                if (this.byId("EOD_id_Wizard").getSteps()[0].getValidated()) {
                    var oModel = this.getView().getModel("employeeModel").getData();
                    oModel.BranchCode = this.getView().byId("EOD_id_Location").getSelectedItem().getAdditionalText();
                    oModel.BaseLocation = oModel.BaseLocation !== "" ? oModel.BaseLocation : this.getView().byId("EOD_id_Location").getSelectedKey();
                    oModel.Status = "Submitted";
                    oModel = {
                        "tableName": "EmployeeOffer",
                        "data": oModel
                    }
                    this.ajaxCreateWithJQuery("EmployeeOffer", oModel).then((oData) => {
                        if (oData.results) {

                            var oDialog = new sap.m.Dialog({
                                title: this.i18nModel.getText("success"),
                                type: sap.m.DialogType.Message,
                                state: sap.ui.core.ValueState.Success,
                                content: new sap.m.Text({ text: this.i18nModel.getText("offerSuccess") }),
                                beginButton: new sap.m.Button({
                                    text: "OK",
                                    type: "Accept",
                                    press: function () {
                                        oDialog.close();
                                        this.getRouter().navTo("RouteEmployeeOffer", { valueEmp: "EmployeeOfferDetails" });
                                    }.bind(this)
                                }),
                                endButton: new sap.m.Button({
                                    text: "Generate PDF",
                                    type: "Reject",
                                    press: function () {
                                        this.EOUF_onPressMerge();
                                        oDialog.close();
                                        this.getRouter().navTo("RouteEmployeeOffer", { valueEmp: "EmployeeOfferDetails" });
                                    }.bind(this)
                                }),
                                afterClose: function () {
                                    oDialog.destroy();
                                }
                            });

                            oDialog.open();
                        }
                    }).catch((oError) => {
                        MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                        sap.ui.core.BusyIndicator.hide();
                    });

                } else {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            },
            EOD_onRadioButtonSelect: function (oEvent) {
                if (oEvent.getParameter("selectedIndex") === 0) var sValue = true;
                else var sValue = false;
                this.getView().byId("EOD_id_BondCombo").setVisible(sValue);
                this.getView().byId("EOD_id_Lyear").setVisible(sValue);
            },
            EOD_onTDSCheckboxChange: function () {
                var ID = (this.sArgPara === "CreateOfferFlag" || this.sSalutationArg !== "UpdateOffer") ? "EOD_id_RadioButTds" : "EOUF_id_RadioButTds";
                var oTdsVal = this.byId(ID).getAggregation("buttons")[this.byId(ID).getSelectedIndex()].getProperty("text");
                if (this.getView().getModel("employeeModel").getProperty("/CTC"))
                    this._calculateSalaryComponents(oTdsVal);
            },
            EOD_onStep2: function () {
                var oTdsVal = this.byId("EOD_id_RadioButTds").getAggregation("buttons")[this.byId("EOD_id_RadioButTds").getSelectedIndex()].getProperty("text");
                this._calculateSalaryComponents(oTdsVal);
                var oModel = this.getView().getModel("employeeModel").getData();
                if (oModel.BaseLocation === "") this.getView().getModel("employeeModel").setProperty("/BaseLocation", this.byId("EOD_id_Location").getSelectedKey())
                if (oModel.Designation === "") this.getView().getModel("employeeModel").setProperty("/Designation", this.byId("EOD_id_Designation").getSelectedKey())
            },
            EOUF_onPressMerge: function () {
                var oModel = this.getView().getModel("employeeModel");
                this.offerGeneratingPdfFunction(oModel);
            },

            EOD_commonOpenDialog: function (FragmentName,EmployeeEmail) {
                if (!this.oDialog) {
                    sap.ui.core.Fragment.load({
                        name: FragmentName,
                        controller: this
                    }).then(dialog => {
                        this.oDialog = dialog;
                        this.getView().addDependent(this.oDialog);
                        this.oDialog.open();
                        if(EmployeeEmail !== "ConfirmationDia")
                         sap.ui.getCore().byId("Mail_id_Text").setValue(EmployeeEmail);
                    }).bind(this);
                } else {
                    this.oDialog.open();
                    if(EmployeeEmail !== "ConfirmationDia")
                        sap.ui.getCore().byId("Mail_id_Text").setValue(EmployeeEmail);
                }
            },
            EOUF_onSendEmail:function(){
                var oModel = this.getView().getModel("employeeModel").getData();
                this.EOD_commonOpenDialog("sap.kt.com.minihrsolution.fragment.CommonMail",oModel.EmployeeEmail);
            },
            Mail_onPressClose: function () {
                sap.ui.getCore().byId("Mail_id_Text").setValueState("None");
                this.oDialog.close();
                this.oDialog.destroy();
            },
            Mail_onSendEmail: function () {


            },
            EOD_onPressBackBtn: function () {
                this.EOD_commonOpenDialog( "sap.kt.com.minihrsolution.fragment.CommonBack");

            },
            onConfirmBack: function () {
                this.getRouter().navTo("RouteEmployeeOffer", { valueEmp: "EmployeeOfferDetails" })
                this.oDialog.close();
            },
            onCancel: function () {
                this.oDialog.close();
            },
            onDialogClose: function () {
                this.oDialog.destroy();
                this.oDialog = null;
            },
            EOUF_onPressMerge: function () {
                var oModel = this.getView().getModel("employeeModel");
                this.offerGeneratingPdfFunction(oModel);
            },
            async offerGeneratingPdfFunction(oModel) {
                var oCoModel = this.getView().getModel("CompanyCodeDetailsModel");
                var oPDFCondModel = this.getView().getModel("PDFConditionModel");
                if (oCoModel && oPDFCondModel) {
                    oCoModel.destroy();
                    oPDFCondModel.destroy();
                    this.getView().setModel(null, "CompanyCodeDetailsModel");
                    this.getView().setModel(null, "PDFConditionModel");
                }
                var oEmpModel = oModel.getData();

                try {
                    this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchcode: "KLB01" });
                    this._fetchCommonData("PDFCondition", "PDFConditionModel", { Type: "EmployeeOffer" });
                    await this._waitForModels(["CompanyCodeDetailsModel", "PDFConditionModel"], 200, 5000);

                    
                    var oPDFModel = this.getView().getModel("PDFData");
                    oPDFModel.setProperty("/Type", "EmployeeOffer");
                    oPDFModel.setProperty("/EmpName", oEmpModel.Salutation + " " + oEmpModel.ConsultantName);
                    oPDFModel.setProperty("/EmpRole", oEmpModel.Designation);
                    oPDFModel.setProperty("/EmpAddress", oEmpModel.ConsultantAddress + ", " + oEmpModel.PinCode);
                    oPDFModel.setProperty("/CreateDate", Formatter.formatDate(oEmpModel.OfferReleaseDate));
                    oPDFModel.setProperty("/JoiningDate", Formatter.formatDate(oEmpModel.JoiningDate));
                    oPDFModel.setProperty("/EmpCTC", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.CostofCompany));
                    if (oEmpModel.EmploymentBond == "0" || oEmpModel.EmploymentBond == "") {
                        oPDFModel.setProperty("/BondCondition", "18 employment months");
                    }
                    else {
                        oPDFModel.setProperty("/BondCondition", oEmpModel.EmploymentBond + " employment bond years");
                    }
                    oPDFModel.setProperty("/MonthlyComponents/0/Text", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.TotalmothlyAnnualized));
                    oPDFModel.setProperty("/MonthlyComponents/1/Text", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.BasicSalary));
                    oPDFModel.setProperty("/MonthlyComponents/2/Text", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.HRA));
                    oPDFModel.setProperty("/MonthlyComponents/3/Text", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.StatutoryBonus));
                    oPDFModel.setProperty("/MonthlyComponents/4/Text", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.TotalMonthly));
                    oPDFModel.setProperty("/Retrials/0/Text", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.TotalRetires));
                    oPDFModel.setProperty("/Retrials/1/Text", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.MedicalInsurance));
                    oPDFModel.setProperty("/Retrials/2/Text", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.Gratuity));
                    oPDFModel.setProperty("/VariableComponents/0/Text", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.TotalVariablePay));
                    oPDFModel.setProperty("/VariableComponents/1/Text", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.PerformanceBonus));
                    oPDFModel.setProperty("/VariableComponents/2/Text", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.EngagementPB));
                    oPDFModel.setProperty("/TotalDeductions/1/Text", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.TDS));
                    oPDFModel.setProperty("/TotalDeductions/2/Text", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.PF || ""));
                    oPDFModel.setProperty("/TotalDeductions/3/Text", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.EPF || ""));
                    if(oEmpModel.JoiningBonus == "0"){
                        oPDFModel.setProperty("/Notes/0/Text", "0");
                    }
                    else{
                        oPDFModel.setProperty("/Notes/0/Text", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.JoiningBonus));
                    }

                    var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
                    oPDFModel.setProperty("/Headers/0/Text", oCompanyDetailsModel.companyName);
                    oPDFModel.setProperty("/Headers/1/Text", oCompanyDetailsModel.branch);
                    var oPDFConditionModel = this.getView().getModel("PDFConditionModel").getData();

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
                        if (typeof jsPDF !== "undefined" && typeof jsPDF._GeneratePDF === "function") {
                            jsPDF._GeneratePDF(oPDFModel.getData(), oCompanyDetailsModel, oPDFConditionModel);
                        } else {
                            console.error("Error: jsPDF._GeneratePDF function not found.");
                        }
                    }

                } catch (error) {
                    console.error("Error waiting for models:", error);
                }
            },

            _waitForModels(modelNames, interval = 200, timeout = 5000) {
                return new Promise((resolve, reject) => {
                    const startTime = Date.now();

                    const checkModels = () => {
                        let allLoaded = modelNames.every(modelName => {
                            let model = this.getView().getModel(modelName);
                            return model && model.getData() && Object.keys(model.getData()).length > 0;
                        });

                        if (allLoaded) {
                            resolve(); // ✅ Proceed when models have data
                        } else if (Date.now() - startTime > timeout) {
                            reject(new Error("Timeout waiting for models: " + modelNames.join(", ")));
                        } else {
                            setTimeout(checkModels, interval);
                        }
                    };

                    checkModels();
                });
            }
        });
    });
