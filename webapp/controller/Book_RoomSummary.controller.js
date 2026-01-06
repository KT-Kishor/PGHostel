sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "../utils/validation",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessageToast"

], (Controller, JSONModel, Formatter, utils,BusyIndicator,MessageToast) => {
    "use strict";
    return Controller.extend("sap.ui.com.project1.controller.Book_RoomSummary", {
        Formatter: Formatter,
        onInit() {
            this.i18nModel = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var oBtn = this.byId("couponApplyBtn");
            oBtn.setText("Apply Now")
            var inputID = this.getView().byId("BookingcouponInput")
            inputID.setShowValueHelp(false)

            var DateModel = new JSONModel({
                minstartDate: "",
                minEndDate: ""
            });
            this.getView().setModel(DateModel, "DateRangeModel");
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHomePage");
        },

        onTableSelection: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("listItem");
            if (!oSelectedItem) {
                MessageToast.show(this.i18nModel.getText("noRowSelected"));
                return;
            }

            this._oSelectedTable = oEvent.getSource();

            const oContext = oSelectedItem.getBindingContext("HostelModel");
            if (!oContext) {
                MessageToast.show(this.i18nModel.getText("selectionhasnoBindingContext"));
                return;
            }

            const oSelectedData = oContext.getObject();
            this._oSelectedFacility = oSelectedData;
            this._sSelectedPath = oContext.getPath();

            //  Get BranchCode of the selected facility
            const sBranch = oSelectedData.Branch || "";
            console.log("Selected Facility BranchCode:", sBranch);

            // Parse index from path
            let idx = -1;
            try {
                const parts = this._sSelectedPath.split("/");
                idx = parseInt(parts[parts.length - 1], 10);
                if (isNaN(idx)) idx = -1;
            } catch (e) {
                idx = -1;
            }

            this._oSelectedIndex = idx;
        },
        // --- Open edit dialog for selected facility ---
        onEditFacilityDetails: function () {
            const oEditModel = this.getView().getModel("HostelModel").getData();
            this.getView().getModel("DateRangeModel").setProperty("/minstartDate", new Date(oEditModel.StartDate.split("/").reverse().join("-")));
            this.getView().getModel("DateRangeModel").setProperty("/minEndDate", new Date(oEditModel.EndDate.split("/").reverse().join("-")));

            if (!this._oSelectedFacility) {
                MessageToast.show(this.i18nModel.getText("pleaseSelectRowEdit"));
                return;
            }

            // 1. Create edit model using selected row exactly
            const oSafeCopy = JSON.parse(JSON.stringify(this._oSelectedFacility));

            // ✅ Handle Per Hour defaults + total hour binding
            if (oSafeCopy.UnitText === "Per Hour") {

                const sStart = oSafeCopy.StartTime || "09";
                const sEnd = oSafeCopy.EndTime || "10";

                oSafeCopy.StartTime = sStart;
                oSafeCopy.EndTime = sEnd;

                // ✅ Calculate Total Hour (HH format difference)
                const iStart = parseInt(sStart, 10);
                const iEnd = parseInt(sEnd, 10);

                let iTotal = iEnd - iStart;
                if (iTotal < 0) {
                    iTotal += 24; // safety for overnight (optional)
                }

                // Bind TotalTime as 1.00
                oSafeCopy.TotalTime = iTotal.toFixed(2); // "1.00"
            }

            this._oEditModel = new JSONModel(oSafeCopy);

            // Bind model to view + dialog
            this.getView().setModel(this._oEditModel, "edit");

            // Load dialog if not loaded
            if (!this._oEditDialog) {
                this._oEditDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "sap.ui.com.project1.fragment.FacilitiTableUpdate",
                    this
                );
                this.getView().addDependent(this._oEditDialog);
            }

            // Assign model to dialog
            this._oEditDialog.setModel(this._oEditModel, "edit");

            // Filter RateType dropdown
            this._filterRateTypesForEdit(this._oSelectedFacility);

            // Open dialog
            this._oEditDialog.open();
        },

        _resetEditValueStates: function () {
            const aControlIds = [
                "FT_id_editFacilityName",
                "FT_id_UnitType",
                "FT_id_editStartTime",
                "FT_id_editEndTime",
                "editTotalTime",
                "FT_id_editPrice",
                "FT_id_Currency",
                "FT_id_editStartDate",
                "FT_id_editEndDate",
                "FT_id_editDays"
            ];

            aControlIds.forEach(sId => {
                const oControl = sap.ui.core.Fragment.byId(
                    this.getView().getId(),
                    sId
                );

                if (oControl && oControl.setValueState) {
                    oControl.setValueState("None");
                }
            });
        },

        onEditDialogAfterOpen: function () {
            this._resetEditValueStates();
        },

        _filterRateTypesForEdit: function () {
            const sBranchCode = this._oSelectedFacility.BranchCode || this._oSelectedFacility.Branch || "";
            const aFacilities = this.getView().getModel("FacilityModel").getProperty("/Facilities") || [];

            const oFacilityData = aFacilities.find(f =>
                f.FacilityName === this._oSelectedFacility.FacilityName &&
                f.BranchCode === sBranchCode
            );

            if (!oFacilityData) {
                console.error("Facility not found:", this._oSelectedFacility);
                MessageToast.show(this.i18nModel.getText("facilityDataMissing"));
                return;
            }

            const oRateTypeModel = this.getOwnerComponent().getModel("RateType");

            if (!this._aOriginalRateTypes) {
                this._aOriginalRateTypes = JSON.parse(JSON.stringify(oRateTypeModel.getData()));
            }

            // 🔹 Booking Duration selection
            const sSelectedPriceType =
                this.getView().getModel("HostelModel").getProperty("/SelectedPriceType");

            // 🔹 Allowed units based on Booking Duration
            let aAllowed = [];

            if (sSelectedPriceType === "Per Day") {
                aAllowed = ["Per Hour", "Per Day"];
            }
            else if (sSelectedPriceType === "Per Month") {
                aAllowed = ["Per Hour", "Per Day", "Per Month"];
            }
            else if (sSelectedPriceType === "Per Year") {
                aAllowed = ["Per Hour", "Per Day", "Per Month", "Per Year"];
            }

            // 🔹 Price mapping
            const priceMapping = {
                "Per Hour": Number(oFacilityData.PricePerHour),
                "Per Day": Number(oFacilityData.PricePerDay),
                "Per Month": Number(oFacilityData.PricePerMonth),
                "Per Year": Number(oFacilityData.PricePerYear)
            };

            // ✅ FINAL FILTER (Allowed by duration + price > 0)
            const aFiltered = this._aOriginalRateTypes.filter(rt =>
                aAllowed.includes(rt.RateType) && priceMapping[rt.RateType] > 0
            );

            oRateTypeModel.setData(aFiltered);
        },

        _parsePossibleDateString: function (s) {
            if (!s) return null;
            // If already a Date
            if (s instanceof Date) return s;
            // If format is yyyy-MM-dd (common when valueFormat used)
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
                const parts = s.split("-");
                return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            }
            // If format dd/MM/yyyy
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
                const parts = s.split("/");
                return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            }
            // Fallback: try Date.parse
            const d = new Date(s);
            return isNaN(d.getTime()) ? null : d;
        },

        onEditDialogClose: function () {
            const oView = this.getView();
            const oTable = this._oSelectedTable || oView.byId("idFacilitySummaryTable");
            if (oTable) {
                // remove selection
                try {
                    oTable.removeSelections(true);
                } catch (e) {
                    /* ignore */
                }
                const oBinding = oTable.getBinding("items");
                if (oBinding) oBinding.refresh();
            }

            // Clear selection cache
            this._oSelectedTable = null;
            this._oSelectedFacility = null;
            this._oSelectedIndex = null;
            this._sSelectedPath = null;
            this._oEditDialog.close();
        },

        onMonthSelectionChange: function (oEvent) {
            const oView = this.getView();
            const oHostelModel = oView.getModel("edit");

            const sUnit = oHostelModel.getProperty("/UnitText");
            const sStartDate = oHostelModel.getProperty("/StartDate") || "";

            const iSelectedNumber = parseInt(oEvent.getSource().getSelectedKey() || "1", 10);

            if (!sStartDate) {
                MessageToast.show(this.i18nModel.getText("pleaseSelectStartDateFirst"));
                return;
            }

            const oStart = this._parseDate(sStartDate);
            if (!(oStart instanceof Date) || isNaN(oStart)) {
                MessageToast.show(this.i18nModel.getText("invalidStartDate"));
                return;
            }

            let oEnd = new Date(oStart);

            // ⭐ REAL CALENDAR LOGIC (INCLUSIVE)
            if (sUnit === "Per Month") {
                oEnd.setMonth(oEnd.getMonth() + iSelectedNumber);
                oEnd.setDate(oEnd.getDate() - 1);

                oHostelModel.setProperty("/TotalMonths", iSelectedNumber);
                oHostelModel.setProperty("/TotalYears", 0);
            }
            else if (sUnit === "Per Year") {
                oEnd.setFullYear(oEnd.getFullYear() + iSelectedNumber);
                oEnd.setDate(oEnd.getDate() - 1);

                oHostelModel.setProperty("/TotalYears", iSelectedNumber);
                oHostelModel.setProperty("/TotalMonths", 0);
            }
            else {
                return;
            }

            // 🔢 Calculate total days (inclusive)
            const iTotalDays =
                Math.floor((oEnd - oStart) / (1000 * 60 * 60 * 24)) + 1;

            const sEndDate = this._formatDateToDDMMYYYY(oEnd);

            oHostelModel.setProperty("/EndDate", sEndDate);
            oHostelModel.setProperty("/TotalDays", iTotalDays);
        }
        ,
        onEditDateChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);

            const oView = this.getView();
            const oModel = oView.getModel("edit");

            const sUnit = oModel.getProperty("/UnitText");
            const sStart = oModel.getProperty("/StartDate");
            let sEnd = oModel.getProperty("/EndDate");

            if (!sStart) return;

            /** STRING → JS DATE (supports DD/MM/YYYY and YYYY-MM-DD) */
            const toJSDate = (s) => {
                if (!s) return null;
                if (s.includes("/")) {
                    const [d, m, y] = s.split("/");
                    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                }
                return new Date(s);
            };

            const oStart = toJSDate(sStart);
            if (!oStart || isNaN(oStart)) return;

            let oEnd = null;
            let iDays = 0;
            let bAutoEndDate = false;   // 🔑 FLAG

            /* ===============================
               UNIT-WISE CALCULATION
            =============================== */

            if (sUnit === "Per Month" || sUnit === "monthly") {

                let iCount = parseInt(oModel.getProperty("/TotalMonths") || 1, 10);

                oEnd = new Date(oStart);
                oEnd.setMonth(oEnd.getMonth() + iCount);
                oEnd.setDate(oEnd.getDate() - 1);
                bAutoEndDate = true;

            } else if (sUnit === "Per Year" || sUnit === "yearly") {

                let iCount = parseInt(oModel.getProperty("/TotalYears") || 1, 10);

                oEnd = new Date(oStart);
                oEnd.setFullYear(oEnd.getFullYear() + iCount);
                oEnd.setDate(oEnd.getDate() - 1);
                bAutoEndDate = true;

            } else if (sUnit === "Per Day" || sUnit === "daily" || sUnit === "Per Hour") {

                if (sEnd) {
                    oEnd = toJSDate(sEnd);
                }

                const msPerDay = 1000 * 60 * 60 * 24;

                if (oEnd) {
                    oEnd.setHours(23, 59, 59, 999);
                    iDays = Math.ceil((oEnd - oStart) / msPerDay);
                    iDays = iDays >= 0 ? iDays : 0;
                } else {
                    iDays = 1;
                    oEnd = new Date(oStart);
                    bAutoEndDate = true;
                }
            }

            /* ===============================
               TOTAL DAYS (INCLUSIVE)
            =============================== */
            if (oEnd && iDays === 0) {
                const diff = oEnd.getTime() - oStart.getTime();
                iDays = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
            }

            oModel.setProperty("/TotalDays", iDays);

            /* ===============================
               FORMAT DATE → DD/MM/YYYY
            =============================== */
            const toDDMMYYYY = (d) => {
                if (!d) return "";
                const dd = String(d.getDate()).padStart(2, "0");
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const yyyy = d.getFullYear();
                return `${dd}/${mm}/${yyyy}`;
            };

            oModel.setProperty("/EndDate", oEnd ? toDDMMYYYY(oEnd) : "");

            /* ===============================
               RESET VALUE STATE WHEN AUTO SET
            =============================== */
            if (bAutoEndDate) {
                const oEndDP = sap.ui.getCore().byId(oView.getId() + "--FT_id_editEndDate");
                if (oEndDP) {
                    oEndDP.setValueState(sap.ui.core.ValueState.None);
                    oEndDP.setValueStateText("");
                }
            }

            /* ===============================
               MIN END DATE
            =============================== */
            const oEndDP = sap.ui.getCore().byId(oView.getId() + "--FT_id_editEndDate");
            if (oEndDP) {
                const oMin = new Date(oStart);
                oMin.setDate(oMin.getDate() + 1);
                oEndDP.setMinDate(oMin);
            }

            utils._LCvalidateDate(oEvent);
        },

        // Utility function to format date
        _formatDateToDDMMYYYY: function (oDate) {
            const dd = String(oDate.getDate()).padStart(2, '0');
            const mm = String(oDate.getMonth() + 1).padStart(2, '0'); // Months start at 0
            const yyyy = oDate.getFullYear();
            return dd + "/" + mm + "/" + yyyy;
        },

        onEditFacilitySave: function () {
            const oView = this.getView();
            const oHostelModel = oView.getModel("HostelModel");
            const oEditModel = oView.getModel("edit");

            if (!oHostelModel || !oEditModel) {
                MessageToast.show(this.i18nModel.getText("missingModels"));
                return;
            }

            const sUnitText = oEditModel.getProperty("/UnitText");
            const iTotalDays = Number(oEditModel.getProperty("/TotalDays") || 0);
            const sViewId = oView.getId();

            const oStartDate = sap.ui.core.Fragment.byId(sViewId, "FT_id_editStartDate");
            const oEndDate = sap.ui.core.Fragment.byId(sViewId, "FT_id_editEndDate");

            // ---- Date validation (sequential) ----
            const isDateValid =
                utils._LCvalidateDate(oStartDate, "ID") &&
                utils._LCvalidateDate(oEndDate, "ID");

            if (!isDateValid) {
                MessageToast.show(this.i18nModel.getText("pleaseSelectStartDateEndDate"));
                return;
            }

            // ---- Per Day validation ----
            if (sUnitText === "Per Day" && iTotalDays < 1) {
                sap.m.MessageBox.error(this.i18nModel.getText("totalDaysmustbeatLeastforPerDayBooking"));
                return;
            }

            // ---- Per Hour validation (SEQUENTIAL) ----
            if (sUnitText === "Per Hour") {
                const oStartTime = sap.ui.core.Fragment.byId(sViewId, "FT_id_editStartTime");
                const oEndTime = sap.ui.core.Fragment.byId(sViewId, "FT_id_editEndTime");
                const oTotalTime = sap.ui.core.Fragment.byId(sViewId, "editTotalTime");


                const isMandatoryValid =
                    utils._LCvalidateMandatoryField(oStartTime, "ID") &&
                    utils._LCvalidateMandatoryField(oEndTime, "ID") &&
                    utils._LCvalidateMandatoryField(oTotalTime, "ID")


                if (!isMandatoryValid) {
                    MessageToast.show(this.i18nModel.getText("fillMandatoryFields"));
                    return;
                }

                // Time comparison AFTER mandatory validation
                const start = new Date("1970-01-01T" + oStartTime.getValue() + ":00");
                const end = new Date("1970-01-01T" + oEndTime.getValue() + ":00");

                if (start >= end) {
                    MessageToast.show(this.i18nModel.getText("startTimeShouldbeLessthanEndTime"));
                    return;
                }
            }
            // 1. Update global facility list
            const oUpdatedData = Object.assign({}, oEditModel.getData()); // shallow copy
            let aFacilities = oHostelModel.getProperty("/AllSelectedFacilities") || [];

            // Fallback: if /AllSelectedFacilities is empty, build it from persons
            if (!Array.isArray(aFacilities) || aFacilities.length === 0) {
                const aPersons = oHostelModel.getProperty("/Persons") || [];
                aFacilities = aPersons.flatMap((p, pi) => {
                    const arr = (p.AllSelectedFacilities || p.Facilities?.SelectedFacilities || []);
                    // ensure PersonName present
                    return (arr || []).map(f => Object.assign({}, f, {
                        PersonName: p.FullName || (`Person ${pi + 1}`)
                    }));
                });
                // set it back so future ops are consistent
                oHostelModel.setProperty("/AllSelectedFacilities", aFacilities);
            }

            // Attempt 1: use stored index (if it looks valid)
            let iIndex = this._oSelectedIndex;

            // Attempt 2: if index invalid, find by identity (FacilityID + PersonName + StartDate + EndDate)
            if (iIndex === -1 && this._oSelectedFacility) {
                const sel = this._oSelectedFacility;
                iIndex = aFacilities.findIndex(f => {
                    // Prefer unique key FacilityID if present
                    if (f.FacilityID && sel.FacilityID) return String(f.FacilityID) === String(sel.FacilityID);
                    // else fallback to composite match
                    return (
                        String(f.FacilityName || "") === String(sel.FacilityName || "") &&
                        String(f.PersonName || "") === String(sel.PersonName || "") &&
                        String(f.StartDate || "") === String(sel.StartDate || "") &&
                        String(f.EndDate || "") === String(sel.EndDate || "")
                    );
                });
            }

            // If still not found, show helpful debug message and try best-effort: abort
            if (iIndex === -1) {
                console.warn("Could not find selected facility in /AllSelectedFacilities", {
                    all: aFacilities,
                    selected: this._oSelectedFacility
                });
                MessageToast.show(this.i18nModel.getText("couldnotfindSelectedFacilityGloballistPleasereselectRowtryagain"));
                return;
            }

            // After updating aFacilities and setting it globally:
            const aPersons = oHostelModel.getProperty("/Persons") || [];
            aPersons[oUpdatedData.ID].AllSelectedFacilities[iIndex] = oUpdatedData;

            // 2. Update global list so table refreshes
            aFacilities[iIndex] = oUpdatedData;
            oHostelModel.setProperty("/AllSelectedFacilities", aFacilities);

            // --- FIX FOR PER HOUR FACILITY ---
            if (oUpdatedData.UnitText === "Per Hour") {

                const hours = Number(oUpdatedData.TotalTime) || 1;
                const price = Number(oUpdatedData.Price) || 0;

                // Global list
                aFacilities[iIndex].TotalTime = hours;
                aFacilities[iIndex].StartTime = oUpdatedData.StartTime;  
                aFacilities[iIndex].EndTime = oUpdatedData.EndTime;      
                aFacilities[iIndex].TotalAmount = price * hours;

                // Per-person list
                if (
                    aPersons[oUpdatedData.ID] &&
                    aPersons[oUpdatedData.ID].AllSelectedFacilities &&
                    aPersons[oUpdatedData.ID].AllSelectedFacilities[iIndex]
                ) {
                    const oFac = aPersons[oUpdatedData.ID].AllSelectedFacilities[iIndex];
                    oFac.TotalTime = hours;
                    oFac.StartTime = oUpdatedData.StartTime;              
                    oFac.EndTime = oUpdatedData.EndTime;                  
                    oFac.TotalAmount = price * hours;
                }
            }


            // 3. Apply model refresh
            oHostelModel.refresh(true);

            // 4. Refresh table UI
            var sTable = this.getView().byId("idFacilitySummaryTable");
            if (sTable) {
                const oBinding = sTable.getBinding("items");
                if (oBinding) oBinding.refresh(true);
            }

            const perPersonRent = parseFloat(oHostelModel.getProperty("/FinalPrice")) || parseFloat(oHostelModel.getProperty("/Price")) || 0;

            const totals = this.calculateTotals(aPersons, perPersonRent);
            if (totals) {
                //oHostelModel.setProperty("/TotalDays", totals.TotalDays);
                oHostelModel.setProperty("/TotalFacilityPrice", totals.TotalFacilityPrice);
                oHostelModel.setProperty("/GrandTotal", totals.GrandTotal);
                // GST based on HostelModel Country (NOT person country)
                oHostelModel.setProperty("/CGST", totals.CGST || 0);
                oHostelModel.setProperty("/SGST", totals.SGST || 0);
                oHostelModel.setProperty("/FinalTotalCost", totals.FinalTotal || totals.GrandTotal);

            }

            var overAllTotal = 0;
            // Per-person recalculation
            aPersons.forEach((oPerson, idx) => {
                const facs = oPerson.AllSelectedFacilities || [];
                const totalAmount = facs.reduce((sum, facility) => {
                    return sum + (facility.TotalAmount || 0);
                }, 0);

                // Update only facility price
                oHostelModel.setProperty(`/Persons/${idx}/TotalFacilityPrice`, totalAmount);

                // DO NOT override room rent
                const oldRoomRent = oPerson.RoomRentPerPerson || 0;

                // Recalculate grand total
                oHostelModel.setProperty(`/Persons/${idx}/GrandTotal`, totalAmount + oldRoomRent);
                overAllTotal += totalAmount + oldRoomRent;
            });

            oHostelModel.setProperty("/OverallTotalCost", overAllTotal);

            // 5️⃣ Re-apply coupon & tax after facility edit
            const discountApplied = Number(oHostelModel.getProperty("/AppliedDiscount") || 0);
            const couponCode = oHostelModel.getProperty("/CouponCode");
            const minOrderValue = Number(oHostelModel.getProperty("/MinOrdervlaue") || 0);
            let updatedSubtotal = overAllTotal;
            const oBtn = this.byId("couponApplyBtn");

            // If coupon already applied → try recalculating discount first
            if (couponCode && discountApplied > 0) {

                const discountType = oHostelModel.getProperty("/AppliedDiscountType");  // "percentage"/"flat"
                const discountValue = Number(oHostelModel.getProperty("/AppliedDiscountValue") || 0);

                let recalculatedDiscount = 0;

                if (discountType === "percentage") {
                    recalculatedDiscount = updatedSubtotal * (discountValue / 100);
                } else {
                    recalculatedDiscount = discountValue;
                }

                // Apply discount
                updatedSubtotal = updatedSubtotal - recalculatedDiscount;
                oHostelModel.setProperty("/AppliedDiscount", recalculatedDiscount);
            }

            //  CHECK MIN ORDER VALUE AFTER FACILITY UPDATE
            if (couponCode && updatedSubtotal < minOrderValue) {

                //  Coupon invalid now → remove it completely
                oHostelModel.setProperty("/CouponCode", "");
                oHostelModel.setProperty("/AppliedDiscount", 0);
                oHostelModel.setProperty("/AppliedDiscountType", "");
                oHostelModel.setProperty("/AppliedDiscountValue", 0);

                // Revert subtotal to original (without discount)
                updatedSubtotal = overAllTotal;

                // Reset button
                if (oBtn) oBtn.setText("Apply Now");

                MessageToast.show(this.i18nModel.getText("couponRemovedTotalLessthanMinimumOrderValue"));
            }

            // 6 Re-apply taxes (India → CGST + SGST)
            const isIndia = oHostelModel.getProperty("/IsIndia");
            let cgst = 0, sgst = 0, finalTotal = updatedSubtotal;

            if (isIndia) {
                cgst = updatedSubtotal * 0.09;
                sgst = updatedSubtotal * 0.09;
                finalTotal = updatedSubtotal + cgst + sgst;
            }

            // Save updated tax + final total
            oHostelModel.setProperty("/OverallTotalCost", updatedSubtotal);
            oHostelModel.setProperty("/CGST", cgst);
            oHostelModel.setProperty("/SGST", sgst);
            oHostelModel.setProperty("/FinalTotalCost", finalTotal);

            let aSummary = oHostelModel.getProperty("/PersonFacilitiesSummary") || [];

            const iSummaryIndex = aSummary.findIndex(f => {
                return String(f.FacilityID) === String(oUpdatedData.FacilityID);
            });

            if (iSummaryIndex !== -1) {
                aSummary[iSummaryIndex] = Object.assign({}, aSummary[iSummaryIndex], oUpdatedData);
                oHostelModel.setProperty("/PersonFacilitiesSummary", aSummary);
            }
            // Refresh bindings (table)
            const oTable = this._oSelectedTable || oView.byId("idFacilitySummaryTable");
            if (oTable) {
                // remove selection
                try {
                    oTable.removeSelections(true);
                } catch (e) {
                    /* ignore */
                }
                const oBinding = oTable.getBinding("items");
                if (oBinding) oBinding.refresh();
            }

            // Clear selection cache
            this._oSelectedTable = null;
            this._oSelectedFacility = null;
            this._oSelectedIndex = null;
            this._sSelectedPath = null;

            this.onEditDialogClose();
            var Table = this._oSelectedTable || oView.byId("idFacilitySummaryTable");
            if (Table) {
                // remove selection
                try {
                    Table.removeSelections(true);
                } catch (e) {
                    /* ignore */
                }
                const oBinding = Table.getBinding("items");
                if (oBinding) oBinding.refresh();
            }
            this._oSelectedTable = null;
            this._oSelectedFacility = null;
            this._oSelectedIndex = null;
            this._sSelectedPath = null;
            MessageToast.show(this.i18nModel.getText("facilityUpdatedSuccessfully"));
        },

        _formatDateToDDMMYYYY: function (dt) {
            if (!dt || !(dt instanceof Date)) return "";
            const dd = String(dt.getDate()).padStart(2, "0");
            const mm = String(dt.getMonth() + 1).padStart(2, "0");
            const yyyy = dt.getFullYear();
            return `${dd}/${mm}/${yyyy}`;
        },

        calculateTotals: function (aPersons, roomRentPrice) {
            const msPerDay = 1000 * 60 * 60 * 24;
            // helper: parse a date string (supports dd/MM/yyyy, yyyy-MM-dd or Date object)
            const parseDateSafe = (v) => {
                if (!v) return null;
                if (v instanceof Date) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
                // if format is dd/MM/yyyy
                if (typeof v === "string" && v.indexOf("/") !== -1) {
                    const parts = v.split("/");
                    // dd/MM/yyyy
                    if (parts.length === 3) {
                        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                    }
                }
                // if ISO yyyy-MM-dd or full ISO
                if (typeof v === "string") {
                    const d = new Date(v);
                    if (!isNaN(d)) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
                }
                // fallback
                try {
                    const d = new Date(v);
                    if (!isNaN(d)) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
                } catch (e) { }
                return null;
            };

            // helper: parse TotalTime which may be "HH:MM", "H", "H.MM" or numeric string -> returns hours as number (decimal)
            const parseTotalTimeToHours = (val) => {
                if (val == null || val === "") return 0;
                if (typeof val === "number") return val;
                const s = String(val).trim();
                // HH:MM
                if (s.indexOf(":") > -1) {
                    const parts = s.split(":").map(p => Number(p || 0));
                    const hh = isNaN(parts[0]) ? 0 : parts[0];
                    const mm = isNaN(parts[1]) ? 0 : parts[1];
                    return hh + (mm / 60);
                }
                // decimal with comma
                if (s.indexOf(",") > -1) {
                    const n = Number(s.replace(",", "."));
                    return isNaN(n) ? 0 : n;
                }
                // plain numeric string
                const n = Number(s);
                return isNaN(n) ? 0 : n;
            };

            let totalFacilityPrice = 0;
            let aAllFacilities = [];

            aPersons.forEach((oPerson, iIndex) => {
                const aFacilities = oPerson.AllSelectedFacilities || [];
                const personFacilities = [];

                aFacilities.forEach((f) => {
                    // parse start/end as date-only (midnight) to compute inclusive days
                    const fStartDate = parseDateSafe(f.StartDate);
                    const fEndDate = parseDateSafe(f.EndDate);

                    if (!fStartDate || !fEndDate) {
                        // Skip invalid dates
                      MessageToast.show("Invalid Facility Start/End Date for " + (f.FacilityName || ""));
                        return;
                    }
                    // USE the user-calculated dialog value directly
                    const fDays = Number(f.TotalDays || 0);


                    if (fDays <= 0) {
                       MessageToast.show("Facility End Date must be Same or after Start Date for " + (f.FacilityName || ""));
                        return;
                    }

                    // Price
                    const fPrice = parseFloat(f.Price || 0) || 0;
                    let fTotal = 0;

                    // Prefer f.TotalTime (string like "02:00" or "2") or fallback to f.TotalHours if set
                    const hoursPerDayFromTotalTime = parseTotalTimeToHours(f.TotalTime);
                    const hoursPerDayFallback = Number(f.TotalHours || 0); // older field maybe exist
                    const hoursPerDay = hoursPerDayFromTotalTime > 0 ? hoursPerDayFromTotalTime : (hoursPerDayFallback > 0 ? hoursPerDayFallback : 0);

                    // months/years calculation helper
                    const fMonths = (fEndDate.getFullYear() - fStartDate.getFullYear()) * 12 + (fEndDate.getMonth() - fStartDate.getMonth());
                    const normalizedMonths = (typeof fMonths === "number" && fMonths > 0) ? fMonths : 1;
                    const fYears = Math.max(1, fEndDate.getFullYear() - fStartDate.getFullYear());

                    switch ((f.UnitText || "").toString().toLowerCase()) {

                        case "per hour":
                        case "hour": {
                            // total hours = hours per day * number of days
                            const totalHours = hoursPerDay * fDays;
                            fTotal = fPrice * totalHours;
                            break;
                        }

                        case "per day":
                        case "day": {
                            fTotal = fPrice * fDays;
                            break;
                        }

                        case "per month":
                        case "month": {
                            fTotal = fPrice * (normalizedMonths <= 0 ? 1 : normalizedMonths);
                            break;
                        }

                        case "per year":
                        case "year": {
                            fTotal = fPrice * (fYears <= 0 ? 1 : fYears);
                            break;
                        }

                        default: {
                            // fallback -> per day
                            fTotal = fPrice * fDays;
                            break;
                        }
                    }

                    // accumulate
                    totalFacilityPrice += fTotal;

                    // build facility summary object (note: TotalHours here is hoursPerDay; if you want totalHours overall, you can compute hoursPerDay * fDays)
                    const data = {
                        ID: iIndex,
                        PersonName: oPerson.FullName || `Person ${iIndex + 1}`,
                        FacilityName: f.FacilityName,
                        Price: fPrice,
                        StartDate: f.StartDate,
                        EndDate: f.EndDate,
                        StartTime: f.StartTime,
                        EndTime: f.EndTime,
                        // hoursPerDay (user provided) and overallHours
                        HoursPerDay: hoursPerDay,
                        TotalHours: +(hoursPerDay * fDays).toFixed(2),
                        TotalDays: fDays,
                        TotalMonths: normalizedMonths,
                        TotalYears: fYears,
                        TotalAmount: +fTotal.toFixed(2),
                        Image: f.Image,
                        Currency: f.Currency || oPerson.Currency || oHostelModel?.getProperty?.("/Currency") || "",
                        UnitText: f.UnitText,
                        // keep original TotalTime string so UI can display it if needed
                        TotalTime: f.TotalTime
                    };

                    aAllFacilities.push(data);
                    personFacilities.push(data);
                });

                // assign back per person
                oPerson.AllSelectedFacilities = personFacilities;
            });

            const grandTotal = totalFacilityPrice + Number(roomRentPrice || 0);

            //-------------------------------------------------------------
            // GST Based Only on HostelModel Country
            //-------------------------------------------------------------
            const sCountry = this.getView().getModel("HostelModel").getProperty("/Country") || "";
            let cgst = 0, sgst = 0, finalTotal = grandTotal;

            if (sCountry === "India") {
                cgst = grandTotal * 0.09;
                sgst = grandTotal * 0.09;
                finalTotal = grandTotal + cgst + sgst;
            }

            return {
                TotalFacilityPrice: +totalFacilityPrice.toFixed(2),
                GrandTotal: +grandTotal.toFixed(2),
                CGST: +cgst.toFixed(2),
                SGST: +sgst.toFixed(2),
                FinalTotal: +finalTotal.toFixed(2),
                AllSelectedFacilities: aAllFacilities
            };
           
        },

        _parseDate: function (s) {
            if (!s) return null;
            if (typeof s !== "string") return new Date(s);
            const parts = s.split("/");
            if (parts.length === 3) {
                const d = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const y = parseInt(parts[2], 10);
                return new Date(y, m, d);
            }
            return new Date(s);
        },

        onUnitTextChange: function (oEvent) {
            const oCombo = oEvent.getSource();

            //  Typed value (no selectedItem)
            if (!oCombo.getSelectedItem()) {
                utils._LCvalidationComboBox(oEvent); // SAFE call
                MessageToast.show(this.i18nModel.getText("pleaseselectUnitTypefromlist"));
                return;
            }

            oCombo.setValueState("None");
            const oEditModel = this.getView().getModel("edit");
            const oFacilityModel = this.getView().getModel("FacilityModel");

            const sSelectedUnit = oEvent.getSource().getSelectedItem().getText();
            const sFacilityName = oEditModel.getProperty("/FacilityName");
            const sBranch = this.getView().getModel("HostelModel").getProperty("/BranchCode");

            // Update unit type
            oEditModel.setProperty("/UnitText", sSelectedUnit);

            //  CLEAR START & END DATE & DAYS WHEN UNIT TYPE CHANGES
            oEditModel.setProperty("/StartDate", "");
            oEditModel.setProperty("/EndDate", "");
            oEditModel.setProperty("/TotalDays", "");
            oEditModel.refresh(true);

            // Get facilities list
            const aFacilities = oFacilityModel.getProperty("/Facilities") || [];

            const oMatched = aFacilities.find(f =>
                f.FacilityName === sFacilityName &&
                f.BranchCode === sBranch
            );

            if (!oMatched) {
               MessageToast.show(this.i18nModel.getText("pricenotFoundSelectedUnitType"));
                return;
            }

            // Pick correct price based on Unit Type
            let price = 0;

            if (sSelectedUnit === "Per Day") price = oMatched.PricePerDay;
            if (sSelectedUnit === "Per Month") price = oMatched.PricePerMonth;
            if (sSelectedUnit === "Per Year") price = oMatched.PricePerYear;
            if (sSelectedUnit === "Per Hour") price = oMatched.PricePerHour;

            // Reset Month/Year count to 1 when unit changes
            if (sSelectedUnit === "Per Month") {
                oEditModel.setProperty("/TotalMonths", "1");
                oEditModel.setProperty("/TotalYears", ""); // clear year
                oEditModel.setProperty("/StartTime", "");
                oEditModel.setProperty("/EndTime", "");
                oEditModel.setProperty("/TotalTime", "");
            }

            if (sSelectedUnit === "Per Year") {
                oEditModel.setProperty("/TotalYears", "1");
                oEditModel.setProperty("/TotalMonths", "");
                oEditModel.setProperty("/StartTime", "");
                oEditModel.setProperty("/EndTime", "");
                oEditModel.setProperty("/TotalTime", "");
            }

            // Update price in dialog
            oEditModel.setProperty("/Price", price);
        },

        onOpenDocumentPreview: function (oEvent) {
            const oCtx = oEvent.getSource().getBindingContext("HostelModel");
            const oDoc = oCtx && oCtx.getObject();

            if (!oDoc || !oDoc.Document) {
               MessageToast.show(this.i18nModel.getText("noDocumentPreview"));
                return;
            }

            let sData = oDoc.Document;

            if (!sData.startsWith("data:")) {
                const sType = oDoc.FileType || "application/octet-stream";
                sData = `data:${sType};base64,${sData}`;
            }

            const sTitle = oDoc.FileName || "Document Preview";

            /** DESTROY OLD DIALOG IF EXISTS */
            if (this._oImageDialog) {
                this._oImageDialog.destroy();
                this._oImageDialog = null;
            }

            let oContent;

            if (oDoc.FileType.includes("image")) {

                const oFlex = new sap.m.FlexBox({
                    width: "100%",
                    height: "100%",
                    renderType: "Div",
                    justifyContent: "Center",
                    alignItems: "Center",
                    items: [
                        new sap.m.Image({
                            id: this.createId("previewImage"),
                            src: sData,
                            densityAware: false,
                            width: "100%",
                            height: "100%",
                            style: "object-fit:cover;display:block;margin:0;padding:0;"
                        })
                    ]
                });

                oContent = oFlex;
            }

            /** ============================
             *  PDF PREVIEW 
             * ============================ */
            else if (oDoc.FileType.includes("pdf")) {

                const oHtml = new sap.ui.core.HTML({
                    content: `<iframe src="${sData}" style="width:100%;height:100%;border:0;"></iframe>`
                });

                oContent = oHtml;
            }

            /** ============================
             *  UNSUPPORTED FILE
             * ============================ */
            else {
                oContent = new sap.m.VBox({
                    items: [
                        new sap.m.Text({
                            text: "Preview not supported."
                        }),
                        new sap.m.Link({
                            text: "Download File",
                            href: sData,
                            download: oDoc.FileName
                        })
                    ],
                    width: "100%",
                    height: "100%",
                    justifyContent: "Center",
                    alignItems: "Center"
                });
            }

            /** ============================
             *  CREATE DIALOG
             * ============================ */
            this._oImageDialog = new sap.m.Dialog({
                title: sTitle,
                contentWidth: "50%",
                contentHeight: "60%",
                draggable: true,
                resizable: true,
                horizontalScrolling: false,
                verticalScrolling: true,
                contentPadding: "0px",
                content: [oContent],

                beginButton: new sap.m.Button({
                    text: "Close",
                    press: function () {
                        this._oImageDialog.close();
                    }.bind(this)
                }),

                afterClose: function () {
                    this._oImageDialog.destroy();
                    this._oImageDialog = null;
                }.bind(this)
            });

            this.getView().addDependent(this._oImageDialog);

            this._oImageDialog.open();
        },

        // Close preview
        onClosePreview: function () {
            if (this._oDocPreviewDialog) {
                this._oDocPreviewDialog.close();
            }
        },

        onTimeChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
            const oEditModel = this.getView().getModel("edit");
            const oTimePicker = oEvent.getSource(); // StartTime or EndTime field

            const sStart = oEditModel.getProperty("/StartTime");
            const sEnd = oEditModel.getProperty("/EndTime");

            // If one field is missing, clear total and exit
            if (!sStart || !sEnd) {
                oEditModel.setProperty("/TotalTime", "");
                oTimePicker.setValueState("None");
                return;
            }

            // Convert to number (same as onEditTimeChange)
            const startHour = parseFloat(sStart);
            const endHour = parseFloat(sEnd);

            // Validate number format
            if (isNaN(startHour) || isNaN(endHour)) {
               MessageToast.show(this.i18nModel.getText("invalidHourFormat"));
                oEditModel.setProperty("/TotalTime", "");
                oTimePicker.setValueState("Error");
                return;
            }

            // Validate end > start
            if (endHour < startHour) {
                MessageToast.show(this.i18nModel.getText("endTimeShouldbeGreaterthanStartTime"));
                oEditModel.setProperty("/TotalTime", "");
                oTimePicker.setValueState("Error");
                oTimePicker.setValueStateText(this.i18nModel.getText("endTimecannotbeearlierthanStartTime"));
                return;
            }

            // Clear error state
            oTimePicker.setValueState("None");

            // Calculate difference
            const totalHours = endHour - startHour;

            // Format to 2 decimals (same behavior)
            const formatted = totalHours.toFixed(2);

            oEditModel.setProperty("/TotalTime", formatted);
        },

        _getTimePeriod: function (sTime) {
            if (!sTime) return "";
            const [hour] = sTime.split(":").map(Number);
            return hour < 12 ? "Morning" : "Evening";
        },

        _sumGrandTotalOfPersons: function () {
            const oHostelModel = this.getView().getModel("HostelModel");
            const aPersons = oHostelModel.getProperty("/Persons") || [];

            let sum = 0;

            aPersons.forEach(person => {
                sum += Number(person.GrandTotal || 0);
            });

            return sum;
        },

        oncancelCoupon: function () {
            var oHostelModel = this.getView().getModel("HostelModel");
            var inputID = sap.ui.core.Fragment.byId(this.getView().getId(), "BookingcouponInput");

            // Clear model
            oHostelModel.setProperty("/CouponCode", "");
            oHostelModel.setProperty("/AppliedDiscount", 0);

            // Force UI update
            oHostelModel.refresh(true);

            // Reset cost
            const subTotal = this._sumGrandTotalOfPersons();
            oHostelModel.setProperty("/OverallTotalCost", subTotal);

            const isIndia = oHostelModel.getProperty("/IsIndia");
            let cgst = 0, sgst = 0, finalTotal = subTotal;

            if (isIndia) {
                cgst = subTotal * 0.09;
                sgst = subTotal * 0.09;
                finalTotal = subTotal + cgst + sgst;
            }

            oHostelModel.setProperty("/CGST", cgst);
            oHostelModel.setProperty("/SGST", sgst);
            oHostelModel.setProperty("/FinalTotalCost", finalTotal);

            // Hide icon
            if (inputID) {
                inputID.setShowValueHelp(false);
            }
            var oBtn = this.byId("couponApplyBtn");
            oBtn.setVisible(true);
        },

        onCouponLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue();
            var oBtn = this.byId("couponApplyBtn");

            // Show icon only if there is value
            oInput.setShowValueHelp(!!sValue);

            if (sValue && sValue.trim().length > 0) {
                oBtn.setVisible(true);
            } else {
                oBtn.setVisible(true); // Always show when blank
            }
        },

        onChangeCouponCode: async function (oEvent) {
            var oHostelModel = this.getView().getModel("HostelModel");
            var oBtn = this.byId("couponApplyBtn");
            var sEnteredCode = oHostelModel.getProperty("/CouponCode")?.trim();
            var sBranchCode = oHostelModel.getProperty("/BranchCode");

            if (sEnteredCode === "") {
               MessageToast.show(this.i18nModel.getText("enterCouponforDiscount"));
                return;
            }

            if (!sEnteredCode) {

                const originalTotal = oHostelModel.getProperty("/OverallTotalCost");
                const originalCGST = oHostelModel.getProperty("/CGST");
                const originalSGST = oHostelModel.getProperty("/SGST");
                const originalFinal = oHostelModel.getProperty("/FinalTotalCost");

                oHostelModel.setProperty("/AppliedDiscount", 0);
                oHostelModel.setProperty("/OverallTotalCost", originalTotal);
                oHostelModel.setProperty("/CGST", originalCGST);
                oHostelModel.setProperty("/SGST", originalSGST);
                oHostelModel.setProperty("/FinalTotalCost", originalFinal);

                MessageToast.show(this.i18nModel.getText("couponRemovedPricesRestored"));
                return;
            }

            if (!sEnteredCode) {
               MessageToast.show(this.i18nModel.getText("pleaseEnterCoupon"));
                return;
            }

            try {
                BusyIndicator.show(0);

                const filter = {
                    CouponCode: sEnteredCode,
                    Status: "Active"
                }
                // Fetch coupons
                const response = await this.ajaxReadWithJQuery("HM_Coupon", filter
                );
                const aCoupons = response?.data || [];

                if (!aCoupons.length) {
                    MessageToast.show(this.i18nModel.getText("noCouponsFound"));
                    return;
                }
                const CouponCodeEnddate = aCoupons[0].EndDate;
                const couponEndISO = new Date(CouponCodeEnddate).toISOString().split("T")[0];
                const todayISO = new Date().toISOString().split("T")[0];

                // Compare
                if (couponEndISO < todayISO) {
                    MessageToast.show(this.i18nModel.getText("couponisExpired"));
                    return;
                }
                // Match coupon
                const oMatched = aCoupons.find(c =>
                    String(c.CouponCode).toUpperCase() === sEnteredCode.toUpperCase()
                );

                if (!oMatched) {
                    MessageToast.show(this.i18nModel.getText("invalidCouponCode"));
                    return;
                }
                const couponBranch = String(oMatched.BranchCode || "").trim();
                const selectedBranch = String(sBranchCode || "").trim();

                if (couponBranch && couponBranch !== selectedBranch) {
                   MessageToast.show(
                        this.i18nModel.getText("thisCouponValidtheSelectedBranchRoom")
                    );
                    return;
                }

                // Extract coupon details
                const discountValue = Number(oMatched.DiscountValue || 0);
                const discountType = (oMatched.DiscountType || "").toLowerCase();
                const minOrderValue = Number(oMatched.MinOrderValue || 0);
                oHostelModel.setProperty("/AppliedDiscountType", discountType)
                oHostelModel.setProperty("/AppliedDiscountValue", discountValue)
                oHostelModel.setProperty("/MinOrdervlaue", minOrderValue)
                // Read Subtotal and country
                const isIndia = oHostelModel.getProperty("/IsIndia");
                let subTotal = Number(oHostelModel.getProperty("/OverallTotalCost") || 0);

                if (subTotal <= 0) {
                    MessageToast.show(this.i18nModel.getText("subtotalisZeroCannotApplyCoupon"));
                    return;
                }
                if (subTotal < minOrderValue) {
                    MessageToast.show(
                        `Minimum Order Value ₹${minOrderValue} required to Apply this Coupon.`
                    );
                    return;
                }

                let discountedSubtotal = subTotal;
                let discountAmount = 0;

                //  APPLY DISCOUNT LOGIC
                if (discountType === "percentage") {
                    // Example: 10% OFF
                    discountedSubtotal = subTotal - (subTotal * (discountValue / 100));
                    discountAmount = subTotal * (discountValue / 100);
                }
                else {
                    // Flat amount
                    discountedSubtotal = subTotal - discountValue;
                    discountAmount = discountValue;
                }

                // Prevent negative totals
                discountedSubtotal = Math.max(0, discountedSubtotal);

                // Store the discounted subtotal
                oHostelModel.setProperty("/OverallTotalCost", discountedSubtotal);
                oHostelModel.setProperty("/AppliedDiscount", discountAmount);

                // ------------------------------------------
                //  APPLY TAX CALCULATIONS AGAIN
                // ------------------------------------------
                let finalTotal = discountedSubtotal;
                let cgst = 0, sgst = 0;

                if (isIndia) {
                    cgst = discountedSubtotal * 0.09;
                    sgst = discountedSubtotal * 0.09;
                    finalTotal = discountedSubtotal + cgst + sgst;
                }

                // Update model
                oHostelModel.setProperty("/CGST", cgst);
                oHostelModel.setProperty("/SGST", sgst);
                oHostelModel.setProperty("/FinalTotalCost", finalTotal);

                oHostelModel.refresh(true);
                oBtn.setVisible(false);
                MessageToast.show(
                    this.i18nModel.getText("couponAppliedSuccessfully")
                );

            } catch (err) {
                console.error(err);
                MessageToast.show(this.i18nModel.getText("errorApplyingCoupon"));
            } finally {
                BusyIndicator.hide();
            }
        },
    });
});