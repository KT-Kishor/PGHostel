sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "../model/formatter",
    "sap/m/MessageToast",
], function (BaseController, utils, Formatter, MessageToast) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.VendorDetail", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteVendorDetail").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function (oEvent) {
            this.getBusyDialog()
            try {
                const encodedUserID = oEvent.getParameter("arguments")?.UserID;
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
                const bValid = await this._validateVendorUserID(decodedUserID);
                if (!bValid) {
                    return this._goToNotFound();
                }
                this.sUserID = decodedUserID;
                var Layout = this.byId("V_id_ObjectPageLayout");
                Layout.setSelectedSection(this.byId("V_id_OrderHeaderSection1"));

                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

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
                // ✅ Must exist AND must be in Send Back status
                return (
                    oResp?.data?.length === 1 &&
                    oResp.data[0].Status === "Send Back"
                );
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
                this.getBusyDialog()

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
            sap.m.MessageToast.show(this.i18nModel.getText("fileSizeExceeds"));
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
            } finally {
                this.closeBusyDialog()
            }
        },

        onAdminSelectionChange: function (oEvent) {
            const oTable = oEvent.getSource();
            const bHasSelection = oTable.getSelectedItems().length > 0;

            this.getView().getModel("editable").setProperty("/hasSelection", bHasSelection);
        },

        onAdminDeleteFiles: function () {
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
                        this._loadVendorDetails(sUserID); // refresh attachment list
                        fnResetSelection();
                    } catch (err) {
                        sap.m.MessageToast.show(err.message || "Delete failed");
                    } finally {
                        this.closeBusyDialog()
                        sap.m.MessageToast.show(this.i18nModel.getText("docdeletedSuccess"));
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

            if (sMimeType.startsWith("image/")) {
                let sImageSrc = `data:${sMimeType};base64,${sBase64}`;

                if (!this._oAdminPreviewDialog) {

                    const oFlex = new sap.m.FlexBox({
                        width: "100%",
                        height: "100%",
                        renderType: "Div",
                        justifyContent: "Center",
                        alignItems: "Center",
                        items: [
                            new sap.m.Image({
                                id: this.createId("adminDocPreviewImage"),
                                densityAware: false,
                                width: "100%",
                                height: "100%",
                                style: "object-fit: contain; display:block;"
                            })
                        ]
                    });

                    this._oAdminPreviewDialog = new sap.m.Dialog({
                        title: oDoc.FileName || "Document Image",
                        contentWidth: "50%",
                        contentHeight: "60%",
                        draggable: true,
                        resizable: true,
                        contentPadding: "0rem",
                        horizontalScrolling: false,
                        verticalScrolling: true,
                        content: [oFlex],

                        beginButton: new sap.m.Button({
                            text: "Close",
                            press: function () {
                                this._oAdminPreviewDialog.close();
                            }.bind(this)
                        }),

                        afterClose: function () {
                            this._oAdminPreviewDialog.destroy();
                            this._oAdminPreviewDialog = null;
                        }.bind(this)
                    });
                    this.getView().addDependent(this._oAdminPreviewDialog);
                } else {
                    this._oAdminPreviewDialog.setTitle(oDoc.FileName || "Document Image");
                }
                this.byId("adminDocPreviewImage").setSrc(sImageSrc);
                this._oAdminPreviewDialog.open();
                return;
            }

            if (sMimeType === "application/pdf") {
                if (!this._oAdminPreviewDialog) {
                    this._oAdminPreviewDialog = new sap.m.Dialog({
                        title: "Document Preview",
                        stretch: true,
                        draggable: true,
                        resizable: true,
                        contentWidth: "50%",
                        contentHeight: "50%",
                        horizontalScrolling: true,
                        verticalScrolling: false,
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
                        }),
                        afterClose: function () {
                            this._oAdminPreviewDialog.destroy();
                            this._oAdminPreviewDialog = null;
                        }.bind(this)
                    });
                    this.getView().addDependent(this._oAdminPreviewDialog);
                }
                this._oAdminPreviewDialog.removeAllContent();
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
                this._oAdminPreviewDialog.open();
                return;
            }
            sap.m.MessageToast.show("Preview not supported.");
        },

        onAdminChangeSalutation: function (oEvent) {
            const oSalutation = oEvent.getSource();
            const sKey = oSalutation.getSelectedKey();
            const oGender = this.byId("V_id_Gender");
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

        onFacilityFileChange: function (oEvent) {
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

            reader.onload = async function (e) {
                try {
                    const sBase64 = e.target.result.split(",")[1];
                    const oPayload = {
                        data: {
                            UserID: oAdminModel.getProperty("/UserID"),
                            DocumentType: sDocType,
                            File: sBase64,
                            FileName: oFile.name,
                            FileType: oFile.type,
                            MemberID : oAdminModel.getProperty("/UserID")
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