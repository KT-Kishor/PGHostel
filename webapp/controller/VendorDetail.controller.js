sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "../model/formatter",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
], function (BaseController, utils, Formatter, MessageToast, MessageBox) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.VendorDetail", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteVendorDetail").attachMatched(this._onRouteMatched, this);

            // Ensure LoginModel (url + headers) exists for OTP ajax calls,
            // even when the vendor opens this page via a direct deep-link
            // before any commonLoginFunction has run.
            this.initializeLoginModel();

            var oLoginViewModel = new sap.ui.model.json.JSONModel({
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

            let encodedUserID;

            // Case 1: called from router
            if (oEvent && typeof oEvent.getParameter === "function") {
                const oArgs = oEvent.getParameter("arguments") || {};
                encodedUserID = oArgs.UserID;
                this._pendingVendorArgs = oArgs;
            }
            // Case 2: called manually after OTP login
            else if (this._pendingVendorArgs) {
                encodedUserID = this._pendingVendorArgs.UserID;
            }
            // Case 3: nothing available
            else {
                return;
            }

            if (!encodedUserID) {
                return this._goToNotFound();
            }
            const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
            if (!base64Regex.test(encodedUserID)) {
                return this._goToNotFound();
            }
            let decodedUserID;
            try {
                decodedUserID = atob(encodedUserID);
            } catch {
                return this._goToNotFound();
            }
            if (btoa(decodedUserID) !== encodedUserID) {
                return this._goToNotFound();
            }

            this.getBusyDialog();
            let bValid;
            try {
                bValid = await this._validateVendorUserID(decodedUserID);
            } catch (e) {
                bValid = false;
            }
            this.closeBusyDialog();
            if (!bValid) {
                return this._goToNotFound();
            }

            this.sUserID = decodedUserID;

            // ===== OTP VERIFICATION GATE (same as EditBooking) =====
            var bLoggedIn = localStorage.getItem("isLoggedIn");
            if (!bLoggedIn) {
                this._bPendingVendorRoute = true;
                this.getView().addStyleClass("blur-background");

                MessageBox.information(
                    "Please verify with OTP to access your details.",
                    {
                        title: "Verification Required",
                        styleClass: "myUnifiedBtn",
                        actions: [MessageBox.Action.OK],
                        emphasizedAction: MessageBox.Action.OK,
                        onClose: function () {
                            if (!this._oLoginAlertDialog) {
                                this._oLoginAlertDialog = sap.ui.xmlfragment(
                                    this.createId("LoginAlertDialog"),
                                    "sap.ui.com.project1.fragment.AdminDetailsSignin",
                                    this
                                );
                                this.getView().addDependent(this._oLoginAlertDialog);
                            }

                            this._oLoginAlertDialog.open();
                        }.bind(this)
                    }
                );
                return;
            }

            await this._loadVendorPage();
        },

        _loadVendorPage: async function () {
            this.getBusyDialog();
            try {
                var Layout = this.byId("V_id_ObjectPageLayout");
                Layout.setSelectedSection(this.byId("V_id_OrderHeaderSection1"));

                const oEditableModel = new sap.ui.model.json.JSONModel({
                    Edit: false,
                    Save: false,
                    hasSelection: false
                });
                this.getView().setModel(oEditableModel, "editable");
                this._initAdminSignupModel();
                //  PRELOAD MASTER DATA FIRST (only once)
                await this._ensureCountryDataLoaded();
                //  THEN load vendor data
                await this._loadVendorDetails(this.sUserID);
                //  THEN apply filters
                this._applyCountryStateCityFilters();
                this._makeDatePickersReadOnly(["V_id_VendorDOB"]);

            } catch (e) {
                this._goToNotFound();
            } finally {
                this.closeBusyDialog()
            }
        },

        _ensureCountryDataLoaded: async function () {
            let aCountryData = this.getView().getModel("CountryModel")?.getData();
            if (!Array.isArray(aCountryData) || aCountryData.length === 0) {
                await this._fetchCommonData("Country", "CountryModel");
            }
        },

        _goToNotFound: function () {
            this.getOwnerComponent().getRouter().navTo("NotFound", {}, true);
        },

        _validateVendorUserID: async function (sUserID) {
            try {
                const oResp = await this.ajaxReadWithJQuery("HM_LoginReadCall", {
                    UserID: sUserID
                });
                const oVendor = oResp?.data?.[0];
                // ✅ Must exist AND must be in Send Back status
                const bValid = oResp?.data?.length === 1 && oVendor.Status === "Send Back";
                if (bValid) {
                    // Capture the email tied to this link so we can lock the OTP dialog to it
                    this._sVendorEmail = oVendor.EmailID || oVendor.Email || "";
                }
                return bValid;
            } catch (err) {
                return false;
            }
        },

        _initAdminSignupModel: function () {
            const oModel = new sap.ui.model.json.JSONModel({
                Salutation: "",
                VendorName: "",
                DateOfBirth: "",
                Gender: "",
                Email: "",
                Country: "",
                State: "",
                City: "",
                STDCode: "",
                Mobile: "",
                Address: "",
                CurrentDocType: "",
                Status: "",
                Documents: [],
                UploadEnabled: false,
                DocTypeEnabled: true
            });
            this.getView().setModel(oModel, "AdminSignupModel");
        },

        _applyCountryStateCityFilters: function () {
            const oModel = this.getView().getModel("AdminSignupModel");
            const oCountryCB = this.byId("V_id_Country");
            const oStateCB = this.byId("V_id_State");
            const oCityCB = this.byId("V_id_City");

            const sCountry = oModel.getProperty("/Country");
            const sState = oModel.getProperty("/State");
            const sCity = oModel.getProperty("/City");

            oStateCB.getBinding("items")?.filter([]);
            oCityCB.getBinding("items")?.filter([]);

            const aCountryData = this.getView().getModel("CountryModel")?.getData();
            if (!Array.isArray(aCountryData)) {
                return;
            }
            if (sCountry) {
                const oCountryObj = aCountryData.find(c => c.countryName === sCountry);
                if (oCountryObj) {
                    const sCountryCode = oCountryObj.code;

                    oStateCB.getBinding("items")?.filter([
                        new sap.ui.model.Filter("countryCode", "EQ", sCountryCode)
                    ]);
                    if (sState) {
                        oCityCB.getBinding("items")?.filter([
                            new sap.ui.model.Filter("stateName", "EQ", sState),
                            new sap.ui.model.Filter("countryCode", "EQ", sCountryCode)
                        ]);
                    }
                }
            }
            oCountryCB.setValue(sCountry || "");
            oStateCB.setValue(sState || "");
            oCityCB.setValue(sCity || "");
        },

        _loadVendorDetails: async function (sUserID) {
            try {
                const oResponse = await this.ajaxReadWithJQuery("HM_LoginReadCall", {
                    UserID: sUserID
                });
                const oData = oResponse.data;
                // Normalize model structure
                const oAdminData = {
                    UserID: oData[0].UserID,
                    Salutation: oData[0].Salutation,
                    VendorName: oData[0].UserName,
                    Email: oData[0].EmailID,
                    Gender: oData[0].Gender,
                    STDCode: oData[0].STDCode,
                    Mobile: oData[0].MobileNo,
                    Address: oData[0].Address,
                    Country: oData[0].Country,
                    State: oData[0].State,
                    City: oData[0].City,
                    Status: oData[0].Status,
                    AdminComment: oData[0].AdminComment,
                    DateOfBirth: this.Formatter.DateFormat(oData[0].DateOfBirth) || "",
                    Documents: (oData[0].Documents || []).map(doc => ({
                        FileName: doc.FileName,
                        DocumentType: doc.DocumentType,
                        size: doc.File ? atob(doc.File).length : 0,
                        File: doc.File,
                        FileType: doc.FileType,
                        DocumentID: doc.DocumentID
                    })),
                    CurrentDocType: "",
                    DocTypeEnabled: true
                };
                let oModel = this.getView().getModel("AdminSignupModel");
                if (!oModel) {
                    oModel = new sap.ui.model.json.JSONModel();
                    this.getView().setModel(oModel, "AdminSignupModel");
                }
                oModel.setData(oAdminData);
            } catch (err) {
                MessageToast.show(this.i18nModel.getText("vendorLoadError"));
            } finally {
                this.closeBusyDialog()
            }
        },

        onAdminFileSelect: function (oEvent) {
            const oFile = oEvent.getParameter("files")[0];
            const oModel = this.getView().getModel("AdminSignupModel");
            const sDocType = oModel.getProperty("/CurrentDocType");

            if (!sDocType) {
                MessageToast.show(this.i18nModel.getText("selectDocType"));
                this.byId("V_id_adminFileUploader").clear();
                return;
            }
            if (!oFile) {
                return;
            }
            const aDocs = oModel.getProperty("/Documents") || [];
            const bDuplicate = aDocs.some(oDoc => oDoc.DocumentType === sDocType);

            if (bDuplicate) {
                MessageToast.show(this.i18nModel.getText("reuploadDocType"));
                this.byId("V_id_adminFileUploader").clear();
                return;
            }
            const reader = new FileReader();
            const that = this;
            reader.onload = async function (e) {
                try {
                    const sBase64 = e.target.result.split(",")[1];
                    const oPayload = {
                        data: {
                            UserID: oModel.getProperty("/UserID"),
                            DocumentType: sDocType,
                            File: sBase64,
                            FileName: oFile.name,
                            FileType: oFile.type,
                            MemberID : oModel.getProperty("/UserID")
                        }
                    };
                    this.getBusyDialog()
                    await that.ajaxCreateWithJQuery("HM_CustomerDocument", oPayload);
                    await that._loadVendorDetails(oModel.getProperty("/UserID"));
                    oModel.setProperty("/CurrentDocType", "");
                    that.byId("V_id_adminFileUploader").clear();
                } catch (err) {
                    MessageToast.show(that.i18nModel.getText("docUploadError"));
                } finally {
                    this.closeBusyDialog()
                    MessageToast.show(that.i18nModel.getText("docUploadSuccess"));
                }
            };
            reader.readAsDataURL(oFile);
        },

         onFileSizeExceeds: function () {
            var oUploader = sap.ui.getCore().byId("VN_id_FileUploader");
            var iMaxSize = oUploader.getMaximumFileSize();

            sap.m.MessageToast.show(
                "File size exceeds " + iMaxSize + " MB. Please upload a smaller file."
            );
        },

        BI_onEditButtonPress: function () {
            this.getView().getModel("editable").setProperty("/Edit", true);
        },

        onEditOrSavePress: async function () {
            const oEditableModel = this.getView().getModel("editable");
            const bEditMode = oEditableModel.getProperty("/Edit");

            if (!bEditMode) {
                // === EDIT MODE ===
                oEditableModel.setProperty("/Edit", true);
                oEditableModel.setProperty("/Save", true);
                const oSalutation = this.getView().byId("V_id_adminSalutation")
                if (oSalutation) {
                    this.onAdminChangeSalutation({
                        getSource: () => oSalutation
                    });
                }
            } else {
                // === SAVE MODE ===
                const bSaved = await this.BT_onsavebuttonpress(); // await result
                if (bSaved === true) {
                    oEditableModel.setProperty("/Edit", false);
                    oEditableModel.setProperty("/Save", false);
                }
            }
            this._updateUploaderState();
        },

        _updateUploaderState: function () {
            const oView = this.getView();
            const bEdit = oView.getModel("editable").getProperty("/Edit");
            const sDocType = oView.getModel("AdminSignupModel").getProperty("/CurrentDocType");

            const oUploader = oView.byId("VN_id_FileUploader") || sap.ui.getCore().byId("VN_id_FileUploader");
            if (oUploader) {
                oUploader.setEnabled(bEdit && !!sDocType);
            }
        },

        onDocumentTypeChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
            this._updateUploaderState();
        },

        BT_onsavebuttonpress: async function () {
            const bConfirm = await new Promise((resolve) => {
                sap.m.MessageBox.confirm(
                    "Are you sure you want to Submit?", {
                    icon: sap.m.MessageBox.Icon.WARNING,
                    title: "Confirm Submission",
                    actions: [
                        sap.m.MessageBox.Action.YES,
                        sap.m.MessageBox.Action.NO
                    ],
                    styleClass: "myUnifiedBtn",
                    // emphasizedAction: sap.m.MessageBox.Action.NO,
                    onClose: function (sAction) {
                        resolve(sAction === sap.m.MessageBox.Action.YES);
                    }
                }
                );
            });
            //  User clicked NO
            if (!bConfirm) {
                return false;
            }
            //  User clicked YES → continue existing logic
            try {
                const C = this.byId.bind(this);
                const oModel = this.getView().getModel("AdminSignupModel");
                const oData = oModel.getData();
                const std = (C("V_id_StdCode").getValue() || "").trim();

                const isValid =
                    utils._LCstrictValidationSelect(C("V_id_adminSalutation")) === true &&
                    utils._LCvalidateName(C("V_id_VendorName"), "ID") === true &&
                    utils._LCvalidateDate(C("V_id_VendorDOB"), "ID") === true &&
                    utils._LCstrictValidationSelect(C("V_id_Gender")) === true &&
                    utils._LCvalidateEmail(C("V_id_Email"), "ID") === true &&
                    utils._LCvalidateMandatoryField(C("V_id_Country"), "ID") === true &&
                    utils._LCvalidateMandatoryField(C("V_id_State"), "ID") === true &&
                    utils._LCvalidateMandatoryField(C("V_id_City"), "ID") === true &&
                    utils._LCstrictValidationComboBox(C("V_id_StdCode"), "ID") === true &&
                    utils._LCvalidateISDmobile(C("V_id_MobileNo"), std) === true &&
                    utils._LCvalidateAddress(C("V_id_Address")) === true;

                if (!isValid) {
                    MessageToast.show(this.i18nModel.getText("MSfillallfields"));
                    return false;
                }
                const payload = {
                    data: {
                        UserID: oData.UserID,
                        UserName: oData.VendorName,
                        EmailID: oData.Email,
                        Gender: oData.Gender,
                        STDCode: oData.STDCode,
                        MobileNo: oData.Mobile,
                        Address: oData.Address,
                        Country: oData.Country,
                        State: oData.State,
                        City: oData.City,
                        DateOfBirth: oData.DateOfBirth ? oData.DateOfBirth.split("/").reverse().join("-") : "",
                        Status: "Resubmitted"
                    },
                    filters: {
                        UserID: oData.UserID
                    }
                };
                this.getBusyDialog()
                await this.ajaxUpdateWithJQuery("HM_Login", payload);
                await this._loadVendorDetails(oData.UserID);
                MessageToast.show(this.i18nModel.getText("vendorUpdateSuccess"));
                return true;
            } catch (err) {
                MessageToast.show(this.i18nModel.getText(err.message || "Updatefailed"));
                return false;
            } 
        },

        onAdminSelectionChange: function (oEvent) {
            const oTable = oEvent.getSource();
            const bHasSelection = oTable.getSelectedItems().length > 0;

            this.getView().getModel("editable").setProperty("/hasSelection", bHasSelection);
        },

        onAdminDeleteFiles: async function () {
            const oTable = this.byId("V_id_adminAttachmentTable");
            const oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                return;
            }
            const oContext = oSelectedItem.getBindingContext("AdminSignupModel");
            const sUserID = oContext.getModel().getProperty("/UserID");

            // Common UI reset logic (used for confirm & cancel)
            const fnResetSelection = () => {
                oTable.removeSelections(true);
                // this.byId("V_id_AdminDeleteButton").setEnabled(false);
                // this.byId("V_id_AdminDownloadButton").setEnabled(false);
            };
            this.showConfirmationDialog(
                "Confirm",
                "Are you sure you want to delete this document?",
                async () => {
                    try {
                        this.getBusyDialog()

                        await this.ajaxDeleteWithJQuery("/HM_CustomerDocument", {
                            filters: {
                                DocumentID: oContext.getProperty("DocumentID"),
                                UserID: sUserID
                            }
                        });
                        await this._loadVendorDetails(sUserID); // refresh attachment list
                        sap.m.MessageToast.show(this.i18nModel.getText("docdeletedSuccess"));
                        fnResetSelection();
                    } catch (err) {
                        sap.m.MessageToast.show(err.message || "Delete failed");
                    } finally {
                        this.closeBusyDialog()  
                    }
                },
                () => {
                    // Cancel callback
                    fnResetSelection();
                }
            );
        },

        onAdminDownloadFiles: function () {
            const oTable = this.byId("V_id_adminAttachmentTable");
            const oContext = oTable.getSelectedItem()?.getBindingContext("AdminSignupModel");
            if (!oContext) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseselectadoc"));
                return;
            }
            const oData = oContext.getObject();

            const sBase64 = oData.File;
            const sMimeType = oData.FileType || "application/octet-stream";
            const sFileName = oData.FileName || "document";

            const byteCharacters = atob(sBase64);
            const byteNumbers = new Array(byteCharacters.length);

            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const blob = new Blob([new Uint8Array(byteNumbers)], {
                type: sMimeType
            });
            const sUrl = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = sUrl;
            link.download = sFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(sUrl);

            oTable.removeSelections(true);
            this.byId("V_id_AdminDeleteButton").setEnabled(false);
            this.byId("V_id_AdminDownloadButton").setEnabled(false);
        },

         onAdminPreviewDoc: async function(oEvent) {
            function autoDecodeBase64(b64) {

                if (!b64) {
                    return "";
                }

                b64 = b64.replace(/\s/g, "");

                let last = b64;

                for (let i = 0; i < 5; i++) {

                    try {

                        if (
                            last.startsWith("iVB") || // PNG
                            last.startsWith("/9j") || // JPG
                            last.startsWith("JVBER") // PDF
                        ) {
                            return last;
                        }

                        last = atob(last);

                    } catch (e) {
                        break;
                    }
                }

                return last;
            }

            const oDoc = oEvent.getSource().getBindingContext("AdminSignupModel").getObject();

            if (!oDoc || !oDoc.File) {
                sap.m.MessageBox.error("No document found");
                return;
            }

            let sBase64 = autoDecodeBase64(oDoc.File);

            let sMimeType = "application/octet-stream";

            if (sBase64.startsWith("iVB")) {
                sMimeType = "image/png";
            } else if (sBase64.startsWith("/9j")) {
                sMimeType = "image/jpeg";
            } else if (sBase64.startsWith("JVBER")) {
                sMimeType = "application/pdf";
            }

            const sFileName = oDoc.FileName || "Document Preview";

            this._sPreviewFileName = sFileName;
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

            oDialog.setTitle(sFileName);

            oImage.setVisible(false);
            oHtml.setVisible(false);
            oHtml.setContent("");

            // cleanup previous blob
            if (this._pdfBlobUrl) {

                URL.revokeObjectURL(
                    this._pdfBlobUrl
                );

                this._pdfBlobUrl = null;
            }

            // IMAGE PREVIEW

            if (sMimeType.startsWith("image/")) {

                const sImageSrc =  `data:${sMimeType};base64,${sBase64}`;

                const oImg = new Image();

                oImg.onload = function() {

                    const viewportW = window.innerWidth * 0.8;
                    const viewportH = window.innerHeight * 0.8;
                    const imgRatio = oImg.width / oImg.height;

                    let finalWidth = viewportW;
                    let finalHeight = viewportW / imgRatio;

                    if (finalHeight > viewportH) {

                        finalHeight = viewportH;

                        finalWidth = viewportH * imgRatio;
                    }

                    oDialog.setContentWidth(
                        finalWidth + "px"
                    );

                    oDialog.setContentHeight(
                        finalHeight + "px"
                    );

                    oImage.setSrc(sImageSrc);

                    oImage.setVisible(true);

                    oDialog.open();

                }.bind(this);

                oImg.src = sImageSrc;

                return;
            }

        
            // PDF PREVIEW
            if (sMimeType === "application/pdf") {
                const byteCharacters = atob(sBase64);
                const byteArrays = [];

                for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                    const slice =byteCharacters.slice(offset, offset + 512);
                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }

                    byteArrays.push(new Uint8Array(byteNumbers));
                }

                const blob = new Blob(byteArrays, { type: "application/pdf"});
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
                oHtml.setVisible(true);
                oDialog.open();
                return;
            }

            this.onDownloadPreview();

            MessageToast.show("Preview not supported.");
        },

        onDownloadPreview: function() {

            if (!this._sPreviewBase64) {

                MessageToast.show(
                    "No file available for download."
                );

                return;
            }

            let sDownloadUrl = "";

            // PDF
            if (this._sPreviewMimeType === "application/pdf") {
                sDownloadUrl =  this._pdfBlobUrl;
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

        onClosePreview: function() {
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

        onAdminChangeSalutation: function(oEvent) {
            const oSalutation = oEvent.getSource();
            const sKey = oSalutation.getSelectedKey();

            // Gender control from the same view
            const oGender = this.byId("V_id_Gender");

            if (!oGender) {
                console.error(this.i18nModel.getText("nogenderselect"));
                return;
            }

            // Reset gender
            oGender.setSelectedKey("");
            oGender.setEnabled(true);

            // Auto-select based on salutation
            if (sKey === "Mr.") {
                oGender.setSelectedKey("Male");
                oGender.setEnabled(false);
            } else if (sKey === "Ms." || sKey === "Mrs.") {
                oGender.setSelectedKey("Female");
                oGender.setEnabled(false);
            } else if (sKey === "Other.") {
                oGender.setSelectedKey("Other");
                oGender.setEnabled(false);
            }

            utils._LCstrictValidationSelect(oSalutation);
        },

        onAdminLiveValidate: function (oEvent) {
            const id = oEvent.getSource().getId();
            if (id.includes("V_id_VendorName")) { // Vendor name
                utils._LCvalidateName(oEvent);
                return;
            }
            if (id.includes("V_id_Email")) { // Email
                utils._LCvalidateEmail(oEvent);
                return;
            }
            if (id.includes("V_id_Address")) { // Address
                utils._LCvalidateMandatoryField(oEvent);
                return;
            }
        },

        ADMIN_onChangeGender: function (oEvent) {
            const oSelect = oEvent.getSource();
            const key = oSelect.getSelectedKey();
            this.getView().getModel("AdminSignupModel").setProperty("/Gender", key);
            oSelect.setValueState(key ? "None" : "Error");
        },

        ADMIN_onChangeCountry: function (oEvent) {
            const oCountry = oEvent.getSource();
            const oView = this.getView();
            const oModel = oView.getModel("AdminSignupModel");

            const oState = this.byId("V_id_State");
            const oCity = this.byId("V_id_City");
            const oSTD = this.byId("V_id_StdCode");
            const oMobile = this.byId("V_id_MobileNo");

            // sanitize
            oCountry.setValue(oCountry.getValue().replace(/[^a-zA-Z\s]/g, ""));
            utils._LCvalidateMandatoryField(oEvent);

            // reset model
            ["State", "City", "STDCode", "Mobile"].forEach(p =>
                oModel.setProperty("/" + p, "")
            );
            // reset UI
            oState.setValue("").setSelectedKey("");
            oCity.setValue("").setSelectedKey("");
            oSTD.setValue("").setSelectedKey("");
            oMobile.setValue("");

            // block dependent dropdowns
            oState.getBinding("items")?.filter([
                new sap.ui.model.Filter("stateName", "EQ", "__NONE__")
            ]);
            oCity.getBinding("items")?.filter([
                new sap.ui.model.Filter("cityName", "EQ", "__NONE__")
            ]);
            oSTD.getBinding("items")?.filter([]);

            const oItem = oCountry.getSelectedItem();
            if (!oItem) {
                oModel.setProperty("/Country", oCountry.getValue());
                return;
            }
            const sCountry = oItem.getText();
            const sCode = oItem.getAdditionalText().trim();
            oModel.setProperty("/Country", sCountry);
            // release states
            oState.getBinding("items")?.filter([
                new sap.ui.model.Filter("countryCode", "EQ", sCode)
            ]);
            // STD handling
            const countries = this.getOwnerComponent().getModel("CountryModel").getData();
            const data = countries.find(c => c.countryName === sCountry);
            if (data?.stdCode) {
                oModel.setProperty("/STDCode", data.stdCode);
                oSTD.setValue(data.stdCode);
                this.ADMIN_onChangeSTD();
            }
        },

        ADMIN_onChangeState: function (oEvent) {
            const oState = oEvent.getSource();
            const oModel = this.getView().getModel("AdminSignupModel");

            oState.setValue(oState.getValue().replace(/[^a-zA-Z\s]/g, ""));
            utils._LCvalidateMandatoryField(oEvent);

            const sState = oState.getSelectedItem()?.getText() || oState.getValue() || "";
            oModel.setProperty("/State", sState);

            const oCity = this.byId("V_id_City");
            oCity.setValue("").setSelectedKey("");
            oModel.setProperty("/City", "");

            // block city
            oCity.getBinding("items")?.filter([
                new sap.ui.model.Filter("cityName", "EQ", "__NONE__")
            ]);
            const oCountry = this.byId("V_id_Country");
            const sCode = oCountry.getSelectedItem()?.getAdditionalText()?.trim();
            if (!sCode || !sState) return;
            // release cities
            oCity.getBinding("items")?.filter([
                new sap.ui.model.Filter("stateName", "EQ", sState),
                new sap.ui.model.Filter("countryCode", "EQ", sCode)
            ]);
        },

        ADMIN_onChangeCity: function (oEvent) {
            const oCity = oEvent.getSource();
            const oModel = this.getView().getModel("AdminSignupModel");

            oCity.setValue(oCity.getValue().replace(/[^a-zA-Z\s]/g, ""));
            utils._LCvalidateMandatoryField(oEvent);

            const sCity =
                oCity.getSelectedItem()?.getText() ||
                oCity.getValue() || "";

            oModel.setProperty("/City", sCity);
        },

        ADMIN_onChangeSTD: function () {
            const oSTD = this.byId("V_id_StdCode");
            const oMobile = this.byId("V_id_MobileNo");
            const std = oSTD.getValue();
            // Reset mobile field
            oMobile.setMaxLength(std === "+91" ? 10 : 18);
            // Clear value states
            oSTD.setValueState("None");
            oMobile.setValueState("None");
        },

        ADMIN_onMobileLiveChange: function (oEvent) {
            const oInput = oEvent.getSource();
            let val = oInput.getValue().replace(/\D/g, "");
            oInput.setValue(val);

            if (!val) {
                oInput.setValueState("None");
                return;
            }
            const std = this.byId("V_id_StdCode").getValue();
            const isValid = utils._LCvalidateISDmobile(oInput, std);
            oInput.setValueState(isValid ? "None" : "Error");
        },

        onChangeDOB: function (oEvent) {
            utils._LCvalidateDate(oEvent);
        },

        BI_onButtonPress: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHostel");
        },

        onUploadDocumentFile: function () {
            const oTable = this.byId("V_id_adminAttachmentTable");
            if (oTable) {
                oTable.removeSelections(true);
            }

            if (this.UD_Dialog) {
                this.UD_Dialog.destroy();
                this.UD_Dialog = null;
            }
            if (!this.UD_Dialog) {
                var oView = this.getView();
                this.UD_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.VenderUpload", this);
                oView.addDependent(this.UD_Dialog);
            }
            var oCombo = this.getView().byId("VN_idProofType") || sap.ui.getCore().byId("VN_idProofType");
            if (oCombo) {
                oCombo.setSelectedKey("");
                oCombo.setValue("");
            }
            var oFileUploader = this.getView().byId("VN_id_FileUploader") || sap.ui.getCore().byId("VN_id_FileUploader");
            if (oFileUploader) {
                oFileUploader.clear();
            }
            this.UD_Dialog.open();
        },

        onCloseDialog: function () {
            this.UD_Dialog.close();
        },

        onFacilityFileChange: function(oEvent) {
            const oFileUploader = oEvent.getSource();
            const oFile = oEvent.getParameter("files")[0];

            const oAdminModel = this.getView().getModel("AdminSignupModel");
            const sDocType = oAdminModel.getProperty("/CurrentDocType");

            // VALIDATE DOCUMENT TYPE
            if (!sDocType) {
                MessageToast.show(this.i18nModel.getText("pleaseSelectDocumentTypeFirst"));
                oFileUploader.clear();
                return;
            }
            if (!oFile) {
                return;
            }

            const bIsPdf = oFile.type === "application/pdf" ||
                oFile.name.toLowerCase().endsWith(".pdf");

            if (bIsPdf && oFile.size > (2 * 1024 * 1024)) {
                sap.m.MessageToast.show(
                    "PDF file size should not exceed 2 MB."
                );
                oFileUploader.clear();
                return;
            }
            // DUPLICATE CHECK
            // const aDocs = oAdminModel.getProperty("/Documents") || [];
            // const bDuplicate = aDocs.some(
            //     oDoc => oDoc.DocumentType === sDocType
            // );

            // if (bDuplicate) {
            //     MessageToast.show(
            //         this.i18nModel.getText("reuploadDocType")
            //     );
            //     oFileUploader.clear();
            //     return;
            // }

            // FILE READ
            const reader = new FileReader();
            const that = this;

            reader.onload = async function(e) {
                try {

                    const sBase64 = await that._compressImageTo2MB(oFile);

                    const sExt = "jpg"; // compressed output is jpeg

                    const sNewFileName = sDocType
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, "_") +
                        "." + sExt;

                    const oPayload = {
                        data: {
                            UserID: oAdminModel.getProperty("/UserID"),
                            DocumentType: sDocType,
                            File: sBase64,
                            FileName: sNewFileName, // <-- custom file name
                            FileType: oFile.type,
                            MemberID: oAdminModel.getProperty("/UserID")
                        }
                    };

                    that.getBusyDialog();

                    await that.ajaxCreateWithJQuery(
                        "HM_CustomerDocument",
                        oPayload
                    );

                    await that._loadVendorDetails(
                        oAdminModel.getProperty("/UserID")
                    );

                    oAdminModel.setProperty("/CurrentDocType", "");
                    oFileUploader.clear();

                } catch (err) {
                    that.closeBusyDialog();
                    MessageToast.show(
                        that.i18nModel.getText("docUploadError")
                    );
                } finally {
                    that.closeBusyDialog();
                    MessageToast.show(
                        that.i18nModel.getText("docUploadSuccess")
                    );
                }
            };
            reader.readAsDataURL(oFile);
            this.UD_Dialog.close();
        },

        _compressImageTo2MB: function (oFile) {
            return new Promise((resolve, reject) => {

                // Non-image files
                if (!oFile.type.startsWith("image/")) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        resolve(e.target.result.split(",")[1]);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(oFile);
                    return;
                }

                const img = new Image();
                const reader = new FileReader();

                reader.onload = function (e) {
                    img.src = e.target.result;
                };

                img.onload = function () {

                    let canvas = document.createElement("canvas");
                    let ctx = canvas.getContext("2d");

                    let width = img.width;
                    let height = img.height;

                    // Resize large images
                    const maxDimension = 1920;

                    if (width > maxDimension || height > maxDimension) {
                        const ratio = Math.min(
                            maxDimension / width,
                            maxDimension / height
                        );
                        width *= ratio;
                        height *= ratio;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    ctx.drawImage(img, 0, 0, width, height);

                    let quality = 0.9;
                    let dataUrl = canvas.toDataURL("image/jpeg", quality);

                    // Keep reducing quality until under 2MB
                    while (
                        dataUrl.length * 0.75 > 2 * 1024 * 1024 &&
                        quality > 0.1
                    ) {
                        quality -= 0.1;
                        dataUrl = canvas.toDataURL("image/jpeg", quality);
                    }

                    resolve(dataUrl.split(",")[1]);
                };

                img.onerror = reject;
                reader.onerror = reject;

                reader.readAsDataURL(oFile);
            });
        },

        // ===== OTP LOGIN DIALOG HANDLERS (mirrors EditBooking) =====

        onEmailliveChange: function (oEvent) {
            utils._LCvalidateEmail(oEvent);
        },

        onLoginOtpLive: function (e) {
            const vm = this.getView().getModel("LoginViewModel");
            const input = e.getSource();

            let val = e.getParameter("value").replace(/\D/g, "");
            if (val.length > 6) val = val.slice(0, 6);

            input.setValue(val);

            const isValid = val.length === 6;
            vm.setProperty("/isOtpEntered", isValid);

            if (val.length === 0) {
                input.setValueState("None");
            } else if (!isValid) {
                input.setValueState("Error");
                input.setValueStateText(this.i18nModel.getText("entervaliddigitOTP"));
            } else {
                input.setValueState("None");
            }
        },

        onPressOTP: async function () {
            const oEmailIDCtrl = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "emailInput");
            const sEmail = oEmailIDCtrl?.getValue()?.trim();

            // 1. Format validation
            if (!utils._LCvalidateEmail(oEmailIDCtrl, "ID")) {
                MessageToast.show(this.i18nModel.getText("MSenterValidEmail"));
                return;
            }

            // 2. Must match the email tied to this verification link
            if (!this._sVendorEmail || sEmail.toLowerCase() !== this._sVendorEmail.toLowerCase()) {
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
                const oResp = await this.ajaxCreateWithJQuery("HostelSendBackOTPEmail", payload);

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
                    MessageToast.show(oResp?.message || this.i18nModel.getText("noUserFoundwithGivenIDName"));
                }
            } catch (err) {
                const sMsg = err?.responseJSON?.message || err?.message || this.i18nModel.getText("forgotOtpSendFailed");
                MessageToast.show(sMsg);
                console.error("Vendor HostelSendOTP error:", err);
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

                // Cache the verified user for onSignIn to reuse (avoid double OTP consumption)
                if (oResp?.success === true) {
                    this._oVerifiedUser = oResp?.data?.[0] || null;
                }
                return oResp?.success === true;
            } catch (err) {
                console.error("OTP Verify Error:", err);
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

            // 1. Email format validation
            if (!utils._LCvalidateEmail(ctrlEmailId, "ID")) {
                MessageToast.show(this.i18nModel.getText("MSenterValidEmail"));
                return;
            }

            // 2. Must match the email tied to this verification link
            if (!this._sVendorEmail || sEmail.toLowerCase() !== this._sVendorEmail.toLowerCase()) {
                ctrlEmailId.setValueState("Error");
                ctrlEmailId.setValueStateText("Entered email does not match the email associated with this link.");
                MessageToast.show("Entered email does not match the email associated with this link.");
                return;
            }
            ctrlEmailId.setValueState("None");

            if (!sOTP) {
                ctrlOTP.setValueState("Error");
                ctrlOTP.setValueStateText(this.i18nModel.getText("Entervalid6digitOTP"));
                MessageToast.show(this.i18nModel.getText("Entervalid6digitOTP"));
                return;
            }

            if (!/^\d{6}$/.test(sOTP)) {
                ctrlOTP.setValueState("Error");
                ctrlOTP.setValueStateText(this.i18nModel.getText("Entervalid6digitOTP"));
                MessageToast.show(this.i18nModel.getText("Entervalid6digitOTP"));
                return;
            }

            ctrlOTP.setValueState("None");

            var bResumed = false;
            this.getBusyDialog();

            try {
                const isValid = await this._verifyOTPWithBackend(sOTP);
                if (!isValid) {
                    MessageToast.show("Incorrect OTP");
                    return;
                }

                const user = this._oVerifiedUser;
                this._oVerifiedUser = null;

                // Security: the verified user must match the vendor this link belongs to
                if (!user?.UserID || user.UserID !== this.sUserID) {
                    MessageToast.show("This verification link does not belong to the entered email.");
                    return;
                }

                localStorage.setItem("isLoggedIn", "true");
                localStorage.setItem("_x9A1p", user._x9A1p);
                localStorage.setItem("_k7LmQ", user._k7LmQ);
                localStorage.setItem("_aB39X", btoa(user.UserID));
                localStorage.setItem("_mN72P", btoa(user.UserName || ""));

                const oUIModel = this.getOwnerComponent().getModel("UIModel");
                if (oUIModel) {
                    oUIModel.setProperty("/isLoggedIn", true);
                }
                const oLoginModel = this.getOwnerComponent().getModel("LoginModel");
                if (oLoginModel) {
                    oLoginModel.setProperty("/UserID", user.UserID);
                    oLoginModel.setProperty("/EmployeeID", user.UserID);
                    oLoginModel.setProperty("/EmployeeName", user.UserName || "");
                    oLoginModel.setProperty("/UserName", user.UserName || "");
                    oLoginModel.setProperty("/EmailID", user.EmailID || "");
                    oLoginModel.setProperty("/isLoggedIn", true);
                }

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

                if (this._bPendingVendorRoute) {
                    this._bPendingVendorRoute = false;
                    bResumed = true;
                    await this._loadVendorPage();
                }
            } catch (err) {
                MessageToast.show(err.message || "Invalid Credentials, Please try again");
            } finally {
                if (!bResumed) {
                    this.closeBusyDialog();
                }
            }
        },

        _startOtpTimer: function () {
            const vm = this.getView().getModel("LoginViewModel");

            this._clearOtpTimer();

            const START = 20;

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

            this.getView().removeStyleClass("blur-background");
            if (this._oLoginAlertDialog) {
                this._oLoginAlertDialog.close();
            }
        }
    });
});