sap.ui.define([
    "./BaseController", "../utils/validation", "sap/ui/model/json/JSONModel", "../utils/CommonAgreementPDF",
    "../model/formatter", "sap/m/MessageToast",
],
    function (BaseController, utils, JSONModel, jsPDF, Formatter, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.ContractDetails", {
            onInit: function () {
                this.getRouter().getRoute("RouteContractDetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function (oEvent) {
                this.getBusyDialog(); // Show busy dialog
                this.commonLoginFunction("Contract");
                this._makeDatePickersReadOnly(["CD_id_AgreeDate", "CD_id_Datestart", "CD_id_DateEnd"]);
                this._makeDatePickersReadOnly(["CU_id_AgreementDate", "CU_id_AssignmentStartDate", "CU_id_AssignmentEndDate"]);
                await this._fetchCommonData("Currency", "CurrencyModel");
                await this._fetchCommonData("BaseLocation", "BaseLocationModel");
                await this._fetchCommonData("ManageCustomer", "CreateCustomerModel");
                await this._fetchCommonData("PaymentTerms", "ContractpaymentModel");
                await this._fetchCommonData("EmailContent", "CCMailModel", { Type: "ContractActive" });

                this.sArgPara = oEvent.getParameter("arguments").sParContract;
                var AgreementNo = oEvent.getParameter("arguments").sID
                this.CD_CommonID();
                var oView = this.getView();
                this.i18nModel = oView.getModel("i18n").getResourceBundle();

                var oWizard = oView.byId("CD_id_Wizard");
                oWizard.discardProgress(oView.byId("CD_id_Firststep"));
                oWizard.goToStep(oView.byId("CD_id_Firststep"));

                this._wizard = oView.byId("wizardContentPage");
                oWizard.getSteps()[0].setValidated(false);
                oWizard.getSteps()[1].setValidated(false);

                if (this.sArgPara === "CreateContractFlag") {
                    try {
                        const oData = {
                            AgreementDate: this.Formatter.formatDate(new Date()),
                            ConsultantName: "",
                            ConsultantAddress: "",
                            ContarctEmail: "",
                            Role: "Contractor",
                            Rate: "Daily",
                            Amount: "",
                            Currency: "INR",
                            EndClientHirer: "",
                            Location: "REMOTE",
                            HiringContact: "",
                            AssignmentStatus: "New",
                            StartDate: "",
                            EndDate: "",
                            InsuranceRequirement: "No",
                            WarrantyDate: "3 Months",
                            AdditionalRates: "No",
                            PaymentTerms: "30 Days",
                            Status: "Submitted",
                            Salutation: "Mr.",
                            Salutation2: "Mr.",
                            contractLocation: "Agra"
                        };

                        const oModel = new JSONModel(oData);
                        oView.setModel(oModel, "ContractModelWizart");

                        oView.byId("C_id_PageCreate").setVisible(true);
                        oView.byId("CUF_id_pageTrainee").setVisible(false);

                        this.getView().byId("CD_id_Submit").setEnabled(false);

                        this.closeBusyDialog(); //  Close BusyDialog
                    } catch (error) {
                        this.closeBusyDialog(); //  Close BusyDialog
                        sap.m.MessageToast.show(error.message || error.responseText);
                    }

                } else {
                    // UPDATE case
                    this.getView().getModel("LoginModel").setProperty("/sendEmail", false);

                    var ContractStatusModel = new JSONModel({ status: false });
                    this.getView().setModel(ContractStatusModel, "ContractStatus");

                    var editable = new JSONModel({ editable: false, Status: false });
                    this.getView().setModel(editable, "simpleForm");

                    var oViewModel = new JSONModel({ isEditMode: false, isVisiable: true, isMerge: true });
                    this.getView().setModel(oViewModel, "viewModel");

                    try {
                        var response = await this.ajaxReadWithJQuery("Contract", { ContractNo: this.sArgPara, AgreementNo: AgreementNo });

                        var oResult = response.data[0];
                        this.ContractNo = oResult.ContractNo;
                        this.OldStatus = oResult.ContractStatus;
                        this.AssignmentStartDate = this.Formatter.formatDate(oResult.AssignmentStartDate);
                        this.AssignmentEndDate = this.Formatter.formatDate(oResult.AssignmentEndDate);
                        this.ContractStatus = oResult.ContractStatus;

                     if (this.ContractStatus !== "Inactive" && this.ContractStatus !== "Renewed") {
                            this.getView().getModel("ContractStatus").setProperty("/status", true);
                    }

                        var contractModel = new JSONModel(oResult);
                        this.getOwnerComponent().setModel(contractModel, "oFilteredContractModel");

                        this.getView().getModel("oFilteredContractModel").setProperty("/Amount", parseFloat(oResult.ConsultantRate.split(" ")[0]));
                        this.getView().getModel("oFilteredContractModel").setProperty("/Currency", oResult.ConsultantRate.split(" ")[1]);

                        var rateType = oResult.ConsultantRate.split(" ")[3];
                        var varible = rateType === "Hr" ? 0 : rateType === "Day" ? 1 : 2;
                        this.getView().getModel("oFilteredContractModel").setProperty("/HrDaliyMonth", varible);

                        this.getView().byId("C_id_PageCreate").setVisible(false);
                        this.getView().byId("CUF_id_pageTrainee").setVisible(true);

                        this.closeBusyDialog(); // Close BusyDialog
                    } catch (error) {
                        this.closeBusyDialog(); // Close BusyDialog
                        sap.m.MessageToast.show(error.message || error.responseText);
                    }
                }
            },

            CD_CommonID: function () {
                const ids = ["CD_id_CName", "CD_id_Address", "CD_id_Email", "CD_id_Amount", "CD_id_EndClientHirer", "CD_id_Locationcomb", "CD_id_HiringContact", "CD_id_ConLocation"]
                ids.forEach((id) => { this.byId(id).setValueState("None"); });
            },

            CD_validateName: function (oEvent) {
                const oSource = oEvent.getSource();
                const selectedKey = oSource.getSelectedKey?.();
                let oModel, oInput;
            
                if (this.sArgPara === "CreateContractFlag") {
                    oModel = this.getView().getModel("ContractModelWizart");
                    oInput = this.byId("CD_id_HiringContact"); // ID for Hiring Contact input
                } else {
                    oModel = this.getView().getModel("oFilteredContractModel");
                    oInput = this.byId("CU_id_ClientReportContact"); // ID for Client Report Contact input
                }
            
                if (oModel) {
                    if (selectedKey) {
                        oModel.setProperty("/ClientReportContact", selectedKey);
                        if (oInput) {
                            oInput.setValueState("None");
                        }
                    } else {
                        // Clear the value in model if selectedKey is empty
                        oModel.setProperty("/ClientReportContact", "");
                    }
                }
            
                utils._LCvalidateName(oEvent);
                this.validateStep();
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
                let oModel, oStartDatePicker, oEndDatePicker;

                if (this.sArgPara === "CreateContractFlag") {
                    oModel = this.getView().getModel("ContractModelWizart");
                    oStartDatePicker = this.byId("CD_id_Datestart");
                    oEndDatePicker = this.byId("CD_id_DateEnd");
                } else {
                    oModel = this.getView().getModel("oFilteredContractModel");
                    oStartDatePicker = this.byId("CU_id_AssignmentStartDate");
                    oEndDatePicker = this.byId("CU_id_AssignmentEndDate");
                }

                const oSource = oEvent.getSource();
                const sId = oSource.getId();
                const sValue = oSource.getValue();
                const oDate = this.onFormatDate(sValue); // Convert "dd/MM/yyyy" to Date object

                if (!isNaN(oDate?.getTime?.())) {
                    if (sId === oStartDatePicker.getId()) {
                        oEndDatePicker.setMinDate(oDate);   // Start Date changed — set minDate on End Date
                    } else if (sId === oEndDatePicker.getId()) {
                        oStartDatePicker.setMaxDate(oDate);// End Date changed — set maxDate on Start Date
                    }
                }

                utils._LCvalidateDate(oEvent);

                if (this.sArgPara === "CreateContractFlag") { 
                    this.validateStep();    //  validation if in create flow
                }
            },

            // Format date string to Date object
            onFormatDate: function (dateString) {
                var parts = dateString.split('/');
                return new Date(parts[2], parts[1] - 1, parts[0]);
            },

            CD_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
                this.validateStep();
            },

            CD_ValidateComboBox: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
            },

            CD_ValidateConsultantName:function(oEvent){
                utils._LCvalidateName(oEvent);
                this.validateStep();
            },

            //back function
            CD_onPressback: function () {
                this.showConfirmationDialog(
                    this.i18nModel.getText("ConfirmActionTitle"),
                    this.i18nModel.getText("backConfirmation"),
                    function () {
                        this.getRouter().navTo("RouteContract");
                    }.bind(this)
                );
                this.byId("idWizardStep").getParent().setShowNextButton(true);
            },

            CU_onBack: function () {
                var isEditMode = this.getView().getModel("viewModel").getProperty("/isEditMode");
                if (isEditMode) {
                    // Save button is visible, ask for confirmation
                    this.showConfirmationDialog(
                        this.i18nModel.getText("ConfirmActionTitle"),
                        this.i18nModel.getText("backConfirmation"),
                        function () {
                            // On confirm, reset and navigate back
                            this.getView().getModel("viewModel").setProperty("/isEditMode", false);
                            this.getView().getModel("simpleForm").setProperty("/editable", false);
                            this.getRouter().navTo("RouteContract");
                        }.bind(this)
                    );
                } else {
                    // Edit button is visible, allow direct back
                    this.getRouter().navTo("RouteContract");
                }
            },

            //Step validation
            validateStep: function () {
                var oModel = this.getView().getModel("ContractModelWizart").getData();
                oModel.AgreeDate = this.byId("CD_id_AgreeDate").getValue();
                oModel.CName = this.byId("CD_id_CName").getValue();
                oModel.Address = this.byId("CD_id_Address").getValue();
                oModel.Email = this.byId("CD_id_Email").getValue();
                oModel.Amount = this.byId("CD_id_Amount").getValue();
                oModel.HiringContact = this.byId("CD_id_HiringContact").getValue();
                oModel.Datestart = this.byId("CD_id_Datestart").getValue();
                oModel.DateEnd = this.byId("CD_id_DateEnd").getValue();
                oModel.EndClientHirer = this.byId("CD_id_EndClientHirer").getValue();
            
                const bAllFieldsFilled = oModel.AgreeDate && oModel.CName && oModel.Address && oModel.Email &&
                    oModel.Role && oModel.Amount && oModel.HiringContact &&
                    oModel.Datestart && oModel.DateEnd && oModel.EndClientHirer;
            
                if (bAllFieldsFilled) {
                    // Run all validations
                    let bValid =
                        utils._LCvalidateDate(this.byId("CD_id_AgreeDate"), "ID") &&
                        utils._LCvalidateName(this.byId("CD_id_CName"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CD_id_Address"), "ID") &&
                        utils._LCvalidateEmail(this.byId("CD_id_Email"), "ID") &&
                        utils._LCvalidateAmount(this.byId("CD_id_Amount"), "ID") &&
                        utils._LCvalidateName(this.byId("CD_id_HiringContact"), "ID") &&
                        utils._LCvalidateDate(this.byId("CD_id_Datestart"), "ID") &&
                        utils._LCvalidateDate(this.byId("CD_id_DateEnd"), "ID") &&
                        utils._LCvalidateName(this.byId("CD_id_EndClientHirer"), "ID");
            
                    // Set wizard step validation
                    this.byId("CD_id_Wizard").getSteps()[0].setValidated(bValid);
                } else {
                    this.byId("CD_id_Wizard").getSteps()[0].setValidated(false);
                    this.byId("CD_id_Firststep").getAggregation("_nextButton").setText(this.i18nModel.getText("review"));
                }
            },
            
            //radio button select function
            RadioButtonSelect: function (oEvent) {
                var oModel = this.getView().getModel("ContractModelWizart");
                this.RadioButton = oEvent.getSource().getAggregation("buttons")[oEvent.getSource().mProperties.selectedIndex].getText()
                oModel.setProperty("/Rate", this.RadioButton);
            },

            //third step validation function
            CD_StepThree: function () {
                this.getView().byId("CD_id_Submit").setEnabled(true);
                this.byId("idWizardStep").getParent().setShowNextButton(false);
            },

            CD_onSubmit: async function () {
                try {
                    if (
                        utils._LCvalidateDate(this.byId("CD_id_AgreeDate"), "ID") &&
                        utils._LCvalidateName(this.byId("CD_id_CName"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CD_id_Address"), "ID") &&
                        utils._LCvalidateEmail(this.byId("CD_id_Email"), "ID") &&
                        utils._LCvalidateAmount(this.byId("CD_id_Amount"), "ID") &&
                        utils._LCvalidateName(this.byId("CD_id_HiringContact"), "ID") &&
                        utils._LCvalidateDate(this.byId("CD_id_Datestart"), "ID") &&
                        utils._LCvalidateDate(this.byId("CD_id_DateEnd"), "ID") &&
                        utils._LCvalidateName(this.byId("CD_id_EndClientHirer"), "ID")
                    ) {
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
                        var selectedCurrency = this.byId("CD_id_Currency").getSelectedKey();
                        var branchCode = this.getView().byId("CD_id_ConLocation").getSelectedItem().getAdditionalText();
            
                        var data = {
                            "ConsultantNameSalutation": oModel.oData.Salutation,
                            "ConsultantName": oModel.oData.ConsultantName,
                            "ConsultantAddress": oModel.oData.ConsultantAddress,
                            "EndClient": oModel.oData.EndClientHirer,
                            "ConsultingService": "Contractor",
                            "LocationService": oModel.oData.Location,
                            "ContractStatus": oModel.oData.AssignmentStatus,
                            "AssignmentStartDate": oModel.oData.StartDate.split("/").reverse().join("-"),
                            "AssignmentEndDate": oModel.oData.EndDate.split("/").reverse().join("-"),
                            "ConsultantRate": oModel.oData.Amount + " " + selectedCurrency + " Per " + formattedText + " Including all tax",
                            "PaymentTerms": oModel.oData.PaymentTerms,
                            "ClientReportContactSalutation": oModel.oData.Salutation2,
                            "ClientReportContact": oModel.oData.ClientReportContact,
                            "SpecificInsuranceRequirement": oModel.oData.InsuranceRequirement,
                            "ContractPeriod": oModel.oData.WarrantyDate,
                            "ExpensesClaim": oModel.oData.AdditionalRates,
                            "Status": "Submitted",
                            "AgreementDate": oModel.oData.AgreementDate.split("/").reverse().join("-"),
                            "ContarctEmail": oModel.oData.ContarctEmail,
                            "ContractLocation": oModel.oData.BaseLocation !== "" ? oModel.oData.BaseLocation : this.getView().byId("CD_id_ConLocation"),
                            "AgreementNo": String(1).padStart(2, '0'),
                            "BranchCode": branchCode
                        };
            
                        this.getBusyDialog(); // Show busy dialog
            
                        var response = await this.ajaxCreateWithJQuery("Contract", { data: data });
            
                        if (response.success === true) {
                            this.closeBusyDialog(); // Close busy dialog
            
                            var oDialog = new sap.m.Dialog({
                                title: this.i18nModel.getText("success"),
                                type: sap.m.DialogType.Message,
                                state: sap.ui.core.ValueState.Success,
                                content: new sap.m.Text({ text: this.i18nModel.getText("contractSuccess") }),
                                beginButton: new sap.m.Button({
                                    text: "OK",
                                    type: "Accept",
                                    press: function () {
                                        oDialog.close();
                                        this.getRouter().navTo("RouteContract");
                                    }.bind(this)
                                }),
                                endButton: new sap.m.Button({
                                    text: "Generate PDF",
                                    type: "Reject",
                                    press: function () {
                                        oDialog.close();
                                        this.contractPDFgenerate(data);
                                        this.getRouter().navTo("RouteContract");
                                    }.bind(this)
                                }),
                                afterClose: function () {
                                    oDialog.destroy();
                                }
                            });
            
                            oDialog.open();
                        }
                    } else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                } catch (error) {
                    this.closeBusyDialog(); // Close busy dialog
                    MessageToast.show(error.message || error.responseText);
                }
            },
            
            onEditOrSavePress: function () {
                var oViewModel = this.getView().getModel("viewModel");
                var isEditMode = oViewModel.getProperty("/isEditMode");
                if (isEditMode) {
                    this.onPressSave();
                } else {
                    if (this.ContractStatus !== 'Active') {
                        this.getView().getModel("simpleForm").setProperty("/editable", true);
                        this.getView().getModel("simpleForm").setProperty("/Status", true);
                        oViewModel.setProperty("/isEditMode", true);
                        this.byId("CU_id_Merge").setEnabled(false)
                        this.byId("CU_id_Mail").setEnabled(false)
                    } else {
                        this.getView().getModel("simpleForm").setProperty("/Status", true);
                        oViewModel.setProperty("/isEditMode", true);
                        this.byId("CU_id_Merge").setEnabled(false)
                        this.byId("CU_id_Mail").setEnabled(false)
                    }
                }
            },

          onChangeStartEndDate: function (oEvent) {
            var oModel = this.getView().getModel("oFilteredContractModel");
            var oModelData = oModel.getData();

            var endDate = this.AssignmentEndDate.split('/').map(Number);
            var endDateCreate = new Date(endDate[2], endDate[1] - 1, endDate[0]);

            var today = new Date();

            if (today >= endDateCreate) {
                if (oEvent.getSource().getValue() === "Renewed" && this.OldStatus === "Active") {
                    // Assignment Start = previous end date + 1
                    var oldEndDate = new Date(oModelData.AssignmentEndDate); // This should be a Date
                    var assignmentStart = new Date(oldEndDate);
                    assignmentStart.setDate(assignmentStart.getDate() + 1);

                    // Contract Period in months
                    var oSelect = this.byId("CU_id_WarrantyDate");
                    var sSelectedKey = oSelect.getSelectedKey(); // e.g., "6 Months"
                    var contractPeriod = parseInt(sSelectedKey.split(" ")[0], 10);
                    var assignmentEnd = new Date(assignmentStart);
                    assignmentEnd.setMonth(assignmentEnd.getMonth() + contractPeriod);

                    // Set Date objects directly to model
                    oModel.setProperty("/AssignmentStartDate", assignmentStart);
                    oModel.setProperty("/AssignmentEndDate", assignmentEnd);
                } else {
                    oModel.setProperty("/AssignmentStartDate", this._parseDateString(this.AssignmentStartDate));
                    oModel.setProperty("/AssignmentEndDate", this._parseDateString(this.AssignmentEndDate));
                }

                oModel.refresh(true);
            }
        },

        // Helper to convert "dd/MM/yyyy" to Date object
        _parseDateString: function (sDate) {
            var parts = sDate.split('/').map(Number);
            return new Date(parts[2], parts[1] - 1, parts[0]);
        },

            formatDateToISO: function (dateObj) {
                if (!dateObj || !(dateObj instanceof Date)) return "";
                return dateObj.toISOString().split("T")[0]; // YYYY-MM-DD
            },
            
            onPressSave: async function () {
                const that = this;
                const oView = this.getView();
            
                // Mandatory validation
                const isMandatoryValid = (
                    utils._LCvalidateName(this.byId("CU_id_ConsultantName"), "ID") &&
                    utils._LCvalidateEmail(this.byId("CU_id_ContractEmailID"), "ID") &&
                    utils._LCvalidateDate(this.byId("CU_id_AgreementDate"), "ID") &&
                    utils._LCvalidateMandatoryField(this.byId("CU_id_ContractAddress"), "ID") &&
                    utils._LCvalidateName(this.byId("CU_id_EndClient"), "ID") &&
                    utils._LCstrictValidationComboBox(this.byId("CD_id_contractStatus"), "ID") &&
                    utils._LCvalidateName(this.byId("CU_id_ClientReportContact"), "ID") &&
                    utils._LCvalidateAmount(this.byId("CU_id_EditAmountInput"), "ID") 
                );
            
                if (!isMandatoryValid) {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                }
            
                const oModel = oView.getModel("oFilteredContractModel").getData();
                const AgreementNo = oModel.AgreementNo;
                // const newAgreementNo = (oModel.ContractStatus === 'Renewed') ? (parseInt(AgreementNo) + 1).toString().padStart(2, "0") : AgreementNo;
            
                const rateType = oModel.HrDaliyMonth;
                const rateText = rateType === 0 ? "Hr" : rateType === 1 ? "Day" : "Month";
                const selectedCurrency = this.byId("CU_id_CurrencySelect").getSelectedKey();
                const ConsultantRate = `${oModel.Amount} ${selectedCurrency} Per ${rateText} Including all tax`;
                const LocationService = this.byId("CD_id_contractLocation").getSelectedKey();
                const branchCode = this.byId("CU_id_ContractCity").getSelectedItem().getAdditionalText();
                const startDate = this.byId("CU_id_AssignmentStartDate").getDateValue();
                const endDate = this.byId("CU_id_AssignmentEndDate").getDateValue();
                
            
                const jsonData = {
                    ContractNo: oModel.ContractNo,
                    AgreementNo: oModel.AgreementNo,
                    ConsultantNameSalutation: oModel.ConsultantNameSalutation,
                    ConsultantName: oModel.ConsultantName,
                    ConsultingService: oModel.ConsultingService,
                    ConsultantAddress: oModel.ConsultantAddress,
                    EndClient: oModel.EndClient,
                    LocationService: LocationService,
                    ContractStatus: oModel.ContractStatus,
                    AssignmentStartDate: this.formatDateToISO(startDate),
                    AssignmentEndDate: this.formatDateToISO(endDate),
                    ConsultantRate: ConsultantRate,
                    PaymentTerms: oModel.PaymentTerms,
                    ClientReportContactSalutation: oModel.ClientReportContactSalutation,
                    ClientReportContact: oModel.ClientReportContact,
                    SpecificInsuranceRequirement: oModel.SpecificInsuranceRequirement,
                    ContractPeriod: oModel.ContractPeriod,
                    ExpensesClaim: oModel.ExpensesClaim,
                    AgreementDate: oModel.AgreementDate,
                    ContarctEmail: oModel.ContarctEmail,
                    ContractLocation: oModel.BaseLocation ? oModel.BaseLocation : this.byId("CD_id_ConLocation").getSelectedKey(),
                    Comments: oModel.Comments,
                    BranchCode: branchCode
                };

                // Case 1: Renewed but previous not active
                if (oModel.ContractStatus === "Renewed" && that.OldStatus !== "Active") {
                    oView.getModel("simpleForm").setProperty("/editable", false);
                    oView.getModel("simpleForm").setProperty("/Status", false);
                    oView.getModel("viewModel").setProperty("/isEditMode", false);
                    this.byId("CU_id_Merge").setEnabled(true);
                    this.byId("CU_id_Mail").setEnabled(true);
                    oView.getModel("oFilteredContractModel").setProperty("/ContractStatus", that.OldStatus);
                    this.closeBusyDialog();
                    return sap.m.MessageBox.error(this.i18nModel.getText("contractStatusMessage"));
                }
            
                // ✅ Case 2: Renewed and previous was Active — update old & create new contract
                if (oModel.ContractStatus === "Renewed" && that.OldStatus === "Active") {
                    const endDateArr =(this.AssignmentEndDate).split('/').map(Number);
                    const endDateCreate = new Date(endDateArr[2], endDateArr[1] - 1, endDateArr[0]);
                    const today = new Date();
                    oModel.ContractStatus="Renewed"

                    if (today >= endDateCreate) {
                        delete jsonData.Comments;

                        this.getBusyDialog();

                        try {
                            const oldRequest = {
                                filters: { ContractNo: oModel.ContractNo, AgreementNo: oModel.AgreementNo },
                                data: jsonData
                            };
                           const  createResponse= await this.ajaxUpdateWithJQuery("Contract", oldRequest);

                            if (createResponse.success) {
                              
                                oView.getModel("simpleForm").setProperty("/editable", false);
                                oView.getModel("simpleForm").setProperty("/Status", false);
                                this.closeBusyDialog();

                                sap.m.MessageBox.success(this.i18nModel.getText("createNewContractSuccess"), {
                                    onClose: function () {
                                        that.getRouter().navTo("RouteContract");
                                    }
                                });
                            }
                        } catch (error) {
                            this.closeBusyDialog();
                            sap.m.MessageBox.error(this.i18nModel.getText("createNewContractFailed"));
                        }

                        return; // ✅ Skip update fallback
                    } else {
                        oView.getModel("oFilteredContractModel").setProperty("/ContractStatus", this.ContractStatus);
                        this.closeBusyDialog();
                        return sap.m.MessageBox.error(this.i18nModel.getText("renewEndDateMess"));
                    }
                }

        
                try {
                    this.getBusyDialog();
                    const requestData = { filters: { ContractNo: oModel.ContractNo, AgreementNo: oModel.AgreementNo }, data: jsonData };
                    await this.ajaxUpdateWithJQuery("Contract", requestData);
                    oView.getModel("simpleForm").setProperty("/editable", false);
                    oView.getModel("simpleForm").setProperty("/Status", false);
                    oView.getModel("viewModel").setProperty("/isEditMode", false);
                    this.byId("CU_id_Merge").setEnabled(true);
                    this.byId("CU_id_Mail").setEnabled(true);
                    this.closeBusyDialog();
                    this.getRouter().navTo("RouteContract");
                    sap.m.MessageToast.show(this.i18nModel.getText("agreementUpdatedSuccess"));
                } catch (error) {
                    this.closeBusyDialog();
                    sap.m.MessageToast.show(this.i18nModel.getText("updateContractFailed"));
                }
            },
            
            CUD_commonOpenDialog: function (fragmentName) {
                if (!this.CUD_oDialogMail) {
                    sap.ui.core.Fragment.load({
                        name: fragmentName,
                        controller: this,
                    }).then(function (CUD_oDialogMail) {
                        this.CUD_oDialogMail = CUD_oDialogMail;
                        this.getView().addDependent(this.CUD_oDialogMail);
                        this.CUD_oDialogMail.open();
                    }.bind(this));
                } else {
                    this.CUD_oDialogMail.open();
                }
            },
            CUD_onSendEmail: function () {
                var oContractEmail = this.getView().getModel("oFilteredContractModel").getData().ContarctEmail;
                if (!oContractEmail || oContractEmail.length === 0) {
                    MessageBox.error("To Email is missing");
                    return;
                }
                var oUploaderDataModel = new JSONModel({
                    isEmailValid: true,
                    ToEmail: oContractEmail,
                    CCEmail: this.getView().getModel("CCMailModel").getData()[0].CCEmailId,
                    name: "",
                    mimeType: "",
                    content: "",
                    isFileUploaded: false,
                    button: false
                });
                this.getView().setModel(oUploaderDataModel, "UploaderData");
                this.CUD_commonOpenDialog("sap.kt.com.minihrsolution.fragment.CommonMail");
                this.validateSendButton();
            },
            Mail_onPressClose: function () {
                this.CUD_oDialogMail.destroy();
                this.CUD_oDialogMail = null;
                this.CUD_oDialogMail.close();
            },
            Mail_onUpload: function (oEvent) {
                this.handleFileUpload(
                    oEvent,
                    this,                      // context
                    "UploaderData",            // model name
                    "/attachments",            // path to attachment array
                    "/name",                   // path to comma-separated file names
                    "/isFileUploaded",         // boolean flag path
                    "uploadSuccessfull",       // i18n success key
                    "fileAlreadyUploaded",     // i18n duplicate key
                    "noFileSelected",          // i18n no file selected
                    "fileReadError",           // i18n file read error
                    () => this.validateSendButton()
                );
            },
            validateSendButton: function () {
                const sendBtn = sap.ui.getCore().byId("SendMail_Button");
                const isEmailValid = utils._LCvalidateEmail(sap.ui.getCore().byId("CCMail_TextArea"), "ID");
                const isFileUploaded = this.getView().getModel("UploaderData").getProperty("/isFileUploaded");
                sendBtn.setEnabled(isEmailValid && isFileUploaded);
            },

            Mail_onEmailChange: function () {
                this.validateSendButton(); // Reuse from BaseController
            },
            Mail_onSendEmail: function () {
                var oModel = this.getView().getModel("oFilteredContractModel").getData();
                var oPayload = {
                    "EmployeeName": oModel.ConsultantName,
                    "toEmailID": oModel.ContarctEmail,
                    "CC": sap.ui.getCore().byId("CCMail_TextArea").getValue(),
                    "attachments": this.getView().getModel("UploaderData").getProperty("/attachments"),
                    "Designation": oModel.ConsultingService
                };
                this.getBusyDialog();
                this.ajaxCreateWithJQuery("ContractOfferMail", oPayload).then((oData) => {
                    MessageToast.show(this.i18nModel.getText("emailSuccess"));
                    this.closeBusyDialog();
                }).catch((error) => {
                    MessageToast.show(error.responseText);
                    this.closeBusyDialog();
                });
                this.closeBusyDialog();
                this.Mail_onPressClose();
            },

            //PDF download function
            onPressMerge: async function () {
                this.getBusyDialog();
                var oModel = this.getView().getModel("oFilteredContractModel");
                this.contractPDFgenerate(oModel);
            },

            contractPDFgenerate: async function (input) {
                var oEmpModel = typeof input.getData === "function" ? input.getData() : input;
                await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: oEmpModel.BranchCode });
                await this._fetchCommonData("PDFCondition", "PDFConditionModel", { Type: "Contract" });
                var oPDFModel = this.getView().getModel("PDFData");
                oPDFModel.setProperty("/ContractNo", oEmpModel.ContractNo);
                oPDFModel.setProperty("/AgreementNo", oEmpModel.AgreementNo);
                oPDFModel.setProperty("/ClientName", oEmpModel.ConsultantNameSalutation + " " + oEmpModel.ConsultantName);
                oPDFModel.setProperty("/ClientReportingName", oEmpModel.ClientReportContactSalutation + " " + oEmpModel.ClientReportContact);
                oPDFModel.setProperty("/ClientCompanyAddress", oEmpModel.ConsultantAddress);
                oPDFModel.setProperty("/ClientCompanyName", oEmpModel.EndClient);
                oPDFModel.setProperty("/ConsultingService", oEmpModel.ConsultingService);
                oPDFModel.setProperty("/LocationService", oEmpModel.LocationService);
                oPDFModel.setProperty("/ContractStatus", oEmpModel.ContractStatus);
                oPDFModel.setProperty("/AgreementStartDate", Formatter.formatDate(oEmpModel.AssignmentStartDate));
                oPDFModel.setProperty("/AgreementDate", Formatter.formatDate(oEmpModel.AgreementDate));
                oPDFModel.setProperty("/AgreementEndDate", Formatter.formatDate(oEmpModel.AssignmentEndDate));
                oPDFModel.setProperty("/ConsultantRate", oEmpModel.ConsultantRate);
                oPDFModel.setProperty("/PaymentTerms", oEmpModel.PaymentTerms);
                oPDFModel.setProperty("/SpecificInsuranceRequirement", oEmpModel.SpecificInsuranceRequirement);
                oPDFModel.setProperty("/AgreementDuration", oEmpModel.ContractPeriod);
                oPDFModel.setProperty("/ExpensesClaim", oEmpModel.ExpensesClaim);
                var oPDFConditionModel = this.getView().getModel("PDFConditionModel").getData();
                var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
                if (!oCompanyDetailsModel.companylogo64 && !oCompanyDetailsModel.signature64 && !oCompanyDetailsModel.backgroundLogoBase64 && !oCompanyDetailsModel.emailLogoBase64) {
                    try {
                        const logoBlob = new Blob([new Uint8Array(oCompanyDetailsModel.companylogo?.data)], { type: "image/png" });
                        const signBlob = new Blob([new Uint8Array(oCompanyDetailsModel.signature?.data)], { type: "image/png" });
                        const backgroundBlob = new Blob([new Uint8Array(oCompanyDetailsModel.backgroundLogo?.data)], { type: "image/png" });
                        const emailBlob = new Blob([new Uint8Array(oCompanyDetailsModel.emailLogo?.data)], { type: "image/png" });

                        const [logoBase64, signBase64, backgroundBase64, emailBase64] = await Promise.all([
                            this._convertBLOBToImage(logoBlob),
                            this._convertBLOBToImage(signBlob),
                            this._convertBLOBToImage(backgroundBlob),
                            this._convertBLOBToImage(emailBlob)
                        ]);

                        oCompanyDetailsModel.companylogo64 = logoBase64;
                        oCompanyDetailsModel.signature64 = signBase64;
                        oCompanyDetailsModel.backgroundLogoBase64 = backgroundBase64;
                        oCompanyDetailsModel.emailLogoBase64 = emailBase64;
                    } catch (err) {
                        this.closeBusyDialog();
                        console.error("Image compression failed:", err);
                    }
                }
                if (oCompanyDetailsModel.companylogo64 && oCompanyDetailsModel.signature64) {
                    if (typeof jsPDF !== "undefined" && typeof jsPDF._GenerateContractPDF === "function") {
                        jsPDF._GenerateContractPDF(this, oPDFModel.getData(), oCompanyDetailsModel, oPDFConditionModel);
                        MessageToast.show(this.i18nModel.getText("pdfSucces"));
                    }
                }
            }
        });
    });
