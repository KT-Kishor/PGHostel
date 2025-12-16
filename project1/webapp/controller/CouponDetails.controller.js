sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
    "../model/formatter",
    "../utils/validation",
    "sap/m/MessageToast"
], function (BaseController, JSONModel, Fragment, MessageBox, Spreadsheet, exportLibrary, Formatter, utils, MessageToast) {
    "use strict";
    var EdmType = exportLibrary.EdmType;
    return BaseController.extend("sap.ui.com.project1.controller.CouponDetails", {
        Formatter: Formatter,
        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteCouponDetails").attachPatternMatched(this._onRouteMatched, this);
            // View model for dialog state
            var oViewModel = new JSONModel({
                DialogMode: "Add",        // "Add" or "Edit"
                CurrentCoupon: {}         // bound to dialog
            });
            this.getView().setModel(oViewModel, "CouponView");
        },
        onHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },
        _onRouteMatched: function () {
            const oLoginModel = this.getOwnerComponent().getModel("LoginModel");
            if (oLoginModel) {
                this.getView().setModel(oLoginModel, "LoginModel");
            }
            this._loadCoupons();
            this._loadRecipientContacts();
            this._loadBranchCode();
        },
        _loadBranchCode: async function () {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();

               let aBranchCodes = [];

            if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode
                    .split(",")
                    .map(code => code.trim());
            }

            let filters = {};

            if (oExistingModel.Role !== "") {
                filters = { BranchID: aBranchCodes };
            }
            try {
                const oView = this.getView();
                const oResponse = await this.ajaxReadWithJQuery("HM_Branch", filters);
                const aBranches = Array.isArray(oResponse?.data) ? oResponse.data : (oResponse?.data ? [oResponse.data] : []);
                const oBranchModel = new sap.ui.model.json.JSONModel(aBranches);
                oView.setModel(oBranchModel, "sBRModel");
            } catch (err) {
                console.error("Error while loading branch data:", err);
            }
        },
        _loadCoupons: async function () {
        const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
             let aBranchCodes = [];

            if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode
                    .split(",")
                    .map(code => code.trim());
            }

            let filters = {};

            if (oExistingModel.Role !== "") {
                filters = { BranchCode: aBranchCodes };
            }
            var oView = this.getView();
            var oTable = oView.byId("couponTable");
            try {
                this._showTableRowsBusy(true);
                var result = await this.ajaxReadWithJQuery("HM_Coupon", filters);
                var aCoupons;
                if (Array.isArray(result.data)) aCoupons = result.data;
                else if (result.data) aCoupons = [result.data];
                else aCoupons = [];
                aCoupons = aCoupons.map(function (c) {
                    if (c.StartDate) c.StartDate = c.StartDate.substring(0, 10);
                    if (c.EndDate) c.EndDate = c.EndDate.substring(0, 10);
                    if (c.CreatedAt && c.CreatedAt.includes("T")) {
                        c.CreatedAt = c.CreatedAt.replace("T", " ").substring(0, 19);
                    }
                    // 🔥 Explicit priority for grouping/sorting
                    var mPriority = {
                        "Active": 1,
                        "Inactive": 2,
                        "Expired": 3
                    };
                    c.StatusOrder = mPriority[c.Status] || 99;
                    return c;
                });
                var oModel = new JSONModel(aCoupons);
                oView.setModel(oModel, "CouponModel");
                var oBinding = oTable.getBinding("items");
                var aSorters = [
                    // 1️⃣ Group and order by StatusOrder (1 → 2 → 3)
                    new sap.ui.model.Sorter("StatusOrder", false, function (oContext) {
                        var sStatus = oContext.getProperty("Status");
                        var iOrder = oContext.getProperty("StatusOrder");
                        return {
                            key: iOrder,                 // used for group ordering
                            text: sStatus + " Coupons"    // what user sees
                        };
                    }),
                    // 2️⃣ Inside each status group → oldest EndDate first
                    new sap.ui.model.Sorter("EndDate", false),
                    // 3️⃣ Tie-breaker → higher DiscountValue first
                    new sap.ui.model.Sorter("DiscountValue", true)
                ];
                oBinding.sort(aSorters);
            } catch (err) {
                MessageBox.error(
                    err?.responseJSON?.message || "Failed to load coupons (HM_Coupon)."
                );
            } finally {
                // oTable.setBusy(false);
                this._showTableRowsBusy(false);
            }
        },
        createGroupHeader: function (oGroup) {
            return new sap.m.GroupHeaderListItem({
                title: oGroup.text,
                uppercase: false
            });
        },
        onNavBack: function () {
            var oHistory = sap.ui.core.routing.History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("TilePage", {}, true);
            }
        },
        onAddCoupon: function () {
            var oViewModel = this.getView().getModel("CouponView");
            oViewModel.setProperty("/DialogMode", "Add");
            // ✅ Blank model → placeholders only
            oViewModel.setProperty("/CurrentCoupon", {
                DiscountType: "",
                DiscountValue: "",
                MaxUses: "",
                // UsedCount: "",
                // PerUserLimit: "",
                MinOrderValue: "",
                StartDate: "",
                EndDate: "",
                Status: "",
                BranchCode: ""
            });
            this._openCouponDialog();
        },
        onEditCoupon: function () {
            var oTable = this.getView().byId("couponTable");
            var oItem = oTable.getSelectedItem();
            var aSel = oTable.getSelectedItems();
            if (!aSel || aSel.length !== 1) {
                MessageToast.show("Please select one coupon to edit");
                return;
            }
            var oItem = aSel[0];   // safe to use
            var oCtx = oItem.getBindingContext("CouponModel");
            var oData = Object.assign({}, oCtx.getObject());
            var oViewModel = this.getView().getModel("CouponView");
            oViewModel.setProperty("/DialogMode", "Edit");
            oViewModel.setProperty("/CurrentCoupon", oData);
            this._openCouponDialog();
        },
        onDeleteCoupon: async function () {
            var oTable = this.getView().byId("couponTable");
            var aSelectedItems = oTable.getSelectedItems();
            if (!aSelectedItems.length) {
                MessageToast.show("Please select at least one coupon to delete.");
                return;
            }
            MessageBox.confirm(
                `Delete ${aSelectedItems.length} selected coupon(s)?`,
                {
                    icon: MessageBox.Icon.WARNING,
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.NO,
                    onClose: async function (sAction) {
                        if (sAction !== MessageBox.Action.YES) return;
                        sap.ui.core.BusyIndicator.show(0);
                        try {
                            for (let oItem of aSelectedItems) {
                                let oCtx = oItem.getBindingContext("CouponModel");
                                let oData = oCtx.getObject();
                                await this.ajaxDeleteWithJQuery("HM_Coupon", {
                                    filters: {
                                        CouponId: oData.CouponId    // ✅ SAFE ROW-LEVEL DELETE
                                    }
                                });
                            }
                            MessageToast.show("Selected coupons deleted successfully.");
                            this._loadCoupons();
                        } catch (err) {
                            console.error("Delete failed:", err);
                            MessageBox.error("Error while deleting coupons.");
                        } finally {
                            sap.ui.core.BusyIndicator.hide();
                            oTable.removeSelections(true);
                        }
                    }.bind(this)
                }
            );
        },
        onDownloadCoupons: function () {
            var oTable = this.getView().byId("couponTable");
            var oBinding = oTable.getBinding("items");
            if (!oBinding || !oBinding.getLength || oBinding.getLength() === 0) {
                MessageBox.info("No coupons available to download.");
                return;
            }
            var aCols = this._createColumnConfig();
            var oSettings = {
                workbook: {
                    columns: aCols
                },
                dataSource: oBinding,
                fileName: "Coupons.xlsx"
            };
            var oSheet = new Spreadsheet(oSettings);
            oSheet.build()
                .then(function () {
                    oSheet.destroy();
                })
                .catch(function () {
                    oSheet.destroy();
                });
        },
        _createColumnConfig: function () {
            return [
                { label: "Discount Type", property: "DiscountType", type: EdmType.String },
                { label: "Discount Value", property: "DiscountValue", type: EdmType.Number },
                { label: "Max Uses", property: "MaxUses", type: EdmType.Number },
                { label: "Used Count", property: "UsedCount", type: EdmType.Number },
                { label: "Per User Limit", property: "PerUserLimit", type: EdmType.Number },
                { label: "Min Order Value", property: "MinOrderValue", type: EdmType.Number },
                { label: "Start Date", property: "StartDate", type: EdmType.String },
                { label: "End Date", property: "EndDate", type: EdmType.String },
                { label: "Status", property: "Status", type: EdmType.String },
                { label: "Created At", property: "CreatedAt", type: EdmType.String },
                { label: "Created By", property: "CreatedBy", type: EdmType.String }
            ];
        },
        _openCouponDialog: async function () {
            var oView = this.getView();
            if (!this._oCouponDialog) {
                this._oCouponDialog = await Fragment.load({
                    id: oView.getId(),
                    name: "sap.ui.com.project1.fragment.CouponDialog",
                    controller: this
                });
                oView.addDependent(this._oCouponDialog);
                // make DatePickers readonly (no manual typing)
                var sViewId = oView.getId();
                this._FragmentDatePickersReadOnly([
                    sViewId + "--dpStartDate",
                    sViewId + "--dpEndDate"
                ]);
                // ✅ single source of truth for cleanup
                this._oCouponDialog.attachAfterClose(function () {
                    this._clearTableSelection();
                }.bind(this));
            }
            this._oCouponDialog.open();
        },
        _showTableRowsBusy: function (bBusy) {
            var oTable = this.byId("couponTable");
            var oDom = oTable.$().find(".sapMListItems").get(0);
            if (!oDom) return;
            if (bBusy) {
                sap.ui.core.BusyIndicator.show(0, { domRef: oDom });
            } else {
                sap.ui.core.BusyIndicator.hide();
            }
        },
        onSaveCoupon: async function () {
            var oView = this.getView();
            var oVM = oView.getModel("CouponView");
            var sMode = oVM.getProperty("/DialogMode");
            var oCoupon = Object.assign({}, oVM.getProperty("/CurrentCoupon"));
            let bValid =
                utils._LCstrictValidationComboBox(
                    sap.ui.getCore().byId(oView.createId("cbBranchCode")), "ID"
                )
                &&
                utils._LCstrictValidationComboBox(
                    sap.ui.getCore().byId(oView.createId("cbDiscountType")), "ID"
                ) &&
                utils._LCvalidateMandatoryField(
                    sap.ui.getCore().byId(oView.createId("inDiscountValue")), "ID"
                ) &&
                utils._LCvalidateMandatoryField(
                    sap.ui.getCore().byId(oView.createId("inMaxUses")), "ID"
                ) &&
                utils._LCvalidateMandatoryField(
                    sap.ui.getCore().byId(oView.createId("inMinOrderValue")), "ID"
                ) &&
                (
                    sMode === "Add" ||
                    utils._LCstrictValidationComboBox(
                        sap.ui.getCore().byId(oView.createId("cbStatus")), "ID"
                    )
                ) &&
                utils._LCvalidateMandatoryField(
                    sap.ui.getCore().byId(oView.createId("dpStartDate")), "ID"
                ) &&
                utils._LCvalidateMandatoryField(
                    sap.ui.getCore().byId(oView.createId("dpEndDate")), "ID"
                );
            if (!bValid) {
                MessageToast.show("Please fill all mandatory fields correctly.");
                return;
            }
            let dStart = new Date(oVM.getProperty("/CurrentCoupon/StartDate"));
            let dEnd = new Date(oVM.getProperty("/CurrentCoupon/EndDate"));
            if (dEnd < dStart) {
                MessageToast.show("End Date cannot be less than Start Date");
                return;
            }
            if (sMode === "Add") {
                oCoupon.Status = "Active";
            }
            sap.ui.core.BusyIndicator.show(0);
            try {
                if (sMode === "Add") {
                    oCoupon.CreatedAt = new Date()
                        .toISOString()
                        .slice(0, 19)
                        .replace("T", " ");
                    oCoupon.CreatedBy =
                        oView.getModel("LoginModel")
                            ?.getProperty("/EmployeeName") || "system";
                    await this.ajaxCreateWithJQuery("HM_Coupon", {
                        data: oCoupon
                    });
                    MessageToast.show("Coupon created successfully.");
                } else {
                    if (!oCoupon.CouponId) {
                        MessageBox.error("Update failed: CouponId missing.");
                        return;
                    }
                    await this.ajaxUpdateWithJQuery("HM_Coupon", {
                        filters: {
                            CouponId: oCoupon.CouponId
                        },
                        data: {
                            DiscountType: oCoupon.DiscountType,
                            DiscountValue: oCoupon.DiscountValue,
                            //MaxUses: oCoupon.MaxUses,
                            //erLimit: oCoupon.PerUserLimit,
                            BranchCode: oCoupon.BranchCode,
                            StartDate: oCoupon.StartDate,
                            EndDate: oCoupon.EndDate,
                            MinOrderValue: oCoupon.MinOrderValue,
                            Status: oCoupon.Status,
                            CreatedAt: oCoupon.CreatedAt,
                            CreatedBy:
                                oView.getModel("LoginModel")
                                    ?.getProperty("/EmployeeName") || oCoupon.CreatedBy
                        }
                    });
                    MessageToast.show("Coupon updated successfully.");
                }
                this._oCouponDialog.close();
                this._clearTableSelection();
                this._loadCoupons();
            } catch (err) {
                MessageBox.error(
                    err?.responseJSON?.message || "Failed to save coupon."
                );
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },
        onDialogAfterClose: function () {
            const oVM = this.getView().getModel("CouponView");
            // Reset model
            oVM.setProperty("/CurrentCoupon", {
                DiscountType: "",
                DiscountValue: "",
                MaxUses: "",
                MinOrderValue: "",
                StartDate: "",
                EndDate: "",
                Status: "",
                BranchCode: ""
            });
            // Clear validation & fields
            this._resetDialogValueStates();
            // Clear table selections
            this._clearTableSelection();
        },
        _resetDialogValueStates: function () {
            const oView = this.getView();
            const aFieldIds = [
                "cbDiscountType",
                "inDiscountValue",
                "inMaxUses",
                "inMinOrderValue",
                "cbStatus",
                "dpStartDate",
                "dpEndDate",
                "cbBranchCode"
            ];
            aFieldIds.forEach(id => {
                const oCtrl = sap.ui.getCore().byId(oView.createId(id));
                if (oCtrl) {
                    oCtrl.setValueState(sap.ui.core.ValueState.None);
                    oCtrl.setValueStateText("");
                }
            });
        },

        onCouponSearch: async function () {

            try {
                sap.ui.core.BusyIndicator.show(0);

                const aItems = this.byId("couponFilterBar").getFilterGroupItems();
                const params = {};

                let sStartDate = "";
                let sEndDate = "";

                aItems.forEach(item => {

                    const ctrl = item.getControl();
                    const key = item.getName();

                    if (!ctrl) return;

                    switch (key) {

                        case "Status":
                        case "DiscountType":
                        case "BranchCode":
                            params[key] = ctrl.getSelectedKey?.() || "";
                            break;

                        case "EndDateRange": {

                            const dFrom = ctrl.getDateValue();
                            const dTo = ctrl.getSecondDateValue();

                            if (dFrom && dTo) {
                                sStartDate = dFrom.toISOString().split("T")[0];
                                sEndDate = dTo.toISOString().split("T")[0];
                            }
                            break;
                        }
                    }
                });

                // ✅ ONLY two date params sent — backend contract respected
                const oResult = await this.ajaxReadWithJQuery("HM_Coupon", {
                    ...params,
                    StartDate: sStartDate,
                    EndDate: sEndDate
                });

                const aData = this._normalizeCouponResult(oResult);

                this.getView()
                    .getModel("CouponModel")
                    .setData(aData);

            }
            catch (err) {

                sap.m.MessageBox.error(
                    err?.responseJSON?.message ||
                    err?.message ||
                    "Failed to filter coupons."
                );

            }
            finally {

                sap.ui.core.BusyIndicator.hide();
            }
        },
        _normalizeCouponResult: function (oResult) {
            let aData = Array.isArray(oResult?.data)
                ? oResult.data
                : (oResult?.data ? [oResult.data] : []);

            const mPriority = {
                Active: 1,
                Inactive: 2,
                Expired: 3
            };

            return aData.map(c => ({
                ...c,
                StartDate: c.StartDate?.slice(0, 10),
                EndDate: c.EndDate?.slice(0, 10),
                CreatedAt: c.CreatedAt?.replace("T", " ").slice(0, 19),
                StatusOrder: mPriority[c.Status] || 99
            }));
        },


        onClearCoupons: function () {
            this.byId("fStatus").setSelectedKey("");
            this.byId("fDiscountType").setSelectedKey("");
            this.byId("fBranch").setSelectedKey("");
            var oRange = this.byId("fEndRange");
            // ✅ Fully reset date range
            oRange.setValue("");
            oRange.setDateValue(null);
            oRange.setSecondDateValue(null);
        },
        // ===== Discount Type (STRICT combo) =====
        onChange_DiscountType: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent);
        },
        // ===== Discount Value (PERCENT vs FIXED logic) =====
        onLiveChange_DiscountValue: function (oEvent) {
            const oInput = oEvent.getSource();
            const sValue = oInput.getValue().trim();
            const sType = sap.ui.getCore()
                .byId(this.getView().createId("cbDiscountType"))
                .getSelectedKey();
            // Must have discount type selected first
            if (!sType) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText("Select Discount Type first");
                return;
            }
            // Only digits + optional decimal
            if (!/^\d+(\.\d+)?$/.test(sValue)) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText("Only numbers allowed");
                return;
            }
            const fVal = parseFloat(sValue);
            if (sType === "Percentage") {
                // ✅ Validate 1 – 100
                if (fVal <= 0 || fVal > 100) {
                    oInput.setValueState(sap.ui.core.ValueState.Error);
                    oInput.setValueStateText("Percentage must be between 1 and 100");
                    return;
                }
            } else {
                // ✅ Validate currency amount
                if (fVal <= 0) {
                    oInput.setValueState(sap.ui.core.ValueState.Error);
                    oInput.setValueStateText("Amount must be greater than 0");
                    return;
                }
            }
            // ✅ Clear error when valid
            oInput.setValueState(sap.ui.core.ValueState.None);
        },
        // ===== All numeric fields =====
        onLiveChange_Number_MinOne: function (oEvent) {
            const oInput = oEvent.getSource();
            const sValue = oInput.getValue().trim();
            if (!/^\d*$/.test(sValue)) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText("Only numbers allowed");
                return;
            }
            const iVal = parseInt(sValue, 10);
            if (isNaN(iVal) || iVal < 1) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText("Value must be at least 1");
                return;
            }
            oInput.setValueState(sap.ui.core.ValueState.None);
        },
        onLiveChange_Number_AllowZero: function (oEvent) {
            const oInput = oEvent.getSource();
            const sValue = oInput.getValue().trim();
            if (!/^\d*$/.test(sValue)) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText("Only numbers allowed");
                return;
            }
            const iVal = parseInt(sValue, 10);
            if (isNaN(iVal) || iVal < 0) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText("Value must be 0 or more");
                return;
            }
            oInput.setValueState(sap.ui.core.ValueState.None);
        },
        onLiveChange_MinAmount: function (oEvent) {
            utils._LCvalidateAmount(oEvent);
        },
        onChange_Status: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent);
        },
        onChange_Date: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },
        _clearTableSelection: function () {
            var oTable = this.byId("couponTable");
            if (oTable) {
                oTable.removeSelections(true);
            }
        },
        onDialogClose: function () {
            if (this._oCouponDialog) {
                this._oCouponDialog.close();
            }
        },
        ///
        // async _loadRecipientContacts() {
        //     const oData = await this.ajaxReadWithJQuery("HM_CustomerContact", {});
        //     const aContacts = (oData?.data || []).map(c => ({
        //         UserName: c.UserName,
        //         Role: c.Role,
        //         Email: c.EmailID,
        //         BranchId: c.BranchId,
        //         BranchCode: c.BranchCode
        //     }));
        //     this._aAllRecipients = aContacts;
        //     // 🔹 1) Get how many rows we actually have
        //     const iLength = aContacts.length;
        //     const iSizeLimit = Math.min(Math.max(iLength, 100), 2000);
        //     // 🔹 3) Create model and apply dynamic size limit
        //     const oRecipientModel = new JSONModel(aContacts);
        //     oRecipientModel.setSizeLimit(iSizeLimit);
        //     console.log("Recipients:", iLength, "SizeLimit:", iSizeLimit);
        //     this.getView().setModel(oRecipientModel, "RecipientModel");
        //     // Roles (unchanged)
        //     const aRoles = [...new Set(aContacts.map(c => c.Role))];
        //     this.getView().setModel(new JSONModel(aRoles), "RoleModel");
        //     return aContacts;
        // },

        async _loadRecipientContacts() {
            try {
                sap.ui.core.BusyIndicator.show(0);

                const oData = await this.ajaxReadWithJQuery("HM_CustomerContact", {});
                const aContacts = (oData?.data || []).map(c => ({
                    UserName: c.UserName,
                    Role: c.Role,
                    Email: c.EmailID,
                    BranchId: c.BranchId,
                    BranchCode: c.BranchCode
                }));

                this._aAllRecipients = aContacts;

                const iLength = aContacts.length;
                const iSizeLimit = Math.min(Math.max(iLength, 100), 2000);

                const oRecipientModel = new JSONModel(aContacts);
                oRecipientModel.setSizeLimit(iSizeLimit);
                this.getView().setModel(oRecipientModel, "RecipientModel");

                const aRoles = [...new Set(aContacts.map(c => c.Role))];
                this.getView().setModel(new JSONModel(aRoles), "RoleModel");

                return aContacts;

            } catch (err) {

                sap.m.MessageBox.error(
                    err?.responseJSON?.message || "Failed to load contacts."
                );
                return [];

            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },


 
        onShareCoupon: async function () {
            const oTable = this.byId("couponTable");
            const aSel = oTable ? oTable.getSelectedItems() : [];
            if (!aSel || aSel.length !== 1) {
                MessageToast.show("Select one coupon to share.");
                return;
            }
            this._oCouponToShare =
                aSel[0].getBindingContext("CouponModel").getObject();
            const aRecipients = this._aAllRecipients || [];
            if (!aRecipients.length) {
                MessageToast.show("No contacts found.");
                return;
            }
            if (!this._oShareDialog) {
                const oView = this.getView();
                this._oShareDialog = await Fragment.load({
                    id: oView.getId(),
                    name: "sap.ui.com.project1.fragment.CouponShare",
                    controller: this
                });
                oView.addDependent(this._oShareDialog);
            }
            this._oShareDialog.open();
        },
        onRoleChange: function (e) {
            const sRole = e.getSource().getSelectedKey();
            const aUsers = this._aAllRecipients
                .filter(r => r.Role === sRole);
            this.getView()
                .getModel("RecipientModel")
                .setData(aUsers);
            // Reset user selection after role switch
            this.byId("cbUser").setSelectedKeys([]);
        },
        onConfirmShareCoupon: async function () {

            const oView = this.getView();
            const oRole = sap.ui.getCore().byId(oView.createId("cbRole"));
            const oMCB = sap.ui.getCore().byId(oView.createId("cbUser"));
            const oMail = sap.ui.getCore().byId(oView.createId("inpManualEmail"));

            if (!utils._LCstrictValidationComboBox(oRole, "ID")) {
                MessageToast.show("Please select a valid Role");
                return;
            }

            const sEmails = oMail.getValue().trim();
            if (sEmails && !utils._LCvalidateEmail(oMail, "ID")) {
                MessageToast.show("Please enter valid email address(es)");
                return;
            }

            const bHasRecipients = oMCB.getSelectedKeys().length > 0;
            if (!bHasRecipients && !sEmails) {
                MessageToast.show("Select at least one user or enter manual email");
                return;
            }

            const c = this._oCouponToShare;
            const aUsers = [];

            // MultiComboBox selections
            oMCB.getSelectedItems().forEach(item => {
                aUsers.push({
                    UserName: item.getText(),
                    toEmailID: item.getAdditionalText(),
                    COUPONNUMBER: c.CouponCode,
                    StartDate: c.StartDate,
                    EndDate: c.EndDate,
                    MinOrderValue: c.MinOrderValue,
                    PerUserLimit: c.PerUserLimit
                });
            });

            // Manual emails
            if (sEmails) {
                sEmails.split(/[,;]+/).forEach(email => {
                    email = email.trim();
                    if (!email) return;
                    aUsers.push({
                        UserName: "Customer",
                        toEmailID: email,
                        COUPONNUMBER: c.CouponCode,
                        StartDate: c.StartDate,
                        EndDate: c.EndDate,
                        MinOrderValue: c.MinOrderValue,
                        PerUserLimit: c.PerUserLimit
                    });
                });
            }

            if (!aUsers.length) {
                MessageToast.show("No valid recipients found");
                return;
            }

            try {
                sap.ui.core.BusyIndicator.show(0);

                await this.ajaxCreateWithJQuery("CouponCodeEmail", { users: aUsers });
                MessageToast.show("Coupons sent");
                this._oShareDialog.close();

            } catch (err) {

                sap.m.MessageBox.error(
                    err?.responseJSON?.message || "Failed to send coupon."
                );

            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },


        // onConfirmShareCoupon: async function () {
        //     const oView = this.getView();
        //     const oRole = sap.ui.getCore().byId(oView.createId("cbRole"));
        //     const oMCB = sap.ui.getCore().byId(oView.createId("cbUser"));
        //     const oMail = sap.ui.getCore().byId(oView.createId("inpManualEmail"));
        //     if (!utils._LCstrictValidationComboBox(oRole, "ID")) {
        //         MessageToast.show("Please select a valid Role");
        //         return;
        //     }
        //     const sEmails = oMail.getValue().trim();
        //     if (sEmails && !utils._LCvalidateEmail(oMail, "ID")) {
        //         MessageToast.show("Please enter valid email address(es)");
        //         return;
        //     }
        //     const bHasRecipients = oMCB.getSelectedKeys().length > 0;
        //     if (!bHasRecipients && !sEmails) {
        //         MessageToast.show("Select at least one user or enter manual email");
        //         return;
        //     }
        //     const c = this._oCouponToShare;
        //     const aUsers = [];
        //     // MultiComboBox selections
        //     oMCB.getSelectedItems().forEach(item => {
        //         aUsers.push({
        //             UserName: item.getText(),
        //             toEmailID: item.getAdditionalText(),
        //             COUPONNUMBER: c.CouponCode,
        //             StartDate: c.StartDate,
        //             EndDate: c.EndDate,
        //             MinOrderValue: c.MinOrderValue,
        //             PerUserLimit: c.PerUserLimit
        //         });
        //     });
        //     // Manual emails
        //     if (sEmails) {
        //         sEmails.split(/[,;]+/).forEach(email => {
        //             email = email.trim();
        //             if (!email) return;
        //             aUsers.push({
        //                 UserName: "Customer",
        //                 toEmailID: email,
        //                 COUPONNUMBER: c.CouponCode,
        //                 StartDate: c.StartDate,
        //                 EndDate: c.EndDate,
        //                 MinOrderValue: c.MinOrderValue,
        //                 PerUserLimit: c.PerUserLimit
        //             });
        //         });
        //     }
        //     if (!aUsers.length) {
        //         MessageToast.show("No valid recipients found");
        //         return;
        //     }
        //     await this.ajaxCreateWithJQuery("CouponCodeEmail", { users: aUsers });
        //     MessageToast.show("Coupons sent");
        //     this._oShareDialog.close();
        // },
        onCloseShareDialog: function () {
            this._oShareDialog.close();
        },
        onRoleLiveChange: function (e) {
            utils._LCstrictValidationComboBox(e);
        },
        onUserSelectionChange: function () {
            const oMCB = this.byId("cbUser");
            const bValid = oMCB.getSelectedKeys().length > 0;
            if (!bValid) {
                oMCB.setValueState("Error");
                oMCB.setValueStateText("Select at least one recipient or enter manual email");
            } else {
                oMCB.setValueState("None");
            }
        },
        onManualEmailLiveChange: function (e) {
            const oInput = e.getSource();
            const sVal = oInput.getValue().trim();
            if (!sVal) {
                oInput.setValueState("None");
                return;
            }
            utils._LCvalidateEmail(e);
        },
        onShareDialogAfterClose: function () {
            const oView = this.getView();
            const oRole = sap.ui.getCore().byId(oView.createId("cbRole"));
            const oMCB = sap.ui.getCore().byId(oView.createId("cbUser"));
            const oMail = sap.ui.getCore().byId(oView.createId("inpManualEmail"));
            if (oRole) {
                oRole.setSelectedKey("");
                oRole.setValue("");
                oRole.setValueState("None");
            }
            if (oMCB) {
                oMCB.setSelectedKeys([]);
                oMCB.setValueState("None");
            }
            if (oMail) {
                oMail.setValue("");
                oMail.setValueState("None");
            }
            if (
                this._aAllRecipients &&
                this.getView().getModel("RecipientModel") &&
                this.getView().getModel("RecipientModel").getData().length !== this._aAllRecipients.length
            ) {
                this.getView()
                    .getModel("RecipientModel")
                    .setData(this._aAllRecipients);
            }
            const oVM = oView.getModel("CouponView");
            if (oVM) {
                oVM.setProperty("/SelectedUsers", []);
            }
            this._clearTableSelection();
            this._oCouponToShare = null;
        },
    });
});
