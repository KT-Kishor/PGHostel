sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/formatter"
],
    function (BaseController, utils, JSONModel, MessageToast, MessageBox, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.Trainee", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteTrainee").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function (oEvent) {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this._fetchCommonData("Designation", "DesignationModel");
                this._fetchCommonData("Department", "Departmentmodel");
                this._fetchCommonData("CompanyEmails", "CCMailModel", {
                    applicationName: "Trainee"});
                ["T_id_OnboardBtn", "T_id_RejectBtn"].forEach(id => this.byId(id)?.setEnabled(false));
                ["T_id_Download", "T_id_EmpOnBoard","T_id_Cermail"].forEach(id => this.byId(id)?.setVisible(false));
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "Trainee Details");
                this.oValue = oEvent.getParameter("arguments").value;
                if (this.oValue === "Trainee") {
                    this.readCallForTrainee("Initial");
                    this.T_onPressClear();
                }
                else {
                    this.T_onSearch();
                }
            },

            readCallForTrainee: function (filter) {
                this.ajaxReadWithJQuery("Trainee", filter).then((oData) => {
                    var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getOwnerComponent().setModel(new JSONModel(offerData), "traineeModel");
                    if (filter === "Initial") {
                        offerData = [...new Map(offerData.filter(item => item.TraineeName && item.TraineeName.trim() !== "")
                            .map(item => [item.TraineeName.trim(), item])).values()];
                        this.getView().setModel(new JSONModel(offerData), "traineeModelInitial");
                        let reportingManagerData = [...new Map(offerData.filter(item => item.ReportingManager && item.ReportingManager.trim() !== "")
                            .map(item => [item.ReportingManager.trim(), item])).values()];
                        this.getView().setModel(new JSONModel(reportingManagerData), "traineeModelInitial");
                    }
                    sap.ui.core.BusyIndicator.hide();
                }).catch((oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error(this.i18nModel.getText("commonReadingDataError"))
                });
            },
            T_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },
            T_validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
            },
            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            T_onPressAddTrainee: function (oEvent) {
                var oParValue;
                if (oEvent.getSource().getId().lastIndexOf("T_id_AddBtn") !== -1) {
                    oParValue = "CreateTraineeFlag"
                } else {
                    oParValue = oEvent.getSource().getBindingContext("traineeModel").getModel().getData()[oEvent.getSource().getBindingContextPath().split("/")[1]].ID
                }
                this.getRouter().navTo("RouteTraineeDetails", { sParTrainee: oParValue });
            },
            TC_commonOpenDialog: function (dialogProperty, fragmentName, datePickerId) {
                if (!this[dialogProperty]) {
                    sap.ui.core.Fragment.load({
                        name: fragmentName,
                        controller: this,
                    }).then(function (oDialog) {
                        this[dialogProperty] = oDialog;
                        this.getView().addDependent(this[dialogProperty]);
                        this._FragmentDatePickersReadOnly([datePickerId]);
                        this[dialogProperty].open();
                    }.bind(this));
                } else {
                    this._FragmentDatePickersReadOnly([datePickerId]);
                    this[dialogProperty].open();
                }
            },
            T_onTableSelectionChange: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("listItem");
                if (oSelectedItem) {
                    var sStatus = oSelectedItem.getBindingContext("traineeModel").getProperty("Status");
                    var isDisabled = sStatus === "OnBoarded" || sStatus === "Rejected";
                    this.byId("T_id_OnboardBtn").setEnabled(!isDisabled);
                    this.byId("T_id_RejectBtn").setEnabled(!isDisabled);
                    var isCertificateVisible = sStatus === "Training Completed" || sStatus === "OnBoarded";
                    this.byId("T_id_Download").setVisible(isCertificateVisible);
                    var isEmpOnBoardVisible = sStatus === "Training Completed";
                    this.byId("T_id_EmpOnBoard").setVisible(isEmpOnBoardVisible);
                    this.byId("T_id_Cermail").setVisible(isEmpOnBoardVisible);
                    var isOtherButtonsVisible = sStatus !== "Training Completed";
                    this.byId("T_id_OnboardBtn").setVisible(isOtherButtonsVisible);
                    this.byId("T_id_RejectBtn").setVisible(isOtherButtonsVisible);
                }
            },
            updateCallForTrainee: function (oTraineeData, text) {
                var that = this;
                if (oTraineeData.Status === "OnBoarded") {
                    oTraineeData.CompanyEmailID = sap.ui.getCore().byId("OTF_id_TraineeMail").getValue();
                }
                var oModelOffer = {
                    "data": oTraineeData,
                    "filters": {
                        "ID": oTraineeData.ID
                    }
                };
                sap.ui.core.BusyIndicator.show(0);
                this.ajaxUpdateWithJQuery("Trainee", oModelOffer).then((oData) => {
                    MessageToast.show(that.i18nModel.getText(text))
                    sap.ui.core.BusyIndicator.hide();
                    if (oData.results) {
                        that.readCallForTrainee("");
                    }
                }).catch((oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(that.i18nModel.getText("commonErrorMessage"));
                });
            },
            T_onOnboardPress: function () {
                this.onHandleTraineeAction("onboard");
            },
            T_onRejectPress: function () {
                this.onHandleTraineeAction("reject");
            },
            onHandleTraineeAction: function (action) {
                var that = this;
                var oContext = this.byId("T_id_TraineeTable").getSelectedItem().getBindingContext("traineeModel");            
                var message = (action === "onboard")
                    ? this.i18nModel.getText("OnboardMessage", [oContext.getProperty("NameSalutation"), oContext.getProperty("TraineeName")])
                    : this.i18nModel.getText("RejectMessage", [oContext.getProperty("NameSalutation"), oContext.getProperty("TraineeName")]);
                var dialog = new sap.m.Dialog({
                    title: this.i18nModel.getText("ConfirmActionTitle"),
                    type: "Message",
                    content: new sap.m.Text({ text: message }),
                    beginButton: new sap.m.Button({
                        text: this.i18nModel.getText("OkButton"),
                        type: "Accept",
                        press: function () {
                            if (action === "onboard") {
                                // Open the OnboardTrainee fragment
                                that.TC_commonOpenDialog("TOb_oDialog", "sap.kt.com.minihrsolution.fragment.OnboardTrainee", "");
                            } else if (action === "reject") {
                                that._handleReject(oContext);
                            }
                            dialog.close();
                        }
                    }),
                    endButton: new sap.m.Button({
                        text: this.i18nModel.getText("CancelButton"),
                        type: "Reject",
                        press: function () {
                            dialog.close();
                        }
                    }),
                    afterClose: function () {
                        dialog.destroy();
                    }
                });
                dialog.open();
            },
            _handleReject: function (oContext) {
                oContext.getModel().setProperty(oContext.getPath() + "/Status", "Rejected");
                this.updateCallForTrainee(oContext.getObject(), "traineeRejectSucess");
                ["T_id_OnboardBtn", "T_id_RejectBtn"].forEach(id => this.byId(id)?.setEnabled(false));
            },
            OTF_onPressOnboard: function () {
                try {
                    if (utils._LCvalidateEmail(sap.ui.getCore().byId("OTF_id_TraineeMail"), "ID")) {
                        var oContext = this.byId("T_id_TraineeTable").getSelectedItem().getBindingContext("traineeModel");
                        // Update UI Model
                        oContext.getModel().setProperty(oContext.getPath() + "/Status", "OnBoarded");
                        // Prepare Data for Update Call
                        this.updateCallForTrainee(oContext.getObject(), "traineeOnboardSucess");
                        this.TOb_oDialog.close();
                        ["T_id_OnboardBtn", "T_id_RejectBtn"].forEach(id => this.byId(id)?.setEnabled(false));
                    } else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                } catch {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },
            OTF_onPressClose: function () {
                sap.ui.getCore().byId("OTF_id_TraineeMail").setValueState("None");
                sap.ui.getCore().byId("OTF_id_TraineeMail").setValue("");
                this.TOb_oDialog.close();
            },
            T_onCertDownload: function () {
                var oSelectedItem = this.byId("T_id_TraineeTable").getSelectedItem();
                var oTraineeModel = oSelectedItem.getBindingContext("traineeModel").getObject();
                var oJoiningDate = new Date(oTraineeModel.JoiningDate);
                // Calculate End Date (6 months from Joining Date)
                var oCalculatedEndDate = new Date(oJoiningDate);
                oCalculatedEndDate.setMonth(oCalculatedEndDate.getMonth() + 6);
                var sFormattedEndDate = oCalculatedEndDate.toISOString().split("T")[0];
                oTraineeModel.EndDate = new Date(sFormattedEndDate)
                var oTraineeContext = oSelectedItem.getBindingContext("traineeModel");
                this.getView().setBindingContext(oTraineeContext, "traineeModel");
                // Open the dialog
                this.TC_commonOpenDialog("TC_oDialog", "sap.kt.com.minihrsolution.fragment.TraineeCertificate", "TCF_id_EndDate");
            },
            TCF_onPressCloseDialog: function () {
                this.getView().getModel("PDFData").setProperty("/PreviewFlag", false);
                this.getView().getModel("PDFData").setProperty("/RTEText", "<p>Please click on <b>Preview Certificate</b> to Preview the Certificate</p>");
                sap.ui.getCore().byId("TCF_id_ProjectName").setValueState("None");
                sap.ui.getCore().byId("TCF_id_ProjectName").setValue("");
                this.TC_oDialog.close();
            },
            TCF_onPressHandlePreview: function() {
                const bPreviewFlag = this.getView().getModel("PDFData").getProperty("/PreviewFlag");
                if (bPreviewFlag) {
                    this.TCF_onPressDownload();
                } else {
                    this.TCF_onPressPreview();
                }
            },
            
            //download certificate
            TCF_onPressPreview: function () {
                if (!utils._LCvalidateMandatoryField(sap.ui.getCore().byId("TCF_id_ProjectName"), "ID")) {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                }
                let oSelectedItem = this.byId("T_id_TraineeTable").getSelectedItem();
                let oTraineeModel = oSelectedItem.getBindingContext("traineeModel").getObject();
                var empName = oTraineeModel.NameSalutation + " " + oTraineeModel.TraineeName;
                var joinDate = Formatter.formatDate(oTraineeModel.JoiningDate);
                var endDate = sap.ui.getCore().byId("TCF_id_EndDate").getValue();
                var role = "Trainee";
                var department = sap.ui.getCore().byId("TCF_id_Department").getSelectedKey();
                var projectName = oTraineeModel.ProjectName;
                var supervisor = oTraineeModel.ReportingManagerSalutation + " " + oTraineeModel.ReportingManager;
                var data = `
                <div style="text-align: justify;">
                    <p>This is to certify that <b>${empName}</b> has successfully completed an internship at <b>Kalpavriksha Technologies</b> from <b>${joinDate}</b> to <b>${endDate}</b>.</p> 
                    <p>During this period, ${empName} was assigned the role of <b>${role}</b> in the ${department} department and worked on the <b>${projectName}</b>. The performance, skills, and dedication demonstrated by ${empName} during the internship have been highly commendable.</p>
                    <p>We wish ${empName} all the best in future endeavors and career pursuits.</p>
                    <h3>Details of the Internship:</h3>
                    <div style="margin-left: 10px;">
                        <p style="margin: 3px 0;"><b>• Intern's Name: ${empName}</b></p>
                        <p style="margin: 3px 0;"><b>• Position: ${role}</b></p>
                        <p style="margin: 3px 0;"><b>• Internship Duration: ${joinDate} to ${endDate}</b></p>
                        <p style="margin: 3px 0;"><b>• Department: ${department}</b></p>
                        <p style="margin: 3px 0;"><b>• Supervisor: ${supervisor}</b></p>
                        <p style="margin: 3px 0;"><b>• Project/Tasks: ${projectName}</b></p>
                    </div>
                    <p>We at <b>Kalpavriksha Technologies</b> thank ${empName} for the valuable contributions made to our organization and wish success in all future endeavors.</p>
                </div>`;

                this.getView().getModel("PDFData").setProperty("/RTEText", data);
                this.getView().getModel("PDFData").setProperty("/PreviewFlag", true);
            },
            TCF_onPressDownload: function () {
                try {
                    // Get selected trainee's data from the table
                    let oSelectedItem = this.byId("T_id_TraineeTable").getSelectedItem();
                    let oTraineeModel = oSelectedItem.getBindingContext("traineeModel").getObject();
                    this.getView().getModel("PDFData").setProperty("/CreateDate", Formatter.formatDate(oTraineeModel.ReleaseDate));
                    this.getView().getModel("PDFData").setProperty("/CertificateTitle", "TRAINEE CERTIFICATE");
                    // Create the updated trainee data
                    const oUpdatedData = {
                        ID: oTraineeModel.ID,
                        Department: sap.ui.getCore().byId("TCF_id_Department").getSelectedKey(),
                        ProjectName: oTraineeModel.ProjectName,
                        EndDate: oTraineeModel.EndDate,
                        Role: "Trainee",
                        Status: "Training Completed",
                    };
                    sap.ui.core.BusyIndicator.show(0);
                    this.updateCallForTrainee(oUpdatedData, "downloadSucess");
                    this.byId("T_id_Download").setVisible(false);
                    this.getView().getModel("PDFData").setProperty("/PreviewFlag", false);
                    let htmlContent = sap.ui.getCore().byId("myRTE").getValue(); 
                    this.generateCertificatePDF(htmlContent);
                    sap.ui.core.BusyIndicator.hide();
                    this.TC_oDialog.close();
                    this.getView().getModel("PDFData").setProperty("/RTEText", "<p>Please click on <b>Preview</b> to Preview the Certificate</p>");
                } catch (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },         
            T_onBoardTrainee: function () {
                var oSelectedItem = this.byId("T_id_TraineeTable").getSelectedItem();
                var oTraineeModel = oSelectedItem.getBindingContext("traineeModel").getObject();
                this.getRouter().navTo("RouteEmployeeOfferDetails", {
                    sParOffer: oTraineeModel.TraineeName,
                    sParEmployee: oTraineeModel.NameSalutation
                });
            },
            T_onSearch: function () {
                var aFilterItems = this.byId("T_id_Filterbar").getFilterGroupItems();
                var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" })
                var params = {};
                aFilterItems.forEach(function (oItem) {
                    var oControl = oItem.getControl();
                    var sValue = oItem.getName();
                    if (oControl && oControl.getValue()) {
                        if (sValue === "JoiningDate") {
                            params["startDate"] = oDateFormat.format(new Date(oControl.getValue().split('-')[0]));
                            params["endDate"] = oDateFormat.format(new Date(oControl.getValue().split('-')[1]));
                        } else {
                            params[sValue] = oControl.getValue();
                        }
                    }
                });
                this.readCallForTrainee(params);
            },

            //clear the filterbar
            T_onPressClear: function () {
                var aFilterItems = this.byId("T_id_Filterbar").getFilterGroupItems();
                aFilterItems.forEach(function (oItem) {
                    var oControl = oItem.getControl(); // Get the associated control
                    if (oControl) {
                        if (oControl.setValue) {
                            oControl.setValue(""); // Clear value for ComboBox, Input, DatePicker, etc.
                        }
                        if (oControl.setSelectedKey) {
                            oControl.setSelectedKey(""); // Reset selection for dropdowns
                        }
                        if (oControl.setSelected) {
                            oControl.setSelected(false); // Reset selection for Checkboxes
                        }
                    }
                });
            },
            T_OpenDialog: function (fragmentName) {
                if (!this.oDialog) {
                    sap.ui.core.Fragment.load({
                        name: fragmentName,
                        controller: this
                    }).then(dialog => {
                        this.oDialog = dialog;
                        this.getView().addDependent(this.oDialog);
                        this.oDialog.open();
                    }).bind(this);
                } else {
                    this.oDialog.open();
                }
            },
            T_onCerMail: function () {
                var oUploaderDataModel = new JSONModel({
                    isEmailValid: true,
                    toEmailID: this.getView().getModel("traineeModel").getData()[0].TraineeEmail,  // Ensure correct property access
                    CCEmail: this.getView().getModel("CCMailModel").getData()[0].emails,
                    name: "",
                    mimeType: "",
                    content: "",
                    isFileUploaded: false,
                    button: false
                });
                this.getView().setModel(oUploaderDataModel, "UploaderData");
                this.T_OpenDialog("sap.kt.com.minihrsolution.fragment.CommonMail");
                this.validateSendButton();

            },
            Mail_onPressClose: function () {
                this.oDialog.destroy();
                this.oDialog = null;
                this.oDialog.close();
            },
            Mail_onUpload: function (oEvent) {
                this.handleFileUpload(
                    oEvent, this, 
                    "UploaderData","/attachments",  "/name",  "/isFileUploaded",   "uploadSuccessfull",  "fileAlreadyUploaded",    "noFileSelected",   "fileReadError", 
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
                this.validateSendButton(); 
            },
            Mail_onSendEmail: function () {
                var oModel = this.getView().getModel("traineeModel").getData();
                var oPayload = {
                    "TraineeName": oModel.TraineeName,
                    "toEmailID": oModel.TraineeEmail,
                    "CC":this.getView().getModel("CCMailModel").getData()[0].emails,
                    "attachments": this.getView().getModel("UploaderData").getProperty("/attachments"),
                }; 
                this.ajaxCreateWithJQuery("TraineeCertificateEmail", oPayload).then((oData) => {
                    MessageToast.show(this.i18nModel.getText("certificateSuccess"));
                    sap.ui.core.BusyIndicator.hide();
                }).catch((oError) => {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                    sap.ui.core.BusyIndicator.hide();
                });
                this.oDialog.close();
            }
        });
    });