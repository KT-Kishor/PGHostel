sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "../model/formatter",
    "sap/m/MessageToast",
], function(BaseController, utils, Formatter, MessageToast) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.ManageVendorDetail", {
        Formatter: Formatter,
        onInit: function() {
            var today = new Date();
            // var maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
            var oDateModel = new sap.ui.model.json.JSONModel();
            oDateModel.setData({
                // maxDate: maxDate,
                focusedDate: new Date(2000, 0, 1),
                minDate: new Date(1950, 0, 1),
            });
            this.getView().setModel(oDateModel, "controller");
            this.getOwnerComponent().getRouter().getRoute("RouteManageVendorDetail").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function(oEvent) {
            try {
                // var LoginFUnction = await this.commonLoginFunction("ManageVendor");
                // if (!LoginFUnction) return;
                this.getBusyDialog();
                var Layout = this.byId("MV_id_ObjectPageLayout");
                Layout.setSelectedSection(this.byId("MV_id_OrderHeaderSection1"));
                this.commonLoginFunction();

                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                // Editable control model
                const oEditableModel = new sap.ui.model.json.JSONModel({
                    Edit: false,
                    Save: false,
                    hasSelection: false
                });
                this.getView().setModel(oEditableModel, "editable");
                this._initAdminSignupModel();
                this.sUserID = oEvent.getParameter("arguments").UserID;
                await this._loadVendorDetails(this.sUserID);
                this._applyCountryStateCityFilters();
                this._makeDatePickersReadOnly(["MV_id_VendorDOB"]);
            } catch (err) {
                this.closeBusyDialog()
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                this.closeBusyDialog()
            }
        },

        _initAdminSignupModel: function() {
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

        _applyCountryStateCityFilters: function() {
            const oModel = this.getView().getModel("AdminSignupModel");
            const oCountryCB = this.byId("MV_id_Country");
            const oStateCB = this.byId("MV_id_State");
            const oSourceCB = this.byId("MV_id_City");

            const sCountry = oModel.getProperty("/Country"); // e.g. "Australia"
            const sState = oModel.getProperty("/State"); // e.g. "Queensland"
            const sSource = oModel.getProperty("/City"); // e.g. "Bongaree"
            // Reset all filters
            oStateCB.getBinding("items")?.filter([]);
            oSourceCB.getBinding("items")?.filter([]);

            if (sCountry) {
                // Find countryCode by name
                const aCountryData = this.getView().getModel("CountryModel").getData();
                const oCountryObj = aCountryData.find(c => c.countryName === sCountry);

                if (oCountryObj) {
                    const sCountryCode = oCountryObj.code;
                    // Filter States by Country
                    oStateCB.getBinding("items")?.filter([
                        new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
                    ]);
                    if (sState) {
                        // Filter Cities by State + Country
                        const aFilters = [
                            new sap.ui.model.Filter("stateName", sap.ui.model.FilterOperator.EQ, sState),
                            new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
                        ];
                        oSourceCB.getBinding("items")?.filter(aFilters);
                    }
                }
            }
            // Ensure values are set back in UI
            oCountryCB.setValue(sCountry || "");
            oStateCB.setValue(sState || "");
            oSourceCB.setValue(sSource || "");
        },

        _loadVendorDetails: async function(sUserID) {
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
            }
        },

        onAdminFileSelect: function(oEvent) {
            const oFile = oEvent.getParameter("files")[0];
            const oModel = this.getView().getModel("AdminSignupModel");
            const sDocType = oModel.getProperty("/CurrentDocType");

            if (!sDocType) {
                MessageToast.show(this.i18nModel.getText("selectDocType"));
                this.byId("MV_id_adminFileUploader").clear();
                return;
            }
            if (!oFile) {
                return;
            }
            const aDocs = oModel.getProperty("/Documents") || [];
            const bDuplicate = aDocs.some(oDoc => oDoc.DocumentType === sDocType);

            if (bDuplicate) {
                MessageToast.show(this.i18nModel.getText("reuploadDocType"));
                this.byId("MV_id_adminFileUploader").clear();
                return;
            }

            const reader = new FileReader();
            const that = this;
            reader.onload = async function(e) {
                try {
                    const sBase64 = e.target.result.split(",")[1];
                    const oPayload = {
                        data: {
                            UserID: oModel.getProperty("/UserID"),
                            DocumentType: sDocType,
                            File: sBase64,
                            FileName: oFile.name,
                            FileType: oFile.type,
                            MemberID: oModel.getProperty("/UserID")
                        }
                    };
                    this.getBusyDialog()
                    await that.ajaxCreateWithJQuery("HM_CustomerDocument", oPayload);
                    await that._loadVendorDetails(oModel.getProperty("/UserID"));
                    oModel.setProperty("/CurrentDocType", "");
                    that.byId("MV_id_adminFileUploader").clear();
                } catch (err) {
                    MessageToast.show(that.i18nModel.getText("docUploadError"));
                } finally {
                    this.closeBusyDialog()
                    MessageToast.show(that.i18nModel.getText("docUploadSuccess"));
                }
            };
            reader.readAsDataURL(oFile);
        },

        onFileSizeExceeds: function() {
            var oUploader = sap.ui.getCore().byId("VN_id_FileUploader");
            var iMaxSize = oUploader.getMaximumFileSize();

            sap.m.MessageToast.show(
                "File size exceeds " + iMaxSize + " MB. Please upload a smaller file."
            );
        },

        BI_onEditButtonPress: function() {
            this.getView().getModel("editable").setProperty("/Edit", true);
        },

        BI_onButtonPress: function() {
            // var oRouter = this.getOwnerComponent().getRouter();
            // oRouter.navTo("RouteManageVendor",{
            //     sPath:"Vendordetails"
            // });
            var oViewModel = this.getView().getModel("editable");

            // Check edit mode
            var bIsEditMode = oViewModel.getProperty("/Edit");

            if (bIsEditMode) {

                // Ask confirmation only in edit mode
                this.showConfirmationDialog(
                    this.i18nModel.getText("ConfirmActionTitle"),
                    this.i18nModel.getText("backConfirmation"),

                    function() {

                        // Reset edit mode
                        oViewModel.setProperty("/Edit", false);
                        oViewModel.setProperty("/save", false);

                        // Navigate back
                        this.getRouter().navTo("RouteManageVendor", {
                            sPath: "Vendordetails"
                        });

                    }.bind(this)
                );
            } else {
                // Direct navigation when not editing
                this.getRouter().navTo("RouteManageVendor", {
                    sPath: "Vendordetails"
                });
            }
        },

        onEditOrSavePress: async function() {
            const oEditableModel = this.getView().getModel("editable");
            const bEditMode = oEditableModel.getProperty("/Edit");

            if (!bEditMode) {
                // === EDIT MODE ===
                oEditableModel.setProperty("/Edit", true);
                oEditableModel.setProperty("/Save", true);

                const oSalutation = this.getView().byId("MV_id_adminSalutation")
                if (oSalutation) {
                    this.onAdminChangeSalutation({
                        getSource: () => oSalutation
                    });
                }
            } else {
                // === SAVE MODE ===
                const bSaved = await this.BT_onsavebuttonpress(); // ✅ await result
                if (bSaved === true) {
                    oEditableModel.setProperty("/Edit", false);
                    oEditableModel.setProperty("/Save", false);
                }
            }
            this._updateUploaderState();
        },

        _updateUploaderState: function() {
            const oView = this.getView();
            const bEdit = oView.getModel("editable").getProperty("/Edit");
            const sDocType = oView.getModel("AdminSignupModel").getProperty("/CurrentDocType");

            const oUploader = oView.byId("VN_id_FileUploader") || sap.ui.getCore().byId("VN_id_FileUploader");
            if (oUploader) {
                oUploader.setEnabled(bEdit && !!sDocType);
            }
        },

        onDocumentTypeChange: function(oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
            this._updateUploaderState();
        },

        BT_onsavebuttonpress: async function() {
            try {
                const C = this.byId.bind(this);
                const oModel = this.getView().getModel("AdminSignupModel");
                const oData = oModel.getData();
                const std = (C("MV_id_StdCode").getValue() || "").trim();

                const isValid =
                    utils._LCstrictValidationSelect(C("MV_id_adminSalutation")) === true &&
                    utils._LCvalidateName(C("MV_id_VendorName"), "ID") === true &&
                    utils._LCvalidateDate(C("MV_id_VendorDOB"), "ID") === true &&
                    utils._LCstrictValidationSelect(C("MV_id_Gender")) === true &&
                    utils._LCvalidateEmail(C("MV_id_Email"), "ID") === true &&
                    utils._LCvalidateMandatoryField(C("MV_id_Country"), "ID") === true &&
                    utils._LCvalidateMandatoryField(C("MV_id_State"), "ID") === true &&
                    utils._LCvalidateMandatoryField(C("MV_id_City"), "ID") === true &&
                    utils._LCstrictValidationComboBox(C("MV_id_StdCode"), "ID") === true &&
                    utils._LCvalidateISDmobile(C("MV_id_MobileNo"), std) === true &&
                    utils._LCvalidateAddress(C("MV_id_Address")) === true;

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
                    },
                    filters: {
                        UserID: oData.UserID
                    }
                };
                this.getBusyDialog()
                await this.ajaxUpdateWithJQuery("HM_Login", payload);
                await this._loadVendorDetails(oData.UserID);
                this.closeBusyDialog()
                MessageToast.show(this.i18nModel.getText("vendorSuccess"));
                return true;
            } catch (err) {
                MessageToast.show(this.i18nModel.getText(err.message || "Updatefailed"));
                return false;
            } finally {
                this.closeBusyDialog()
            }
        },

        onAdminSelectionChange: function(oEvent) {
            const oTable = oEvent.getSource();
            const bHasSelection = oTable.getSelectedItems().length > 0;

            this.getView().getModel("editable").setProperty("/hasSelection", bHasSelection);
        },

        onAdminDeleteFiles: async function() {
            const oTable = this.byId("MV_id_adminAttachmentTable");
            const oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                return;
            }
            const oContext = oSelectedItem.getBindingContext("AdminSignupModel");
            const sUserID = oContext.getModel().getProperty("/UserID");

            // Common UI reset logic (used for confirm & cancel)
            const fnResetSelection = () => {
                oTable.removeSelections(true);
                // this.byId("AdminDeleteButton").setEnabled(false);
                // this.byId("AdminDownloadButton").setEnabled(false);
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

        onAdminDownloadFiles: function() {
            const oTable = this.byId("MV_id_adminAttachmentTable");
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
            this.byId("AdminDeleteButton").setEnabled(false);
            this.byId("AdminDownloadButton").setEnabled(false);
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

        MI_onPressButtons(oEvent) {
            const actionText = oEvent.getSource().getText();
            const i18n = this.getView().getModel("i18n").getResourceBundle();
            const dialogTexts = {
                "Approve": "confirmApprove",
                "Send Back": "confirmReSend",
            };
            this.getText = actionText;
            this.functionToOpenDialog(actionText, i18n.getText(dialogTexts[actionText]));
        },

        functionToOpenDialog(text, oDialogTitle) {
            const oView = this.getView();
            if (!this.oDialog) {
                sap.ui.core.Fragment.load({
                    name: "sap.ui.com.project1.fragment.VendorApprove",
                    controller: this
                }).then(oDialog => {
                    this.oDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.open();
                    this.valueSetFunction(text, oDialogTitle);
                });
            } else {
                this.oDialog.open();
                this.valueSetFunction(text, oDialogTitle);
            }
        },

        valueSetFunction(text, oDialogTitle) {
            sap.ui.getCore().byId("MIF_id_OkBtn").setText(text);
            const i18n = this.getView().getModel("i18n").getResourceBundle();
            let oValue = "";
            if (text === "Approve") {
                oValue = i18n.getText("approveRemark");
            } else if (text === "Send Back") {
                oValue = i18n.getText("sendBackRemark");
            }
            sap.ui.getCore().byId("MIF_id_RemarkLabel").setText(oValue);
            sap.ui.getCore().byId("MIF_id_remark").setValue("");
            sap.ui.getCore().byId("MIF_id_DialogManRemark").setTitle(oDialogTitle);
            sap.ui.getCore().byId("MIF_id_DialogManRemark");
            sap.ui.getCore().byId("MIF_id_remark").setValueState("None");
        },

        MTF_onPressOk: async function() {
            const btnText = sap.ui.getCore().byId("MIF_id_OkBtn").getText();
            const i18n = this.getView().getModel("i18n").getResourceBundle();
            const remark = sap.ui.getCore().byId("MIF_id_remark").getValue().trim();

            const statusMap = {
                "Approve": "Approved",
                "Send Back": "Send Back"
            };
            if (!remark) {
                sap.m.MessageToast.show(i18n.getText("enterComments"));
                sap.ui.getCore().byId("MIF_id_remark").setValueState("Error");
                return;
            }
            try {
                this.getBusyDialog()
                const oData = this.getView().getModel("AdminSignupModel").getData();

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
                        Status: statusMap[btnText], //  Approval-specific fields
                        AdminComment: remark
                    },
                    filters: {
                        UserID: oData.UserID
                    }
                };
                await this.ajaxUpdateWithJQuery("HM_Login", payload);
                this.oDialog.close();
                // Reload latest data
                await this._loadVendorDetails(oData.UserID);
            } catch (err) {
                sap.m.MessageBox.error(
                    btnText === "Approve" ?
                    i18n.getText("erroApproveMessage") :
                    i18n.getText("errorResendMessage")
                );
            } finally {
                this.closeBusyDialog()
                sap.m.MessageToast.show(
                    btnText === "Approve" ?
                    i18n.getText("approveMessageSuccess") :
                    i18n.getText("resendMessageSuccess")
                );
            }
        },

        MIF_onPressClose: function() {
            this.oDialog.close();
        },

        MIF_liveChangeForMangerComments() {
            const input = sap.ui.getCore().byId("MIF_id_remark");
            if (!input.getValue()) {
                input.setValueStateText(this.getView().getModel('i18n').getResourceBundle().getText("commentsValueState"));
                input.setValueState("Error");
                return false;
            }
            input.setValueState("None");
            return true;
        },

        onAdminChangeSalutation: function(oEvent) {
            const oSalutation = oEvent.getSource();
            const sKey = oSalutation.getSelectedKey();

            // Gender control from the same view
            const oGender = this.byId("MV_id_Gender");

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

        onAdminLiveValidate: function(oEvent) {
            const id = oEvent.getSource().getId();
            if (id.includes("MV_id_VendorName")) { // Vendor name
                utils._LCvalidateName(oEvent);
                return;
            }
            if (id.includes("MV_id_Email")) { // Email
                utils._LCvalidateEmail(oEvent);
                return;
            }
            if (id.includes("MV_id_Address")) { // Address
                utils._LCvalidateMandatoryField(oEvent);
                return;
            }
        },

        ADMIN_onChangeGender: function(oEvent) {
            const oSelect = oEvent.getSource();
            const key = oSelect.getSelectedKey();
            this.getView().getModel("AdminSignupModel").setProperty("/Gender", key);
            oSelect.setValueState(key ? "None" : "Error");
        },

        ADMIN_onChangeCountry: function(oEvent) {
            const oCountry = oEvent.getSource();
            const oView = this.getView();
            const oModel = oView.getModel("AdminSignupModel");

            const oState = this.byId("MV_id_State");
            const oCity = this.byId("MV_id_City");
            const oSTD = this.byId("MV_id_StdCode");
            const oMobile = this.byId("MV_id_MobileNo");
            // sanitize
            oCountry.setValue(oCountry.getValue().replace(/[^a-zA-Z\s]/g, ""));
            utils._LCvalidateMandatoryField(oEvent);
            // reset model
            ["State", "City", "STDCode", "Mobile"].forEach(p => oModel.setProperty("/" + p, ""));
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
            oState.getBinding("items")?.filter([new sap.ui.model.Filter("countryCode", "EQ", sCode)]);
            // STD handling
            const countries = this.getOwnerComponent().getModel("CountryModel").getData();
            const data = countries.find(c => c.countryName === sCountry);
            if (data?.stdCode) {
                oModel.setProperty("/STDCode", data.stdCode);
                oSTD.setValue(data.stdCode);
                this.ADMIN_onChangeSTD();
            }
        },

        ADMIN_onChangeState: function(oEvent) {
            const oState = oEvent.getSource();
            const oModel = this.getView().getModel("AdminSignupModel");

            oState.setValue(oState.getValue().replace(/[^a-zA-Z\s]/g, ""));
            utils._LCvalidateMandatoryField(oEvent);

            const sState = oState.getSelectedItem()?.getText() || oState.getValue() || "";
            oModel.setProperty("/State", sState);

            const oCity = this.byId("MV_id_City");
            oCity.setValue("").setSelectedKey("");
            oModel.setProperty("/City", "");
            // block city
            oCity.getBinding("items")?.filter([
                new sap.ui.model.Filter("cityName", "EQ", "__NONE__")
            ]);
            const oCountry = this.byId("MV_id_Country");
            const sCode = oCountry.getSelectedItem()?.getAdditionalText()?.trim();
            if (!sCode || !sState) return;
            // release cities
            oCity.getBinding("items")?.filter([
                new sap.ui.model.Filter("stateName", "EQ", sState),
                new sap.ui.model.Filter("countryCode", "EQ", sCode)
            ]);
        },

        ADMIN_onChangeCity: function(oEvent) {
            const oCity = oEvent.getSource();
            const oModel = this.getView().getModel("AdminSignupModel");

            oCity.setValue(oCity.getValue().replace(/[^a-zA-Z\s]/g, ""));
            utils._LCvalidateMandatoryField(oEvent);

            const sCity = oCity.getSelectedItem()?.getText() || oCity.getValue() || "";
            oModel.setProperty("/City", sCity);
        },

        ADMIN_onChangeSTD: function() {
            const oSTD = this.byId("MV_id_StdCode");
            const oMobile = this.byId("MV_id_MobileNo");

            const std = oSTD.getValue();
            // Reset mobile field
            oMobile.setMaxLength(std === "+91" ? 10 : 18);
            // Clear value states
            oSTD.setValueState("None");
            oMobile.setValueState("None");
        },

        ADMIN_onMobileLiveChange: function(oEvent) {
            const oInput = oEvent.getSource();
            let val = oInput.getValue().replace(/\D/g, "");
            oInput.setValue(val);

            if (!val) {
                oInput.setValueState("None");
                return;
            }
            const std = this.byId("MV_id_StdCode").getValue();
            const isValid = utils._LCvalidateISDmobile(oInput, std);
            oInput.setValueState(isValid ? "None" : "Error");
        },

        onChangeDOB: function(oEvent) {
            utils._LCvalidateDate(oEvent);
        },

        onUploadDocumentFile: function() {
            const oTable = this.byId("MV_id_adminAttachmentTable");
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

        onCloseDialog: function() {
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
                    const sBase64 = e.target.result.split(",")[1];
                    const oPayload = {
                        data: {
                            UserID: oAdminModel.getProperty("/UserID"),
                            DocumentType: sDocType,
                            File: sBase64,
                            FileName: oFile.name,
                            FileType: oFile.type,
                            MemberID: oAdminModel.getProperty("/UserID"),
                        }
                    };
                    that.getBusyDialog()
                    await that.ajaxCreateWithJQuery("HM_CustomerDocument", oPayload);
                    // RELOAD DOCUMENTS → TABLE UPDATES
                    await that._loadVendorDetails(oAdminModel.getProperty("/UserID"));
                    // Reset
                    oAdminModel.setProperty("/CurrentDocType", "");
                    oFileUploader.clear();
                } catch (err) {
                    that.closeBusyDialog()
                    MessageToast.show(that.i18nModel.getText("docUploadError"));
                } finally {
                    that.closeBusyDialog()
                    MessageToast.show(that.i18nModel.getText("docUploadSuccess"));
                }
            };
            reader.readAsDataURL(oFile);
            this.UD_Dialog.close();
        }
    });
});