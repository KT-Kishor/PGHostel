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
                Status: "Pending",
                DamageID: "",
                Currency: "",
                CustomerEmail: "",
                Type: "",
                UserID: "",
                DueAmount: ""
            });
            this.getView().setModel(model, "DamageModel");
            this._makeDatePickersReadOnly(["HD_id_DamageDate"]);
            this.onClearAndSearch("HD_id_FilterbarEmployee");
            var loginModel = this.getOwnerComponent().getModel("LoginModel");
            this.BranchCode = loginModel.getProperty("/BranchCode");
            await this._loadBranchCode()
            await this.Onsearch(true)
            this.readCustomerData();
        },
        HM_GenearteDamage:function(){
                   
             this.getOwnerComponent().getRouter().navTo("RouteDamageDetails",{sPath: "Damage"});
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
            } else if (oExistingModel.Role === "SuperAdmin") {
                filters.BranchID = "";
            } else {
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
                sap.ui.core.BusyIndicator.show(0);

                var filter = {
                    BranchCode: this.BranchCode
                };

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

                })
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
            oDamageModel.setProperty("/CustomerEmail", SelectedData.CustomerEmail);
            oDamageModel.setProperty("/Currency", SelectedData.Currency);
            oDamageModel.setProperty("/UserID", SelectedData.UserID)
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
                    Date: this.Formatter.formatDate(new Date()), // Set current date
                    Status: "Pending",
                    DamageID: "",
                    Currency: "",
                    CustomerEmail: "",
                    Type: "",
                    UserID: "",
                    CustomerIDEditable: true
                });
            }

            // Reset ValueState for inputs
            var aInputIds = [
                "HD_id_ItemName",
                "HD_id_Description",
                "HD_id_Cost",
                "HD_id_DamageDate",
                "HD_id_Type"
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

            if (oData.Status === "Recovered") {
                MessageToast.show("Damage has already been recovered");
                return;
            }

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
                "HD_id_Type"
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
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("HD_id_Type")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("HD_id_CustomerID")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("HD_id_ItemName")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("HD_id_Description")), "ID") &&
                utils._LCvalidateAmount(sap.ui.getCore().byId(oView.createId("HD_id_Cost")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("HD_id_DamageDate")), "ID")
            );

            if (!isMandatoryValid) {
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            // Build DATA Object
            var oData = {
                CustomerID: Payload.CustomerID,
                CustomerName: Payload.CustomerName,
                CustomerEmail: Payload.CustomerEmail,
                RoomNo: Payload.RoomNo,
                BedTypeName: Payload.BedTypeName,
                BranchCode: Payload.BranchCode,
                ItemName: Payload.ItemName,
                Description: Payload.Description,
                Cost: Payload.Cost,
                Date: Payload.Date ? Payload.Date.split("/").reverse().join("-") : "",
                Status: Payload.Status,
                Currency: Payload.Currency,
                Type : Payload.Type,
                UserID : Payload.UserID
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

        onchangeType: function(oEvent) {
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

            var sRCustomerName = oView.byId("Dm_id_CustomerName").getSelectedKey() || oView.byId("Dm_id_CustomerName").getValue();
            var sRoomNo = oView.byId("DM_id_RoomNo").getSelectedKey() || oView.byId("DM_id_RoomNo").getValue();
            var sStatus = oView.byId("DM_id_Status").getSelectedKey() || oView.byId("DM_id_Status").getValue();


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

            if (sRCustomerName) {
                filters.CustomerID = sRCustomerName
            }
            if (sStatus) {
                filters.Status = sStatus
            }


            sap.ui.core.BusyIndicator.show(0);
            this.ajaxReadWithJQuery("HM_Damage", filters).then((oData) => {
                const roomData = Array.isArray(oData.data) ? oData.data : [];
                const branchData = this.getView().getModel("BranchModel")?.getData() || [];

                // Map BranchCode → BranchName
                const mappedData = roomData.map(bed => {
                    const branch = branchData.find(br => br.BranchID === bed.BranchCode);   
                    return {
                        ...bed,
                        BranchName: branch ? branch.Name : bed.BranchCode // fallback
                    };
                });

                if (!this._originalRoomdata || flag ===true) {
                    var _originalRoomdata = JSON.parse(JSON.stringify(mappedData));
                }
                var model = new JSONModel(mappedData);
                this.getView().setModel(model, "Damage");
                this._populateUniqueFilterValues(_originalRoomdata);
                sap.ui.core.BusyIndicator.hide();
            })
        },
        DM_onPressEditDetails: function(oEvent) {
            var oSelected = oEvent.getSource().getBindingContext("Damage").getObject();
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDamageDetails",{
               sPath: encodeURIComponent(oSelected.DamageID)
            }); 
        },

        _populateUniqueFilterValues: function(data) {
            let uniqueValues = {
                Dm_id_CustomerName: new Set(),
                DM_id_RoomNo: new Set(),
                DM_id_Status: new Set(),

            };

            data.forEach(item => {
                uniqueValues.Dm_id_CustomerName.add(item.CustomerName);
                uniqueValues.DM_id_RoomNo.add(item.RoomNo);
                uniqueValues.DM_id_Status.add(item.Status);

            });

            let oView = this.getView();
            ["Dm_id_CustomerName", "DM_id_RoomNo", "DM_id_Status"].forEach(field => {
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
            this.getView().byId("Dm_id_CustomerName").setSelectedKey("")
            this.getView().byId("DM_id_RoomNo").setSelectedKey("")
            this.getView().byId("DM_id_Status").setSelectedKey("")
        },

        RD_onDownload: function() {
            var aData = this.getView().getModel("Damage").getData();

            if (!aData || aData.length === 0) {
                MessageToast.show(this.i18nModel.getText("nodataavailablefordownload"));
                return;
            }

            var aAdjustedData = aData.map(item => ({
                ...item,
                Cost: item.TotalCost ? String(item.TotalCost) : "",
                InvoiceDate: item.InvoiceDate ? this.Formatter.formatDate(item.InvoiceDate) : "",
                ReturnDamageDate: item.ReturnDamageDate ? this.Formatter.formatDate(item.ReturnDamageDate) : ""
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
                { label: "Cost", property: "TotalCost", type: "string" },
                { label: "Date", property: "InvoiceDate", type: "String"},
                { label: "Status", property: "Status", type: "string" },
                { label: "Return Damage Date", property: "ReturnDamageDate", type: "string" }

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

        HM_ReturnDamage: function() {
            const oView = this.getView();
            var oTable = this.byId("HD_id_ARD_Table");
            var oSelected = oTable.getSelectedItems();

            if (!oSelected || oSelected.length === 0) {
                MessageToast.show("Please select a record");
                return;
            }
            if (oSelected.length > 1) {
                MessageToast.show("Select only one row");
                return;
            }

            // Get selected row data
            var oContext = oSelected[0].getBindingContext("Damage");
            var oData = oContext.getObject();

            if (oData.Status === "Recovered") {
                MessageToast.show("Damage has already been recovered");
                return;
            }
           

            if (!this._oReturnDialog) {
                this._oReturnDialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "sap.ui.com.project1.fragment.DamageRecovery",
                    this
                );
                oView.addDependent(this._oReturnDialog);
            }

            // Prepare DamageModel with selected data
            var oDamageModel = oView.getModel("DamageModel");
            oDamageModel.setData({
                ...oData,
            });

              if (oData.Status === "Partially Recovered") {
                var dueAmount = parseFloat(oData.TotalCost) - parseFloat(oData.ReturnDamageAmount || 0);
                this.getView().getModel("DamageModel").setProperty("/DueAmount", dueAmount.toString());
                this.getView().getModel("DamageModel").setProperty("/ReturnDamageAmount", dueAmount.toString());

            }

            // Reset input ValueState
            var aInputIds = [
                "DT_id_ReturnAmount",
                "DT_id_ReturnMode",
                "DT_id_ReturnTransactionID"
            ];
            aInputIds.forEach(function(sId) {
                var oInput = oView.byId(sId);
                if (oInput && oInput.setValueState) {
                    oInput.setValueState("None");
                }
            });


            this._oReturnDialog.open();
            this._initializeTransactionIDState(oData);
        },

        _initializeTransactionIDState: function(oData) {
            const oView = this.getView();
            const oMode = sap.ui.getCore().byId(oView.createId("DT_id_ReturnMode"));
            const oTxn = sap.ui.getCore().byId(oView.createId("DT_id_ReturnTransactionID"));

            if (!oMode || !oTxn) return;

            const mode = oMode.getSelectedKey();
            
            if(oData.Status === "Partially Recovered"){
                oMode.setEnabled(true);
                oMode.setSelectedKey(oData.ReturnDamageMode);
                oTxn.setValue(oData.ReturnDamageTransactionID);
                    
            }else{
            if (mode === "CASH") {
                oTxn.setEnabled(false);
                oTxn.setValue("");
                oTxn.setValueState("None");
            } else {
                oTxn.setEnabled(true);
            }
        }
        },

        onSaveReturn: async function() {
            const oView = this.getView();
            const oDamage = oView.getModel("DamageModel").getData();

            const oAmountInput = sap.ui.getCore().byId(oView.createId("DT_id_ReturnAmount"));
            const oModeInput = sap.ui.getCore().byId(oView.createId("DT_id_ReturnMode"));
            const oTxnInput = sap.ui.getCore().byId(oView.createId("DT_id_ReturnTransactionID"));

             var isMandatoryValid = (
                utils.onNumber(sap.ui.getCore().byId(oView.createId("DT_id_ReturnAmount")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("DT_id_ReturnMode")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("DT_id_ReturnTransactionID")), "ID")
            );

            if (!isMandatoryValid) {
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            const returnAmount = parseFloat(oAmountInput.getValue());
            const mode = oModeInput.getSelectedKey();
            const txnID = oTxnInput.getValue();
            const damageAmount = parseFloat(oDamage.TotalCost);

            // === VALIDATIONS ===
            if (!returnAmount || returnAmount <= 0) {
                MessageToast.show("Enter valid return amount");
                return;
            }

            if (returnAmount > damageAmount) {
                MessageToast.show("Return amount cannot exceed damage amount");
                return;
            }

            if (!mode) {
                MessageToast.show("Select return mode");
                return;
            }

            // if (mode !== "CASH" && (!txnID || txnID.trim() === "")) {
            //     MessageToast.show("Transaction ID required");
            //     oTxnInput.setValueState("Error");
            //     return;
            // }

            sap.ui.core.BusyIndicator.show();

            try {
                const currentUser = oView.getModel("LoginModel").getProperty("/EmployeeName");

                const payload = {
                    ReturnDamageAmount: returnAmount,
                    ReturnDamageDate: new Date().toISOString().split("T")[0],
                    ReturnDamageMode: mode,
                    ReturnDamageTransactionID: txnID || "",
                    ReturningEmployeeName: currentUser
                };
                if(returnAmount < damageAmount){
                    payload.Status = "Partially Recovered"
                }else{
                    payload.Status = "Recovered"
                }

                // const payload = {
                //     Filters: {
                //         DamageID: oDamage.DamageID
                //     },
                //     data: updateData
                // };

                const res = await this.ajaxUpdateWithJQuery("HM_Damage", {
                  data: payload,
                filters: {
                     DamageID: oDamage.DamageID
                }
                });

                if (!res.success) throw new Error(res.message);

                MessageToast.show("Damage recovered successfully");
                this._oReturnDialog.close();
                await this.Onsearch("true");
            } catch (e) {
                MessageToast.show(e.message);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        onDialogClose: function() {
            this._clearTableSelection(); // Clear table selection
            if (this._oReturnDialog) {
                this._oReturnDialog.close();
            }
        },

        _clearTableSelection: function() {
            var oTable = this.byId("HD_id_ARD_Table");
            if (oTable) {
                oTable.removeSelections(true);
            }
        },

        _validateReturnAmount: function(oEvent) {
            utils.onNumber(oEvent)
            const oInput = oEvent.getSource();
            const oDamage = this.getView().getModel("DamageModel").getData();
            const amount = parseFloat(oInput.getValue());
            const max = parseFloat(oDamage.TotalCost);

            if (!amount || amount < 0 || amount > max) {
                oInput.setValueState("Error");
                oInput.setValueStateText("0 to " + max);
                return false;
            }

            oInput.setValueState("None");
            return true;
        },

        _onReturnModeChange: function(oEvent) {
         utils._LCstrictValidationComboBox(oEvent);
            const oView = this.getView();
            const oTxn = sap.ui.getCore().byId(oView.createId("DT_id_ReturnTransactionID"));
             oTxn.setValue("");
        },

        _validateTransactionID: function(oEvent) {
            const oInput = oEvent.getSource();
            const oView = this.getView();
            const oModeInput = sap.ui.getCore().byId(oView.createId("DT_id_ReturnMode"));
            const returnMode = oModeInput ? (oModeInput.getSelectedKey() || oModeInput.getValue()) : "";

            // If CASH mode, no validation needed
            if (returnMode === "CASH") {
                oInput.setValueState("None");
                return true;
            }

            // For non-cash transactions, validate
            const value = oInput.getValue();
            if (!value || value.trim() === "") {
                oInput.setValueState("Error");
                return false;
            }

            oInput.setValueState("None");
            return true;
        },

        HM_onPressGenerateDamageReceipt: async function() {
            try {
                sap.ui.core.BusyIndicator.show(0);
                const {jsPDF} = window.jspdf;

                // ===== Get Selected Row Data =====
                var oTable = this.byId("HD_id_ARD_Table");
                var oSelected = oTable.getSelectedItems();

                if (!oSelected || oSelected.length === 0) {
                    MessageToast.show("Please select a damage record");
                    return;
                }

                if (oSelected.length > 1) {
                    MessageToast.show("Select only one row");
                    return;
                }

                var oContext = oSelected[0].getBindingContext("Damage");
                var oData = oContext.getObject();

                // ===== Status Check =====
                if (oData.Status !== "Recovered") {
                    MessageToast.show("Receipt can be generated only for Recovered status");
                    return;
                }

                let filter = {BranchID: [oData.BranchCode]};
                const oCompanyDetailsModel = await this.ajaxReadWithJQuery("HM_Branch", filter);
                const company = oCompanyDetailsModel.data[0] || {};

                // ===== Create PDF =====
                const margin = 15;
                const doc = new jsPDF("p", "mm", "a4");
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                let currentY = 20;

                const NA = (v) => (v === null || v === undefined || v === "" ? "N/A" : v);

                // ================= HEADER =================
                doc.setFont("times", "bold");
                doc.setFontSize(16);

                const branchName = NA(company.Name);
                const headerText = `DAMAGE RECOVERY RECEIPT - ${branchName}`;

                // Split text properly based on max width
                const maxTextWidth = pageWidth - (margin * 2);
                const textLines = doc.splitTextToSize(headerText, maxTextWidth);

                // Starting Y position
                let lineY = currentY;

                doc.setLineWidth(0.5);

                textLines.forEach((line) => {
                    // Center each line
                    doc.text(line, pageWidth / 2, lineY, {
                        align: "center"
                    });

                    // Calculate width of current line
                    const textWidth = doc.getTextWidth(line);
                    const centerX = pageWidth / 2;

                    // Draw underline for that line
                    doc.line(
                        centerX - textWidth / 2,
                        lineY + 2,
                        centerX + textWidth / 2,
                        lineY + 2
                    );

                    lineY += 7; // Adjust line spacing
                });

                currentY = lineY + 3;

                doc.setFontSize(11);
                doc.setFont("times", "normal");

                // ================= RECEIPT META (RIGHT SIDE TABLE STYLE) =================
                const detailsStartY = currentY;
                const rowHeight = 6.5;
                const columnWidths = [40, 35]; // label + value column width
                const rightAlignX = pageWidth - 22 - columnWidths[0] - columnWidths[1];

                doc.setFontSize(11).setFont("times", "bold");

                const receiptDetails = [{
                        label: "Receipt Date :",
                        value: this.Formatter.formatDate(oData.ReturnDamageDate) || "N/A"
                    },
                    {
                        label: "Room No :",
                        value: NA(oData.RoomNo)
                    },
                    {
                        label: "Customer ID :",
                        value: NA(oData.CustomerID)
                    }
                ];

                // Print right-aligned meta block
                currentY = detailsStartY;
                receiptDetails.forEach(row => {
                    // Label (right aligned in first column)
                    doc.text(
                        row.label,
                        rightAlignX + columnWidths[0] - doc.getTextWidth(row.label),
                        currentY + 5
                    );

                    // Value (normal left aligned)
                    doc.setFont("times", "normal");
                    doc.text(
                        String(row.value),
                        rightAlignX + columnWidths[0] + 5,
                        currentY + 5
                    );

                    // Reset bold for next label
                    doc.setFont("times", "bold");
                    currentY += rowHeight;
                });

                // ================= TO SECTION =================
                currentY += 12;
                doc.setFont("times", "bold");
                doc.text("To,", margin, currentY);

                currentY += 6;
                doc.setFont("times", "normal");
                doc.text(`Customer Name : ${NA(oData.CustomerName)}`, margin, currentY);

                currentY += 6;
                doc.text(`Email : ${NA(oData.CustomerEmail)}`, margin, currentY);

                currentY += 10;

                // ================= DAMAGE DETAILS TABLE =================
                const damageBody = [
                    ["Item Name", NA(oData.ItemName)],
                    ["Description", NA(oData.Description)],
                    ["Bed Type", NA(oData.BedTypeName)],
                    ["Damage Cost", `${NA(oData.Cost)} ${NA(oData.Currency)}`],
                    ["Recovered Amount", `${NA(oData.ReturnDamageAmount)} ${NA(oData.Currency)}`],
                    ["Payment Mode", NA(oData.ReturnDamageMode)],
                    ["Transaction ID", NA(oData.ReturnDamageTransactionID)],
                    ["Recovered By", NA(oData.ReturningEmployeeName)],
                    ["Status", NA(oData.Status)]
                ];

                doc.autoTable({
                    startY: currentY,
                    head: [
                        ["Particulars", "Information"]
                    ],
                    body: damageBody,
                    theme: "grid",
                    styles: {
                        font: "times",
                        fontSize: 10,
                        cellPadding: 3,
                        lineColor: [30, 30, 30],
                        lineWidth: 0.5,
                    },
                    headStyles: {
                        fillColor: [20, 170, 183]
                    },
                    columnStyles: {
                        0: {
                            fontStyle: "bold",
                            cellWidth: 50
                        },
                        1: {
                            cellWidth: 120
                        }
                    }
                });

                currentY = doc.lastAutoTable.finalY + 10;

                doc.setFont("times", "bold");
                doc.text("Thank you for your cooperation.", margin, currentY);

                // ================= FOOTER =================
                const totalPages = doc.internal.getNumberOfPages();
                for (let i = 1; i <= totalPages; i++) {
                    doc.setPage(i);
                    this.addFooter(doc, oCompanyDetailsModel, pageWidth, pageHeight, i, totalPages);
                }

                doc.save(`${NA(oData.CustomerName)}-Damage-Receipt-${NA(oData.RoomNo)}.pdf`);
            } catch (err) {
                MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        addFooter: function(doc, oCompanyDetailsModel, pageWidth, pageHeight, currentPage, totalPages) {
            const footerHeight = 18;
            const footerYPosition = pageHeight - footerHeight;
            const footerWidth = pageWidth;
            const company = oCompanyDetailsModel.data[0];

            doc.setFillColor(128, 128, 128);
            doc.rect(0, footerYPosition, footerWidth, footerHeight, 'F');

            doc.setFont("helvetica", "normal");
            doc.setTextColor(255, 255, 255);

            const textYPosition = footerYPosition + 5;
            const lineHeight = 5;

            if (company && company.City) {
                doc.setFontSize(8);
                doc.text(`SUBJECT TO ${company.City.toUpperCase()} JURISDICTION`, footerWidth / 2, textYPosition, {
                    align: 'center'
                });
            }

            if (company && company.GSTIN) {
                doc.setFontSize(10);
                doc.text(`GSTIN : ${company.GSTIN}`, footerWidth - 5, textYPosition + 5, {
                    align: 'right'
                });
            }

            if (company && company.Address) {
                let fullAddress = company.Address;
                if (company.Contact) {
                    fullAddress += `, Mobile No : ${company.STD}-${company.Contact}`;
                }
                const addressLines = doc.splitTextToSize(fullAddress, footerWidth - 100);
                let y = textYPosition + 5;
                addressLines.forEach(line => {
                    doc.text(line, 5, y);
                    y += lineHeight;
                });
            }
        },
    });
});