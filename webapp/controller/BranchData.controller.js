sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast",
    "../utils/validation",
    "../model/formatter"
], function(BaseController, MessageBox, Spreadsheet, MessageToast, utils, Formatter) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Branch", {
        Formatter: Formatter,
        onInit: function() {
            this.getOwnerComponent().getRouter().getRoute("RouteBranchData").attachMatched(this._onRouteMatched, this);
            const oMDmodel = new sap.ui.model.json.JSONModel({
                BranchID: "",
                Name: "",
                Address: "",
                LandMark: "",
                GeoLocation: "",
                PropertyType: "",
                Pincode: "",
                Contact: "",
                stdCode: "",
                country: "",
                state: "",
                City: "",
                GSTIN: "",
                Currency: "",
                Type: "",
                Value: "",
                CheckinTime: "",
                CheckoutTime: "",
                Penalty: "",
                StartingPrice: "",
                EditBefore: "",
            });
            this.getView().setModel(oMDmodel, "MDmodel");
            var oeditable = new sap.ui.model.json.JSONModel({
                isEdit: false
            });
            this.getView().setModel(oeditable, "editableModel");
            this.getView().setModel(new sap.ui.model.json.JSONModel({
                CC_id_CustInput: false,
                selectedIndex: -1,
                isIndia: false
            }), "visiblePlay");
            this.getView().setModel(new sap.ui.model.json.JSONModel({
                Photo1: "",
                Photo1Type: "",
                Photo1Name: ""
            }), "UploadModel");

            this.getView().setModel(new sap.ui.model.json.JSONModel({
                tokens: []
            }), "tokenModel");
            var oPropertyTypeModel = new sap.ui.model.json.JSONModel();
            oPropertyTypeModel.loadData("model/PropertyType.json");
            this.getView().setModel(oPropertyTypeModel, "PropertyType");

            const oUploaderData = new sap.ui.model.json.JSONModel({
                attachmentslogo: [],
                attachmentimage: []

            });

            this.getView().setModel(oUploaderData, "UploaderData");
        },

        _onRouteMatched: async function() {
            try {
                this.getBusyDialog()
                var LoginFUnction = await this.commonLoginFunction("ManageBranch");
                if (!LoginFUnction) return;
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.getView().setModel(new sap.ui.model.json.JSONModel({
                    Attachment: "",
                    AttachmentType: "",
                    AttachmentName: ""
                }), "imageModel");
                this.getView().setModel(new sap.ui.model.json.JSONModel({
                    imageTokens: []
                }), "tokenImageModel");
                this.onClearAndSearch("MD_id_Filterbar");
                await this.Customerdata()
                await this.Onsearch();
            } catch (err) {
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
            } else if (oExistingModel.Role === "SuperAdmin") {
                filters.BranchCode = "";
            } else {
                filters.BranchCode = oExistingModel.BranchCode;
            }
            this.ajaxReadWithJQuery("HM_Customer", filters).then((response) => {
                const oModel = new sap.ui.model.json.JSONModel(response.Customers);
                this.getView().setModel(oModel, "HostelModel");
            }).catch((err) => {
                sap.m.MessageToast.show(err.message || err.responseText);
            });
        },

        Onsearch: async function(flag) {
            try {

                const oLoginmodel = this.getOwnerComponent().getModel("LoginModel").getData();

                var Branch = this.getView().byId("MD_id_BranchCode").getSelectedKey();

                var filter = {
                    UserID: oLoginmodel.EmployeeID
                };

                var LoginData = await this.ajaxReadWithJQuery("HM_CustomerContact", filter);

                var oFCIAerData = Array.isArray(LoginData.data) ?
                    LoginData.data : [LoginData.data];

                const oExistingModel = oFCIAerData[0];

                const oView = this.getView();

                let filters = {};

                if (oLoginmodel.Role === "Admin") {

                    filters.BranchID = Branch ?
                        Branch : oExistingModel.BranchCode;

                    filters.Role = "Admin";

                } else if (oExistingModel.Role === "SuperAdmin") {

                    filters.BranchID = "";

                } else {

                    filters.BranchID = oLoginmodel.BranchCode;
                }

                let sCustomerName = oView.byId("MD_id_BranchCode")
                    .getValue()?.trim();

                let sPincode = oView.byId("MD_id_SearchField")
                    .getValue()?.trim();

                if (sCustomerName) {

                    if (sCustomerName.includes(" - ")) {
                        sCustomerName = sCustomerName.split(" - ")[0];
                    }

                    filters.SearchText = sCustomerName;
                }

                if (sPincode) {
                    filters.Pincode = sPincode;
                }

                var oData = await this.ajaxReadWithJQuery("HM_BranchData", filters);

                var aBranchData = Array.isArray(oData.data) ?
                    oData.data : [oData.data];

                if (!this._originalBranchData || flag===true) {
                    this._originalBranchData = aBranchData;
                }

                this.getOwnerComponent().setModel(new sap.ui.model.json.JSONModel(aBranchData), "mainModel");
                this.getOwnerComponent().setModel(new sap.ui.model.json.JSONModel(aBranchData), "branchModel1");
                this._populateBranchFilterValues(this._originalBranchData);
            } finally {}
        },

        _populateBranchFilterValues: function(data) {

            var oCombo = this.byId("MD_id_BranchCode");

            if (!oCombo) return;

            oCombo.destroyItems();

            let uniqueBranches = {};

            data.forEach(item => {

                if (item.BranchID && !uniqueBranches[item.BranchID]) {
                    uniqueBranches[item.BranchID] = item;
                }

            });

            Object.values(uniqueBranches)
                .sort((a,b)=>a.BranchID.localeCompare(b.BranchID))
                .forEach(item => {

                    oCombo.addItem(
                        new sap.ui.core.ListItem({
                            key: item.BranchID,
                            text: item.BranchID + " - " + item.Name,
                            additionalText: item.City
                        })
                    );

                });

        },

        MD_onPressClear: function() {
            this.getView().byId("MD_id_BranchCode").setSelectedKey("")
            this.getView().byId("MD_id_SearchField").setValue("");
        },

        MD_onSearch: async function() {
            this.getBusyDialog()
            try {
                await this.Onsearch();
                const oView = this.getView();
                const oTable = oView.byId("id_MD_Table");
                const oBinding = oTable.getBinding("items");

                let sCustomerName = oView.byId("MD_id_BranchCode").getValue().trim().toLowerCase();
                let sPincode = oView.byId("MD_id_SearchField").getValue().trim();

                let aFilters = [];
                if (!sCustomerName && !sPincode) {
                    oBinding.filter([]);
                    this._updateRowCount();
                    return;
                }
                if (sCustomerName) {
                    if (sCustomerName.includes(" - ")) {
                        sCustomerName = sCustomerName.split(" - ")[0];
                    }
                    aFilters.push(
                        new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter("BranchID", sap.ui.model.FilterOperator.Contains, sCustomerName),
                                new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sCustomerName),
                                new sap.ui.model.Filter("City", sap.ui.model.FilterOperator.Contains, sCustomerName)
                            ],
                            and: false
                        })
                    );
                }
                if (sPincode) {
                    aFilters.push(
                        new sap.ui.model.Filter("Pincode", sap.ui.model.FilterOperator.Contains, sPincode)
                    );
                }
                oBinding.filter(aFilters);
                this._updateRowCount();
            } finally {
                this.closeBusyDialog()
            }
        },

        onGlobalSearch: function(oEvent) {
            const sQuery = oEvent.getParameter("newValue");
            const oTable = this.byId("id_MD_Table");
            const oBinding = oTable.getBinding("items");

            let aFilters = [];
            if (sQuery) {
                aFilters.push(new sap.ui.model.Filter("Pincode", sap.ui.model.FilterOperator.Contains, sQuery));
            }

            oBinding.filter(aFilters);
            this._updateRowCount();
        },

        _updateRowCount: function() {
            const oTable = this.byId("id_MD_Table");
            const oBinding = oTable.getBinding("items");
            const iLength = oBinding.getLength();
            this.getView().getModel("mainModel").setProperty("/count", iLength);
        },

        onTableUpdateFinished: function() {
            this._updateRowCount();
        },

        createTableSheet: function() {
            return [{
                    label: "Branch Code",
                    property: "BranchID",
                    type: "string"
                },
                {
                    label: "Hostel Name",
                    property: "Name",
                    type: "string"
                },
                {
                    label: "Property Type",
                    property: "PropertyType",
                    type: "string"
                },
                {
                    label: "GSTIN",
                    property: "GSTIN",
                    type: "string"
                },
                {
                    label: "Type",
                    property: "Type",
                    type: "string"
                },
                {
                    label: "Tax Percentage",
                    property: "Value",
                    type: "string"
                },

                {
                    label: "Late Penalty Amount",
                    property: "Penalty",
                    type: "string"
                },
                {
                    label: "Address",
                    property: "Address",
                    type: "string"
                },
                {
                    label: "Pincode",
                    property: "Pincode",
                    type: "string"
                },
                {
                    label: "Contact Number",
                    property: "Contact",
                    type: "string"
                },
                {
                    label: "Starting Price",
                    property: "StartingPrice",
                    type: "string"
                }
            ]
        },

        MD_onDownload: function() {
            const oModel = this.byId("id_MD_Table").getModel("mainModel").getData();
            if (!oModel || oModel.length === 0) {
                MessageToast.show(this.i18nModel.getText("MSnodata"));
                return;
            }
            const adjustedData = oModel.map(item => ({
                ...item,
                Pincode: item.Pincode ? String(item.Pincode) : "",
                Contact: item.Contact ? String(item.Contact) : "",
                Penalty: item.Penalty + " " + item.Currency,
                Contact: item.STD + " " + item.Contact
            }));
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level",
                    context: {
                        sheetName: "Branch Details"
                    }
                },
                dataSource: adjustedData,
                fileName: "Branch_Details.xlsx",
                worker: false
            };
            MessageToast.show(this.i18nModel.getText("downloadingBranchDetails"));
            const oSheet = new sap.ui.export.Spreadsheet(oSettings);

            oSheet.build().then(() => {
                MessageToast.show(this.i18nModel.getText("MSdownloadedsuccess"));
            }).finally(() => {
                oSheet.destroy();
            });
        },

        setDefaultTimesOnCreate: function() {
            var oEditModel = this.getView().getModel("editableModel");
            var oMDModel = this.getView().getModel("MDmodel");
            if (!oEditModel.getProperty("/isEdit")) {

                if (!oMDModel.getProperty("/CheckinTime")) {
                    oMDModel.setProperty("/CheckinTime", "11:00");
                }

                if (!oMDModel.getProperty("/CheckoutTime")) {
                    oMDModel.setProperty("/CheckoutTime", "11:00");
                }
            }
        },

        convert24ToAmPm: function(sTime) {
            if (!sTime) return "";

            const hour24 = parseInt(sTime.split(":")[0], 10);
            const ampm = hour24 >= 12 ? "PM" : "AM";
            const hour12 = hour24 % 12 || 12;

            return hour12 + ampm;
        },

        MD_AddButtonPress: function() {
            this.byId("id_MD_Table").removeSelections();
            var oView = this.getView();
            oView.getModel("editableModel").setProperty("/isEdit", false);
            if (!this.oDialog) {
                this.oDialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.BranchData", this);
                oView.addDependent(this.oDialog);
            }
            oView.getModel("UploadModel").setData({
                Photo1: "",
                Photo1Type: "",
                Photo1Name: ""
            });

            oView.getModel("tokenModel").setData({
                tokens: []
            });
            oView.getModel("tokenImageModel").setData({
                imageTokens: []
            });
            const oCountry = sap.ui.getCore().byId(oView.createId("MC_id_Country"));
            const oState = sap.ui.getCore().byId(oView.createId("MC_id_State"));
            const oCity = sap.ui.getCore().byId(oView.createId("MC_id_City"));
            const oCityCB = sap.ui.getCore().byId(oView.createId("MC_id_City"));

            if (oCityCB) {
                oCityCB.setSelectedKey(null);
                oCityCB.setValue("");
                oCityCB.setValueState("None");
                oCityCB.setValueStateText("");
            }
            const stateBinding = oState.getBinding("items");
            if (stateBinding) stateBinding.filter([]);

            const cityBinding = oCity.getBinding("items");
            if (cityBinding) cityBinding.filter([]);
            this._resetBranchValueStates();
            this._resetFacilityValueStates();
            oView.getModel("MDmodel").setData({
                Name: "",
                Address: "",
                LandMark: "",
                GeoLocation: "",
                PropertyType: "",
                Pincode: "",
                Contact: "",
                stdCode: "+91",
                country: "",
                state: "",
                baseLocation: "",
                GSTIN: "",
                Type: "",
                Value: "",
                Penalty: "",
                StartingPrice: "",
                CheckinTime: "",
                CheckoutTime: "",
                EditBefore: ""
            });
            this.getView().getModel("visiblePlay").setProperty("/CC_id_CustInput", false);
            this.getView().getModel("visiblePlay").setProperty("/CC_id_CustInput", false);
            if (this.getView().getModel("LoginModel").getProperty("/Role") === "SuperAdmin") {
                this.getView().byId("Bd_id_Active").setVisible(true)
                this.getView().byId("Bd_id_Mode_Label").setVisible(true)
            }

            this.setDefaultTimesOnCreate();
            this.isEdit = false;
            this.oDialog.open();
        },

        onDepositCurrency: function(oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        },

        onPropertyTypeChange: function(oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        },

        MD_onSaveButtonPress: async function() {
            var oView = this.getView();
            const oUpload = oView.getModel("UploadModel").getData();
            const oImage = oView.getModel("imageModel").getData();
            var oFacilitiesModel = oView.getModel("MDmodel");
            var Payload = oFacilitiesModel.getData();

            var isMandatoryValid = (
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_idBName")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("BD_id_Type")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_idAddress")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_idLandmark")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_idGeoLocation")), "ID") &&
                utils._LCvalidatePinCode(sap.ui.getCore().byId(oView.createId("BD_idPin")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("MC_id_Country")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("MC_id_State")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("MC_id_City")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("MC_id_codeModel")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_id_CheckInTime")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_id_CheckOutTime")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("Bd_id_DepositCurrency")), "ID")
            );

            if (!isMandatoryValid) {
                sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }
            const oMobile = sap.ui.getCore().byId(oView.createId("BD_idPhone"));
            if (!oMobile.getValue()) {
                oMobile.setValueState("Error");
                oMobile.setValueStateText(this.i18nModel.getText("enterContactNumber"));
                sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }
            if (oMobile.getValueState() === "Error") {
                sap.m.MessageToast.show("Please enter a valid mobile number");
                return;
            }

            const oCurrency = sap.ui.getCore().byId(oView.createId("Bd_id_DepositCurrency"));
            if (!oCurrency.getSelectedKey()) {
                oCurrency.setValueState("Error");
                oCurrency.setValueStateText(this.i18nModel.getText("selectCurrency"));
                oCurrency.focus();
                sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }
            if (oCurrency.getValueState() === "Error") {
                oCurrency.focus();
                sap.m.MessageToast.show("Please select a valid currency");
                return;
            }

            // const oPenalty = sap.ui.getCore().byId(oView.createId("BD_idPenalty"));
            // if (!oPenalty.getValue() && oPenalty.getValue() !== "0") {
            //     oPenalty.setValueState("Error");
            //     oPenalty.setValueStateText(this.i18nModel.getText("enterPenalty"));
            //     sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            //     return;
            // }
            // if (oPenalty.getValueState() === "Error") {
            //     oPenalty.focus();
            //     sap.m.MessageToast.show("Please correct the Penalty amount");
            //     return;
            // }

            const aCountries = this.getOwnerComponent().getModel("CountryModel").getData();
            const aStates = this.getOwnerComponent().getModel("StateModel").getData();
            const aCities = this.getOwnerComponent().getModel("CityModel").getData();

            let validState = aStates.some(s =>
                s.stateName === Payload.state &&
                s.countryCode === aCountries.find(c => c.countryName === Payload.country)?.code
            );

            if (!validState) {
                MessageToast.show(this.i18nModel.getText("Irrstate"));
                sap.ui.getCore().byId(oView.createId("MC_id_State")).setValueState("Error");
                return;
            }

            let validCity = aCities.some(c =>
                c.cityName === Payload.baseLocation &&
                c.stateName === Payload.state &&
                c.countryCode === aCountries.find(c => c.countryName === Payload.country)?.code
            );

            if (!validCity) {
                const oCityCombo = sap.ui.getCore().byId(oView.createId("MC_id_City"));
                oCityCombo.setValueState("Error");
                oCityCombo.setValueStateText("Please select a valid city from dropdown");
                oCityCombo.focus();
                sap.m.MessageToast.show("Please select a valid city from dropdown");
                return;
            }

            if (!this.MC_ValidateGstNumber()) {
                sap.ui.getCore().byId(oView.createId("MC_id_CustomGst")).focus();
                return;
            }

            const oStartingPrice = sap.ui.getCore().byId(oView.createId("BD_id_StartingPrice"));
            const sValue = oStartingPrice.getValue();
            const fValue = parseFloat(sValue);

            // Empty validation
            if (sValue === "" || sValue === null || sValue === undefined) {
                oStartingPrice.setValueState("Error");
                oStartingPrice.setValueStateText(this.i18nModel.getText("enterStartingPrice"));
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            // Zero or negative validation
            if (isNaN(fValue) || fValue <= 0) {
                oStartingPrice.setValueState("Error");
                oStartingPrice.setValueStateText("Starting price must be greater than 0");
                oStartingPrice.focus();
                MessageToast.show("Starting price must be greater than 0");
                return;
            }

            // Clear error if valid
            oStartingPrice.setValueState("None");

            const oEditBefore = sap.ui.getCore().byId(oView.createId("BD_id_EditBefore"));
            if (!utils._LCvalidateEditBeforeHours(oEditBefore, "ID")) {
                sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            if (!this._hasHomeImageForSave()) {
                sap.m.MessageToast.show("Please upload Home image");
                return;
            }
            var oData = {
                Name: Payload.Name,
                UserID: this.getOwnerComponent().getModel("LoginModel").getData().EmployeeID,
                EmailID: this.getOwnerComponent().getModel("LoginModel").getData().EmailID,
                LandMark: Payload.LandMark,
                PropertyType: Payload.PropertyType,
                Address: Payload.Address,
                GeoLocation: Payload.GeoLocation,
                Status: Payload.Mode || "Active",
                Pincode: Payload.Pincode,
                Contact: Payload.Contact,
                STD: Payload.stdCode,
                Country: Payload.country,
                State: Payload.state,
                City: Payload.baseLocation,
                Penalty: Payload.Penalty,
                StartingPrice: Payload.StartingPrice,
                EditBefore: String(Payload.EditBefore ?? ""),
                Currency: Payload.Currency,
                Photo1: oUpload.Photo1,
                Attachment: oImage.Attachment,
                GSTIN: Payload.GSTIN,
                Type: Payload.Type,
                Value: Payload.Value,
                Photo1Type: oUpload.Photo1Type,
                Photo1Name: oUpload.Photo1Name,
                AttachmentType: oImage.AttachmentType,
                AttachmentName: oImage.AttachmentName,
                CheckinTime: this.convert24ToAmPm(Payload.CheckinTime),
                CheckoutTime: this.convert24ToAmPm(Payload.CheckoutTime)
            };

            this.getBusyDialog()
            try {
                const aMainData = oView.getModel("mainModel").getData() || [];
                if (this.isEdit && Payload.BranchID) {
                    delete oData.UserID;
                    await this.ajaxUpdateWithJQuery("HM_Branch", {
                        data: oData,
                        filters: {
                            BranchID: Payload.BranchID
                        }
                    });
                } else {
                    await this.ajaxCreateWithJQuery("HM_Branch", {
                        data: oData,
                        filters: {
                            UserID: oData.UserID
                        }
                    });
                }
                await this.Onsearch(true);

                const oUploaderModel = this.getView().getModel("UploaderData");
                oUploaderModel.setProperty("/attachmentimage", []);
                oUploaderModel.setProperty("/attachmentslogo", []);
                oUploaderModel.refresh(true);

                oView.getModel("UploadModel").setData({
                    Photo1: "",
                    Photo1Type: "",
                    Photo1Name: ""
                });

                oView.getModel("imageModel").setData({
                    Attachment: "",
                    AttachmentType: "",
                    AttachmentName: ""
                });
                this.oDialog.close();
                sap.m.MessageToast.show(
                    this.isEdit ? this.i18nModel.getText("branchUpdatedSuccessfully") : this.i18nModel.getText("branchaddedSuccessfully"));
            } catch (err) {
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                this.closeBusyDialog()
            }
        },

        onNavBack: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },

        onHome: function() {
            this.CommonLogoutFunction();
        },

        MD_onCancelButtonPress: function() {
            var oView = this.getView();

            //  1. Reset Form Data
            if (oView.getModel("MDmodel")) {
                oView.getModel("MDmodel").setData({
                    BranchID: "",
                    Name: "",
                    Address: "",
                    LandMark: "",
                    PropertyType: "",
                    Pincode: "",
                    Contact: "",
                    Penalty: "",
                    StartingPrice: ""
                });
            }

            //  2. Clear Uploaded Table Data (IMPORTANT FIX)
            var oUploaderModel = oView.getModel("UploaderData");
            if (oUploaderModel) {
                oUploaderModel.setProperty("/attachmentimage", []);
            }
            if (oUploaderModel) {
                oUploaderModel.setProperty("/attachmentslogo", []);
            }

            //  3. Clear Image Model (optional but recommended)
            if (oView.getModel("imageModel")) {
                oView.getModel("imageModel").setData({});
            }

            //  4. Clear Token Model (if used)
            if (oView.getModel("tokenImageModel")) {
                oView.getModel("tokenImageModel").setData({
                    imageTokens: []
                });
            }

            //  5. Reset Value States
            this._resetFacilityValueStates();

            //  6. Clear Table Selection
            var oTable = this.byId("id_MD_Table");
            if (oTable) {
                oTable.removeSelections();
            }

            //  7. Close Dialog
            this.oDialog.close();
        },

        onGeoLocationLiveChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        _resetFacilityValueStates: function() {
            var oView = this.getView();
            var aFields = ["idBranch", "idBName", "idAddress", "BD_idGeoLocation", "idPin", "idPhone", "idPenalty", "BD_id_StartingPrice"];

            aFields.forEach(function(sId) {
                var oField = sap.ui.getCore().byId(oView.createId(sId));
                if (oField && oField.setValueState) {
                    oField.setValueState("None");
                }
            });
        },

        onPinInputLiveChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidatePinCode(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onEditBeforeLiveChange: function(oEvent) {
            utils._LCvalidateEditBeforeHours(oEvent);
        },

        onPenaltyInputLiveChange: function(oEvent) {
            const oInput = oEvent.getSource();
            let sValue = oInput.getValue();
            sValue = sValue.replace(/[^0-9.]/g, "");
            if (sValue.startsWith(".")) {
                oInput.setValue("");
                oInput.setValueState("Error");
                oInput.setValueStateText("Penalty cannot start with dot");
                return;
            }

            const aParts = sValue.split(".");
            if (aParts.length > 2) {
                sValue = aParts[0] + "." + aParts[1];
            }
            if (aParts[1] && aParts[1].length > 2) {
                sValue = aParts[0] + "." + aParts[1].substring(0, 2);
            }

            oInput.setValue(sValue);
            if (!sValue) {
                oInput.setValueState("None");
                oInput.setValueStateText("");
                return;
            }
            if (parseFloat(sValue) < 0) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Penalty cannot be negative");
                return;
            }

            oInput.setValueState("None");
            oInput.setValueStateText("");
        },

        onPriceInputLiveChange: function(oEvent) {
            const oInput = oEvent.getSource();
            let sValue = oInput.getValue();
            sValue = sValue.replace(/[^0-9.]/g, "");
            if (sValue.startsWith(".")) {
                oInput.setValue("");
                oInput.setValueState("Error");
                oInput.setValueStateText("Starting price cannot start with dot");
                return;
            }

            const aParts = sValue.split(".");
            if (aParts.length > 2) {
                sValue = aParts[0] + "." + aParts[1];
            }
            if (aParts[1] && aParts[1].length > 2) {
                sValue = aParts[0] + "." + aParts[1].substring(0, 2);
            }

            oInput.setValue(sValue);
            if (!sValue) {
                oInput.setValueState("None");
                oInput.setValueStateText("");
                return;
            }
            if (parseFloat(sValue) < 0) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Price cannot be negative");
                return;
            }

            oInput.setValueState("None");
            oInput.setValueStateText("");
        },

        onAddressInputLiveChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onNameInputLiveChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onLandmarkInputLiveChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onBNameInputLiveChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onCheckOutTimeChange: function(oEvent) {
            const oTP = oEvent.getSource();
            if (oTP.getDateValue()) {
                oTP.setValueState("None");
                oTP.setValueStateText("");
            }
        },

        onCheckInTimeChange: function(oEvent) {
            const oTP = oEvent.getSource();
            if (oTP.getDateValue()) {
                oTP.setValueState("None");
                oTP.setValueStateText("");
            }
        },

        _validateCheckInOut: function() {
            const oView = this.getView();
            const oCheckIn = sap.ui.getCore().byId(oView.createId("BD_id_CheckInTime"));
            const oCheckOut = sap.ui.getCore().byId(oView.createId("BD_id_CheckOutTime"));
            const dCheckIn = oCheckIn.getDateValue();
            const dCheckOut = oCheckOut.getDateValue();
            if (!dCheckIn) {
                oCheckIn.setValueState("Error");
                oCheckIn.setValueStateText(this.i18nModel.getText("enterCheckInTime"));
                return false;
            }
            if (!dCheckOut) {
                oCheckOut.setValueState("Error");
                oCheckOut.setValueStateText(this.i18nModel.getText("enterCheckOutTime"));
                return false;
            }
            if (dCheckOut.getTime() <= dCheckIn.getTime()) {
                oCheckOut.setValueState("Error");
                oCheckOut.setValueStateText(this.i18nModel.getText("checkoutAfterCheckin"));
                return false;
            }
            oCheckIn.setValueState("None");
            oCheckOut.setValueState("None");
            return true;
        },

        MD_DeleteRow: function() {
            var oTable = this.byId("id_MD_Table");
            var aSelectedItems = oTable.getSelectedItems();
            var CustData = this.getView().getModel("HostelModel").getData();
            if (aSelectedItems.length === 0) {
                sap.m.MessageToast.show(
                    this.i18nModel.getText("pleaseSelectatLeastOneRecordtoDelete")
                );
                return;
            }
            var aAssignedBranches = [];
            var aDeletableBranches = [];
            aSelectedItems.forEach(oItem => {
                var oData = oItem.getBindingContext("mainModel").getObject();

                var bAssigned = CustData.some(cust =>
                    cust.BranchCode === oData.BranchID &&
                    cust.Status === "Assigned"
                );
                if (bAssigned) {
                    aAssignedBranches.push(oData.BranchID);
                } else {
                    aDeletableBranches.push({
                        branchId: oData.BranchID,
                        item: oItem
                    });
                }
            });
            if (aSelectedItems.length === 1 && aAssignedBranches.length === 1) {
                sap.m.MessageBox.warning(
                    "Cannot delete! Selected branch is already assigned."
                );
                return;
            }
            if (aDeletableBranches.length === 0) {
                sap.m.MessageBox.warning(
                    "All selected branches are already assigned and cannot be deleted."
                );
                return;
            }
            var sBranchIds = aDeletableBranches.map(b => b.branchId).join(", ");
            sap.m.MessageBox.confirm(
                `Are you sure you want to delete the following branches: ${sBranchIds}?`, {
                    icon: sap.m.MessageBox.Icon.WARNING,
                    title: "Confirm Deletion",
                    actions: [
                        sap.m.MessageBox.Action.YES,
                        sap.m.MessageBox.Action.NO
                    ],
                    emphasizedAction: sap.m.MessageBox.Action.NO,
                    styleClass: "myUnifiedBtn",

                    onClose: async (sAction) => {
                         if (sAction === sap.m.MessageBox.Action.NO) {
                            oTable.removeSelections(true);
                            return;
                        }
                        if (sAction === sap.m.MessageBox.Action.YES) {
                            this.getBusyDialog()

                            try {
                                var sUserID = this.getOwnerComponent().getModel("LoginModel").getData().EmployeeID;
                                for (let oBranch of aDeletableBranches) {
                                    await this.ajaxDeleteWithJQuery("HM_Branch", {
                                        filters: {
                                            UserID: sUserID,
                                            BranchID: oBranch.branchId
                                        }
                                    });
                                }
                                await this.Onsearch(true);
                                sap.m.MessageToast.show(this.i18nModel.getText("selectedRecordsDeletedSuccessfully"));
                            } catch (err) {
                                console.error("Delete failed:", err);
                                sap.m.MessageBox.error(this.i18nModel.getText("errorwhileDeletingRecordsPleasetryagain"));
                            } finally {
                                this.closeBusyDialog()
                                oTable.removeSelections(true);
                            }
                        }
                    }
                }
            );
        },

        MD_UpdateTableRow: async function() {
            var oView = this.getView();
            var oTable = this.byId("id_MD_Table");
            var oSelected = oTable.getSelectedItems();

            oView.getModel("editableModel").setProperty("/isEdit", true);

            if (oSelected.length === 0) {
                sap.m.MessageToast.show(this.i18nModel.getText("MSediterr"));
                return;
            }

            if (oSelected.length > 1) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseselectonlyonerowtoedit"));
                return;
            }

            const oSelectedItem = oSelected[0];
            var oContext = oSelectedItem.getBindingContext("mainModel");
            var oData = oContext.getObject();
            var oBranchImages = {};

            this.getBusyDialog();
            try {
                oBranchImages = await this._readBranchImages(oData.BranchID);
            } finally {
                this.closeBusyDialog();
            }

            // ------------------ STATE FILTER ------------------
            const aAllStates = this.getOwnerComponent().getModel("StateModel").getData();
            const aFilteredStates = aAllStates.filter(s => s.countryCode === oData.countryCode);
            this.getView().setModel(new sap.ui.model.json.JSONModel(aFilteredStates), "FilteredStateModel");

            // ------------------ CITY FILTER ------------------
            const aAllCities = this.getOwnerComponent().getModel("CityModel").getData();
            const aFilteredCities = aAllCities.filter(c =>
                c.stateName === oData.state && c.countryCode === oData.countryCode
            );
            this.getView().setModel(new sap.ui.model.json.JSONModel(aFilteredCities), "FilteredCityModel");

            // ------------------ FILE MODELS ------------------
            this.getView().getModel("UploadModel").setData({
                Photo1: oBranchImages.logoBase64 || "",
                Photo1Type: oBranchImages.logoType || "",
                Photo1Name: oBranchImages.logoName || ""
            });

            this.getView().getModel("imageModel").setData({
                Attachment: oBranchImages.homeBase64 || "",
                AttachmentType: oBranchImages.homeType || "",
                AttachmentName: oBranchImages.homeName || ""
            });

            // ------------------ TOKEN MODELS ------------------
            const aTokens = oBranchImages.logoName ? [{
                key: oBranchImages.logoName,
                text: oBranchImages.logoName
            }] : [];

            const aTokenImages = oBranchImages.homeName ? [{
                key: oBranchImages.homeName,
                text: oBranchImages.homeName
            }] : [];

            this.getView().getModel("tokenModel").setData({
                tokens: aTokens
            });

            this.getView().getModel("tokenImageModel").setData({
                imageTokens: aTokenImages
            });

            // ------------------ UploaderData MODEL ------------------
            const aLogoData = oBranchImages.logoName ? [{
                filename: oBranchImages.logoName,
                fileType: oBranchImages.logoType || "",
                size: oBranchImages.logoBase64 ? atob(oBranchImages.logoBase64).length : 0,
                base64: oBranchImages.logoBase64 || ""
            }] : [];

            const aImageData = oBranchImages.homeName ? [{
                filename: oBranchImages.homeName,
                fileType: oBranchImages.homeType || "",
                size: oBranchImages.homeBase64 ? atob(oBranchImages.homeBase64).length : 0,
                base64: oBranchImages.homeBase64 || ""
            }] : [];

            this.getView().setModel(new sap.ui.model.json.JSONModel({
                attachmentslogo: aLogoData,
                attachmentimage: aImageData
            }), "UploaderData");

            // ------------------ DIALOG ------------------
            if (!this.oDialog) {
                this.oDialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.BranchData", this);
                oView.addDependent(this.oDialog);
            }

            // ------------------ ROLE VISIBILITY ------------------
            if (this.getView().getModel("LoginModel").getProperty("/Role") === "SuperAdmin") {
                this.getView().byId("Bd_id_Active").setVisible(true);
                this.getView().byId("Bd_id_Mode_Label").setVisible(true);
            }

            // ------------------ MAIN MODEL ------------------
            var oMDmodel = oView.getModel("MDmodel");

            oMDmodel.setData({
                BranchID: oData.BranchID,
                Name: oData.Name,
                Address: oData.Address,
                LandMark: oData.LandMark,
                PropertyType: oData.PropertyType,
                GeoLocation: oData.GeoLocation,
                Pincode: oData.Pincode,
                Contact: oData.Contact,
                stdCode: oData.STD,
                country: oData.Country,
                state: oData.State,
                baseLocation: oData.City,
                GSTIN: oData.GSTIN,
                Type: oData.Type,
                Value: oData.Value,
                Mode: oData.Status,
                Currency: oData.Currency,
                CheckinTime: this.convert24ToAmPm(oData.CheckinTime),
                CheckoutTime: this.convert24ToAmPm(oData.CheckoutTime),
                Penalty: oData.Penalty,
                StartingPrice: oData.StartingPrice,
                EditBefore: oData.EditBefore
            });

            this.isEdit = true;

            const oVisible = this.getView().getModel("visiblePlay");

            setTimeout(() => {
                this.MC_ValidateGstNumber();

                const taxInput = this.byId("CC_id_custValue");
                if (taxInput && oData.Value) {
                    taxInput.setValue(oData.Value.toString());
                }
            }, 0);

            const bIsIndia = oData.Country === "India";
            oVisible.setProperty("/isIndia", bIsIndia);

            const bHasGST = !!oData.GSTIN;
            oVisible.setProperty("/CC_id_CustInput", bHasGST);

            if (oData.Type === "CGST") {
                oVisible.setProperty("/selectedIndex", 0);
            } else if (oData.Type === "IGST") {
                oVisible.setProperty("/selectedIndex", 1);
            } else {
                oVisible.setProperty("/selectedIndex", -1);
            }
            this._resetFacilityValueStates();
            this._resetBranchValueStates();
            this._applyCountryStateCityFilters();
            this.oDialog.open();
        },

        _readBranchImages: async function(sBranchID) {
            var oResponse = await this.ajaxReadWithJQuery("HM_BranchImage", {
                BranchID: sBranchID,
                Image: "BothImage"
            });
            var aImages = Array.isArray(oResponse.data) ? oResponse.data : (Array.isArray(oResponse) ? oResponse : [oResponse.data || oResponse]);
            var oImages = {
                logoBase64: "",
                logoType: "",
                logoName: "",
                homeBase64: "",
                homeType: "",
                homeName: ""
            };

            aImages.forEach(function(oImage) {
                if (!oImage) return;

                var sImageType = oImage.ImageType || oImage.Image || oImage.Type || "";
                var sImageBase64 = oImage.ImageData || oImage.Base64 || "";
                var sImageFileType = oImage.FileType || "image/jpeg";
                var sImageFileName = oImage.FileName || "";

                if (sImageType === "Logo") {
                    oImages.logoBase64 = sImageBase64;
                    oImages.logoType = sImageFileType;
                    oImages.logoName = sImageFileName || "Logo";
                }

                if (sImageType === "Home") {
                    oImages.homeBase64 = sImageBase64;
                    oImages.homeType = sImageFileType;
                    oImages.homeName = sImageFileName || "Home Image";
                }

                if (oImage.Photo1) {
                    oImages.logoBase64 = oImage.Photo1;
                    oImages.logoType = oImage.Photo1Type || "image/jpeg";
                    oImages.logoName = oImage.Photo1Name || "Logo";
                }

                if (oImage.Attachment) {
                    oImages.homeBase64 = oImage.Attachment;
                    oImages.homeType = oImage.AttachmentType || "image/jpeg";
                    oImages.homeName = oImage.AttachmentName || "Home Image";
                }

                if (!sImageType && oImage.Logo) {
                    oImages.logoBase64 = oImage.Logo;
                    oImages.logoType = oImage.LogoType || "image/jpeg";
                    oImages.logoName = oImage.LogoName || "Logo";
                }

                if (!sImageType && oImage.Home) {
                    oImages.homeBase64 = oImage.Home;
                    oImages.homeType = oImage.HomeType || "image/jpeg";
                    oImages.homeName = oImage.HomeName || "Home Image";
                }
            });

            return oImages;
        },

        _resetBranchValueStates: function() {
            const oView = this.getView();
            const get = (id) => sap.ui.getCore().byId(oView.createId(id));

            const mControls = {
                BD_idBName: "enterBranchName",
                BD_idAddress: "enterAddress",
                BD_idLandmark: "Enter Landmark",
                BD_id_Type: "Enter property type",
                BD_idGeoLocation: "enterLocation",
                BD_idPin: "enterPincode",
                MC_id_Country: "selectCountry",
                MC_id_State: "selectState",
                MC_id_City: "cityValueText",
                MC_id_CustomGst: "gstError",
                MC_id_codeModel: "",
                BD_idPhone: "enterContactNumber",
                BD_id_CheckInTime: "enterCheckInTime",
                BD_id_CheckOutTime: "enterCheckOutTime",
                BD_idPenalty: "enterPenalty",
                BD_id_StartingPrice: "enterStartingPrice",
                BD_id_EditBefore: "enterEditBefore"

            };

            Object.keys(mControls).forEach((sId) => {
                const oControl = get(sId);
                if (oControl) {
                    oControl.setValueState("None");
                    oControl.setValueStateText("");
                    if (mControls[sId]) {
                        oControl.setValueStateText(
                            this.i18nModel.getText(mControls[sId])
                        );
                    }
                }
            });
        },

        _onBranchDialogAfterClose: function() {
            this._resetBranchValueStates();
            this._resetFacilityValueStates();
        },

        _applyCountryStateCityFilters: function() {
            const oModel = this.getView().getModel("MDmodel");
            const oCountryCB = this.byId("MC_id_Country");
            const oStateCB = this.byId("MC_id_State");
            const oSourceCB = this.byId("MC_id_City");;

            const sCountry = oModel.getProperty("/country"); // e.g. "Australia"
            const sState = oModel.getProperty("/state"); // e.g. "Queensland"
            const sSource = oModel.getProperty("/baseLocation"); // e.g. "Bongaree"

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

        MC_onChangeCountry: function(oEvent) {
            const oCountry = oEvent.getSource();
            const oView = this.getView();
            const oModel = oView.getModel("MDmodel");
            const oVisible = oView.getModel("visiblePlay");

            // sanitize free typing
            oCountry.setValue(oCountry.getValue().replace(/[^a-zA-Z\s]/g, ""));
            utils._LCvalidateMandatoryField(oEvent);

            const oState = this.byId("MC_id_State");
            const oCity = this.byId("MC_id_City");
            const oSTD = this.byId("MC_id_codeModel");
            const oCurrency = this.byId("Bd_id_DepositCurrency");

            // Model reset
            ["state", "baseLocation", "stdCode", "Currency"].forEach(p =>
                oModel.setProperty("/" + p, "")
            );
            oModel.setProperty("/GSTIN", "");
            oModel.setProperty("/Type", "");
            oModel.setProperty("/Value", "");
            oModel.setProperty("/Currency", "");

            oVisible.setProperty("/CC_id_CustInput", false);
            oVisible.setProperty("/isIndia", false);

            // UI reset
            oState.setValue("").setSelectedKey("");
            oCity.setValue("").setSelectedKey("");
            oSTD.setValue("");

            // Block dependent dropdowns
            oState.getBinding("items")?.filter([
                new sap.ui.model.Filter("stateName", "EQ", "__NONE__")
            ]);
            oCity.getBinding("items")?.filter([
                new sap.ui.model.Filter("cityName", "EQ", "__NONE__")
            ]);

            const oItem = oCountry.getSelectedItem();
            if (!oItem) return;

            const sCountry = oItem.getText();
            const sCountryCode = oItem.getAdditionalText()?.trim();
            // GST only for India
            if (sCountry === "India") {
                oVisible.setProperty("/isIndia", true);
            } else {
                oVisible.setProperty("/isIndia", false);
            }

            oModel.setProperty("/country", sCountry);

            // STD handling
            const countries = this.getOwnerComponent().getModel("CountryModel").getData();
            const data = countries.find(c => c.countryName === sCountry);
            if (data?.stdCode) {
                oModel.setProperty("/stdCode", data.stdCode);
                oSTD.setValue(data.stdCode);
                this.onSTDChange();
            }
            const adata = countries.find(c => c.countryName === sCountry);
            if (data?.currency) {
                oModel.setProperty("/Currency", adata.currency);
                oCurrency.setSelectedKey(adata.currency);
            }
            // Release states only after country is valid
            if (sCountryCode) {
                oState.getBinding("items")?.filter([
                    new sap.ui.model.Filter(
                        "countryCode",
                        sap.ui.model.FilterOperator.EQ,
                        sCountryCode
                    )
                ]);
            }
        },

        MC_onChangeState: function(oEvent) {
            const oState = oEvent.getSource();
            const oModel = this.getView().getModel("MDmodel");

            // sanitize free typing
            oState.setValue(oState.getValue().replace(/[^a-zA-Z\s]/g, ""));
            utils._LCvalidateMandatoryField(oEvent);

            // ALWAYS write to model
            const sStateText =
                oState.getSelectedItem()?.getText() ||
                oState.getValue() ||
                "";

            oModel.setProperty("/state", sStateText);

            // Reset city on state change
            const oCity = this.byId("MC_id_City");
            oModel.setProperty("/baseLocation", "");
            oCity.setValue("").setSelectedKey("");

            oCity.getBinding("items")?.filter([
                new sap.ui.model.Filter("cityName", "EQ", "__NONE__")
            ]);

            // Release cities only if country is valid
            const oCountry = this.byId("MC_id_Country");
            const sCountryCode =
                oCountry.getSelectedItem()?.getAdditionalText()?.trim();

            if (!sCountryCode || !sStateText) return;

            oCity.getBinding("items")?.filter([
                new sap.ui.model.Filter("stateName", "EQ", sStateText),
                new sap.ui.model.Filter("countryCode", "EQ", sCountryCode)
            ]);
        },

        MC_onChangeCity: function(oEvent) {
            const oCity = oEvent.getSource();
            const oModel = this.getView().getModel("MDmodel");

            let sValue = oCity.getValue().replace(/[^a-zA-Z\s]/g, "");
            if (sValue.length > 50) {
                sValue = sValue.substring(0, 50);
            }
            oCity.setValue(sValue);

            const oCountry = this.byId("MC_id_Country");
            const oState = this.byId("MC_id_State");
            const hasCountry = !!oCountry.getSelectedItem();
            const hasState = !!oState.getSelectedItem() || !!oState.getValue();

            if (!hasCountry || !hasState) {
                oCity.setValue("");
                oCity.setSelectedKey(null);
                oCity.getBinding("items")?.filter([new sap.ui.model.Filter("cityName", "EQ", "__NONE__")]);
                oCity.setValueState("None");
                return;
            }

            utils._LCvalidateMandatoryField(oEvent);
            oModel.setProperty("/baseLocation", sValue);
        },

        onSTDChange: function() {
            const oSTD = this.byId("MC_id_codeModel");
            const oMobile = this.byId("BD_idPhone");
            const sKey = oSTD.getSelectedKey();
            if (sKey) {
                oSTD.setValueState("None");
                oSTD.setValueStateText(this.i18nModel.getText("MSselectCode"));
            }
            // const std = oSTD.getValue();
            oMobile.setValue("");

            // Dynamic maxLength
            if (sKey === "+91") {
                oMobile.setMaxLength(10);
            } else {
                oMobile.setMaxLength(14);
            }
        },

        onMobileLivechnage: function(oEvent) {
            const taxInput = this.byId("CC_id_custValue");
            const currentTaxValue = taxInput ? taxInput.getValue() : "";
            const oInput = oEvent.getSource();
            let sValue = oInput.getValue().replace(/\D/g, "");
            oInput.setValue(sValue);

            const sSTD = this.byId("MC_id_codeModel").getSelectedKey();
            if (!sValue) {
                oInput.setValueState("None");
                oInput.setValueStateText("");
                return;
            }

            if (!sSTD) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Please select ISD code first");
                return;
            }
            if (sSTD === "+91") {
                if (sValue.length !== 10) {
                    oInput.setValueState("Error");
                    oInput.setValueStateText("Indian mobile number must be exactly 10 digits");
                    return;
                }
            } else {
                if (sValue.length < 4) {
                    oInput.setValueState("Error");
                    oInput.setValueStateText("Mobile number must be at least 4 digits");
                    return;
                }

                if (sValue.length > 14) {
                    sValue = sValue.substring(0, 14);
                    oInput.setValue(sValue);
                }
            }
            oInput.setValueState("None");
            oInput.setValueStateText("");
        },

        onAfterRendering: function() {
            const oCombo = this.byId("MD_id_BranchCode");
            if (oCombo) {
                oCombo.setFilterFunction((sTerm, oItem) => {
                    // const sText = (oItem.getText() || "").toLowerCase();
                    // const sAdditional = (oItem.getAdditionalText() || "").toLowerCase();
                    sTerm = sTerm.toLowerCase();
                    return ((oItem.getText() || "").toLowerCase().includes(sTerm) || (oItem.getAdditionalText() || "").toLowerCase().includes(sTerm));
                });
            }
        },

        _addLogoProcessingRow: function () {
            const oModel = this.getView().getModel("UploaderData");
            const aDocs = oModel.getProperty("/attachmentslogo") || [];
            const sTempId = "__processing__" + Date.now();
            const oTempDoc = {
                filename: "Compressing...",
                fileType: "",
                size: 0,
                isProcessing: true,
                tempId: sTempId
            };
            aDocs.push(oTempDoc);
            oModel.setProperty("/attachmentslogo", aDocs);
            return sTempId;
        },

        _removeLogoProcessingRow: function (sTempId) {
            const oModel = this.getView().getModel("UploaderData");
            let aDocs = oModel.getProperty("/attachmentslogo") || [];
            aDocs = aDocs.filter(doc => doc.tempId !== sTempId);
            oModel.setProperty("/attachmentslogo", aDocs);
        },

        _addImageProcessingRow: function () {
            const oModel = this.getView().getModel("UploaderData");
            const aDocs = oModel.getProperty("/attachmentimage") || [];
            const sTempId = "__processing__" + Date.now();
            const oTempDoc = {
                filename: "Compressing...",
                fileType: "",
                size: 0,
                isProcessing: true,
                tempId: sTempId
            };
            aDocs.push(oTempDoc);
            oModel.setProperty("/attachmentimage", aDocs);
            return sTempId;
        },

        _removeImageProcessingRow: function (sTempId) {
            const oModel = this.getView().getModel("UploaderData");
            let aDocs = oModel.getProperty("/attachmentimage") || [];
            aDocs = aDocs.filter(doc => doc.tempId !== sTempId);
            oModel.setProperty("/attachmentimage", aDocs);
        },

        onFacilityFileChange: async function(oEvent) {
            const oFile = oEvent.getParameter("files")[0];
            if (!oFile) return;

            let processedFile = oFile;
            const MAX_SIZE_MB = 2;
            const fileSizeMB = oFile.size / (1024 * 1024);
            const isImage = oFile.type === "image/jpeg" || oFile.type === "image/jpg" || oFile.type === "image/png";

            const sTempId = this._addLogoProcessingRow();
            this.getBusyDialog();

            try {
                if (fileSizeMB > MAX_SIZE_MB && isImage) {
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

                const base64 = await new Promise((resolve, reject) => {
                    const oReader = new FileReader();
                    oReader.onload = (e) => resolve(e.target.result.split(",")[1]);
                    oReader.onerror = reject;
                    oReader.readAsDataURL(processedFile);
                });

                const sExtension = processedFile.type.split("/")[1] === "jpeg" ? "jpg" : processedFile.type.split("/")[1];
                const sFileName = "Logo." + (sExtension || "png");

                this.getView().getModel("UploadModel").setData({
                    Photo1: base64,
                    Photo1Type: processedFile.type,
                    Photo1Name: sFileName
                });

                this._removeLogoProcessingRow(sTempId);

                const oUploaderModel = this.getView().getModel("UploaderData");
                oUploaderModel.setProperty("/attachmentslogo", [{
                    filename: sFileName,
                    fileType: processedFile.type,
                    size: processedFile.size,
                    base64: base64,
                    isProcessing: false
                }]);

                const oVisModel = this.getView().getModel("VisibilityModel");
                if (oVisModel) {
                    oVisModel.setProperty("/Logo", base64);
                }

                sap.m.MessageToast.show("File uploaded successfully");
            } catch (err) {
                this._removeLogoProcessingRow(sTempId);
                sap.m.MessageToast.show(err.message || "Compression failed. Please try a smaller file.");
                oEvent.getSource().clear();
            } finally {
                this.closeBusyDialog();
            }
        },

        onImageChange: async function(oEvent) {
            const oFile = oEvent.getParameter("files")[0];
            if (!oFile) return;

            let processedFile = oFile;
            const MAX_SIZE_MB = 2;
            const fileSizeMB = oFile.size / (1024 * 1024);
            const isImage = oFile.type === "image/jpeg" || oFile.type === "image/jpg" || oFile.type === "image/png";

            const sTempId = this._addImageProcessingRow();
            this.getBusyDialog();

            try {
                if (fileSizeMB > MAX_SIZE_MB && isImage) {
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

                const base64 = await new Promise((resolve, reject) => {
                    const oReader = new FileReader();
                    oReader.onload = (e) => resolve(e.target.result.split(",")[1]);
                    oReader.onerror = reject;
                    oReader.readAsDataURL(processedFile);
                });

                const sExtension = processedFile.type.split("/")[1] === "jpeg" ? "jpg" : processedFile.type.split("/")[1];
                const sFileName = "HomePage." + (sExtension || "png");

                this.getView().getModel("imageModel").setData({
                    Attachment: base64,
                    AttachmentType: processedFile.type,
                    AttachmentName: sFileName
                });

                this.getView().getModel("tokenImageModel").setData({
                    imageTokens: [{
                        key: sFileName,
                        text: sFileName
                    }]
                });

                this._removeImageProcessingRow(sTempId);

                const oUploaderModel = this.getView().getModel("UploaderData");
                oUploaderModel.setProperty("/attachmentimage", [{
                    filename: sFileName,
                    fileType: processedFile.type,
                    size: processedFile.size,
                    base64: base64,
                    category: "Image",
                    isProcessing: false
                }]);

                sap.m.MessageToast.show("Image uploaded successfully");
            } catch (err) {
                this._removeImageProcessingRow(sTempId);
                sap.m.MessageToast.show(err.message || "Compression failed. Please try a smaller file.");
                oEvent.getSource().clear();
            } finally {
                this.closeBusyDialog();
            }
        },

        onPreviewLogoFile: async function (oEvent) {
            const oData = oEvent.getSource().getBindingContext("UploaderData")?.getObject();
            if (!oData || !oData.base64) {
                sap.m.MessageToast.show("No file available");
                return;
            }
            this._openFilePreview(oData.base64, oData.filename, oData.fileType);
        },

        onPreviewImageFile: async function (oEvent) {
            const oData = oEvent.getSource().getBindingContext("UploaderData")?.getObject();
            if (!oData || !oData.base64) {
                sap.m.MessageToast.show("No file available");
                return;
            }
            this._openFilePreview(oData.base64, oData.filename, oData.fileType);
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
                    sap.m.MessageToast.show("Unable to preview image.");
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

            sap.m.MessageToast.show("Preview not supported.");
        },

        onDownloadPreview: function () {
            if (!this._sPreviewBase64) {
                sap.m.MessageToast.show("No file available for download.");
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

        onTokenDelete: function(oEvent) {

            const oButton = oEvent.getSource();
            const oItem = oButton.getParent();
            const oTable = this.byId("idUploadTable");

            const oModel = this.getView().getModel("UploaderData");
            let aData = oModel.getProperty("/attachmentslogo");

            const iIndex = oTable.indexOfItem(oItem);

            if (iIndex > -1) {
                aData.splice(iIndex, 1);
                oModel.setProperty("/attachmentslogo", aData);
                if (!aData.length) {
                    this.getView().getModel("UploadModel").setData({
                        Photo1: "",
                        Photo1Type: "",
                        Photo1Name: ""
                    });
                    this.getView().getModel("tokenModel").setData({
                        tokens: []
                    });
                }
            }
        },
        onTokenImageDelete: function(oEvent) {
            const oButton = oEvent.getSource();
            const oItem = oButton.getParent();
            const oTable = this.byId("idUploadTabl1");

            const oModel = this.getView().getModel("UploaderData");
            let aData = oModel.getProperty("/attachmentimage");

            const iIndex = oTable.indexOfItem(oItem);

            if (iIndex > -1) {
                aData.splice(iIndex, 1);
                oModel.setProperty("/attachmentimage", aData);
                if (!aData.length) {
                    this.getView().getModel("imageModel").setData({
                        Attachment: "",
                        AttachmentType: "",
                        AttachmentName: ""
                    });
                    this.getView().getModel("tokenImageModel").setData({
                        imageTokens: []
                    });
                }
            }
        },

        _hasHomeImageForSave: function() {
            var oImage = this.getView().getModel("imageModel").getData() || {};
            var aHomeImages = this.getView().getModel("UploaderData").getProperty("/attachmentimage") || [];
            return !!oImage.Attachment && aHomeImages.some(function(oFile) {
                return !!(oFile && oFile.base64 && !oFile.isProcessing);
            });
        },



        onpressbranchlogo: function(oEvent) {
            this._loadAndPreviewBranchImage(oEvent, "Logo");
        },

        HF_viewimage: function(oEvent) {
            this._loadAndPreviewBranchImage(oEvent, "Home");
        },

        _loadAndPreviewBranchImage: async function(oEvent, sImageType) {
            var oContext = oEvent.getSource().getBindingContext("mainModel");
            var oData = oContext && oContext.getObject();
            var sMissingMessage = sImageType === "Logo" ? "No logo found for this branch" : "No home image found for this branch";

            if (!oData || !oData.BranchID) {
                sap.m.MessageToast.show(sMissingMessage);
                return;
            }

            this.getBusyDialog();
            try {
                var oResponse = await this.ajaxReadWithJQuery("HM_BranchImage", {
                    BranchID: oData.BranchID,
                    Image: sImageType
                });
                var oImageData = Array.isArray(oResponse.data) ? oResponse.data[0] : (oResponse.data || oResponse);
                var sBase64 = oImageData && (oImageData.ImageData || oImageData.Image || oImageData.Photo1 || oImageData.Attachment);

                if (!sBase64 || !sBase64.length) {
                    sap.m.MessageToast.show(sMissingMessage);
                    return;
                }

                var sPhotoName = oImageData.FileName || oImageData.Photo1Name || oImageData.AttachmentName || sImageType;
                var sMimeType = oImageData.FileType || oImageData.Photo1Type || oImageData.AttachmentType || "image/jpeg";
                this._openBranchImagePreview(sBase64, sPhotoName, sMimeType, sMissingMessage);
            } catch (err) {
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                this.closeBusyDialog();
            }
        },

        _openBranchImagePreview: function(sBase64, sPhotoName, sMimeType, sMissingMessage) {
            sBase64 = sBase64.replace(/\s/g, "");
            var sImageSrc = sBase64.includes("data:") ? sBase64 : "data:" + sMimeType + ";base64," + sBase64;
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

                const oHtml = new sap.ui.core.HTML({
                    sanitizeContent: false,
                    content: `
            <div class="preview-image-container">
                <img src="${sImageSrc}" />
            </div>
        `
                });

                this._oComplaintPreviewDialog = new sap.m.Dialog({
                    title: sPhotoName || "Document Preview",
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
                        press: () => this._oComplaintPreviewDialog.close()
                    }).addStyleClass("myUnifiedBtn"),
                    afterClose: () => {
                        this._oComplaintPreviewDialog.destroy();
                        this._oComplaintPreviewDialog = null;
                    }
                });

                this.getView().addDependent(this._oComplaintPreviewDialog);
                this._oComplaintPreviewDialog.open();
            }.bind(this);

            oImg.onerror = function() {
                sap.m.MessageToast.show(sMissingMessage);
            }.bind(this);

            oImg.src = sImageSrc;
        },

        HF_viewroom: function(oEvent) {
            var oContext = oEvent.getSource().getBindingContext("mainModel");
            var oData = oContext.getObject();

            if (!oData.Photo1 || !oData.Photo1.length) {
                sap.m.MessageBox.information(
                    "No logo is uploaded.", {
                        title: "Information",
                        styleClass: "myUnifiedBtn"
                    }
                );
                return;
            }
            var sBase64 = oData.Photo1.replace(/\s/g, "");
            var sPhotoName = oData.Photo1Name || "Room Photo";
            if (sBase64 && !sBase64.startsWith("data:image")) {
                sBase64 = "data:image/jpeg;base64," + sBase64;
            }
            var oImage = new sap.m.Image({
                src: sBase64,
                densityAware: false,
                decorative: false,
                width: "100%",
                height: "100%",
                style: "object-fit: cover; display:block; margin:0; padding:0;"
            })
            var oDialog = new sap.m.Dialog({
                title: sPhotoName,
                contentWidth: "50%",
                contentHeight: "60%",
                horizontalScrolling: false,
                verticalScrolling: false,
                content: [oImage],
                endButton: new sap.m.Button({
                    text: "Close",
                    press: function() {
                        oDialog.close();
                    }
                }).addStyleClass("myUnifiedBtn"),
                afterClose: function() {
                    oDialog.destroy();
                }
            }).addStyleClass("barheader");
            oDialog.addStyleClass("ImageDialogNoPadding");
            oDialog.open();
        },

        MC_ValidateGstNumber: function(oEvent) {
            const oInput = oEvent ? oEvent.getSource() : sap.ui.getCore().byId(this.getView().createId("MC_id_CustomGst"));
            const sValue = oInput.getValue().toUpperCase();
            oInput.setValue(sValue);
            const dataModel = this.getView().getModel("MDmodel");
            const visiModel = this.getView().getModel("visiblePlay");
            const previousGST = dataModel.getProperty("/GSTIN_PREV");
            const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
            if (!sValue) {
                oInput.setValueState("None");
                visiModel.setProperty("/CC_id_CustInput", false);
                visiModel.setProperty("/selectedIndex", -1);
                dataModel.setProperty("/Type", "");
                dataModel.setProperty("/Value", "");
                return true;
            }
            if (!GST_REGEX.test(sValue)) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("gstError"));
                visiModel.setProperty("/CC_id_CustInput", false);
                visiModel.setProperty("/selectedIndex", -1);
                return false;
            }
            oInput.setValueState("None");
            visiModel.setProperty("/CC_id_CustInput", true);
            const stateCode = sValue.substring(0, 2);
            if (previousGST && previousGST !== sValue) {
                dataModel.setProperty("/Value", "");
            }
            if (stateCode === "29") {
                visiModel.setProperty("/selectedIndex", 0);
                dataModel.setProperty("/Type", "CGST/SGST");
                if (!dataModel.getProperty("/Value")) {
                    dataModel.setProperty("/Value", "9");
                }
            } else if (stateCode === "22") {
                visiModel.setProperty("/selectedIndex", 1);
                dataModel.setProperty("/Type", "IGST");
                if (!dataModel.getProperty("/Value")) {
                    dataModel.setProperty("/Value", "18");
                }
            } else {
                visiModel.setProperty("/selectedIndex", 0);
                dataModel.setProperty("/Type", "CGST/SGST");
            }
            // store current GST as previous
            dataModel.setProperty("/GSTIN_PREV", sValue);
            return true;
        },

        onTaxPercentageChange: function(oEvent) {
            const oInput = oEvent.getSource();
            const sValue = oInput.getValue();
            const dataModel = this.getView().getModel("MDmodel");

            // Allow only numbers and optional single decimal point
            let filteredValue = sValue.replace(/[^0-9.]/g, '');

            // Ensure only one decimal point
            const parts = filteredValue.split('.');
            if (parts.length > 2) {
                filteredValue = parts[0] + '.' + parts.slice(1).join('');
            }

            // Limit to 2 decimal places
            if (parts[1] && parts[1].length > 2) {
                filteredValue = parts[0] + '.' + parts[1].substring(0, 2);
            }
            oInput.setValue(filteredValue);
            dataModel.setProperty("/Value", filteredValue);

            // Validate range (0-100)
            const numValue = parseFloat(filteredValue);
            if (filteredValue && (numValue < 0 || numValue > 100)) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Tax percentage must be between 0 and 100");
            } else {
                oInput.setValueState("None");
                oInput.setValueStateText("");
            }
        },

        onRadioButtonChange: function(oEvent) {
            const oButtonGroup = oEvent.getSource();
            const selectedIndex = oButtonGroup.getSelectedIndex();
            const dataModel = this.getView().getModel("MDmodel");
            const visiModel = this.getView().getModel("visiblePlay");

            visiModel.setProperty("/selectedIndex", selectedIndex);
            if (selectedIndex === 0) {
                dataModel.setProperty("/Type", "CGST/SGST");
            } else if (selectedIndex === 1) {
                dataModel.setProperty("/Type", "IGST");
            }
        },
    })
});
