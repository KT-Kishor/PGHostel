sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
    "sap/m/MessageToast",
    "../model/formatter",
    "sap/ui/export/Spreadsheet",
], function(BaseController, JSONModel, utils, MessageToast, Formatter, Spreadsheet) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Damage", {
        Formatter: Formatter,
        onInit: function() {
            this.getOwnerComponent().getRouter().getRoute("RouteDamage").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function() {
            sap.ui.core.BusyIndicator.show(0);
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.commonLoginFunction();
            var model = new JSONModel({
                CustomerID: "",
                CustomerName: "",
                RoomNo: "",
                BedTypeName: "",
                BranchCode: "",
                ItemName: "",
                Description: "",
                Cost: "",
                Date: "",
                Status: "",
                DamageID: ""
            });
            this.getView().setModel(model, "DamageModel");
            this._makeDatePickersReadOnly(["HD_id_DamageDate"]);
            this.onClearAndSearch("HD_id_FilterbarEmployee");
            var loginModel = this.getOwnerComponent().getModel("LoginModel");
            this.BranchCode = loginModel.getProperty("/BranchCode");
            await this._loadBranchCode()
            await this.Onsearch()
            this.readCustomerData();
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
            } else if (oExistingModel.Role === "SuperAdmin" ) {
                    filters.BranchID = "";
            } else{
                filters.BranchID = oExistingModel.BranchCode;
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
        
        readCustomerData: function() {
            return new Promise((resolve, reject) => {
                sap.ui.core.BusyIndicator.show(0);

                var filter = {BranchCode: this.BranchCode};

                this.ajaxReadWithJQuery("HM_BookingCustomerReadCall", filter).then((oData) => {
                        var aData = Array.isArray(oData.commentData) ?
                            oData.commentData : [oData.commentData];

                        const aFilteredData = aData.filter(item =>
                            item.Status === "Assigned" || item.Status === "Completed"
                        );

                        this.getView().setModel(
                            new sap.ui.model.json.JSONModel(aFilteredData),
                            "CustomerModel"
                        );

                        resolve();
                    }).catch((err) => {
                        MessageToast.show(err.responseText || "Failed to Load Customer Data.");
                        sap.ui.core.BusyIndicator.hide();
                    })
            });
        },

        onChangeAddCustomer: function(oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
            this.SelectKey = oEvent.getSource().getSelectedKey();
            const allData = this.getView().getModel("CustomerModel").getData();

            const SelectedData = allData.find(item => item.CustomerID === this.SelectKey);
            if (!SelectedData) return;

            var oDamageModel = this.getView().getModel("DamageModel");
            oDamageModel.setProperty("/CustomerID", SelectedData.CustomerID);
            oDamageModel.setProperty("/CustomerName", SelectedData.CustomerName);
            oDamageModel.setProperty("/RoomNo", SelectedData.RoomNo);
            oDamageModel.setProperty("/BedTypeName", SelectedData.BedType);
            oDamageModel.setProperty("/BranchCode", SelectedData.BranchCode);
        },

        HM_AddRoom: function(oEvent) {
            var oView = this.getView();
            this.byId("HD_id_ARD_Table").removeSelections();

            // Load dialog fragment (only once)
            if (!this.AR_Dialog) {
                this.AR_Dialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "sap.ui.com.project1.fragment.Damage",
                    this
                );
                oView.addDependent(this.AR_Dialog);
            }

            // Reset RoomModel fields
            var oDamageModel = oView.getModel("DamageModel");
            if (oDamageModel) {
                oDamageModel.setData({
                    CustomerID: "",
                    CustomerName: "",
                    RoomNo: "",
                    BedTypeName: "",
                    BranchCode: "",
                    ItemName: "",
                    Description: "",
                    Cost: "",
                    Date: "",
                    Status: "",
                    DamageID: "",
                    CustomerIDEditable: true
                });
            }

            // Reset ValueState for inputs
            var aInputIds = [
                "HD_id_ItemName",
                "HD_id_Description",
                "HD_id_Cost",
                "HD_id_DamageDate",
                "HD_id_Status"
            ];

            aInputIds.forEach(function(sId) {
                var oInput = oView.byId(sId);
                if (oInput && oInput.setValueState) {
                    oInput.setValueState("None");
                }
            });

            // --- Open Dialog ---
            this.AR_Dialog.open();
        },

        HM_EditRoom: function(oEvent) {
            var oView = this.getView();
            var oTable = this.byId("HD_id_ARD_Table");
            var oSelected = oTable.getSelectedItems();

            if (!oSelected || oSelected.length === 0) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectRecorddamageRoom"));
                return;
            }
            if (oSelected.length > 1) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseselectonlyonerowtoedit"));
                return;
            }

            var oContext = oSelected[0].getBindingContext("Damage");
            var oData = oContext.getObject();
            oData.Date = this.Formatter.formatDate(oData.Date); // Format date for input field
            oData.CustomerIDEditable = false;

            // Create dialog if not already initialized
            if (!this.AR_Dialog) {
                this.AR_Dialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "sap.ui.com.project1.fragment.Damage",
                    this
                );
                oView.addDependent(this.AR_Dialog);
            }

            // Prepare DamageModel with selected data
            var oDamageModel = oView.getModel("DamageModel");
            oDamageModel.setData({
                ...oData,
            });

            // Reset input ValueState
            var aInputIds = [
                "HD_id_ItemName",
                "HD_id_Description",
                "HD_id_Cost",
                "HD_id_DamageDate",
                "HD_id_Status"
            ];
            aInputIds.forEach(function(sId) {
                var oInput = oView.byId(sId);
                if (oInput && oInput.setValueState) {
                    oInput.setValueState("None");
                }
            });

            // --- Open Dialog ---
            this.AR_Dialog.open();
        },

        HD_onCancelButtonPress: function() {
            this.AR_Dialog.close();
            var table = this.byId("HD_id_ARD_Table");
            table.removeSelections(true);
        },

        HD_onsavebuttonpress: async function() {
            const oView = this.getView();
            var oDamageModel = oView.getModel("DamageModel");
            var Payload = oDamageModel.getData();

            // Mandatory Validation
            var isMandatoryValid = (
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("HD_id_CustomerID")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("HD_id_ItemName")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("HD_id_Description")), "ID") &&
                utils._LCvalidateAmount(sap.ui.getCore().byId(oView.createId("HD_id_Cost")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("HD_id_DamageDate")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("HD_id_Status")), "ID")
            );

            if (!isMandatoryValid) {
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            // Build DATA Object
            var oData = {
                CustomerID: Payload.CustomerID,
                CustomerName: Payload.CustomerName,
                RoomNo: Payload.RoomNo,
                BedTypeName: Payload.BedTypeName,
                BranchCode: Payload.BranchCode,
                ItemName: Payload.ItemName,
                Description: Payload.Description,
                Cost: Payload.Cost,
                Date: Payload.Date ? Payload.Date.split("/").reverse().join("-") : "",
                Status: Payload.Status
            };

            delete Payload.CustomerIDEditable; 
            try {
                sap.ui.core.BusyIndicator.show(0);

                // ================= UPDATE =================
                if (Payload.DamageID) {
                    var oPayload = {
                        data: oData,
                        filters: {
                            DamageID: Payload.DamageID
                        }
                    };

                    await this.ajaxUpdateWithJQuery("HM_Damage", oPayload);
                    MessageToast.show("Damage details updated successfully");

                }
                // ================= CREATE =================
                else {
                    var oPayload = {
                        data: oData
                    };

                    await this.ajaxCreateWithJQuery("HM_Damage", oPayload);
                    MessageToast.show("Damage details added successfully");
                }

                await this.Onsearch("true");
                this.AR_Dialog.close();
            } catch (err) {
                MessageToast.show(err.responseText || "Failed to save damage.");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        onLiveChangeItemName: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onLiveChangeDescription: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onLiveChangeCost: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateAmount(oEvent.getSource(), "ID");
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onChangeDamageDate: function(oEvent) {
            utils._LCvalidateDate(oEvent);
        },

        onChangeStatus: function(oEvent) {
            utils._LCstrictValidationComboBox(oEvent);
        },

        HM_DeleteRoom: async function() {
            var oTable = this.byId("HD_id_ARD_Table");
            var aSelectedItems = oTable.getSelectedItems();

            if (!aSelectedItems.length) {
                return MessageToast.show(this.i18nModel.getText("pleaseSelectatLeastOneRecordtoDelete"));
            }

            var that = this;

            // Show Item Names in popup instead of DamageName
            var sNames = aSelectedItems.map(item => {
                var oData = item.getBindingContext("Damage").getObject();
                return oData.ItemName || oData.CustomerName || oData.DamageID;
            }).join(", ");

            sap.m.MessageBox.confirm(
                `Are you sure you want to delete the selected damages: ${sNames}?`, {
                    icon: sap.m.MessageBox.Icon.WARNING,
                    title: "Confirm Deletion",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    emphasizedAction: sap.m.MessageBox.Action.NO,

                    onClose: async function(sAction) {
                        if (sAction !== sap.m.MessageBox.Action.YES) {
                            oTable.removeSelections(true);
                            return;
                        }

                        try {
                            sap.ui.core.BusyIndicator.show(0);
                            const aDeletePromises = aSelectedItems.map(item => {
                                var oData = item.getBindingContext("Damage").getObject();

                                if (!oData.DamageID) return Promise.resolve(); // safety

                                return that.ajaxDeleteWithJQuery("HM_Damage", {
                                    filters: {
                                        DamageID: oData.DamageID
                                    }
                                });
                            });

                            await Promise.all(aDeletePromises);

                            MessageToast.show(that.i18nModel.getText("damagesdeletedsuccessfully"));
                            that.Onsearch("true");
                        } catch (err) {
                            console.error(err);
                            MessageToast.show(err.message || err.responseText || "Delete failed");
                        } finally {
                            sap.ui.core.BusyIndicator.hide();
                            oTable.removeSelections(true);
                        }
                    }
                }
            );
        },

        Onsearch: function(flag) {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];
            var oView = this.getView();

            var sRoomNo = oView.byId("HD_id_CustomerName").getSelectedKey() || oView.byId("HD_id_CustomerName").getValue();
            var sbedtype = oView.byId("HD_id_BedType").getSelectedKey() || oView.byId("HD_id_BedType").getValue();

            let aBranchCodes = [];

            if (Array.isArray(omainModel) && omainModel.length) {
                aBranchCodes = omainModel.map(item => item.BranchID).flat().filter(Boolean).join(",");
            } else if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode.split(",").map(code => code.trim());
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
                filters.BranchCode = oExistingModel.BranchCode;
            }

            if (sRoomNo) {
                filters.RoomNo = sRoomNo
            }

            if (sbedtype) {
                filters.BedTypeName = sbedtype
            }

            sap.ui.core.BusyIndicator.show(0);
            this.ajaxReadWithJQuery("HM_Damage", filters).then((oData) => {
                const roomData = Array.isArray(oData.commentData) ? oData.commentData : [];
                const branchData = this.getView().getModel("BranchModel")?.getData() || [];

                // Map BranchCode → BranchName
                const mappedData = roomData.map(bed => {
                    const branch = branchData.find(br => br.BranchID === bed.BranchCode);
                    return {
                        ...bed,
                        BranchName: branch ? branch.Name : bed.BranchCode // fallback
                    };
                });

                if (!this._originalRoomdata || flag === "true") {
                    this._originalRoomdata = mappedData;
                }
                var model = new JSONModel(mappedData);
                this.getView().setModel(model, "Damage");
                this._populateUniqueFilterValues(this._originalRoomdata);
                sap.ui.core.BusyIndicator.hide();
            })
        },

        _populateUniqueFilterValues: function(data) {
            let uniqueValues = {
                HD_id_CustomerName: new Set(),
                HD_id_BedType: new Set(),
            };

            data.forEach(item => {
                uniqueValues.HD_id_CustomerName.add(item.RoomNo);
                uniqueValues.HD_id_BedType.add(item.BedTypeName);
            });

            let oView = this.getView();
            ["HD_id_CustomerName", "HD_id_BedType"].forEach(field => {
                let oComboBox = oView.byId(field);
                oComboBox.destroyItems();
                Array.from(uniqueValues[field]).sort().forEach(value => {
                    oComboBox.addItem(new sap.ui.core.Item({
                        key: value,
                        text: value
                    }));
                });
            });
        },

        HD_onPressClear: function() {
            this.getView().byId("HD_id_CustomerName").setSelectedKey("")
            this.getView().byId("HD_id_BedType").setSelectedKey("")
        },

        RD_onDownload: function() {
            var aData = this.getView().getModel("Damage").getData();

            if (!aData || aData.length === 0) {
                MessageToast.show(this.i18nModel.getText("nodataavailablefordownload"));
                return;
            }

            var aAdjustedData = aData.map(item => ({
                ...item,
                Cost: item.Cost ? String(item.Cost) : "",
                Date: item.Date ? this.Formatter.formatDate(item.Date) : ""
            }));

            var aColumns = this.createDamageExcelColumns();
            var oSettings = {
                workbook: {
                    columns: aColumns
                },
                dataSource: aAdjustedData,
                fileName: "Damage_Report.xlsx",
                worker: false
            };
            MessageToast.show("Downloading Damage Report...");
            var oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function() {
                oSheet.destroy();
            });
        },

        createDamageExcelColumns: function () {
            return [
                { label: "Customer ID", property: "CustomerID", type: "string" },
                { label: "Customer Name", property: "CustomerName", type: "string" },
                { label: "Room No", property: "RoomNo", type: "string" },
                { label: "Bed Type", property: "BedTypeName", type: "string" },
                { label: "Item Name", property: "ItemName", type: "string" },
                { label: "Description", property: "Description", type: "string" },
                { label: "Cost", property: "Cost", type: "string" },
                { label: "Date", property: "Date", type: "String"},
                { label: "Status", property: "Status", type: "string" }
            ];
        },

        onHome: function() {
            this.CommonLogoutFunction();
            this.getView().getModel("Damage").setData({});
        },

        onNavBack: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
            this.getView().getModel("Damage").setData({});
        },
    });
});