sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "../utils/validation",
     "../model/formatter",
     "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Image",
    "sap/ui/core/HTML",
], function(BaseController, MessageBox, utils, Formatter, Dialog, Button, Image, HTML) {
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
                this.commonLoginFunction();
                var Layout = this.byId("MV_id_ObjectPageLayout");
                Layout.setSelectedSection(this.byId("MV_id_OrderHeaderSection1"));

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
                Documents: [],
                UploadEnabled: false,
                DocTypeEnabled: true
            });
            this.getView().setModel(oModel, "AdminSignupModel");
        },

        _applyCountryStateCityFilters: function () {
                const oModel     = this.getView().getModel("AdminSignupModel");
                const oCountryCB = this.byId("MV_id_Country");
                const oStateCB   = this.byId("MV_id_State");
                const oSourceCB  = this.byId("MV_id_City");
 
                const sCountry   = oModel.getProperty("/Country");     // e.g. "Australia"
                const sState     = oModel.getProperty("/State");       // e.g. "Queensland"
                const sSource    = oModel.getProperty("/City");      // e.g. "Bongaree"
 
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
                    DateOfBirth: this.Formatter.DateFormat(oData.DateOfBirth) || "",
                     Documents: (oData[0].Documents || []).map(doc => ({
                        FileName: doc.FileName,
                        VdocType: doc.DocumentType,   
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
                sap.m.MessageToast.show("Failed to load vendor details");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        onAdminFileSelect: function(oEvent) {
            const oFile = oEvent.getParameter("files")[0];
            const oModel = this.getView().getModel("AdminSignupModel");
            const aDocs = oModel.getProperty("/Documents") || [];

            const reader = new FileReader();
            reader.onload = function(e) {
                aDocs.push({
                    DocumentID: sap.ui.core.UUID.randomUUID(),
                    DocumentType: oModel.getProperty("/CurrentDocType"),
                    File: e.target.result.split(",")[1],
                    FileName: oFile.name,
                    FileType: oFile.type,
                    size: oFile.size
                });
                oModel.setProperty("/Documents", aDocs);
                oModel.setProperty("/CurrentDocType", "");
            };

            reader.readAsDataURL(oFile);
        },

        BI_onEditButtonPress: function() {
            this.getView().getModel("editable").setProperty("/Edit", true);
        },

        BI_onButtonPress: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteManageVendor");
        },

        BT_onsavebuttonpress: async function() {
            try {
                const oModel = this.getView().getModel("AdminSignupModel");
                const oData = oModel.getData();

                // Basic validation
                if (!oData.VendorName || !oData.Email || !oData.Mobile) {
                    MessageBox.error("Please fill all mandatory fields");
                    return;
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
                        DateOfBirth: oData.DOB,
                        Documents: oData.Documents
                    }
                };

                sap.ui.core.BusyIndicator.show(0);

                await this.ajaxUpdateWithJQuery("HM_LoginAndCustomerDocument", payload);
                this.getView().getModel("editable").setProperty("/Edit", false);
                MessageBox.success("Vendor details updated successfully");
                await this._loadVendorDetails(oData.UserID);
            } catch (err) {
                MessageBox.error(err.message || "Update failed");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        _base64ToBlob: function (sBase64, sMimeType) {
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

            return new Blob(byteArrays, { type: sMimeType });
        },

        onAdminPreviewDoc: function (oEvent) {
            const oSource = oEvent.getSource();
            const oContext = oSource.getBindingContext("AdminSignupModel");

            if (!oContext) {
                sap.m.MessageToast.show("No document data found.");
                return;
            }

            const oDoc = oContext.getObject();
            const sBase64 = oDoc.File;
            const sMimeType = oDoc.FileType || "image/png";
            const sFileName = oDoc.FileName || "Document";

            if (!sBase64) {
                sap.m.MessageToast.show("Attachment not available.");
                return;
            }

            // Store for download
            this.SelectedData = {
                Attachment: sBase64,
                AttachmentType: sMimeType,
                AttachmentName: sFileName
            };

            // Create dialog once
            if (!this._oPreviewDialog) {
                this._oPreviewDialog = new Dialog({
                    title: sFileName,
                    stretch: true,
                    draggable: true,
                    resizable: true,
                    contentWidth: "80%",
                    contentHeight: "80%",
                    horizontalScrolling: false,
                    verticalScrolling: false,
                    beginButton: new Button({
                        text: "Download",
                        press: this.Exp_Det_onPressDownloadAttachment.bind(this)
                    }),
                    endButton: new Button({
                        text: "Close",
                        press: function () {
                            if (this._pdfBlobUrl) {
                                URL.revokeObjectURL(this._pdfBlobUrl);
                                this._pdfBlobUrl = null;
                            }
                            this._oPreviewDialog.close();
                        }.bind(this)
                    })
                });

                this._oPreviewDialog.addStyleClass("noDialogPadding");
                this.getView().addDependent(this._oPreviewDialog);
            }

            this._oPreviewDialog.setTitle(sFileName);
            this._oPreviewDialog.removeAllContent();

            /* ================= Image Preview ================= */
            if (sMimeType.startsWith("image/")) {
                const sImageSrc = `data:${sMimeType};base64,${sBase64}`;
                const oImage = new Image({
                    src: sImageSrc,
                    densityAware: false
                }).addStyleClass("imagePreviewFit");

                this._oPreviewDialog.addContent(oImage);
                this._oPreviewDialog.open();
                return;
            }

            /* ================= PDF Preview ================= */
            if (sMimeType === "application/pdf") {
                const oBlob = this._base64ToBlob(sBase64, sMimeType);
                const sBlobUrl = URL.createObjectURL(oBlob);
                this._pdfBlobUrl = sBlobUrl;

                this._oPreviewDialog.addContent(
                    new HTML({
                        content: `<iframe src="${sBlobUrl}" width="100%" height="100%" style="border:none;"></iframe>`
                    })
                );

                this._oPreviewDialog.open();
                return;
            }
            this.Exp_Det_onPressDownloadAttachment();
        },

        Exp_Det_onPressDownloadAttachment: function () {
            try {
                if (!this.SelectedData || !this.SelectedData.Attachment) {
                    sap.m.MessageToast.show("No attachment available for download.");
                    return;
                }

                const sBase64 = this.SelectedData.Attachment;
                const sMimeType = this.SelectedData.AttachmentType || "application/octet-stream";
                const sFileName = this.SelectedData.AttachmentName || "Document";

                const oBlob = this._base64ToBlob(sBase64, sMimeType);
                const sBlobUrl = URL.createObjectURL(oBlob);

                const oLink = document.createElement("a");
                oLink.href = sBlobUrl;
                oLink.download = sFileName;
                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);

                URL.revokeObjectURL(sBlobUrl);
                this.SelectedData = null;

            } catch (e) {
                sap.m.MessageToast.show("Download failed.");
            }
        },

        onAdminChangeSalutation: function (oEvent) {

            const oSalutation = oEvent.getSource();
            const sKey = oSalutation.getSelectedKey();

            const oGender = this.byId("adminGender");

            // 🔥 Clear salutation error immediately
            oSalutation.setValueState("None");

            if (!oGender) return;

            // Reset gender first
            oGender.setSelectedKey("");
            oGender.setEnabled(true);

            // Auto-map gender
            if (sKey === "Mr.") {
                oGender.setSelectedKey("Male");
                oGender.setEnabled(false);
            }
            else if (sKey === "Ms." || sKey === "Mrs.") {
                oGender.setSelectedKey("Female");
                oGender.setEnabled(false);
            }
            // Dr. → manual gender selection

            // ✅ Strict validation (CONTROL, not event)
            utils._LCstrictValidationSelect(oSalutation);
        },

        onAdminLiveValidate: function (oEvent) {

            const id = oEvent.getSource().getId();

            // Vendor name
            if (id.includes("adminVendorName")) {
                utils._LCvalidateName(oEvent);
                return;
            }
            // Email
            if (id.includes("adminEmail")) {
                utils._LCvalidateEmail(oEvent);
                return;
            }

            // Address
            if (id.includes("adminAddress")) {
                utils._LCvalidateMandatoryField(oEvent);
                return;
            }
        },

         ADMIN_onChangeGender: function (oEvent) {
            const oSelect = oEvent.getSource();
            const key = oSelect.getSelectedKey();

            this.getView().getModel("AdminSignupModel")
                .setProperty("/Gender", key);

            oSelect.setValueState(key ? "None" : "Error");
        },

         onAdminLiveValidate: function (oEvent) {

            const id = oEvent.getSource().getId();

            // Vendor name
            if (id.includes("adminVendorName")) {
                utils._LCvalidateName(oEvent);
                return;
            }
            // Email
            if (id.includes("adminEmail")) {
                utils._LCvalidateEmail(oEvent);
                return;
            }

            // Address
            if (id.includes("adminAddress")) {
                utils._LCvalidateMandatoryField(oEvent);
                return;
            }
        },

         ADMIN_onChangeCountry: function (oEvent) {
            const isValid = utils._LCvalidateMandatoryField(oEvent);
            if (!isValid) return;
            const oCountry = oEvent.getSource();
            const oModel = this.getView().getModel("AdminSignupModel");

            const oStateModel = this.getView().getModel("StateModel");
            const oCityModel = this.getView().getModel("CityModel");

            const oState = this.byId("adminsignUpState");
            const oCity = this.byId("adminsignUpCity");
            const oSTD = this.byId("adminsignUpSTD");
            const oMobile = this.byId("adminMobileNo");


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
            const oCity = this.byId("adminsignUpCity");
            const oCityModel = this.getView().getModel("CityModel");

            // --- SANITIZE INPUT ---
            const val = oState.getValue().replace(/[^a-zA-Z\s]/g, "");
            oState.setValue(val);

            // Clear state error always (typed or selected)
            oState.setValueState("None");

            // Clear city (dependent)
            oModel.setProperty("/City", "");
            oCity.setSelectedKey("").setValue("");
            oCityModel.setProperty("/filtered", []);

            // Detect manual typing: break auto-selection
            if (oState.getSelectedItem() &&
                val !== oState.getSelectedItem().getText()) {

                oState.setSelectedKey(null);
                oState.setSelectionItem(null);
            }

            const selected = oState.getSelectedItem();
            const selectedCountry = oCountry.getSelectedItem();


            if (!selected || !selectedCountry) {
                oModel.setProperty("/State", val);
                return;
            }

            const sStateText = selected.getText();
            oModel.setProperty("/State", sStateText);

            const sCountryCode = selectedCountry.getAdditionalText().trim();

            // Filter cities
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

            // --- SANITIZE INPUT ---
            const val = oCityCtrl.getValue().replace(/[^a-zA-Z\s]/g, "");
            oCityCtrl.setValue(val);

            // City clears its own error ALWAYS (typed or selected)
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
            const oMobile = this.byId("adminMobileNo");
            const oModel = this.getView().getModel("AdminSignupModel");

            // Clean its own state
            oSTD.setValueState("None");

            // Reset mobile on STD change
            oMobile.setValue("");

            // Max length logic
            oMobile.setMaxLength(oSTD.getValue() === "+91" ? 10 : 18);

            // Update model
            oModel.setProperty("/STDCode", oSTD.getValue());
        },

        onChangeDOB: function(oEvent) {
            utils._LCvalidateDate(oEvent);
        },

        ADMIN_onMobileLiveChange: function (oEvent) {
            const isValid = utils._LCvalidateMandatoryField(oEvent);
            if (!isValid) return;
            const oInput = oEvent.getSource();
            let val = oInput.getValue().replace(/\D/g, "");
            oInput.setValue(val);

            const oSTD = this.byId("adminsignUpSTD");
            const stdRaw = oSTD?.getValue() || "";
            const std = stdRaw.startsWith("+") ? stdRaw : "+" + stdRaw;

            if (!val) {
                oInput.setValueState("None");
                return;
            }

            if (!std || std === "+") {
                oInput.setValueState("Error");
                oInput.setValueStateText("Select ISD code first");
                return;
            }

            const valid = utils._LCvalidateISDmobile(oInput, std);

            oInput.setValueState(valid ? "None" : "Error");
            if (!valid) {
                oInput.setValueStateText("Enter valid mobile number");
            }
        },

         onAdminDocTypeChange: function (oEvent) {
            const oModel = this.getView().getModel("AdminSignupModel");
            const key = oEvent.getSource().getSelectedKey();

            oModel.setProperty("/UploadEnabled", !!key);
        },
        _isDuplicateFile: function (fileName) {
            const docs = this.getView()
                .getModel("AdminSignupModel")
                .getProperty("/Documents") || [];

            return docs.some(d => d.FileName === fileName);
        },



        _onCollectAdminSignupPayloadDocs: function () {
            const oModel = this.getView().getModel("AdminSignupModel");
            const aDocs = oModel.getProperty("/Documents") || [];

            const aPayloadDocs = aDocs.map(d => ({
                FileName: d.FileName,
                DocumentType: d.DocumentType,
                FileType: d.FileType,
                Base64: d.Base64
            }));

            return aPayloadDocs;
        },

        onAdminDeleteDoc: function (oEvent) {
            const oModel = this.getView().getModel("AdminSignupModel");
            const oDocType = this.byId("adminDocType");
            const table = this.byId("adminAttachmentTable");

            const oCtx = oEvent.getParameter("listItem")
                .getBindingContext("AdminSignupModel");

            const doc = oCtx.getObject(); // ✅ define first

            // 🧹 Cleanup preview blob
            if (doc.PreviewUrl) {
                URL.revokeObjectURL(doc.PreviewUrl);
            }

            const index = parseInt(oCtx.getPath().split("/").pop(), 10);
            const docs = oModel.getProperty("/Documents") || [];

            docs.splice(index, 1);
            oModel.setProperty("/Documents", docs);

            // ♻️ Restore doc type option
            oDocType.addItem(new sap.ui.core.ListItem({
                key: doc.VdocType,
                text: doc.VdocType
            }));

            oModel.setProperty("/DocTypeEnabled", true);

            // 🔴 If no documents left → show error highlight
            if (docs.length === 0) {
                table?.addStyleClass("fileErrorHighlight");
            }
        },

    });
});