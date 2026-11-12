sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
    "sap/m/MessageToast",
    "../model/formatter",
    "sap/ui/export/Spreadsheet",
], function (BaseController, JSONModel, utils, MessageToast, Formatter, Spreadsheet) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Damage", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteDamage").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function (oEvent) {
            this.getBusyDialog()
            var LoginFUnction = await this.commonLoginFunction("DamageDashboard");
            if (!LoginFUnction) return;
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.commonLoginFunction();
            var model = new JSONModel({
                BookingID: "",
                CustomerName: "",
                RoomNo: "",
                BedTypeName: "",
                BranchCode: "",
                ItemName: "",
                Description: "",
                Cost: "",
                Date: "",
                Status: "Damage Raised",
                DamageID: "",
                Currency: "",
                CustomerEmail: "",
                Type: "",
                UserID: "",
                DueAmount: ""
            });
            this.getView().setModel(model, "DamageModel");
            this._makeDatePickersReadOnly(["HD_id_DamageDate"]);
            var sPath = oEvent.getParameter("arguments").sPath;
            this.sPath = oEvent.getParameter("arguments").sPath;

            if (sPath === "TilePage") {
                this.onClearAndSearch("HD_id_FilterbarEmployee");
            }
            var loginModel = this.getOwnerComponent().getModel("LoginModel");
            this.BranchCode = loginModel.getProperty("/BranchCode");
            await this._loadBranchCode()
            await this.Onsearch("true")
            this.readCustomerData();
        },
        getGroupHeader: function (oGroup) {
            return this.getStyledGroupHeader(oGroup);
        },
        HM_GenearteDamage: function () {

            this.getOwnerComponent().getRouter().navTo("RouteDamageDetails", { sPath: "Damage" });
        },

        _loadBranchCode: async function () {
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

        readCustomerData: function () {
            this.getBusyDialog()

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

        onChangeAddCustomer: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
            this.SelectKey = oEvent.getSource().getSelectedKey();
            const allData = this.getView().getModel("CustomerModel").getData();

            const SelectedData = allData.find(item => item.BookingID === this.SelectKey);
            if (!SelectedData) return;

            var oDamageModel = this.getView().getModel("DamageModel");
            oDamageModel.setProperty("/BookingID", SelectedData.BookingID);
            oDamageModel.setProperty("/CustomerName", SelectedData.CustomerName);
            oDamageModel.setProperty("/RoomNo", SelectedData.RoomNo);
            oDamageModel.setProperty("/BedTypeName", SelectedData.BedType);
            oDamageModel.setProperty("/BranchCode", SelectedData.BranchCode);
            oDamageModel.setProperty("/CustomerEmail", SelectedData.CustomerEmail);
            oDamageModel.setProperty("/Currency", SelectedData.Currency);
            oDamageModel.setProperty("/UserID", SelectedData.UserID)
        },

        HM_AddRoom: function (oEvent) {
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
                    BookingID: "",
                    CustomerName: "",
                    RoomNo: "",
                    BedTypeName: "",
                    BranchCode: "",
                    ItemName: "",
                    Description: "",
                    Cost: "",
                    Date: this.Formatter.formatDate(new Date()), // Set current date
                    Status: "Damage Raised",
                    DamageID: "",
                    Currency: "",
                    CustomerEmail: "",
                    Type: "",
                    UserID: "",
                    BookingIDEditable: true
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

            aInputIds.forEach(function (sId) {
                var oInput = oView.byId(sId);
                if (oInput && oInput.setValueState) {
                    oInput.setValueState("None");
                }
            });

            // --- Open Dialog ---
            this.AR_Dialog.open();
        },

        HM_EditRoom: function (oEvent) {
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

            if (oData.Status === "Damage Claimed") {
                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("damageAlreadyClaimed"));
                return;
            }

            oData.Date = this.Formatter.formatDate(oData.Date); // Format date for input field
            oData.BookingIDEditable = false;

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
            aInputIds.forEach(function (sId) {
                var oInput = oView.byId(sId);
                if (oInput && oInput.setValueState) {
                    oInput.setValueState("None");
                }
            });

            // --- Open Dialog ---
            this.AR_Dialog.open();
        },

        HD_onCancelButtonPress: function () {
            this.AR_Dialog.close();
            var table = this.byId("HD_id_ARD_Table");
            table.removeSelections(true);
        },

        HD_onsavebuttonpress: async function () {
            const oView = this.getView();
            var oDamageModel = oView.getModel("DamageModel");
            var Payload = oDamageModel.getData();

            // Mandatory Validation
            var isMandatoryValid = (
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("HD_id_Type")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("HD_id_BookingID")), "ID") &&
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
                BookingID: Payload.BookingID,
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
                Type: Payload.Type,
                UserID: Payload.UserID
            };

            delete Payload.BookingIDEditable;
            try {
                this.getBusyDialog()

                // ================= UPDATE =================
                if (Payload.DamageID) {
                    var oPayload = {
                        data: oData,
                        filters: {
                            DamageID: Payload.DamageID
                        }
                    };

                    await this.ajaxUpdateWithJQuery("HM_Damage", oPayload);
                    MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("damageDetailsUpdated"));

                }
                // ================= CREATE =================
                else {
                    var oPayload = {
                        data: oData
                    };

                    await this.ajaxCreateWithJQuery("HM_Damage", oPayload);
                    MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("damageDetailsAdded"));
                }

                await this.Onsearch("true");
                this.AR_Dialog.close();
            } catch (err) {
                MessageToast.show(err.responseText || this.getView().getModel("i18n").getResourceBundle().getText("failedSaveDamage"));
            } finally {
                this.closeBusyDialog()
            }
        },
        DamageOnsearch: function () {
            if (!this.byId("Dm_id_CustomerName").getSelectedKey() && !this.byId("DM_id_RoomNo").getSelectedKey() && !this.byId("DM_id_Status").getSelectedKey()) {

                this.Onsearch("true");
            } else {
                this.Onsearch("false")
            }

        },

        onLiveChangeItemName: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onLiveChangeDescription: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onLiveChangeCost: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateAmount(oEvent.getSource(), "ID");
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onChangeDamageDate: function (oEvent) {
            utils._LCvalidateDate(oEvent);
        },

        onchangeType: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent);
        },

        HM_DeleteRoom: async function () {
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
                this.getView().getModel("i18n").getResourceBundle().getText("sureDeleteSelected_c23e", [sNames]), {
                icon: sap.m.MessageBox.Icon.WARNING,
                title: this.getView().getModel("i18n").getResourceBundle().getText("msgBoxConfirm"),
                actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                emphasizedAction: sap.m.MessageBox.Action.NO,
                styleClass: "myUnifiedBtn",
                onClose: async function (sAction) {
                    if (sAction !== sap.m.MessageBox.Action.YES) {
                        oTable.removeSelections(true);
                        return;
                    }

                    try {
                        this.getBusyDialog()
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
                        MessageToast.show(err.message || err.responseText || that.getView().getModel("i18n").getResourceBundle().getText("deleteFailed"));
                    } finally {
                        that.closeBusyDialog()
                        oTable.removeSelections(true);
                    }
                }
            }
            );
        },

        Onsearch: function (flag) {
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
                filters.CustomerName = sRCustomerName
            }
            if (sStatus) {
                filters.Status = sStatus
            }


            this.getBusyDialog()
            this.ajaxReadWithJQuery("HM_Damage", filters).then((oData) => {
                const roomData = Array.isArray(oData.data) ? oData.data : [];
                const branchData = this.getView().getModel("BranchModel")?.getData() || [];

                // Map BranchCode → BranchName
                const mappedData = roomData.map(bed => {
                    const branch = branchData.find(br => br.BranchID === bed.BranchCode);
                    return {
                        ...bed,
                        BranchName: branch ? branch.Name : bed.BranchID
                    };
                });

                if (flag === "true" && this.sPath === "TilePage") {
                    this._originalRoomdata = JSON.parse(JSON.stringify(mappedData));
                } else if (!this._originalRoomdata || this._originalRoomdata.length === 0) {
                    this._originalRoomdata = JSON.parse(JSON.stringify(mappedData));
                }

                // Set filtered data to table
                this.getView().setModel(new JSONModel(mappedData), "Damage");

                // Always pass full original data for filter values
                this._populateUniqueFilterValues(this._originalRoomdata);

                this.closeBusyDialog()
            });
        },
        DM_onPressEditDetails: function (oEvent) {
            var oSelected = oEvent.getSource().getBindingContext("Damage").getObject();
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDamageDetails", {
                sPath: encodeURIComponent(oSelected.DamageID)
            });
        },

        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                Dm_id_CustomerName: new Set(),
                DM_id_RoomNo: new Set(),

            };

            data.forEach(item => {
                uniqueValues.Dm_id_CustomerName.add(item.CustomerName);
                uniqueValues.DM_id_RoomNo.add(item.RoomNo);

            });

            let oView = this.getView();
            ["Dm_id_CustomerName", "DM_id_RoomNo"].forEach(field => {
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

        HD_onPressClear: function () {
            this.getView().byId("Dm_id_CustomerName").setSelectedKey("")
            this.getView().byId("DM_id_RoomNo").setSelectedKey("")
            this.getView().byId("DM_id_Status").setSelectedKey("")
        },

        RD_onDownload: function () {
            var aData = this.getView().getModel("Damage").getData();

            if (!aData || aData.length === 0) {
                MessageToast.show(this.i18nModel.getText("nodataavailablefordownload"));
                return;
            }

            var aAdjustedData = aData.map(item => ({
                ...item,
                Cost: item.TotalCost ? String(item.TotalCost) : "",
                InvoiceDate: item.InvoiceDate ? this.Formatter.formatDate(item.InvoiceDate) : "",
                ReturnDamageDate: item.ReturnDamageDate ? this.Formatter.formatDate(item.ReturnDamageDate) : "",
                TotalCost: item.TotalCost + " " + item.Currency
            }));

            var aColumns = this.createDamageExcelColumns();
            var oSettings = {
                workbook: {
                    columns: aColumns,
                    context: {
                        sheetName: "Damage Details"
                    }
                },
                dataSource: aAdjustedData,
                fileName: "Damage_Report.xlsx",
                worker: false
            };
            MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("downloadingDamageReport"));
            var oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function () {
                oSheet.destroy();
            });
        },

        createDamageExcelColumns: function () {
            return [
                { label: "Property Name", property: "BranchName", type: "string" },
                { label: "Booking ID", property: "BookingID", type: "string" },
                { label: "Customer Name", property: "CustomerName", type: "string" },
                { label: "Room No", property: "RoomNo", type: "string" },
                { label: "Actual Cost", property: "TotalCost", type: "string" },
                { label: "Recover Cost", property: "RecoverCost", type: "string" },
                { label: "Date", property: "InvoiceDate", type: "String" },
                { label: "Status", property: "Status", type: "string" },
                { label: "Recover Date", property: "ReturnDamageDate", type: "string" }
            ];
        },

        onHome: function () {
            this.CommonLogoutFunction();
            this.getView().getModel("Damage").setData({});
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
            this.getView().getModel("Damage").setData({});
        },
        Damgeitemreadcall:async function(sDamageID){
         
             const oData = await this.ajaxReadWithJQuery("HM_DamageItem", {DamageID:sDamageID});

                    var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];

                    var Damage = oFCIAerData[0].HM_Damage[0];
                    var Items = oFCIAerData[0].HM_DamageItem;

                    var aItemsWithIndex = Items.map(function (item, index) {
                        return {
                            IndexNo: index + 1,
                            Type: item.Type,
                            ItemName: item.ItemName,
                            Description: item.Description,
                            Cost: item.Cost,
                            TotalCost:item.TotalCost,
                            RecoverCost: item.RecoverCost,
                            Quantity: item.Quantity,
                            ItemId: item.ItemID
                        };
                    });

                    var DamageModel = {
                        DamageID: Damage.DamageID,
                        BookingID: Damage.BookingID,
                        CustomerName: Damage.CustomerName,
                        RoomNo: Damage.RoomNo,
                        BedTypeName: Damage.BedTypeName,
                        BranchCode: Damage.BranchCode,
                        Date: Formatter.formatDate(new Date(Damage.InvoiceDate)),
                        Status: Damage.Status,
                        Currency: Damage.Currency,
                        CustomerEmail: Damage.CustomerEmail,
                        UserID: Damage.UserID,
                        RecoverCost: Damage.RecoverCost,
                        TotalCost: Damage.TotalCost,
                        ReturnDamageAmount: Damage.ReturnDamageAmount,
                        Items: aItemsWithIndex
                    };

                    this.getView().setModel(new JSONModel(DamageModel), "DamageItemModel");
        },

        HM_ReturnDamage:async function () {
         
            const oView = this.getView();
            var oTable = this.byId("HD_id_ARD_Table");
            var oSelected = oTable.getSelectedItems();

            if (!oSelected || oSelected.length === 0) {
                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("selectRecord"));
                return;
            }
            if (oSelected.length > 1) {
                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("selectOnlyOne"));
                return;
            }

            // Get selected row data
            var oContext = oSelected[0].getBindingContext("Damage");
            var oData = oContext.getObject();

            

            if (oData.Status === "Damage Claimed") {
                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("damageAlreadyClaimed"));
                return;
            }
              this.getBusyDialog()
            await this.Damgeitemreadcall(oData.DamageID)
            this.closeBusyDialog()
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


            // Reset input ValueState
            var aInputIds = [
                "DT_id_ReturnAmount",
                "DT_id_ReturnMode",
                "DT_id_ReturnTransactionID"
            ];
            aInputIds.forEach(function (sId) {
                var oInput = oView.byId(sId);
                if (oInput && oInput.setValueState) {
                    oInput.setValueState("None");
                }
            });


            this._oReturnDialog.open();
            this._initializeTransactionIDState(oData);
        },

        _initializeTransactionIDState: function (oData) {
            const oView = this.getView();
            const oMode = sap.ui.getCore().byId(oView.createId("DT_id_ReturnMode"));
            const oTxn = sap.ui.getCore().byId(oView.createId("DT_id_ReturnTransactionID"));

            if (!oMode || !oTxn) return;

            const mode = oMode.getSelectedKey();

            if (oData.Status === "Partially Recovered") {
                oMode.setEnabled(true);
                oMode.setSelectedKey(oData.ReturnDamageMode);
                oTxn.setValue(oData.ReturnDamageTransactionID);

            } else {
                if (mode === "CASH") {
                    oTxn.setEnabled(false);
                    oTxn.setValue("");
                    oTxn.setValueState("None");
                } else {
                    oTxn.setEnabled(true);
                }
            }
        },
     
