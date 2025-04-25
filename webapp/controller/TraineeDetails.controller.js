sap.ui.define([
    "./BaseController",//calling base controller
    "../utils/validation", //calling validation function
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../model/formatter",
    "../utils/CommonJsPDF",
    "sap/ui/core/BusyIndicator"],
    function (BaseController, utils, JSONModel, MessageToast, Formatter, jsPDF, BusyIndicator) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.TraineeDetails", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteTraineeDetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function (oEvent) {
                BusyIndicator.show(0)
                this.commonLoginFunction("Trainee");
                this.checkLoginModel();
                this.byId("TD_id_JoiningDate").setMinDate(new Date());
                await this._fetchCommonData("Currency", "CurrencyModel");
                await this._fetchCommonData("CompanyEmails", "CCMailModel", { applicationName: "Trainee" });//CC mailId read call
                await this._fetchCommonData("BaseLocation", "BaseLocationModel");
                await this._fetchCommonData("EmployeeDetailsData", "empModel");
                this.sArgPara = oEvent.getParameter("arguments").sParTrainee;
                this.byId("TD_id_Wizard").getSteps()[0].setValidated(false);
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.T_onResetWizard();
                var jsonData = {
                    "NameSalutation": "Mr.",
                    "TraineeName": "",
                    "ReportingManagerSalutation": "Mr.",
                    "ReportingManager": "",
                    "Stipend": "",
                    "TrainingPaidAmount": "",
                    "TrainingAmountCurrency": "",
                    "ReleaseDate": this.Formatter.formatDate(new Date()),
                    "JoiningDate": "",
                    "TraineeEmail": "",
                    "Currency": "",
                    "TrainingDuration": "",
                    "BaseLocation": ""
                };
                this.getView().setModel(new JSONModel(jsonData), "oTraineeDetails");
                var oViewModel = new JSONModel({ isEditMode: true, isVisiable: true, editable: false, isCTCVisible: false });
                this.getView().setModel(oViewModel, "viewModel");
                this.viewModel = this.getView().getModel("viewModel");
                ["TD_id_Name", "TD_id_ReportingManager", "TD_id_EmailID", "TD_id_Stipend", "TD_id_PaidTraineeAmount", "TD_id_JoiningDate", "TD_id_ReleaseDate",
                    "TU_id_Name", "TU_id_Manager", "TU_id_TraineeMail", "TU_id_JoinDate", "TU_id_Stipend"].forEach(function (ids) {
                        this.getView().byId(ids).setValueState("None");
                    }.bind(this));
                if (this.sArgPara === "CreateTraineeFlag") {
                    this.getView().byId("TD_id_PageCreate").setVisible(true);
                    this.getView().byId("TUF_id_pageTrainee").setVisible(false);
                    this.T_onResetWizard();
                } else {
                    this.getView().byId("TD_id_PageCreate").setVisible(false);
                    this.getView().byId("TUF_id_pageTrainee").setVisible(true);

                    this.getModelData(this.sArgPara);
                }
                this._makeDatePickersReadOnly(["TD_id_JoiningDate", "TD_id_ReleaseDate", "TU_id_JoinDate", "TU_id_RelDate"]); //make date pickers read only
                this.getView().byId("TD_id_Submit").setEnabled(false);
                BusyIndicator.hide();
                this._setInitialValues();
            },
            //for edit case reading data from model
            getModelData: function (sArgPara) {
                var oModel = this.getOwnerComponent().getModel("traineeModel");
                var aFilteredData = oModel.getData().filter(function (oTrainee) {
                    return oTrainee.ID === sArgPara;
                });
                if (aFilteredData.length > 0) {
                    var traineeData = aFilteredData[0];
                    this.byId("TU_id_JoinDate").setMinDate(new Date(traineeData.ReleaseDate));
                    this.getView().setModel(new JSONModel(traineeData), "oTraineeDetails");
                    if (traineeData.Stipend === "0") { // Stipend condition (NO)
                        this.byId("TU_id_StipendRadio").setSelectedIndex(1);
                        this.byId("TU_id_Stipend").setVisible(false);
                        this.byId("TU_id_StipendLabel").setVisible(false);
                        this.byId("TU_id_Currency").setVisible(false);
                    } else { // Stipend condition (YES)
                        this.byId("TU_id_StipendRadio").setSelectedIndex(0);
                        this.byId("TU_id_Stipend").setVisible(true)
                        this.byId("TU_id_StipendLabel").setVisible(true);
                        this.byId("TU_id_Currency").setVisible(true);
                    }
                    if (traineeData.TrainingPaidAmount === "0") { // Paid Trainee condition (NO)
                        this.byId("TU_id_PaidTraineeRadio").setSelectedIndex(1);
                        this.byId("TU_id_PaidTraineeAmount").setVisible(false); // Hide Paid Amount field if Paid Trainee is NO
                        this.byId("TU_id_FeeCurrency").setVisible(false);
                        this.byId("TU_id_StipendLabel").setVisible(true);
                        this.byId("TU_id_PaidTraineeAmount").setValue("0"); // Reset Paid Amount value to 0
                    } else { // Paid Trainee condition (YES)
                        this.byId("TU_id_PaidTraineeRadio").setSelectedIndex(0);
                        this.byId("TU_id_PaidTraineeAmount").setVisible(true);
                        this.byId("TU_id_FeeCurrency").setVisible(true);
                        this.byId("TU_id_PaidTraineeLabel").setVisible(true);
                        this.byId("TU_id_PaidTraineeAmount").setValue(traineeData.TrainingPaidAmount); // Set Paid Amount value if present
                    }
                    // Handle visibility and edit button based on trainee status
                    if (traineeData.Status === "OnBoarded" || traineeData.Status === "Training Completed") {
                        this.viewModel.setProperty("/isVisiable", false);
                        this.viewModel.setProperty("/editBut", false);
                    } else if (traineeData.Status === "Rejected") {
                        this.viewModel.setProperty("/isVisiable", false);
                        this.viewModel.setProperty("/editBut", true);
                    } else if (traineeData.Status === "Submitted") {
                        this.viewModel.setProperty("/isVisiable", true);
                        this.viewModel.setProperty("/editBut", true);
                    }
                } else {
                    MessageBox.error(this.i18nModel.getText("commonErrorMessage"));
                }
            },

            //navigation to trainee view
            TUF_onPressback: function () {
                this.getRouter().navTo("RouteTrainee", { value: "TraineeDetails" });
            },
            // Reset wizard to initial state
            T_onResetWizard: function () {
                var oWizard = this.getView().byId("TD_id_Wizard");
                oWizard.discardProgress(oWizard.getSteps()[0]); // Discard progress 
                oWizard.goToStep(oWizard.getSteps()[0]); // Go to the first step
                this.byId("TD_id_StepTwo").getParent().setShowNextButton(true);
            },
            //validate name function
            TD_validateName: function (oEvent) {
                utils._LCvalidateName(oEvent);
                this.TD_validateStep();
            },
            TD_validateCombo: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
                this.TD_validateStep();
            },
            //validate email function
            TD_validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
                this.TD_validateStep();
            },
            //validate amount function
            TD_validateAmount: function (oEvent) {
                utils._LCvalidateAmount(oEvent);
                this.TD_validateStep();
            },
            //validate date function
            TD_validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent); // Base validation
                this.TD_validateStep(); // Step validation
                var oOfferDateId = oEvent.getSource().getId().split("--")[2];
                var releaseDate, joinDateVa;
                if (oOfferDateId === "TD_id_ReleaseDate" || oOfferDateId === "TU_id_RelDate") {
                    joinDateVa = oOfferDateId === "TD_id_ReleaseDate" ? "TD_id_JoiningDate" : "TU_id_JoinDate";
                    releaseDate = oEvent.getSource().getDateValue();
                    if (releaseDate) {
                        var oJoinDatePicker = this.byId(joinDateVa);
                        var joinDate = oJoinDatePicker.getDateValue();
                        oJoinDatePicker.setMinDate(releaseDate);
                        if (joinDate && joinDate < releaseDate) {
                            oJoinDatePicker.setValue("");
                            oJoinDatePicker.setValueState("Error");
                        } else {
                            oJoinDatePicker.setValueState("None");
                        }
                    }
                }
            },
            //wizard step validation function
            TD_validateStep: function () {
                var oModel = this.getView().getModel("oTraineeDetails").getData();
                oModel.Currency = this.getView().byId("TD_id_Currency").getSelectedKey();
                oModel.TrainingAmountCurrency = this.byId("TD_id_FeeCurrency").getSelectedKey();
                oModel.BaseLocation = this.getView().byId("TD_id_Location").getSelectedKey();
                oModel.TrainingDuration = this.getView().byId("TD_id_TDuration").getSelectedKey();

                var sStipendText = this.getView().byId("TD_id_StipendRadio").getSelectedButton().getText();
                var sPaidTraineeText = this.getView().byId("TD_id_PaidTraineeRadio").getSelectedButton().getText();

                var allFieldsFilled = oModel.TraineeName && oModel.ReportingManager && oModel.TraineeEmail &&
                    oModel.TrainingDuration && oModel.ReleaseDate && oModel.JoiningDate &&
                    (sStipendText === "NO" || (oModel.Stipend && oModel.Currency)) &&
                    oModel.BaseLocation;
                if (allFieldsFilled) {
                    let bValid =
                        utils._LCvalidateName(this.getView().byId("TD_id_Name"), "ID") &&
                        utils._LCstrictValidationComboBox(this.getView().byId("TD_id_ReportingManager"), "ID") &&
                        utils._LCvalidateEmail(this.getView().byId("TD_id_EmailID"), "ID") &&
                        utils._LCvalidateDate(this.getView().byId("TD_id_ReleaseDate"), "ID") &&
                        utils._LCvalidateDate(this.getView().byId("TD_id_JoiningDate"), "ID");
                    if (sStipendText === "YES") {
                        bValid = bValid && utils._LCvalidateAmount(this.getView().byId("TD_id_Stipend"), "ID");
                    }
                    if (sPaidTraineeText === "YES") {
                        bValid = bValid && utils._LCvalidateAmount(this.getView().byId("TD_id_PaidTraineeAmount"), "ID");
                    }
                    this.getView().byId("TD_id_Wizard").getSteps()[0].setValidated(bValid);
                } else {
                    this.getView().byId("TD_id_Wizard").getSteps()[0].setValidated(false);
                    this.getView().byId("TD_id_StepOne").getAggregation("_nextButton").setText(this.i18nModel.getText("review"));
                }
            },

            //Submit trainee deatails 
            TD_onSubmitData: function (oEvent) {
                var oModel = this.getView().getModel("oTraineeDetails").getData();
                var sStipendText = this.getView().byId("TD_id_StipendRadio").getSelectedButton().getText();
                var sPaidTraineeText = this.getView().byId("TD_id_PaidTraineeRadio").getSelectedButton().getText();
                var bValid =
                    utils._LCvalidateName(this.getView().byId("TD_id_Name"), "ID") &&
                    utils._LCstrictValidationComboBox(this.getView().byId("TD_id_ReportingManager"), "ID") &&
                    utils._LCvalidateEmail(this.getView().byId("TD_id_EmailID"), "ID") &&
                    utils._LCvalidateDate(this.getView().byId("TD_id_ReleaseDate"), "ID") &&
                    utils._LCvalidateDate(this.getView().byId("TD_id_JoiningDate"), "ID");
                if (sStipendText === "YES") {
                    bValid = bValid && utils._LCvalidateAmount(this.getView().byId("TD_id_Stipend"), "ID");
                }
                if (sPaidTraineeText === "YES") {
                    bValid = bValid && utils._LCvalidateAmount(this.getView().byId("TD_id_PaidTraineeAmount"), "ID");
                }
                if (bValid) {
                    oModel.Currency = this.byId("TD_id_Currency").getSelectedKey();
                    oModel.TrainingAmountCurrency = this.byId("TD_id_FeeCurrency").getSelectedKey();
                    oModel.BranchCode = this.getView().byId("TD_id_Location").getSelectedItem().getAdditionalText();
                    oModel.ManagerID = this.getView().byId("TD_id_ReportingManager").getSelectedItem().getAdditionalText();
                    oModel.BaseLocation = oModel.BaseLocation !== "" ? oModel.BaseLocation : this.getView().byId("TD_id_Location").getSelectedKey();
                    oModel.Status = "Submitted";
                    oModel.ReleaseDate = oModel.ReleaseDate.split("/").reverse().join('-');
                    oModel.JoiningDate = oModel.JoiningDate.split("/").reverse().join('-');
                    var oPayload = {
                        "tableName": "Trainee",
                        "data": oModel
                    };
                    this.ajaxCreateWithJQuery("Trainee", oPayload, ["TD_id_Wizard"]).then((oData) => {
                        if (oData.success) {
                            var oDialog = new sap.m.Dialog({
                                title: this.i18nModel.getText("success"),
                                type: sap.m.DialogType.Message,
                                state: sap.ui.core.ValueState.Success,
                                content: new sap.m.Text({ text: this.i18nModel.getText("traineeDataSubmitted") }),
                                beginButton: new sap.m.Button({
                                    text: "OK",
                                    type: "Accept",
                                    press: function () {
                                        oDialog.close();
                                        this.getView().byId("TD_id_StepTwo").getParent().setShowNextButton(true);
                                        this.getRouter().navTo("RouteTrainee", { value: "Trainee" });
                                        this.getView().getModel("oTraineeDetails").refresh(true);
                                    }.bind(this)
                                }),
                                endButton: new sap.m.Button({
                                    text: "Generate PDF",
                                    type: "Reject",
                                    press: function () {
                                        this.TD_onPressMerge("create");
                                        var oUpdatePayload = {
                                            data: { Status: "New" },
                                            filters: { ID: oData.ID }
                                        };
                                        this.ajaxUpdateWithJQuery("Trainee", oUpdatePayload, ["TD_id_Wizard"]).then((oData) => {
                                            BusyIndicator.hide();
                                            if (oData.success) {
                                                MessageToast.show(this.i18nModel.getText("pdfSucces"));
                                                oDialog.close();
                                                this.getView().byId("TD_id_StepTwo").getParent().setShowNextButton(true);
                                                this.getRouter().navTo("RouteTrainee", { value: "Trainee" });
                                                this.getView().getModel("oTraineeDetails").refresh(true);
                                            }
                                        }).catch((error) => {
                                            MessageToast.show(error.message || error.responseText);
                                        });
                                    }.bind(this)
                                }),
                                afterClose: function () {
                                    oDialog.destroy();
                                }
                            });
                            oDialog.open();
                        }
                    }).catch((error) => {
                        BusyIndicator.hide();
                        MessageToast.show(error.message || error.responseText);
                    });
                } else {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            },

            //second step validation function
            TD_StepTwo: function () {
                this.getView().byId("TD_id_Submit").setEnabled(true);
                this.byId("TD_id_StepTwo").getParent().setShowNextButton(false);
            },
            //Edit/save button visibility function
            TU_onEditOrSavePress: function () {
                if (this.viewModel.getProperty("/editable")) {
                    var oView = this.getView();
                    // Get stipend radio selection
                    var sStipendSelectedText = oView.byId("TU_id_StipendRadio").getSelectedButton().getText();
                    var bIsStipendValid = true;
                    if (sStipendSelectedText === "YES") {
                        bIsStipendValid = utils._LCvalidateAmount(oView.byId("TU_id_Stipend"), "ID");
                    }
                    // Get paid trainee radio selection
                    var sPaidTraineeSelectedText = oView.byId("TU_id_PaidTraineeRadio").getSelectedButton().getText();
                    var bIsPaidAmountValid = true;

                    if (sPaidTraineeSelectedText === "YES") {
                        bIsPaidAmountValid = utils._LCvalidateAmount(oView.byId("TU_id_PaidTraineeAmount"), "ID");
                    }
                    // Combine all validations
                    var isValid =
                        utils._LCvalidateName(oView.byId("TU_id_Name"), "ID") &&
                        utils._LCstrictValidationComboBox(oView.byId("TU_id_Manager"), "ID") &&
                        utils._LCvalidateEmail(oView.byId("TU_id_TraineeMail"), "ID") &&
                        bIsStipendValid &&
                        bIsPaidAmountValid;
                    if (isValid) {
                        this.updateCallForTrainee(this.viewModel, "traineeDataUpdated");
                    } else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                } else {
                    this.viewModel.setProperty("/editable", true);
                    this.viewModel.setProperty("/isEditMode", false);
                }
            },

            //Update trainee deatails 
            updateCallForTrainee: function (oViewModel, text) {
                var oModel = this.getView().getModel("oTraineeDetails").getData();
                oModel.BranchCode = this.getView().byId("TU_id_Location").getSelectedItem().getAdditionalText();
                oModel.ManagerID = this.getView().byId("TU_id_Manager").getSelectedKey();
                oModel.ReleaseDate = this.byId("TU_id_RelDate").getValue().split("/").reverse().join("-");;
                oModel.JoiningDate = this.byId("TU_id_JoinDate").getValue().split("/").reverse().join("-");
                // Check and update the status if it is 'Rejected'
                if (oModel.Status === "Rejected") {
                    oModel.Status = "Submitted";
                }
                oModel.TrainingDuration = this.byId("TU_id_TDuration").getSelectedKey();
                oModel = {
                    "data": oModel,
                    "filters": {
                        "ID": this.sArgPara
                    }
                };
                // AJAX call for updating the data
                this.ajaxUpdateWithJQuery("Trainee", oModel, ["TU_id_SimpleForm"]).then((oData) => {
                    if (oData.success) {
                        oViewModel.setProperty("/editable", false);
                        oViewModel.setProperty("/isEditMode", true);
                        oViewModel.setProperty("/isVisiable", true);
                        oViewModel.setProperty("editBut", true);
                        BusyIndicator.hide();
                        if (text && text !== "silent") {
                            MessageToast.show(this.i18nModel.getText(text));
                        }
                        this.getView().getModel("oTraineeDetails").refresh(true);
                    }
                }).catch((error) => {
                    BusyIndicator.hide();
                    MessageToast.show(error.message || error.responseText);
                });
            },
            // common function for opening dialog
            TD_commonOpenDialog: function (fragmentName) {
                BusyIndicator.show(0)
                if (!this.TU_oDialogMail) {
                    sap.ui.core.Fragment.load({
                        name: fragmentName,
                        controller: this,
                    }).then(function (TU_oDialogMail) {
                        this.TU_oDialogMail = TU_oDialogMail;
                        this.getView().addDependent(this.TU_oDialogMail);
                        this.TU_oDialogMail.open();
                        BusyIndicator.hide()
                    }.bind(this));
                } else {
                    this.TU_oDialogMail.open();
                    BusyIndicator.hide()
                }
            },
            //Mail dialog open function
            TU_onSendEmail: function () {
                var oTraineeEmail = this.getView().getModel("oTraineeDetails").getData().TraineeEmail;
                if (!oTraineeEmail || oTraineeEmail.length === 0) {
                    MessageBox.error("To Email is missing");
                    return;
                }
                var oUploaderDataModel = new JSONModel({
                    isEmailValid: true,
                    ToEmail: oTraineeEmail,
                    CCEmail: this.getView().getModel("CCMailModel").getData()[0].emails,
                    name: "",
                    mimeType: "",
                    content: "",
                    isFileUploaded: false,
                    button: false
                });
                this.getView().setModel(oUploaderDataModel, "UploaderData");
                this.TD_commonOpenDialog("sap.kt.com.minihrsolution.fragment.CommonMail");
                this.validateSendButton();
            },
            //back function
            TD_onPressback: function () {
                this.showConfirmationDialog(
                    this.i18nModel.getText("ConfirmActionTitle"),
                    this.i18nModel.getText("backConfirmation"),
                    function () {
                        this.getRouter().navTo("RouteTrainee", { value: "TraineeDetails" });
                    }.bind(this)
                );
                this.byId("TD_id_StepTwo").getParent().setShowNextButton(true);
            },
            //  Mail dialog close function    
            Mail_onPressClose: function () {
                this.TU_oDialogMail.destroy();
                this.TU_oDialogMail = null;
                this.TU_oDialogMail.close();
            },
            //File upload function
            Mail_onUpload: function (oEvent) {
                this.handleFileUpload(oEvent, this, "UploaderData", "/attachments", "/name", "/isFileUploaded", "uploadSuccessfull", "fileAlreadyUploaded", "noFileSelected", "fileReadError",
                    () => this.validateSendButton());
            },
            //validate button function
            validateSendButton: function () {
                const sendBtn = sap.ui.getCore().byId("SendMail_Button");
                const isEmailValid = utils._LCvalidateEmail(sap.ui.getCore().byId("CCMail_TextArea"), "ID");
                const isFileUploaded = this.getView().getModel("UploaderData").getProperty("/isFileUploaded");
                sendBtn.setEnabled(isEmailValid && isFileUploaded);
            },
            //mail id change function
            Mail_onEmailChange: function () {
                this.validateSendButton();
            },
            //mail send function
            Mail_onSendEmail: function () {
                var oModel = this.getView().getModel("oTraineeDetails").getData();
                var oPayload = {
                    "TraineeName": oModel.TraineeName,
                    "toEmailID": oModel.TraineeEmail,
                    "JoiningDate": Formatter.formatDate(oModel.JoiningDate),
                    "CC": this.getView().getModel("CCMailModel").getData()[0].emails,
                    "attachments": this.getView().getModel("UploaderData").getProperty("/attachments"),
                };
                this.ajaxCreateWithJQuery("TraineeOfferEmail", oPayload, ["Mail_id_Form", "TU_id_SimpleForm"]).then((oData) => {
                    this.getView().getModel("oTraineeDetails").setProperty("/Status", "Offer Sent");
                    MessageToast.show(this.i18nModel.getText("emailSuccess"));
                    this.updateCallForTrainee(this.viewModel, "silent");
                }).catch((error) => {
                    MessageToast.show(error.message || error.responseText);
                });
                this.Mail_onPressClose();
            },
            //PDF generation function
            TD_onPressMerge: function (value) {
                var oModel = this.getView().getModel("oTraineeDetails");
                this.offerGeneratingPdfFunction(oModel);
                this.getView().getModel("oTraineeDetails").setProperty("/Status", "New");
                if (value !== "create") {
                    this.updateCallForTrainee(this.viewModel, "silent");
                }
                MessageToast.show(this.i18nModel.getText("pdfSucces"));
                this.getView().getModel("oTraineeDetails").refresh(true);
            },
            async offerGeneratingPdfFunction(oModel) {
                BusyIndicator.show(0);
                var oEmpModel = oModel.getData();
                await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: oEmpModel.BranchCode });
                await this._fetchCommonData("PDFCondition", "PDFConditionModel", { Type: "TraineeOffer" });
                var oPDFModel = this.getView().getModel("PDFData");
                oPDFModel.setProperty("/Type", "TraineeOffer");
                oPDFModel.setProperty("/EmpName", oEmpModel.NameSalutation + " " + oEmpModel.TraineeName);
                oPDFModel.setProperty("/EmpRole", "Trainee");
                oPDFModel.setProperty("/CreateDate", Formatter.formatDate(oEmpModel.ReleaseDate));
                oPDFModel.setProperty("/TrainingStartDate", Formatter.formatDate(oEmpModel.JoiningDate));
                oPDFModel.setProperty("/ReportingManager", oEmpModel.ReportingManagerSalutation + " " + oEmpModel.ReportingManager);
                oPDFModel.setProperty("/Stipend", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.Stipend));
                oPDFModel.setProperty("/TrainingFees", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.TrainingPaidAmount));
                oPDFModel.setProperty("/StipendSkipLine", (oEmpModel.Stipend == 0 || oEmpModel.Stipend == "") ? 5 : null);
                oPDFModel.setProperty("/TrainingFeesSkipLine", (oEmpModel.TrainingPaidAmount == 0 || oEmpModel.TrainingPaidAmount == "") ? 6 : null);
                var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
                var oPDFConditionModel = this.getView().getModel("PDFConditionModel").getData();
                if (!oCompanyDetailsModel || !oCompanyDetailsModel.companylogo) {
                    BusyIndicator.hide();
                    MessageToast.show("Company not found on selected branch. Please check and try again.");
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
                        BusyIndicator.show(0);
                        jsPDF._GeneratePDF(oPDFModel.getData(), oCompanyDetailsModel, oPDFConditionModel);
                    } else {
                        BusyIndicator.hide();
                    }
                }
            },
            handleStipendSelection: function (sSelectedText, sStipendId, sCurrencyId, sModelName, sCurrencyPath) {
                var oModel = this.getView().getModel(sModelName || "oTraineeDetails");
                if (sSelectedText === "NO") {
                    this.getView().byId(sStipendId).setVisible(false);
                    this.getView().byId(sCurrencyId).setVisible(false);
                    this.getView().byId(sStipendId).setValue("0");
                    if (oModel && sCurrencyPath) {
                        oModel.setProperty(sCurrencyPath, "INR");
                    }
                } else {
                    this.getView().byId(sStipendId).setVisible(true);
                    this.getView().byId(sCurrencyId).setVisible(true);
                    this.getView().byId(sStipendId).setValue("");
                    this.getView().byId(sStipendId).setValueState("None");
                }
                if (this.TD_validateStep) {
                    this.TD_validateStep();
                }
            },

            onStipendSelectionChange: function (oEvent) {
                var sSelectedText = oEvent.getSource().getSelectedButton().getText();
                if (sSelectedText === "YES") {
                    this.getView().byId("TD_id_PaidTraineeRadio").setSelectedButton(
                        this.getView().byId("TD_id_PaidTraineeRadio").getButtons().find(b => b.getText() === "NO")
                    );
                    this.onPaidTraineeChange({ getSource: () => this.getView().byId("TD_id_PaidTraineeRadio") });
                }
                this.handleStipendSelection(sSelectedText, "TD_id_Stipend", "TD_id_Currency", "oTraineeDetails", "/Currency");
            },

            onUpdateSelectionChange: function (oEvent) {
                var sSelectedText = oEvent.getSource().getSelectedButton().getText();
                if (sSelectedText === "YES") {
                    this.getView().byId("TU_id_PaidTraineeRadio").setSelectedButton(
                        this.getView().byId("TU_id_PaidTraineeRadio").getButtons().find(b => b.getText() === "NO")
                    );
                    this.onUpdatePaidTraineeChange({ getSource: () => this.getView().byId("TU_id_PaidTraineeRadio") });
                }
                this.handleStipendSelection(sSelectedText, "TU_id_Stipend", "TU_id_Currency", "oTraineeDetails", "/Currency");
            },

            onPaidTraineeChange: function (oEvent) {
                const sSelectedText = oEvent.getSource().getSelectedButton().getText();
                const oView = this.getView();
                const bIsYes = sSelectedText === "YES";
                if (bIsYes) {
                    oView.byId("TD_id_StipendRadio").setSelectedButton(
                        oView.byId("TD_id_StipendRadio").getButtons().find(b => b.getText() === "NO")
                    );
                    this.handleStipendSelection("NO", "TD_id_Stipend", "TD_id_Currency", "oTraineeDetails", "/Currency");
                }
                oView.byId("TD_id_PaidTraineeLabel").setVisible(bIsYes);
                oView.byId("TD_id_PaidTraineeAmount").setVisible(bIsYes);
                oView.byId("TD_id_FeeCurrency").setVisible(bIsYes);
                oView.byId("TD_id_FeeCurrency").setValueState("None");
                if (!bIsYes) {
                    oView.byId("TD_id_PaidTraineeAmount").setValue("0");
                    // Removed ValueState reset
                } else {
                    oView.byId("TD_id_PaidTraineeAmount").setValue("");
                }
                if (this.TD_validateStep) {
                    this.TD_validateStep();
                }
            },

            onUpdatePaidTraineeChange: function (oEvent) {
                const sSelectedText = oEvent.getSource().getSelectedButton().getText();
                const oView = this.getView();
                const bIsYes = sSelectedText === "YES";
                if (bIsYes) {
                    oView.byId("TU_id_StipendRadio").setSelectedButton(
                        oView.byId("TU_id_StipendRadio").getButtons().find(b => b.getText() === "NO")
                    );
                    this.handleStipendSelection("NO", "TU_id_Stipend", "TU_id_Currency", "oTraineeDetails", "/Currency");
                }
                oView.byId("TU_id_PaidTraineeLabel").setVisible(bIsYes);
                oView.byId("TU_id_PaidTraineeAmount").setVisible(bIsYes);
                oView.byId("TU_id_FeeCurrency").setVisible(bIsYes);
                oView.byId("TU_id_FeeCurrency").setValueState("None");
                if (!bIsYes) {
                    oView.byId("TU_id_PaidTraineeAmount").setValue("0");
                    // Removed ValueState reset
                } else {
                    oView.byId("TU_id_PaidTraineeAmount").setValue("");
                }
            },
            _setInitialValues: function () {
                var oView = this.getView();
                oView.byId("TD_id_StipendRadio").setSelectedIndex(0); // YES selected
                oView.byId("TD_id_PaidTraineeRadio").setSelectedIndex(1);
                oView.byId("TD_id_PaidTraineeAmount").setVisible(false);
                oView.byId("TD_id_FeeCurrency").setVisible(false);
                oView.byId("TD_id_PaidTraineeAmount").setValue("0");
                oView.byId("TD_id_Stipend").setVisible(true);
                oView.byId("TD_id_Currency").setVisible(true);
            },
        });
    });
