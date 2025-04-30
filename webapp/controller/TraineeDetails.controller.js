sap.ui.define([
    "./BaseController",//calling base controller
    "../utils/validation", //calling validation function
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../model/formatter",
    "../utils/CommonJsPDF"],
    function (BaseController, utils, JSONModel, MessageToast, Formatter, jsPDF) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.TraineeDetails", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteTraineeDetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function (oEvent) {
                this.getBusyDialog();
                this.commonLoginFunction("Trainee");
                this.byId("TD_id_JoiningDate").setMinDate(new Date());
                await this._fetchCommonData("Currency", "CurrencyModel");
                await this._fetchCommonData("EmailContent", "CCMailModel", { Type: "TraineeOffer" });
                await this._fetchCommonData("BaseLocation", "BaseLocationModel");
                await this._fetchCommonData("EmployeeDetailsData", "empModel");
                this.sArgPara = oEvent.getParameter("arguments").sParTrainee;
                this.byId("TD_id_Wizard").getSteps()[0].setValidated(false);
                this.byId("TD_id_TrainingDetailsBox").setVisible(false);
                this.byId("TD_id_TrainingAmountLabel").setVisible(false);
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.T_onResetWizard();
                var jsonData = {
                    "NameSalutation": "Mr.",
                    "TraineeName": "",
                    "ReportingManagerSalutation": "Mr.",
                    "ReportingManager": "",
                    "Type": "",
                    "Amount": "",
                    "Currency": "",
                    "ReleaseDate": this.Formatter.formatDate(new Date()),
                    "JoiningDate": "",
                    "TraineeEmail": "",
                    "TrainingDuration": "",
                    "BaseLocation": ""
                };
                this.getView().setModel(new JSONModel(jsonData), "oTraineeDetails");
                var oViewModel = new JSONModel({ isEditMode: true, isVisiable: true, editable: false });
                this.getView().setModel(oViewModel, "viewModel");
                this.viewModel = this.getView().getModel("viewModel");
                ["TD_id_Name", "TD_id_ReportingManager", "TD_id_EmailID", "TD_id_TrainingType", "TD_id_JoiningDate", "TD_id_ReleaseDate", "TD_id_TrainingAmount",
                    "TU_id_Name", "TU_id_Manager", "TU_id_TraineeMail", "TU_id_JoinDate","TU_id_TrainingType","TU_id_TrainingAmount"].forEach(function (ids) {
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
                    // Handle visibility and edit button based on trainee status
                    if (traineeData.Status === "OnBoarded" || traineeData.Status === "Training Completed") {
                        this.viewModel.setProperty("/isVisiable", false);
                        this.viewModel.setProperty("/editBut", false);
                    } else if (traineeData.Status === "Rejected") {
                        this.viewModel.setProperty("/isVisiable", false);
                        this.viewModel.setProperty("/editBut", true);
                    } else if (traineeData.Status === "Saved") {
                        this.viewModel.setProperty("/isVisiable", true);
                        this.viewModel.setProperty("/editBut", true);
                    }
                    this.closeBusyDialog();
                } else {
                    MessageBox.error(this.i18nModel.getText("commonErrorMessage"));
                    this.closeBusyDialog();
                }
            },

            //navigation to trainee view
            TUF_onPressback: function () {
                this.getRouter().navTo("RouteTrainee", { value: "TraineeDetails" });
            },
            // Reset wizard to initial state
            T_onResetWizard: function () {
                this.closeBusyDialog();
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
                utils._LCvalidateJoiningBonus(oEvent);
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
                oModel.BaseLocation = this.getView().byId("TD_id_Location").getSelectedKey();
                oModel.TrainingDuration = this.getView().byId("TD_id_TDuration").getSelectedKey();
                const bAllFieldsFilled = this.getView().byId("TD_id_Name").getValue() && this.getView().byId("TD_id_ReportingManager").getSelectedKey() && this.getView().byId("TD_id_EmailID").getValue() && this.getView().byId("TD_id_TrainingType").getSelectedKey() && this.getView().byId("TD_id_TrainingAmount").getValue() && this.getView().byId("TD_id_ReleaseDate").getValue() &&
                    this.getView().byId("TD_id_JoiningDate").getValue() && this.getView().byId("TD_id_TDuration").getSelectedKey() && this.getView().byId("TD_id_Location").getSelectedKey();
                if (bAllFieldsFilled) {
                    let bValid = utils._LCvalidateName(this.getView().byId("TD_id_Name"), "ID") && utils._LCstrictValidationComboBox(this.getView().byId("TD_id_ReportingManager"), "ID") && utils._LCvalidateEmail(this.getView().byId("TD_id_EmailID"), "ID") && utils._LCstrictValidationComboBox(this.getView().byId("TD_id_TrainingType"), "ID") && utils._LCvalidateJoiningBonus(this.getView().byId("TD_id_TrainingAmount"), "ID") && utils._LCvalidateDate(this.getView().byId("TD_id_ReleaseDate"), "ID") && utils._LCvalidateDate(this.getView().byId("TD_id_JoiningDate"), "ID");
                    this.getView().byId("TD_id_Wizard").getSteps()[0].setValidated(bValid);
                } else {
                    this.getView().byId("TD_id_Wizard").getSteps()[0].setValidated(false);
                    this.getView().byId("TD_id_StepOne").getAggregation("_nextButton").setText(this.i18nModel.getText("review"));
                }
            },

            //Submit trainee deatails 
            TD_onSubmitData: function (oEvent) {
                var oModel = this.getView().getModel("oTraineeDetails").getData();
                if (utils._LCvalidateName(this.getView().byId("TD_id_Name"), "ID") && utils._LCstrictValidationComboBox(this.getView().byId("TD_id_ReportingManager"), "ID") && utils._LCvalidateEmail(this.getView().byId("TD_id_EmailID"), "ID") && utils._LCstrictValidationComboBox(this.getView().byId("TD_id_TrainingType"), "ID") && utils._LCvalidateJoiningBonus(this.getView().byId("TD_id_TrainingAmount"), "ID") && utils._LCvalidateDate(this.getView().byId("TD_id_ReleaseDate"), "ID") && utils._LCvalidateDate(this.getView().byId("TD_id_JoiningDate"), "ID")) {
                    this.getBusyDialog();
                    oModel.Currency = this.byId("TD_id_Currency").getSelectedKey();
                    oModel.BranchCode = this.getView().byId("TD_id_Location").getSelectedItem().getAdditionalText();
                    oModel.ManagerID = this.getView().byId("TD_id_ReportingManager").getSelectedItem().getAdditionalText();
                    oModel.BaseLocation = oModel.BaseLocation !== "" ? oModel.BaseLocation : this.getView().byId("TD_id_Location").getSelectedKey();
                    oModel.Status = "Saved";
                    oModel.ReleaseDate = oModel.ReleaseDate.split("/").reverse().join('-');
                    oModel.JoiningDate = oModel.JoiningDate.split("/").reverse().join('-');
                    var oPayload = {
                        "tableName": "Trainee",
                        "data": oModel
                    };
                    this.ajaxCreateWithJQuery("Trainee", oPayload).then((oData) => {
                        if (oData.success) {
                            this.closeBusyDialog();
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
                                        this.ajaxUpdateWithJQuery("Trainee", oUpdatePayload).then((oData) => {
                                            this.closeBusyDialog();
                                            if (oData.success) {
                                                MessageToast.show(this.i18nModel.getText("pdfSucces"));
                                                oDialog.close();
                                                this.getView().byId("TD_id_StepTwo").getParent().setShowNextButton(true);
                                                this.getRouter().navTo("RouteTrainee", { value: "Trainee" });
                                                this.getView().getModel("oTraineeDetails").refresh(true);
                                            }
                                        }).catch((error) => {
                                            MessageToast.show(error.message || error.responseText);
                                            this.closeBusyDialog();
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
                        this.closeBusyDialog();
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

                    if (utils._LCvalidateName(this.getView().byId("TU_id_Name"), "ID") && utils._LCstrictValidationComboBox(this.getView().byId("TU_id_Manager"), "ID") && utils._LCvalidateEmail(this.getView().byId("TU_id_TraineeMail"), "ID") && utils._LCstrictValidationComboBox(this.getView().byId("TU_id_TrainingType"), "ID") && utils._LCvalidateJoiningBonus(this.getView().byId("TU_id_TrainingAmount"), "ID")) {
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
                this.getBusyDialog();
                var oModel = this.getView().getModel("oTraineeDetails").getData();
                oModel.BranchCode = this.getView().byId("TU_id_Location").getSelectedItem().getAdditionalText();
                oModel.ManagerID = this.getView().byId("TU_id_Manager").getSelectedKey();
                oModel.ReleaseDate = this.byId("TU_id_RelDate").getValue().split("/").reverse().join("-");;
                oModel.JoiningDate = this.byId("TU_id_JoinDate").getValue().split("/").reverse().join("-");
                // Check and update the status if it is 'Rejected'
                if (oModel.Status === "Rejected") {
                    oModel.Status = "Saved";
                }
                oModel.TrainingDuration = this.byId("TU_id_TDuration").getSelectedKey();
                oModel = {
                    "data": oModel,
                    "filters": {
                        "ID": this.sArgPara
                    }
                };
                // AJAX call for updating the data
                this.ajaxUpdateWithJQuery("Trainee", oModel).then((oData) => {
                    if (oData.success) {
                        this.closeBusyDialog();
                        oViewModel.setProperty("/editable", false);
                        oViewModel.setProperty("/isEditMode", true);
                        oViewModel.setProperty("/isVisiable", true);
                        oViewModel.setProperty("editBut", true);
                        if (text && text !== "silent") {
                            MessageToast.show(this.i18nModel.getText(text));
                        }
                        this.getView().getModel("oTraineeDetails").refresh(true);
                    }
                }).catch((error) => {
                    this.closeBusyDialog();
                    MessageToast.show(error.message || error.responseText);
                });
            },
            // common function for opening dialog
            TD_commonOpenDialog: function (fragmentName) {
                if (!this.TU_oDialogMail) {
                    sap.ui.core.Fragment.load({
                        name: fragmentName,
                        controller: this,
                    }).then(function (TU_oDialogMail) {
                        this.TU_oDialogMail = TU_oDialogMail;
                        this.getView().addDependent(this.TU_oDialogMail);
                        this.TU_oDialogMail.open();
                    }.bind(this));
                } else {
                    this.TU_oDialogMail.open();
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
                    CCEmail: this.getView().getModel("CCMailModel").getData()[0].CCEmailId,
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
                // this.TU_oDialogMail.close();
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
                try {
                    this.getBusyDialog();
                    var oModel = this.getView().getModel("oTraineeDetails").getData();
                    var oPayload = {
                        "TraineeName": oModel.TraineeName,
                        "toEmailID": oModel.TraineeEmail,
                        "JoiningDate": Formatter.formatDate(oModel.JoiningDate),
                        "CC": sap.ui.getCore().byId("CCMail_TextArea").getValue(),
                        "attachments": this.getView().getModel("UploaderData").getProperty("/attachments")
                    };
                    this.ajaxCreateWithJQuery("TraineeOfferEmail", oPayload).then((oData) => {
                        this.getView().getModel("oTraineeDetails").setProperty("/Status", "Offer Sent");
                        MessageToast.show(this.i18nModel.getText("emailSuccess"));
                        this.closeBusyDialog();
                        this.updateCallForTrainee(this.viewModel, "silent");
                    }).catch((error) => {
                        this.closeBusyDialog();
                        MessageToast.show(error.responseText);
                    });
                    this.Mail_onPressClose();
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(error.responseText);
                }
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
                var oEmpModel = oModel.getData();
                await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: oEmpModel.BranchCode });
                await this._fetchCommonData("PDFCondition", "PDFConditionModel", { Type: "TraineeOffer" });
                var oPDFModel = this.getView().getModel("PDFData");
                oPDFModel.setProperty("/Type", "Trainee Offer");
                oPDFModel.setProperty("/EmpName", oEmpModel.NameSalutation + " " + oEmpModel.TraineeName);
                oPDFModel.setProperty("/EmpRole", "Trainee");
                oPDFModel.setProperty("/TrainingDuration", oEmpModel.TrainingDuration);
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
                        jsPDF._GeneratePDF(oPDFModel.getData(), oCompanyDetailsModel, oPDFConditionModel);
                    } else {
                    }
                }
            },
            onTrainingTypeChange: function (oEvent) {
                const oComboBox = oEvent.getSource();
                const sSelectedKey = oComboBox.getSelectedKey();
                const oView = this.getView();        
                if (sSelectedKey) {
                    oView.byId("TD_id_TrainingAmountLabel").setVisible(true);
                    oView.byId("TD_id_TrainingDetailsBox").setVisible(true);
                    oView.byId("TD_id_TrainingAmount").setValue("");
                    oView.byId("TD_id_TrainingAmount").setValueState("None");
                } else {
                    oView.byId("TD_id_TrainingAmountLabel").setVisible(false);
                    oView.byId("TD_id_TrainingDetailsBox").setVisible(false);
                    oView.byId("TD_id_TrainingAmount").setValue("");
                    oView.byId("TD_id_TrainingAmount").setValueState("None");
                }
            }    
        });
    });
