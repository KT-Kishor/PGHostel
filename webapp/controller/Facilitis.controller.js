sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "../model/formatter",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast",
], function (BaseController, utils, Formatter, Spreadsheet, MessageToast) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Facilitis", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteFacilitis").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function (oEvent) {
            this.commonLoginFunction();
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle(); // Get i18n model

            var model = new sap.ui.model.json.JSONModel({
                BranchCode: "",
                Type: "",
                PerHourPrice: "",
                PerDayPrice: "",
                PerMonthPrice: "",
                PerYearPrice: "",
                FacilityName: ""
            });
            this.getView().setModel(model, "FacilitiesModel")

            const oTokenModel = new sap.ui.model.json.JSONModel({
                tokens: []
            });
            const oUploaderData = new sap.ui.model.json.JSONModel({
                attachments: []
            });

            this.getView().setModel(oTokenModel, "tokenModel");
            this.getView().setModel(oUploaderData, "UploaderData");
            this.onClearAndSearch("FO_id_FilterbarEmployee");
            await this._loadBranchCode()
            this.oValue = oEvent.getParameter("arguments").value;
            try {
                if (this.oValue === "Facilities") {
                    await this.readCallForFacilities("Initial");
                    this.FC_onPressClear(); // Clear the filter bar
                } else {
                    await this.FC_onSearch(); // Filter function for trainee
                }
            } catch (err) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        FC_onSearch: async function () {
            var aFilterItems = this.byId("FO_id_FilterbarEmployee").getFilterGroupItems();
            var params = {};

            aFilterItems.forEach(function (oItem) {
                var oControl = oItem.getControl();
                if (!oControl) return;

                var sKey = oItem.getName();
                var sValue = "";

                // If control has getSelectedKey (ComboBox)
                if (oControl.getSelectedKey && oControl.getSelectedKey()) {
                    sValue = oControl.getSelectedKey(); // preferred for ComboBox
                }
                // else fallback for Input fields
                else if (oControl.getValue && oControl.getValue()) {
                    sValue = oControl.getValue();
                }

                if (sValue) {
                    params[sKey] = sValue;
                }
            });

            await this.readCallForFacilities(params).catch((error) => {
                MessageToast.show(error.message || error.responseText);
            }).finally(() => {
                sap.ui.core.BusyIndicator.hide();
            });
        },

        readCallForFacilities: async function (filter) {

            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];

            let aBranchCodes = [];
            if (Array.isArray(omainModel) && omainModel.length) {
                aBranchCodes = omainModel.map(item => item.BranchID).flat().filter(Boolean).join(",");
            }else if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode
                    .split(",")
                    .map(code => code.trim());
            }

            // Normalize filter
            filter = (typeof filter === "object" && filter !== null) ?
                filter : {
                    filter: filter
                };

            // IMPORTANT FIX
            // Apply LoginModel BranchCode only if user did not select BranchCode in filter
            if (
                oExistingModel.Role === "Admin" &&
                !filter.BranchCode
            ) {
                filter.BranchCode = aBranchCodes;
                filter.Role ="Admin";

            }else{
                filter.BranchCode = aBranchCodes;
            }

            console.log("FINAL FILTER →", filter);

            sap.ui.core.BusyIndicator.show(0);

            try {
                const oData = await this.ajaxReadWithJQuery("HM_ExtraFacilities", filter);

                let responseData = [];
                if (Array.isArray(oData.data)) {
                    responseData = oData.data;
                } else if (oData.data && Array.isArray(oData.data.data)) {
                    responseData = oData.data.data;
                } else {
                    responseData = [oData.data];
                }

                this.getOwnerComponent().setModel(
                    new sap.ui.model.json.JSONModel(responseData),
                    "Facilities"
                );

                if (filter.filter === "Initial") {
                    const facilitiesData = [
                        ...new Map(
                            responseData
                                .filter(item => item.FacilityName)
                                .map(item => [item.FacilityName.trim(), item])
                        ).values()
                    ];

                    this.getView().setModel(
                        new sap.ui.model.json.JSONModel(facilitiesData),
                        "facilitiesDataModelInitial"
                    );
                }

            } catch (error) {
                sap.m.MessageToast.show(error.message || error.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },


        _loadBranchCode: async function () {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];

            let aBranchCodes = "";

            if (Array.isArray(omainModel) && omainModel.length) {
                aBranchCodes = omainModel
                    .map(item => item.BranchID)
                    .flat()
                    .filter(Boolean)
                    .join(",");
            } else if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode;
            }

            let filters = {};

            if (oExistingModel.Role === "Admin" && aBranchCodes) {
                filters.BranchID = aBranchCodes;
            }else{
                filters.BranchID = aBranchCodes;
            }
            sap.ui.core.BusyIndicator.show(0);
            try {
                const oResponse = await this.ajaxReadWithJQuery("HM_BranchData", filters);
                const aBranches = Array.isArray(oResponse?.data) ? oResponse.data : (oResponse?.data ? [oResponse.data] : []);
                const oBranchModel = new sap.ui.model.json.JSONModel(aBranches);
                this.getView().setModel(oBranchModel, "BranchModel");
            } catch (err) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.message || err.responseText);
            }
        },

        FD_RoomDetails: function (oEvent) {
            this.byId("id_facilityTable").removeSelections();
            var oView = this.getView();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Facilities", this);
                oView.addDependent(this.ARD_Dialog);
            }

            // Reset model data
            var oFacilitiesModel = oView.getModel("FacilitiesModel");
            if (oFacilitiesModel) {
                oFacilitiesModel.setData({
                    ID: "",
                    BranchCode: "",
                    FacilityName: "",
                    Type: "",
                    PerHourPrice: "",
                    PerDayPrice: "",
                    PerMonthPrice: "",
                    PerYearPrice: "",
                });
            }

            // Clear tokens and upload data for new record
            oView.getModel("tokenModel").setData({
                tokens: []
            });
            oView.getModel("UploaderData").setData({
                attachments: [],
                isFileUploaded: false
            });

            // Reset input value states
            this._resetFacilityValueStates();
            this.ARD_Dialog.open();
        },

        FD_onCancelButtonPress: function () {
            var oView = this.getView();

            // Clear all data on close
            if (oView.getModel("FacilitiesModel")) {
                oView.getModel("FacilitiesModel").setData({
                    ID: "",
                    BranchCode: "",
                    FacilityName: "",
                    Type: "",
                    PerHourPrice: "",
                    PerDayPrice: "",
                    PerMonthPrice: "",
                    PerYearPrice: "",
                });
            }

            // Clear file uploader and reset value states
            this._resetFacilityValueStates();
            var oTable = this.byId("id_facilityTable");
            oTable.removeSelections();
            this.ARD_Dialog.close();
        },

        FD_onsavebuttonpress: async function () {
            const oView = this.getView();
            const oFacilitiesModel = oView.getModel("FacilitiesModel");
            const oUploaderData = oView.getModel("UploaderData");
            const attachments = oUploaderData.getProperty("/attachments") || [];
            const Payload = oFacilitiesModel.getData();
            var aFacilitiesData = oView.getModel("Facilities").getData();

            //  Mandatory field validation
            var isMandatoryValid = (
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("idRoomType123")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("idFacilityName")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("idFacilityName1")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("FL_id_Currency")), "ID")
            );

            if (!isMandatoryValid) {
                sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            if ((Payload.PerHourPrice === "" || Payload.PerHourPrice === 0) 
                && (Payload.PerDayPrice === "" || Payload.PerDayPrice === 0)
                && (Payload.PerMonthPrice === "" || Payload.PerMonthPrice === 0)
                && (Payload.PerYearPrice === "" || Payload.PerYearPrice === 0)) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseFillatLeastOnePrice"));
                return;
            }

            // File validation
            var Attachment = oView.getModel("tokenModel").getData();
            if (!Attachment.tokens || Attachment.tokens.length === 0) {
                return sap.m.MessageBox.error(this.i18nModel.getText("uploadFile"));
            }

            //  Duplicate check
            var bDuplicate = aFacilitiesData.some(function (facility) {
                if (Payload.ID && facility.ID === Payload.ID) return false; // Skip comparing the same record during update
                return (
                    facility.BranchCode === Payload.BranchCode &&
                    facility.FacilityName.trim().toLowerCase() === Payload.FacilityName.trim().toLowerCase()
                );
            });

            if (bDuplicate) {
                sap.m.MessageToast.show(this.i18nModel.getText("facilitywiththesameratetypealreadyexistsforthisbranch"));
                return;
            }

            if (attachments.length === 0) {
                sap.m.MessageBox.error(this.i18nModel.getText("pleaseUploadatLeastOneImage"));
                return;
            }

            if (attachments.length > 3) {
                sap.m.MessageBox.error(this.i18nModel.getText("youcanuploadamaximumof3imagesonly"));
                return;
            }

            const oData = {
                data: {
                    BranchCode: Payload.BranchCode,
                    FacilityName: Payload.FacilityName,
                    Type: Payload.Type,
                    PerHourPrice: Payload.PerHourPrice || 0,
                    PerDayPrice: Payload.PerDayPrice || 0,
                    PerMonthPrice: Payload.PerMonthPrice || 0,
                    PerYearPrice: Payload.PerYearPrice || 0,
                    Currency: Payload.Currency
                },
                Attachment: {}
            };

            oData.Attachment.FacilityName = Payload.FacilityName;
            oData.Attachment.BranchCode = Payload.BranchCode;

            attachments.slice(0, 3).forEach((file, index) => {
                const num = index + 1;
                oData.Attachment[`Photo${num}`] = file.content || "";
                oData.Attachment[`Photo${num}Name`] = file.filename || "";
                oData.Attachment[`Photo${num}Type`] = file.fileType || "";
            });

            for (let i = attachments.length + 1; i <= 3; i++) {
                oData.Attachment[`Photo${i}`] = "";
                oData.Attachment[`Photo${i}Name`] = "";
                oData.Attachment[`Photo${i}Type`] = "";
            }

            sap.ui.core.BusyIndicator.show(0);
            try {
                await this.ajaxCreateWithJQuery("HM_ExtraFacilities", {
                    data: oData
                });
                sap.m.MessageToast.show(this.i18nModel.getText("facilityAddedSuccessfully"));
                oView.getModel("UploaderData").setData({
                    attachments: []
                });
                oView.getModel("tokenModel").setData({
                    tokens: []
                });
                this.ARD_Dialog.close();
                return this.readCallForFacilities("Initial");
            } catch (err) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        _resetFacilityValueStates: function () {
            var oView = this.getView();
            var aFields = ["idRoomType123", "idFacilityName", "idFacilityName1", "FL_id_Currency", "idPerHourPrice",
                "idPerDayPrice", "idPerMonthPrice", "idPerYearPrice"
            ];
            aFields.forEach(function (sId) {
                var oField = sap.ui.getCore().byId(oView.createId(sId));
                if (oField && oField.setValueState) {
                    oField.setValueState("None");
                }
            });
        },

        onFacilitybranchChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCstrictValidationComboBox(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");

            var sBranchCode = this.byId("idRoomType123").getSelectedKey();

            var oCountryModel = this.getView().getModel("CountryModel").getData();
            var oBranchModel = this.getView().getModel("BranchModel").getData();

            var Branch = oBranchModel.find((item) => {
                return item.BranchID === sBranchCode
            })

            var Currency = oCountryModel.find((item) => {
                return item.countryName === Branch.Country
            })
            this.getView().getModel("FacilitiesModel").setProperty("/Currency", Currency.currency);
        },

        onChangeCurrency: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCstrictValidationComboBox(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onFacilityNameChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onFacilityTypeChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onPriceChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateAmount(oEvent.getSource(), "ID");
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onFileSizeExceeds: function () {
            sap.m.MessageToast.show(this.i18nModel.getText("fileSizeExceeds"));
        },

        onTokenDelete: function (oEvent) {
            const oView = this.getView();
            const oTokenModel = oView.getModel("tokenModel");
            const oUploaderData = oView.getModel("UploaderData");

            let aTokens = oTokenModel.getProperty("/tokens") || [];
            let aAttachments = oUploaderData.getProperty("/attachments") || [];

            const oListItem = oEvent.getParameter("listItem");
            if (oListItem) {
                const oCtx = oListItem.getBindingContext("UploaderData");
                const sFileName = oCtx.getProperty("filename");

                aAttachments = aAttachments.filter(file => file.filename !== sFileName);
                aTokens = aTokens.filter(token => token.key !== sFileName);
            }
            const aDeletedTokens = oEvent.getParameter("tokens");
            if (aDeletedTokens) {
                aDeletedTokens.forEach((oDeletedToken) => {
                    const sKey = oDeletedToken.getKey();
                    aTokens = aTokens.filter(token => token.key !== sKey);
                    aAttachments = aAttachments.filter(file => file.filename !== sKey);
                });
            }
            oTokenModel.setProperty("/tokens", aTokens);
            oUploaderData.setProperty("/attachments", aAttachments);
            this.byId("id_fileUploader").clear();
        },

        onFacilityFileChange: function (oEvent) {
            const oFiles = oEvent.getParameter("files");
            if (!oFiles || oFiles.length === 0) return;

            const oView = this.getView();
            const oUploaderData = oView.getModel("UploaderData");
            const oTokenModel = oView.getModel("tokenModel");

            let aAttachments = oUploaderData.getProperty("/attachments") || [];
            let aTokens = oTokenModel.getProperty("/tokens") || [];

            // Block if already 3 files uploaded
            if (aAttachments.length >= 3) {
                sap.m.MessageToast.show(this.i18nModel.getText("youcanuploadamaximumof3imagesonly"));
                return;
            }

            // Only allow remaining slots
            const iAvailableSlots = 3 - aAttachments.length;
            const aSelectedFiles = Array.from(oFiles).slice(0, iAvailableSlots);

            aSelectedFiles.forEach((oFile) => {
                if (oFile.size > 2 * 1024 * 1024) {
                    sap.m.MessageToast.show(`"${oFile.name}" exceeds 2 MB size limit.`);
                    return;
                }
                const bIsDuplicate = aAttachments.some(att =>
                    att.filename === oFile.name // filename duplicate
                );

                if (bIsDuplicate) {
                    sap.m.MessageToast.show(`"${oFile.name}" is already uploaded.`);
                    return;
                }

                // Validate file type
                if (!oFile.type.match(/^image\/(jpeg|jpg|png)$/)) {
                    sap.m.MessageToast.show(this.i18nModel.getText("onlyimagefilesareallowed"));
                    return;
                }

                const oReader = new FileReader();
                oReader.onload = (e) => {
                    const sBase64 = e.target.result.split(",")[1];

                    // Final Duplicate Check using file content
                    const bContentDuplicate = aAttachments.some(att => att.content === sBase64);

                    if (bContentDuplicate) {
                        sap.m.MessageToast.show(this.i18nModel.getText("thisimageisalreadyuploaded"));
                        return;
                    }

                    // Add attachment
                    aAttachments.push({
                        content: sBase64,
                        fileType: oFile.type,
                        filename: oFile.name,
                        size: this._formatFileSize(oFile.size)
                    });

                    // Add token
                    aTokens.push({
                        key: oFile.name,
                        text: oFile.name
                    });

                    oUploaderData.setProperty("/attachments", aAttachments);
                    oTokenModel.setProperty("/tokens", aTokens);
                };

                oReader.readAsDataURL(oFile);
            });
        },

        _formatFileSize: function (bytes) {
            if (!bytes) return "0 Bytes";
            const sizes = ["Bytes", "KB", "MB", "GB"];
            let i = Math.floor(Math.log(bytes) / Math.log(1024));
            return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
        },

        FC_onPressClear: function () {
            this.getView().byId("FN_id_FacilityName").setSelectedKey("")
            this.getView().byId("FN_id_BranchCode").setSelectedKey("")
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
            this.getView().getModel("Facilities").setData({});
        },

        onHome: function () {
            this.CommonLogoutFunction();
            this.getView().getModel("Faciilties").setData({});
        },

        FD_onFacilityRowPress: function (oEvent) {
            var ofacilityID = oEvent.getSource().getBindingContext("Facilities").getObject().ID;
            var onav = this.getOwnerComponent().getRouter()
            onav.navTo("RouteFacilitiesDetails", {
                sPath: ofacilityID
            });
        },

        HM_DeleteDetails: async function () {
            var oTable = this.byId("id_facilityTable");
            var aSelectedItems = oTable.getSelectedItems();

            if (aSelectedItems.length === 0) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectatLeastOneRecordtoDelete"));
                return;
            }

            var that = this;  // Keep the correct reference to the controller
            var sNames = aSelectedItems.map(item => {
                var oData = item.getBindingContext("Facilities").getObject();
                return oData.FacilityName;
            }).join(", ");

            sap.m.MessageBox.confirm(
                `Are you sure you want to delete the selected facilities: ${sNames}?`, {
                icon: sap.m.MessageBox.Icon.WARNING,
                title: "Confirm Deletion",
                actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                emphasizedAction: sap.m.MessageBox.Action.NO,
                onClose: async function (sAction) {
                    if (sAction === sap.m.MessageBox.Action.YES) {
                        try {
                            sap.ui.core.BusyIndicator.show(0);
                            const aDeletePromises = aSelectedItems.map(async (item) => {
                                var oData = item.getBindingContext("Facilities").getObject();
                                await that.ajaxDeleteWithJQuery("HM_ExtraFacilities", {
                                    filters: {
                                        ID: oData.ID
                                    }
                                });
                            });

                            await Promise.all(aDeletePromises);
                            sap.m.MessageToast.show(that.i18nModel.getText("facilitiesdeletedsuccessfully")); // Use 'that' here
                            return that.readCallForFacilities("Initial");
                        } catch (err) {
                            sap.ui.core.BusyIndicator.hide();
                            sap.m.MessageToast.show(err.message || err.responseText);
                        } finally {
                            sap.ui.core.BusyIndicator.hide();
                            oTable.removeSelections(true);
                        }
                    } else {
                        oTable.removeSelections(true);
                    }
                }
            });
        },

        createTableSheet: function () {
            return [{
                label: "Facility Name",
                property: "FacilityName",
                type: "string"
            },
            {
                label: "Type",
                property: "Type",
                type: "string"
            },
            {
                label: "Hourly Price",
                property: "PerHourPrice",
                type: "string"
            },
            {
                label: "Daily Price",
                property: "PerDayPrice",
                type: "string"
            },
            {
                label: "Monthly Price",
                property: "PerMonthPrice",
                type: "string"
            },
            {
                label: "Yearly Price",
                property: "PerYearPrice",
                type: "string"
            }
            ]
        },

        MD_onDownload: function () {
            const oModel = this.byId("id_facilityTable").getModel("Facilities").getData();
            if (!oModel || oModel.length === 0) {
                MessageToast.show(this.i18nModel.getText("MSnodata"));
                return;
            }
            const adjustedData = oModel.map(item => ({
                ...item,
                PerHourPrice: item.PerHourPrice + " " + item.Currency,
                PerDayPrice: item.PerDayPrice + " " + item.Currency,
                PerMonthPrice: item.PerMonthPrice + " " + item.Currency,
                PerYearPrice: item.PerYearPrice + " " + item.Currency
                // Pincode: item.Pincode ? String(item.Pincode) : "",
                // Contact: item.Contact ? String(item.Contact) : ""
            }));
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level"
                },
                dataSource: adjustedData,
                fileName: "Facilities_Details.xlsx",
                worker: false
            };
            MessageToast.show(this.i18nModel.getText("downloadingFacilitiesDetails"));
            const oSheet = new sap.ui.export.Spreadsheet(oSettings);

            oSheet.build().then(() => {
                MessageToast.show(this.i18nModel.getText("MSdownloadedsuccess"));
            }).finally(() => {
                oSheet.destroy();
            });
        },
    });
});