DM_onPressGeneratePDF: async function () {
    try {
        this.getBusyDialog();

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("portrait", "mm", "a4");

        const oModel = this.getView()
            .getModel("DamageItemModel")
            .getData();

        const aItems = oModel.Items || [];

        let filter = {
            BranchID: [oModel.BranchCode]
        };

        const oCompanyDetailsModel =
            await this.ajaxReadWithJQuery("HM_Branch", filter);

        var companyImage = oCompanyDetailsModel?.data?.[0]?.Photo1 || "";
        this.BranchEmailID = oCompanyDetailsModel?.data?.[0]?.EmailID || "";

        var branchName = (oCompanyDetailsModel?.data?.[0]?.Name || "").toUpperCase();

        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        let currentY = 20;

        doc.setFont("times", "bold");
        doc.setFontSize(16);

        // ================= HEADER =================

        const documentTitle =
            oModel.Status === "Damage Claimed"
                ? "DAMAGE RECEIPT"
                : "DAMAGE NOTICE";

        const titleWidth = doc.getTextWidth(documentTitle);
        const branchMaxWidth = pageWidth - (margin * 2) - titleWidth - 10;

        let branchNameLines = [];

        if (branchName && branchName.trim() !== "") {
            branchNameLines = doc.splitTextToSize(
                branchName,
                branchMaxWidth
            );

            doc.text(
                branchNameLines,
                margin,
                currentY,
                {
                    align: "left",
                    lineHeightFactor: 1.2
                }
            );
        }

        // Right side title
        doc.text(
            documentTitle,
            pageWidth - margin,
            currentY,
            {
                align: "right"
            }
        );

        // ================= LOGO =================

        let logoY = currentY + (branchNameLines.length * 6) + 3;

        if (companyImage && companyImage.trim() !== "") {

            const imgData = "data:image/png;base64," + companyImage;

            doc.addImage(
                imgData,
                "PNG",
                margin,
                logoY,
                35,
                30
            );
        }

        // ================= NEXT CONTENT =================

        currentY = logoY + 15;

        // ================= DAMAGE META =================

        const detailsStartY = currentY;
        const rowHeight = 7;
        const columnWidths = [45, 35];

        const rightAlignX =
            pageWidth - margin - columnWidths[0] - columnWidths[1];

        doc.setFontSize(11);
        doc.setFont("times", "bold");

        const damageDetails = [
            ...(oModel.DamageID
                ? [{
                    label: "Damage No :",
                    value: oModel.DamageID
                }]
                : []),

            {
                label: "Date :",
                value: oModel.Date || "N/A"
            },
            {
                label: "Room No :",
                value: oModel.RoomNo || "N/A"
            }
        ];

        currentY = detailsStartY;

        damageDetails.forEach(row => {

            doc.text(
                row.label,
                rightAlignX + columnWidths[0] - doc.getTextWidth(row.label),
                currentY + 5
            );

            doc.setFont("times", "normal");

            doc.text(
                String(row.value),
                rightAlignX + columnWidths[0] + 5,
                currentY + 5
            );

            doc.setFont("times", "bold");

            currentY += rowHeight;
        });

        currentY += 8;

        // ================= CUSTOMER DETAILS =================

        doc.setFont("times", "bold").setFontSize(11);
        doc.text("To,", margin, currentY);

        currentY += 6;

        doc.setFont("times", "normal").setFontSize(12);

        doc.text(`Name : ${oModel.CustomerName || ""}`, margin, currentY);

        currentY += 6;

        doc.text(`Email : ${oModel.CustomerEmail || ""}`, margin, currentY);

        currentY += 10;

        // ================= ITEMS TABLE =================

        const body = aItems.map((item, index) => [
            index + 1,
            item.ItemName || "",
            item.Description || "-",
            item.Type || "",
            item.Quantity || 0,
            Formatter.fromatNumber(item.Cost),
            Formatter.fromatNumber(item.TotalCost),
            Formatter.fromatNumber(item.RecoverCost)
        ]);

        doc.autoTable({
            startY: currentY,

            head: [[
                'Sl.No',
                'Item Name',
                'Description',
                'Type',
                'Quantity',
                'Actual Cost',
                'Total Cost',
                'Recover Cost'
            ]],

            body: body,

            theme: "grid",

            headStyles: {
                fillColor: [20, 170, 183]
            },

            styles: {
                font: "times",
                fontSize: 10,
                cellPadding: 3,
                lineWidth: 0.5,
                lineColor: [30, 30, 30],
                halign: "center"
            },

            columnStyles: {
                1: { halign: "left" },
                2: { halign: "left" },
                3: { halign: "center" },
                4: { halign: "center" },
                5: { halign: "right" },
                6: { halign: "right" },
                7: { halign: "right" }
            }
        });

        currentY = doc.lastAutoTable.finalY + 8;

        // ================= SUMMARY =================

        const totalAmount = parseFloat(oModel.RecoverCost || 0);

        const summary = [];

        if (totalAmount > 0) {
            summary.push([
                `Sub-Total (${oModel.Currency}) :`,
                totalAmount.toFixed(2)
            ]);
        }

        const totalRowIndex = summary.length;

        summary.push([
            `Total (${oModel.Currency}) :`,
            totalAmount.toFixed(2)
        ]);

        doc.autoTable({
            startY: currentY,

            body: summary,

            theme: "plain",

            styles: {
                font: "times",
                fontSize: 10,
                halign: "right",
                cellPadding: 2,
                overflow: "ellipsize"
            },

            columnStyles: {
                0: {
                    halign: "right",
                    cellWidth: 60
                },
                1: {
                    halign: "right",
                    cellWidth: 40
                }
            },

            margin: {
                left: 95
            },

            didParseCell: function (data) {
                if (data.row.index === totalRowIndex) {

                    data.cell.styles.lineWidth = {
                        top: 0.5,
                        right: 0,
                        bottom: 0,
                        left: 0
                    };

                    data.cell.styles.lineColor = [0, 0, 0];
                    data.cell.styles.fontStyle = "bold";
                }
            }
        });

        currentY = doc.lastAutoTable.finalY + 8;

        // ================= AMOUNT IN WORDS =================

        const finalAmount = totalAmount;

        const amountInWords =
            await this.convertNumberToWords(finalAmount, "INR");

        doc.setFont("times", "bold");

        doc.text("Amount in Words :", margin, currentY);

        currentY += 6;

        doc.setFont("times", "normal");

        const lines = doc.splitTextToSize(
            amountInWords,
            pageWidth - 2 * margin
        );

        doc.text(lines, margin, currentY);

        // ================= FOOTER =================

        this.addFooter(
            doc,
            oCompanyDetailsModel,
            pageWidth,
            pageHeight
        );

        // ================= RETURN BASE64 =================

        const pdfBase64 = doc.output("datauristring").split(",")[1];

        return pdfBase64;

    } catch (error) {

        sap.m.MessageToast.show(error.message);

        console.error("PDF Generation Error:", error);

        throw error;

    } finally {

        this.closeBusyDialog();
    }
},


        onSaveReturn: async function () {
    const oView = this.getView();
    const oDamageModel = oView.getModel("DamageModel");
    const oDamage = oDamageModel.getData();

    const oModeInput = sap.ui.getCore().byId(
        oView.createId("DT_id_ReturnMode")
    );

    const oTxnInput = sap.ui.getCore().byId(
        oView.createId("DT_id_ReturnTransactionID")
    );


    // ============================================================
    // RETURN MODE VALIDATION
    // ============================================================

    const sReturnMode = oModeInput.getSelectedKey();

    let isMandatoryValid = true;

    // Return mode is mandatory
    if (!sReturnMode) {
        oModeInput.setValueState("Error");
        oModeInput.setValueStateText(this.getView().getModel("i18n").getResourceBundle().getText("selectReturnMode_97f3"));

        MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("selectReturnMode"));

        return;
    } else {
        oModeInput.setValueState("None");
    }


    // ============================================================
    // TRANSACTION ID VALIDATION
    // Only required when mode is NOT Cash
    // ============================================================

    if (sReturnMode !== "Cash") {

        isMandatoryValid =
            utils._LCvalidateMandatoryField(
                oTxnInput,
                "ID"
            );

        if (!isMandatoryValid) {

            MessageToast.show(
                this.i18nModel.getText("mandetoryFields")
            );

            return;
        }

    } else {

        // Cash does not require Transaction ID
        oTxnInput.setValueState("None");
        oTxnInput.setValueStateText("");
    }


    const mode = oModeInput.getSelectedKey();
    const txnID = oTxnInput.getValue();


    const returnAmount =
        parseFloat(
            oDamage.ReturnDamageAmount
        ) || 0;
    this.getBusyDialog();


    try {

        const currentUser =
            oView
                .getModel("LoginModel")
                .getProperty("/EmployeeName");

     const pdfBase64 = await this.DM_onPressGeneratePDF();

        const payload = {

            ReturnDamageAmount: returnAmount,

            ReturnDamageDate:
                new Date()
                    .toISOString()
                    .split("T")[0],

            ReturnDamageMode: mode,

            ReturnDamageTransactionID:
                txnID || "",

            ReturningEmployeeName:
                currentUser,

            Status: "Damage Claimed",
            CustomerName:oDamage.CustomerName,
            DamageID:oDamage.DamageID,
            RecoverCost:oDamage.RecoverCost,
            TotalCost:oDamage.TotalCost,
            CustomerEmail:oDamage.CustomerEmail,
            BranchEmail:this.BranchEmailID,
             pdfAttachment: {
                fileName: "Damage.pdf",
                mimeType: "application/pdf",
                content: pdfBase64
            }
        };
      
        const res =
            await this.ajaxUpdateWithJQuery(
                "HM_Damage",
                {
                    data: payload,

                    filters: {
                        DamageID: oDamage.DamageID
                    }
                }
            );


        if (!res.success) {
            throw new Error(
                res.message || "Failed to claim damage"
            );
        }
        MessageToast.show(
            this.getView().getModel("i18n").getResourceBundle().getText("damageClaimed")
        );

        this._oReturnDialog.close();

        this.byId(
            "HD_id_ARD_Table"
        ).removeSelections(true);

        await this.Onsearch("true");


    } catch (e) {

        MessageToast.show(
            e.message || this.getView().getModel("i18n").getResourceBundle().getText("failedClaimDamage")
        );

    } finally {

        this.closeBusyDialog();

    }
},

        onDialogClose: function () {
            this._clearTableSelection(); // Clear table selection
            if (this._oReturnDialog) {
                this._oReturnDialog.close();
            }
        },

        _clearTableSelection: function () {
            var oTable = this.byId("HD_id_ARD_Table");
            if (oTable) {
                oTable.removeSelections(true);
            }
        },

        _validateReturnAmount: function (oEvent) {
            utils.onNumber(oEvent)
            const oInput = oEvent.getSource();
            const oDamage = this.getView().getModel("DamageModel").getData();
            const amount = parseFloat(oInput.getValue());
            const max = parseFloat(oDamage.TotalCost);

            if (!amount || amount < 0 || amount > max) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.getView().getModel("i18n").getResourceBundle().getText("to", [max]));
                return false;
            }

            oInput.setValueState("None");
            return true;
        },

        _onReturnModeChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent);
            var sMode = oEvent.getSource().getSelectedKey();
            var oModel = this.getView().getModel("DamageModel");
            const oTInput = sap.ui.getCore().byId(this.getView().createId("DT_id_ReturnTransactionID"));

            // Disable when Cash is selected
            oModel.setProperty(
                "/ReturnTransactionEnabled",
                sMode !== "Cash"
            );

            // Optional: Clear value when Cash is selected
            if (sMode === "Cash") {
                oModel.setProperty("/ReturnDamageTransactionID", "");
                // oModel.setValueState("None");
                oTInput.setValueState("None");

            }
            const oView = this.getView();
            const oTxn = sap.ui.getCore().byId(oView.createId("DT_id_ReturnTransactionID"));
            oTxn.setValue("");
        },

        _validateTransactionID: function (oEvent) {
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

        HM_onPressGenerateDamageReceipt: async function () {
            try {
                this.getBusyDialog()
                const { jsPDF } = window.jspdf;

                // ===== Get Selected Row Data =====
                var oTable = this.byId("HD_id_ARD_Table");
                var oSelected = oTable.getSelectedItems();

                if (!oSelected || oSelected.length === 0) {
                    MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("selectDamageRecord"));
                    return;
                }

                if (oSelected.length > 1) {
                    MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("selectOnlyOne"));
                    return;
                }

                var oContext = oSelected[0].getBindingContext("Damage");
                var oData = oContext.getObject();

                // ===== Status Check =====
                if (oData.Status !== "Damage Claimed") {
                    MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("receiptCanGenerated"));
                    return;
                }

                let filter = { BranchID: [oData.BranchCode] };
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
                    label: "Booking ID :",
                    value: NA(oData.BookingID)
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
                this.closeBusyDialog()
            }
        },

        addFooter: function (doc, oCompanyDetailsModel, pageWidth, pageHeight, currentPage, totalPages) {
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