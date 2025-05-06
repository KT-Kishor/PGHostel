sap.ui.define([
    "./BaseController", "../utils/validation", "sap/ui/model/json/JSONModel", "../utils/CommonAgreementPDF", "sap/m/MessageToast",
],
    function (BaseController, utils, JSONModel, jsPDF, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.ContractDetails", {
            onInit: function () {
                this.getRouter().getRoute("RouteContractDetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function (oEvent) {
                this.getBusyDialog(); // Show busy dialog
                this.commonLoginFunction("Contract");
                this._makeDatePickersReadOnly(["CD_id_AgreeDate", "CD_id_Datestart","CD_id_DateEnd"]);
                this._makeDatePickersReadOnly(["CU_id_AgreementDate", "CU_id_AssignmentStartDate","CU_id_AssignmentEndDate"]);
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
                        const response = await this.ajaxReadWithJQuery("Contract", {});
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
            
                        oView.byId('CD_id_ConNo').setValue(newContractNo);
            
                        const oData = {
                            ContractNo: newContractNo,
                            AgreementDate: this.Formatter.formatDate(new Date()),
                            ConsultantName: "",
                            ConsultantAddress: "",
                            ContarctEmail: "",
                            Role: "Contractor",
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
                            WarrantyDate: "3 Months",
                            AdditionalRates: "No",
                            PaymentTerms: "45 Days",
                            Status: "Submitted",
                            Salutation: "Mr.",
                            Salutation2: "Mr.",
                            contractLocation: "Kalaburagi"
                        };
            
                        const oModel = new JSONModel(oData);
                        oView.setModel(oModel, "ContractModelWizart");
            
                        oView.byId("C_id_PageCreate").setVisible(true);
                        oView.byId("CUF_id_pageTrainee").setVisible(false);
            
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
                        var response = await this.ajaxReadWithJQuery("Contract", {ContractNo: this.sArgPara, AgreementNo: AgreementNo});
                
                        var oResult = response.data[0];
                        this.ContractNo = oResult.ContractNo;
                        this.OldStatus = oResult.ContractStatus;
                        this.AssignmentStartDate = oResult.AssignmentStartDate;
                        this.AssignmentEndDate = oResult.AssignmentEndDate;
                        this.ContractStatus = oResult.ContractStatus;
                
                        if (this.ContractStatus !== "Inactive") {
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
                if (oModel && selectedKey) {
                    oModel.setProperty("/ClientReportContact", selectedKey);
                    if (oInput) {
                        oInput.setValueState("None");
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
                utils._LCvalidateDate(oEvent);
                this.validateStep();
            
                let oDatePicker, oDate, oModel;
                if (this.sArgPara === "CreateContractFlag") {
                    oModel = this.getView().getModel("ContractModelWizart");
                    oDatePicker = this.byId("CD_id_Datestart");
                } else {
                    oModel = this.getView().getModel("oFilteredContractModel");
                    oDatePicker = this.byId("CU_id_AssignmentStartDate");
                }
            
                if (oDatePicker && oModel) {
                    const sValue = oDatePicker.getValue(); // Value from DatePicker as string "dd/MM/yyyy"
                    oDate = this.onFormatDate(sValue);     // Convert to Date object
            
                    if (!isNaN(oDate.getTime())) {
                        oModel.setProperty("/MinToDate", oDate); // Set minDate for EndDate
                    }
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
            //back function
            CD_onPressback: function () {
                this.showConfirmationDialog(
                    this.i18nModel.getText("ConfirmActionTitle"),
                    this.i18nModel.getText("backConfirmation"),
                    function () {
                        this.getRouter().navTo("RouteContract");
                    }.bind(this)
                );
                this.byId("CD_id_Secstep").getParent().setShowNextButton(true);
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
                var step1Validated = this.byId("CD_id_AgreeDate").getValue() && this.byId("CD_id_CName").getValue() &&
                    this.byId("CD_id_Address").getValue() && this.byId("CD_id_Email").getValue() &&
                    this.byId("CD_id_Role").getValue() && this.byId("CD_id_Amount").getValue() &&
                    utils._LCvalidateDate(this.byId("CD_id_AgreeDate"), "ID") && utils._LCvalidateName(this.byId("CD_id_CName"), "ID") &&
                    utils._LCvalidateMandatoryField(this.byId("CD_id_Address"), "ID") &&  utils._LCvalidateEmail(this.byId("CD_id_Email"), "ID") && utils._LCvalidateName(this.byId("CD_id_Role"), "ID") &&
                    utils._LCvalidateAmount(this.byId("CD_id_Amount"), "ID");

                var step2Validated = this.byId("CD_id_HiringContact").getValue() && this.byId("CD_id_Datestart").getValue() && this.byId("CD_id_DateEnd").getValue() &&
                utils._LCvalidateName(this.byId("CD_id_HiringContact"), "ID") && utils._LCvalidateDate(this.byId("CD_id_Datestart"), "ID") && utils._LCvalidateDate(this.byId("CD_id_DateEnd"), "ID") && utils._LCvalidateName(this.byId("CD_id_EndClientHirer"), "ID") && utils._LCvalidateName(this.byId("CD_id_HiringContact"), "ID") && utils._LCvalidateDate(this.byId("CD_id_Datestart"), "ID") && utils._LCvalidateDate(this.byId("CD_id_DateEnd"), "ID") &&
                utils._LCvalidateMandatoryField(this.byId("CD_id_ConLocation"), "ID")

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
                    var selectedCurrency = this.byId("CD_id_Currency").getSelectedKey();
            
                    var data = {
                        "ContractNo": oModel.oData.ContractNo,
                        "ConsultantNameSalutation": oModel.oData.Salutation,
                        "ConsultantName": oModel.oData.ConsultantName,
                        "ConsultantAddress": oModel.oData.ConsultantAddress,
                        "EndClient": oModel.oData.EndClientHirer,
                        "ConsultingService": oModel.oData.Role,
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
                        "ContractLocation": oModel.oData.contractLocation,
                        "AgreementNo": String(1).padStart(2, '0')
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
                                    this.onGeneratePDF();
                                }.bind(this)
                            }),
                            afterClose: function () {
                                oDialog.destroy();
                            }
                        });
            
                        oDialog.open();
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
                var oModel = this.getView().getModel("oFilteredContractModel")
                var oModelData = oModel.getData();
                var endDate = this.Formatter.formatDate(this.AssignmentEndDate).split('/').map(Number);
                var endDateCreate = new Date(endDate[2], endDate[1] - 1, endDate[0]);
                var today = new Date();
                if (today >= endDateCreate) {
                  if (oEvent.getSource().getValue() === "Renewed" && this.OldStatus === "Active") {
                    var assignmentStart = this.Formatter.formatDate(oModelData.AssignmentEndDate);
                    var assignmentStart = new Date(assignmentStart.split('/')[2], assignmentStart.split('/')[1] - 1, assignmentStart.split('/')[0], 10);
                    assignmentStart.setDate(assignmentStart.getDate() + 1);
                    oModel.setProperty("/AssignmentStartDate", this.Formatter.formatDate(assignmentStart));
          
                    var assignmentEndDate =assignmentStart;
                    var contractPeriod = parseInt(oModelData.ContractPeriod.split(" ")[0]);
                    assignmentEndDate.setMonth(assignmentEndDate.getMonth() + contractPeriod);
                    var incrementedDate = assignmentEndDate.toISOString().split('T')[0];
                    oModel.setProperty("/AssignmentEndDate", this.Formatter.formatDate(incrementedDate))
                  } else {
                    oModel.setProperty("/AssignmentStartDate", this.Formatter.formatDate(this.AssignmentStartDate));
                    oModel.setProperty("/AssignmentEndDate", this.Formatter.formatDate(this.AssignmentEndDate))
                  }
                }
              },

              onPressSave: async function () {
                const that = this;
                const oView = this.getView();
    
                // Mandatory validation
                const isMandatoryValid = (
                    utils._LCvalidateName(this.byId("CU_id_ConsultantName"), "ID") &&
                    utils._LCvalidateName(this.byId("CU_id_ConsultingService"), "ID") &&
                    utils._LCvalidateEmail(this.byId("CU_id_ContractEmailID"), "ID") &&
                    utils._LCvalidateDate(this.byId("CU_id_AgreementDate"), "ID") &&
                    utils._LCvalidateMandatoryField(this.byId("CU_id_ContractAddress"), "ID") &&
                    utils._LCvalidateName(this.byId("CU_id_EndClient"), "ID") &&
                    utils._LCstrictValidationComboBox(this.byId("CD_id_contractStatus"), "ID") &&
                    utils._LCvalidateName(this.byId("CU_id_ClientReportContact"), "ID") &&
                    utils._LCvalidateDate(this.byId("CU_id_AssignmentStartDate"), "ID") &&
                    utils._LCvalidateDate(this.byId("CU_id_AssignmentEndDate"), "ID") &&
                    utils._LCvalidateAmount(this.byId("CU_id_EditAmountInput"), "ID") &&
                    utils._LCstrictValidationComboBox(this.byId("CU_id_ContractCity"), "ID")
                );
            
                if (!isMandatoryValid) {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                }
            
                const oModel = oView.getModel("oFilteredContractModel").getData();
                const AgreementNo = oModel.AgreementNo;
                const isRenewed = oModel.ContractStatus === 'Renewed';
                const newAgreementNo = isRenewed ? String(parseInt(AgreementNo) + 1).padStart(2, "0") : AgreementNo;
            
                const rateType = oModel.HrDaliyMonth;
                const rateText = rateType === 0 ? "Hr" : rateType === 1 ? "Day" : "Month";
                const selectedCurrency = this.byId("CU_id_CurrencySelect").getSelectedKey();
                const ConsultantRate = `${oModel.Amount} ${selectedCurrency} Per ${rateText} Including all tax`;                
                const LocationService = this.byId("CD_id_contractLocation").getSelectedKey();
            
                const jsonData = {
                    ContractNo: oModel.ContractNo,
                    AgreementNo: newAgreementNo,
                    ConsultantNameSalutation: oModel.ConsultantNameSalutation,
                    ConsultantName: oModel.ConsultantName,
                    ConsultingService: oModel.ConsultingService,
                    ConsultantAddress: oModel.ConsultantAddress,
                    EndClient: oModel.EndClient,
                    LocationService: LocationService,
                    ContractStatus: isRenewed ? 'New' : oModel.ContractStatus,
                    AssignmentStartDate: oModel.AssignmentStartDate.split("/").reverse().join("-"),
                    AssignmentEndDate: oModel.AssignmentEndDate.split("/").reverse().join("-"),
                    ConsultantRate: ConsultantRate,
                    PaymentTerms: oModel.PaymentTerms,
                    ClientReportContactSalutation: oModel.ClientReportContactSalutation,
                    ClientReportContact: oModel.ClientReportContact,
                    SpecificInsuranceRequirement: oModel.SpecificInsuranceRequirement,
                    ContractPeriod: oModel.ContractPeriod,
                    ExpensesClaim: oModel.ExpensesClaim,
                    AgreementDate: oModel.AgreementDate,
                    ContarctEmail: oModel.ContarctEmail,
                    ContractLocation: oModel.ContractLocation,
                    Comments: oModel.Comments
                };
            
                const oldContractData = { ContractStatus: "Inactive" };
                this.getBusyDialog(); // Show busy dialog
            
                // 1. Case: Renewed but previous not active
                if (isRenewed && that.OldStatus !== "Active") {
                    oView.getModel("simpleForm").setProperty("/editable", false);
                    oView.getModel("simpleForm").setProperty("/Status", false);
                    oView.getModel("viewModel").setProperty("/isEditMode", false);
                    this.byId("CU_id_Merge").setEnabled(true);
                    this.byId("CU_id_Mail").setEnabled(true);
                    this.closeBusyDialog();
                    return sap.m.MessageBox.error(this.i18nModel.getText("contractStatusMessage"));
                }
            
                // 2. Case: Renewed and previous was active
                if (isRenewed && that.OldStatus === "Active") {
                    const endDateArr = this.Formatter.formatDate(this.AssignmentEndDate).split('/').map(Number);
                    const endDateCreate = new Date(endDateArr[2], endDateArr[1] - 1, endDateArr[0]);
                    const today = new Date();
            
                    if (today >= endDateCreate) {
                        delete jsonData.Comments;
            
                        try {
                            const createResponse = await this.ajaxCreateWithJQuery("Contract", { data: jsonData });
                            if (createResponse.success) {
                                var requestData = { filters: { ContractNo: oModel.ContractNo, AgreementNo: AgreementNo }, data: oldContractData };

                                await this.ajaxUpdateWithJQuery("Contract", requestData);
            
                                oView.getModel("simpleForm").setProperty("/editable", false);
                                oView.getModel("simpleForm").setProperty("/Status", false);
                                this.closeBusyDialog();
            
                                sap.m.MessageBox.success(this.i18nModel.getText("createNewContractSuccess"), {
                                    onClose: function () {
                                        that.getRouter().navTo("RouteContractDetails");
                                    }
                                });
                            }
                        } catch (error) {
                            this.closeBusyDialog();
                            sap.m.MessageBox.error(this.i18nModel.getText("createNewContractFailed"));
                        }
            
                    } else {
                        this.closeBusyDialog();
                        oView.getModel("oFilteredContractModel").setProperty("/ContractStatus", this.ContractStatus);
                        sap.m.MessageBox.error(this.i18nModel.getText("renewEndDateMess"));
                    }
                    return;
                }
                try {
                    const requestData = {filters: {ContractNo: oModel.ContractNo, AgreementNo: AgreementNo}, data: jsonData};
                    await this.ajaxUpdateWithJQuery("Contract", requestData);
                    oView.getModel("simpleForm").setProperty("/editable", false);
                    oView.getModel("simpleForm").setProperty("/Status", false);
                    oView.getModel("viewModel").setProperty("/isEditMode", false);
                    this.byId("CU_id_Merge").setEnabled(true);
                    this.byId("CU_id_Mail").setEnabled(true);
                    this.closeBusyDialog();
                    this.getRouter().navTo("RouteContractDetails", {
                        sParContract: oModel.ContractNo ,
                        sID: oModel.AgreementNo
                    });
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
                this.Mail_onPressClose();
            },

            onPressMerge: async function () {
                var oEmpModel = this.getView().getModel("oFilteredContractModel").getData();
                await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: oEmpModel.BranchCode });
                await this._fetchCommonData("PDFCondition", "PDFConditionModel", { Type: "Contract" });
                var oPDFModel = this.getView().getModel("PDFData");
                var oPDFConditionModel = this.getView().getModel("PDFConditionModel").getData();
                var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
                if (!oCompanyDetailsModel || !oCompanyDetailsModel.companylogo) {
                    MessageToast.show("Company not found on selected branch. Please check and try again.");
                    return;
                }
                if (!oCompanyDetailsModel.companylogo64 && !oCompanyDetailsModel.signature64 && !oCompanyDetailsModel.backgroundLogoBase64 && !oCompanyDetailsModel.emailLogoBase64) {
                    var logoBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.companylogo?.data);
                    var signBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.signature?.data);
                    var backgroundLogoBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.backgroundLogo?.data);
                    var emailLogoBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.companyEmailLogo?.data);
                    if (logoBase64 && signBase64 && backgroundLogoBase64 && emailLogoBase64) {
                        oCompanyDetailsModel.backgroundLogoBase64 = "data:image/png;base64," + backgroundLogoBase64;
                        oCompanyDetailsModel.emailLogoBase64 = "data:image/png;base64," + emailLogoBase64;
                        oCompanyDetailsModel.companylogo64 = "data:image/png;base64," + logoBase64;
                        oCompanyDetailsModel.signature64 = "data:image/png;base64," + signBase64;
                    }
                }
                if (oCompanyDetailsModel.companylogo64 && oCompanyDetailsModel.signature64) {
                    if (typeof jsPDF !== "undefined" && typeof jsPDF._GenerateContractPDF === "function") {
                        jsPDF._GenerateContractPDF(oPDFModel.getData(), oCompanyDetailsModel, oPDFConditionModel);
                        MessageToast.show(this.i18nModel.getText("pdfSucces"));
                    }
                }
            }
        });
    });
