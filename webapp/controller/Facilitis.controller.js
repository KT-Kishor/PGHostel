sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "../model/formatter",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
], function(BaseController, utils, Formatter, Spreadsheet, MessageToast, JSONModel) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Facilitis", {
        Formatter: Formatter,
        onInit: function() {
            this.getOwnerComponent().getRouter().getRoute("RouteFacilitis").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function(oEvent) {
             this.getBusyDialog();
            var LoginFUnction = await this.commonLoginFunction("ManageFacility");
            if (!LoginFUnction) return;
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle(); // Get i18n model

            var model = new JSONModel({
                BranchCode: "",
                Type: "",
                SelectionMode: "",
                UnitPrice: "",
                PerHourPrice: "",
                PerDayPrice: "",
                PerMonthPrice: "",
                PerYearPrice: "",
                FacilityName: "",
                FacilityChargeType: ""
            });
            this.getView().setModel(model, "FacilitiesModel")

            const oTokenModel = new JSONModel({
                tokens: []
            });
            const oUploaderData = new JSONModel({
                attachments: []
            });

            this.getView().setModel(oTokenModel, "tokenModel");
            this.getView().setModel(oUploaderData, "UploaderData");
            this.sPath = oEvent.getParameter("arguments").sPath
            if (oEvent.getParameter("arguments").sPath === "TilePage") {
                this.onClearAndSearch("FO_id_FilterbarEmployee");
            }
            await this._loadBranchCode()
            this.oValue = oEvent.getParameter("arguments").value;
            try {
                if (this.oValue === "Facilities") {
                    await this.readCallForFacilities("Initial");
                    // this.FC_onPressClear(); // Clear the filter bar
                } else {
                    await this.FC_onSearch(); // Filter function for trainee
                }
            } catch (err) {
                this.closeBusyDialog()
                MessageToast.show(err.message || err.responseText);
            } finally {
                
                this.closeBusyDialog()
            }
        },

        getGroupHeader: function(oGroup) {
            return this.getStyledGroupHeader(oGroup);
        },

        FC_onSearch: async function() {
            var aFilterItems = this.byId("FO_id_FilterbarEmployee").getFilterGroupItems();
            var params = {};
              
            aFilterItems.forEach(function(oItem) {
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
                if (sValue) params[sKey] = sValue;
            });

            params.showBusy = true;
            await this.readCallForFacilities(params).catch((error) => {
                MessageToast.show(error.message || error.responseText);
            })
        },

        readCallForFacilities: async function(filter) {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];

            let aBranchCodes = [];
            if (Array.isArray(omainModel) && omainModel.length) {
                aBranchCodes = omainModel.map(item => item.BranchID).flat().filter(Boolean).join(",");
            } else if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode.split(",").map(code => code.trim());
            }

            // Normalize filter
            filter = (typeof filter === "object" && filter !== null) ?
                filter : {
                    filter: filter
                };

            // IMPORTANT FIX
            // Apply LoginModel BranchCode only if user did not select BranchCode in filter
            if (!filter.BranchCode) {
                if (oExistingModel.Role === "Admin" && aBranchCodes) {
                    filter.BranchCode = aBranchCodes;
                    filter.Role = "Admin";
                } else if (oExistingModel.Role === "SuperAdmin") {
                    filter.BranchCode = ""; // all branches

                } else {
                    filter.BranchCode = oExistingModel.BranchCode;
                }
            }

           var sFacilityName = this.getView().byId("FN_id_FacilityName").getSelectedKey() || this.getView().byId("FN_id_FacilityName").getValue();
           var sBranchCode = this.getView().byId("FN_id_BranchCode").getSelectedKey() || this.getView().byId("FN_id_BranchCode").getValue();

            if(sFacilityName){
                filter.FacilityName = sFacilityName;
            }
            if(sBranchCode){
                filter.BranchCode = sBranchCode;
            }

            if (filter.showBusy) {
                this.getBusyDialog();
            }
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

                const branchData = this.getView().getModel("BranchModel")?.getData() || [];

                // Map BranchCode to BranchName directly in response
                responseData = responseData.map(bed => {
                    const branch = branchData.find(br => br.BranchID === bed.BranchCode);
                    return {
                        ...bed,
                        BranchName: branch ? branch.Name : bed.BranchID
                    };
                });
                this.getOwnerComponent().setModel(new JSONModel(responseData), "Facilities");

                if (sBranchCode==="" && sFacilityName==="" && filter.filter === "Initial" && this.sPath === "TilePage") {
                    const facilitiesData = [
                        ...new Map(
                            responseData
                            .filter(item => item.FacilityName)
                            .map(item => [item.FacilityName.trim(), item])
                        ).values()
                    ];

                    this.getView().setModel(new JSONModel(facilitiesData), "facilitiesDataModelInitial");
                }
            } catch (error) {
                this.closeBusyDialog()
                MessageToast.show(error.message || error.responseText);
            } finally{
                this.closeBusyDialog()
            }
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
                const oResponse = await this.ajaxReadWithJQuery("HM_BranchData", filters);
                const aBranches = Array.isArray(oResponse?.data) ? oResponse.data : (oResponse?.data ? [oResponse.data] : []);
                const oBranchModel = new JSONModel(aBranches);
                this.getView().setModel(oBranchModel, "BranchModel");
            } catch (err) {
                this.closeBusyDialog()
                MessageToast.show(err.message || err.responseText);
            }
        },

        FD_RoomDetails: async function(oEvent) {
            if (this.ARD_Dialog) {
                this.ARD_Dialog.destroy();
                this.ARD_Dialog = null;
            }
            this.byId("id_facilityTable").removeSelections();
            var oView = this.getView();

            if (!oView.getModel("BranchModel") || !(oView.getModel("BranchModel").getData() || []).length) {
                await this._loadBranchCode();
            }

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Facilities", this);
                oView.addDependent(this.ARD_Dialog);
            }

            this.ARD_Dialog.setModel(oView.getModel("FacilitiesModel"), "FacilitiesModel");
            this.ARD_Dialog.setModel(oView.getModel("BranchModel"), "BranchModel");
            this.ARD_Dialog.setModel(oView.getModel("FacilityType"), "FacilityType");
            this.ARD_Dialog.setModel(oView.getModel("CountryModel"), "CountryModel");
            this.ARD_Dialog.setModel(oView.getModel("SelectionModeModel"), "SelectionModeModel");
            this.ARD_Dialog.setModel(oView.getModel("tokenModel"), "tokenModel");
            this.ARD_Dialog.setModel(oView.getModel("UploaderData"), "UploaderData");
            this.ARD_Dialog.setModel(oView.getModel("i18n"), "i18n");

            // Reset model data
            var oFacilitiesModel = oView.getModel("FacilitiesModel");
            if (oFacilitiesModel) {
                oFacilitiesModel.setData({
                    ID: "",
                    BranchCode: "",
                    FacilityName: "",
                    Type: "",
                    SelectionMode: "",
                    UnitPrice: "",
                    PerHourPrice: "",
                    PerDayPrice: "",
                    PerMonthPrice: "",
                    PerYearPrice: "",
                    FacilityChargeType: ""
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

        FD_onCancelButtonPress: function() {
            var oView = this.getView();
            // Clear all data on close
            if (oView.getModel("FacilitiesModel")) {
                oView.getModel("FacilitiesModel").setData({
                    ID: "",
                    BranchCode: "",
                    FacilityName: "",
                    Type: "",
                    SelectionMode: "",
                    UnitPrice: "",
                    PerHourPrice: "",
                    PerDayPrice: "",
                    PerMonthPrice: "",
                    PerYearPrice: "",
                    FacilityChargeType: ""
                });
            }
            // Clear file uploader and reset value states
            this._resetFacilityValueStates();
            var oTable = this.byId("id_facilityTable");
            oTable.removeSelections();
            this.ARD_Dialog.close();
            if (this.ARD_Dialog) {
                this.ARD_Dialog.destroy();
                this.ARD_Dialog = null;
            }
        },

        FD_onsavebuttonpress: async function() {
            const oView = this.getView();
            const oFacilitiesModel = oView.getModel("FacilitiesModel");
            const oUploaderData = oView.getModel("UploaderData");
            const attachments = oUploaderData.getProperty("/attachments") || [];
            const Payload = oFacilitiesModel.getData();
            const aFacilitiesData = oView.getModel("Facilities").getData();

            var bIsUnit = String(Payload.SelectionMode || "").toUpperCase().trim() === "PERSON_QTY";

            var isMandatoryValid = (
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("idRoomType123")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("idFacilityName")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("idFacilityName1")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("idSelectionMode")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("FL_id_Currency")), "ID")
            );

            if (!isMandatoryValid) {
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            const sSelectionMode = String(Payload.SelectionMode || "").toUpperCase().trim();
            const isPersonQty = sSelectionMode === "PERSON_QTY";

            const isLaundryOrIroning =
                Payload.Type === "Laundry Service" ||
                Payload.Type === "Ironing Service";

            // Require UnitPrice only when NOT PERSON_QTY and is Laundry/Ironing
            if (!isPersonQty && isLaundryOrIroning &&
                (!Payload.UnitPrice || Number(Payload.UnitPrice) === 0)) {

                const isValid = utils._LCvalidateMandatoryField(
                    sap.ui.getCore().byId(oView.createId("idUnitPrice")),
                    "ID"
                );

                if (!isValid) {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                }
            }

            if (bIsUnit) {
                if (!utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("idMinimumQuantity")), "ID")) {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                }

                if (!Payload.MinimumQty || Number(Payload.MinimumQty) === 0) {
                    MessageToast.show(this.i18nModel.getText("pleaseFillMinimumQty"));
                    return;
                }

                var oRadioGroup = sap.ui.getCore().byId(oView.createId("id_PeriodSelect"));
                if (!Payload.FacilityChargeType || Payload.FacilityChargeType === "") {
                    if (oRadioGroup) {
                        oRadioGroup.setValueState("Error");
                    }
                    MessageToast.show("Please select Daily or Entire Booking facility Type.");
                    return;
                } else {
                    if (oRadioGroup) {
                        oRadioGroup.setValueState("None");
                    }
                }

                if (!utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("idMinimumPrice")), "ID")) {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                }

                if (!Payload.MinimumPrice) {
                    MessageToast.show(this.i18nModel.getText("pleaseFillMinimumPrice"));
                    return;
                }
            } else {
                const isLaundryOrIroning =
                    Payload.Type === "Laundry Service" ||
                    Payload.Type === "Ironing Service";

                if (
                    !isLaundryOrIroning &&
                    (!Payload.PerHourPrice || Number(Payload.PerHourPrice) === 0) &&
                    (!Payload.PerDayPrice || Number(Payload.PerDayPrice) === 0) &&
                    (!Payload.PerMonthPrice || Number(Payload.PerMonthPrice) === 0) &&
                    (!Payload.PerYearPrice || Number(Payload.PerYearPrice) === 0)
                ) {
                    MessageToast.show(this.i18nModel.getText("pleaseFillatLeastOnePrice"));
                    return;
                }
            }

            const isDuplicate = aFacilitiesData.some(function(facility) {
                if (Payload.ID && facility.ID === Payload.ID) return false;

                return (
                    facility.BranchCode === Payload.BranchCode &&
                    facility.FacilityName.trim().toLowerCase() === Payload.FacilityName.trim().toLowerCase()
                );
            });

            if (isDuplicate) {
                MessageToast.show(this.i18nModel.getText("facilitywiththesameratetypealreadyexistsforthisbranch"));
                return;
            }

            if (Payload.Type === "Others") {
                if (attachments.length === 0) {
                    MessageToast.show(this.i18nModel.getText("youcanuploadamaximumof1imagesonly"));
                    return;
                }
            } else {
                if (attachments.length > 3) {
                    MessageToast.show(this.i18nModel.getText("youcanuploadamaximumof3imagesonly"));
                    return;
                }
            }

            const oData = {
                data: {
                    BranchCode: Payload.BranchCode,
                    FacilityName: Payload.FacilityName,
                    Type: Payload.Type,
                    SelectionMode: Payload.SelectionMode,
                    UnitPrice: (Number(Payload.UnitPrice) || 0),
                    MinimumQty: bIsUnit ? (Number(Payload.MinimumQty) || 0) : 0,
                    MinimumPrice: bIsUnit ? (Number(Payload.MinimumPrice) || 0) : 0,
                    PerHourPrice: bIsUnit ? 0 : (Number(Payload.PerHourPrice) || 0),
                    PerDayPrice: bIsUnit ? 0 : (Number(Payload.PerDayPrice) || 0),
                    PerMonthPrice: bIsUnit ? 0 : (Number(Payload.PerMonthPrice) || 0),
                    PerYearPrice: bIsUnit ? 0 : (Number(Payload.PerYearPrice) || 0),
                    Currency: Payload.Currency,
                    FacilityChargeType: Payload.FacilityChargeType
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

            this.getBusyDialog();

            try {
                await this.ajaxCreateWithJQuery("HM_ExtraFacilities", {
                    data: oData
                });
                oView.getModel("UploaderData").setData({
                    attachments: []
                });
                oView.getModel("tokenModel").setData({
                    tokens: []
                });
                this.ARD_Dialog.close();
                if (this.ARD_Dialog) {
                    this.ARD_Dialog.destroy();
                    this.ARD_Dialog = null;
                }
                return this.readCallForFacilities("Initial");
            } catch (err) {
                MessageToast.show(err.message || err.responseText);
            } finally {
                this.closeBusyDialog();
                MessageToast.show(this.i18nModel.getText("facilityAddedSuccessfully"));
            }
        },

        _resetFacilityValueStates: function() {
            var oView = this.getView();
            var aFields = ["idRoomType123", "idFacilityName", "idFacilityName1", "idSelectionMode", "FL_id_Currency", "idUnitPrice", "idPerHourPrice", "idPerDayPrice", "idPerMonthPrice", "idPerYearPrice"];
            aFields.forEach(function(sId) {
                var oField = sap.ui.getCore().byId(oView.createId(sId));
                if (oField && oField.setValueState) {
                    oField.setValueState("None");
                }
            });
        },

        onFacilitybranchChange: function(oEvent) {
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

        onChangeCurrency: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCstrictValidationComboBox(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onFacilityNameChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onPeriodTypeSelect: function(oEvent) {
            var selectedIndex = oEvent.getParameter("selectedIndex");
            var oFacilityModel = this.getView().getModel("FacilitiesModel");
            var selectedSession = selectedIndex === 0 ? "Daily" : selectedIndex === 1 ? "Entire Booking" : "";
            oFacilityModel.setProperty("/FacilityChargeType", selectedSession); // Set selected session in model
            // Clear value state if a session is selected
            var oRadioGroup = this.getView().byId("id_PeriodSelect");
            if (selectedSession !== "") {
                oRadioGroup.setValueState("None");
            }
        },

        _getFacilitySelectionModeMap: function() {
            return {
                1: ["SINGLE"], // High-Speed Wi-Fi
                2: ["PERSON_QTY"], // Laundry Service
                3: ["PERSON_QTY"], // Ironing Service
                4: ["SINGLE"], // Housekeeping
                5: ["PERSON"], // Meals / Food Subscription
                6: ["PERSON"], // Gym Membership
                7: ["SINGLE"], // Two-Wheeler Parking
                8: ["SINGLE"], // Four-Wheeler Parking
                9: ["SINGLE"], // Locker / Storage
                10: ["SINGLE"], // Power Backup
                11: ["SINGLE"], // AC
                12: ["SINGLE"], // Heater
                13: ["PERSON"], // Study Room
                14: ["QTY"], // Extra Bed
                15: ["QTY"], // Extra Pillow
                16: ["SINGLE", "QTY", "PERSON", "PERSON_QTY"] // Others (all allowed)
            };
        },

        onFacilityTypeChange: function(oEvent) {
            var oComboBox = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);

            if (!oComboBox.getValue()) {
                oComboBox.setValueState("None");
            }

            var oSelectedItem = oComboBox.getSelectedItem();
            if (!oSelectedItem) {
                this.byId("idSelectionMode").unbindItems();
                return;
            }

            // var sFacilityID = oSelectedItem.getKey();
            // sFacilityID = parseInt(sFacilityID, 10);
            // this._filterSelectionModes(sFacilityID);
            this._syncFacilityPricingFields();
        },

        _filterSelectionModes: function(sFacilityID) {
            var oMap = this._getFacilitySelectionModeMap();
            var aAllowedKeys = oMap[sFacilityID] || [];

            var oComboBox = this.byId("idSelectionMode");
            var oModel = this.getView().getModel("SelectionModeModel");

            if (!oComboBox || !oModel) return;

            oComboBox.bindItems({
                path: "SelectionModeModel>/",
                template: new sap.ui.core.Item({
                    key: "{SelectionModeModel>key}",
                    text: "{SelectionModeModel>text}"
                }),
                filters: aAllowedKeys.map(function(sKey) {
                    return new sap.ui.model.Filter(
                        "key",
                        sap.ui.model.FilterOperator.EQ,
                        sKey
                    );
                }),
                templateShareable: false
            });

            var oFacilitiesModel = this.getView().getModel("FacilitiesModel");
            var sCurrentMode = oFacilitiesModel.getProperty("/SelectionMode");

            if (!aAllowedKeys.includes(sCurrentMode)) {
                oFacilitiesModel.setProperty("/SelectionMode", "");
            }
        },

        onSelectionModeChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCstrictValidationComboBox(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
            this._syncFacilityPricingFields();
        },

        onPriceChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateAmount(oEvent.getSource(), "ID");
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        _syncFacilityPricingFields: function() {
            var oModel = this.getView().getModel("FacilitiesModel");
            if (!oModel) return;

            var sSelectionMode = oModel.getProperty("/SelectionMode");
            var bIsUnitPriceMode = sSelectionMode === "PERSON_QTY";

            if (bIsUnitPriceMode) {
                oModel.setProperty("/PerHourPrice", "");
                oModel.setProperty("/PerDayPrice", "");
                oModel.setProperty("/PerMonthPrice", "");
                oModel.setProperty("/PerYearPrice", "");
            } else {
                oModel.setProperty("/UnitPrice", "");
            }
        },

        onTokenDelete: function(oEvent) {
            const oView = this.getView();

            const oTokenModel = oView.getModel("tokenModel");
            const oUploaderData = oView.getModel("UploaderData");

            let aTokens = oTokenModel.getProperty("/tokens") || [];
            let aAttachments = oUploaderData.getProperty("/attachments") || [];

            const oButton = oEvent.getSource();  // Get pressed button
            const oItem = oButton.getParent(); // Get current row
            const oCtx = oItem.getBindingContext("UploaderData");   // Get binding context

            if (oCtx) {
                const iIndex = parseInt(   // Get selected row index
                    oCtx.getPath().split("/").pop(),
                    10
                );

                aAttachments.splice(iIndex, 1);  // Remove only selected attachment
                aTokens.splice(iIndex, 1); // Remove matching token only for selected row
            }

            oTokenModel.setProperty("/tokens", aTokens);
            oUploaderData.setProperty("/attachments", aAttachments);
            this.byId("id_fileUploader").clear();
        },

        _addProcessingRow: function () {
            const oModel = this.getView().getModel("UploaderData");
            const aDocs = oModel.getProperty("/attachments") || [];
            const sTempId = "__processing__" + Date.now();
            const oTempDoc = {
                filename: "Compressing...",
                fileType: "",
                size: "",
                isProcessing: true,
                tempId: sTempId
            };
            aDocs.push(oTempDoc);
            oModel.setProperty("/attachments", aDocs);
            return sTempId;
        },

        _removeProcessingRow: function (sTempId) {
            const oModel = this.getView().getModel("UploaderData");
            let aDocs = oModel.getProperty("/attachments") || [];
            aDocs = aDocs.filter(doc => doc.tempId !== sTempId);
            oModel.setProperty("/attachments", aDocs);
        },

        onFacilityFileChange: async function(oEvent) {
            const oFiles = oEvent.getParameter("files");
            if (!oFiles || oFiles.length === 0) return;

            const oView = this.getView();
            const oUploaderData = oView.getModel("UploaderData");
            const oTokenModel = oView.getModel("tokenModel");

            let aAttachments = oUploaderData.getProperty("/attachments") || [];
            let aTokens = oTokenModel.getProperty("/tokens") || [];

            if (aAttachments.length >= 3) {
                oEvent.getSource().clear();
                return MessageToast.show(this.i18nModel.getText("youcanuploadamaximumof3imagesonly"));
            }

            const iAvailableSlots = 3 - aAttachments.length;
            const aSelectedFiles = Array.from(oFiles).slice(0, iAvailableSlots);

            this.getBusyDialog();

            try {
                for (const oFile of aSelectedFiles) {
                    const bIsDuplicate = aAttachments.some(att => att.filename === oFile.name);
                    if (bIsDuplicate) {
                        MessageToast.show("\"" + oFile.name + "\" is already uploaded.");
                        continue;
                    }

                    if (!oFile.type.match(/^image\/(jpeg|jpg|png)$/)) {
                        MessageToast.show(this.i18nModel.getText("onlyimagefilesareallowed"));
                        continue;
                    }

                    const sTempId = this._addProcessingRow();
                    aAttachments = oUploaderData.getProperty("/attachments") || [];

                    let processedFile = oFile;
                    const MAX_SIZE_MB = 2;
                    const fileSizeMB = oFile.size / (1024 * 1024);

                    if (fileSizeMB > MAX_SIZE_MB) {
                        if (typeof imageCompression === "undefined") {
                            throw new Error("Compression library missing");
                        }
                        const options = {
                            maxSizeMB: 1.9,
                            maxWidthOrHeight: 1920,
                            useWebWorker: true,
                            initialQuality: 0.95
                        };
                        processedFile = await imageCompression(oFile, options);
                    }

                    const sBase64 = await new Promise((resolve, reject) => {
                        const oReader = new FileReader();
                        oReader.onload = (e) => resolve(e.target.result.split(",")[1]);
                        oReader.onerror = reject;
                        oReader.readAsDataURL(processedFile);
                    });

                    const bContentDuplicate = aAttachments.some(att => att.content === sBase64);
                    if (bContentDuplicate) {
                        this._removeProcessingRow(sTempId);
                        MessageToast.show(this.i18nModel.getText("thisimageisalreadyuploaded"));
                        continue;
                    }

                    this._removeProcessingRow(sTempId);

                    aAttachments = oUploaderData.getProperty("/attachments") || [];
                    const sFileName = "FacilityImage " + (aAttachments.length + 1);
                    aTokens = oTokenModel.getProperty("/tokens") || [];

                    aAttachments.push({
                        content: sBase64,
                        fileType: processedFile.type,
                        filename: sFileName,
                        size: this._formatFileSize(processedFile.size),
                        isProcessing: false
                    });

                    aTokens.push({
                        key: sFileName,
                        text: sFileName
                    });

                    oUploaderData.setProperty("/attachments", aAttachments);
                    oTokenModel.setProperty("/tokens", aTokens);
                }
            } catch (err) {
                MessageToast.show(err.message || "Compression failed. Please try a smaller file.");
            } finally {
                this.closeBusyDialog();
                oEvent.getSource().clear();
            }
        },

        _formatFileSize: function(bytes) {
            if (!bytes) return "0 Bytes";
            const sizes = ["Bytes", "KB", "MB", "GB"];
            let i = Math.floor(Math.log(bytes) / Math.log(1024));
            return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
        },

        onPreviewFacilityFile: async function (oEvent) {
            const oData = oEvent.getSource().getBindingContext("UploaderData")?.getObject();
            if (!oData || !oData.content) {
                MessageToast.show("No file available");
                return;
            }
            this._openFilePreview(oData.content, oData.filename, oData.fileType);
        },

        _autoDecodeBase64: function (b64) {
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
        },

        _openFilePreview: async function (sBase64, sFileName, sFileType) {
            const sDecoded = this._autoDecodeBase64(sBase64);

            let sMimeType = "application/octet-stream";
            if (sDecoded.startsWith("iVB")) {
                sMimeType = "image/png";
            } else if (sDecoded.startsWith("/9j")) {
                sMimeType = "image/jpeg";
            } else if (sDecoded.startsWith("JVBER")) {
                sMimeType = "application/pdf";
            }

            this._sPreviewFileName = sFileName;
            this._sPreviewMimeType = sMimeType;
            this._sPreviewBase64 = sDecoded;

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
            oImage.setSrc("");
            oHtml.setVisible(false);
            oHtml.setContent("");

            if (this._pdfBlobUrl) {
                URL.revokeObjectURL(this._pdfBlobUrl);
                this._pdfBlobUrl = null;
            }

            if (sMimeType.startsWith("image/")) {
                const sImageSrc = "data:" + sMimeType + ";base64," + sDecoded;
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

                    oDialog.setContentWidth(finalWidth + "px");
                    oDialog.setContentHeight(finalHeight + "px");
                    oImage.setSrc(sImageSrc);
                    oImage.setVisible(true);
                    oDialog.open();
                }.bind(this);

                oImg.onerror = function () {
                    MessageToast.show("Unable to preview image.");
                };

                oImg.src = sImageSrc;
                return;
            }

            if (sMimeType === "application/pdf") {
                const byteCharacters = atob(sDecoded);
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
                this._pdfBlobUrl = URL.createObjectURL(blob);

                oHtml.setContent(
                    '<iframe src="' + this._pdfBlobUrl +
                    '" width="100%" height="100%" ' +
                    'style="border:none;" ' +
                    'title="PDF Preview"></iframe>'
                );
                oHtml.setVisible(true);

                oDialog.setContentWidth("80%");
                oDialog.setContentHeight("85%");
                oDialog.open();
                return;
            }

            MessageToast.show("Preview not supported.");
        },

        onDownloadPreview: function () {
            if (!this._sPreviewBase64) {
                MessageToast.show("No file available for download.");
                return;
            }

            let sDownloadUrl = "";

            if (this._sPreviewMimeType === "application/pdf") {
                if (!this._pdfBlobUrl) {
                    const byteCharacters = atob(this._sPreviewBase64);
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
                    this._pdfBlobUrl = URL.createObjectURL(blob);
                }
                sDownloadUrl = this._pdfBlobUrl;
            } else if (this._sPreviewMimeType && this._sPreviewMimeType.startsWith("image/")) {
                sDownloadUrl = "data:" + this._sPreviewMimeType + ";base64," + this._sPreviewBase64;
            } else {
                sDownloadUrl = "data:application/octet-stream;base64," + this._sPreviewBase64;
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

        FC_onPressClear: function() {
            this.getView().byId("FN_id_FacilityName").setSelectedKey("")
            this.getView().byId("FN_id_BranchCode").setSelectedKey("")
        },

        onNavBack: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
            this.getView().getModel("Facilities").setData({});
        },

        onHome: function() {
            this.CommonLogoutFunction()
        },

        FD_onFacilityRowPress: function(oEvent) {
            var ofacilityID = oEvent.getSource().getBindingContext("Facilities").getObject().ID;
            var onav = this.getOwnerComponent().getRouter()
            onav.navTo("RouteFacilitiesDetails", {
                sPath: ofacilityID
            });
        },

        HM_DeleteDetails: async function() {
            var oTable = this.byId("id_facilityTable");
            var aSelectedItems = oTable.getSelectedItems();

            if (aSelectedItems.length === 0) return MessageToast.show(this.i18nModel.getText("pleaseSelectatLeastOneRecordtoDelete"));

            var that = this; // Keep the correct reference to the controller
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
                    styleClass: "myUnifiedBtn",
                    onClose: async function(sAction) {
                        if (sAction === sap.m.MessageBox.Action.YES) {
                            try {
                                that.getBusyDialog()
                                const aDeletePromises = aSelectedItems.map(async (item) => {
                                    var oData = item.getBindingContext("Facilities").getObject();
                                    await that.ajaxDeleteWithJQuery("HM_ExtraFacilities", {
                                        filters: {
                                            ID: oData.ID
                                        }
                                    });
                                });

                                await Promise.all(aDeletePromises);
                                return that.readCallForFacilities("Initial");
                            } catch (err) {
                                that.closeBusyDialog()
                                MessageToast.show(err.message || err.responseText);
                            } finally {
                                sap.m.MessageToast.show(that.i18nModel.getText("facilitiesdeletedsuccessfully")); 
                                oTable.removeSelections(true);
                                that.closeBusyDialog()
                            }
                        } else {
                            oTable.removeSelections(true);
                        }
                    }
                });
        },

        createTableSheet: function() {
            return [{
                    label: "Hostel Name",
                    property: "BranchName",
                    type: "string"
                },
                {
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

        MD_onDownload: function() {
            const oTable = this.byId("id_facilityTable");
            const oModel = oTable.getModel("Facilities")?.getData();
            // No data validation
            if (!oModel || oModel.length === 0) return MessageToast.show(this.i18nModel.getText("MSnodata"));
            // Show busy indicator during download
            this.getBusyDialog()
            // Adjust data (price + currency)
            const adjustedData = oModel.map(function(item) {
                return {
                    ...item,
                    PerHourPrice: item.PerHourPrice + " " + item.Currency,
                    PerDayPrice: item.PerDayPrice + " " + item.Currency,
                    PerMonthPrice: item.PerMonthPrice + " " + item.Currency,
                    PerYearPrice: item.PerYearPrice + " " + item.Currency
                };
            });
            // Excel column configuration
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level",
                    context: {
                        sheetName: "Facilities Details"
                    }
                },
                dataSource: adjustedData,
                fileName: "Facilities_Details.xlsx",
                worker: false
            };

            // Create Spreadsheet
            const oSheet = new sap.ui.export.Spreadsheet(oSettings);
            oSheet.build().then(() => {
                MessageToast.show(this.i18nModel.getText("MSdownloadedsuccess"));
            }).catch((oError) => {
                MessageToast.show(this.i18nModel.getText("MSdownloadfailed") || "Download failed");
            }).finally(() => {
                this.closeBusyDialog()
                oSheet.destroy();
            });
        }
    });
});