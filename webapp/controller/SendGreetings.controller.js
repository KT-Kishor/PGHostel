sap.ui.define(
    [
        "./BaseController", // Import BaseController 
        "../model/formatter", // Import formatter utility
        "sap/m/MessageToast", // Import MessageToast for notifications
    ],
    function(BaseController, Formatter, MessageToast) {
        "use strict";
        return BaseController.extend(
            "sap.kt.com.minihrsolution.controller.SendGreetings", {
                Formatter: Formatter,
                onInit: function() {
                    const oUploadModel = new sap.ui.model.json.JSONModel({
                        File: "",
                        FileName: "",
                        FileType: ""
                    });
                    this.getView().setModel(oUploadModel, "UploadModel");

                    // Token model - only once
                    const oTokenModel = new sap.ui.model.json.JSONModel({
                        tokens: []
                    });
                    this.getView().setModel(oTokenModel, "tokenModel");
                    this.getRouter().getRoute("RouteSendGreetings").attachMatched(this._onRouteMatched, this);
                },

                _onRouteMatched: async function() {
                    try {
                        var LoginFUnction = await this.commonLoginFunction("Greeting");
                        if (!LoginFUnction) return;
                        // i18n Resource
                        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                        this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("sendGreetingsTitle"));

                        // Fetch data
                        await this._fetchCommonData("EmployeeDetails", "EmpDetails");
                        await this._fetchCommonData("ManageCustomer", "ManageCustomerModel");

                        // Create Models
                        this.CreateallEmployeeModel();
                        this.ManageCustomerModel();

                        // Load default Email Type = Employee Offer (index 0)
                        this._loadEmailTypeData("employeeOffer");
                        this.initializeBirthdayCarousel();
                    } catch (error) {
                        this.closeBusyDialog();
                        MessageToast.show(error.message || error.responseText);
                    } finally {
                        this.closeBusyDialog();
                    }
                },

                CreateallEmployeeModel: function() {
                    var empData = this.getView().getModel("EmpDetails").getData() || [];
                    var oFullModel = new sap.ui.model.json.JSONModel(empData);
                    this.getOwnerComponent().setModel(oFullModel, "AllEmployeedataModel");
                },

                ManageCustomerModel: function() {
                    var custData = this.getView().getModel("ManageCustomerModel").getData() || [];
                    var oFullcustDataModel = new sap.ui.model.json.JSONModel(custData);
                    this.getOwnerComponent().setModel(oFullcustDataModel, "AllCustDataModelModel");
                },

                // Called when user switches radio button
                onRadioButtonSelect: function(oEvent) {
                    const oSelectedBtn = oEvent.getSource().getSelectedButton();
                    const sSelectedText = oSelectedBtn.getText();

                    if (sSelectedText.includes(this.i18nModel.getText("employeeOffer"))) {
                        this._loadEmailTypeData("employeeOffer");
                    } else if (sSelectedText.includes(this.i18nModel.getText("contractOffer"))) {
                        this._loadEmailTypeData("contractOffer");
                    } else if (sSelectedText.includes(this.i18nModel.getText("traineeOffer"))) {
                        this._loadEmailTypeData("traineeOffer");
                    } else if (sSelectedText.includes(this.i18nModel.getText("customer"))) {
                        this._loadEmailTypeData("customer");
                    }
                },

                // Helper function: Filter and Bind MultiComboBox Data
                _loadEmailTypeData: function(type) {
                    const oMultiComboBox = this.getView().byId("Wish_id_EmployeeEmail");
                    let aData = [];
                    let oModel;

                    if (type === "employeeOffer" || type === "contractOffer" || type === "traineeOffer") {
                        const empData = this.getOwnerComponent().getModel("AllEmployeedataModel").getData() || [];

                        aData = empData.filter(emp => {
                            // Only Active employees
                            if (emp.EmployeeStatus !== "Active") return false;

                            if (type === "employeeOffer" && emp.EmployeeID.startsWith("KT0")) return true;
                            if (type === "contractOffer" && emp.EmployeeID.startsWith("KT-C")) return true;
                            if (type === "traineeOffer" && emp.EmployeeID.startsWith("KT-T")) return true;

                            return false;
                        }).map(emp => ({
                            key: emp.EmployeeID,
                            text: emp.EmployeeID,
                            additionalText: emp.EmployeeName
                        }));

                    } else if (type === "customer") {
                        const custData = this.getOwnerComponent().getModel("AllCustDataModelModel").getData() || [];
                        aData = custData.map(cust => ({
                            key: cust.name,
                            text: cust.name,
                            additionalText: cust.companyName
                        }));
                    }

                    // Bind to MultiComboBox
                    oModel = new sap.ui.model.json.JSONModel(aData);
                    oMultiComboBox.setModel(oModel);
                    oMultiComboBox.bindItems("/", new sap.ui.core.ListItem({
                        key: "{key}",
                        text: "{text}",
                        additionalText: "{additionalText}"
                    }));

                    // Clear previous selection
                    oMultiComboBox.removeAllSelectedItems();
                    oMultiComboBox.setValueState("None");
                },

                onEmailSelectionChange: function(oEvent) {
                    var oMultiComboBox = oEvent.getSource();
                    var sNewValue = oEvent.getParameter("newValue");
                    if (sNewValue) {
                        oMultiComboBox.setValueState("None");
                    } else {
                        oMultiComboBox.setValueState("Error");
                        oMultiComboBox.setValueStateText(this.i18nModel.getText("selectAtLeastOneRecipient"));
                    }
                },

                // Send email logic
                onSendWishMail: function() {
                    const oView = this.getView();
                    const oMultiComboBox = oView.byId("Wish_id_EmployeeEmail");
                    const oSubject = oView.byId("Wish_id_EmailSubject");
                    const oRTE = oView.byId("Wish_id_EmailBody");

                    const aSelectedItems = oMultiComboBox.getSelectedItems();
                    if (aSelectedItems.length === 0) {
                        sap.m.MessageToast.show("Please select at least one recipient.");
                        oMultiComboBox.setValueState("Error").focus();
                        return;
                    } else {
                        oMultiComboBox.setValueState("None");
                    }

                    // Determine selected radio button type
                    const oSelectedBtn = oView.byId("Wish_id_RadioGroup").getSelectedButton();
                    const sSelectedText = oSelectedBtn ? oSelectedBtn.getText() : "";

                    let toEmails = [];

                    if (sSelectedText.includes(this.i18nModel.getText("employeeOffer")) ||
                        sSelectedText.includes(this.i18nModel.getText("contractOffer")) ||
                        sSelectedText.includes(this.i18nModel.getText("traineeOffer"))) {

                        const empData = this.getOwnerComponent().getModel("AllEmployeedataModel").getData() || [];

                        aSelectedItems.forEach(item => {
                            const selectedKey = item.getKey();
                            const emp = empData.find(e => e.EmployeeID === selectedKey);
                            if (emp && emp.CompanyEmailID) {
                                toEmails.push(emp.CompanyEmailID);
                            }
                        });

                    } else if (sSelectedText.includes(this.i18nModel.getText("customer"))) {

                        const custData = this.getOwnerComponent().getModel("AllCustDataModelModel").getData() || [];

                        aSelectedItems.forEach(item => {
                            const selectedKey = item.getKey();
                            const cust = custData.find(c => c.name === selectedKey);
                            if (cust) {
                                if (cust.customerEmail) toEmails.push(cust.customerEmail);
                                if (cust.mailID) toEmails.push(cust.mailID);
                            }
                        });
                    }

                    if (toEmails.length === 0) {
                        sap.m.MessageToast.show("Please select recipients with valid email addresses.");
                        return;
                    }

                    const subjectValue = oSubject.getValue() || "";
                    const bodyValue = oRTE.getValue() || "";

                    // Validations
                    if (subjectValue.length < 10) {
                        sap.m.MessageToast.show("Subject must be at least 10 characters long.");
                        oSubject.setValueState("Error").focus();
                        return;
                    } else {
                        oSubject.setValueState("None");
                    }

                    if (bodyValue.replace(/<[^>]*>/g, "").trim().length < 20) {
                        sap.m.MessageToast.show("Email body must be at least 20 characters long.");
                        return;
                    }

                    const oUploadModel = this.getView().getModel("UploadModel");
                    const uploadData = oUploadModel ? oUploadModel.getData() : {};

                    const payload = {
                        toEmailID: toEmails.join(","), // multiple emails
                        subject: subjectValue,
                        body: bodyValue,
                        AttachmentFile: uploadData.File || "",
                        AttachmentName: uploadData.FileName || "",
                        AttachmentType: uploadData.FileType || ""
                    };

                    this.getBusyDialog();
                    this.ajaxCreateWithJQuery("SendWishesEmail", payload).then(() => {
                            this.closeBusyDialog();
                            this.clearWishesAttachment();
                            sap.m.MessageToast.show("Email sent successfully!");
                            this.onCancelWishMail();
                        })
                        .catch((oError) => {
                            this.closeBusyDialog();
                            sap.m.MessageToast.show(oError.responseText);
                        });
                },

                onCancelWishMail: function() {
                    const oView = this.getView();
                    oView.byId("Wish_id_EmailSubject").setValue("");
                    oView.byId("Wish_id_EmailBody").setValue("");
                    var oDateMultiBox = this.getView().byId("Wish_id_EmployeeEmail");
                    if (oDateMultiBox) {
                        oDateMultiBox.removeAllSelectedItems();
                    }
                    this.clearWishesAttachment();
                },

               clearWishesAttachment: function() {
                    const oFileUploader = this.getView().byId("Wish_id_jobFileUploader");
                    const oTokenizer = this.getView().byId("Wish_id_tokenizer");
                    const oTokenModel = this.getView().getModel("tokenModel");
                    const oUploadModel = this.getView().getModel("UploadModel");

                    if (oFileUploader) oFileUploader.clear();
                    if (oTokenizer) oTokenizer.removeAllTokens();
                    if (oTokenModel) oTokenModel.setProperty("/tokens", []);
                    if (oUploadModel) oUploadModel.setData({ File: "", FileName: "", FileType: "" });
                },

                onRTEChange: function(oEvent) {
                    const oRTE = oEvent.getSource();
                    this._validateRTE(oRTE);
                },

                _validateRTE: function(oRTE) {
                    const sRTEValue = oRTE.getValue();
                    const iRTELength = sRTEValue.replace(/<[^>]*>/g, "").trim().length;
                    if (iRTELength < 8) {
                        oRTE.addStyleClass("sapUiRTEErrorBorder");
                        return false;
                    } else {
                        oRTE.removeStyleClass("sapUiRTEErrorBorder");
                        return true;
                    }
                },

                onFileSizeExceeds: function() {
                    sap.m.MessageToast.show("File size exceeds the limit (5MB).");
                },

                onFileSelected: function(oEvent) {
                    const oFile = oEvent.getParameter("files")[0];
                    if (!oFile) return;

                    const oTokenModel = this.getView().getModel("tokenModel");
                    let aTokens = oTokenModel.getProperty("/tokens") || [];

                    // Only one file allowed
                    if (aTokens.length >= 1) {
                        sap.m.MessageBox.error("Only one file can be uploaded at a time.");
                        return;
                    }

                    const reader = new FileReader();
                    const that = this;

                    reader.onload = function(e) {
                        const base64 = e.target.result.split(',')[1];
                        const oUploadModel = that.getView().getModel("UploadModel");

                        // Save file in model
                        oUploadModel.setData({
                            File: base64,
                            FileName: oFile.name,
                            FileType: oFile.type
                        });

                        const newTokens = aTokens.concat({ key: oFile.name, text: oFile.name });

                        // Update Tokenizer visually
                        const oTokenizer = that.getView().byId("Wish_id_tokenizer");
                        oTokenizer.removeAllTokens();
                        newTokens.forEach(t => {
                            oTokenizer.addToken(new sap.m.Token({ key: t.key, text: t.text }));
                        });

                        // Keep token model in sync
                        oTokenModel.setProperty("/tokens", newTokens);

                        sap.m.MessageToast.show("File uploaded successfully: " + oFile.name);
                    };

                    reader.readAsDataURL(oFile);

                    // Reset FileUploader input to allow same file re-upload
                    setTimeout(() => {
                        const oFileUploader = that.getView().byId("Wish_id_jobFileUploader");
                        if (oFileUploader && oFileUploader.oFileUpload) {
                            oFileUploader.oFileUpload.value = "";
                        }
                    }, 100);
                },

                onTokenDelete: function(oEvent) {
                    const oTokenModel = this.getView().getModel("tokenModel");
                    let aTokens = oTokenModel.getProperty("/tokens") || [];
                    const aTokensToDelete = oEvent.getParameter("tokens");

                    aTokensToDelete.forEach(function(oDeletedToken) {
                        const sKey = oDeletedToken.getKey();
                        aTokens = aTokens.filter(token => token.key !== sKey);
                    });

                    oTokenModel.setProperty("/tokens", aTokens);

                    if (aTokens.length === 0) {
                        const oUploadModel = this.getView().getModel("UploadModel");
                        oUploadModel.setData({
                            File: "",
                            FileName: "",
                            FileType: ""
                        });
                    }
                },

                onLiveChangeSubject: function(oEvent) {
                    const oInput = oEvent.getSource();
                    const sValue = oInput.getValue();
                    if (sValue.length >= 10) {
                        oInput.setValueState("None");
                    }
                },

                onPressback: function() {
                    this.getRouter().navTo("RouteTilePage"); // Navigate to tile page
                },

                onLogout: function() {
                    this.CommonLogoutFunction(); // Navigate to login page
                },
            }
        );
    }
);