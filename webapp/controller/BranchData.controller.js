sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast",
    "../utils/validation"
], function (BaseController, MessageBox, Spreadsheet, MessageToast, utils) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Branch", {
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteBranchData").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
            try {
                sap.ui.core.BusyIndicator.show(0);
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

                const oMDmodel = new sap.ui.model.json.JSONModel({
                    BranchID: "",
                    Name: "",
                    Address: "",
                    Pincode: "",
                    Contact: "",
                    stdCode: "",
                    country: "",
                    state: "",
                    City: "",
                    Penalty: "",
                });
                this.getView().setModel(oMDmodel, "MDmodel");

                var oeditable = new sap.ui.model.json.JSONModel({
                    isEdit: false
                });
                this.getView().setModel(oeditable, "editableModel");
                this.getView().setModel(new sap.ui.model.json.JSONModel({
                    Photo1: "",
                    Photo1Type: "",
                    Photo1Name: ""
                }), "UploadModel");

                // Token model
                this.getView().setModel(new sap.ui.model.json.JSONModel({
                    tokens: []
                }), "tokenModel");
                await this.onClearAndSearch("MD_id_Filterbar");
                await this.Onsearch();
                this.commonLoginFunction();
            } catch (err) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.message || err.responseText);
            }
        },

        Onsearch:async function () {
            const oLoginmodel = this.getOwnerComponent().getModel("LoginModel").getData();

           var filter={
               UserID:oLoginmodel.EmployeeID
            }
 

            var LoginData=await this.ajaxReadWithJQuery("HM_CustomerContact", filter).then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                  return oFCIAerData
            })
            const oExistingModel =LoginData;
            const oView = this.getView();

            let filters = {};

            // if (oExistingModel.Role !== "") {
            //     filters.City = oExistingModel.City;
            // }
            if (oExistingModel.BranchCode) {
                filters.BranchID = oExistingModel.BranchCode;
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
            sap.ui.core.BusyIndicator.show(0);
            this.ajaxReadWithJQuery("HM_Branch", filters).then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new sap.ui.model.json.JSONModel(oFCIAerData);
                this.getOwnerComponent().setModel(model, "mainModel")
                sap.ui.core.BusyIndicator.hide();
            })
        },

        MD_onPressClear: function () {
            this.getView().byId("MD_id_BranchCode").setSelectedKey("")
            this.getView().byId("MD_id_SearchField").setValue("");
        },

        MD_onSearch: async function () {
            sap.ui.core.BusyIndicator.show(0);
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
            sap.ui.core.BusyIndicator.hide();
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
                MessageToast.show("No data available to download.");
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
            MessageToast.show("Downloading Branch Details");
            const oSheet = new sap.ui.export.Spreadsheet(oSettings);

            oSheet.build().then(() => {
                MessageToast.show("Download complete!");
            }).finally(() => {
                oSheet.destroy();
            });
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
            // const oBranch = sap.ui.getCore().byId(oView.createId("BD_idBranch"));
            const oName = sap.ui.getCore().byId(oView.createId("BD_idBName"));
            const oAddress = sap.ui.getCore().byId(oView.createId("BD_idAddress"));
            const oPin = sap.ui.getCore().byId(oView.createId("BD_idPin"));
            const oCountry = sap.ui.getCore().byId(oView.createId("MC_id_Country"));
            const oState = sap.ui.getCore().byId(oView.createId("MC_id_State"));
            const oCity = sap.ui.getCore().byId(oView.createId("MC_id_City"));
            const oPhone = sap.ui.getCore().byId(oView.createId("BD_idPhone"));
            const oPenalty = sap.ui.getCore().byId(oView.createId("BD_idPenalty"));

            oCountry.getBinding("items").filter([]);
            const stateBinding = oState.getBinding("items");
            if (stateBinding) stateBinding.filter([]);

            const cityBinding = oCity.getBinding("items");
            if (cityBinding) cityBinding.filter([]);
            // oBranch.setSelectedKey("");
            oName.setSelectedKey("");
            oAddress.setSelectedKey("");
            oPin.setSelectedKey("");
            oPenalty.setValue("");
            oCountry.setSelectedKey("");
            oState.setSelectedKey("");
            oCity.setSelectedKey("");
            oPhone.setValue("");
            // oBranch.setValueState("None");
            // oBranch.setValueStateText("");
            oName.setValueState("None");
            oName.setValueStateText("");
            oAddress.setValueState("None");
            oAddress.setValueStateText("");
            oPin.setValueState("None");
            oPin.setValueStateText("");
            oCountry.setValueState("None");
            oCountry.setValueStateText("");
            oState.setValueState("None");
            oState.setValueStateText("");
            oCity.setValueState("None");
            oCity.setValueStateText("");
            oPhone.setValueState("None");
            oPhone.setValueStateText("");
            // oBranch.setValueStateText("Enter Branch Code");
            oName.setValueStateText("Enter Branch Name");
            oAddress.setValueStateText("Enter Address");
            oPin.setValueStateText("Enter Pincode");
            oCountry.setValueStateText("Select Country");
            oState.setValueStateText("Select State");
            oCity.setValueStateText("Select City");
            oPhone.setValueStateText("Enter Contact Number");
            this._resetFacilityValueStates();
            oView.getModel("MDmodel").setData({
                // BranchID: "",
                Name: "",
                Address: "",
                Pincode: "",
                Contact: "",
                stdCode: "",
                country: "",
                state: "",
                baseLocation: "",
                Penalty: ""
            });
            this.isEdit = false;
            this.oDialog.open();
        },

        MD_onSaveButtonPress: async function () {
            var oView = this.getView();
            const oUpload = oView.getModel("UploadModel").getData();
            var oFacilitiesModel = oView.getModel("MDmodel");
            var Payload = oFacilitiesModel.getData();
            var isMandatoryValid = (
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_idBName")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_idAddress")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_idPin")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("MC_id_Country")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("MC_id_State")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("MC_id_City")), "ID")) &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_idPhone")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_idPenalty")), "ID")

            if (!isMandatoryValid) {
                sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields"));
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
                MessageToast.show("Selected State does not belong to the chosen Country");
                sap.ui.getCore().byId(oView.createId("MC_id_State")).setValueState("Error");
                return;
            }
            let validCity = aCities.some(c =>
                c.cityName === Payload.baseLocation &&
                c.stateName === Payload.state &&
                c.countryCode === aCountries.find(c => c.countryName === Payload.country)?.code
            );

            if (!validCity) {
                MessageToast.show("Selected City does not belong to selected State & Country");
                sap.ui.getCore().byId(oView.createId("MC_id_City")).setValueState("Error");
                return;
            }

            var oData = {
                Name: Payload.Name,
                UserID: this.getOwnerComponent().getModel("LoginModel").getData().EmployeeID,
                Address: Payload.Address,
                Pincode: Payload.Pincode,
                Contact: Payload.Contact,
                STD: Payload.stdCode,
                Country: Payload.country,
                State: Payload.state,
                City: Payload.baseLocation,
                Penalty: Payload.Penalty,
                Photo1: oUpload.Photo1,
                Photo1Type: oUpload.Photo1Type,
                Photo1Name: oUpload.Photo1Name
            };
            sap.ui.core.BusyIndicator.show(0);
            try {
                const aMainData = oView.getModel("mainModel").getData() || [];
                // if (!this.isEdit) {
                //     const isDuplicate = aMainData.some(item =>
                //         item.BranchID === oData.BranchID
                //     );

                //     if (isDuplicate) {
                //         sap.ui.core.BusyIndicator.hide();
                //         sap.m.MessageBox.error(
                //             "A branch with the same Branch ID already exists. Please use unique values."
                //         );
                //         return;
                //     }
                // }
                if (this.isEdit && Payload.BranchID) {
                    delete oData.UserID;
                    await this.ajaxUpdateWithJQuery("HM_Branch", {
                        data: oData,
                        filters: {
                            BranchID: Payload.BranchID
                            // UserID: oData.UserID
                        }
                    });
                    sap.m.MessageToast.show("Branch updated successfully!");
                } else {
                    await this.ajaxCreateWithJQuery("HM_Branch", {
                        data: oData,
                        filters: {
                            UserID: oData.UserID
                        }
                    });
                    sap.m.MessageToast.show("Branch added successfully!");
                }

                await this.Onsearch();
                this.oDialog.close();
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
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
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

        _resetFacilityValueStates: function () {
            var oView = this.getView();
            var aFields = [
                "idBranch", "idBName", "idAddress",
                "idPin", "idPhone", "idPenalty"
            ];

            aFields.forEach(function (sId) {
                var oField = sap.ui.getCore().byId(oView.createId(sId));
                if (oField && oField.setValueState) {
                    oField.setValueState("None");
                }
            });
        },

        onPhoneInputLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var value = oInput.getValue();

            // Allow only numbers
            value = value.replace(/\D/g, "");
            oInput.setValue(value);

            // Block more than 10 digits
            if (value.length > 10) {
                oInput.setValue(value.substring(0, 10));
                return;
            }

            // If empty → no error
            if (value === "") {
                oInput.setValueState("None");
                return;
            }

            // If less than 10 digits → error
            if (value.length < 10) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Phone number must be exactly 10 digits");
                return;
            }

            // If exactly 10 digits → valid
            if (value.length === 10) {
                oInput.setValueState("None");
            }
        },

        onPinInputLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidatePinCode(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onPenaltyInputLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateAmount(oEvent.getSource(), "ID");
            if (oInput.getValue() === "") oInput.setValueState("None");
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

        MD_DeleteRow: function () {
            var oTable = this.byId("id_MD_Table");
            var aSelectedItems = oTable.getSelectedItems();

            if (aSelectedItems.length === 0) {
                sap.m.MessageToast.show("Please select at least one record to delete.");
                return;
            }

            sap.m.MessageBox.confirm(
                `Are you sure you want to delete ${aSelectedItems.length} selected record(s)?`, {
                icon: sap.m.MessageBox.Icon.WARNING,
                title: "Confirm Deletion",
                actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                emphasizedAction: sap.m.MessageBox.Action.NO,

                onClose: async (sAction) => {
                    if (sAction === sap.m.MessageBox.Action.YES) {

                        sap.ui.core.BusyIndicator.show(0);

                        try {
                            // let oContext = oItem.getBindingContext("mainModel");
                            // let oData = oContext.getObject();
                            var sUserID = this.getOwnerComponent().getModel("LoginModel").getData().EmployeeID;
                            for (let oItem of aSelectedItems) {
                                const oContext = oItem.getBindingContext("mainModel");
                                const oData = oContext.getObject();
                                await this.ajaxDeleteWithJQuery("HM_Branch", {
                                    filters: {
                                        UserID: sUserID,
                                        BranchID: oData.BranchID
                                    }
                                });
                            }

                            sap.m.MessageToast.show("Selected records deleted successfully!");
                            await this.Onsearch();

                        } catch (err) {
                            console.error("Delete failed:", err);
                            sap.m.MessageBox.error("Error while deleting records. Please try again.");
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
            var oSelected = oTable.getSelectedItem();
            oView.getModel("editableModel").setProperty("/isEdit", true);
            if (!oSelected) {
                sap.m.MessageToast.show("Please select a record to edit.");
                return;
            }

            var oContext = oSelected.getBindingContext("mainModel");
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

            // Add existing file to tokens
            const aTokens = oData.Photo1Name ? [{
                key: oData.Photo1Name,
                text: oData.Photo1Name
            }] : [];

            this.getView().getModel("tokenModel").setData({
                tokens: aTokens
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
                Pincode: oData.Pincode,
                Contact: oData.Contact,
                stdCode: oData.STD,
                country: oData.Country,
                state: oData.State,
                baseLocation: oData.City,
                Penalty: oData.Penalty
            });
            this.isEdit = true;
            this._resetFacilityValueStates();
            this._applyCountryStateCityFilters();
            this.oDialog.open();
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
            const oView = this.getView();
            const oModel = oView.getModel("MDmodel");
            const oItem = oEvent.getSource().getSelectedItem();
            oEvent.getSource().setValueState("None");
            const oStateCB = sap.ui.getCore().byId(oView.createId("MC_id_State"));
            const oCityCB = sap.ui.getCore().byId(oView.createId("MC_id_City"));
            const oStd = sap.ui.getCore().byId(oView.createId("MC_id_codeModel"));

            oModel.setProperty("/state", "");
            oModel.setProperty("/baseLocation", "");
            oStateCB?.getBinding("items")?.filter([]);
            oCityCB?.getBinding("items")?.filter([]);
            oStd?.setValue("");

            if (!oItem) return;

            const sCountryName = oItem.getText();
            const sCountryCode = oItem.getAdditionalText();
            oModel.setProperty("/country", sCountryName);

            const aCountryData = this.getOwnerComponent().getModel("CountryModel").getData();
            const oCountryObj = aCountryData.find(c => c.countryName === sCountryName);
            oModel.setProperty("/stdCode", oCountryObj?.stdCode || "");
            oStd?.setValue(oCountryObj?.stdCode || "");

            oStateCB.getBinding("items")?.filter([
                new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
            ]);
        },

        MC_onChangeState: function (oEvent) {
            const oView = this.getView();
            const oModel = oView.getModel("MDmodel");
            const oItem = oEvent.getSource().getSelectedItem();
            oEvent.getSource().setValueState("None");
            const oCityCB = sap.ui.getCore().byId(oView.createId("MC_id_City"));
            const oCountryCB = sap.ui.getCore().byId(oView.createId("MC_id_Country"));

            oModel.setProperty("/baseLocation", "");
            oCityCB?.getBinding("items")?.filter([]);

            if (!oItem) {
                oModel.setProperty("/state", "");
                return;
            }

            const sStateName = oItem.getKey();
            const sCountryCode = oCountryCB.getSelectedItem()?.getAdditionalText();

            oModel.setProperty("/state", sStateName);

            oCityCB.getBinding("items")?.filter([
                new sap.ui.model.Filter("stateName", sap.ui.model.FilterOperator.EQ, sStateName),
                new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
            ]);
        },

        MC_onChangeCity: function (oEvent) {
            const oView = this.getView();
            const oModel = oView.getModel("MDmodel");
            const oItem = oEvent.getSource().getSelectedItem();
            oEvent.getSource().setValueState("None");
            if (!oItem) {
                oModel.setProperty("/city", "");
                return;
            }
            const sCityName = oItem.getKey();
            oModel.setProperty("/baseLocation", sCityName);
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
            if (!oFile) return;
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
            };
            oReader.readAsDataURL(oFile);
        },

        onTokenDelete: function (oEvent) {
            this.getView().getModel("UploadModel").setData({
                Photo1: "",
                Photo1Type: "",
                Photo1Name: ""
            });
            this.getView().getModel("tokenModel").setData({
                tokens: []
            });
        },

        HF_viewroom: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("mainModel");
            var oData = oContext.getObject();

            if (!oData.Photo1 || !oData.Photo1.length) {
                sap.m.MessageToast.show("No document found for this room!");
                return;
            }

            var sBase64 = oData.Photo1.replace(/\s/g, "");

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
            });

            var oDialog = new sap.m.Dialog({
                title: "Room Photo",
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
                }),
                afterClose: function () {
                    oDialog.destroy();
                }
            });

            oDialog.addStyleClass("ImageDialogNoPadding");
            oDialog.open();
        }
    })
});