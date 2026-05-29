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
        _isDateRangeCleared: false,

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteCouponDetails").attachPatternMatched(this._onRouteMatched, this);
            // View model for dialog state
            var oViewModel = new JSONModel({
                DialogMode: "Add",        // "Add" or "Edit"
                CurrentCoupon: {}
                // bound to dialog
            });
            this.getView().setModel(oViewModel, "CouponView");
            if (!this.getView().getModel("CouponModel")) {
                this.getView().setModel(new JSONModel([]), "CouponModel");
            }
            this.getView().setModel(new JSONModel({
                DialogMode: "Add",
                CurrentCoupon: {},
                isUptoEnabled: false,
                isReq: false,
                DiscountValueLabel: "Discount Value"
            }), "CouponView");

        },
        _buildBranchMap: function () {
            const aBranches = this.getView().getModel("Branchmodel").getData() || [];
            this._branchMap = {};

            aBranches.forEach(b => {
                this._branchMap[b.BranchID] = b.Name;
            });
        },

        onHome: function () {
            this.getView().getModel("CouponModel").setData({});
            this.CommonLogoutFunction();
        },

        _onRouteMatched: async function () {
            var LoginFUnction = await this.commonLoginFunction("ManageCoupon");
            if (!LoginFUnction) return;


            // 🔑 Bind LoginModel to the view (same pattern as other controller)
            const oLoginModel = this.getOwnerComponent().getModel("LoginModel");
            if (oLoginModel) {
                this.getView().setModel(
                    new sap.ui.model.json.JSONModel(oLoginModel.getData()),
                    "LoginModel"
                );
                this._oLoggedInUser = oLoginModel.getData();
            } else {
                this._oLoggedInUser = {};
            }
            console.log("this._oLoggedInUser", this._oLoggedInUser);
            this.onClearAndSearch("couponFilterBar");
            await this._loadBranchCode();
            this._buildBranchMap();
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            const sBRModel = this.getView().getModel("Branchmodel").getData();

            this._allowedBranches = sBRModel
                .map(item => item.BranchID)
                .join(",");
            // fire-and-forget background load
            this._loadRecipientContacts();

            const { fyStart, fyEnd } = this._getFinancialYearDates();
            const oRange = this.byId("fEndRange");

            oRange.setDateValue(fyStart);
            oRange.setSecondDateValue(fyEnd);
            this._isDateRangeCleared = false;


            // single visible data load
            await this.onCouponSearch();
        },

        onCouponSearch: async function () {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();

            try {
                this.getBusyDialog()
                const oFilterBar = this.byId("couponFilterBar");
                const aItems = oFilterBar.getFilterGroupItems();
                const oRange = this.byId("fEndRange");

                const params = {};

                // ================= Branch Logic =================
                params.BranchCode = this._allowedBranches;

                if (oExistingModel.Role === "Admin") {
                    params.Role = "Admin";
                } else if (oExistingModel.Role === "SuperAdmin") {
                    params.BranchCode = "";
                } else {
                    params.BranchCode = oExistingModel.BranchCode;
                }

                // ================= Date Format =================
                const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                    pattern: "yyyy-MM-dd"
                });

                const oStartDate = oRange.getDateValue();
                const oEndDate = oRange.getSecondDateValue();

                let sStartDate, sEndDate;

                // ================= Date Handling =================
                if (this._isDateRangeCleared === true) {
                    // Clear → fetch all data
                    delete params.StartDate;
                    delete params.EndDate;
                    this._isDateRangeCleared = false;
                } else if (oStartDate && oEndDate) {
                    // User selected date range
                    sStartDate = oDateFormat.format(oStartDate);
                    sEndDate = oDateFormat.format(oEndDate);

                } else {
                    // Default → Financial Year
                    const { fyStart, fyEnd } = this._getFinancialYearDates();

                    sStartDate = oDateFormat.format(fyStart);
                    sEndDate = oDateFormat.format(fyEnd);

                    // Sync UI
                    oRange.setDateValue(fyStart);
                    oRange.setSecondDateValue(fyEnd);
                }

                if (sStartDate && sEndDate) {
                    params.StartDate = sStartDate;
                    params.EndDate = sEndDate;
                }

                // ================= Other Filters =================
                aItems.forEach(item => {
                    const ctrl = item.getControl();
                    const key = item.getName();
                    if (!ctrl) return;

                    switch (key) {

                        case "Status":
                        case "DiscountType": {
                            const val = ctrl.getSelectedKey?.();
                            if (val) params[key] = val;
                            break;
                        }

                        case "BranchCode": {
                            const sValue = ctrl.getValue()?.trim();
                            const sSelectedKey = ctrl.getSelectedKey();

                            // 🟢 Case 1: user did NOT touch the field at all
                            if (!sValue && !sSelectedKey) {
                                // keep default allowed branches
                                break;
                            }

                            // 🔴 Case 3: user typed something but did NOT select a valid branch
                            if (sValue && !sSelectedKey) {
                                params.BranchCode = "__INVALID__"; // force no data
                                break;
                            }

                            // 🟢 Case 2: valid branch selected
                            if (this._allowedBranches?.split(",").includes(sSelectedKey)) {
                                params.BranchCode = sSelectedKey;
                            } else {
                                params.BranchCode = "__INVALID__";
                            }
                            break;
                        }
                    }
                });

                // ================= API Call =================
                const oResult = await this.ajaxReadWithJQuery("HM_Coupon", params);

                const aData = this._normalizeCouponResult(oResult);
                this.getView().getModel("CouponModel").setData(aData);
                this._applyCouponGroupingAndSorting();

                // ======== Branch Name ========

                aData.forEach(coupon => {
                    coupon.BranchName = this._branchMap[coupon.BranchCode] || "-";
                });

                this.getView().getModel("CouponModel").setData(aData);


            } catch (err) {
                sap.m.MessageBox.error(
                    err?.responseJSON?.message ||
                    err?.message ||
                    "Failed to filter coupons."
                );
            } finally {
                this.closeBusyDialog()
            }
        },

        _getFinancialYearDates: function () {
            const now = new Date();
            const currentYear = now.getFullYear();

            let fyStart, fyEnd;

            // FY = April 1 → March 31
            if (now.getMonth() >= 3) {
                fyStart = new Date(currentYear, 3, 1);      // April 1 (this year)
                fyEnd = new Date(currentYear + 1, 2, 31); // March 31 (next year)
            } else {
                fyStart = new Date(currentYear - 1, 3, 1);  // April 1 (last year)
                fyEnd = new Date(currentYear, 2, 31);     // March 31 (this year)
            }

            fyStart.setHours(0, 0, 0, 0);
            fyEnd.setHours(0, 0, 0, 0);

            return { fyStart, fyEnd };
        },

        _loadBranchCode: async function () {
            this.getBusyDialog()

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
            }
            if (oExistingModel.Role === "Admin") {
                filters.BranchID = aBranchCodes;
                filters.Role = "Admin";
            } else if (oExistingModel.Role === "SuperAdmin") {
                filters.BranchID = "";
            } else {
                filters.BranchID = oExistingModel.BranchCode;
            }
            try {
                const oView = this.getView();
                const oResponse = await this.ajaxReadWithJQuery("HM_BranchData", filters);
                const aBranches = Array.isArray(oResponse?.data) ? oResponse.data : (oResponse?.data ? [oResponse.data] : []);
                const oBranchModel = new sap.ui.model.json.JSONModel(aBranches);
                oView.setModel(oBranchModel, "Branchmodel");
            } catch (err) {
                console.error("Error while loading branch data:", err);
            }
        },

        _syncBranchInEditMode: function () {
            const oView = this.getView();
            const oVM = oView.getModel("CouponView");
            const sBranchCode = oVM.getProperty("/CurrentCoupon/BranchCode");

            if (!sBranchCode) return;

            const oBranchCB = sap.ui.getCore().byId(
                oView.createId("cbBranchCode")
            );
            if (!oBranchCB) return;

            const aItems = oBranchCB.getItems();
            const oMatch = aItems.find(item => {
                const oCtx = item.getBindingContext("Branchmodel");
                if (!oCtx) return false;

                const oBranch = oCtx.getObject();
                return (
                    oBranch.BranchCode === sBranchCode ||
                    oBranch.BranchID === sBranchCode
                );
            });

            if (oMatch) {
                oBranchCB.setSelectedItem(oMatch);
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
            this.getView().getModel("CouponModel").setData({});

        },

        onAddCoupon: function () {
            var oViewModel = this.getView().getModel("CouponView");
            oViewModel.setProperty("/DialogMode", "Add");
            // ✅ Blank model → placeholders only
            oViewModel.setProperty("/CurrentCoupon", {
                CouponCode: "",
                DiscountType: "",
                DiscountValue: "",
                UptoValue: "",
                Description: "",
                MaxUses: "",
                // UsedCount: "",
                // PerUserLimit: "",
                MinOrderValue: "",
                StartDate: "",
                EndDate: "",
                Status: "",
                BranchCode: ""
            });
            oViewModel.setProperty("/isUptoEnabled", false);
            oViewModel.setProperty("/isReq", false);
            oViewModel.setProperty("/CurrentCoupon/UptoValue", "");

            this._openCouponDialog();
        },

        onEditCoupon: function () {
            var oTable = this.getView().byId("couponTable");
            var oItem = oTable.getSelectedItem();
            var aSel = oTable.getSelectedItems();
            if (!aSel || aSel.length !== 1) {
                MessageToast.show(this.i18nModel.getText("pleaseselectonecoupontoedit"));
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
                MessageToast.show(this.i18nModel.getText("pleaseselectatleastonecoupontodelete"));
                return;
            }

            const aCouponCodes = aSelectedItems.map(oItem => oItem.getBindingContext("CouponModel")?.getObject()?.CouponCode).filter(Boolean);

            const sLabel = aCouponCodes.length === 1 ? "Coupon Code" : "Coupon Codes";

            const sCouponText = aCouponCodes.join(", ");
            MessageBox.confirm(
                `Are you sure you want to delete the following ${sLabel}?\n\n ${sLabel}: ${sCouponText}`,
                {
                    icon: MessageBox.Icon.WARNING,
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.NO,
                    styleClass: "myUnifiedBtn",
                    onClose: async function (sAction) {

                        // ✅ ALWAYS clear selection (YES or NO)
                        oTable.removeSelections(true);

                        if (sAction !== MessageBox.Action.YES) {
                            return;
                        }

                        this.getBusyDialog()
                        try {
                            for (let oItem of aSelectedItems) {
                                const oCtx = oItem.getBindingContext("CouponModel");
                                const oData = oCtx.getObject();

                                await this.ajaxDeleteWithJQuery("HM_Coupon", {
                                    filters: {
                                        CouponId: oData.CouponId
                                    }
                                });
                            }

                            MessageToast.show(this.i18nModel.getText("selectedcoupondeletedsuccessfully"));
                            this.onCouponSearch();

                        } catch (err) {
                            console.error("Delete failed:", err);
                            MessageBox.error(this.i18nModel.getText("errorwhiledeletingcoupons"));
                        } finally {
                            this.closeBusyDialog()
                        }
                    }.bind(this)
                }
            );
        },

        onDownloadCoupons: function () {
            var oTable = this.getView().byId("couponTable");
            var oModel = oTable.getModel("CouponModel");
            var oData = oModel.getData();

            // normalize data
            var aData = Array.isArray(oData)
                ? oData
                : oData?.results || [];

            if (aData.length === 0) {
                sap.m.MessageToast.show(
                    this.i18nModel.getText("nocouponsavailabledownload")
                );
                return;
            }

            const aFormattedData = aData.map(item => ({
                ...item,
                StartDate: Formatter.formatDate(item.StartDate),
                EndDate: Formatter.formatDate(item.EndDate),
                CreatedAt: Formatter.formatDate(item.CreatedAt)
            }));

            var aCols = this._createColumnConfig();

            var oSheet = new Spreadsheet({
                workbook: {
                    columns: aCols,
                    context: {
                        sheetName: "Coupons Deatils"
                    }
                },
                dataSource: aFormattedData,
                fileName: "Coupons.xlsx"
            });

            oSheet.build().then(() => {
                MessageToast.show(this.i18nModel.getText("MSdownloadedsuccess"));
            }).finally(() => {
                oSheet.destroy();
            });
        },

        _createColumnConfig: function () {
            return [
                { label: "Status", property: "Status", type: "String" },
                { label: "Branch Name", property: "BranchName", type: "String" },
                { label: "Coupon Code", property: "CouponCode", type: "String" },
                { label: "Discount Type", property: "DiscountType", type: "String" },
                { label: "Percentage / Discount Value", property: "DiscountValue", type: "String" },
                { label: "Maximum Discount", property: "UptoValue", type: "String" },
                { label: "Max Uses", property: "MaxUses", type: "String" },
                { label: "Min Order Value", property: "MinOrderValue", type: "String" },
                { label: "Start Date", property: "StartDate", type: "String" },
                { label: "End Date", property: "EndDate", type: "String" },
                { label: "Created At", property: "CreatedAt", type: "String" },
                { label: "Created By", property: "CreatedBy", type: EdmType.String },
            ];
        },


        _openCouponDialog: async function () {
            const oView = this.getView();

            // --------------------------------------------------
            // 1. Load dialog once
            // --------------------------------------------------
            if (!this._oCouponDialog) {
                this._oCouponDialog = await Fragment.load({
                    id: oView.getId(),
                    name: "sap.ui.com.project1.fragment.CouponDialog",
                    controller: this
                });

                oView.addDependent(this._oCouponDialog);

                // Make DatePickers readonly (no manual typing)
                const sViewId = oView.getId();
                this._FragmentDatePickersReadOnly([
                    sViewId + "--dpStartDate",
                    sViewId + "--dpEndDate"
                ]);

                this._oCouponDialog.attachAfterClose(this._clearTableSelection.bind(this));
            }

            // --------------------------------------------------
            // 2. Resolve dialog state from model
            // --------------------------------------------------
            const oVM = oView.getModel("CouponView");
            const sMode = oVM.getProperty("/DialogMode");
            const sDiscountType = oVM.getProperty("/CurrentCoupon/DiscountType");

            // Derive UI flags from data (single source of truth)
            oVM.setProperty("/isUptoEnabled", sDiscountType === "Percentage");
            oVM.setProperty("/isReq", sDiscountType === "Percentage");

            // --------------------------------------------------
            // 3. Mode-specific UI sync
            // --------------------------------------------------
            if (sMode === "Add") {
                // Reset branch selection visually
                oVM.setProperty("/CurrentCoupon/BranchCode", "");

                const oBranchCB = sap.ui.getCore().byId(
                    oView.createId("cbBranchCode")
                );
                if (oBranchCB) {
                    oBranchCB.setSelectedItem(null);
                    oBranchCB.setValue("");
                }
            } else {
                // Edit mode → restore branch selection
                this._syncBranchInEditMode();
            }

            // --------------------------------------------------
            // 4. Date constraints (always enforced)
            // --------------------------------------------------
            const oToday = new Date();
            oToday.setHours(0, 0, 0, 0);

            const oStartDP = sap.ui.getCore().byId(oView.createId("dpStartDate"));
            const oEndDP = sap.ui.getCore().byId(oView.createId("dpEndDate"));

            if (oStartDP) {
                oStartDP.setMinDate(oToday);
            }
            if (oEndDP) {
                oEndDP.setMinDate(oToday);
            }

            // --------------------------------------------------
            // 5. Open dialog (once, intentionally)
            // --------------------------------------------------
            this._oCouponDialog.open();
        },

        _showTableRowsBusy: function (bBusy) {
            var oTable = this.byId("couponTable");
            var oDom = oTable.$().find(".sapMListItems").get(0);
            if (!oDom) return;
            if (bBusy) {
                sap.ui.core.BusyIndicator.show(0, { domRef: oDom });
            } else {
                this.closeBusyDialog()
            }
        },
        _validateDiscountValueLogic: function () {
            const oView = this.getView();
            const oVM = oView.getModel("CouponView");

            const sType = oVM.getProperty("/CurrentCoupon/DiscountType");
            const sValue = oVM.getProperty("/CurrentCoupon/DiscountValue");

            const oInput = sap.ui.getCore().byId(
                oView.createId("inDiscountValue")
            );

            const fVal = parseFloat(sValue);

            if (!sType) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText(
                    this.i18nModel.getText("selectDiscountTypefirst")
                );
                return false;
            }

            if (isNaN(fVal) || fVal <= 0) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText(
                    this.i18nModel.getText("invaliddiscountvalue")
                );
                return false;
            }

            if (sType === "Percentage" && fVal > 99.99) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText(
                    this.i18nModel.getText("percentagemustbebetween1and100")
                );
                return false;
            }

            oInput.setValueState(sap.ui.core.ValueState.None);
            return true;
        },
        onLiveChange_CouponCode: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent)
            var oInput = oEvent.getSource();
            var sValue = oEvent.getParameter("value");

            // Convert to uppercase
            var sUpper = sValue.toUpperCase();

            // Update input value (this also updates the model because of two-way binding)
            oInput.setValue(sUpper);
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
                utils._LCvalidateMandatoryField(
                    sap.ui.getCore().byId(oView.createId("idCouponcode")), "ID"
                ) &&
                utils._LCstrictValidationComboBox(
                    sap.ui.getCore().byId(oView.createId("cbDiscountType")), "ID"
                ) &&
                utils._LCvalidateMandatoryField(
                    sap.ui.getCore().byId(oView.createId("inDiscountValue")), "ID"
                ) &&
                this._validateDiscountValueLogic()
                &&
                (
                    oCoupon.DiscountType !== "Percentage" ||
                    utils._LCvalidateMandatoryField(
                        sap.ui.getCore().byId(oView.createId("inUptoValue")), "ID"
                    )
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
                    sap.ui.getCore().byId(oView.createId("inDescription")), "ID"
                ) &&
                utils._LCvalidateMandatoryField(
                    sap.ui.getCore().byId(oView.createId("dpStartDate")), "ID"
                ) &&
                utils._LCvalidateMandatoryField(
                    sap.ui.getCore().byId(oView.createId("dpEndDate")), "ID"
                );
            if (!bValid) {
                MessageToast.show(this.i18nModel.getText("MSfillallfields"));
                return;
            }
            let dStart = new Date(oVM.getProperty("/CurrentCoupon/StartDate"));
            let dEnd = new Date(oVM.getProperty("/CurrentCoupon/EndDate"));
            if (dEnd < dStart) {
                MessageToast.show(this.i18nModel.getText("endDatecannotbelessthanStartDate"));
                return;
            }
            if (sMode === "Add") {
                oCoupon.Status = "Active";
            }

            try {
                if (sMode === "Add") {

                    // 🔹 Get data from CouponModel
                    var oCouponModel = this.getView().getModel("CouponModel");
                    var aCoupons =
                        oCouponModel.getProperty("/CouponList") ||
                        oCouponModel.getProperty("/results") ||
                        oCouponModel.getData() ||
                        [];

                    // Normalize input
                    var sNewCode = (oCoupon.CouponCode || "").trim().toLowerCase();
                    var dToday = new Date();

                    // 🔹 Find matching coupons
                    var sNewBranch = (oCoupon.BranchCode || "").trim().toLowerCase();

                    var aMatchingCoupons = aCoupons.filter(function (item) {
                        return (
                            (item.CouponCode || "").trim().toLowerCase() === sNewCode &&
                            (item.BranchCode || "").trim().toLowerCase() === sNewBranch
                        );
                    });

                    if (aMatchingCoupons.length > 0) {

                        var dNewEnd = new Date(oCoupon.EndDate);

                        var bInvalidEndDate = aMatchingCoupons.some(function (item) {
                            var dExistingEnd = item.EndDate ? new Date(item.EndDate) : null;

                            return (
                                dExistingEnd &&
                                !isNaN(dExistingEnd) &&
                                dNewEnd < dExistingEnd //  NEW CONDITION
                            );
                        });

                        //  Block if new end date is smaller than any existing
                        if (bInvalidEndDate) {
                            this.closeBusyDialog();
                            MessageBox.error("Coupon end date must be greater than existing coupon end date");
                            return;
                        }

                        //  Optional: keep your active check also
                        var dToday = new Date();
                        var bActiveExists = aMatchingCoupons.some(function (item) {
                            var dExistingEnd = item.EndDate ? new Date(item.EndDate) : null;
                            return dExistingEnd && !isNaN(dExistingEnd) && dExistingEnd >= dToday;
                        });

                        if (bActiveExists) {
                            this.closeBusyDialog();
                            MessageBox.error("Coupon code already exists");
                            return;
                        }

                    }

                    //  If no match OR only expired → proceed with your code
                    oCoupon.CreatedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
                    oCoupon.CreatedBy =
                        oView.getModel("LoginModel")
                            ?.getProperty("/EmployeeName") || "system";
                    this.getBusyDialog()
                    await this.ajaxCreateWithJQuery("HM_Coupon", {
                        data: oCoupon
                    });

                    MessageToast.show(this.i18nModel.getText("couponcreatedsuccessfully"));
                    this.closeBusyDialog()
                } else {
                    if (!oCoupon.CouponId) {
                        MessageBox.error(this.i18nModel.getText("updatefailedCouponIdmissing"));
                        return;
                    }
                    await this.ajaxUpdateWithJQuery("HM_Coupon", {
                        filters: {
                            CouponId: oCoupon.CouponId
                        },
                        data: {

                            DiscountType: oCoupon.DiscountType,
                            DiscountValue: oCoupon.DiscountValue,
                            UptoValue: oCoupon.UptoValue,
                            Description: oCoupon.Description,
                            MaxUses: oCoupon.MaxUses,
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
                    MessageToast.show(this.i18nModel.getText("couponupdatedsuccessfully"));
                }
                this._oCouponDialog.close();
                this._clearTableSelection();
                // this._loadCoupons();
                this.onCouponSearch();

            } catch (err) {
                MessageBox.error(
                    err?.responseJSON?.message || "Failed to save coupon."
                );
            } finally {
                this.closeBusyDialog()
            }
        },

        onDialogAfterClose: function () {
            const oVM = this.getView().getModel("CouponView");
            // Reset model
            oVM.setProperty("/CurrentCoupon", {
                DiscountType: "",
                DiscountValue: "",
                UptoValue: "",
                Description: "",
                MaxUses: "",
                MinOrderValue: "",
                StartDate: "",
                EndDate: "",
                Status: "",
                BranchCode: ""
            });
            oVM.setProperty("/isUptoEnabled", false);
            oVM.setProperty("/isReq", false);
            oVM.setProperty("/CurrentCoupon/UptoValue", "");

            // Clear validation & fields
            this._resetDialogValueStates();
            // Clear table selections
            this._clearTableSelection();
        },

        _resetDialogValueStates: function () {
            const oView = this.getView();
            const aFieldIds = [
                "idCouponcode",
                "cbDiscountType",
                "inDiscountValue",
                "inUptoValue",
                "inDescription",
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
                    // oCtrl.setValueStateText(""); ////
                }
            });
        },
        onLiveChange_Description: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },
        onLiveChange_UptoValue: function (oEvent) {
            utils._LCvalidateAmount(oEvent);
        },
        onDateRangeChange: function () {
            // Intentionally empty
            // Prevents FilterBar auto-search cascade
        },

        _applyCouponGroupingAndSorting: function () {
            const oTable = this.byId("couponTable");
            const oBinding = oTable.getBinding("items");

            if (!oBinding) return;

            oBinding.sort([
                new sap.ui.model.Sorter("StatusOrder", false, function (oCtx) {
                    return {
                        key: oCtx.getProperty("StatusOrder"),
                        text: oCtx.getProperty("Status") + " Coupons"
                    };
                }),
                new sap.ui.model.Sorter("EndDate", false),
                new sap.ui.model.Sorter("DiscountValue", true)
            ]);
        },

        _normalizeCouponResult: function (oResult) {
            let aData = Array.isArray(oResult?.data) ? oResult.data : (oResult?.data ? [oResult.data] : []);
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

        onBranchSelect: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent);
            const oItem = oEvent.getParameter("selectedItem");
            if (!oItem) return;

            const oCtx = oItem.getBindingContext("Branchmodel");
            if (!oCtx) return;

            const oBranch = oCtx.getObject();

            // ✅ single source of truth
            this.getView().getModel("CouponView").setProperty("/CurrentCoupon/BranchCode", oBranch.BranchCode || oBranch.BranchID);
        },

        onClearCoupons: function () {
            // Clear non-date filters
            this.byId("fStatus").setSelectedKey("");
            this.byId("fDiscountType").setSelectedKey("");
            this.byId("fBranch").setSelectedKey("");

            // Toggle intent ONLY
            this._isDateRangeCleared = !this._isDateRangeCleared;

            // Always clear UI date
            const oRange = this.byId("fEndRange");
            oRange.setValue("");
            oRange.setDateValue(null);
            oRange.setSecondDateValue(null);
            this._isDateRangeCleared = true;
        },



        onChange_DiscountType: function (oEvent) {

            utils._LCstrictValidationComboBox(oEvent);

            const oVM = this.getView().getModel("CouponView");
            const sKey = oEvent.getSource().getSelectedKey();
            const oDiscountInput = this.byId("inDiscountValue");

            // Reset value + state
            oDiscountInput.setValue("");
            oDiscountInput.setValueState(sap.ui.core.ValueState.None);

            if (sKey === "Percentage") {

                oVM.setProperty("/isUptoEnabled", true);
                oVM.setProperty("/isReq", true);

                oDiscountInput.setMaxLength(5);

                // Change Label
                oVM.setProperty("/DiscountValueLabel", "Percentage");

            } else {

                oVM.setProperty("/isUptoEnabled", false);
                oVM.setProperty("/isReq", false);

                oVM.setProperty("/CurrentCoupon/UptoValue", "");

                oDiscountInput.setMaxLength(10);

                // Change Label
                oVM.setProperty("/DiscountValueLabel", "Discount Value");
            }
        },
        onLiveChange_DiscountValue: function (oEvent) {
            const oInput = oEvent.getSource();
            let sValue = oInput.getValue();
            const sType = this.byId("cbDiscountType").getSelectedKey();

            if (!sType) {
                oInput.setValue("");
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText(
                    this.i18nModel.getText("selectDiscountTypefirst")
                );
                return;
            }

            // Allow digits + single decimal
            sValue = sValue.replace(/[^0-9.]/g, "");
            const parts = sValue.split(".");

            if (parts.length > 2) {
                sValue = parts[0] + "." + parts[1];
            }

            if (parts[1]?.length > 2) {
                sValue = parts[0] + "." + parts[1].slice(0, 2);
            }

            oInput.setValue(sValue);

            const fVal = parseFloat(sValue);

            // 🔴 Percentage rules
            if (sType === "Percentage") {
                if (isNaN(fVal) || fVal <= 0 || fVal > 99.99) {
                    oInput.setValueState(sap.ui.core.ValueState.Error);
                    oInput.setValueStateText(
                        this.i18nModel.getText("percentagemustbebetween1and100")
                    );
                    return;
                }
            }

            // 🔴 Fixed amount rules
            if (sType === "Fixed Amount") {
                if (isNaN(fVal) || fVal <= 0) {
                    oInput.setValueState(sap.ui.core.ValueState.Error);
                    oInput.setValueStateText(
                        this.i18nModel.getText("amountmustbegreaterthan0")
                    );
                    return;
                }
            }

            // ✅ Valid
            oInput.setValueState(sap.ui.core.ValueState.None);
        },



        // ===== All numeric fields =====
        onLiveChange_Number_MinOne: function (oEvent) {
            const oInput = oEvent.getSource();
            let sValue = oInput.getValue();

            // ❌ Remove anything that is not a digit
            sValue = sValue.replace(/\D/g, "");

            // ❌ Remove leading zeros (except single digit)
            sValue = sValue.replace(/^0+/, "");

            oInput.setValue(sValue);

            const iVal = parseInt(sValue, 10);

            if (!sValue || isNaN(iVal) || iVal < 1) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText(
                    this.i18nModel.getText("valuemustbeatleast1")
                );
                return;
            }

            // ✅ Natural number confirmed
            oInput.setValueState(sap.ui.core.ValueState.None);
        },


        onLiveChange_Number_AllowZero: function (oEvent) {
            const oInput = oEvent.getSource();
            const sValue = oInput.getValue().trim();
            if (!/^\d*$/.test(sValue)) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText(this.i18nModel.getText("onlynumbersallowed"));
                return;
            }
            const iVal = parseInt(sValue, 10);
            if (isNaN(iVal) || iVal < 0) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText(this.i18nModel.getText("valuemustbe0ormore"));
                return;
            }
            oInput.setValueState(sap.ui.core.ValueState.None);
        },

        onLiveChange_MinAmount: function (oEvent) {
            utils.onNumber(oEvent);
        },

        onChange_Status: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent);
        },

        onChange_Date: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
            const oView = this.getView();

            const oStartDP = sap.ui.getCore().byId(oView.createId("dpStartDate"));
            const oEndDP = sap.ui.getCore().byId(oView.createId("dpEndDate"));

            if (!oStartDP || !oEndDP) return;

            const dStart = oStartDP.getDateValue();
            const dEnd = oEndDP.getDateValue();

            // Clear previous errors
            oEndDP.setValueState("None");
            oEndDP.setValueStateText("");

            // If start date selected → EndDate min must follow StartDate
            if (dStart) {
                const dMinEnd = new Date(dStart);
                dMinEnd.setHours(0, 0, 0, 0);
                oEndDP.setMinDate(dMinEnd);
            }

            // If both selected → validate order
            if (dStart && dEnd && dEnd < dStart) {
                oEndDP.setValueState("Error");
                oEndDP.setValueStateText(this.i18nModel.getText("endDatecannotbeearlierthanStartDate"));
                oEndDP.setDateValue(null);
            }
        },

        _clearTableSelection: function () {
            var oTable = this.byId("couponTable");
            if (oTable) {
                oTable.removeSelections(true);
            }
        },

        onDialogClose: function () {
            var oView = this.getView();

            // 🔹 1. Clear ValueState for all fields
            var aControls = [
                "cbBranchCode",
                "idCouponcode",
                "cbDiscountType",
                "inDiscountValue",
                "inUptoValue",
                "inMaxUses",
                "inMinOrderValue",
                "cbStatus",
                "inDescription",
                "dpStartDate",
                "dpEndDate"
            ];

            aControls.forEach(function (sId) {
                var oControl = sap.ui.getCore().byId(oView.createId(sId));
                if (oControl) {
                    oControl.setValueState("None");
                }
            });

            // 🔹 2. Clear Model Data
            var oVM = oView.getModel("CouponView");
            oVM.setProperty("/CurrentCoupon", {
                CouponCode: "",
                DiscountType: "",
                DiscountValue: "",
                UptoValue: "",
                MaxUses: "",
                MinOrderValue: "",
                Description: "",
                StartDate: "",
                EndDate: "",
                BranchCode: "",
                Status: ""
            });

            // 🔹 3. Reset additional flags (important for UI)
            oVM.setProperty("/isReq", false);
            oVM.setProperty("/isUptoEnabled", false);

            // 🔹 4. Close Dialog
            if (this._oCouponDialog) {
                this._oCouponDialog.close();
            }
        },

        async _loadRecipientContacts() {
            try {
                this.getBusyDialog()
                const sRole = this._oLoggedInUser?.Role || "";

                // Decide filter STRICTLY by role
                const oFilter =
                    sRole === "SuperAdmin"
                        ? {} // backend returns everything
                        : { BranchCode: this._allowedBranches };

                console.log("HM_CustomerContact filter:", oFilter);

                const oResponse = await this.ajaxReadWithJQuery(
                    "HM_CustomerContact",
                    oFilter
                );

                const aContacts = (oResponse?.data || []).map(c => ({
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
                this.closeBusyDialog()
            }
        },

        onCouponSelectionChange: function (oEvent) {
            const oTable = oEvent.getSource();
            const aSel = oTable.getSelectedItems();
            const oShareBtn = this.byId("btnShareCoupon");

            if (aSel.length !== 1) {
                oShareBtn.setEnabled(false);
                return;
            }

            const oCoupon =
                aSel[0].getBindingContext("CouponModel").getObject();

            oShareBtn.setEnabled(oCoupon.Status === "Active");
        },

        onShareCoupon: async function () {
            const oTable = this.byId("couponTable");
            const aSel = oTable ? oTable.getSelectedItems() : [];

            if (aSel.length !== 1) {
                sap.m.MessageToast.show(this.i18nModel.getText("selectexactlyonecouponshare"));
                return;
            }

            const oCtx = aSel[0].getBindingContext("CouponModel");
            const oCoupon = oCtx.getObject();

            // 🔒 HARD BUSINESS RULE
            if (oCoupon.Status !== "Active") {
                sap.m.MessageToast.show(this.i18nModel.getText("onlyACTIVEcouponsshared"));
                return;
            }

            // cache for share confirm
            this._oCouponToShare = oCoupon;

            // const aRecipients = this._aAllRecipients || [];
            // if (!aRecipients.length) {
            //     sap.m.MessageToast.show(this.i18nModel.getText("nocontactsfound"));
            //     return;
            // }
            const oView = this.getView();
            const oVM = oView.getModel("CouponView");

            // this._oCouponToShare is already set earlier
            oVM.setProperty("/ShareCoupon", {
                CouponCode: this._oCouponToShare.CouponCode,
                BranchCode: this._oCouponToShare.BranchCode,
                BranchName: this._oCouponToShare.BranchName
            });
            if (!this._oShareDialog) {
                const oView = this.getView();
                this._oShareDialog = await sap.ui.core.Fragment.load({
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
            const aUsers = this._aAllRecipients.filter(r => r.Role === sRole);
            this.getView().getModel("RecipientModel").setData(aUsers);
            // Reset user selection after role switch
            this.byId("cbUser").setSelectedKeys([]);
        },

        onConfirmShareCoupon: async function () {
            const oView = this.getView();
            const oRole = sap.ui.getCore().byId(oView.createId("cbRole"));
            const oMCB = sap.ui.getCore().byId(oView.createId("cbUser"));

            // 1. Role Validation
            if (!utils._LCstrictValidationComboBox(oRole, "ID")) {
                MessageToast.show(this.i18nModel.getText("pleaseselectvalidRole"));
                return;
            }

            // 2. Recipients Validation (Mandatory check)
            const aSelectedKeys = oMCB.getSelectedKeys();
            if (aSelectedKeys.length === 0) {
                oMCB.setValueState("Error");
                MessageToast.show(this.i18nModel.getText("selectleastoneuser"));
                return;
            }

            const c = this._oCouponToShare;
            const aUsers = [];

            // MultiComboBox se users nikalna
            oMCB.getSelectedItems().forEach(item => {
                aUsers.push({
                    UserName: item.getText(),
                    toEmailID: item.getAdditionalText(),
                    COUPONNUMBER: c.CouponCode,
                    StartDate: c.StartDate,
                    EndDate: c.EndDate,
                    MinOrderValue: c.MinOrderValue,
                    UptoValue: c.DiscountType === "Percentage" ? c.UptoValue : "",
                    DiscountValue: c.DiscountType === "Fixed Amount" ? c.DiscountValue : "",
                    BranchName: c.BranchName
                });
            });

            try {
                this.getBusyDialog()
                await this.ajaxCreateWithJQuery("CouponCodeEmail", { users: aUsers });
                MessageToast.show(this.i18nModel.getText("couponsent"));
                this._oShareDialog.close();
            } catch (err) {
                sap.m.MessageBox.error(err?.responseJSON?.message || "Failed to send coupon.");
            } finally {
                this.closeBusyDialog()
            }
        },

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
                oMCB.setValueStateText(this.i18nModel.getText("selectionofrecipient"));
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
                this.getView().getModel("RecipientModel").setData(this._aAllRecipients);
            }
            const oVM = oView.getModel("CouponView");
            if (oVM) {
                oVM.setProperty("/SelectedUsers", []);
            }
            this._clearTableSelection();
            this._oCouponToShare = null;

            // 🔒 REQUIRED UX RESET
            const oShareBtn = this.byId("btnShareCoupon");
            if (oShareBtn) {
                oShareBtn.setEnabled(false);
            }
        },

        onShareCouponPress: function (oEvent) {
            const oTable = this.byId("couponTable");
            const aSel = oTable.getSelectedItems();

            if (aSel.length !== 1) {
                sap.m.MessageToast.show(
                    this.i18nModel.getText("selectexactlyonecouponshare")
                );
                return;
            }

            const oCoupon =
                aSel[0].getBindingContext("CouponModel").getObject();

            if (oCoupon.Status !== "Active") {
                sap.m.MessageToast.show(
                    this.i18nModel.getText("onlyACTIVEcouponsshared")
                );
                return;
            }

            const sBaseURL = window.location.origin + window.location.pathname;
            const sHash = `#/CouponView/${encodeURIComponent(oCoupon.CouponCode)}`;
            const sShareURL = `${sBaseURL}?sap-ui-xx-viewCache=false${sHash}`;

            const sMessage = this._buildCouponShareMessage(oCoupon);
            const sEmailBody = this._buildCouponShareMessageEmail(oCoupon);



            const createItem = (icon, text, fn) =>
                new sap.m.CustomListItem({
                    type: "Active",
                    press: fn,
                    content: [
                        new sap.m.HBox({
                            alignItems: "Center",
                            items: [
                                new sap.m.Image({
                                    src: icon,
                                    width: "18px"
                                }).addStyleClass("shareIcon"),
                                new sap.m.Text({
                                    text
                                }).addStyleClass("shareText")
                            ]
                        }).addStyleClass("shareItemBox")
                    ]
                });

            if (this._oSharePopover) {
                this._oSharePopover.destroy();
            }

            this._oSharePopover = new sap.m.Popover({
                placement: sap.m.PlacementType.Bottom,
                showHeader: false,
                contentWidth: "180px",
                afterClose: function () {
                    this._clearTableSelection();
                }.bind(this),
                content: [
                    new sap.m.List({
                        items: [

                            // ✅ WhatsApp
                            createItem("image/Whatsapp.png", "WhatsApp", () => {
                                window.open(
                                    "https://api.whatsapp.com/send?text=" +
                                    encodeURIComponent(sMessage),
                                    "_blank"
                                );
                                this._oSharePopover.close();
                            }),

                            // // ✅ Facebook
                            // createItem("image/Facebook.png", "Facebook", () => {
                            //     navigator.clipboard.writeText(sMessage);
                            //     sap.m.MessageToast.show(
                            //         "Coupon message copied. Paste it on Facebook."
                            //     );
                            //     window.open("https://www.facebook.com", "_blank");
                            //     this._oSharePopover.close();
                            // }),


                            // // ✅ Instagram (copy-based)
                            // createItem("image/Instagram.png", "Instagram", () => {
                            //     navigator.clipboard.writeText(sMessage);
                            //     sap.m.MessageToast.show(
                            //         "Coupon message copied. Paste it on Instagram"
                            //     );
                            //     this._oSharePopover.close();
                            // }),

                            // ✅ EMAIL → TRIGGERS EXISTING FLOW
                            createItem("image/Email.png", "Email to Customers", () => {
                                this._oSharePopover.close();
                                this.onShareCoupon(); // 🔥 THIS is the key
                            }),

                            createItem("image/Mail.png", "Email", () => {
                                window.location.href =
                                    "mailto:?subject=" +
                                    encodeURIComponent("New Discount Coupon") +
                                    "&body=" + encodeURIComponent(sEmailBody);
                                this._oSharePopover.close();
                            }),


                            // ✅ SMS
                            createItem("image/sms.png", "Text SMS", () => {
                                window.location.href =
                                    "sms:?body=" +
                                    encodeURIComponent(sMessage);
                                this._oSharePopover.close();
                            }),

                            // ✅ Copy link
                            createItem("image/Link.png", "Copy Coupon Details", () => {
                                navigator.clipboard.writeText(sMessage);
                                sap.m.MessageToast.show("Coupon Details copied");
                                this._oSharePopover.close();
                            })
                        ]
                    })
                ]
            });

            this._oSharePopover.openBy(oEvent.getSource());
        },
        // _buildCouponShareMessage: function (oCoupon) {
        //     const sBranchName = this._branchMap?.[oCoupon.BranchCode] || "Our Hostel";
        //     const sStartDate = this.Formatter.formatDate(oCoupon.StartDate);
        //     const sEndDate = this.Formatter.formatDate(oCoupon.EndDate);

        //     // 🔥 Check for Max Discount
        //     let sMaxDiscountLine = "";
        //     if (oCoupon.DiscountType === "Percentage" && oCoupon.UptoValue) {
        //         sMaxDiscountLine = `💰 Max Discount: ${oCoupon.UptoValue}\n`;
        //     }

        //     return (
        //         `🎉 ${sBranchName} Special Deal! 🎊\n\n` +
        //         `Don't miss out on this exclusive coupon 🎉\n\n` +
        //         `🔑 Code: ${oCoupon.CouponCode}\n` +
        //         `📅 Valid: ${sStartDate} → ${sEndDate}\n` +
        //         `💰 Min Order: ${oCoupon.MinOrderValue}\n` +
        //         sMaxDiscountLine + // 🔥 Inserted here
        //         `\nUse this coupon during booking and save instantly 🙌\n\n` +
        //         `Terms: \n` +
        //         ` • New bookings only\n` +
        //         ` • No other offers applicable\n\n` +
        //         `— ${sBranchName} Management`
        //     );
        // },


        _buildCouponShareMessage: function (oCoupon) {
            const sBranchName = this._branchMap?.[oCoupon.BranchCode] || "Our Hostel";
            const sStartDate = this.Formatter.formatDate(oCoupon.StartDate);
            const sEndDate = this.Formatter.formatDate(oCoupon.EndDate);

            // 🔥 Dynamic Discount Line Logic
            let sDiscountDetailLine = "";
            if (oCoupon.DiscountType === "Percentage") {
                sDiscountDetailLine = oCoupon.UptoValue ? `💰 Max Discount: ${oCoupon.UptoValue}\n` : "";
            } else {
                // Fixed Amount ke liye direct value dikhayenge
                sDiscountDetailLine = `💰 Discount Value: ${oCoupon.DiscountValue}\n`;
            }

            return (
                `🎉 StayVriksha – ${sBranchName} Special Deal! 🎊\n\n` +
                `Don't miss out on this exclusive coupon 🎉\n\n` +
                `🔑 Code: ${oCoupon.CouponCode}\n` +
                `📅 Valid: ${sStartDate} → ${sEndDate}\n` +
                `💰 Min Order: ${oCoupon.MinOrderValue}\n` +
                sDiscountDetailLine + // 🔥 Yahan dynamic line add hogi
                `\nUse this coupon while booking with StayVriksha and enjoy instant savings! 🙌\n\n` +
                `📌 Terms & Conditions:: \n` +
                ` • Applicable for new bookings only\n` +
                ` • Cannot be combined with other offers or promotions\n\n` +
                ` • Book now and grab the deal before it ends! 🚀\n\n` +
                
                `— StayVriksha | ${sBranchName} Management`
            );
        },
        _buildCouponShareMessageEmail: function (oCoupon) {
            const sBranchName = this._branchMap?.[oCoupon.BranchCode] || "Our Hostel";
            const sStartDate = this.Formatter.formatDate(oCoupon.StartDate);
            const sEndDate = this.Formatter.formatDate(oCoupon.EndDate);

            // 🔥 Dynamic Discount Text for Email body
            let sOfferText = "";
            if (oCoupon.DiscountType === "Percentage") {
                sOfferText = oCoupon.UptoValue ? ` Maximum discount up to ${oCoupon.UptoValue}` : "";
            } else {
                sOfferText = ` Discount Value of ${oCoupon.DiscountValue}`;
            }

            return (
                `Dear Customer,\n\n` +
                `We are pleased to share with you the coupon code:  ${oCoupon.CouponCode}, with a ${sOfferText}\n\n` +
                // `We are pleased to share you coupon code: ${oCoupon.CouponCode} and ${sOfferText}\n\n` + // 🔥 Updated logic
                `You can use this coupon during the booking creation process ` +
                `to avail the applicable discount.\n` +
                `Please ensure to enter the code correctly at the time of booking.\n\n` +

                `If you have any questions or need support, feel free to contact us.\n\n` +

                `Terms & Conditions\n` +
                `This coupon code is valid from ${sStartDate} to ${sEndDate}.\n` +
                `The coupon is applicable only for new bookings made during the validity period ` +
                `and requires a minimum order value of ${oCoupon.MinOrderValue}.\n` +
                `This coupon cannot be combined with any other offers or discounts.\n` +
                `The company reserves the right to modify or cancel the coupon at any time.\n\n` +

                `Thank you for choosing our service.\n\n` +
                `Best regards,\n` +
                `${sBranchName} Management`
            );
        },


        // _buildCouponShareMessageEmail: function (oCoupon) {
        //     const sBranchName =
        //         this._branchMap?.[oCoupon.BranchCode] || "Our Hostel";

        //     const sStartDate = this.Formatter.formatDate(oCoupon.StartDate);
        //     const sEndDate = this.Formatter.formatDate(oCoupon.EndDate);
        //     const sMaxDiscountText = (oCoupon.DiscountType === "Percentage" && oCoupon.UptoValue)
        //         ? ` (Maximum discount up to ${oCoupon.UptoValue})`
        //         : "";

        //     return (
        //         `Dear Customer,\n\n` +
        //         `We are pleased to share your coupon code: ${oCoupon.CouponCode}${sMaxDiscountText}\n\n` + // 🔥 Added here
        //         // `Coupon Code: ${oCoupon.CouponCode}\n\n` +
        //         `You can use this coupon during the booking creation process ` +
        //         `to avail the applicable discount.\n` +
        //         `Please ensure to enter the code correctly at the time of booking.\n\n` +

        //         `If you have any questions or need support, feel free to contact us.\n\n` +

        //         `Terms & Conditions\n` +
        //         `This coupon code is valid from ${sStartDate} to ${sEndDate}.\n` +
        //         `The coupon is applicable only for new bookings made during the validity period ` +
        //         `and requires a minimum order value of ${oCoupon.MinOrderValue}.\n` +
        //         `This coupon cannot be combined with any other offers or discounts.\n` +
        //         `The company reserves the right to modify or cancel the coupon at any time.\n\n` +

        //         `Thank you for choosing our service.\n\n` +
        //         `Best regards,\n` +
        //         `${sBranchName} Management`
        //     );
        // },
    });
});