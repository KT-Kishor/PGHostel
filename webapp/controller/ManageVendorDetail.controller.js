sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "../model/formatter",
    "sap/collaboration/components/fiori/sharing/attachment/Attachment",
    "sap/m/MessageToast",
], function (BaseController, utils, Formatter, Attachment, MessageToast) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.ManageVendorDetail", {
        Formatter: Formatter,
        onInit: function () {
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

        _onRouteMatched: async function (oEvent) {
            try {
                // this.commonLoginFunction();
                var Layout = this.byId("MV_id_ObjectPageLayout");
                Layout.setSelectedSection(this.byId("MV_id_OrderHeaderSection1"));
                this.commonLoginFunction();

                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                // Editable control model
                const oEditableModel = new sap.ui.model.json.JSONModel({
                    Edit: false,
                    Save: false
                });
                this.getView().setModel(oEditableModel, "editable");
                this._initAdminSignupModel();
                this.sUserID = oEvent.getParameter("arguments").UserID;
                await this._loadVendorDetails(this.sUserID);
                this._applyCountryStateCityFilters();
                sap.ui.core.BusyIndicator.hide();
            } catch (err) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
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

        _loadVendorDetails: async function (sUserID) {
            try {
                sap.ui.core.BusyIndicator.show(0);

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
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        onDocumentTypeChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        onAdminFileSelect: function (oEvent) {
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
            reader.onload = async function (e) {
                try {
                    const sBase64 = e.target.result.split(",")[1];
                    const oPayload = {
                        data: {
                            CustomerID: oModel.getProperty("/UserID"),
                            DocumentType: sDocType,
                            File: sBase64,
                            FileName: oFile.name,
                            FileType: oFile.type
                        }
                    };

                    sap.ui.core.BusyIndicator.show(0);
                    await that.ajaxCreateWithJQuery("HM_CustomerDocument", oPayload);
                    MessageToast.show(that.i18nModel.getText("docUploadSuccess"));
                    await that._loadVendorDetails(oModel.getProperty("/UserID"));
                    oModel.setProperty("/CurrentDocType", "");
                    that.byId("MV_id_adminFileUploader").clear();
                } catch (err) {
                    MessageToast.show(that.i18nModel.getText("docUploadError"));
                } finally {
                    sap.ui.core.BusyIndicator.hide();
                }
            };

            reader.readAsDataURL(oFile);
        },

        onFileSizeExceeds: function () {
            sap.m.MessageToast.show(this.i18nModel.getText("fileSizeExceeds"));
        },

        BI_onEditButtonPress: function () {
            this.getView().getModel("editable").setProperty("/Edit", true);
        },

        BI_onButtonPress: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteManageVendor");
        },

        onEditOrSavePress: async function () {
            const oEditableModel = this.getView().getModel("editable");
            const bEditMode = oEditableModel.getProperty("/Edit");

            if (!bEditMode) {
                // === EDIT MODE ===
                oEditableModel.setProperty("/Edit", true);
                oEditableModel.setProperty("/Save", true);
            } else {
                // === SAVE MODE ===
                const bSaved = await this.BT_onsavebuttonpress(); // ✅ await result
                if (bSaved === true) {
                    oEditableModel.setProperty("/Edit", false);
                    oEditableModel.setProperty("/Save", false);
                }
            }
        },

        BT_onsavebuttonpress: async function () {
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
                    utils._LCvalidateMandatoryField(C("MV_id_StdCode"), "ID") === true &&
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
                        DateOfBirth: oData.DOB
                    },
                    filters: {
                        UserID: oData.UserID
                    }
                };

                sap.ui.core.BusyIndicator.show(0);
                await this.ajaxUpdateWithJQuery("HM_Login", payload);

                MessageToast.show(this.i18nModel.getText("vendorUpdateSuccess"));
                await this._loadVendorDetails(oData.UserID);
                sap.ui.core.BusyIndicator.hide();
                return true;
            } catch (err) {
                MessageToast.show(this.i18nModel.getText(err.message || "Updatefailed"));
                return false;
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        onAdminSelectionChange: function () {
            this.byId("AdminDeleteButton").setEnabled(true);
            this.byId("AdminDownloadButton").setEnabled(true);
        },

        onAdminDeleteFiles: function () {
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
                this.byId("AdminDeleteButton").setEnabled(false);
                this.byId("AdminDownloadButton").setEnabled(false);
            };

            this.showConfirmationDialog(
                "Confirm",
                "Are you sure you want to delete this document?",
                async () => {
                    try {
                        sap.ui.core.BusyIndicator.show(0);

                        await this.ajaxDeleteWithJQuery("/HM_CustomerDocument", {
                            filters: {
                                DocumentID: oContext.getProperty("DocumentID"),
                                CustomerID: sUserID
                            }
                        });

                        sap.m.MessageToast.show(this.i18nModel.getText("docdeletedSuccess"));
                        this._loadVendorDetails(sUserID); // refresh attachment list
                        fnResetSelection();
                    } catch (err) {
                        sap.m.MessageToast.show(err.message || "Delete failed");
                    } finally {
                        sap.ui.core.BusyIndicator.hide();
                    }
                },
                () => {
                    // Cancel callback
                    fnResetSelection();
                }
            );
        },

        onAdminDownloadFiles: function () {
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

        onAdminPreviewDoc: function (oEvent) {
            function autoDecodeBase64(b64) {
                if (!b64) return "";
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

            const oDoc = oEvent.getSource().getBindingContext("AdminSignupModel")?.getObject();
            if (!oDoc || !oDoc.File) {
                sap.m.MessageBox.error(this.i18nModel.getText("nodocfound"));
                return;
            }

            const sBase64 = autoDecodeBase64(oDoc.File);
            let sMimeType = "application/octet-stream";

            if (sBase64.startsWith("iVB")) {
                sMimeType = "image/png";
            } else if (sBase64.startsWith("/9j")) {
                sMimeType = "image/jpeg";
            } else if (sBase64.startsWith("JVBER")) {
                sMimeType = "application/pdf";
            }

            if (!this._oAdminPreviewDialog) {
                this._oAdminPreviewDialog = new sap.m.Dialog({
                    title: "Document Preview",
                    stretch: true,
                    draggable: true,
                    resizable: true,
                    contentWidth: "50%",
                    contentHeight: "auto",
                    horizontalScrolling: false,
                    contentPadding: "0rem",
                    endButton: new sap.m.Button({
                        text: "Close",
                        press: () => {
                            if (this._previewUrl) {
                                URL.revokeObjectURL(this._previewUrl);
                                this._previewUrl = null;
                            }
                            this._oAdminPreviewDialog.close();
                        }
                    })
                });

                this.getView().addDependent(this._oAdminPreviewDialog);
            }

            this._oAdminPreviewDialog.removeAllContent();
            if (sMimeType.startsWith("image/")) {

                const sImageUri = `data:${sMimeType};base64,${sBase64}`;

                const oImage = new sap.m.Image({
                    src: sImageUri,
                    densityAware: false
                });

                oImage.addStyleClass("imagePreviewFit");

                this._oAdminPreviewDialog.addContent(oImage);

            } else if (sMimeType === "application/pdf") {

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

                const blob = new Blob(byteArrays, {
                    type: sMimeType
                });

                if (this._previewUrl) {
                    URL.revokeObjectURL(this._previewUrl);
                }
                this._previewUrl = URL.createObjectURL(blob);

                this._oAdminPreviewDialog.addContent(
                    new sap.ui.core.HTML({
                        sanitizeContent: false,
                        content: `
                    <iframe
                        src="${this._previewUrl}"
                        style="width:100%; height:600px; border:none; display:block;">
                    </iframe>
                `
                    })
                );
            } else {
                this._oAdminPreviewDialog.addContent(
                    new sap.m.Text({
                        text: "Preview not supported."
                    })
                );
            }
            this._oAdminPreviewDialog.open();
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
            sap.ui.getCore().byId("MIF_id_remark").setValueState("None");
        },

        MTF_onPressOk: async function () {
            const btnText = sap.ui.getCore().byId("MIF_id_OkBtn").getText();
            const i18n = this.getView().getModel("i18n").getResourceBundle();
            const remark = sap.ui.getCore().byId("MIF_id_remark").getValue().trim();

            const statusMap = {
                "Approve": "Approved",
                "Send Back": "Send back"
            };

            if (!remark) {
                sap.m.MessageToast.show(i18n.getText("enterComments"));
                sap.ui.getCore().byId("MIF_id_remark").setValueState("Error");
                return;
            }

            try {
                sap.ui.core.BusyIndicator.show(0);

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
                        DateOfBirth: oData.DateOfBirth,
                        Status: statusMap[btnText], //  Approval-specific fields
                        AdminComment: remark
                    },
                    filters: {
                        UserID: oData.UserID
                    }
                };

                await this.ajaxUpdateWithJQuery("HM_Login", payload);

                sap.m.MessageToast.show(
                    btnText === "Approve" ?
                        i18n.getText("approveMessageSuccess") :
                        i18n.getText("resendMessageSuccess")
                );

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
                sap.ui.core.BusyIndicator.hide();
            }
        },

        MIF_onPressClose: function () {
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

        onAdminChangeSalutation: function (oEvent) {
            const oSalutation = oEvent.getSource();
            const sKey = oSalutation.getSelectedKey();
            const oGender = this.byId("MV_id_Gender");
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

            utils._LCstrictValidationSelect(oSalutation);
        },

        onAdminLiveValidate: function (oEvent) {
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

        ADMIN_onChangeGender: function (oEvent) {
            const oSelect = oEvent.getSource();
            const key = oSelect.getSelectedKey();
            this.getView().getModel("AdminSignupModel").setProperty("/Gender", key);
            oSelect.setValueState(key ? "None" : "Error");
        },

        ADMIN_onChangeCountry: function (oEvent) {
            const isValid = utils._LCvalidateMandatoryField(oEvent);
            if (!isValid) return;
            const oCountry = oEvent.getSource();
            const oModel = this.getView().getModel("AdminSignupModel");

            const oStateModel = this.getView().getModel("StateModel");
            const oCityModel = this.getView().getModel("CityModel");
            const oState = this.byId("MV_id_State");
            const oCity = this.byId("MV_id_City");
            const oSTD = this.byId("MV_id_StdCode");
            const oMobile = this.byId("MV_id_MobileNo");

            // --- 1) SANITIZE TYPED COUNTRY TEXT ---
            const val = oCountry.getValue().replace(/[^a-zA-Z\s]/g, "");
            oCountry.setValue(val);

            // If typed text diverges from auto-selected item → clear selection
            if (oCountry.getSelectedItem() &&
                val !== oCountry.getSelectedItem().getText()) {
                oCountry.setSelectedKey(null);
                oCountry.setSelectionItem(null);
            }

            // --- 2) RESET dependent model properties ---
            oModel.setProperty("/State", "");
            oModel.setProperty("/City", "");
            oModel.setProperty("/STDCode", "");

            // Reset UI fields
            oState.setValue("").setSelectedKey("");
            oCity.setValue("").setSelectedKey("");
            oSTD.setValue("").setSelectedKey("");
            oMobile.setValue("");

            // Always clear local filtered lists
            oStateModel.setProperty("/filtered", []);
            oCityModel.setProperty("/filtered", []);
            oSTD.getBinding("items")?.filter([]);

            // Determine selected item
            const selected = oCountry.getSelectedItem();

            oCountry.setValueState("None");

            // CASE B — MANUAL COUNTRY TYPED (no selection)
            if (!selected) {
                // ONLY clear country error — DO NOT set errors on others
                oModel.setProperty("/Country", val);
                return;
            }

            // CASE A — COUNTRY SELECTED
            oModel.setProperty("/Country", selected.getText());

            // Clear ALL dependent errors (valid selection now)
            oCountry.setValueState("None");
            oState.setValueState("None");
            oCity.setValueState("None");
            oSTD.setValueState("None");
            oMobile.setValueState("None");

            const sCountryCode = selected.getAdditionalText().trim();

            // Mobile length rule
            oMobile.setMaxLength(sCountryCode === "IN" ? 10 : 18);

            // Filter states
            const allStates = oStateModel.getData();
            const filteredStates = allStates.filter(s => s.countryCode === sCountryCode);
            oStateModel.setProperty("/filtered", filteredStates);

            // Filter STD codes
            oSTD.getBinding("items")?.filter([
                new sap.ui.model.Filter("code", "EQ", sCountryCode)
            ]);

            // Auto-select first STD item
            setTimeout(() => {
                const items = oSTD.getItems();
                if (items.length > 0) {
                    const key = items[0].getKey();
                    oSTD.setSelectedKey(key);
                    oModel.setProperty("/STDCode", key);
                }
            }, 30);

            // If no states exist → empty city list
            if (filteredStates.length === 0) {
                oCityModel.setProperty("/filtered", []);
            }
        },

        ADMIN_onChangeState: function (oEvent) {
            const isValid = utils._LCvalidateMandatoryField(oEvent);
            if (!isValid) return;

            const oState = oEvent.getSource();
            const oModel = this.getView().getModel("AdminSignupModel");

            const oCountry = this.byId("adminsignUpCountry");
            const oCity = this.byId("MV_id_City");
            const oCityModel = this.getView().getModel("CityModel");

            const val = (oState.getValue() || "").replace(/[^a-zA-Z\s]/g, "");
            oState.setValue(val);
            oState.setValueState("None");

            oModel.setProperty("/City", "");   // Clear dependent city
            oCity.setSelectedKey("").setValue("");
            oCityModel.setProperty("/filtered", []);

            const selected = (typeof oState.getSelectedItem === "function") ?
                oState.getSelectedItem() :
                null;

            if (selected && val !== selected.getText()) {
                oState.setSelectedKey(null);
                oState.setSelectionItem(null);
            }

            const selectedCountry = (typeof oCountry.getSelectedItem === "function") ?
                oCountry.getSelectedItem() :
                null;

            if (!selected || !selectedCountry) {
                oModel.setProperty("/State", val);
                return;
            }

            const sStateText = selected.getText();
            oModel.setProperty("/State", sStateText);
            const sCountryCode = selectedCountry.getAdditionalText().trim();

            const allCities = oCityModel.getData();
            const filteredCities = allCities.filter(c =>
                c.countryCode === sCountryCode &&
                c.stateName === sStateText
            );

            oCityModel.setProperty("/filtered", filteredCities);
        },

        ADMIN_onChangeCity: function (oEvent) {
            const isValid = utils._LCvalidateMandatoryField(oEvent);
            if (!isValid) return;

            const oCityCtrl = oEvent.getSource();
            const oModel = this.getView().getModel("AdminSignupModel");
            const val = oCityCtrl.getValue().replace(/[^a-zA-Z\s]/g, "");
            oCityCtrl.setValue(val);
            oCityCtrl.setValueState("None");

            const selected = oCityCtrl.getSelectedItem();
            if (selected) {
                oModel.setProperty("/City", selected.getText());
                return;
            }
            oModel.setProperty("/City", val);
        },

        ADMIN_onChangeSTD: function (oEvent) {
            const isValid = utils._LCvalidateMandatoryField(oEvent);
            if (!isValid) return;

            const oSTD = oEvent.getSource(); // easier than getCore()
            const oMobile = this.byId("MV_id_MobileNo");
            const oModel = this.getView().getModel("AdminSignupModel");
            oSTD.setValueState("None");
            oMobile.setValue("");
            oMobile.setMaxLength(oSTD.getValue() === "+91" ? 10 : 18);
            oModel.setProperty("/STDCode", oSTD.getValue());
        },

        onChangeDOB: function (oEvent) {
            utils._LCvalidateDate(oEvent);
        },

        ADMIN_onMobileLiveChange: function (oEvent) {
            const isValid = utils._LCvalidateMandatoryField(oEvent);
            if (!isValid) return;
            const oInput = oEvent.getSource();
            let val = oInput.getValue().replace(/\D/g, "");
            oInput.setValue(val);

            const oSTD = this.byId("MV_id_StdCode");
            const stdRaw = oSTD?.getValue() || "";
            const std = stdRaw.startsWith("+") ? stdRaw : "+" + stdRaw;

            if (!val) {
                oInput.setValueState("None");
                return;
            }

            if (!std || std === "+") {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("enterisdcode"));
                return;
            }

            const valid = utils._LCvalidateISDmobile(oInput, std);
            oInput.setValueState(valid ? "None" : "Error");
            if (!valid) {
                oInput.setValueStateText(this.i18nModel.getText("enterMobileNo"));
            }
        }
    });
});