sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast",
    "../utils/validation",
    "../model/formatter"
], function (BaseController, MessageBox, Spreadsheet, MessageToast, utils, Formatter) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Branch", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteBranchData").attachMatched(this._onRouteMatched, this);
            const oMDmodel = new sap.ui.model.json.JSONModel({
                BranchID: "",
                Name: "",
                Address: "",
                // Latitude: "", 
                // Longitude: "",  
                GeoLocation: "",
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

            // Token model
            this.getView().setModel(new sap.ui.model.json.JSONModel({
                tokens: []
            }), "tokenModel");
        },

        _onRouteMatched: async function () {
            try {
                sap.ui.core.BusyIndicator.show(0);
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.getView().setModel(new sap.ui.model.json.JSONModel({ Attachment: "", AttachmentType: "", AttachmentName: "" }), "imageModel");
                this.getView().setModel(new sap.ui.model.json.JSONModel({ imageTokens: [] }), "tokenImageModel");
                await this.Onsearch();
                this.commonLoginFunction();
                await this.Customerdata()
            } catch (err) {
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        Customerdata: function () {
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
            }).catch((err) => {
                sap.m.MessageToast.show(err.message || err.responseText);
            });
        },

        Onsearch: async function () {
            const oLoginmodel = this.getOwnerComponent().getModel("LoginModel").getData();
            var Branch = this.getView().byId("MD_id_BranchCode").getSelectedKey()

            var filter = {
                UserID: oLoginmodel.EmployeeID
            }

            var LoginData = await this.ajaxReadWithJQuery("HM_CustomerContact", filter)
            var oFCIAerData = Array.isArray(LoginData.data) ? LoginData.data : [LoginData.data];
            const oExistingModel = oFCIAerData[0];
            const oView = this.getView();

            let filters = {};
            if (oLoginmodel.Role === "Admin") {
                filters.BranchID = Branch === "" ? oExistingModel.BranchCode : Branch;
                filters.Role = "Admin";

            } else {
                filters.BranchID = Branch
            }
            let sCustomerName = oView.byId("MD_id_BranchCode").getValue()?.trim();
            let sPincode = oView.byId("MD_id_SearchField").getValue()?.trim();

            if (sCustomerName) {
                if (sCustomerName.includes(" - ")) {
                    sCustomerName = sCustomerName.split(" - ")[0];
                }
                filters.SearchText = sCustomerName;
            }

            if (sPincode) {
                filters.Pincode = sPincode;
            }
            var oData = await this.ajaxReadWithJQuery("HM_Branch", filters)
            var aBranchData = Array.isArray(oData.data) ? oData.data : [oData.data];
            var model = new sap.ui.model.json.JSONModel(aBranchData);

            this.getOwnerComponent().setModel(model, "mainModel")
        },

        MD_onPressClear: function () {
            this.getView().byId("MD_id_BranchCode").setSelectedKey("")
            this.getView().byId("MD_id_SearchField").setValue("");
        },

        MD_onSearch: async function () {
            sap.ui.core.BusyIndicator.show(0);
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
                sap.ui.core.BusyIndicator.hide();
            }
        },

        onGlobalSearch: function (oEvent) {
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

        _updateRowCount: function () {
            const oTable = this.byId("id_MD_Table");
            const oBinding = oTable.getBinding("items");
            const iLength = oBinding.getLength(); // filtered result count
            this.getView().getModel("mainModel").setProperty("/count", iLength);
        },

        onTableUpdateFinished: function () {
            this._updateRowCount();
        },

        createTableSheet: function () {
            return [{
                label: "Branch Code",
                property: "BranchID",
                type: "string"
            },
            {
                label: "Branch Name",
                property: "Name",
                type: "string"
            },
            {
                label: "Address",
                property: "Address",
                type: "string"
            },
            {
                label: "GeoLocation",      // Add this
                property: "GeoLocation",
                type: "string"
            },
            {
                label: "Pincode",
                property: "Pincode",
                type: "string"
            },
            {
                label: "STD Code",
                property: "STD",
                type: "string"
            },
            {
                label: "Contact Number",
                property: "Contact",
                type: "string"
            },
            {
                label: "Country",
                property: "Country",
                type: "string"
            },
            {
                label: "State",
                property: "State",
                type: "string"
            },
            {
                label: "City",
                property: "City",
                type: "string"
            },
            {
                label: "Penalty",
                property: "Penalty",
                type: "string"
            },
            ]
        },

        MD_onDownload: function () {
            const oModel = this.byId("id_MD_Table").getModel("mainModel").getData();
            if (!oModel || oModel.length === 0) {
                MessageToast.show(this.i18nModel.getText("MSnodata"));
                return;
            }
            const adjustedData = oModel.map(item => ({
                ...item,
                Pincode: item.Pincode ? String(item.Pincode) : "",
                Contact: item.Contact ? String(item.Contact) : ""
            }));
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level"
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

        setDefaultTimesOnCreate: function () {
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

        convert24ToAmPm: function (sTime) {
            if (!sTime) return "";

            const hour24 = parseInt(sTime.split(":")[0], 10);
            const ampm = hour24 >= 12 ? "PM" : "AM";
            const hour12 = hour24 % 12 || 12;

            return hour12 + ampm;
        },

        MD_AddButtonPress: function () {
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

            // oCountry.getBinding("items").filter([]);
            const stateBinding = oState.getBinding("items");
            if (stateBinding) stateBinding.filter([]);

            const cityBinding = oCity.getBinding("items");
            if (cityBinding) cityBinding.filter([]);
            this._resetBranchValueStates();
            this._resetFacilityValueStates();
            oView.getModel("MDmodel").setData({
                Name: "",
                Address: "",
                GeoLocation: "",
                Pincode: "",
                Contact: "",
                stdCode: "",
                country: "",
                state: "",
                baseLocation: "",
                GSTIN: "",
                Type: "",
                Value: "",  // Start with empty value
                Penalty: "",
                CheckinTime: "",
                CheckoutTime: ""
            });
            this.getView().getModel("visiblePlay").setProperty("/CC_id_CustInput", false);
            this.setDefaultTimesOnCreate();
            this.isEdit = false;
            this.oDialog.open();
        },

        onDepositCurrency: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        },

        MD_onSaveButtonPress: async function () {
            var oView = this.getView();
            const oUpload = oView.getModel("UploadModel").getData();
            const oImage = oView.getModel("imageModel").getData();
            var oFacilitiesModel = oView.getModel("MDmodel");
            var Payload = oFacilitiesModel.getData();

            var isMandatoryValid = (
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_idBName")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_idAddress")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_idGeoLocation")), "ID") &&
                utils._LCvalidatePinCode(sap.ui.getCore().byId(oView.createId("BD_idPin")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("MC_id_Country")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("MC_id_State")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("MC_id_City")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("MC_id_codeModel")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_id_CheckInTime")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_id_CheckOutTime")), "ID")
            );

            if (!isMandatoryValid) {
                sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }
            // Rest of your existing validations...
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

            const oPenalty = sap.ui.getCore().byId(oView.createId("BD_idPenalty"));
            if (!oPenalty.getValue() && oPenalty.getValue() !== "0") {
                oPenalty.setValueState("Error");
                oPenalty.setValueStateText(this.i18nModel.getText("enterPenalty"));
                sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }
            if (oPenalty.getValueState() === "Error") {
                oPenalty.focus();
                sap.m.MessageToast.show("Please correct the Penalty amount");
                return;
            }

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

            if (!this.MC_ValidateGstNumber()) {
                sap.ui.getCore().byId(oView.createId("MC_id_CustomGst")).focus();
                return;
            }

            if (!oImage.Attachment) {
                const oFileUploader = sap.ui.getCore().byId(oView.createId("BD_id_FileUploader1"));
                sap.m.MessageToast.show("Please upload branch image");
                return;
            }
            var oData = {
                Name: Payload.Name,
                UserID: this.getOwnerComponent().getModel("LoginModel").getData().EmployeeID,
                Address: Payload.Address,
                GeoLocation: Payload.GeoLocation,
                Pincode: Payload.Pincode,
                Contact: Payload.Contact,
                STD: Payload.stdCode,
                Country: Payload.country,
                State: Payload.state,
                City: Payload.baseLocation,
                Penalty: Payload.Penalty,
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

            sap.ui.core.BusyIndicator.show(0);
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
                await this.Onsearch();
                this.oDialog.close();
                sap.m.MessageToast.show(
                    this.isEdit ? this.i18nModel.getText("branchUpdatedSuccessfully") : this.i18nModel.getText("branchaddedSuccessfully"));
            } catch (err) {
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },

        onHome: function () {
            this.CommonLogoutFunction();
        },

        MD_onCancelButtonPress: function () {
            var oView = this.getView();

            if (oView.getModel("MDmodel")) {
                oView.getModel("MDmodel").setData({
                    BranchID: "",
                    Name: "",
                    Address: "",
                    Pincode: "",
                    Contact: "",
                    Penalty: "",
                });
            }

            this._resetFacilityValueStates();
            var oTable = this.byId("id_MD_Table");
            oTable.removeSelections();
            this.oDialog.close();
        },
        onGeoLocationLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        _resetFacilityValueStates: function () {
            var oView = this.getView();
            var aFields = ["idBranch", "idBName", "idAddress", "BD_idGeoLocation", "idPin", "idPhone", "idPenalty"];

            aFields.forEach(function (sId) {
                var oField = sap.ui.getCore().byId(oView.createId(sId));
                if (oField && oField.setValueState) {
                    oField.setValueState("None");
                }
            });
        },

        onPinInputLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidatePinCode(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onPenaltyInputLiveChange: function (oEvent) {
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

        onAddressInputLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onNameInputLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onBNameInputLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onCheckOutTimeChange: function (oEvent) {
            const oTP = oEvent.getSource();
            if (oTP.getDateValue()) {
                oTP.setValueState("None");
                oTP.setValueStateText("");
            }
        },

        onCheckInTimeChange: function (oEvent) {
            const oTP = oEvent.getSource();
            if (oTP.getDateValue()) {
                oTP.setValueState("None");
                oTP.setValueStateText("");
            }
        },

        _validateCheckInOut: function () {
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
            // oCheckIn.setValueStateText("");
            oCheckOut.setValueState("None");
            // oCheckOut.setValueStateText("");
            return true;
        },

        MD_DeleteRow: function () {
            var oTable = this.byId("id_MD_Table");
            var aSelectedItems = oTable.getSelectedItems();
            var CustData = this.getView().getModel("HostelModel").getData();

            // No selection
            if (aSelectedItems.length === 0) {
                sap.m.MessageToast.show(
                    this.i18nModel.getText("pleaseSelectatLeastOneRecordtoDelete")
                );
                return;
            }

            var aAssignedBranches = [];
            var aDeletableBranches = [];

            // Split assigned & non-assigned branches
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

            // Single selection & assigned → stop
            if (aSelectedItems.length === 1 && aAssignedBranches.length === 1) {
                sap.m.MessageBox.warning(
                    "Cannot delete! Selected branch is already assigned."
                );
                return;
            }

            // All selected branches are assigned
            if (aDeletableBranches.length === 0) {
                sap.m.MessageBox.warning(
                    "All selected branches are already assigned and cannot be deleted."
                );
                return;
            }

            // Show only non-assigned branch IDs
            var sBranchIds = aDeletableBranches
                .map(b => b.branchId)
                .join(", ");

            sap.m.MessageBox.confirm(
                `Are you sure you want to delete the following branches: ${sBranchIds}?`,
                {
                    icon: sap.m.MessageBox.Icon.WARNING,
                    title: "Confirm Deletion",
                    actions: [
                        sap.m.MessageBox.Action.YES,
                        sap.m.MessageBox.Action.NO
                    ],
                    emphasizedAction: sap.m.MessageBox.Action.NO,

                    onClose: async (sAction) => {
                        if (sAction === sap.m.MessageBox.Action.YES) {
                            sap.ui.core.BusyIndicator.show(0);

                            try {
                                var sUserID = this.getOwnerComponent().getModel("LoginModel").getData().EmployeeID;

                                // Delete only non-assigned branches
                                for (let oBranch of aDeletableBranches) {
                                    await this.ajaxDeleteWithJQuery("HM_Branch", {
                                        filters: {
                                            UserID: sUserID,
                                            BranchID: oBranch.branchId
                                        }
                                    });
                                }
                                await this.Onsearch();
                                sap.m.MessageToast.show(this.i18nModel.getText("selectedRecordsDeletedSuccessfully"));
                            } catch (err) {
                                console.error("Delete failed:", err);
                                sap.m.MessageBox.error(this.i18nModel.getText("errorwhileDeletingRecordsPleasetryagain"));
                            } finally {
                                sap.ui.core.BusyIndicator.hide();
                                oTable.removeSelections(true);
                            }
                        }
                    }
                }
            );
        },

        MD_UpdateTableRow: function () {
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
            const aAllStates = this.getOwnerComponent().getModel("StateModel").getData();
            const aFilteredStates = aAllStates.filter(s => s.countryCode === oData.countryCode);
            this.getView().setModel(new sap.ui.model.json.JSONModel(aFilteredStates), "FilteredStateModel");

            const aAllCities = this.getOwnerComponent().getModel("CityModel").getData();
            const aFilteredCities = aAllCities.filter(c =>
                c.stateName === oData.state && c.countryCode === oData.countryCode
            );
            this.getView().setModel(new sap.ui.model.json.JSONModel(aFilteredCities), "FilteredCityModel");
            this.getView().getModel("UploadModel").setData({
                Photo1: oData.Photo1 || "",
                Photo1Type: oData.Photo1Type || "",
                Photo1Name: oData.Photo1Name || ""
            });

            this.getView().getModel("imageModel").setData({
                Attachment: oData.Attachment || "",
                AttachmentType: oData.AttachmentType || "",
                AttachmentName: oData.AttachmentName || ""
            });

            const aTokenImages = oData.AttachmentName ? [{
                key: oData.AttachmentName,
                text: oData.AttachmentName
            }] : [];

            // Add existing file to tokens
            const aTokens = oData.Photo1Name ? [{
                key: oData.Photo1Name,
                text: oData.Photo1Name
            }] : [];

            this.getView().getModel("tokenModel").setData({
                tokens: aTokens
            });
            this.getView().getModel("tokenImageModel").setData({
                imageTokens: aTokenImages
            });
            if (!this.oDialog) {
                this.oDialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.BranchData", this);
                oView.addDependent(this.oDialog);
            }
            var oMDmodel = oView.getModel("MDmodel");
            oMDmodel.setData({
                BranchID: oData.BranchID,
                Name: oData.Name,
                Address: oData.Address,
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
                Currency: oData.Currency,
                CheckinTime: this.convert24ToAmPm(oData.CheckinTime),
                CheckoutTime: this.convert24ToAmPm(oData.CheckoutTime),
                Penalty: oData.Penalty
            });
            this.isEdit = true;
            const oVisible = this.getView().getModel("visiblePlay");
            // After setting GST validation, ensure tax percentage is preserved
            setTimeout(() => {
                this.MC_ValidateGstNumber();

                // Force update of tax percentage field
                const taxInput = this.byId("CC_id_custValue");
                if (taxInput && oData.Value) {
                    taxInput.setValue(oData.Value.toString());
                }
            }, 0);
            const bIsIndia = oData.Country === "India";
            oVisible.setProperty("/isIndia", bIsIndia);

            // GST present or not
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

        _resetBranchValueStates: function () {
            const oView = this.getView();
            const get = (id) => sap.ui.getCore().byId(oView.createId(id));

            const mControls = {
                BD_idBName: "enterBranchName",
                BD_idAddress: "enterAddress",
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
                BD_idPenalty: "enterPenalty"
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

        _applyCountryStateCityFilters: function () {
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

        MC_onChangeCountry: function (oEvent) {
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

        MC_onChangeState: function (oEvent) {
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

        MC_onChangeCity: function (oEvent) {
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
                oCity.getBinding("items")?.filter([new sap.ui.model.Filter("cityName", "EQ", "__NONE__")]); oCity.setValueState("None"); return;
            }

            utils._LCvalidateMandatoryField(oEvent);
            oModel.setProperty("/baseLocation", sValue);
        },

        onSTDChange: function () {
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

        onMobileLivechnage: function (oEvent) {
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
            }
            else {
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

        onAfterRendering: function () {
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

        onFacilityFileChange: function (oEvent) {
            const oFile = oEvent.getParameter("files")[0];
            if (!oFile) {
                return;
            }

            const oReader = new FileReader();

            oReader.onload = (e) => {
                const base64 = e.target.result.split(",")[1];
                this.getView().getModel("UploadModel").setData({
                    Photo1: base64,
                    Photo1Type: oFile.type,
                    Photo1Name: oFile.name
                });
                this.getView().getModel("tokenModel").setData({
                    tokens: [{
                        key: oFile.name,
                        text: oFile.name
                    }]
                });
                const oVisModel = this.getView().getModel("VisibilityModel");
                if (oVisModel) {
                    oVisModel.setProperty("/Logo", base64);
                }
                sap.m.MessageToast.show("Logo uploaded successfully");
            };

            oReader.readAsDataURL(oFile);
        },

        onImageChange: function (oEvent) {
            const oFiles = oEvent.getParameter("files")[0];
            if (!oFiles) {
                return;
            }

            const oReader = new FileReader();

            oReader.onload = (e) => {
                const base64 = e.target.result.split(",")[1];
                this.getView().getModel("imageModel").setData({
                    Attachment: base64,
                    AttachmentType: oFiles.type,
                    AttachmentName: oFiles.name
                });
                this.getView().getModel("tokenImageModel").setData({
                    imageTokens: [{
                        key: oFiles.name,
                        text: oFiles.name
                    }]
                });
                sap.m.MessageToast.show("Image uploaded successfully");
            };
            oReader.readAsDataURL(oFiles);
        },

        onFileSizeExceeds: function () {
            sap.m.MessageToast.show(
                "This file is more than 2 MB and cannot be uploaded"
            );
        },

        onTokenDelete: function () {
            this.getView().getModel("UploadModel").setData({
                Photo1: "",
                Photo1Type: "",
                Photo1Name: ""
            });
            this.getView().getModel("tokenModel").setData({
                tokens: []
            });
        },

        onTokenImageDelete: function () {
            this.getView().getModel("imageModel").setData({
                Attachment: "",
                AttachmentType: "",
                AttachmentName: ""
            });
            this.getView().getModel("tokenImageModel").setData({
                imageTokens: []
            });
        },

        HF_viewroom: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("mainModel");
            var oData = oContext.getObject();

            if (!oData.Photo1 || !oData.Photo1.length) {
                sap.m.MessageToast.show(this.i18nModel.getText("noDocumentFoundforthisbranch"));
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
                    press: function () {
                        oDialog.close();
                    }
                }).addStyleClass("myUnifiedBtn"),
                afterClose: function () {
                    oDialog.destroy();
                }
            }).addStyleClass("barheader");

            oDialog.addStyleClass("ImageDialogNoPadding");
            oDialog.open();
        },

        MC_ValidateGstNumber: function (oEvent) {
            const oInput = oEvent ? oEvent.getSource() : sap.ui.getCore().byId(this.getView().createId("MC_id_CustomGst"));
            const sValue = oInput.getValue().trim();
            const dataModel = this.getView().getModel("MDmodel");
            const visiModel = this.getView().getModel("visiblePlay");
            const taxInput = this.byId("CC_id_custValue");

            if (!visiModel.getProperty("/isIndia")) {
                oInput.setValueState("None");
                visiModel.setProperty("/CC_id_CustInput", false);
                return true;
            }

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
            oInput.setValueStateText("");
            visiModel.setProperty("/CC_id_CustInput", true);

            const stateCode = sValue.substring(0, 2);
            const currentTaxValue = dataModel.getProperty("/Value");
            const taxInputValue = taxInput ? taxInput.getValue() : "";

            // Determine GST type based on state code
            if (stateCode === "29") {
                visiModel.setProperty("/selectedIndex", 0); // CGST
                dataModel.setProperty("/Type", "CGST/SGST");
            } else {
                visiModel.setProperty("/selectedIndex", 1); // IGST
                dataModel.setProperty("/Type", "IGST");
            }

            // Only set default value if no value exists yet AND user hasn't typed anything
            if (!currentTaxValue && (!taxInputValue || taxInputValue === "")) {
                if (stateCode === "29") {
                    dataModel.setProperty("/Value", "9");
                } else {
                    dataModel.setProperty("/Value", "18");
                }
            }
            // If user has typed something in tax field, keep their input
            else if (taxInputValue && taxInputValue !== currentTaxValue) {
                dataModel.setProperty("/Value", taxInputValue);
            }

            return true;
        },
        onTaxPercentageChange: function (oEvent) {
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

        onRadioButtonChange: function (oEvent) {
            const oButtonGroup = oEvent.getSource();
            const selectedIndex = oButtonGroup.getSelectedIndex();
            const dataModel = this.getView().getModel("MDmodel");
            const visiModel = this.getView().getModel("visiblePlay");

            visiModel.setProperty("/selectedIndex", selectedIndex);
            // Update the Type in model based on selection
            if (selectedIndex === 0) {
                dataModel.setProperty("/Type", "CGST/SGST");
            } else if (selectedIndex === 1) {
                dataModel.setProperty("/Type", "IGST");
            }
        },
    })
});