sap.ui.define([
    "./BaseController",
    "../model/formatter",
     "sap/ui/export/Spreadsheet",
     "sap/m/MessageToast",
], function (BaseController, Formatter, Spreadsheet, MessageToast) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.ManageVendor", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteManageVendor").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
            try {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this._initEmptyMDModel();
                this.onClearAndSearch("MV_id_FilterbarEmployee");
                this.commonLoginFunction();
                await this._loadBranchCode();
                await this.Onsearch("true");
            } catch (err) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        _initEmptyMDModel: function () {
            const emptyData = {
                Salutation: "",
                UserName: "",
                Role: "",
                Email: "",
                MobileNo: "",
                password: "",
                comfirmpass: "",
                STDCode: "",
                Address: "",
                Country: "",
                State: "",
                City: "",
                Gender: "",
                DateOfBirth: ""
            };
            const oModel = new sap.ui.model.json.JSONModel(emptyData);
            this.getView().setModel(oModel, "MDmodel");
        },

        _loadBranchCode: async function () {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            let aBranchCodes = [];

            if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode.split(",").map(code => code.trim());
            }

            let filters = {};
            if (oExistingModel.Role !== "") {
                filters = {
                    BranchID: aBranchCodes
                };
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

        Onsearch: function (flag) {
            var oView = this.getView();

            // Read FilterBar inputs
            var sUserID = oView.byId("MV_id_UserID").getSelectedKey() ||
                oView.byId("MV_id_UserID").getValue();

            var sUserName = oView.byId("MV_id_UserName").getSelectedKey() ||
                oView.byId("MV_id_UserName").getValue();

            // Build Filters for backend
            let filters = {};

            // Always apply Vendor type
            filters.Type = "Vendor";

            // Apply UserID filter
            if (sUserID) {
                filters.UserID = sUserID;
            }

            // Apply UserName filter
            if (sUserName) {
                filters.UserName = sUserName;
            }

            sap.ui.core.BusyIndicator.show(0);
            return this.ajaxReadWithJQuery("HM_StaffContact", filters).then((oData) => {
                const response = Array.isArray(oData.data) ? oData.data : [oData.data];

                if (!this._originalStaffData || flag === "true") {
                    this._originalStaffData = response;
                }

                let finalData;
                if (Object.keys(filters).length === 1 && filters.Type === "Vendor") {
                    finalData = this._originalStaffData;
                } else {
                    finalData = response;
                }

                const model = new sap.ui.model.json.JSONModel(finalData);
                this.getView().setModel(model, "mainModel");

                this._populateUniqueFilterValues(this._originalStaffData);
            }).catch((err) => {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.message || err.responseText);
            }).finally(() => {
                sap.ui.core.BusyIndicator.hide();
            });
        },

        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                MV_id_UserID: new Set(),
                MV_id_UserName: new Set()
            };

            data.forEach(item => {
                if (item.UserID) uniqueValues.MV_id_UserID.add(item.UserID);
                if (item.UserName) uniqueValues.MV_id_UserName.add(item.UserName);
            });

            let oView = this.getView();

            ["MV_id_UserID", "MV_id_UserName"].forEach(field => {
                let oComboBox = oView.byId(field);
                if (!oComboBox) return;

                oComboBox.destroyItems();

                Array.from(uniqueValues[field]).sort().forEach(value => {
                    oComboBox.addItem(new sap.ui.core.Item({
                        key: value,
                        text: value
                    }));
                });
            });
        },

        FC_onPressClear: function () {
            this.getView().byId("MV_id_UserID").setSelectedKey("");
            this.getView().byId("MV_id_UserName").setSelectedKey("")
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },

        onHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },

        HM_OnPressManageStaffItem: function (oEvent) {
            var oSelectedItem = oEvent.getSource();
            var oContext = oSelectedItem.getBindingContext("mainModel");
            var sUserID = oContext.getProperty("UserID");
            this.getOwnerComponent().getRouter().navTo("RouteManageVendorDetail", { UserID: sUserID });
        },

         MS_onDownload:function() {
             const oModel = this.byId("MV_id_ManageVendor").getModel("mainModel").getData();
            if (!oModel || oModel.length === 0) {
                MessageToast.show(this.i18nModel.getText("MSnodata"));
                return;
            }
            const adjustedData = oModel.map(item => ({
                ...item,
                MobileNo: item.MobileNo ? String(item.MobileNo) : ""
            }));
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level"
                },
                dataSource: adjustedData,
                fileName: "Manage_Vendor.xlsx",
                worker: false
            };
            MessageToast.show(this.i18nModel.getText("MSdownloading"));
            const oSheet = new sap.ui.export.Spreadsheet(oSettings);

            oSheet.build().then(() => {
                MessageToast.show(this.i18nModel.getText("MSdownloadedsuccess"));
            }).finally(() => {
                oSheet.destroy();
            });
        },

        createTableSheet: function () {
            return [{
                label: "User ID",
                property: "UserID",
                type: "string"
            },
            {
                label: "Salutation",
                property: "Salutation",
                type: "string"
            },
            {
                label: "Staff Name",
                property: "UserName",
                type: "string"
            },
            {
                label: "Role",
                property: "Role",
                type: "string"
            },
            {
                label: "Email ID",
                property: "EmailID",
                type: "string"
            },
            {
                label: "Gender",
                property: "Gender",
                type: "string"
            },
            {
                label: "STD Code",
                property: "STDCode",
                type: "string"
            },
            {
                label: "Mobile Number",
                property: "MobileNo",
                type: "string"
            },
            {
                label: "Address",
                property: "Address",
                type: "string"
            }
            ]
        },
    });
});