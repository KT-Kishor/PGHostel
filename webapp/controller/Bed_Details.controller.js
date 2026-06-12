sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet",
    "../model/formatter"
], function(BaseController, utils, MessageToast,
    Spreadsheet, Formatter) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Bed_Details", {
        Formatter: Formatter,
        onInit: function() {
            this.getOwnerComponent().getRouter().getRoute("RouteBedDetails").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function(oEvent) {
            try {
                this.getBusyDialog();
                var LoginFUnction = await this.commonLoginFunction("ManageBedType");
                if (!LoginFUnction) return;
                var oView = this.getView();
                var oModel = oView.getModel("BedDetails");
                var sPath = oEvent.getParameter("arguments").sPath;

                if (sPath === "Tile Page") {
                    this.onClearAndSearch("BD_id_FilterbarEmployee");
                }

                if (!oModel) {
                    oModel = new sap.ui.model.json.JSONModel({});
                    oView.setModel(oModel, "BedDetails");
                }

                var model = new sap.ui.model.json.JSONModel({
                    BranchCode: "",
                    Name: "",
                    ACType: "",
                });
                this.getView().setModel(model, "BedModel")

                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                const oTokenModel = new sap.ui.model.json.JSONModel({
                    tokens: []
                });

                const oUploaderData = new sap.ui.model.json.JSONModel({
                    attachments: []
                });

                this.getView().setModel(oTokenModel, "tokenModel");
                this.getView().setModel(oUploaderData, "UploaderData");
                await this._loadBranchCode()
                await this.Onsearch("true", true);
                this.Customerdata()
            } catch (err) {
                this.closeBusyDialog()
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                
                this.closeBusyDialog()
            }
        },

        Customerdata: function() {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];

            let aBranchCodes = "";

            if (Array.isArray(omainModel) && omainModel.length) {
                aBranchCodes = omainModel.map(item => item.BranchID).flat().filter(Boolean).join(",");
            } else if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode;
            }

            let filters = {};

            if (oExistingModel.Role === "Admin" && aBranchCodes) {
                filters.BranchCode = aBranchCodes;
                filters.Role = "Admin";
            } else {
                filters.BranchCode = "";
            }
            this.ajaxReadWithJQuery("HM_Customer", filters).then((response) => {

                const oModel = new sap.ui.model.json.JSONModel(response.Customers);
                this.getView().setModel(oModel, "HostelModel");
            }).catch(() => this.closeBusyDialog())
        },

        getGroupHeader: function(oGroup) {
            return this.getStyledGroupHeader(oGroup);
        },

        _loadBranchCode: async function() {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];

            let aBranchCodes = "";

            if (Array.isArray(omainModel) && omainModel.length) {
                aBranchCodes = omainModel.map(item => item.BranchID).flat().filter(Boolean).join(",");
            } else if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode;
            }

            let filters = {};

            if (oExistingModel.Role === "Admin" && aBranchCodes) {
                filters.BranchID = aBranchCodes;
                filters.Role = "Admin";
            } else if (oExistingModel.Role === "SuperAdmin") {
                filters.BranchID = "";
            } else {
                filters.BranchID = oExistingModel.BranchCode;
            }
            try {
                const oView = this.getView();

                const oResponse = await this.ajaxReadWithJQuery("HM_BranchData", filters);

                const aBranches = Array.isArray(oResponse?.data) ?
                    oResponse.data :
                    (oResponse?.data ? [oResponse.data] : []);

                const oBranchModel = new sap.ui.model.json.JSONModel(aBranches);
                oView.setModel(oBranchModel, "BranchModel");

            } catch (err) {
                this.closeBusyDialog()
                sap.m.MessageToast.show(err.message || err.responseText);
            }
        },

        onPriceInputLiveChange: function(oEvent) {
            const oInput = oEvent.getSource();
            let sValue = oInput.getValue();

            // Allow digits and one decimal point
            sValue = sValue.replace(/[^0-9.]/g, "");

            // Allow only one decimal point
            const aParts = sValue.split(".");
            if (aParts.length > 2) {
                sValue = aParts[0] + "." + aParts[1];
            }

            // Limit to 2 decimal places
            if (aParts[1]) {
                aParts[1] = aParts[1].substring(0, 2);
                sValue = aParts[0] + "." + aParts[1];
            }

            oInput.setValue(sValue);
        },

        HM_RoomDetails: function(oEvent) {
            if (this.ARD_Dialog) {
                this.ARD_Dialog.destroy();
                this.ARD_Dialog = null;
            }
            this.byId("id_BedTable").removeSelections();
            var oView = this.getView();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Bed_Type", this);
                oView.addDependent(this.ARD_Dialog);
            }
            oView.getModel("BedModel").setData({})

            // Clear tokens and upload data for new record
            oView.getModel("tokenModel").setData({
                tokens: []
            });

            oView.getModel("UploaderData").setData({
                attachments: [],
                isFileUploaded: false
            });

            var aControls = this.ARD_Dialog.findAggregatedObjects(true, function(oControl) {
                return oControl instanceof sap.m.Input ||
                    oControl instanceof sap.m.ComboBox ||
                    oControl instanceof sap.m.Select ||
                    oControl instanceof sap.m.TextArea;
            });

            aControls.forEach(function(oControl) {
                oControl.setValueState("None");
            });
            this.ARD_Dialog.open();
        },

        onNoOfPersonInputLiveChange: function(oEvent) {
            utils.onNumber(oEvent.getSource(), "ID");
        },

        onLivehange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        BT_onsavebuttonpress: async function() {
            var oView = this.getView();
            var Payload = oView.getModel("BedModel").getData();
            const oUploaderData = oView.getModel("UploaderData");
            const attachments = oUploaderData.getProperty("/attachments") || [];

            if (
                utils._LCstrictValidationComboBox(oView.byId("BD_id_RoomType12"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("BD_idBedType"), "ID") &&
                utils._LCstrictValidationComboBox(oView.byId("BD_id_Roomtype"), "ID") &&
                utils.onNumber(oView.byId("BD_id_Person"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("BD_id_MaxBeds"), "ID") &&
                utils.onNumber(oView.byId("BD_id_DepositAmount"), "ID") &&
                utils._LCstrictValidationComboBox(oView.byId("BD_id_DepositCurrency"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("BD_id_Description"), "ID")
            ) {
                var Attachment = oView.getModel("tokenModel").getData();
                if (!Attachment.tokens || Attachment.tokens.length === 0) {
                    return sap.m.MessageToast.show(this.i18nModel.getText("pleaseUploadatLeastOneImage"));
                }

                if (attachments.length === 0) {
                    sap.m.MessageBox.error(this.i18nModel.getText("pleaseUploadatLeastOneImage"));
                    return;
                }
                if (attachments.length > 5) {
                    sap.m.MessageBox.error(this.i18nModel.getText("youcanUploadMaximumof5ImagesOnly"));
                    return;
                }

                var aBedDetails = oView.getModel("BedDetails").getData() || "";
                var bDuplicate = aBedDetails.some(function(bed) {
                    // skip the same record in edit mode
                    if (Payload.ID && bed.ID === Payload.ID) {
                        return false;
                    }
                    return (
                        bed.Name.trim().toLowerCase() === Payload.Name.trim().toLowerCase() &&
                        bed.BranchCode === Payload.BranchCode &&
                        bed.ACType === Payload.ACType
                    );
                });

                if (bDuplicate) {
                    sap.m.MessageToast.show(
                        this.i18nModel.getText("bedwithSameBedTypeBranchCodeACTypeAlreadyExists")
                    );
                    return;
                }

                // File validation
                const oData = {
                    data: {
                        Name: Payload.Name.trim(),
                        BranchCode: Payload.BranchCode.split('-')[0],
                        ACType: Payload.ACType,
                        NoOfPerson: Payload.NoOfPerson.trim(),
                        ExtraBed: Payload.ExtraBed,
                        MaxBeds: Payload.MaxBeds.trim(),
                        Deposit: Payload.Deposit.trim(),
                        DepositCurrency: Payload.DepositCurrency,
                        Description: Payload.Description
                    },
                    Attachment: {}
                };

                attachments.slice(0, 5).forEach((file, index) => {
                    const num = index + 1;
                    oData.Attachment[`Photo${num}`] = file.content || "";
                    oData.Attachment[`Photo${num}Name`] = file.displayName || "";
                    oData.Attachment[`Photo${num}Type`] = file.fileType || "";
                });

                for (let i = attachments.length + 1; i <= 5; i++) {
                    oData.Attachment[`Photo${i}`] = "";
                    oData.Attachment[`Photo${i}Name`] = "";
                    oData.Attachment[`Photo${i}Type`] = "";
                }
                oData.Attachment.BranchCode = Payload.BranchCode

                try {
                    this.getBusyDialog()
                    await this.ajaxCreateWithJQuery("HM_BedType", {
                        data: oData
                    });
                    oView.getModel("UploaderData").setData({
                        attachments: []
                    });
                    oView.getModel("tokenModel").setData({
                        tokens: []
                    });
                    await this.Onsearch("true");
                    sap.m.MessageToast.show(this.i18nModel.getText("bedsavedsuccessfully"));
                    this.ARD_Dialog.close();
                    if (this.ARD_Dialog) {
                        this.ARD_Dialog.destroy();
                        this.ARD_Dialog = null;
                    }
                } catch (err) {
                    this.closeBusyDialog()
                    sap.m.MessageToast.show(err.message || err.responseText);
                }
            } else {
                sap.m.MessageToast.show(this.i18nModel.getText("MSfillallfields"));
            }
        },

        onTokenDelete: function(oEvent) {
            const oView = this.getView();

            const oTokenModel = oView.getModel("tokenModel");
            const oUploaderData = oView.getModel("UploaderData");

            let aTokens = oTokenModel.getProperty("/tokens") || [];
            let aAttachments = oUploaderData.getProperty("/attachments") || [];

            // Get pressed button
            const oButton = oEvent.getSource();

            // Get row item
            const oItem = oButton.getParent();

            // Get binding context
            const oCtx = oItem.getBindingContext("UploaderData");

            if (oCtx) {

                // Get selected row index
                const iIndex = parseInt(
                    oCtx.getPath().split("/").pop(),
                    10
                );

                // Remove only selected attachment
                aAttachments.splice(iIndex, 1);

                // Remove only selected token
                aTokens.splice(iIndex, 1);
            }

            oTokenModel.setProperty("/tokens", aTokens);
            oUploaderData.setProperty("/attachments", aAttachments);

            this.byId("BT_id_FileUploader1").clear();
        },

        onFacilityFileChange: async function (oEvent) {
            var oUploader = oEvent.getSource();
            const oFiles = oEvent.getParameter("files");
            if (!oFiles || oFiles.length === 0) return;

            const oView = this.getView();
            const oUploaderData = oView.getModel("UploaderData");
            const oTokenModel = oView.getModel("tokenModel");

            let aAttachments = oUploaderData.getProperty("/attachments") || [];
            let aTokens = oTokenModel.getProperty("/tokens") || [];

            if (aAttachments.length >= 5) {
                sap.m.MessageToast.show(this.i18nModel.getText("youcanUploadMaximumof5ImagesOnly"));
                return;
            }

            const iAvailableSlots = 5 - aAttachments.length;
            const aSelectedFiles = Array.from(oFiles).slice(0, iAvailableSlots);

            for (const oFile of aSelectedFiles) {
                // Skip non-uploader-model entries like processing rows
                const aCurrentAttachments = oUploaderData.getProperty("/attachments") || [];
                const aRealAttachments = aCurrentAttachments.filter(att => !att.isProcessing);

                const bIsDuplicate = aRealAttachments.some(att =>
                    att.filename === oFile.name
                );

                if (bIsDuplicate) {
                    sap.m.MessageToast.show(`"${oFile.name}" is Already Uploaded.`);
                    continue;
                }

                if (!oFile.type.match(/^image\/(jpeg|jpg|png)$/)) {
                    sap.m.MessageToast.show(this.i18nModel.getText("onlyimagefilesareallowed"));
                    continue;
                }

                let processedFile = oFile;
                const MAX_SIZE_MB = 2;
                const fileSizeMB = oFile.size / (1024 * 1024);
                const isImage = oFile.type === "image/jpeg" || oFile.type === "image/jpg" || oFile.type === "image/png";

                const sTempId = this._addBusyProcessingRow();

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
                        processedFile = await imageCompression(oFile, options);
                    } else if (fileSizeMB > MAX_SIZE_MB && !isImage) {
                        throw new Error("Only images can be compressed");
                    }

                    this.closeBusyDialog();

                    const sBase64 = await new Promise((resolve, reject) => {
                        const oReader = new FileReader();
                        oReader.onload = (e) => resolve(e.target.result.split(",")[1]);
                        oReader.onerror = reject;
                        oReader.readAsDataURL(processedFile);
                    });

                    this._removeProcessingRow(sTempId);

                    aAttachments = oUploaderData.getProperty("/attachments") || [];
                    aTokens = oTokenModel.getProperty("/tokens") || [];

                    const bContentDuplicate = aAttachments.some(att =>
                        att.content === sBase64 && !att.isProcessing
                    );
                    if (bContentDuplicate) {
                        sap.m.MessageToast.show(this.i18nModel.getText("thisimageisalreadyuploaded"));
                        continue;
                    }

                    const sExt = oFile.name.split(".").pop();
                    aAttachments.push({
                        content: sBase64,
                        fileType: processedFile.type,
                        filename: oFile.name,
                        size: this.formatFileSize(processedFile.size),
                        displayName: "BedImage " + (aAttachments.length + 1) + "." + sExt
                    });

                    aTokens.push({
                        key: oFile.name,
                        text: oFile.name
                    });

                    oUploaderData.setProperty("/attachments", aAttachments);
                    oTokenModel.setProperty("/tokens", aTokens);
                } catch (err) {
                    this.closeBusyDialog();
                    this._removeProcessingRow(sTempId);
                    sap.m.MessageToast.show(err.message || "Compression failed. Please try a smaller file.");
                }
            }
            oUploader.clear();
        },

        _addBusyProcessingRow: function () {
            const oModel = this.getView().getModel("UploaderData");
            const aAttachments = oModel.getProperty("/attachments") || [];
            const sTempId = "__processing__" + Date.now();
            const oTempDoc = {
                filename: "Compressing...",
                fileType: "",
                size: 0,
                isProcessing: true,
                tempId: sTempId
            };
            aAttachments.push(oTempDoc);
            oModel.setProperty("/attachments", aAttachments);
            return sTempId;
        },

        _removeProcessingRow: function (sTempId) {
            const oModel = this.getView().getModel("UploaderData");
            let aAttachments = oModel.getProperty("/attachments") || [];
            aAttachments = aAttachments.filter(att => att.tempId !== sTempId);
            oModel.setProperty("/attachments", aAttachments);
        },

        formatFileSize: function(bytes) {
            if (!bytes) return "0 Bytes";
            const sizes = ["Bytes", "KB", "MB", "GB"];
            let i = Math.floor(Math.log(bytes) / Math.log(1024));
            return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
        },

        BT_onCancelButtonPress: function() {
            this.ARD_Dialog.close();
            if (this.ARD_Dialog) {
                this.ARD_Dialog.destroy();
                this.ARD_Dialog = null;
            }
        },

        onNavBack: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
            this.getView().getModel("BedDetails").setData({});
        },

        onHome: function() {
            this.CommonLogoutFunction();
            this.getView().getModel("BedDetails").setData({});
        },

        Onsearch: function(flag, bBusyAlreadyOpen) {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];

            var oView = this.getView();
            var oTable = oView.byId("id_BedTable");
            var oBinding = oTable.getBinding("items");

            var sCustomerName = oView.byId("PO_id_CustomerName").getSelectedKey() ||
                oView.byId("PO_id_CustomerName").getValue();
            var sCustomerID = oView.byId("PO_id_CompanyName").getSelectedKey() ||
                oView.byId("PO_id_CompanyName").getValue();
            var sBranch = oView.byId("PO_id_Branch").getSelectedKey() ||
                oView.byId("PO_id_Branch").getValue();

            let aBranchCodes = [];

            if (Array.isArray(omainModel) && omainModel.length) {
                aBranchCodes = omainModel.map(item => item.BranchID).flat().filter(Boolean).join(",");
            } else if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode
                    .split(",")
                    .map(code => code.trim());
            }

            let filters = {};

            if (oExistingModel.Role === "Admin") {
                filters = {
                    BranchCode: aBranchCodes
                };
                filters.Role = "Admin";
            } else if (oExistingModel.Role === "SuperAdmin") {
                filters.BranchCode = "";
            } else {
                filters = {
                    BranchCode: oExistingModel.BranchCode
                };
            }

            if (sCustomerName) filters.Name = sCustomerName;
            if (sCustomerID) filters.ACType = sCustomerID;
            if (sBranch) filters.BranchCode = sBranch.split('-')[0];

            if (!bBusyAlreadyOpen) {
                this.getBusyDialog();
            }

            return this.ajaxReadWithJQuery("HM_BedType", filters)
                .then((oData) => {

                    let response = Array.isArray(oData.data) ? oData.data : [oData.data];

                    const branchData = this.getView().getModel("BranchModel")?.getData() || [];

                    // Map BranchCode to BranchName directly in response
                    response = response.map(bed => {
                        const branch = branchData.find(br => br.BranchID === bed.BranchCode);
                        return {
                            ...bed,
                            BranchName: branch ? branch.Name : bed.BranchID,
                            BranchID: branch ? branch.BranchID : bed.BranchID,
                            City: branch ? branch.City : "",
                        };
                    });

                    if (!response || response.length === 0) {
                        this._originalBedData = [];
                        const emptyModel = new sap.ui.model.json.JSONModel([]);
                        this.getView().setModel(emptyModel, "BedDetails");
                        return;
                    }

                    if (!this._originalBedData || flag === "true" || flag === undefined || this._originalBedData.length === 0) {
                        this._originalBedData = response;
                    }


                    if (Object.keys(filters).length === 0) {
                        const model = new sap.ui.model.json.JSONModel(this._originalBedData);
                        this.getView().setModel(model, "BedDetails");

                        this._populateUniqueFilterValues(this._originalBedData);
                        return;
                    }

                    const filteredData = response;

                    const model = new sap.ui.model.json.JSONModel(filteredData);
                    this.getView().setModel(model, "BedDetails");

                    this._populateUniqueFilterValues(this._originalBedData);
                })
                .catch((err) => {
                    console.error("Error in search", err);
                    sap.m.MessageBox.error(this.i18nModel.getText("failedtoLoadBedDetails"));
                })
                .finally(() => {
                    this.closeBusyDialog()
                });
        },

        _populateUniqueFilterValues: function(data) {
            let oView = this.getView();

            // ===== Customer Unique =====
            let oCustomerCombo = oView.byId("PO_id_CustomerName");
            oCustomerCombo.destroyItems();

            let uniqueCustomers = new Set();

            data.forEach(item => {
                if (item.Name) {
                    uniqueCustomers.add(item.Name);
                }
            });

            Array.from(uniqueCustomers).sort().forEach(name => {
                    oCustomerCombo.addItem(
                        new sap.ui.core.Item({
                            key: name,
                            text: name
                        })
                    );
                });

            // ===== Branch Unique =====
            let oBranchCombo = oView.byId("PO_id_Branch");
            oBranchCombo.destroyItems();

            let uniqueBranches = new Map();

            data.forEach(item => {

                if (item.BranchID && !uniqueBranches.has(item.BranchID)) {

                    uniqueBranches.set(item.BranchID, {
                        BranchID: item.BranchID,
                        BranchName: item.BranchName,
                        City: item.City
                    });

                }
            });

            Array.from(uniqueBranches.values()).sort((a, b) => a.BranchID.localeCompare(b.BranchID)).forEach(item => {
                    oBranchCombo.addItem(
                        new sap.ui.core.ListItem({
                            key: item.BranchID,
                            text: item.BranchID + " - " + item.BranchName,
                            additionalText: item.City
                        })
                    );

                });

        },

        HM_onSearch: function() {
            var oView = this.getView();
            var oTable = oView.byId("id_BedTable");
            var oBinding = oTable.getBinding("items");

            var sCustomerName = oView.byId("PO_id_CustomerName").getSelectedKey() || oView.byId("PO_id_CustomerName").getValue();
            var sCustomerID = oView.byId("PO_id_CompanyName").getSelectedKey() || oView.byId("PO_id_CompanyName").getValue();

            var aFilters = [];

            if (sCustomerName) {
                aFilters.push(new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sCustomerName));
            }

            if (sCustomerID) {
                aFilters.push(new sap.ui.model.Filter("BranchCode", sap.ui.model.FilterOperator.Contains, sCustomerID));
            }

            var oCombinedFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: true
            });
            oBinding.filter(oCombinedFilter);
        },

        PO_onPressClear: function() {
            this.getView().byId("PO_id_CustomerName").setSelectedKey("")
            this.getView().byId("PO_id_CompanyName").setSelectedKey("")
            this.getView().byId("PO_id_Branch").setSelectedKey("")

        },

        onbranchChange: function(oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
            const sBranchCode = oEvent.getSource().getSelectedKey();
            var oCurrencyModel = this.getView().getModel("BranchModel").getData();

            var oCountryModel = this.getView().getModel("CountryModel").getData();

            var Branch = oCurrencyModel.find((item) => {
                return item.BranchID === sBranchCode
            })

            var Currency = oCountryModel.find((item) => {
                return item.countryName === Branch.Country
            })
            this.getView().getModel("BedModel").setProperty("/DepositCurrency", Currency.currency);
        },

        onNameInputLiveChange: function(oEvent) {
            utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");
        },

        onColumnListItemPress: function(oEvent) {
            var BEdID = oEvent.getSource().getBindingContext("BedDetails").getObject().ID;
            var onav = this.getOwnerComponent().getRouter()
            onav.navTo("RouteRoomImages", {
                sPath: BEdID
            })
        },

        HM_DeleteDetails: function() {
            var CustData = this.getView().getModel("HostelModel").getData();
            var table = this.byId("id_BedTable");
            var aSelectedItems = table.getSelectedItems();

            // No selection
            if (aSelectedItems.length === 0) {
                sap.m.MessageToast.show(
                    this.i18nModel.getText("pleaseSelectatLeastOneRecordtoDelete")
                );
                return;
            }

            var aAssignedBeds = [];
            var aDeletableBeds = [];


            // Split assigned & non-assigned beds
            aSelectedItems.forEach(item => {
                var oBed = item.getBindingContext("BedDetails").getObject();

                var bAssigned = CustData.some(cust =>
                    cust.BranchCode === oBed.BranchCode &&
                    cust.BedType === (oBed.Name + " - " + oBed.ACType) &&
                    cust.Status === "Assigned"
                );

                if (bAssigned) {
                    aAssignedBeds.push(oBed.Name);
                } else {
                    aDeletableBeds.push({
                        name: oBed.Name,
                        item: item
                    });
                }
            });

            // Single selection & assigned → stop
            if (aSelectedItems.length === 1 && aAssignedBeds.length === 1) {
                sap.m.MessageBox.warning(
                    "Cannot delete! Selected bed is already assigned.", {
                        styleClass: "myUnifiedBtn"
                    }
                );
                return;
            }

            // All selected beds are assigned
            if (aDeletableBeds.length === 0) {
                sap.m.MessageBox.warning(
                    "All selected beds are already assigned and cannot be deleted.", {
                        styleClass: "myUnifiedBtn"
                    }
                );
                return;
            }

            // Show only non-assigned bed names in confirm dialog
            var sBedNames = aDeletableBeds
                .map(bed => bed.name)
                .join(", ");
            var sBedNamesA = aAssignedBeds.map(bed => bed).join(", ");

            let sMessage = `Are you sure you want to delete the following bed(s): ${sBedNames}?`;

            if (sBedNamesA && sBedNamesA.length > 0) {
                sMessage += `\nThese beds cannot be deleted because they are currently assigned to: ${sBedNamesA}.`;
            }
            sap.m.MessageBox.confirm(
                sMessage, {
                    title: "Confirm Deletion",
                    icon: sap.m.MessageBox.Icon.WARNING,
                    actions: [
                        sap.m.MessageBox.Action.OK,
                        sap.m.MessageBox.Action.CANCEL
                    ],
                    styleClass: "myUnifiedBtn",
                    onClose: async function(sAction) {
                        // Remove selection on Cancel
                        if (sAction === sap.m.MessageBox.Action.CANCEL) {
                            table.removeSelections(true);
                            return;
                        }
                        if (sAction === sap.m.MessageBox.Action.OK) {
                            this.getBusyDialog()
                            try {
                                const deletePromises = aDeletableBeds.map(bedObj => {
                                    const data = bedObj.item
                                        .getBindingContext("BedDetails")
                                        .getObject();

                                    return $.ajax({
                                        url: "https://rest.kalpavrikshatechnologies.com/stayvriksha/HM_BedType",
                                        method: "DELETE",
                                        contentType: "application/json",
                                        data: JSON.stringify({
                                            filters: {
                                                ID: data.ID
                                            }
                                        }),
                                        headers: {
                                            name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                                            password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                                        }
                                    });
                                });

                                await Promise.all(deletePromises);
                                await this.Onsearch("true");

                                sap.m.MessageToast.show(
                                    this.i18nModel.getText("selectedBedDeletedSuccessfully")
                                );
                            } catch (error) {
                                console.error("Delete failed:", error);
                                sap.m.MessageBox.error(
                                    this.i18nModel.getText("errorwhileDeletingBedPleaseTryAgain")
                                );
                            } finally {
                                this.closeBusyDialog()
                                table.removeSelections(true);
                            }
                        }
                    }.bind(this)
                }
            );
        },
        
        onDepositCurrency: function(oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        },

        BD_onDownload: function() {
            const oModel = this.byId("id_BedTable").getModel("BedDetails").getData();
            if (!oModel || oModel.length === 0) {
                MessageToast.show(this.i18nModel.getText("MSnodata"));
                return;
            }
            const adjustedData = oModel.map(item => ({
                ...item,
                MaxBeds: item.MaxBeds ? String(item.MaxBeds) : "",
                NoOfPerson: item.NoOfPerson ? String(item.NoOfPerson) : "",
                Deposit: item.Deposit + " " + item.DepositCurrency
            }));
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level",
                    context: {
                        sheetName: "Bed Details"
                    }
                },
                dataSource: adjustedData,
                fileName: "Bed_Details.xlsx",
                worker: false,
            };
            MessageToast.show(this.i18nModel.getText("downloadingRoomDetails"));
            const oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function() {
                oSheet.destroy();
            });
        },

        onPreviewBedImage: async function(oEvent) {
            const oCtx = oEvent.getSource().getBindingContext("UploaderData");
            if (!oCtx) return;

            const oAttachment = oCtx.getObject();
            if (!oAttachment || !oAttachment.content) {
                sap.m.MessageToast.show("No image found");
                return;
            }

            function autoDecodeBase64(b64) {
                if (!b64) return "";
                b64 = b64.replace(/\s/g, "");
                let last = b64;
                for (let i = 0; i < 5; i++) {
                    try {
                        if (last.startsWith("iVB") || last.startsWith("/9j") || last.startsWith("JVBER")) {
                            return last;
                        }
                        last = atob(last);
                    } catch (e) {
                        break;
                    }
                }
                return last;
            }

            const sBase64 = autoDecodeBase64(oAttachment.content);
            let sMimeType = oAttachment.fileType || "application/octet-stream";
            if (sBase64.startsWith("iVB")) { sMimeType = "image/png"; }
            else if (sBase64.startsWith("/9j")) { sMimeType = "image/jpeg"; }

            const sFileName = oAttachment.displayName || oAttachment.filename || "Bed Image";

            this._sPreviewFileName = sFileName;
            this._sPreviewMimeType = sMimeType;
            this._sPreviewBase64 = sBase64;

            if (this._oPreviewDialog) {
                this._oPreviewDialog.destroy();
                this._oPreviewDialog = null;
            }

            this._oPreviewDialog = await sap.ui.core.Fragment.load({
                id: this.getView().getId(),
                name: "sap.ui.com.project1.fragment.DocumentPreview",
                controller: this
            });

            this.getView().addDependent(this._oPreviewDialog);

            const oDialog = sap.ui.core.Fragment.byId(this.getView().getId(), "previewDialog");
            const oImage = sap.ui.core.Fragment.byId(this.getView().getId(), "previewImage");
            const oHtml = sap.ui.core.Fragment.byId(this.getView().getId(), "previewHtml");

            oDialog.setTitle(sFileName);
            oImage.setVisible(false);
            oHtml.setVisible(false);
            oHtml.setContent("");

            if (sMimeType.startsWith("image/")) {
                const sImageSrc = "data:" + sMimeType + ";base64," + sBase64;
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
                    oDialog.setContentWidth(finalWidth + "px");
                    oDialog.setContentHeight(finalHeight + "px");
                    oImage.setSrc(sImageSrc);
                    oImage.setVisible(true);
                    oDialog.open();
                }.bind(this);
                oImg.onerror = function() {
                    sap.m.MessageToast.show("Unable to preview image.");
                };
                oImg.src = sImageSrc;
                return;
            }

            this.onDownloadPreview();
            sap.m.MessageToast.show("Preview not supported.");
        },

        onDownloadPreview: function() {
            if (!this._sPreviewBase64) {
                sap.m.MessageToast.show("No file available for download.");
                return;
            }
            let sDownloadUrl = "";
            if (this._sPreviewMimeType.startsWith("image/")) {
                sDownloadUrl = "data:" + this._sPreviewMimeType + ";base64," + this._sPreviewBase64;
            }
            if (!sDownloadUrl) {
                sap.m.MessageToast.show("Download not supported.");
                return;
            }
            const oLink = document.createElement("a");
            oLink.href = sDownloadUrl;
            oLink.download = this._sPreviewFileName || "BedImage";
            document.body.appendChild(oLink);
            oLink.click();
            document.body.removeChild(oLink);
        },

        onClosePreview: function() {
            if (this._pdfBlobUrl) {
                URL.revokeObjectURL(this._pdfBlobUrl);
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

        createTableSheet: function() {
            return [{
                    label: "Hostel Name",
                    property: "BranchName",
                    type: "string"
                },
                {
                    label: "Bed Type",
                    property: "Name",
                    type: "string"
                },
                {
                    label: "Room Type",
                    property: "ACType",
                    type: "string"
                },
                {
                    label: "No of Rooms",
                    property: "MaxBeds",
                    type: "string"
                },
                {
                    label: "No of Persons",
                    property: "NoOfPerson",
                    type: "string"
                },
                {
                    label: "Extra Bed",
                    property: "ExtraBed",
                    type: "string"
                },
                {
                    label: "Deposit Amount",
                    property: "Deposit",
                    type: "string"
                },
                {
                    label: "Description",
                    property: "Description",
                    type: "string"
                }
            ]
        },
    });
});