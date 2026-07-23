sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
], function (BaseController, MessageBox, MessageToast, JSONModel, utils, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Document",
        {
            onInit: function () {
                this.getOwnerComponent().getRouter().getRoute("RouteUploadDocs").attachMatched(this._onRouteMatched, this);
                this.initializeLoginModel();

                var oLoginViewModel = new JSONModel({
                    showOTPField: false,
                    isOtpEntered: false,
                    canResendOTP: true,
                    otpTimer: 0,
                    otpButtonText: "Send OTP"
                });
                this.getView().setModel(oLoginViewModel, "LoginViewModel");
            },

            _onRouteMatched: async function (oEvent) {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

                let oArgs;
                if (oEvent && typeof oEvent.getParameter === "function") {
                    oArgs = oEvent.getParameter("arguments") || {};
                    this._pendingDocumentArgs = oArgs;
                } else if (this._pendingDocumentArgs) {
                    oArgs = this._pendingDocumentArgs;
                } else {
                    return;
                }

                const sEncodedCustomerID = oArgs.EncodedCustomerID;
                const sMemberID = oArgs.MemberID;
                const sDecodedCustomerID = this._decodeRoutePart(sEncodedCustomerID);
                const sDecodedMemberID = this._decodeRoutePart(sMemberID);

                if (!sDecodedCustomerID || !sDecodedMemberID) {
                    return this._goToNotFound();
                }

                this._decodedCustomerID = sDecodedCustomerID;
                this._decodedMemberID = sDecodedMemberID;

                try {
                    await this.onSearch(this._decodedMemberID);
                } catch (e) {
                    return this._goToNotFound();
                }

                const oData = this.getView().getModel("BookingView")?.getData() || {};
                const aMembers = oData.Members || [];
                const oOwnerMember = aMembers.find(function (oMember) {
                    return oMember && oMember.UserID;
                }) || {};
                this.sUserID = oOwnerMember.UserID || "";

                if (!this.sUserID) {
                    return this._goToNotFound();
                }

                const bAllUpdated = aMembers.length > 0 && aMembers.every(member =>
                    member.Documents &&
                    member.Documents.length > 0 &&
                    member.Documents.every(doc => doc.Status === "Updated")
                );

                if (bAllUpdated) {
                    return this._goToNotFound();
                }

                try {
                    const oResp = await this.ajaxReadWithJQuery("HM_LoginReadCall", {
                        UserID: this.sUserID
                    });
                    const oUser = oResp?.data?.[0] || {};
                    this._sDocumentEmail = oUser.EmailID || oUser.Email || oOwnerMember.EmailID || oOwnerMember.Email || "";
                } catch (e) {
                    this._sDocumentEmail = oOwnerMember.EmailID || oOwnerMember.Email || "";
                }

                if (!this._isDocumentAccessAllowed()) {
                    this._bPendingDocumentRoute = true;
                    this.getView().addStyleClass("blur-background");

                    MessageBox.information(
                        "Please verify with OTP to access document upload.",
                        {
                            title: "Verification Required",
                            styleClass: "myUnifiedBtn",
                            actions: [MessageBox.Action.OK],
                            emphasizedAction: MessageBox.Action.OK,
                            onClose: function () {
                                this._openOtpDialog();
                            }.bind(this)
                        }
                    );
                    return;
                }

                this._openMemberDialog();

            },
            _goToNotFound: function () {
                this.getOwnerComponent().getRouter().navTo("NotFound", {}, true);
            },

            _decodeRoutePart: function (sValue) {
                if (!sValue) {
                    return "";
                }

                const sEncoded = decodeURIComponent(sValue);
                const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
                if (!base64Regex.test(sEncoded)) {
                    return "";
                }

                try {
                    const sDecoded = atob(sEncoded);
                    return btoa(sDecoded) === sEncoded ? sDecoded : "";
                } catch (e) {
                    return "";
                }
            },

            _openMemberDialog: function () {
                if (!this._oMemberDialog) {
                    this._oMemberDialog = sap.ui.xmlfragment(
                        this.getView().getId(),
                        "sap.ui.com.project1.fragment.MailDocumentUpload",
                        this
                    );

                    this.getView().addDependent(this._oMemberDialog);
                }

                this._oMemberDialog.open();
            },

            _openOtpDialog: function () {
                if (!this._oLoginAlertDialog) {
                    this._oLoginAlertDialog = sap.ui.xmlfragment(
                        this.createId("LoginAlertDialog"),
                        "sap.ui.com.project1.fragment.AdminDetailsSignin",
                        this
                    );
                    this.getView().addDependent(this._oLoginAlertDialog);
                }

                this._oLoginAlertDialog.open();
            },

            _isDocumentAccessAllowed: function () {
                if (!this.sUserID) {
                    return false;
                }

                var bLoggedIn = localStorage.getItem("isLoggedIn") === "true";
                var sLoggedInUserID = this._getLoggedInUserID();
                return bLoggedIn && sLoggedInUserID === this.sUserID;
            },

            _getLoggedInUserID: function () {
                try {
                    var sEncoded = localStorage.getItem("_aB39X");
                    if (!sEncoded) {
                        return "";
                    }
                    return atob(sEncoded) || "";
                } catch (e) {
                    return "";
                }
            },

            _applyVerifiedUserLogin: async function (user) {
                this.initializeLoginModel();

                localStorage.removeItem("isLoggedIn");
                localStorage.removeItem("_x9A1p");
                localStorage.removeItem("_k7LmQ");
                localStorage.removeItem("_aB39X");
                localStorage.removeItem("_mN72P");

                await new Promise(function (resolve) {
                    setTimeout(resolve, 300);
                });

                localStorage.setItem("isLoggedIn", "true");
                localStorage.setItem("_x9A1p", user._x9A1p || "");
                localStorage.setItem("_k7LmQ", user._k7LmQ || "");
                localStorage.setItem("_aB39X", btoa(user.UserID || ""));
                localStorage.setItem("_mN72P", btoa(user.UserName || user.CustomerName || user.VendorName || ""));

                var oUIModel = this.getOwnerComponent().getModel("UIModel");
                if (oUIModel) {
                    oUIModel.setProperty("/isLoggedIn", true);
                }

                var oLoginModel = this.getOwnerComponent().getModel("LoginModel") || new JSONModel({});
                this.getOwnerComponent().setModel(oLoginModel, "LoginModel");
                sap.ui.getCore().setModel(oLoginModel, "LoginModel");
                oLoginModel.setData(Object.assign({}, oLoginModel.getData() || {}, {
                    isLoggedIn: true,
                    EmployeeID: user.UserID || "",
                    UserID: user.UserID || "",
                    Salutation: user.Salutation || "",
                    EmployeeName: user.UserName || user.CustomerName || user.VendorName || "",
                    UserName: user.UserName || user.CustomerName || user.VendorName || "",
                    EmailID: user.EmailID || user.Email || "",
                    Role: user.Role || "",
                    BranchCode: user.BranchCode || "",
                    STDCode: user.STDCode || "",
                    MobileNo: user.MobileNo || user.Mobile || "",
                    Gender: user.Gender || "",
                    Country: user.Country || "",
                    State: user.State || "",
                    City: user.City || "",
                    Address: user.Address || ""
                }));
            },

            onFileUpload: async function (oEvent) {
                const oModel = this.getView().getModel("BookingView");
                const oUploader = sap.ui.getCore().byId("AD_id_FileUploader");
                const oDocumentTypeCombo = sap.ui.getCore().byId("AD_id_DocumentType");

                const file = oEvent.getParameter("files")?.[0];
                if (!file) return;

                const sDocType = oModel.getProperty("/NewMemberDraft/Documents/0/DocumentType");
                if (!sDocType) {
                    sap.m.MessageToast.show("Please select document type first");
                    if (oUploader) oUploader.clear();
                    return;
                }

                const sFileName = file.name || "";
                const sExt = sFileName.includes(".") ? sFileName.split(".").pop().toLowerCase() : "";
                const bAllowedExt = ["jpg", "jpeg", "png", "webp", "pdf"].includes(sExt);
                if (!bAllowedExt) {
                    sap.m.MessageToast.show("Only PDF, JPG, JPEG, PNG, WEBP allowed");
                    if (oUploader) oUploader.clear();
                    return;
                }

                const sTempId = this._addBusyProcessingRow();
                this._showBusyOnUploader(true);

                let processedFile = file;
                const MAX_SIZE_MB = 2;
                const fileSizeMB = file.size / (1024 * 1024);
                const isImage = file.type === "image/jpeg" || file.type === "image/jpg" || file.type === "image/png";

                try {
                    if (fileSizeMB > MAX_SIZE_MB && isImage) {
                        if (typeof imageCompression === "undefined") {
                            throw new Error("Compression library missing");
                        }
                        this.getBusyDialog();
                        const options = {
                            maxSizeMB: 1.9,
                            maxWidthOrHeight: 1920,
                            useWebWorker: true,
                            initialQuality: 0.95
                        };
                        processedFile = await imageCompression(file, options);
                        this.closeBusyDialog();
                    } else if (fileSizeMB > MAX_SIZE_MB && !isImage) {
                        sap.m.MessageToast.show(file.name + " exceeds the 2 MB size limit.");
                        if (oUploader) oUploader.clear();
                        this._removeProcessingRow(sTempId);
                        this._showBusyOnUploader(false);
                        oModel.setProperty("/NewMemberDraft/Documents/0/ProcessingActive", false);
                        return;
                    }

                    const base64 = await new Promise(function (resolve, reject) {
                        const reader = new FileReader();
                        reader.onload = function () { resolve(reader.result.split(",")[1]); };
                        reader.onerror = reject;
                        reader.readAsDataURL(processedFile);
                    });

                    let sNewName = sDocType.toLowerCase().replace(/[^a-z0-9]/g, "_");
                    sNewName += "." + sExt;

                    this._removeProcessingRow(sTempId);

                    oModel.setProperty("/NewMemberDraft/Documents/0/FileName", sNewName);
                    oModel.setProperty("/NewMemberDraft/Documents/0/FileType", processedFile.type || "");
                    oModel.setProperty("/NewMemberDraft/Documents/0/File", base64);
                    if (oDocumentTypeCombo) {
                        oDocumentTypeCombo.setValueState("None");
                    }
                    oModel.refresh(true);

                } catch (err) {
                    this.closeBusyDialog();
                    this._removeProcessingRow(sTempId);
                    console.error(err);
                    sap.m.MessageBox.error(err.message || "Compression failed. Please try a smaller file.");
                } finally {
                    if (oUploader) oUploader.clear();
                    this._showBusyOnUploader(false);
                    oModel.setProperty("/NewMemberDraft/Documents/0/ProcessingActive", false);
                }
            },

            _addBusyProcessingRow: function () {
                const oModel = this.getView().getModel("BookingView");
                const sTempId = "__processing__" + Date.now();
                oModel.setProperty("/NewMemberDraft/Documents/0/FileName", "Compressing...");
                oModel.setProperty("/NewMemberDraft/Documents/0/FileType", "");
                oModel.setProperty("/NewMemberDraft/Documents/0/File", "");
                oModel.setProperty("/NewMemberDraft/Documents/0/ProcessingActive", true);
                oModel.setProperty("/NewMemberDraft/Documents/0/tempId", sTempId);
                oModel.refresh(true);
                return sTempId;
            },

            _removeProcessingRow: function (sTempId) {
                const oModel = this.getView().getModel("BookingView");
                const sCurrentTempId = oModel.getProperty("/NewMemberDraft/Documents/0/tempId");
                if (sCurrentTempId === sTempId) {
                    oModel.setProperty("/NewMemberDraft/Documents/0/FileName", "");
                    oModel.setProperty("/NewMemberDraft/Documents/0/FileType", "");
                    oModel.setProperty("/NewMemberDraft/Documents/0/File", "");
                    oModel.setProperty("/NewMemberDraft/Documents/0/tempId", "");
                }
            },

            _showBusyOnUploader: function (bBusy) {
                const oUploader = sap.ui.getCore().byId("AD_id_FileUploader");
                if (oUploader) {
                    oUploader.setBusy(bBusy);
                }
            },

            onEditMemberFromDialog: function (oEvent) {

                if (!this.MM_Dialog) {

                    var oView = this.getView();

                    this.MM_Dialog = sap.ui.xmlfragment(
                        "sap.ui.com.project1.fragment.Memberadd",
                        this
                    );

                    oView.addDependent(this.MM_Dialog);
                }


                this._mode === "UPDATE"

                var oContext = oEvent.getSource().getBindingContext("BookingView");

                var oData = oContext.getObject();

                // Store selected row path
                this._sEditPath = oContext.getPath();

                // Deep Copy
                var oCopyData = JSON.parse(JSON.stringify(oData));

                // Ensure Documents array exists
                if (!oCopyData.Documents || !oCopyData.Documents.length) {

                    oCopyData.Documents = [{
                        DocumentID: "",
                        DocumentType: "",
                        FileName: "",
                        FileType: "",
                        File: ""
                    }];
                }

                var oRelationCombo = sap.ui.getCore().byId("AD_id_MemberRelationCombo");
                if (oCopyData.Relation === "Self") {
                    oRelationCombo.setValue("Self");
                }

                // Format DOB
                oCopyData.DateOfBirth = oCopyData.DateOfBirth ? oCopyData.DateOfBirth.split("-").reverse().join("/") : "";

                // Set Draft Data
                this.getView().getModel("BookingView").setProperty("/NewMemberDraft", oCopyData);

                // ================= SET CONTROL VALUES =================

                sap.ui.getCore().byId("AD_id_DocumentType").setSelectedKey(oCopyData.Documents[0].DocumentType || "").setValueState("None");
                sap.ui.getCore().byId("AD_id_FileUploader").setValue(oCopyData.Documents[0].FileName || "").setValueState("None");
                sap.ui.getCore().byId("AD_id_MemberDOB").setValue(oCopyData.DateOfBirth || "").setValueState("None");
                sap.ui.getCore().byId("AD_id_MemberGenderCombo").setSelectedKey(oCopyData.Gender || "").setValueState("None");
                sap.ui.getCore().byId("AD_id_MemberRelationCombo").setSelectedKey(oCopyData.Relation || "").setValueState("None");
                sap.ui.getCore().byId("AD_id_MemberName").setValue(oCopyData.Name || "").setValueState("None");
                sap.ui.getCore().byId("AD_idSelect").setSelectedKey(oCopyData.Salutation || "").setValueState("None");

                this.MM_Dialog.open();
            },
            onSaveNewMember: function () {

                var oView = sap.ui.getCore();

                var oMember = this.getView().getModel("BookingView").getProperty("/NewMemberDraft");

                var oDocumentTypeCombo = oView.byId("AD_id_DocumentType");
                var oDocument = oMember.Documents && oMember.Documents[0] ? oMember.Documents[0] : {};
                var sDocumentTypeValue = String(
                    oDocumentTypeCombo.getSelectedKey() ||
                    oDocumentTypeCombo.getValue() ||
                    oDocument.DocumentType ||
                    ""
                ).trim();

                if (utils._LCstrictValidationComboBox(oView.byId("AD_idSelect"), "ID") &&
                    utils._LCvalidateMandatoryField(oView.byId("AD_id_MemberName"), "ID") &&
                    utils._LCvalidateDate(oView.byId("AD_id_MemberDOB"), "ID") &&
                    utils._LCstrictValidationComboBox(oView.byId("AD_id_MemberGenderCombo"), "ID") &&
                    (oMember.Relation === "Self" ||
                        utils._LCstrictValidationComboBox(oView.byId("AD_id_MemberRelationCombo"), "ID")
                    )
                ) {

                    // ================= DOCUMENT VALIDATION =================

                    if (sDocumentTypeValue && !utils._LCstrictValidationComboBox(oDocumentTypeCombo, "ID")) {
                        sap.m.MessageToast.show(this.i18nModel.getText("fillMandatoryFields"));
                        return;
                    }

                    if (sDocumentTypeValue && !oDocument.File) {
                        oDocumentTypeCombo.setValueState("Error");
                        oDocumentTypeCombo.setValueStateText("Please upload the selected document");

                        sap.m.MessageToast.show(
                            "Please upload the selected document or clear the document type."
                        );

                        return;
                    }

                    oDocumentTypeCombo.setValueState("None");

                    // ================= MEMBER ID =================

                    if (this._mode === "CREATE") {

                        oMember.MemberID =
                            this._generateMemberID();
                    }

                    // ================= PAYLOAD =================

                    const oPayload = {
                        Members: [{
                            MemberID: oMember.MemberID || "",
                            Salutation: oMember.Salutation,
                            Name: oMember.Name,
                            Relation: oMember.Relation,
                            Gender: oMember.Gender,
                            UserID: oMember.UserID,
                            DateOfBirth: oMember.DateOfBirth ? oMember.DateOfBirth.split("/").reverse().join("-") : "",
                            Status: "Updated",
                            Documents: [{
                                DocumentID: oMember.Documents?.[0]?.DocumentID || "",
                                MemberID: oMember.MemberID || "",
                                UserID: oMember.UserID || "",
                                DocumentType: oMember.Documents?.[0]?.DocumentType || "",
                                FileName: oMember.Documents?.[0]?.FileName || "",
                                FileType: oMember.Documents?.[0]?.FileType || "",
                                File: oMember.Documents?.[0]?.File || ""
                            }]
                        }]
                    };

                    this._uploadNewMemberDocument(oPayload);

                } else {

                    sap.m.MessageToast.show(
                        this.i18nModel.getText(
                            "fillMandatoryFields"
                        )
                    );
                }
            },
            _uploadNewMemberDocument: function (oDoc) {


                const isCreate =
                    this._mode === "CREATE";

                const oModel = this.getView().getModel("BookingView");

                const oDraft = oModel.getProperty(
                    "/NewMemberDraft"
                );




                // ================= CREATE =================


                if (this._sEditPath) {

                    oModel.setProperty(
                        this._sEditPath,
                        oDraft
                    );
                }

                oModel.refresh(true);


                this.MM_Dialog.close();

                sap.m.MessageToast.show("Document uploaded successfully");
            },
            onRemoveButtonPress: function () {

                const oModel = this.getView().getModel("BookingView");
                oModel.setProperty("/NewMemberDraft/Documents/0/FileName", "");
                oModel.setProperty("/NewMemberDraft/Documents/0/FileType", "");
                oModel.setProperty("/NewMemberDraft/Documents/0/File", "");
                oModel.setProperty("/NewMemberDraft/Documents/0/DocumentType", "");
                oModel.refresh(true);

                const oFileUploader = sap.ui.getCore().byId("AD_id_FileUploader");

                if (oFileUploader) {
                    oFileUploader.clear();
                }
            },


            onSearch: async function (_decodedMemberID) {
                this.getBusyDialog();
                try {
                    var item = await this.ajaxReadWithJQuery("HM_MemberDoc", {
                        MemberIDs: [_decodedMemberID || this._decodedMemberID].join(",").replace(/\s+/g, "")
                    });

                    var aMember = Array.isArray(item.data) ?
                        item.data : [item.data];

                    var oMemberModel = new sap.ui.model.json.JSONModel({
                        Members: aMember
                    });

                    this.getView().setModel(oMemberModel, "BookingView");
                    return aMember;
                } finally {
                    this.closeBusyDialog();
                }
            },

            BI_onButtonPress: function () {
                this.getOwnerComponent().getRouter().navTo("RouteHostel");
            },

            onFileSelected: function (oEvent) {
                const oFile = oEvent.getParameter("files")[0];
                if (!oFile) return;

                const sDocType = this.getView().getModel("Bookingmodel").getProperty("/DocumentType");
                if (!sDocType) {
                    sap.m.MessageToast.show("Please select Document Type first");
                    oEvent.getSource().clear();
                    return;
                }
                const MAX_SIZE = 2 * 1024 * 1024;
                if (oFile.size > MAX_SIZE) {
                    sap.m.MessageToast.show("File must be less than 2MB.Selected: " +
                        (oFile.size / 1024 / 1024).toFixed(2) + " MB"
                    );
                    oEvent.getSource().clear();
                    return;
                }
                const oModel = this.getView().getModel("UploaderData");
                let aFiles = oModel.getProperty("/attachments")

                if (aFiles.find(file => file.fileType === sDocType)) {
                    sap.m.MessageToast.show("This file type already added");
                    oEvent.getSource().clear();
                    return;
                }
                const oReader = new FileReader();
                oReader.onload = (oLoadEvent) => {
                    const oModel = this.getView().getModel("UploaderData");
                    let aFiles = oModel.getProperty("/attachments") || [];
                    const isDuplicate = aFiles.some(file => file.filename === oFile.name);
                    if (isDuplicate) {
                        sap.m.MessageToast.show("File already added");
                        return;
                    }
                    aFiles.push({
                        filename: oFile.name,
                        fileType: oFile.type,
                        size: oFile.size,
                        documentType: sDocType,
                        content: oLoadEvent.target.result.split(',')[1]
                    });
                    oModel.setProperty("/attachments", aFiles);
                    oEvent.getSource().clear();
                };
                oReader.readAsDataURL(oFile);
            },

            onpressSave: function () {
                const oModel = this.getView().getModel("UploaderData");
                const aFiles = oModel.getProperty("/attachments");

                if (!aFiles || aFiles.length === 0) {
                    sap.m.MessageToast.show("Please add at least one document");
                    return;
                }

                if (!this._decodedCustomerID) {
                    sap.m.MessageBox.error("Invalid Customer ID");
                    return;
                }

                aFiles.forEach(item => {
                    let Payload = {
                        data: {
                            CustomerID: this._decodedCustomerID, // ✅ dynamic
                            DocumentType: item.documentType,
                            FileName: item.filename,
                            FileType: item.fileType,
                            File: item.content
                        }
                    };

                    this.ajaxCreateWithJQuery("HM_CustomerDocument", Payload)
                        .catch(() => {
                            sap.m.MessageBox.error("Failed to save document");
                        });
                });

                sap.m.MessageBox.information("Document saved successfully", {
                    title: "Success",
                    actions: [sap.m.MessageBox.Action.OK],
                    emphasizedAction: sap.m.MessageBox.Action.OK,
                    styleClass: "myUnifiedBtn",
                    onClose: function (sAction) {
                        if (sAction === sap.m.MessageBox.Action.OK) {
                            this.getOwnerComponent().getRouter().navTo("RouteHostel");
                        }
                    }.bind(this)
                });
            },
            MS_viewimagetable: function (oEvent) {
                this.tableview = true
                this.MS_viewimage(oEvent)
            },
            MS_viewimagefragment: function (oEvent) {
                this.tableview = false
                this.MS_viewimage(oEvent)
            },

            MS_viewimage: function (oEvent) {
                let oDraft;
                if (this.tableview === true) {
                    oDraft = oEvent.getSource()
                        .getBindingContext("BookingView")
                        ?.getObject();
                } else {
                    oDraft = this.getView().getModel("BookingView").getProperty("/NewMemberDraft")
                }

                const oDocument = oDraft?.Documents?.[0];

                if (!oDocument?.File) {
                    sap.m.MessageToast.show("No document available");
                    return;
                }

                this._previewDocument({
                    File: oDocument.File || "",
                    Document: oDocument.File || "",
                    Attachment: oDocument.File || "",
                    FileType: oDocument.FileType || "",
                    MimeType: oDocument.FileType || "",
                    FileName: oDocument.FileName || "",
                    DocumentName: oDocument.FileName || ""
                });
            },

            _bufferToBase64: function (oFileBuffer) {
                if (!(oFileBuffer && typeof oFileBuffer === "object" && oFileBuffer.type === "Buffer" && Array.isArray(oFileBuffer.data))) {
                    return oFileBuffer || "";
                }

                try {
                    const aBytes = oFileBuffer.data;
                    const iChunkSize = 0x8000;
                    let sBinary = "";

                    for (let i = 0; i < aBytes.length; i += iChunkSize) {
                        const aChunk = aBytes.slice(i, i + iChunkSize);
                        sBinary += String.fromCharCode.apply(null, aChunk);
                    }

                    return btoa(sBinary);
                } catch (e) {
                    console.warn("[_bufferToBase64] Failed to convert Buffer to base64:", e);
                    return "";
                }
            },

            _previewDocument: async function (oDoc) {

                const oNormalizedDoc = {
                    File: this._bufferToBase64(oDoc?.File),
                    Document: this._bufferToBase64(oDoc?.Document),
                    Attachment: this._bufferToBase64(oDoc?.Attachment),
                    FileType: oDoc?.FileType || "",
                    MimeType: oDoc?.MimeType || "",
                    FileName: oDoc?.FileName || "",
                    DocumentName: oDoc?.DocumentName || ""
                };

                const sRawSource = String(
                    oNormalizedDoc?.File ||
                    oNormalizedDoc?.Document ||
                    oNormalizedDoc?.Attachment ||
                    ""
                ).trim();

                if (!sRawSource) {

                    sap.m.MessageToast.show(
                        "No document to preview."
                    );

                    return;
                }

                const aDataUrlParts =
                    /^data:([^;]+);base64,(.+)$/i.exec(
                        sRawSource
                    );

                const sRawBase64 = aDataUrlParts ?
                    aDataUrlParts[2] :
                    sRawSource;

                const normalizeBase64 = function (sValue) {

                    let sNormalized = String(sValue || "")
                        .replace(/\s/g, "")
                        .replace(/-/g, "+")
                        .replace(/_/g, "/");

                    const iRemainder =
                        sNormalized.length % 4;

                    if (iRemainder) {

                        sNormalized += "=".repeat(
                            4 - iRemainder
                        );
                    }

                    return sNormalized;
                };

                const autoDecodeBase64 = function (sValue) {

                    if (!sValue) {
                        return "";
                    }

                    // Normalize up front so URL-safe chars / missing padding
                    // don't make the first atob() throw.
                    let current = normalizeBase64(sValue);

                    for (let i = 0; i < 10; i++) {

                        // Already detected encoded file signatures
                        if (
                            current.startsWith("iVB") ||      // PNG
                            current.startsWith("/9j") ||      // JPG
                            current.startsWith("JVBER") ||    // PDF
                            current.startsWith("UklGR")       // WEBP
                        ) {
                            return current;
                        }

                        let decoded;

                        try {

                            decoded = atob(current);

                        } catch (e) {

                            // current is not valid base64. Return the last
                            // known-good value rather than propagating a
                            // corrupted/undecodable string into the data URL.
                            return current;
                        }

                        // RAW PDF bytes
                        if (decoded.startsWith("%PDF")) {
                            return btoa(decoded);
                        }

                        // RAW PNG bytes
                        if (
                            decoded.length > 4 &&
                            decoded.charCodeAt(0) === 137 &&
                            decoded.charCodeAt(1) === 80
                        ) {
                            return btoa(decoded);
                        }

                        // RAW JPEG bytes
                        if (
                            decoded.length > 3 &&
                            decoded.charCodeAt(0) === 255 &&
                            decoded.charCodeAt(1) === 216
                        ) {
                            return btoa(decoded);
                        }

                        // Only keep unwrapping if the decoded payload is
                        // itself another base64 string; otherwise stop and
                        // return the current (valid) base64 layer.
                        const next = normalizeBase64(decoded);

                        if (
                            next === current ||
                            !/^[A-Za-z0-9+/]+={0,2}$/.test(next)
                        ) {
                            return current;
                        }

                        current = next;
                    }

                    return current;
                };

                const sBase64 = normalizeBase64(
                    autoDecodeBase64(sRawBase64)
                );

                let sMimeType = String(
                    oDoc.FileType ||
                    oDoc.MimeType ||
                    ""
                ).toLowerCase().trim();

                if (!sMimeType && aDataUrlParts) {

                    sMimeType = String(
                        aDataUrlParts[1] || ""
                    ).toLowerCase();
                }

                // ================= MIME TYPE =================

                if (
                    sMimeType === "pdf" ||
                    sMimeType === ".pdf"
                ) {

                    sMimeType = "application/pdf";

                } else if (
                    sMimeType === "jpg" ||
                    sMimeType === "jpeg" ||
                    sMimeType === ".jpg" ||
                    sMimeType === ".jpeg"
                ) {

                    sMimeType = "image/jpeg";

                } else if (
                    sMimeType === "png" ||
                    sMimeType === ".png"
                ) {

                    sMimeType = "image/png";

                } else if (
                    sMimeType === "webp" ||
                    sMimeType === ".webp"
                ) {

                    sMimeType = "image/webp";
                }

                // ================= AUTO DETECT =================

                if (!sMimeType) {

                    if (sBase64.startsWith("iVB")) {

                        sMimeType = "image/png";

                    } else if (sBase64.startsWith("/9j")) {

                        sMimeType = "image/jpeg";

                    } else if (sBase64.startsWith("UklGR")) {

                        sMimeType = "image/webp";

                    } else if (sBase64.startsWith("JVBER")) {

                        sMimeType = "application/pdf";
                    }
                }


                this._sPreviewFileName = oDoc.FileName || "Document Preview";
                this._sPreviewMimeType = sMimeType;
                this._sPreviewBase64 = sBase64;
                if (this._oPreviewDialog) {
                    this._oPreviewDialog.destroy();
                    this._oPreviewDialog = null;
                }

                // Load Fragment
                if (!this._oPreviewDialog) {

                    this._oPreviewDialog =
                        await sap.ui.core.Fragment.load({

                            id: this.getView().getId(),

                            name: "sap.ui.com.project1.fragment.DocumentPreview",

                            controller: this
                        });

                    this.getView().addDependent(
                        this._oPreviewDialog
                    );
                }

                const oDialog =
                    sap.ui.core.Fragment.byId(
                        this.getView().getId(),
                        "previewDialog"
                    );

                const oImage =
                    sap.ui.core.Fragment.byId(
                        this.getView().getId(),
                        "previewImage"
                    );

                const oHtml =
                    sap.ui.core.Fragment.byId(
                        this.getView().getId(),
                        "previewHtml"
                    );


                oImage.setVisible(false);
                oHtml.setVisible(false);
                oHtml.setContent("");
                if (this._pdfBlobUrl) {

                    URL.revokeObjectURL(
                        this._pdfBlobUrl
                    );

                    this._pdfBlobUrl = null;
                }


                // ================= IMAGE PREVIEW =================



                if (sMimeType.indexOf("image/") === 0) {
                    const sImageSrc = `data:${sMimeType};base64,${sBase64}`;


                    // Create a temporary image to detect orientation and dimensions
                    const oImg = new Image();

                    oImg.onload = function () {

                        const viewportW = window.innerWidth * 0.8;
                        const viewportH = window.innerHeight * 0.8;

                        const imgRatio = oImg.width / oImg.height;

                        let finalWidth = viewportW;
                        let finalHeight = viewportW / imgRatio;

                        if (finalHeight > viewportH) {
                            finalHeight = viewportH;
                            finalWidth = viewportH * imgRatio;
                        }

                        const oHtml = new sap.ui.core.HTML({
                            sanitizeContent: false,
                            content: `
            <div class="preview-image-container">
                <img src="${sImageSrc}" />
            </div>
        `
                        });

                        this._oComplaintPreviewDialog = new sap.m.Dialog({
                            title: oDoc.FileName || "Document Preview",
                            contentWidth: finalWidth + "px",
                            contentHeight: finalHeight + "px",
                            draggable: true,
                            resizable: true,
                            contentPadding: "0rem",
                            horizontalScrolling: false,
                            verticalScrolling: false,
                            content: [oHtml],
                            beginButton: new sap.m.Button({
                                text: "Close",
                                addstyleClass: "myUnifiedBtn",
                                press: () => this._oComplaintPreviewDialog.close()
                            }),
                            afterClose: () => {
                                this._oComplaintPreviewDialog.destroy();
                                this._oComplaintPreviewDialog = null;
                            }
                        });

                        this.getView().addDependent(this._oComplaintPreviewDialog);
                        this._oComplaintPreviewDialog.open();

                    }.bind(this);

                    oImg.src = sImageSrc;
                    return;
                }

                // ================= PDF PREVIEW =================


                if (sMimeType === "application/pdf") {
                    const byteCharacters = atob(sBase64);
                    const byteArrays = [];

                    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                        const slice = byteCharacters.slice(offset, offset + 512);
                        const byteNumbers = new Array(slice.length);
                        for (let i = 0; i < slice.length; i++) {
                            byteNumbers[i] = slice.charCodeAt(i);
                        }

                        byteArrays.push(new Uint8Array(byteNumbers));
                    }

                    const blob = new Blob(byteArrays, { type: "application/pdf" });
                    const sBlobUrl = URL.createObjectURL(blob);
                    this._pdfBlobUrl = sBlobUrl;

                    if (sap.ui.Device.system.phone) {
                        const oLink = document.createElement("a");
                        oLink.href = sBlobUrl;
                        oLink.download = sFileName;
                        document.body.appendChild(oLink);
                        oLink.click();
                        document.body.removeChild(oLink);

                        MessageToast.show("File downloaded successfully");
                        return;
                    }

                    const sIframe = `
                <div style="
                width:100%;
                height:100%;
                overflow:hidden;
                display:flex;
                ">

                <iframe
                src="${sBlobUrl}#toolbar=0&navpanes=0&scrollbar=0"

                style="
                border:none;
                width:100%;
                height:100%;
                display:block;
                overflow:hidden;
                "

                scrolling="auto"
                allowfullscreen>
                </iframe>

                </div>
                `;

                    oDialog.setContentWidth("85%");
                    oDialog.setContentHeight("90%");
                    oHtml.setContent(sIframe);
                    oDialog.setTitle(oDoc.FileName);
                    oHtml.setVisible(true);
                    oDialog.open();
                    return;
                }
                this.onDownloadPreview();
                sap.m.MessageToast.show(
                    "Unsupported document format."
                );
            },
            onCloseNewMemberDialog: function () {
                this.MM_Dialog.close();
            },
            onDownloadPreview: function () {

                if (!this._sPreviewBase64) {

                    MessageToast.show(
                        "No file available for download."
                    );

                    return;
                }

                let sDownloadUrl = "";

                // PDF
                if (this._sPreviewMimeType === "application/pdf") {
                    sDownloadUrl = this._pdfBlobUrl;
                }

                // IMAGE
                else if (this._sPreviewMimeType.startsWith("image/")) {
                    sDownloadUrl = `data:${this._sPreviewMimeType};base64,${this._sPreviewBase64}`;
                }

                if (!sDownloadUrl) {
                    MessageToast.show("Download not supported.");
                    return;
                }

                const oLink = document.createElement("a");
                oLink.href = sDownloadUrl;
                oLink.download = this._sPreviewFileName || "Document";
                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);
            },

            onClosePreview: function () {

                if (this._pdfBlobUrl) {

                    URL.revokeObjectURL(
                        this._pdfBlobUrl
                    );

                    this._pdfBlobUrl = null;
                }

                this._sPreviewBase64 = null;
                this._sPreviewMimeType = null;
                this._sPreviewFileName = null;

                if (this._oPreviewDialog) {
                    this._oPreviewDialog.close();
                    this._oPreviewDialog.destroy();
                    this._oPreviewDialog = null;
                }
            },
            onNewMemberSalutationChange: function (oEvent) {
                const oSalutation = oEvent.getSource();
                const sKey = oSalutation.getSelectedKey();
                const oGender = sap.ui.getCore().byId("AD_id_MemberGenderCombo");
                // Clear salutation error immediately
                oSalutation.setValueState("None");
                if (!oGender) return;
                // Reset gender first
                oGender.setSelectedKey("");
                oGender.setEnabled(true);
                // Auto-map gender
                if (sKey === "Mr.") {
                    oGender.setSelectedKey("Male");
                    oGender.setEnabled(false);
                } else if (sKey === "Ms." || sKey === "Mrs.") {
                    oGender.setSelectedKey("Female");
                    oGender.setEnabled(false);
                }
                // Dr. → manual gender selection

                // Strict validation (CONTROL, not event)
                utils._LCstrictValidationSelect(oSalutation);
            },
            onNewMemberNameChange: function (oEvent) {
                return utils._LCvalidateName(oEvent);
            },
            onNewMemberDOBChange: function (oEvent) {
                utils._LCvalidateDate(oEvent);
            },
            onNewMemberGenderChange: function (oEvent) {
                return utils._LCstrictValidationComboBox(oEvent);
            },
            onNewMemberRelationChange: function (oEvent) {
                return utils._LCstrictValidationComboBox(oEvent);
            },
            onNewMemberDocumentTypeChange: function (oEvent) {

                const oComboBox = oEvent.getSource();

                const sValue = String(oComboBox.getValue() || "").trim();

                if (!sValue) {
                    oComboBox.setSelectedKey("");
                    oComboBox.setValue("");
                    oComboBox.setValueState("None");
                    this.getView().getModel("BookingView").setProperty("/NewMemberDraft/Documents/0/DocumentType", "");
                    return true;
                }

                return utils._LCstrictValidationComboBox(oComboBox, "ID");
            },

            // OnSubmit: function () {

            //     var oController = this;

            //     MessageBox.information("Documents submitted successfully", {
            //         title: "Success",
            //         actions: [MessageBox.Action.OK],
            //         emphasizedAction: MessageBox.Action.OK,
            //         styleClass: "myUnifiedBtn",
            //         onClose: function (sAction) {
            //             if (sAction === MessageBox.Action.OK) {
            //                 oController.getOwnerComponent()
            //                     .getRouter()
            //                     .navTo("RouteHostel");
            //                 if (oController._oMemberDialog) {
            //                     oController._oMemberDialog.destroy();
            //                     oController._oMemberDialog = null;
            //                 }
            //             }
            //         }
            //     });


            // },
            OnSubmit: function () {
                var oController = this;

                // Get Members data from model
                var aMembers = this.getView().getModel("BookingView").getProperty("/Members") || [];

                // Create Payload
                const oPayload = {
                    Members: aMembers.map(function (oMember) {

                        const oDoc = oMember.Documents?.[0];

                        return {
                            MemberID: oMember.MemberID || "",
                            Salutation: oMember.Salutation || "",
                            Name: oMember.Name || "",
                            Relation: oMember.Relation || "",
                            Gender: oMember.Gender || "",
                            UserID: oMember.UserID || "",
                            DateOfBirth: oMember.DateOfBirth
                                ? oMember.DateOfBirth.split("/").reverse().join("-")
                                : "",

                            Documents: oDoc ? [{
                                DocumentID: oDoc.DocumentID || "",
                                MemberID: oMember.MemberID || "",
                                UserID: oMember.UserID || "",
                                DocumentType: oDoc.DocumentType || "",
                                FileName: oDoc.FileName || "",
                                FileType: oDoc.FileType || "",
                                File: oDoc.File || "",
                                Status: "Updated"
                            }] : []
                        };
                    })
                };


                // Call CAP/OData Service
                this.ajaxUpdateWithJQuery(
                    "HM_Document", {
                    data: [oPayload],

                }
                );
                MessageBox.information("Documents submitted successfully", {
                    title: "Success",
                    actions: [MessageBox.Action.OK],
                    emphasizedAction: MessageBox.Action.OK,
                    styleClass: "myUnifiedBtn",
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {

                            if (oController._oMemberDialog) {
                                oController._oMemberDialog.destroy();
                                oController._oMemberDialog = null;
                            }
                            oController.CommonLogoutFunction();
                        }
                    }
                });

            },

            onEmailliveChange: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
            },

            onLoginOtpLive: function (oEvent) {
                const vm = this.getView().getModel("LoginViewModel");
                const input = oEvent.getSource();
                let val = oEvent.getParameter("value").replace(/\D/g, "");

                if (val.length > 6) {
                    val = val.slice(0, 6);
                }

                input.setValue(val);
                vm.setProperty("/isOtpEntered", val.length === 6);

                if (!val) {
                    input.setValueState("None");
                } else if (val.length !== 6) {
                    input.setValueState("Error");
                    input.setValueStateText(this.i18nModel.getText("entervaliddigitOTP"));
                } else {
                    input.setValueState("None");
                }
            },

            onPressOTP: async function () {
                const oEmailIDCtrl = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "emailInput");
                const sEmail = oEmailIDCtrl?.getValue()?.trim();

                if (!utils._LCvalidateEmail(oEmailIDCtrl, "ID")) {
                    MessageToast.show(this.i18nModel.getText("MSenterValidEmail"));
                    return;
                }

                if (!this._sDocumentEmail || sEmail.toLowerCase() !== this._sDocumentEmail.toLowerCase()) {
                    oEmailIDCtrl.setValueState("Error");
                    oEmailIDCtrl.setValueStateText("Entered email does not match the email associated with this link.");
                    MessageToast.show("Entered email does not match the email associated with this link.");
                    return;
                }

                oEmailIDCtrl.setValueState("None");

                const payload = {
                    EmailID: sEmail,
                    Type: "OTP"
                };

                this.getBusyDialog();
                try {
                    const oResp = await this.ajaxCreateWithJQuery("HostelSendOTP", payload);

                    if (oResp?.success) {
                        MessageToast.show(oResp.message || this.i18nModel.getText("oTPSentCheckyourEmail"));
                        this._oResetUser = { EmailID: sEmail };

                        const oOtpCtrl = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "otpInput");
                        if (oOtpCtrl) {
                            oOtpCtrl.setValue("");
                            oOtpCtrl.setValueState("None");
                            oOtpCtrl.setValueStateText("");
                            oOtpCtrl.focus();
                        }

                        this._startOtpTimer();
                    } else {
                        MessageToast.show(oResp?.message || this.i18nModel.getText("usernotFoundUnabletoSendOTP"));
                    }
                } catch (err) {
                    const sMsg = err?.responseJSON?.message || err?.message || this.i18nModel.getText("forgotOtpSendFailed");
                    MessageToast.show(sMsg);
                } finally {
                    this.closeBusyDialog();
                }
            },

            _verifyOTPWithBackend: async function (otp) {
                this.getBusyDialog();
                try {
                    const oResp = await this.ajaxReadWithJQuery("HM_Login", {
                        EmailID: this._oResetUser?.EmailID,
                        OTP: otp.trim()
                    });

                    if (oResp?.success === true) {
                        this._oVerifiedUser = oResp?.data?.[0] || null;
                    }

                    return oResp?.success === true;
                } catch (err) {
                    return false;
                } finally {
                    this.closeBusyDialog();
                }
            },

            onSignIn: async function () {
                const oFragment = this._oLoginAlertDialog;
                const ctrlEmailId = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "emailInput");
                const ctrlOTP = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "otpInput");
                const sEmail = ctrlEmailId?.getValue()?.trim();
                const sOTP = ctrlOTP?.getValue()?.trim();

                if (!utils._LCvalidateEmail(ctrlEmailId, "ID")) {
                    MessageToast.show(this.i18nModel.getText("MSenterValidEmail"));
                    return;
                }

                if (!this._sDocumentEmail || sEmail.toLowerCase() !== this._sDocumentEmail.toLowerCase()) {
                    ctrlEmailId.setValueState("Error");
                    ctrlEmailId.setValueStateText("Entered email does not match the email associated with this link.");
                    MessageToast.show("Entered email does not match the email associated with this link.");
                    return;
                }

                ctrlEmailId.setValueState("None");

                if (!sOTP || !/^\d{6}$/.test(sOTP)) {
                    ctrlOTP.setValueState("Error");
                    ctrlOTP.setValueStateText(this.i18nModel.getText("Entervalid6digitOTP"));
                    MessageToast.show(this.i18nModel.getText("Entervalid6digitOTP"));
                    return;
                }

                ctrlOTP.setValueState("None");
                this.getBusyDialog();

                try {
                    const isValid = await this._verifyOTPWithBackend(sOTP);
                    if (!isValid) {
                        MessageToast.show("Incorrect OTP");
                        return;
                    }

                    const user = this._oVerifiedUser;
                    this._oVerifiedUser = null;

                    if (!user?.UserID || user.UserID !== this.sUserID) {
                        MessageToast.show("This verification link does not belong to the entered email.");
                        return;
                    }

                    await this._applyVerifiedUserLogin(user);

                    ctrlEmailId?.setValue("");
                    ctrlOTP?.setValue("");
                    ctrlEmailId?.setValueState("None");
                    ctrlOTP?.setValueState("None");
                    this._resetOtpState();

                    MessageToast.show("Login Successful");
                    this.getView().removeStyleClass("blur-background");

                    if (oFragment) {
                        oFragment.close();
                    }

                    if (this._bPendingDocumentRoute) {
                        this._bPendingDocumentRoute = false;
                        this._openMemberDialog();
                    }
                } catch (err) {
                    MessageToast.show(err.message || "Invalid Credentials, Please try again");
                } finally {
                    this.closeBusyDialog();
                }
            },

            _startOtpTimer: function () {
                const vm = this.getView().getModel("LoginViewModel");
                const START = 20;

                this._clearOtpTimer();
                vm.setProperty("/canResendOTP", false);
                vm.setProperty("/otpTimer", START);
                vm.setProperty("/otpButtonText", "Resend OTP (" + START + "s)");

                this._otpInterval = setInterval(() => {
                    let remaining = vm.getProperty("/otpTimer") - 1;

                    if (remaining <= 0) {
                        this._clearOtpTimer();
                        vm.setProperty("/otpTimer", 0);
                        vm.setProperty("/otpButtonText", "Resend OTP");
                        vm.setProperty("/canResendOTP", true);
                        return;
                    }

                    vm.setProperty("/otpTimer", remaining);
                    vm.setProperty("/otpButtonText", "Resend OTP (" + remaining + "s)");
                }, 1000);
            },

            _clearOtpTimer: function () {
                if (this._otpInterval) {
                    clearInterval(this._otpInterval);
                    this._otpInterval = null;
                }
            },

            _resetOtpState: function () {
                const vm = this.getView().getModel("LoginViewModel");

                this._clearOtpTimer();
                vm.setProperty("/otpTimer", 0);
                vm.setProperty("/canResendOTP", true);
                vm.setProperty("/otpButtonText", "Send OTP");
                vm.setProperty("/showOTPField", false);
                vm.setProperty("/isOtpEntered", false);
            },

            onDialogClose: function () {
                const oEmail = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "emailInput");
                const oOTP = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "otpInput");

                if (oEmail) {
                    oEmail.setValue("");
                    oEmail.setValueState("None");
                    oEmail.setValueStateText("");
                }

                if (oOTP) {
                    oOTP.setValue("");
                    oOTP.setValueState("None");
                    oOTP.setValueStateText("");
                }

                this._resetOtpState();
                this._bPendingDocumentRoute = false;
                this._oResetUser = null;
                this._oVerifiedUser = null;
                this.getView().removeStyleClass("blur-background");

                if (this._oLoginAlertDialog) {
                    this._oLoginAlertDialog.close();
                }
            },

            onMemberSearch: function (oEvent) {
                const sValue = String(oEvent.getParameter("newValue") || oEvent.getParameter("query") || "").trim();
                const oTable = sap.ui.getCore().byId("abmemberSelectTable");
                const oBinding = oTable && oTable.getBinding("items");
                let aFilters = [];

                if (!oBinding) {
                    return;
                }

                if (sValue) {
                    aFilters = [new Filter({
                        filters: [
                            new Filter("Name", FilterOperator.Contains, sValue),
                            new Filter("Relation", FilterOperator.Contains, sValue),
                            new Filter("Gender", FilterOperator.Contains, sValue),
                            new Filter("DocumentType", FilterOperator.Contains, sValue),
                            new Filter("DocumentName", FilterOperator.Contains, sValue)
                        ],
                        and: false
                    })];
                }

                oBinding.filter(aFilters);
            },
        });
});
