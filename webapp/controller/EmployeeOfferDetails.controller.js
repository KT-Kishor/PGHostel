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
                }
                this.getView().setModel(new JSONModel(jsonData), "employeeModel");
                var oViewModel = new JSONModel({ isEditMode: true, isVisiable: true, editable: false });
                this.getView().setModel(oViewModel, "viewModel");
                this.byId("EOD_id_Joindate").setMinDate(new Date());
                ["EOD_id_Name", "EOUF_id_Name", "EOD_id_mail", "EOUF_id_mail", "EOUF_id_Address", "EOD_id_Address", "EOD_id_CTC", "EOUF_id_CTC", "EOUF_id_Bonus", "EOD_id_Bonus"].forEach(function (ids) {
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
                        utils._LCvalidateEmail(this.getView().byId("EOUF_id_mail"), "ID") && utils._LCvalidateMandatoryField(this.getView().byId("EOUF_id_Address"), "ID") && utils._LCvalidateAmount(this.getView().byId("EOUF_id_CTC"), "ID") && utils._LCvalidateAmount(this.getView().byId("EOUF_id_Bonus"), "ID");
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
                                        this.getRouter().navTo("RouteEmployeeOffer");
                                    }.bind(this)
                                }),
                                endButton: new sap.m.Button({
                                    text: "Generate PDF",
                                    type: "Reject",
                                    press: function () {
                                        //  this._generatePDF(); // Call function to generate PDF
                                        oDialog.close();
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
            offerGeneratingPdfFunction: function (oModel) {
                var oEmpModel = oModel.getData();
                this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchcode: oEmpModel.BranchCode });
                this._fetchCommonData("PDFCondition", "PDFConditionModel", { Type: "EmployeeOffer" });

                var oPDFModel = this.getView().getModel("PDFData");
                oPDFModel.setProperty("/Type", "EmployeeOffer");
                oPDFModel.setProperty("/EmpName", oEmpModel.Salutation + " " + oEmpModel.ConsultantName);
                oPDFModel.setProperty("/EmpRole", oEmpModel.Designation);
                oPDFModel.setProperty("/EmpAddress", oEmpModel.ConsultantAddress + ", pincode");
                oPDFModel.setProperty("/EmpPinCode", "123456");
                oPDFModel.setProperty("/CreateDate", oEmpModel.OfferReleaseDate);
                oPDFModel.setProperty("/JoiningDate", oEmpModel.JoiningDate);
                oPDFModel.setProperty("/EmpCTC", oEmpModel.Total);
                oPDFModel.setProperty("/BondYears", oEmpModel.EmploymentBond || "0");
                oPDFModel.setProperty("/MonthlyComponents/0/Text", oEmpModel.TotalmothlyAnnualized);
                oPDFModel.setProperty("/MonthlyComponents/1/Text", oEmpModel.BasicSalary);
                oPDFModel.setProperty("/MonthlyComponents/2/Text", oEmpModel.HRA);
                oPDFModel.setProperty("/MonthlyComponents/3/Text", oEmpModel.StatutoryBonus);
                oPDFModel.setProperty("/MonthlyComponents/4/Text", oEmpModel.TotalMonthly);
                oPDFModel.setProperty("/Retrials/0/Text", oEmpModel.TotalRetires);
                oPDFModel.setProperty("/Retrials/1/Text", oEmpModel.MedicalInsurance);
                oPDFModel.setProperty("/Retrials/2/Text", oEmpModel.Gratuity);
                oPDFModel.setProperty("/VariableComponents/0/Text", oEmpModel.TotalVariablePay);
                oPDFModel.setProperty("/VariableComponents/1/Text", oEmpModel.PerformanceBonus);
                oPDFModel.setProperty("/VariableComponents/2/Text", oEmpModel.EngagementPB);
                oPDFModel.setProperty("/TotalDeductions/1/Text", oEmpModel.TDS);
                oPDFModel.setProperty("/TotalDeductions/2/Text", oEmpModel.PF);
                oPDFModel.setProperty("/TotalDeductions/3/Text", oEmpModel.EPF);
                oPDFModel.setProperty("/Notes/0/Text", oEmpModel.JoiningBonus);

                var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
                var oPDFConditionModel = this.getView().getModel("PDFConditionModel").getData();

                if (!oCompanyDetailsModel || !oCompanyDetailsModel.companylogo) {
                    MessageToast.show("Company Logo or Model not found.");
                    return;
                }

                if (!oCompanyDetailsModel.companylogo64 && !oCompanyDetailsModel.signature64) {
                    var logoBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.companylogo.data);
                    var signBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.signature.data);
                    if (logoBase64 && signBase64) {
                        oCompanyDetailsModel.companylogo64 = "data:image/png;base64," + logoBase64; // Save in a new property
                        oCompanyDetailsModel.signature64 = "data:image/png;base64," + signBase64; // Save in a new property
                    }
                }

                if (oCompanyDetailsModel.companylogo64 && oCompanyDetailsModel.signature64) {
                    console.log(oCompanyDetailsModel);
                    jsPDF._GeneratePDF(oPDFModel.getData(), oCompanyDetailsModel, oPDFConditionModel);
                }

            }
        });
    });
