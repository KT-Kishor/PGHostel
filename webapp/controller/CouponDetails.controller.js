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
                CurrentCoupon: {}         // bound to dialog
            });
            this.getView().setModel(oViewModel, "CouponView");
            if (!this.getView().getModel("CouponModel")) {
                this.getView().setModel(new JSONModel([]), "CouponModel");
            }
        },

        onHome: function () {
            this.CommonLogoutFunction();
            this.getView().getModel("CouponModel").setData({});

        },

        _onRouteMatched: async function () {
            const ok = await this.commonLoginFunction();
            if (!ok) return;
            // const oLoginData = this.getOwnerComponent().getModel("LoginModel").getData();

            // this._allowedBranches = oLoginData.BranchCode
            //     ? oLoginData.BranchCode.split(",").map(b => b.trim())
            //     : [];

            await this._loadBranchCode();
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
                sap.ui.core.BusyIndicator.show(0);
                const oFilterBar = this.byId("couponFilterBar");
                const aItems = oFilterBar.getFilterGroupItems();
                const oRange = this.byId("fEndRange");

                const params = {};

                // ================= Branch Logic =================
                params.BranchCode = this._allowedBranches;

                if( oExistingModel.Role === "Admin"){
                    params.Role ="Admin";
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

            } catch (err) {
                sap.m.MessageBox.error(
                    err?.responseJSON?.message ||
                    err?.message ||
                    "Failed to filter coupons."
                );
            } finally {
                sap.ui.core.BusyIndicator.hide();
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
            sap.ui.core.BusyIndicator.show(0);

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
                filters.Role ="Admin";
            }else{
                 filters.BranchID = "";

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

        // onDeleteCoupon: async function () {
        //     var oTable = this.getView().byId("couponTable");
        //     var aSelectedItems = oTable.getSelectedItems();
        //     if (!aSelectedItems.length) {
        //         MessageToast.show("Please select at least one coupon to delete.");
        //         return;
        //     }
        //     MessageBox.confirm(
        //         `Delete ${aSelectedItems.length} selected coupon(s)?`,
        //         {
        //             icon: MessageBox.Icon.WARNING,
        //             actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        //             emphasizedAction: MessageBox.Action.NO,
        //             onClose: async function (sAction) {
        //                 if (sAction !== MessageBox.Action.YES) return;
        //                 sap.ui.core.BusyIndicator.show(0);
        //                 try {
        //                     for (let oItem of aSelectedItems) {
        //                         let oCtx = oItem.getBindingContext("CouponModel");
        //                         let oData = oCtx.getObject();
        //                         await this.ajaxDeleteWithJQuery("HM_Coupon", {
        //                             filters: {
        //                                 CouponId: oData.CouponId    // ✅ SAFE ROW-LEVEL DELETE
        //                             }
        //                         });
        //                     }
        //                     MessageToast.show("Selected coupons deleted successfully.");
        //                     // this._loadCoupons();
        //                     this.onCouponSearch();

        //                 } catch (err) {
        //                     console.error("Delete failed:", err);
        //                     MessageBox.error("Error while deleting coupons.");
        //                 } finally {
        //                     sap.ui.core.BusyIndicator.hide();
        //                     oTable.removeSelections(true);
        //                 }
        //             }.bind(this)
        //         }
        //     );
        // },

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
                `Are you sure you want to delete the following ${sLabel}?\n\n • ${sLabel}: ${sCouponText}`,
                {
                    icon: MessageBox.Icon.WARNING,
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.NO,
                    onClose: async function (sAction) {

                        // ✅ ALWAYS clear selection (YES or NO)
                        oTable.removeSelections(true);

                        if (sAction !== MessageBox.Action.YES) {
                            return;
                        }

                        sap.ui.core.BusyIndicator.show(0);
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
                            sap.ui.core.BusyIndicator.hide();
                        }
                    }.bind(this)
                }
            );
        },

        onDownloadCoupons: function () {
            var oTable = this.getView().byId("couponTable");
            const oModelData = oTable.getModel("CouponModel").getData();
            if (!oModelData || oModelData.length === 0) {
                sap.m.MessageBox.info(this.i18nModel.getText("nocouponsavailabledownload"));
                return;
            }
            const aFormattedData = oModelData.map(item => {
                return {
                    ...item,
                    StartDate: Formatter.formatDate(item.StartDate),
                    EndDate: Formatter.formatDate(item.EndDate),
                    CreatedAt: Formatter.formatDate(item.CreatedAt)
                }
            });
            var aCols = this._createColumnConfig();
            var oSettings = {
                workbook: {
                    columns: aCols
                },
                dataSource: aFormattedData,
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
                { label: "Branch", property: "BranchCode", type: "String" },
                { label: "Coupon Code", property: "CouponCode", type: "String" },
                { label: "Discount Type", property: "DiscountType", type: "String" },
                { label: "Discount Value", property: "DiscountValue", type: "String" },
                { label: "Max Uses", property: "MaxUses", type: "String" },
                { label: "Min Order Value", property: "MinOrderValue", type: "String" },
                { label: "Start Date", property: "StartDate", type: "String" },
                { label: "End Date", property: "EndDate", type: "String" },
                { label: "Created At", property: "CreatedAt", type: "String" },
                { label: "Created By", property: "CreatedBy", type: EdmType.String },
                { label: "Status", property: "Status", type: EdmType.String },
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

                this._oCouponDialog.attachAfterClose(function () {
                    this._clearTableSelection();
                }.bind(this));
            }

            const oVM = oView.getModel("CouponView");
            const sMode = oVM.getProperty("/DialogMode");

            if (sMode === "Add") {
                oVM.setProperty("/CurrentCoupon/BranchCode", "");

                const oBranchCB = sap.ui.getCore().byId(
                    oView.createId("cbBranchCode")
                );
                if (oBranchCB) {
                    oBranchCB.setSelectedItem(null);
                    oBranchCB.setValue("");
                }
            } else {
                // ✏️ Edit mode → restore branch selection
                this._syncBranchInEditMode();
            }

            this._oCouponDialog.open();

            // ===== DATE CONSTRAINTS =====
            const oStartDP = sap.ui.getCore().byId(oView.createId("dpStartDate"));
            const oEndDP = sap.ui.getCore().byId(oView.createId("dpEndDate"));

            const oToday = new Date();
            oToday.setHours(0, 0, 0, 0); // normalize

            if (oStartDP) {
                oStartDP.setMinDate(oToday);
            }

            if (oEndDP) {
                oEndDP.setMinDate(oToday);
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
            sap.ui.core.BusyIndicator.show(0);
            try {
                if (sMode === "Add") {
                    oCoupon.CreatedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
                    oCoupon.CreatedBy =
                        oView.getModel("LoginModel")
                            ?.getProperty("/EmployeeName") || "system";
                    await this.ajaxCreateWithJQuery("HM_Coupon", {
                        data: oCoupon
                    });
                    MessageToast.show(this.i18nModel.getText("couponcreatedsuccessfully"));
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
                    // oCtrl.setValueStateText(""); ////
                }
            });
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
                oInput.setValueStateText(this.i18nModel.getText("selectDiscountTypefirst"));
                return;
            }
            // Only digits + optional decimal
            if (!/^\d+(\.\d+)?$/.test(sValue)) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText(this.i18nModel.getText("onlynumbersallowed"));
                return;
            }
            const fVal = parseFloat(sValue);
            if (sType === "Percentage") {
                // ✅ Validate 1 – 100
                if (fVal <= 0 || fVal > 100) {
                    oInput.setValueState(sap.ui.core.ValueState.Error);
                    oInput.setValueStateText(this.i18nModel.getText("percentagemustbebetween1and100"));
                    return;
                }
            } else {
                // ✅ Validate currency amount
                if (fVal <= 0) {
                    oInput.setValueState(sap.ui.core.ValueState.Error);
                    oInput.setValueStateText(this.i18nModel.getText("amountmustbegreaterthan0"));
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
                oInput.setValueStateText(this.i18nModel.getText("onlynumbersallowed"));
                return;
            }
            const iVal = parseInt(sValue, 10);
            if (isNaN(iVal) || iVal < 1) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText(this.i18nModel.getText("valuemustbeatleast1"));
                return;
            }
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
            utils._LCvalidateAmount(oEvent);
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
            if (this._oCouponDialog) {
                this._oCouponDialog.close();
            }
        },

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
                sap.m.MessageToast.show(this.i18nModel.getText("selectexactlyonecouponshare."));
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

            const aRecipients = this._aAllRecipients || [];
            if (!aRecipients.length) {
                sap.m.MessageToast.show(this.i18nModel.getText("nocontactsfound."));
                return;
            }
            const oView = this.getView();
            const oVM = oView.getModel("CouponView");

            // this._oCouponToShare is already set earlier
            oVM.setProperty("/ShareCoupon", {
                CouponCode: this._oCouponToShare.CouponCode,
                BranchCode: this._oCouponToShare.BranchCode
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
            const oMail = sap.ui.getCore().byId(oView.createId("inpManualEmail"));

            if (!utils._LCstrictValidationComboBox(oRole, "ID")) {
                MessageToast.show(this.i18nModel.getText("pleaseselectvalidRole"));
                return;
            }

            const sEmails = oMail.getValue().trim();
            if (sEmails && !utils._LCvalidateEmail(oMail, "ID")) {
                MessageToast.show(this.i18nModel.getText("pleaseentervalidemailaddress"));
                return;
            }

            const bHasRecipients = oMCB.getSelectedKeys().length > 0;
            if (!bHasRecipients && !sEmails) {
                MessageToast.show(this.i18nModel.getText("selectleastoneuserentermanualemail"));
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
                MessageToast.show(this.i18nModel.getText("novalidrecipientsfound"));
                return;
            }

            try {
                sap.ui.core.BusyIndicator.show(0);

                await this.ajaxCreateWithJQuery("CouponCodeEmail", { users: aUsers });
                MessageToast.show(this.i18nModel.getText("couponsent"));
                this._oShareDialog.close();

            } catch (err) {

                sap.m.MessageBox.error(
                    err?.responseJSON?.message || "Failed to send coupon."
                );

            } finally {
                sap.ui.core.BusyIndicator.hide();
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
    });
});