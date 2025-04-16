sap.ui.define([
    "./BaseController", //call base controller
    "../utils/validation", // call validation function
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/formatter", // call formatter function
    "sap/ui/core/BusyIndicator"],
    function (BaseController, utils, JSONModel, MessageToast, MessageBox, Formatter, BusyIndicator) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.Trainee", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteTrainee").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched:async function (oEvent) {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle(); 
                this.byId("T_id_OnboardBtn").setEnabled(false);
                this.byId("T_id_RejectBtn").setEnabled(false);
                ["T_id_Download", "T_id_EmpOnBoard", "T_id_Cermail"].forEach(id => this.byId(id)?.setVisible(false));
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "Trainee Details");
                this.oValue = oEvent.getParameter("arguments").value;
                if (this.oValue === "Trainee") {
                    this.readCallForTrainee("Initial");
                    this.T_onPressClear();// clear the filter bar
                }
                else {
                    this.T_onSearch();// filter function for trainee 
                }
                await this._fetchCommonData("Designation", "DesignationModel");
                await this._fetchCommonData("Department", "Departmentmodel");
                await this._fetchCommonData("CompanyEmails", "CCMailModel", { applicationName: "Trainee" }); // common company emails read call
            },
            //read call for trainee
            readCallForTrainee: async function (filter) {
               await this.ajaxReadWithJQuery("Trainee", filter,[]).then((oData) => {
                    var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getOwnerComponent().setModel(new JSONModel(offerData), "traineeModel");
                    if (filter === "Initial") {
                        offerData = [...new Map(offerData.filter(item => item.TraineeName && item.TraineeName.trim() !== "")
                            .map(item => [item.TraineeName.trim(), item])).values()]; // removing duplicates
                        this.getView().setModel(new JSONModel(offerData), "traineeModelInitial");
                        let reportingManagerData = [...new Map(offerData.filter(item => item.ReportingManager && item.ReportingManager.trim() !== "")
                            .map(item => [item.ReportingManager.trim(), item])).values()];
                        this.getView().setModel(new JSONModel(reportingManagerData), "traineeModelInitial");
                    }
                    BusyIndicator.hide();
                }).catch((error) => {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageToast.show(error.message || error.responseText);
                });
            },
            //validation function for mandatory fields
            T_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },
            //validation function for email
            T_validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
            },
            //validation function for date
            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            //validation function for date
            onLogout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            //Trainee creation button
            T_onPressAddTrainee: function (oEvent) {
                var oParValue;
                // Check if the button pressed is the "Add Trainee" button by looking at its ID
                if (oEvent.getSource().getId().lastIndexOf("T_id_AddBtn") !== -1) {
                    oParValue = "CreateTraineeFlag"
                } else {
                    // Else navigation to existing trainee details
                    oParValue = oEvent.getSource().getBindingContext("traineeModel").getModel().getData()[oEvent.getSource().getBindingContextPath().split("/")[1]].ID
                }
                this.getRouter().navTo("RouteTraineeDetails", { sParTrainee: oParValue });
            },
            // common open the dialog function
            T_commonOpenDialog: function (dialogProperty, fragmentName,) {
                if (!this[dialogProperty]) {
                    sap.ui.core.Fragment.load({
                        name: fragmentName,
                        controller: this,
                    }).then(function (oDialog) {
                        this[dialogProperty] = oDialog;
                        this.getView().addDependent(this[dialogProperty]);
                        this[dialogProperty].open();
                    }.bind(this));
                } else {
                    this[dialogProperty].open();
                }
            },
            //Trainee table selection change function for button visibility
            T_onTableSelectionChange: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("listItem");
                this.SelectedData = oSelectedItem.getBindingContext("traineeModel").getObject();
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
            //update call for trainee
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
                BusyIndicator.show(0);
                this.ajaxUpdateWithJQuery("Trainee", oModelOffer).then((oData) => {
                    MessageToast.show(that.i18nModel.getText(text))
                    BusyIndicator.hide();
                }).catch((error) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(error.message || error.responseText);
                });
            },
            //trainee onboard confirmation 
            T_onOnboardPress: function () {
                this.onHandleTraineeAction("onboard");
            },
            //trainee reject confirmation
            T_onRejectPress: function () {
                this.onHandleTraineeAction("reject");
            },
            //confirmation dialog function for trainee onboard and reject
            onHandleTraineeAction: function (action) {
                var that = this;
                var oContext = this.byId("T_id_TraineeTable").getSelectedItem()?.getBindingContext("traineeModel");
                if (!oContext) {
                    MessageToast.show(this.i18nModel.getText("SelectTraineeMessage"));
                    return;
                }
                var sName = oContext.getProperty("NameSalutation") + " " + oContext.getProperty("TraineeName");
                var sMessage = (action === "onboard")
                    ? this.i18nModel.getText("OnboardMessage", [sName])
                    : this.i18nModel.getText("RejectMessage", [sName]);
                this.showConfirmationDialog(
                    this.i18nModel.getText("ConfirmActionTitle"),
                    sMessage,
                    function () {
                        // On Confirm
                        if (action === "onboard") {
                            that.T_commonOpenDialog("TOb_oDialog", "sap.kt.com.minihrsolution.fragment.OnboardTrainee");
                        } else if (action === "reject") {
                            that._handleReject(oContext);
                        }
                        // Clear selection after confirm
                        that.byId("T_id_TraineeTable").removeSelections(true);
                    },
                    function () {
                        // On Cancel: also clear selection
                        that.byId("T_id_TraineeTable").removeSelections(true);
                        that.byId("T_id_OnboardBtn").setEnabled(false);
                        that.byId("T_id_RejectBtn").setEnabled(false);
                    }
                );
            },

            //Reject trainee function
            _handleReject: function (oContext) {
                oContext.getModel().setProperty(oContext.getPath() + "/Status", "Rejected");
                this.updateCallForTrainee(oContext.getObject(), "traineeRejectSucess");
                this.byId("T_id_OnboardBtn").setEnabled(false);
                this.byId("T_id_RejectBtn").setEnabled(false);
                this.byId("T_id_TraineeTable").removeSelections(true);
            },
            //Onboard trainee function
            OTF_onPressOnboard: function (oTraineeData) {
                try {
                    if (utils._LCvalidateEmail(sap.ui.getCore().byId("OTF_id_TraineeMail"), "ID")) {
                        var oTraineeData = this.SelectedData;
                        oTraineeData.Status = "OnBoarded"; 
                        this.updateCallForTrainee(oTraineeData, "traineeOnboardSucess");
                        this.getView().getModel("traineeModel").setProperty("/Status", "OnBoarded");
                        this.OTF_onPressClose();
                        // Clear selection and disable buttons
                        this.byId("T_id_TraineeTable").removeSelections(true);
                        this.byId("T_id_OnboardBtn").setEnabled(false);
                        this.byId("T_id_RejectBtn").setEnabled(false);
                    } else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                } catch (error) {
                    MessageToast.show(error.message || error.responseText);
                }
            },
          
            //Close the  onboarding dialog function
            OTF_onPressClose: function () {
                sap.ui.getCore().byId("OTF_id_TraineeMail").setValueState("None");
                sap.ui.getCore().byId("OTF_id_TraineeMail").setValue("");
                this.TOb_oDialog.close();
            },
            //Trainee  certificate  dialog function
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
                this.T_commonOpenDialog("TC_oDialog", "sap.kt.com.minihrsolution.fragment.TraineeCertificate", "TCF_id_EndDate");
            },
            //Close the certificate dialog function
            TCF_onPressCloseDialog: function () {
                this.getView().getModel("PDFData").setProperty("/PreviewFlag", false);
                this.getView().getModel("PDFData").setProperty("/RTEText", "<p>Please click on <b>Preview Certificate</b> to Preview the Certificate</p>");
                sap.ui.getCore().byId("TCF_id_ProjectName").setValueState("None");
                sap.ui.getCore().byId("TCF_id_ProjectName").setValue("");
                this.TC_oDialog.close();
            },
            //Preview and download certificate function
            TCF_onPressHandlePreview: function () {
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
            //generate PDF function
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
                    BusyIndicator.show(0);
                    this.updateCallForTrainee(oUpdatedData, "downloadSucess");
                   // this.byId("T_id_TraineeTable").getSelectedItem().getBindingContext("traineeModel").getObject().Status = "Training Completed"             
                    this.byId("T_id_TraineeTable").removeSelections(true);
                    this.byId("T_id_Download").setVisible(false);
                    this.getView().getModel("PDFData").setProperty("/PreviewFlag", false);
                    let htmlContent = sap.ui.getCore().byId("myRTE").getValue();
                    this.generateCertificatePDF(htmlContent, oTraineeModel.BranchCode);
                    BusyIndicator.hide();
                    this.TC_oDialog.close();
                    this.getView().getModel("PDFData").setProperty("/RTEText", "<p>Please click on <b>Preview</b> to Preview the Certificate</p>");
                } catch (oError) {
                    BusyIndicator.hide();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },
            //Trainee onboard function        
            T_onBoardTrainee: function () {
                var oSelectedItem = this.byId("T_id_TraineeTable").getSelectedItem();
                var oTraineeModel = oSelectedItem.getBindingContext("traineeModel").getObject();
                this.getRouter().navTo("RouteEmployeeOfferDetails", {
                    sParOffer: oTraineeModel.TraineeName,
                    sParEmployee: oTraineeModel.NameSalutation
                });
            },
            //Trainee search function for filtering
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
                this.readCallForTrainee(params);// read call for trainee after filter
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
            //Traniee certificate mail function
            T_onCerMail: function () {
                var oTraineeEmail = this.getView().getModel("traineeModel").getData()[0].TraineeEmail;
                if (!oTraineeEmail || oTraineeEmail.length === 0) {
                    MessageBox.error("To Email is missing");
                    return;
                }
                var oUploaderDataModel = new JSONModel({
                    isEmailValid: true,
                    ToEmail:oTraineeEmail,
                    CCEmail: this.getView().getModel("CCMailModel").getData()[0].emails,
                    name: "",
                    mimeType: "",
                    content: "",
                    isFileUploaded: false,
                    button: false
                });  
                this.getView().setModel(oUploaderDataModel, "UploaderData");
                this.T_commonOpenDialog("T_MailDialog", "sap.kt.com.minihrsolution.fragment.CommonMail");
                this.validateSendButton();
            },
            
            //Close the mail dialog function
            Mail_onPressClose: function () {
                this.T_MailDialog.destroy();
                this.T_MailDialog = null;
                this.T_MailDialog.close();
            },
            //Handle the file upload function
            Mail_onUpload: function (oEvent) {
                this.handleFileUpload(
                    oEvent, this,
                    "UploaderData", "/attachments", "/name", "/isFileUploaded", "uploadSuccessfull", "fileAlreadyUploaded", "noFileSelected", "fileReadError",
                    () => this.validateSendButton()
                );
            },
            //validation for send button
            validateSendButton: function () {
                const sendBtn = sap.ui.getCore().byId("SendMail_Button");
                const isEmailValid = utils._LCvalidateEmail(sap.ui.getCore().byId("CCMail_TextArea"), "ID");
                const isFileUploaded = this.getView().getModel("UploaderData").getProperty("/isFileUploaded");
                sendBtn.setEnabled(isEmailValid && isFileUploaded);
            },
            //validation for email change        
            Mail_onEmailChange: function () {
                this.validateSendButton();
            },
            //send mail function
            Mail_onSendEmail: function () {
                var oModel = this.getView().getModel("traineeModel").getData();
                var oPayload = {
                    "TraineeName": oModel.TraineeName,
                    "toEmailID": oModel.TraineeEmail,
                    "CC": this.getView().getModel("CCMailModel").getData()[0].emails,
                    "attachments": this.getView().getModel("UploaderData").getProperty("/attachments"),
                };
                this.ajaxCreateWithJQuery("TraineeCertificateEmail", oPayload).then((oData) => {
                    MessageToast.show(this.i18nModel.getText("certificateSuccess"));
                    that.byId("T_id_TraineeTable").removeSelections(true);
                    BusyIndicator.hide();
                }).catch((oError) => {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                    BusyIndicator.hide();
                });
                this.T_MailDialog.close();
            }
        });
    });