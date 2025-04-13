
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
                this.byId("TD_id_JoiningDate").setMinDate(new Date());
                this.byId("TD_id_ReviewPanel").setVisible(false)
                await this._fetchCommonData("Currency", "CurrencyModel");
                await this._fetchCommonData("EmployeeDetails", "empModel");
                await this._fetchCommonData("CompanyEmails", "CCMailModel", { applicationName: "Trainee" });//CC mailId read call
                this.sArgPara = oEvent.getParameter("arguments").sParTrainee;
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.T_onResetWizard();
                var jsonData = {
                    "NameSalutation": "Mr.",
                    "TraineeName": "",
                    "ReportingManagerSalutation": "Mr.",
                    "ReportingManager": "",
                    "Stipend": "",
                    "ReleaseDate": this.Formatter.formatDate(new Date()),
                    "JoiningDate": "",
                    "TraineeEmail": "",
                    "Currency": "",
                    "TrainingDuration": ""
                };
                this.getView().setModel(new JSONModel(jsonData), "oTraineeDetails");
                var oViewModel = new JSONModel({ isEditMode: true, isVisiable: true, editable: false, isCTCVisible: false });
                this.getView().setModel(oViewModel, "viewModel");
                this.viewModel = this.getView().getModel("viewModel");
                ["TD_id_Name", "TD_id_ReportingManager", "TD_id_EmailID", "TD_id_Stipend", "TD_id_JoiningDate", "TD_id_ReleaseDate",
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
            },
            //for edit case reading data from model
            getModelData: function (sArgPara) {
                var oModel = this.getOwnerComponent().getModel("traineeModel");
                var aFilteredData = oModel.getData().filter(function (oTrainee) {
                    return oTrainee.ID === sArgPara;
                });
                if (aFilteredData.length > 0) {
                    var traineeData = aFilteredData[0];
                    this.byId("TU_id_JoinDate").setMinDate(new Date(aFilteredData[0].ReleaseDate));
                    this.getView().setModel(new JSONModel(traineeData), "oTraineeDetails");
                    if (traineeData.Status === "OnBoarded" || traineeData.Status === "Training Completed") {
                        this.viewModel.setProperty("/isVisiable", false);
                        this.viewModel.setProperty("/editBut", false);
                    } else if (traineeData.Status === "Rejected") {
                        this.viewModel.setProperty("/isVisiable", false);
                        this.viewModel.setProperty("/editBut", true);
                    } else if (traineeData.Status === "Submitted") {
                        this.viewModel.setProperty("/isVisiable", true);
                        this.viewModel.setProperty("editBut", true);
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
            },
            //validate name function
            TD_validateName: function (oEvent) {
                utils._LCvalidateName(oEvent);
                this.TD_ReviewStep();
            },
            //validate email function
            TD_validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
                this.TD_ReviewStep();
            },
            //validate amount function
            TD_validateAmount: function (oEvent) {
                utils._LCvalidateAmount(oEvent);
                this.TD_ReviewStep();
            },
            //validate date function
            TD_validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent); // Base validation
                this.TD_ReviewStep(); // Step validation
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
            TD_ReviewStep: function () {
                var oModel = this.getView().getModel("oTraineeDetails").getData();
                oModel.Currency = this.getView().byId("TD_id_Currency").getSelectedKey();
                oModel.TrainingDuration = this.getView().byId("TD_id_TDuration").getSelectedKey();
                var allFieldsFilled = oModel.TraineeName && oModel.ReportingManager && oModel.TraineeEmail && oModel.Stipend && oModel.Currency && oModel.TrainingDuration && oModel.ReleaseDate && oModel.JoiningDate;
                if (allFieldsFilled) {
                    var isValid = utils._LCvalidateName(this.getView().byId("TD_id_Name"), "ID") && utils._LCvalidateName(this.getView().byId("TD_id_ReportingManager"), "ID") && utils._LCvalidateEmail(this.getView().byId("TD_id_EmailID"), "ID") && utils._LCvalidateAmount(this.getView().byId("TD_id_Stipend"), "ID") && utils._LCvalidateDate(this.getView().byId("TD_id_ReleaseDate"), "ID") && utils._LCvalidateDate(this.getView().byId("TD_id_JoiningDate"), "ID");
                    this.getView().byId("TD_id_ReviewPanel").setVisible(isValid);
                    this.byId("TD_id_Submit").setEnabled(isValid)
                } else {
                    this.getView().byId("TD_id_ReviewPanel").setVisible(false);
                    this.getView().byId("TD_id_Submit").setEnabled(false)

                }
            },

            //Submit trainee deatails 
            TD_onSubmitData: function (oEvent) {
                try {
                    var oModel = this.getView().getModel("oTraineeDetails").getData();
                    oModel.Currency = this.byId("TD_id_Currency").getSelectedKey();
                    oModel.Status = "Submitted";
                    if (oModel.ReleaseDate && oModel.ReleaseDate.includes("/")) {
                        oModel.ReleaseDate = oModel.ReleaseDate.split("/").reverse().join('-');
                    }
                    if (oModel.JoiningDate && oModel.JoiningDate.includes("/")) {
                        oModel.JoiningDate = oModel.JoiningDate.split("/").reverse().join('-');
                    }
                    var oPayload = {
                        "tableName": "Trainee",
                        "data": oModel
                    };
                    sap.ui.core.BusyIndicator.show(0);
                    // Call the AJAX function to submit the data
                    this.ajaxCreateWithJQuery("Trainee", oPayload).then((oData) => {
                        sap.ui.core.BusyIndicator.hide();
                        if (oData.success) {
                            var oDialog = new sap.m.Dialog({
                                title: this.i18nModel.getText("success"),
                                type: sap.m.DialogType.Message,
                                state: sap.ui.core.ValueState.Success,
                                content: new sap.m.Text({
                                    text: this.i18nModel.getText("traineeDataSubmitted")
                                }),
                                beginButton: new sap.m.Button({
                                    text: "OK",
                                    type: "Accept",
                                    press: function () {
                                        oDialog.close();
                                        this.getRouter().navTo("RouteTrainee", { value: "TraineeDetails" });
                                    }.bind(this)
                                }),
                                endButton: new sap.m.Button({
                                    text: "Generate PDF",
                                    type: "Reject",
                                    press: function () {
                                        this.TD_onPressMerge();
                                        oDialog.close();
                                        this.getRouter().navTo("RouteTrainee", { value: "TraineeDetails" });
                                    }.bind(this)
                                }),
                                afterClose: function () {
                                    oDialog.destroy();
                                }
                            });
                            oDialog.open();
                        } else {
                            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                        }
                    })
                } catch (error) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },

            //Edit/save button visibility function
            TU_onEditOrSavePress: function () {
                if (this.viewModel.getProperty("/editable")) {
                    var isValid = utils._LCvalidateName(this.getView().byId("TU_id_Name"), "ID") && utils._LCvalidateName(this.getView().byId("TU_id_Manager"), "ID") && utils._LCvalidateEmail(this.getView().byId("TU_id_TraineeMail"), "ID") && utils._LCvalidateAmount(this.getView().byId("TU_id_Stipend"), "ID");
                    // Save the changes
                    if (isValid) this.updateCallForTrainee(this.viewModel);
                    else MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                } else {
                    this.viewModel.setProperty("/editable", true);
                    this.viewModel.setProperty("/isEditMode", false);
                }
            },
            //Update trainee deatails 
            updateCallForTrainee: function (oViewModel) {
                var oModel = this.getView().getModel("oTraineeDetails").getData();
                delete oModel.EndDate
                // Check and update the status if it is 'Rejected'
                if (oModel.Status === "Rejected") {
                    oModel.Status = "Submitted";
                }
                oModel.TrainingDuration = this.byId("TU_id_TDuration").getSelectedKey();
                this.getView().getModel("oTraineeDetails").refresh(true);
                oModel = {
                    "data": oModel,
                    "filters": {
                        "ID": this.sArgPara
                    }
                };
                // AJAX call for updating the data
                this.ajaxUpdateWithJQuery("Trainee", oModel).then((oData) => {
                    if (oData.success) {
                        oViewModel.setProperty("/editable", false);
                        oViewModel.setProperty("/isEditMode", true);
                        oViewModel.setProperty("/isVisiable", true);
                        oViewModel.setProperty("editBut", true);
                        BusyIndicator.hide();
                        MessageToast.show(this.i18nModel.getText("traineeDataUpdated"));
                    }
                }).catch((oError) => {
                    BusyIndicator.hide();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
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
                var oUploaderDataModel = new JSONModel({
                    isEmailValid: true,
                    ToEmail: this.getView().getModel("oTraineeDetails").getData().TraineeEmail,  // Ensure correct property access
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
            },
            //  Mail dialog close function    
            Mail_onPressClose: function () {
                this.TU_oDialogMail.destroy();
                this.TU_oDialogMail = null;
                this.TU_oDialogMail.close();
            },
            //File upload function
            Mail_onUpload: function (oEvent) {
                this.handleFileUpload(
                    oEvent,
                    this,
                    "UploaderData", "/attachments", "/name", "/isFileUploaded", "uploadSuccessfull", "fileAlreadyUploaded", "noFileSelected", "fileReadError",
                    () => this.validateSendButton()
                );
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
                this.ajaxCreateWithJQuery("TraineeOfferEmail", oPayload).then((oData) => {
                    this.getView().getModel("oTraineeDetails").setProperty("/Status", "Offer Sent");
                    this.updateCallForTrainee(this.viewModel);
                    MessageToast.show(this.i18nModel.getText("emailSuccess"));
                    BusyIndicator.hide();
                }).catch((oError) => {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                    BusyIndicator.hide();
                });
                this.TU_oDialogMail.close();
            },
            //PDF generation function
            TD_onPressMerge: function () {
                var oModel = this.getView().getModel("oTraineeDetails");
                this.offerGeneratingPdfFunction(oModel);
                this.getView().getModel("oTraineeDetails").setProperty("/Status", "PDF Generated");
                this.updateCallForTrainee(this.viewModel);
                this.getView().getModel("oTraineeDetails").refresh(true);
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
                    this._fetchCommonData("PDFCondition", "PDFConditionModel", { Type: "TraineeOffer" });
                    await this._waitForModels(["CompanyCodeDetailsModel", "PDFConditionModel"], 200, 5000);
                    BusyIndicator.show(0);
                    var oPDFModel = this.getView().getModel("PDFData");
                    oPDFModel.setProperty("/Type", "TraineeOffer");
                    oPDFModel.setProperty("/EmpName", oEmpModel.NameSalutation + " " + oEmpModel.TraineeName);
                    oPDFModel.setProperty("/EmpRole", "Trainee");
                    oPDFModel.setProperty("/CreateDate", Formatter.formatDate(oEmpModel.ReleaseDate));
                    oPDFModel.setProperty("/TrainingStartDate", Formatter.formatDate(oEmpModel.JoiningDate));
                    oPDFModel.setProperty("/ReportingManager", oEmpModel.ReportingManagerSalutation + " " + oEmpModel.ReportingManager);
                    oPDFModel.setProperty("/Stipend", oEmpModel.Currency + " " + Formatter.fromatNumber(oEmpModel.Stipend));
                    if (oEmpModel.Stipend == 0 || oEmpModel.Stipend == "") {
                        oPDFModel.setProperty("/StipendSkipLine", 5);
                    }
                    else {
                        oPDFModel.setProperty("/StipendSkipLine", null);
                    }
                    var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
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
                    BusyIndicator.hide();
                    console.error("Error waiting for models:", error);
                }
            },


        });
    });
