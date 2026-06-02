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

        _onRouteMatched: async function (oEvent) {
            try {
                this.getBusyDialog();
                var LoginFUnction = await this.commonLoginFunction("ManageVendor");
                if (!LoginFUnction) return;
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this._initEmptyMDModel();
                var sPath= oEvent.getParameter("arguments").sPath
                this.sPath= oEvent.getParameter("arguments").sPath
                if(sPath==="TilePage"){
                   this.onClearAndSearch("MV_id_FilterbarEmployee");
                }
                await this._loadBranchCode();
                
                await this.Onsearch("true");
                
            } catch (err) {
                this.closeBusyDialog()
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                 
                this.closeBusyDialog()
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
            // this.getBusyDialog()
            try {
                const oResponse = await this.ajaxReadWithJQuery("HM_BranchData", filters);
                const aBranches = Array.isArray(oResponse?.data) ? oResponse.data : (oResponse?.data ? [oResponse.data] : []);
                const oBranchModel = new sap.ui.model.json.JSONModel(aBranches);
                this.getView().setModel(oBranchModel, "BranchModel");
            } catch (err) {
                this.closeBusyDialog()
                sap.m.MessageToast.show(err.message || err.responseText);
            }
        },

        Onsearch: function (flag) {
            var oView = this.getView();
            // Read FilterBar inputs
            var sUserID = oView.byId("MV_id_UserID").getSelectedKey() ||
                oView.byId("MV_id_UserID").getValue();

            var sCity = oView.byId("MD_id_City").getSelectedKey() ||
                oView.byId("MD_id_City").getValue();

            var sStatus = oView.byId("MV_id_Status").getSelectedKey() ||
                oView.byId("MV_id_Status").getValue();

            // Build Filters for backend
            let filters = {};
            // Always apply Vendor type
            filters.Type = "Vendor";
            // Apply UserID filter
            if (sUserID) {
                filters.UserID = sUserID;
            }
            // Apply City filter
            if (sCity) {
                filters.City = sCity;
            }
            // Apply Status Filter
            if (sStatus) {
                filters.Status = sStatus;
            }
            if(flag === true) this.getBusyDialog()
            return this.ajaxReadWithJQuery("HM_StaffContact", filters).then((oData) => {

                const response = Array.isArray(oData.data) ? oData.data : [oData.data];
                const aStatusOrder = ["New", "Resubmitted", "Send Back", "Approved", "Active"];

                response.forEach(item => {
                    const index = aStatusOrder.indexOf(item.Status);
                    item._StatusPriority = index === -1 ? 999 : index;
                });
                if ((!this._originalStaffData || flag === "true") && this.sPath==="TilePage") {
                    this._originalStaffData = response;
                }
                let finalData;
                if (Object.keys(filters).length === 1 && filters.Type === "Vendor") {
                    finalData = response;
                } else {
                    finalData = response;
                }
                const model = new sap.ui.model.json.JSONModel(response);
                var oTable = this.byId("MV_id_ManageVendor");
                oTable.attachEventOnce("updateFinished", function () {
                    this._applyStatusGrouping();
                }.bind(this));
                this.getView().setModel(model, "mainModel");
                this._populateUniqueFilterValues(this._originalStaffData);
            }).catch((err) => {
                this.closeBusyDialog()
                sap.m.MessageToast.show(err.message || err.responseText);
            }).finally(() => {
                this.closeBusyDialog()
            });
        },

        _applyStatusGrouping: function () {
            var oTable = this.byId("MV_id_ManageVendor");
            var oBinding = oTable.getBinding("items");

            if (!oBinding) return;

            var oSorter = new sap.ui.model.Sorter("_StatusPriority", false, function (oContext) {
                return {
                    key: oContext.getProperty("Status"),
                    text: oContext.getProperty("Status")
                };
            });
            oBinding.sort(oSorter);
        },

        _populateUniqueFilterValues: function(data) {
            let oView = this.getView();

            // ===== UserID Combo =====
            let oUserCombo = oView.byId("MV_id_UserID");

            if (oUserCombo) {
                oUserCombo.destroyItems();

                // Remove duplicate UserIDs
                let uniqueUsers = {};
                data.forEach(item => {
                    if (item.UserID && !uniqueUsers[item.UserID]) {
                        uniqueUsers[item.UserID] = item;
                    }
                });

                Object.values(uniqueUsers)
                    .sort((a, b) => a.UserID.localeCompare(b.UserID))
                    .forEach(item => {
                        oUserCombo.addItem(new sap.ui.core.ListItem({
                            key: item.UserID,
                            text: item.UserID,
                            additionalText: item.UserName
                        }));
                    });
            }

            // ===== City Combo =====
            let oCityCombo = oView.byId("MD_id_City");

            if (oCityCombo) {
                oCityCombo.destroyItems();

                let uniqueCities = [...new Set(
                    data
                    .map(item => item.City)
                    .filter(Boolean)
                )];

                uniqueCities
                    .sort()
                    .forEach(city => {
                        oCityCombo.addItem(new sap.ui.core.Item({
                            key: city,
                            text: city
                        }));
                    });
            }

            // // ===== Status Combo =====
            // let oStatusCombo = oView.byId("MV_id_Status");

            // if (oStatusCombo) {
            //     oStatusCombo.destroyItems();

            //     let uniqueCities = [...new Set(
            //         data
            //         .map(item => item.Status)
            //         .filter(Boolean)
            //     )];

            //     uniqueCities
            //         .sort()
            //         .forEach(Status => {
            //             oStatusCombo.addItem(new sap.ui.core.Item({
            //                 key: Status,
            //                 text: Status
            //             }));
            //         });
            // }
        },
         getGroupHeader: function (oGroup) {
                    return this.getStyledGroupHeader(oGroup);
                },

        FC_onPressClear: function () {
            this.getView().byId("MV_id_UserID").setSelectedKey("");
            // this.getView().byId("MV_id_UserName").setSelectedKey("")
            this.getView().byId("MV_id_Status").setSelectedKey("")
            this.getView().byId("MD_id_City").setSelectedKey("")
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },

        onHome: function () {
            this.CommonLogoutFunction();
        },

        HM_OnPressManageStaffItem: function (oEvent) {
            var oSelectedItem = oEvent.getSource();
            var oContext = oSelectedItem.getBindingContext("mainModel");
            var sUserID = oContext.getProperty("UserID");
            this.getOwnerComponent().getRouter().navTo("RouteManageVendorDetail", { UserID: sUserID });
        },

        MS_onDownload: function () {
            const oModel = this.byId("MV_id_ManageVendor").getModel("mainModel").getData();
            if (!oModel || oModel.length === 0) {
                MessageToast.show(this.i18nModel.getText("MSnodata"));
                return;
            }
            const adjustedData = oModel.map(item => ({
                ...item,
                MobileNo: item.MobileNo ? String(item.MobileNo) : "",
                UserName: item.Salutation + " " + item.UserName,
                MobileNo: item.STDCode + " " + item.MobileNo
            }));
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level",
                    context: {
                        sheetName: "Manage Vendor Details"
                    }
                },
                dataSource: adjustedData,
                fileName: "Manage_Vendor.xlsx",
                worker: false
            };
            const oSheet = new sap.ui.export.Spreadsheet(oSettings);

            oSheet.build().then(() => {
                MessageToast.show(this.i18nModel.getText("MSdownloadedsuccess"));
            }).finally(() => {
                oSheet.destroy();
            });
        },

        createTableSheet: function () {
            return [{
                label: "Status",
                property: "Status",
                type: "string"
            },
            {
                label: "User ID",
                property: "UserID",
                type: "string"
            },
            {
                label: "Vendor Name",
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